#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF Generation & Arabic Typography Engine (Python Sidecar)
For: بحث أخوة الرب - خدمة القلب المتسع
Built with: PyMuPDF (fitz), arabic-reshaper, python-bidi, Pillow.
Communicates via JSON-RPC 2.0 over stdio or CLI.
"""

import sys
import os
import json
import base64
import io
import argparse
import traceback
from typing import Dict, Any, Optional, Tuple

# -----------------------------------------------------------------------------
# Force UTF-8 Standard Streams on Windows
# Prevents UnicodeEncodeError: cp1252 / charmap with Arabic strings
# -----------------------------------------------------------------------------
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["PYTHONUTF8"] = "1"

for _stream in (sys.stdin, sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

import pymupdf  # fitz
import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image, ImageOps

# -----------------------------------------------------------------------------
# Path Resolvers & Constants
# -----------------------------------------------------------------------------
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FONTS_DIR = os.path.join(BASE_DIR, "fonts")
REGULAR_FONT_PATH = os.path.join(FONTS_DIR, "IBMPlexSansArabic-Regular.ttf")
BOLD_FONT_PATH = os.path.join(FONTS_DIR, "IBMPlexSansArabic-Bold.ttf")

# Fallback paths if run from root directory or outside bundle
if not os.path.exists(REGULAR_FONT_PATH):
    fallback_paths = [
        os.path.join(os.path.dirname(sys.executable), "fonts", "IBMPlexSansArabic-Regular.ttf"),
        os.path.join(BASE_DIR, "..", "fonts", "IBMPlexSansArabic-Regular.ttf"),
        os.path.join(os.getcwd(), "engine", "fonts", "IBMPlexSansArabic-Regular.ttf"),
        os.path.join(os.getcwd(), "fonts", "IBMPlexSansArabic-Regular.ttf"),
        os.path.join(FONTS_DIR, "Rubik-Regular.ttf"),
        os.path.join(os.getcwd(), "fonts", "Rubik-Regular.ttf"),
    ]
    for p in fallback_paths:
        if os.path.exists(p):
            REGULAR_FONT_PATH = p
            break

if not os.path.exists(BOLD_FONT_PATH):
    fallback_bold_paths = [
        os.path.join(os.path.dirname(sys.executable), "fonts", "IBMPlexSansArabic-Bold.ttf"),
        os.path.join(BASE_DIR, "..", "fonts", "IBMPlexSansArabic-Bold.ttf"),
        os.path.join(os.getcwd(), "engine", "fonts", "IBMPlexSansArabic-Bold.ttf"),
        os.path.join(os.getcwd(), "fonts", "IBMPlexSansArabic-Bold.ttf"),
        os.path.join(FONTS_DIR, "Rubik-Bold.ttf"),
        os.path.join(os.getcwd(), "fonts", "Rubik-Bold.ttf"),
    ]
    for p in fallback_bold_paths:
        if os.path.exists(p):
            BOLD_FONT_PATH = p
            break

# Default template PDF candidates
def find_template_pdf() -> str:
    # 1. Environment variable override
    env_path = os.environ.get("TEMPLATE_PDF_PATH")
    if env_path and os.path.exists(env_path):
        return os.path.abspath(env_path)

    filename = "بحث أخوة الرب 2026 V3.pdf"

    # 2. Search upwards from multiple anchor points
    anchors = [
        os.getcwd(),
        BASE_DIR,
        os.path.dirname(sys.executable) if sys.executable else "",
    ]

    for anchor in anchors:
        if not anchor:
            continue
        curr = os.path.abspath(anchor)
        for _ in range(7):
            # Direct check in curr
            p = os.path.join(curr, filename)
            if os.path.exists(p):
                return p
            # In resources subdir
            p_res = os.path.join(curr, "resources", filename)
            if os.path.exists(p_res):
                return p_res
            # In src-tauri subdir
            p_tauri = os.path.join(curr, "src-tauri", filename)
            if os.path.exists(p_tauri):
                return p_tauri
            parent = os.path.dirname(curr)
            if parent == curr:
                break
            curr = parent

    return os.path.join(os.getcwd(), filename)

DEFAULT_TEMPLATE_PDF = find_template_pdf()

# Designated ID card boxes on Page 1 (Exact InDesign coordinates: 72 dpi A4 = 595.28 x 841.89)
HUSBAND_BOX = pymupdf.Rect(329.19, 242.49, 531.15, 382.09)
HUSBAND_BACK_BOX = pymupdf.Rect(329.19, 394.10, 531.15, 533.70)
WIFE_BOX = pymupdf.Rect(64.12, 242.49, 266.08, 382.09)
WIFE_BACK_BOX = pymupdf.Rect(64.12, 394.10, 266.08, 533.70)

# -----------------------------------------------------------------------------
# Arabic Text Reshaper & BiDi Utilities
# -----------------------------------------------------------------------------
RESHAPER_CONFIG = {
    'delete_harakat': False,
    'support_ligatures': True,
    'RIAL': True,
}
reshaper = arabic_reshaper.ArabicReshaper(configuration=RESHAPER_CONFIG)

from functools import lru_cache

@lru_cache(maxsize=4096)
def _cached_shape_arabic(text: str) -> str:
    try:
        reshaped = reshaper.reshape(text)
        return get_display(reshaped)
    except Exception as e:
        sys.stderr.write(f"[arabic_shaper] Error reshaping '{text}': {e}\n")
        return text

def shape_arabic(text: Any) -> str:
    """
    Shapes Arabic glyphs and applies the Unicode BiDi algorithm
    to prevent disconnected or reversed characters.
    Optimized with LRU memoization for high-speed batch text rendering.
    """
    if text is None:
        return ""
    str_val = str(text).strip()
    if not str_val:
        return ""
    return _cached_shape_arabic(str_val)

# Load font objects for measuring text length
font_regular = None
font_bold = None
if os.path.exists(REGULAR_FONT_PATH):
    try:
        font_regular = pymupdf.Font(fontfile=REGULAR_FONT_PATH)
    except Exception:
        pass

if os.path.exists(BOLD_FONT_PATH):
    try:
        font_bold = pymupdf.Font(fontfile=BOLD_FONT_PATH)
    except Exception:
        pass

def draw_arabic_text(
    page: pymupdf.Page,
    point: pymupdf.Point,
    text: str,
    fontname: str = "IBMPlexRegular",
    fontsize: float = 10.0,
    color: Tuple[float, float, float] = (0.1, 0.1, 0.1),
    align: int = 2  # 0=Left, 1=Center, 2=Right
) -> None:
    """
    Renders shaped Arabic text at the given coordinate with RTL alignment.
    In PyMuPDF, Point represents baseline insertion.
    """
    if not text:
        return
    shaped_text = shape_arabic(text)
    try:
        # Calculate width using our custom Font object if available
        text_width = 0.0
        font_obj = font_bold if "bold" in fontname.lower() else font_regular
        if font_obj:
            text_width = font_obj.text_length(shaped_text, fontsize=fontsize)
        else:
            text_width = len(shaped_text) * (fontsize * 0.5)

        adjusted_point = pymupdf.Point(point.x, point.y)
        
        if align == 2:  # Right-aligned
            adjusted_point.x = point.x - text_width
        elif align == 1:  # Centered
            adjusted_point.x = point.x - (text_width / 2.0)
            
        page.insert_text(
            adjusted_point,
            shaped_text,
            fontname=fontname,
            fontsize=fontsize,
            color=color,
        )
    except Exception as e:
        sys.stderr.write(f"[draw_text] Failed to insert '{shaped_text}': {e}\n")

def draw_arabic_text_in_rect(
    page: pymupdf.Page,
    rect: pymupdf.Rect,
    text: str,
    fontname: str = "IBMPlexRegular",
    max_fontsize: float = 24.0,
    min_fontsize: float = 7.0,
    color: Tuple[float, float, float] = (0.1, 0.1, 0.1),
    align: int = 2  # 0=Left, 1=Center, 2=Right
) -> None:
    """
    Pixel-Perfect Smart Auto Font Sizing Engine for PyMuPDF Stamping:
    1. Base vertical font size derived from font ascender+descender span (1.4 ratio for IBM Plex Arabic).
    2. Analytical width fitting: Scales down continuously if text length exceeds bounding box width.
    3. Exact baseline placement: Visually centers Arabic glyphs with subpixel precision.
    """
    if not text:
        return
    shaped_text = shape_arabic(text)
    font_obj = font_bold if "bold" in fontname.lower() else font_regular
    
    # 1. Height bound: Available inner height divided by total glyph span ratio (1.4 for IBM Plex)
    max_vert = max(min_fontsize, min(max_fontsize, (rect.height - 2.5) / 1.4))
    
    # 2. Width bound: Closed-form analytical scaling
    if font_obj:
        ref_len = font_obj.text_length(shaped_text, fontsize=10.0)
        if ref_len > 0:
            avail_w = max(10.0, rect.width - 6.0)
            max_horiz = (avail_w / ref_len) * 10.0 * 0.96
            fontsize = min(max_vert, max_horiz)
        else:
            fontsize = max_vert
    else:
        fontsize = max_vert
        
    fontsize = max(min_fontsize, min(max_fontsize, fontsize))
    
    # 3. Exact baseline placement: Optical vertical centering
    # IBM Plex: ascender=1.025, descender=-0.4. Center offset = (1.025 - 0.4) / 2 = 0.3125
    baseline_y = (rect.y0 + rect.y1) / 2.0 + (0.3125 * fontsize)
    
    if align == 2:
        pt = pymupdf.Point(rect.x1 - 3, baseline_y)
    elif align == 1:
        pt = pymupdf.Point((rect.x0 + rect.x1) / 2.0, baseline_y)
    else:
        pt = pymupdf.Point(rect.x0 + 3, baseline_y)
        
    draw_arabic_text(
        page=page,
        point=pt,
        text=text,
        fontname=fontname,
        fontsize=fontsize,
        color=color,
        align=align
    )

# -----------------------------------------------------------------------------
# Image Placement & Enhancement
# -----------------------------------------------------------------------------
def decode_base64_image(image_input: str) -> Optional[bytes]:
    """Decodes Base64 data URI or raw base64 string into bytes."""
    if not image_input:
        return None
    try:
        if "," in image_input:
            image_input = image_input.split(",", 1)[1]
        return base64.b64decode(image_input)
    except Exception as e:
        sys.stderr.write(f"[decode_image] Base64 decode error: {e}\n")
        return None

def stamp_id_card(
    page: pymupdf.Page,
    rect: pymupdf.Rect,
    image_data: Optional[str],
    label: str = "",
    force_portrait: bool = False
) -> None:
    """
    Stamps an ID card or certificate image into the designated PyMuPDF Rect.
    Ensures correct aspect ratio, handles smartphone camera EXIF orientation,
    guarantees vertical portrait alignment for birth certificates,
    auto-centers inside the bounding box and renders a crisp clean finish.
    """
    if not image_data:
        return
    
    img_bytes = None
    if os.path.exists(image_data):
        with open(image_data, "rb") as f:
            img_bytes = f.read()
    else:
        img_bytes = decode_base64_image(image_data)
        
    if not img_bytes:
        sys.stderr.write(f"[stamp_id_card] Could not obtain bytes for {label}\n")
        return

    try:
        # Load through Pillow
        pil_img = Image.open(io.BytesIO(img_bytes))

        # 🔄 1. Auto-transpose EXIF orientation from smartphone cameras (iPhone / Android)
        try:
            pil_img = ImageOps.exif_transpose(pil_img)
        except Exception as exif_err:
            sys.stderr.write(f"[stamp_id_card] EXIF transpose error: {exif_err}\n")

        # Convert to RGB (handles RGBA, Palette, Grayscale, etc.)
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        # 📐 2. Ensure Portrait orientation for documents that require it (e.g. Birth Certificates)
        # An Egyptian birth certificate is inherently a portrait document (height > width).
        # If an uploaded image is landscape (width > height), rotate it so it enters the bounding box
        # as Portrait. When page-level rotation (set_rotation(90)) rotates the page,
        # the certificate rotates seamlessly to Landscape, filling the box exactly as intended!
        if force_portrait and pil_img.width > pil_img.height:
            sys.stderr.write(f"[stamp_id_card] Auto-rotating landscape image to portrait for {label} ({pil_img.size})\n")
            pil_img = pil_img.rotate(270, expand=True)

        out_buf = io.BytesIO()
        pil_img.save(out_buf, format="JPEG", quality=95, dpi=(300, 300))
        processed_bytes = out_buf.getvalue()

        # Cover any placeholder text with a clean white backing rect
        page.draw_rect(rect, color=(0.85, 0.85, 0.85), fill=(1.0, 1.0, 1.0), width=0.5)

        # PyMuPDF insert_image with keep_proportion=True auto-centers within rect
        page.insert_image(
            rect,
            stream=processed_bytes,
            keep_proportion=True
        )
        sys.stderr.write(f"[stamp_id_card] Successfully stamped {label} into {rect}\n")
    except Exception as e:
        sys.stderr.write(f"[stamp_id_card] Failed stamping {label}: {e}\n")

# -----------------------------------------------------------------------------
# Layout Resolver & Dynamic Field Value Resolution
# -----------------------------------------------------------------------------
DEFAULT_LAYOUT_CANDIDATES = [
    os.path.join(BASE_DIR, "document_layout.json"),
    os.path.join(BASE_DIR, "..", "src", "config", "document_layout.json"),
    os.path.join(os.getcwd(), "engine", "document_layout.json"),
    os.path.join(os.getcwd(), "src", "config", "document_layout.json"),
    "/Users/saitama/Downloads/بحث اخوة الرب/engine/document_layout.json",
    "/Users/saitama/Downloads/بحث اخوة الرب/src/config/document_layout.json"
]

def load_default_layout() -> Dict[str, Any]:
    for p in DEFAULT_LAYOUT_CANDIDATES:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data and isinstance(data, dict):
                        sys.stderr.write(f"[engine] Loaded default layout from: {p}\n")
                        return data
            except Exception as e:
                sys.stderr.write(f"[engine] Error reading layout from {p}: {e}\n")
    return {}

def get_nested_value(obj: Any, path: str) -> Any:
    if not path or obj is None:
        return ""
    if isinstance(obj, dict) and path in obj and obj[path] is not None:
        return obj[path]
    import re
    parts = re.split(r'\.|\[|\]', path)
    parts = [p for p in parts if p]
    curr = obj
    for part in parts:
        if curr is None:
            return ""
        if isinstance(curr, dict):
            curr = curr.get(part)
        elif isinstance(curr, list):
            try:
                idx = int(part)
                if 0 <= idx < len(curr):
                    curr = curr[idx]
                else:
                    return ""
            except (ValueError, TypeError):
                return ""
        else:
            return ""
    return curr if curr is not None else ""

def is_husband_absent_py(husband: dict) -> bool:
    if not isinstance(husband, dict):
        return False
    status = husband.get("status")
    if status and status != "present":
        return True
    name = (husband.get("name") or "").strip().lower()
    for kw in ["متوفي", "المرحوم", "تارك المنزل", "خارج الحظيرة", "مرتد", "منفصل", "مطلق", "سجين"]:
        if kw in name:
            return True
    return False

def is_wife_absent_py(wife: dict) -> bool:
    if not isinstance(wife, dict):
        return False
    status = wife.get("status")
    if status and status != "present":
        return True
    name = (wife.get("name") or "").strip().lower()
    for kw in ["متوفي", "متوفية", "المرحومة", "تاركة المنزل", "تارك المنزل", "خارج الحظيرة", "مرتدة", "منفصلة", "مطلقة", "سجينة"]:
        if kw in name:
            return True
    return False

def get_husband_status_label_py(husband: dict) -> str:
    if not isinstance(husband, dict):
        return ""
    st = husband.get("status")
    if st == "other" and husband.get("custom_status"):
        return str(husband.get("custom_status")).strip()

    labels = {
        "deceased": "متوفي",
        "abandoned": "تارك المنزل",
        "apostate": "خارج الحظيرة",
        "separated": "منفصل / طلاق",
        "traveler": "مسافر / غائب",
        "prisoner": "سجين / محبوس",
    }
    if st in labels:
        return labels[st]

    name = (husband.get("name") or "").strip()
    if "متوفي" in name or "المرحوم" in name: return "متوفي"
    if "تارك" in name: return "تارك المنزل"
    if "خارج الحظيرة" in name or "مرتد" in name: return "خارج الحظيرة"
    if "منفصل" in name or "مطلق" in name: return "منفصل / طلاق"
    if "سجين" in name: return "سجين / محبوس"
    if "مسافر" in name: return "مسافر / غائب"

    if st == "present":
        return "متواجد (على قيد الحياة)"
    return "متواجد (على قيد الحياة)"

def get_wife_status_label_py(wife: dict) -> str:
    if not isinstance(wife, dict):
        return ""
    st = wife.get("status")
    if st == "other" and wife.get("custom_status"):
        return str(wife.get("custom_status")).strip()

    labels = {
        "deceased": "متوفية",
        "abandoned": "تاركة المنزل",
        "apostate": "خارج الحظيرة",
        "separated": "منفصلة / طلاق",
        "traveler": "مسافرة / غائبة",
        "prisoner": "سجينة / محبوسة",
    }
    if st in labels:
        return labels[st]

    name = (wife.get("name") or "").strip()
    if "متوفية" in name or "متوفي" in name or "المرحومة" in name: return "متوفية"
    if "تارك" in name: return "تاركة المنزل"
    if "خارج الحظيرة" in name or "مرتد" in name: return "خارج الحظيرة"
    if "منفصل" in name or "مطلق" in name: return "منفصلة / طلاق"
    if "سجين" in name: return "سجينة / محبوسة"
    if "مسافر" in name: return "مسافرة / غائبة"

    if st == "present":
        return "متواجدة (على قيد الحياة)"
    return "متواجدة (على قيد الحياة)"

def get_effective_husband_display_name_py(husband: dict) -> str:
    if not isinstance(husband, dict):
        return ""
    name = (husband.get("name") or "").strip()
    if not is_husband_absent_py(husband):
        return name
    status_label = get_husband_status_label_py(husband)
    if not name:
        return status_label
    if status_label in name or "متوفي" in name or "المرحوم" in name:
        return name
    return f"{name} ({status_label})"

def get_effective_wife_display_name_py(wife: dict) -> str:
    if not isinstance(wife, dict):
        return ""
    name = (wife.get("name") or "").strip()
    if not is_wife_absent_py(wife):
        return name
    status_label = get_wife_status_label_py(wife)
    if not name:
        return status_label
    if status_label in name or "متوفي" in name or "متوفية" in name or "المرحومة" in name:
        return name
    return f"{name} ({status_label})"

def get_head_of_household_name_py(data: dict) -> str:
    if not isinstance(data, dict):
        return ""
    p2 = data.get("page2", {})
    husband = p2.get("husband", {}) if isinstance(p2, dict) else {}
    wife = p2.get("wife", {}) if isinstance(p2, dict) else {}
    p6 = data.get("page6", {}) if isinstance(data.get("page6"), dict) else {}
    wife_name = (wife.get("name") or "").strip()
    husband_name = (husband.get("name") or "").strip()

    h_absent = is_husband_absent_py(husband)
    w_absent = is_wife_absent_py(wife)

    # If husband is absent/dead and wife is present -> wife
    if h_absent and not w_absent and wife_name:
        return wife_name

    # If wife is dead/absent and husband is alive/present -> husband
    if w_absent and not h_absent and husband_name:
        return husband_name

    if not h_absent and husband_name:
        return husband_name
    if not w_absent and wife_name:
        return wife_name

    if husband_name: return husband_name
    if wife_name: return wife_name
    if p6.get("family_head"): return str(p6.get("family_head")).strip()
    return ""

def resolve_field_value(data: Dict[str, Any], binding: str, field_id: str = "") -> Any:
    if not binding:
        return ""

    # Special intelligent handling for husband/wife name and family head
    if binding == "page2.husband.name":
        p2 = data.get("page2", {}) if isinstance(data, dict) else {}
        h = p2.get("husband", {}) if isinstance(p2, dict) else {}
        formatted = get_effective_husband_display_name_py(h)
        if formatted:
            return formatted

    if binding == "page2.wife.name":
        p2 = data.get("page2", {}) if isinstance(data, dict) else {}
        w = p2.get("wife", {}) if isinstance(p2, dict) else {}
        formatted = get_effective_wife_display_name_py(w)
        if formatted:
            return formatted

    if binding in ["page6.family_head", "page6.head_name"]:
        val = get_nested_value(data, binding)
        if val:
            return val
        head = get_head_of_household_name_py(data)
        if head:
            return head

    # 1. Direct path lookup
    val = get_nested_value(data, binding)
    if val != "" and val is not None:
        return val

    # 2. Root-level direct key fallback
    if isinstance(data, dict) and binding in data and data[binding] is not None:
        return data[binding]

    # 3. Canonical Aliases Map
    aliases = {
        "page6.head_name": ["page6.family_head", "family_head", "page2.wife.name" if is_husband_absent_py(data.get("page2", {}).get("husband", {})) else "page2.husband.name", "page2.wife.name"],
        "page6.family_head": ["page6.head_name", "head_name", "page2.wife.name" if is_husband_absent_py(data.get("page2", {}).get("husband", {})) else "page2.husband.name", "page2.wife.name"],
        "page6.church_id": ["page6.church_records_id", "church_records_id", "page1.church_study_id"],
        "page6.church_records_id": ["page6.church_id", "church_id", "page1.church_study_id"],
        "page6.care_id": ["page6.cathedral_care_id", "cathedral_care_id", "page1.cathedral_care_id"],
        "page6.cathedral_care_id": ["page6.care_id", "care_id", "page1.cathedral_care_id"],
        "page6.member_id": ["page6.church_membership_id", "church_membership_id", "page1.church_membership_id"],
        "page6.church_membership_id": ["page6.member_id", "member_id", "page1.church_membership_id"],
        "page5.other_notes": ["page5.notes", "notes"],
        "page5.notes": ["page5.other_notes", "other_notes"],
        "page4.total_church_aid": ["page4.church_aid.Total", "page4.church_aid_total"],
        "page4.church_aid.Total": ["page4.total_church_aid", "page4.church_aid_total"],
        "page4.church_aid_total": ["page4.total_church_aid", "page4.church_aid.Total"],
        "page4.church_aid_total_notes": ["page4.church_aid.purpose"],
        "page4.church_aid.purpose": ["page4.church_aid_total_notes"],
        "الدخل الشهري - معاش": ["page4.income.pension", "page4.pension"],
        "page4.income.pension": ["الدخل الشهري - معاش", "page4.pension"],
        "page4.pension": ["الدخل الشهري - معاش", "page4.income.pension"],
        "page3.family_members_notes": ["Page3.comment1"],
        "Page3.comment1": ["page3.family_members_notes"],
        "page3.other_members_notes": ["Page3.comment2"],
        "Page3.comment2": ["page3.other_members_notes"],
        "page3.medical_conditions.continuous_treatment": ["Page3.medicine", "page3.medicine"],
        "Page3.medicine": ["page3.medical_conditions.continuous_treatment", "page3.medicine"],
        "page2.gov_programs.has_ration_card": ["custom.select_6228"],
        "custom.select_6228": ["page2.gov_programs.has_ration_card"],
        "page2.housing_type": ["Page2.live", "page2.address.housing_type"],
        "Page2.live": ["page2.housing_type", "page2.address.housing_type"],
        "page2.emergency_contacts[0].name": ["Page2.name1"],
        "Page2.name1": ["page2.emergency_contacts[0].name"],
        "page2.emergency_contacts[0].phone": ["Page2.number1"],
        "Page2.number1": ["page2.emergency_contacts[0].phone"],
        "page2.emergency_contacts[1].name": ["Page2.name2"],
        "Page2.name2": ["page2.emergency_contacts[1].name"],
        "page2.emergency_contacts[1].phone": ["Page2.number2"],
        "Page2.number2": ["page2.emergency_contacts[1].phone"],
        "page2.emergency_contacts[2].name": ["Page2.name3"],
        "Page2.name3": ["page2.emergency_contacts[2].name"],
        "page2.emergency_contacts[2].phone": ["Page2.number3"],
        "Page2.number3": ["page2.emergency_contacts[2].phone"],
        "page2.emergency_contacts[3].name": ["Page2.name4"],
        "Page2.name4": ["page2.emergency_contacts[3].name"],
        "page2.emergency_contacts[3].phone": ["Page2.number4"],
        "Page2.number4": ["page2.emergency_contacts[3].phone"],
        "page1.church_name": ["Page1.churchName", "page1.churchName"],
        "page2.address.housing_notes": ["page2.address.notes"],
        "page2.address.notes": ["page2.address.housing_notes"],
        "husband_id_image": ["page1.husband_id_image"],
        "page1.husband_id_image": ["husband_id_image"],
        "husband_id_back_image": ["page1.husband_id_back_image"],
        "page1.husband_id_back_image": ["husband_id_back_image"],
        "wife_id_image": ["page1.wife_id_image"],
        "page1.wife_id_image": ["wife_id_image"],
        "wife_id_back_image": ["page1.wife_id_back_image"],
        "page1.wife_id_back_image": ["wife_id_back_image"],
    }

    for alt in aliases.get(binding, []):
        v = get_nested_value(data, alt)
        if v != "" and v is not None:
            return v

    # 4. Date decomposition
    # Page 1 study_date <-> day, month, year
    p1 = data.get("page1", {})
    study_date = str(p1.get("study_date", "")).strip()
    if study_date:
        parts = study_date.replace("-", "/").split("/")
        if len(parts) == 3:
            if len(parts[0]) == 4:
                y, m, d = parts[0], parts[1], parts[2]
            else:
                d, m, y = parts[0], parts[1], parts[2]
            if binding == "page1.day": return d
            if binding == "page1.month": return m
            if binding == "page1.year": return y

    # Page 6 from_date / to_date decomposition
    p6 = data.get("page6", {})
    from_date = str(p6.get("from_date", "")).strip()
    if from_date:
        parts = from_date.replace("-", "/").split("/")
        if len(parts) == 3:
            if len(parts[0]) == 4: y, m, d = parts[0], parts[1], parts[2]
            else: d, m, y = parts[0], parts[1], parts[2]
            if binding == "page6.from_date_day": return d
            if binding == "page6.from_date_month": return m
            if binding == "page6.from_date_year": return y

    to_date = str(p6.get("to_date", "")).strip()
    if to_date:
        parts = to_date.replace("-", "/").split("/")
        if len(parts) == 3:
            if len(parts[0]) == 4: y, m, d = parts[0], parts[1], parts[2]
            else: d, m, y = parts[0], parts[1], parts[2]
            if binding == "page6.to_date_day": return d
            if binding == "page6.to_date_month": return m
            if binding == "page6.to_date_year": return y

    # Page 3 family_other_members[1..4] / other_members[1..4] -> page3.other_persons[0..3]
    import re
    m = re.match(r'page3\.(?:family_other_members|other_members)\[(\d+)\]\.(.*)', binding)
    if m:
        idx = int(m.group(1))
        sub_key = m.group(2)
        p3_obj = data.get("page3", {}) if isinstance(data, dict) else {}
        fom = p3_obj.get("family_other_members", [])
        if isinstance(fom, (list, dict)):
            fom_item = fom[idx] if isinstance(fom, list) and 0 <= idx < len(fom) else fom.get(str(idx)) or fom.get(idx) if isinstance(fom, dict) else None
            if isinstance(fom_item, dict) and fom_item.get(sub_key) not in (None, ""):
                return fom_item.get(sub_key)
        om = p3_obj.get("other_members", [])
        if isinstance(om, (list, dict)):
            om_item = om[idx] if isinstance(om, list) and 0 <= idx < len(om) else om.get(str(idx)) or om.get(idx) if isinstance(om, dict) else None
            if isinstance(om_item, dict) and om_item.get(sub_key) not in (None, ""):
                return om_item.get(sub_key)

        other_persons = p3_obj.get("other_persons", [])
        for try_idx in [idx - 1, idx]:
            if 0 <= try_idx < len(other_persons):
                op = other_persons[try_idx]
                if sub_key in ("name",): return op.get("name", "")
                if sub_key in ("national_id", "nid"): return op.get("national_id", "")
                if sub_key in ("relavent", "kinship"): return op.get("kinship") or op.get("relavent", "")
                if sub_key in ("Status", "social_status"): return op.get("social_status") or op.get("Status", "")
                if sub_key in ("sYear", "education_job"): return op.get("education_job") or op.get("sYear", "")
                if sub_key in ("income",): return op.get("income", "")
                if sub_key in ("confession_father",): return op.get("confession_father", "")

    # Page 4 Total Church Aid
    if binding in ("page4.church_aid.Total", "page4.church_aid_total", "page4.total_church_aid"):
        explicit_val = data.get("page4", {}).get("total_church_aid")
        if explicit_val not in (None, ""):
            return str(explicit_val)
        aid_list = data.get("page4", {}).get("church_aid", [])
        tot = 0.0
        for item in aid_list:
            try:
                tot += float(item.get("value", 0))
            except (ValueError, TypeError):
                pass
        return f"{tot:.0f}" if tot > 0 else ""

    # Page 4 Income Lines Fallbacks
    if binding in ("page4.income.base_salary",):
        explicit_val = data.get("page4", {}).get("income", {}).get("base_salary")
        if explicit_val not in (None, ""):
            return str(explicit_val)
        h_sal = float(str(data.get("page2", {}).get("husband", {}).get("salary") or 0).replace("ج.م", "").replace(",", "").strip() or 0)
        return f"{h_sal:.0f}" if h_sal > 0 else ""

    if binding in ("page4.income.side_project",):
        explicit_val = data.get("page4", {}).get("income", {}).get("side_project")
        if explicit_val not in (None, ""):
            return str(explicit_val)
        p_val = float(str(data.get("الدخل الشهري - معاش") or data.get("page4", {}).get("pension") or 0).replace("ج.م", "").replace(",", "").strip() or 0)
        proj_keys = [
            "الدخل الشهري - فرشة", "الدخل الشهري - كشك", "الدخل الشهري - محل",
            "الدخل الشهري - تجارة", "الدخل الشهري - تروسيكل", "الدخل الشهري - أنابيب",
            "الدخل الشهري - مكنة خياطة", "الدخل الشهري - ثلاجة", "الدخل الشهري - طيور"
        ]
        proj_tot = sum(float(str(data.get(pk) or 0).replace("ج.م", "").replace(",", "").strip() or 0) for pk in proj_keys)
        comb = proj_tot + p_val
        return f"{comb:.0f}" if comb > 0 else ""

    if binding in ("page4.income.relatives_aid",):
        explicit_val = data.get("page4", {}).get("income", {}).get("relatives_aid")
        if explicit_val not in (None, ""):
            return str(explicit_val)
        w_sal = float(str(data.get("page2", {}).get("wife", {}).get("salary") or 0).replace("ج.م", "").replace(",", "").strip() or 0)
        r_val = float(str(data.get("الدخل الشهري - مساعدات احد الافراد") or 0).replace("ج.م", "").replace(",", "").strip() or 0)
        comb = w_sal + r_val
        return f"{comb:.0f}" if comb > 0 else ""

    # Page 4 Total Income
    if binding in ("page4.income.total_income",):
        explicit_val = data.get("page4", {}).get("income", {}).get("total_income")
        if explicit_val not in (None, ""):
            return str(explicit_val)
        inc = data.get("page4", {}).get("income", {})
        tot = 0.0
        for k in ("church_aid", "medical_aid", "study_aid", "base_salary", "side_project", "relatives_aid"):
            try:
                raw_k_val = inc.get(k)
                if raw_k_val in (None, "", 0, "0"):
                    if k == "base_salary":
                        h_sal = float(str(data.get("page2", {}).get("husband", {}).get("salary") or 0).replace("ج.م", "").replace(",", "").strip() or 0)
                        raw_k_val = h_sal if h_sal > 0 else ""
                    elif k == "side_project":
                        p_val = float(str(data.get("الدخل الشهري - معاش") or data.get("page4", {}).get("pension") or 0).replace("ج.م", "").replace(",", "").strip() or 0)
                        proj_keys = [
                            "الدخل الشهري - فرشة", "الدخل الشهري - كشك", "الدخل الشهري - محل",
                            "الدخل الشهري - تجارة", "الدخل الشهري - تروسيكل", "الدخل الشهري - أنابيب",
                            "الدخل الشهري - مكنة خياطة", "الدخل الشهري - ثلاجة", "الدخل الشهري - طيور"
                        ]
                        proj_tot = sum(float(str(data.get(pk) or 0).replace("ج.م", "").replace(",", "").strip() or 0) for pk in proj_keys)
                        raw_k_val = (proj_tot + p_val) if (proj_tot + p_val) > 0 else ""
                    elif k == "relatives_aid":
                        w_sal = float(str(data.get("page2", {}).get("wife", {}).get("salary") or 0).replace("ج.م", "").replace(",", "").strip() or 0)
                        r_val = float(str(data.get("الدخل الشهري - مساعدات احد الافراد") or 0).replace("ج.م", "").replace(",", "").strip() or 0)
                        raw_k_val = w_sal + r_val if (w_sal + r_val) > 0 else ""
                val_str = str(raw_k_val or 0).replace("ج.م", "").replace(",", "").strip()
                tot += float(val_str)
            except (ValueError, TypeError):
                pass
        return f"{tot:.0f} ج.م" if tot > 0 else ""

    # Page 4 Total Expenses
    if binding in ("page4.expenses.total_expenses",):
        explicit_val = data.get("page4", {}).get("expenses", {}).get("total_expenses")
        if explicit_val not in (None, ""):
            return str(explicit_val)
        exp = data.get("page4", {}).get("expenses", {})
        tot = 0.0
        for k in ("living_basics", "utilities", "phone", "rent", "medical", "education"):
            try:
                val_str = str(exp.get(k, 0)).replace("ج.م", "").replace(",", "").strip()
                tot += float(val_str)
            except (ValueError, TypeError):
                pass
        return f"{tot:.0f} ج.م" if tot > 0 else ""

    return ""

def draw_arabic_multiline_text_in_rect(
    page: pymupdf.Page,
    rect: pymupdf.Rect,
    text: str,
    fontname: str = "RubikRegular",
    fontsize: float = 9.5,
    line_height_factor: float = 1.38,
    color: Tuple[float, float, float] = (0.1, 0.1, 0.1),
    align: int = 2
) -> None:
    if not text:
        return
    font_obj = font_bold if "bold" in fontname.lower() else font_regular
    avail_w = max(10.0, rect.width - 6.0)

    # Split into paragraphs by newline
    paragraphs = str(text).split("\n")
    lines = []
    for p in paragraphs:
        p_words = p.split()
        if not p_words:
            lines.append("")
            continue
        curr_words = []
        for w in p_words:
            test_line = " ".join(curr_words + [w])
            shaped_test = shape_arabic(test_line)
            w_px = font_obj.text_length(shaped_test, fontsize=fontsize) if font_obj else len(test_line) * fontsize * 0.55
            if w_px > avail_w and curr_words:
                lines.append(" ".join(curr_words))
                curr_words = [w]
            else:
                curr_words.append(w)
        if curr_words:
            lines.append(" ".join(curr_words))

    line_h = fontsize * line_height_factor
    total_h = len(lines) * line_h
    # If total height exceeds rect, auto-shrink font size slightly
    if total_h > (rect.height - 4) and fontsize > 7.0:
        new_fs = max(7.0, fontsize * ((rect.height - 4) / total_h))
        draw_arabic_multiline_text_in_rect(page, rect, text, fontname, new_fs, line_height_factor, color, align)
        return

    current_y = rect.y0 + line_h - 1.5
    for line in lines:
        if not line.strip():
            current_y += line_h
            continue
        if current_y > rect.y1:
            break
        pt_x = rect.x1 - 3
        if align == 1:
            pt_x = (rect.x0 + rect.x1) / 2.0
        elif align == 0:
            pt_x = rect.x0 + 3
        pt = pymupdf.Point(pt_x, current_y)
        draw_arabic_text(page, pt, line, fontname=fontname, fontsize=fontsize, color=color, align=align)
        current_y += line_h

# -----------------------------------------------------------------------------
# Document Generator Engine
# -----------------------------------------------------------------------------
class PDFCareReportEngine:
    def __init__(self, template_pdf_path: Optional[str] = None):
        self.template_pdf_path = template_pdf_path or DEFAULT_TEMPLATE_PDF
        if not os.path.exists(self.template_pdf_path):
            raise FileNotFoundError(f"Template PDF not found at {self.template_pdf_path}")
        
    def generate(
        self,
        data: Dict[str, Any],
        output_path: str,
        layout: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Loads the 6-page template, embeds fonts, stamps all text & images
        according to the precise field layout coordinates, and saves a
        print-ready consolidated A4 PDF.
        """
        doc = pymupdf.open(self.template_pdf_path)
        if len(doc) < 6:
            raise ValueError(f"Template PDF must contain 6 pages, found {len(doc)}")

        # 1. Complete PDF Flattening: Strip all interactive form fields, widgets & annotations
        # This permanently removes all blue highlight boxes, comboboxes, and InDesign form widgets.
        sys.stderr.write("[engine] Flattening template: Removing all interactive form widgets & annotations...\n")
        for page in doc:
            for w in list(page.widgets()):
                page.delete_widget(w)
            for a in list(page.annots()):
                page.delete_annot(a)

        try:
            cat_xref = doc.pdf_catalog()
            doc.xref_set_key(cat_xref, "AcroForm", "null")
        except Exception as e:
            sys.stderr.write(f"[engine] Notice on removing AcroForm catalog key: {e}\n")

        # Embed Rubik on all pages (with IBMPlex aliases for backwards compatibility)
        for page in doc:
            if os.path.exists(REGULAR_FONT_PATH):
                page.insert_font(fontname="RubikRegular", fontfile=REGULAR_FONT_PATH)
                page.insert_font(fontname="IBMPlexRegular", fontfile=REGULAR_FONT_PATH)
            if os.path.exists(BOLD_FONT_PATH):
                page.insert_font(fontname="RubikBold", fontfile=BOLD_FONT_PATH)
                page.insert_font(fontname="IBMPlexBold", fontfile=BOLD_FONT_PATH)

        active_layout = layout or load_default_layout()
        has_layout = bool(active_layout and any(active_layout.get(str(p)) or active_layout.get(p) for p in range(1, 7)))

        if has_layout:
            sys.stderr.write("[engine] Populating all 6 base pages using dynamic layout coordinates...\n")
            for p in range(1, 7):
                fields = active_layout.get(str(p)) or active_layout.get(p) or []
                self._populate_page_with_layout(doc[p - 1], p, fields, data)
        else:
            sys.stderr.write("[engine] No layout found; falling back to hardcoded coordinates...\n")
            # Page 1: General Info & ID Cards
            self._populate_page_1(doc[0], data)
            # Page 2: Husband & Wife Details, Housing & Ration Card
            self._populate_page_2(doc[1], data)
            # Page 3: Family Members, Living Conditions & Medical
            self._populate_page_3(doc[2], data)
            # Page 4: Church Aid & Income/Expense Matrix
            self._populate_page_4(doc[3], data)
            # Page 5: Committee Decisions
            self._populate_page_5(doc[4], data)
            # Page 6: Aid History Ledger & Signatures
            self._populate_page_6(doc[5], data)

        # Populate Extra Pages (Duplicated Ledger, ID Cards, Birth Certificates)
        extra_pages = data.get("extra_pages", [])
        if extra_pages:
            sys.stderr.write(f"[engine] Appending {len(extra_pages)} dynamic extra pages...\n")
            self._populate_extra_pages(doc, extra_pages, data, active_layout)

        # Save print-ready PDF
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        doc.save(
            output_path,
            garbage=4,
            deflate=True,
            clean=True
        )
        total_pages_count = len(doc)
        doc.close()
        
        return {
            "status": "success",
            "output_path": output_path,
            "pages": total_pages_count,
            "size_bytes": os.path.getsize(output_path)
        }

    # -------------------------------------------------------------------------
    # DYNAMIC LAYOUT-DRIVEN POPULATOR (Pixel-Perfect Field Stamping)
    # -------------------------------------------------------------------------
    def _populate_page_with_layout(
        self,
        page: pymupdf.Page,
        page_num: int,
        fields: list,
        data: Dict[str, Any]
    ):
        page_w = page.rect.width   # 595.28 pt A4 standard
        page_h = page.rect.height  # 841.89 pt A4 standard

        for field in fields:
            rect_cfg = field.get("rect")
            if not rect_cfg:
                continue

            left = float(rect_cfg.get("left", 0.0))
            top = float(rect_cfg.get("top", 0.0))
            width = float(rect_cfg.get("width", 0.0))
            height = float(rect_cfg.get("height", 0.0))

            if width <= 0 or height <= 0:
                continue

            # Convert percentage coordinates to PyMuPDF A4 points
            x0 = (left / 100.0) * page_w
            y0 = (top / 100.0) * page_h
            x1 = x0 + (width / 100.0) * page_w
            y1 = y0 + (height / 100.0) * page_h
            field_rect = pymupdf.Rect(x0, y0, x1, y1)

            field_type = field.get("type", "text")
            binding = field.get("binding", "")
            field_id = field.get("id", "")
            label = field.get("label", "")

            val = resolve_field_value(data, binding, field_id)

            # 1. Image fields (ID Cards, Member Photos, etc.)
            if field_type == "image":
                if val:
                    stamp_id_card(page, field_rect, str(val), label=label)
                continue

            # 2. Checkbox fields
            if field_type == "checkbox":
                is_checked = False
                if isinstance(val, bool):
                    is_checked = val
                elif str(val).lower() in ("true", "1", "نعم", "yes"):
                    is_checked = True
                if is_checked:
                    draw_arabic_text_in_rect(
                        page=page,
                        rect=field_rect,
                        text="✔",
                        fontname="IBMPlexBold",
                        max_fontsize=12.0,
                        align=1
                    )
                continue

            # 3. Text / Textarea / Select / Number / Date fields
            if val is None:
                continue
            text_val = str(val).strip()
            if not text_val:
                continue

            style = field.get("style", {}) or {}
            is_bold = bool(style.get("isBold", False))
            fontname = "IBMPlexBold" if is_bold else "IBMPlexRegular"
            align_str = style.get("textAlign", "right")
            align = 1 if align_str == "center" else (0 if align_str == "left" else 2)

            # Multi-line handling for textareas or tall boxes with lots of text
            if field_type == "textarea" or (height > 4.5 and (len(text_val) > 40 or "\n" in text_val)):
                fs = 9.5
                pref_fs = style.get("fontSize")
                if isinstance(pref_fs, (int, float)) and pref_fs > 0:
                    fs = pref_fs * 0.726
                draw_arabic_multiline_text_in_rect(
                    page=page,
                    rect=field_rect,
                    text=text_val,
                    fontname=fontname,
                    fontsize=fs,
                    align=align
                )
            else:
                max_fs = 20.0
                min_fs = 7.0
                pref_fs = style.get("fontSize")
                if isinstance(pref_fs, (int, float)) and pref_fs > 0:
                    max_fs = pref_fs * 0.726
                    min_fs = min(max_fs, 7.0)

                draw_arabic_text_in_rect(
                    page=page,
                    rect=field_rect,
                    text=text_val,
                    fontname=fontname,
                    max_fontsize=max_fs,
                    min_fontsize=min_fs,
                    align=align
                )

    # -------------------------------------------------------------------------
    # PAGE 1: Header, Identification & ID Card Photos
    # -------------------------------------------------------------------------
    def _populate_page_1(self, page: pymupdf.Page, data: Dict[str, Any]):
        p1 = data.get("page1", {})

        # Church Name (x=220 to 515, y=172)
        church_name = p1.get("church_name") or (data.get("Page1", {}).get("churchName", ""))
        if church_name:
            draw_arabic_text(page, pymupdf.Point(510, 172), church_name, fontsize=10, align=2)

        # Date of study (day / month / year or study_date)
        day = p1.get("day") or (data.get("Page1", {}).get("day", ""))
        month = p1.get("month") or (data.get("Page1", {}).get("month", ""))
        year = p1.get("year") or (data.get("Page1", {}).get("year", ""))
        study_date = p1.get("study_date", "")

        if day or month or year:
            if day:
                draw_arabic_text(page, pymupdf.Point(133, 172), str(day), fontsize=10, align=1)
            if month:
                draw_arabic_text(page, pymupdf.Point(100, 172), str(month), fontsize=10, align=1)
            if year:
                draw_arabic_text(page, pymupdf.Point(65, 172), str(year), fontsize=10, align=1)
        elif study_date:
            parts = str(study_date).replace("-", "/").split("/")
            if len(parts) == 3:
                if len(parts[0]) == 4:
                    y, m, d = parts[0], parts[1], parts[2]
                else:
                    d, m, y = parts[0], parts[1], parts[2]
                draw_arabic_text(page, pymupdf.Point(133, 172), str(d), fontsize=10, align=1)
                draw_arabic_text(page, pymupdf.Point(100, 172), str(m), fontsize=10, align=1)
                draw_arabic_text(page, pymupdf.Point(65, 172), str(y), fontsize=10, align=1)
            else:
                draw_arabic_text(page, pymupdf.Point(110, 172), str(study_date), fontsize=9, align=1)

        # Church Study ID (رقم البحث بالكنيسة inside Rect(228.2, 107.4, 273.2, 126.4))
        draw_arabic_text(page, pymupdf.Point(250, 121), p1.get("church_study_id", ""), fontsize=11, align=1, fontname="IBMPlexBold")

        # Area / District (المنطقة)
        draw_arabic_text(page, pymupdf.Point(510, 584), p1.get("area", ""), fontsize=11)

        # Responsible Priest Name (اسم الكاهن المسؤول)
        draw_arabic_text(page, pymupdf.Point(460, 637), p1.get("responsible_priest", ""), fontsize=11)

        # Cathedral Care Program ID (رقم بحث الحالة ببرنامج إدارة الرعاية)
        draw_arabic_text(page, pymupdf.Point(350, 685), p1.get("cathedral_care_id", ""), fontsize=11)

        # Church Membership Program ID (رقم الأسرة ببرنامج العضوية الكنسية)
        draw_arabic_text(page, pymupdf.Point(340, 738), p1.get("church_membership_id", ""), fontsize=11)

        # Stamp All 4 National ID Cards (Husband Front & Back, Wife Front & Back)
        husband_id_img = data.get("husband_id_image") or p1.get("husband_id_image")
        husband_id_back_img = data.get("husband_id_back_image") or p1.get("husband_id_back_image")
        wife_id_img = data.get("wife_id_image") or p1.get("wife_id_image")
        wife_id_back_img = data.get("wife_id_back_image") or p1.get("wife_id_back_image")

        stamp_id_card(page, HUSBAND_BOX, husband_id_img, label="Husband ID Front")
        stamp_id_card(page, HUSBAND_BACK_BOX, husband_id_back_img, label="Husband ID Back")
        stamp_id_card(page, WIFE_BOX, wife_id_img, label="Wife ID Front")
        stamp_id_card(page, WIFE_BACK_BOX, wife_id_back_img, label="Wife ID Back")

    # -------------------------------------------------------------------------
    # PAGE 2: Family Data (Husband, Wife, Housing & Govt Programs)
    # -------------------------------------------------------------------------
    def _populate_page_2(self, page: pymupdf.Page, data: Dict[str, Any]):
        p2 = data.get("page2", {})
        h = p2.get("husband", {})
        w = p2.get("wife", {})
        addr = p2.get("address", {})
        gov = p2.get("gov_programs", {})

        # Husband Column (Right side, approx X=470)
        h_display_name = get_effective_husband_display_name_py(h)
        draw_arabic_text(page, pymupdf.Point(480, 150), h_display_name, fontsize=10)
        draw_arabic_text(page, pymupdf.Point(470, 176), h.get("nickname", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(460, 203), h.get("national_id", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(475, 236), h.get("job", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(475, 265), str(h.get("salary", "")), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(465, 294), h.get("phone", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(465, 321), h.get("confession_father", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(470, 350), h.get("insurance_no", ""), fontsize=10)

        # Wife Column (Left side, approx X=230)
        w_display_name = get_effective_wife_display_name_py(w)
        draw_arabic_text(page, pymupdf.Point(235, 150), w_display_name, fontsize=10)
        draw_arabic_text(page, pymupdf.Point(230, 176), w.get("nickname", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(225, 203), w.get("national_id", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(235, 236), w.get("job", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(235, 265), str(w.get("salary", "")), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(225, 294), w.get("phone", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(225, 321), w.get("confession_father", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(230, 350), w.get("insurance_no", ""), fontsize=10)

        # Address & Housing
        draw_arabic_text(page, pymupdf.Point(480, 395), addr.get("street", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(365, 395), addr.get("building_no", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(480, 438), addr.get("governorate", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(295, 438), addr.get("area", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(480, 483), addr.get("landmark", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(450, 526), addr.get("housing_type", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(480, 545), addr.get("children_phones", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(480, 563), addr.get("notes", ""), fontsize=9)

        # Ration Card & Government Aid
        draw_arabic_text(page, pymupdf.Point(440, 668), gov.get("has_ration_card", "نعم"), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(230, 668), str(gov.get("ration_members_count", "")), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(440, 705), gov.get("program_1", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(440, 750), gov.get("program_2", ""), fontsize=10)

    # -------------------------------------------------------------------------
    # PAGE 3: Family Members Table, Other Residents & Medical Conditions
    # -------------------------------------------------------------------------
    def _populate_page_3(self, page: pymupdf.Page, data: Dict[str, Any]):
        p3 = data.get("page3", {})
        members = p3.get("family_members", [])

        # Family Members Table (Up to 8 rows, starting y=112, step=23.5)
        start_y = 112.0
        row_step = 23.5
        for idx, m in enumerate(members[:8]):
            y = start_y + (idx * row_step)
            draw_arabic_text(page, pymupdf.Point(525, y), m.get("name", ""), fontsize=9)
            draw_arabic_text(page, pymupdf.Point(395, y), m.get("national_id", ""), fontsize=9)
            draw_arabic_text(page, pymupdf.Point(295, y), m.get("social_status", ""), fontsize=9)
            draw_arabic_text(page, pymupdf.Point(215, y), m.get("education_job", ""), fontsize=9)
            draw_arabic_text(page, pymupdf.Point(125, y), str(m.get("income", "")), fontsize=9)
            draw_arabic_text(page, pymupdf.Point(75, y), m.get("confession_father", ""), fontsize=9)

        # Other Persons living with family (Up to 4 rows, starting y=405, step=23.5)
        other_persons = p3.get("other_persons", [])
        other_start_y = 405.0
        for idx, o in enumerate(other_persons[:4]):
            y = other_start_y + (idx * row_step)
            draw_arabic_text(page, pymupdf.Point(525, y), o.get("name", ""), fontsize=9)
            draw_arabic_text(page, pymupdf.Point(395, y), o.get("national_id", ""), fontsize=9)
            draw_arabic_text(page, pymupdf.Point(295, y), o.get("kinship", ""), fontsize=9)
            draw_arabic_text(page, pymupdf.Point(215, y), o.get("social_status", ""), fontsize=9)

        # Housing description & appliances
        housing_desc = p3.get("housing_description", "")
        draw_arabic_text(page, pymupdf.Point(430, 540), housing_desc, fontsize=9)

        # Medical & Social conditions
        med = p3.get("medical_conditions", {})
        draw_arabic_text(page, pymupdf.Point(440, 632), med.get("diseases", ""), fontsize=9)
        draw_arabic_text(page, pymupdf.Point(440, 666), med.get("mental_addiction", ""), fontsize=9)
        draw_arabic_text(page, pymupdf.Point(280, 666), med.get("disability", ""), fontsize=9)
        draw_arabic_text(page, pymupdf.Point(440, 712), med.get("abandoned_parent", ""), fontsize=9)
        draw_arabic_text(page, pymupdf.Point(440, 750), med.get("other_circumstances", ""), fontsize=9)

    # -------------------------------------------------------------------------
    # PAGE 4: Church Assistance Table & Income/Expense Balance Matrix
    # -------------------------------------------------------------------------
    def _populate_page_4(self, page: pymupdf.Page, data: Dict[str, Any]):
        p4 = data.get("page4", {})
        aid_list = p4.get("church_aid", [])

        # Church Aid Table (Up to 8 rows, starting y=122, step=23.8)
        start_y = 122.0
        row_step = 23.8
        total_aid = 0
        for idx, item in enumerate(aid_list[:8]):
            y = start_y + (idx * row_step)
            draw_arabic_text(page, pymupdf.Point(440, y), item.get("church_name", ""), fontsize=9)
            val = item.get("value", 0)
            try:
                total_aid += float(val)
            except (ValueError, TypeError):
                pass
            draw_arabic_text(page, pymupdf.Point(270, y), str(val), fontsize=11, fontname="IBMPlexBold")
            draw_arabic_text(page, pymupdf.Point(150, y), item.get("purpose", ""), fontsize=10)

        # Total Church Aid
        draw_arabic_text(page, pymupdf.Point(270, 312), f"{total_aid:.0f} ج.م", fontsize=11.5, fontname="IBMPlexBold")

        # Income vs Expense Matrix
        inc = p4.get("income", {})
        exp = p4.get("expenses", {})

        # Income column (Right side)
        draw_arabic_text(page, pymupdf.Point(340, 595), str(inc.get("church_aid", total_aid)), fontsize=11, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(340, 622), str(inc.get("medical_aid", "")), fontsize=11, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(340, 644), str(inc.get("study_aid", "")), fontsize=11, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(340, 666), str(inc.get("base_salary", "")), fontsize=11, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(340, 691), str(inc.get("side_project", "")), fontsize=11, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(340, 715), str(inc.get("relatives_aid", "")), fontsize=11, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(340, 742), str(inc.get("total_income", "")), fontsize=11.5, fontname="IBMPlexBold")

        # Expense column (Left side)
        draw_arabic_text(page, pymupdf.Point(150, 595), str(exp.get("living_basics", "")), fontsize=11, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(150, 622), str(exp.get("utilities", "")), fontsize=11, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(150, 644), str(exp.get("phone", "")), fontsize=11, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(150, 666), str(exp.get("rent", "")), fontsize=11, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(150, 691), str(exp.get("medical", "")), fontsize=11, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(150, 715), str(exp.get("education", "")), fontsize=11, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(150, 742), str(exp.get("total_expenses", "")), fontsize=11.5, fontname="IBMPlexBold")

    # -------------------------------------------------------------------------
    # PAGE 5: Committee Decisions & Signatures
    # -------------------------------------------------------------------------
    def _populate_page_5(self, page: pymupdf.Page, data: Dict[str, Any]):
        p5 = data.get("page5", {})
        draw_arabic_text(page, pymupdf.Point(420, 98), p5.get("duration", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(420, 142), p5.get("entry_reason", ""), fontsize=10)
        draw_arabic_text(page, pymupdf.Point(390, 380), f"{p5.get('approved_amount', '')} ج.م", fontsize=10, fontname="IBMPlexBold")
        draw_arabic_text(page, pymupdf.Point(440, 424), p5.get("notes", ""), fontsize=9)

        # Committee Members
        members = p5.get("committee_members", ["", "", ""])
        draw_arabic_text(page, pymupdf.Point(490, 693), members[0] if len(members) > 0 else "", fontsize=10)
        draw_arabic_text(page, pymupdf.Point(490, 724), members[1] if len(members) > 1 else "", fontsize=10)
        draw_arabic_text(page, pymupdf.Point(490, 755), members[2] if len(members) > 2 else "", fontsize=10)

    # -------------------------------------------------------------------------
    # PAGE 6: Aid Distribution Ledger (20 Rows) & Committee Signatures
    # -------------------------------------------------------------------------
    def _populate_page_6(self, page: pymupdf.Page, data: Dict[str, Any]):
        p6 = data.get("page6", {})
        p2 = data.get("page2", {})
        head_name = (
            p6.get("family_head")
            or (p2.get("husband", {}).get("name") if isinstance(p2.get("husband"), dict) else "")
            or (p2.get("wife", {}).get("name") if isinstance(p2.get("wife"), dict) else "")
            or ""
        )
        p1 = data.get("page1", {})
        church_records_id = p6.get("church_records_id") or p1.get("church_study_id") or ""
        cathedral_care_id = p6.get("cathedral_care_id") or p1.get("cathedral_care_id") or ""
        church_membership_id = p6.get("church_membership_id") or p1.get("church_membership_id") or ""

        draw_arabic_text(page, pymupdf.Point(430, 54), head_name, fontsize=10)
        draw_arabic_text(page, pymupdf.Point(210, 54), church_records_id, fontsize=10)
        draw_arabic_text(page, pymupdf.Point(430, 83), cathedral_care_id, fontsize=10)
        draw_arabic_text(page, pymupdf.Point(210, 83), church_membership_id, fontsize=10)
        draw_arabic_text(page, pymupdf.Point(410, 114), p6.get("from_date", ""), fontsize=9)
        draw_arabic_text(page, pymupdf.Point(200, 114), p6.get("to_date", ""), fontsize=9)

        # Ledger Rows (Up to 20 rows, start y=181, step=23.5)
        ledger = p6.get("aid_ledger", [])
        start_y = 181.0
        step_y = 23.5
        for idx, row in enumerate(ledger[:20]):
            y = start_y + (idx * step_y)
            draw_arabic_text(page, pymupdf.Point(480, y), row.get("aid_type", ""), fontsize=9)
            draw_arabic_text(page, pymupdf.Point(380, y), str(row.get("amount", "")), fontsize=9)
            draw_arabic_text(page, pymupdf.Point(280, y), row.get("entity", ""), fontsize=9)
            draw_arabic_text(page, pymupdf.Point(170, y), row.get("date", ""), fontsize=9)
            draw_arabic_text(page, pymupdf.Point(75, y), row.get("recipient_signature", ""), fontsize=9)

        # Signatures
        sigs = p6.get("signatures", ["", "", ""])
        draw_arabic_text(page, pymupdf.Point(480, 690), sigs[0] if len(sigs) > 0 else "", fontsize=10)
        draw_arabic_text(page, pymupdf.Point(480, 721), sigs[1] if len(sigs) > 1 else "", fontsize=10)
        draw_arabic_text(page, pymupdf.Point(480, 752), sigs[2] if len(sigs) > 2 else "", fontsize=10)

    # -------------------------------------------------------------------------
    # EXTRA PAGES POPULATOR (Duplicated Ledger, ID Cards 8-Grid, Birth Certs)
    # -------------------------------------------------------------------------
    def _populate_extra_pages(
        self,
        doc: pymupdf.Document,
        extra_pages: list,
        case_data: Dict[str, Any],
        active_layout: Optional[Dict[str, Any]]
    ) -> None:
        p1 = case_data.get("page1", {})
        study_id = p1.get("church_study_id") or "784/2026"
        church_name = p1.get("church_name") or case_data.get("Page1", {}).get("churchName") or "كنيسة الشهيد العظيم أبي سيفين والقديسة دميانة - القلج"
        p6 = case_data.get("page6", {})
        p2 = case_data.get("page2", {})
        family_head = p6.get("family_head") or get_head_of_household_name_py(case_data) or "مينا حنا الله جرجس"

        for idx, ep in enumerate(extra_pages):
            if not isinstance(ep, dict):
                continue
            ep_type = ep.get("type", "")

            # 1. DUPLICATED LEDGER PAGE (Clone Page 6)
            if ep_type == "duplicated_ledger":
                src_doc = pymupdf.open(self.template_pdf_path)
                doc.insert_pdf(src_doc, from_page=5, to_page=5, start_at=-1)
                src_doc.close()

                new_page = doc[-1]
                for w in list(new_page.widgets()):
                    new_page.delete_widget(w)
                for a in list(new_page.annots()):
                    new_page.delete_annot(a)

                if os.path.exists(REGULAR_FONT_PATH):
                    new_page.insert_font(fontname="RubikRegular", fontfile=REGULAR_FONT_PATH)
                    new_page.insert_font(fontname="IBMPlexRegular", fontfile=REGULAR_FONT_PATH)
                if os.path.exists(BOLD_FONT_PATH):
                    new_page.insert_font(fontname="RubikBold", fontfile=BOLD_FONT_PATH)
                    new_page.insert_font(fontname="IBMPlexBold", fontfile=BOLD_FONT_PATH)

                p6_data = ep.get("page6Data") or case_data.get("page6", {})
                p1_data = case_data.get("page1", {})
                p2_data = case_data.get("page2", {})

                # Ensure the 3 IDs and family head are synced into the duplicate ledger
                merged_p6 = dict(p6_data)
                if not merged_p6.get("church_records_id") and p1_data.get("church_study_id"):
                    merged_p6["church_records_id"] = p1_data.get("church_study_id")
                if not merged_p6.get("cathedral_care_id") and p1_data.get("cathedral_care_id"):
                    merged_p6["cathedral_care_id"] = p1_data.get("cathedral_care_id")
                if not merged_p6.get("church_membership_id") and p1_data.get("church_membership_id"):
                    merged_p6["church_membership_id"] = p1_data.get("church_membership_id")
                if not merged_p6.get("family_head"):
                    head_fallback = get_head_of_household_name_py(case_data)
                    if head_fallback:
                        merged_p6["family_head"] = head_fallback

                synthetic_data = dict(case_data)
                synthetic_data["page6"] = merged_p6

                fields = (active_layout.get("6") or active_layout.get(6)) if active_layout else []
                if fields:
                    self._populate_page_with_layout(new_page, 6, fields, synthetic_data)
                else:
                    self._populate_page_6(new_page, synthetic_data)

            # 2. ID CARDS PAGE (Vertical / Portrait A4 - 8 Boxes)
            elif ep_type == "id_cards":
                new_page = doc.new_page(-1, 595.28, 841.89)
                new_page.draw_rect(new_page.rect, color=None, fill=(1, 1, 1))

                if os.path.exists(REGULAR_FONT_PATH):
                    new_page.insert_font(fontname="RubikRegular", fontfile=REGULAR_FONT_PATH)
                    new_page.insert_font(fontname="IBMPlexRegular", fontfile=REGULAR_FONT_PATH)
                if os.path.exists(BOLD_FONT_PATH):
                    new_page.insert_font(fontname="RubikBold", fontfile=BOLD_FONT_PATH)
                    new_page.insert_font(fontname="IBMPlexBold", fontfile=BOLD_FONT_PATH)

                # Header
                church_title = f"{church_name} - خدمة أخوة الرب" if church_name else "خدمة أخوة الرب"
                draw_arabic_text(new_page, pymupdf.Point(559.28, 30), church_title, fontsize=9.5, fontname="IBMPlexBold", color=(0.55, 0.35, 0.05), align=2)
                draw_arabic_text(new_page, pymupdf.Point(559.28, 46), "خدمة أخوة الرب - صور بطاقات الرقم القومي", fontsize=13, fontname="IBMPlexBold", color=(0.1, 0.1, 0.1), align=2)

                header_meta = f"رقم البحث: #{study_id}"
                if family_head:
                    header_meta += f"   |   رب الأسرة: {family_head}"
                draw_arabic_text(new_page, pymupdf.Point(36, 46), header_meta, fontsize=9.0, fontname="IBMPlexRegular", color=(0.35, 0.4, 0.45), align=0)

                # Divider
                new_page.draw_line(pymupdf.Point(36, 54), pymupdf.Point(559.28, 54), color=(0.82, 0.85, 0.88), width=0.8)

                # 8 Evenly Distributed Boxes (2 columns x 4 rows)
                margin_x = 36.0
                margin_top = 64.0
                gap_x = 16.0
                gap_y = 12.0
                box_w = (595.28 - 2 * margin_x - gap_x) / 2.0  # ~253.64 pt
                box_h = (841.89 - margin_top - 32.0 - 3 * gap_y) / 4.0  # ~177.47 pt

                images = ep.get("images", [])
                labels = ep.get("labels", [])

                for slot in range(8):
                    row = slot // 2
                    col = slot % 2
                    # In RTL: col 0 is Right, col 1 is Left
                    if col == 0:
                        x0 = 595.28 - margin_x - box_w
                    else:
                        x0 = margin_x
                    y0 = margin_top + row * (box_h + gap_y)
                    box_rect = pymupdf.Rect(x0, y0, x0 + box_w, y0 + box_h)

                    # Frame
                    new_page.draw_rect(box_rect, color=(0.78, 0.82, 0.88), fill=(0.98, 0.98, 0.99), width=1, radius=None)

                    # Label badge
                    default_label = f"بطاقة رقم {slot + 1} {'(الوجه)' if slot % 2 == 0 else '(الظهر)'}"
                    lbl = labels[slot] if slot < len(labels) and labels[slot] else default_label
                    draw_arabic_text(new_page, pymupdf.Point(box_rect.x1 - 8, box_rect.y0 + 13), lbl, fontsize=8.5, fontname="IBMPlexBold", color=(0.25, 0.3, 0.35), align=2)

                    # Image
                    img_data = images[slot] if slot < len(images) else None
                    if img_data:
                        inner_rect = pymupdf.Rect(box_rect.x0 + 4, box_rect.y0 + 17, box_rect.x1 - 4, box_rect.y1 - 4)
                        stamp_id_card(new_page, inner_rect, str(img_data), label=lbl)

            # 3. BIRTH CERTIFICATES PAGE (Landscape A4 Layout, with Page-Level Rotation for Printing)
            elif ep_type == "birth_certs":
                new_page = doc.new_page(-1, 841.89, 595.28)
                new_page.draw_rect(new_page.rect, color=None, fill=(1, 1, 1))

                if os.path.exists(REGULAR_FONT_PATH):
                    new_page.insert_font(fontname="RubikRegular", fontfile=REGULAR_FONT_PATH)
                    new_page.insert_font(fontname="IBMPlexRegular", fontfile=REGULAR_FONT_PATH)
                if os.path.exists(BOLD_FONT_PATH):
                    new_page.insert_font(fontname="RubikBold", fontfile=BOLD_FONT_PATH)
                    new_page.insert_font(fontname="IBMPlexBold", fontfile=BOLD_FONT_PATH)

                # Header (Landscape dimensions)
                church_title = f"{church_name} - خدمة أخوة الرب" if church_name else "خدمة أخوة الرب"
                draw_arabic_text(new_page, pymupdf.Point(805.89, 30), church_title, fontsize=9.5, fontname="IBMPlexBold", color=(0.15, 0.4, 0.65), align=2)
                draw_arabic_text(new_page, pymupdf.Point(805.89, 46), "خدمة أخوة الرب - شهادات الميلاد", fontsize=13, fontname="IBMPlexBold", color=(0.1, 0.1, 0.1), align=2)

                header_meta = f"رقم البحث: #{study_id}" if study_id else ""
                if family_head:
                    header_meta = f"{header_meta}   |   رب الأسرة: {family_head}" if header_meta else f"رب الأسرة: {family_head}"
                if header_meta:
                    draw_arabic_text(new_page, pymupdf.Point(36, 46), header_meta, fontsize=9.0, fontname="IBMPlexRegular", color=(0.35, 0.4, 0.45), align=0)

                # Divider
                new_page.draw_line(pymupdf.Point(36, 54), pymupdf.Point(805.89, 54), color=(0.82, 0.85, 0.88), width=0.8)

                # 2 Boxes (Right half and Left half)
                margin_x = 36.0
                margin_top = 64.0
                gap_x = 24.0
                box_w = (841.89 - 2 * margin_x - gap_x) / 2.0  # ~372.94 pt
                box_h = 595.28 - margin_top - 28.0  # ~503.28 pt

                images = ep.get("images", [])
                labels = ep.get("labels", [])

                for slot in range(2):
                    is_right = (slot == 0)
                    if is_right:
                        x0 = 841.89 - margin_x - box_w
                    else:
                        x0 = margin_x
                    y0 = margin_top
                    box_rect = pymupdf.Rect(x0, y0, x0 + box_w, y0 + box_h)

                    # Frame
                    new_page.draw_rect(box_rect, color=(0.75, 0.82, 0.9), fill=(0.98, 0.99, 1.0), width=1, radius=None)

                    # Label
                    default_label = "شهادة 1" if is_right else "شهادة 2"
                    lbl = labels[slot] if (slot < len(labels) and labels[slot] and "علوي" not in labels[slot] and "سفلي" not in labels[slot]) else default_label
                    draw_arabic_text(new_page, pymupdf.Point(box_rect.x1 - 12, box_rect.y0 + 16), lbl, fontsize=9.5, fontname="IBMPlexBold", color=(0.15, 0.3, 0.45), align=2)

                    # Image
                    img_data = images[slot] if slot < len(images) else None
                    if img_data:
                        inner_rect = pymupdf.Rect(box_rect.x0 + 6, box_rect.y0 + 24, box_rect.x1 - 6, box_rect.y1 - 6)
                        stamp_id_card(new_page, inner_rect, str(img_data), label=lbl, force_portrait=True)

                # 🔄 Rotation of the page itself in printing:
                # Sets the PDF page /Rotate 90 flag so that the printer handles it as Portrait A4 without cropping!
                new_page.set_rotation(90)


# -----------------------------------------------------------------------------
# JSON-RPC 2.0 Stdio Server Protocol
# -----------------------------------------------------------------------------
def run_stdio_rpc():
    """
    Standard JSON-RPC 2.0 loop reading requests from stdin
    and writing responses to stdout.
    """
    if sys.stdin is None or sys.stdout is None:
        return

    if sys.stderr is not None:
        try:
            sys.stderr.write("[sidecar] Python PDF Sidecar Engine started. Listening on stdio...\n")
            sys.stderr.flush()
        except Exception:
            pass

    engine = None
    try:
        engine = PDFCareReportEngine()
    except Exception as e:
        if sys.stderr is not None:
            try:
                sys.stderr.write(f"[sidecar_init_error] {e}\n")
            except Exception:
                pass

    for line in sys.stdin:
        if not line.strip():
            continue
        req_id = None
        try:
            req = json.loads(line)
            req_id = req.get("id")
            method = req.get("method")
            params = req.get("params", {})

            if method == "ping":
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"status": "pong", "engine": "PyMuPDF-Arabic-Sidecar"}
                }
            elif method == "generate_pdf":
                if engine is None:
                    engine = PDFCareReportEngine(params.get("template_path"))
                
                output_path = params.get("output_path")
                if not output_path:
                    raise ValueError("Missing 'output_path' parameter in generate_pdf request")
                
                data = params.get("data", {})
                layout = params.get("layout")
                # Optional overrides for ID card images directly in params
                if "husband_id_image" in params:
                    data["husband_id_image"] = params["husband_id_image"]
                if "husband_id_back_image" in params:
                    data["husband_id_back_image"] = params["husband_id_back_image"]
                if "wife_id_image" in params:
                    data["wife_id_image"] = params["wife_id_image"]
                if "wife_id_back_image" in params:
                    data["wife_id_back_image"] = params["wife_id_back_image"]

                result = engine.generate(data, output_path, layout=layout)
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": result
                }
            else:
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32601, "message": f"Method not found: {method}"}
                }
        except Exception as e:
            err_trace = traceback.format_exc()
            try:
                sys.stderr.write(f"[sidecar_error] {err_trace}\n")
                sys.stderr.flush()
            except Exception:
                pass
            response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32000, "message": str(e), "trace": err_trace}
            }

        # Write pure JSON line to stdout
        try:
            sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
            sys.stdout.flush()
        except Exception:
            try:
                sys.stdout.write(json.dumps(response, ensure_ascii=True) + "\n")
                sys.stdout.flush()
            except Exception:
                pass

# -----------------------------------------------------------------------------
# CLI Entry Point
# -----------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="PyMuPDF Arabic PDF Engine for Church Social Care")
    parser.add_argument("--stdio", action="store_true", help="Run in JSON-RPC stdio daemon mode")
    parser.add_argument("--input", "-i", type=str, help="Path to JSON data file")
    parser.add_argument("--output", "-o", type=str, help="Path to output generated PDF")
    parser.add_argument("--template", "-t", type=str, help="Path to template PDF")
    parser.add_argument("--test", action="store_true", help="Generate a demo test PDF with mock data")
    args = parser.parse_args()
    is_interactive = False
    try:
        is_interactive = sys.stdin is not None and sys.stdin.isatty()
    except Exception:
        is_interactive = False

    if args.stdio or not is_interactive or len(sys.argv) == 1:
        run_stdio_rpc()
        return

    if args.test:
        engine = PDFCareReportEngine(args.template)
        test_output = args.output or os.path.join(BASE_DIR, "sample_output_test.pdf")
        mock_data = {
            "page1": {
                "study_date": "2026/09/04",
                "church_study_id": "784/2026",
                "area": "القلج - الخانكة",
                "responsible_priest": "القمص بيشوي حليم",
                "cathedral_care_id": "CAT-9042",
                "church_membership_id": "MEM-1104"
            },
            "page2": {
                "husband": {
                    "name": "مينا حنا الله جرجس",
                    "nickname": "أبو كيرلس",
                    "national_id": "28504121401234",
                    "job": "عامل باليومية",
                    "salary": "3500 ج.م",
                    "phone": "01223456789",
                    "confession_father": "أبونا أنطونيوس",
                    "insurance_no": "9812450"
                },
                "wife": {
                    "name": "مريم فهيم زكي عبد المسيح",
                    "nickname": "أم كيرلس",
                    "national_id": "29011041405678",
                    "job": "ربة منزل",
                    "salary": "0",
                    "phone": "01098765432",
                    "confession_father": "أبونا يوحنا",
                    "insurance_no": "غير مؤمن عليها"
                },
                "address": {
                    "street": "شارع النور متفرع من الكنيسة",
                    "building_no": "12",
                    "governorate": "القليوبية",
                    "area": "القلج",
                    "landmark": "خلف مدرسة الأورمان",
                    "housing_type": "إيجار قديم (150 ج.م)",
                    "children_phones": "01234567890",
                    "notes": "المنزل يحتاج سقف وترميم حمام"
                },
                "gov_programs": {
                    "has_ration_card": "نعم",
                    "ration_members_count": 4,
                    "program_1": "معاش تكافل وكرامة",
                    "program_2": "خدمات متكاملة"
                }
            },
            "page3": {
                "family_members": [
                    {"name": "كيرلس مينا حنا الله", "national_id": "31005121401111", "social_status": "أعزب", "education_job": "الصف الأول الثانوي", "income": 0, "confession_father": "أبونا بيشوي"},
                    {"name": "مارينا مينا حنا الله", "national_id": "31408191402222", "social_status": "عزباء", "education_job": "الصف الثالث الإعدادي", "income": 0, "confession_father": "أبونا بيشوي"}
                ],
                "housing_description": "شقة غرفتين وصالة وحمام ومطبخ، غسالة عادية، ثلاجة 10 قدم، بوتاجاز 4 شعلة.",
                "medical_conditions": {
                    "diseases": "الزوج يعاني من انزلاق غضروفي قطني مزمن",
                    "mental_addiction": "لا يوجد",
                    "disability": "لا يوجد",
                    "abandoned_parent": "لا يوجد",
                    "other_circumstances": "الابن يحتاج نظارة طبية ومتابعة رمد"
                }
            },
            "page4": {
                "church_aid": [
                    {"church_name": "كنيسة الشهيد أبي سيفين بالقلج", "value": 1500, "purpose": "مساعدة شهرية إعاشة"},
                    {"church_name": "مطرانية شبرا الخيمة", "value": 500, "purpose": "مساعدة علاجية"}
                ],
                "income": {
                    "church_aid": "2000",
                    "medical_aid": "500",
                    "study_aid": "400",
                    "base_salary": "3500",
                    "side_project": "0",
                    "relatives_aid": "300",
                    "total_income": "6700 ج.م"
                },
                "expenses": {
                    "living_basics": "4000",
                    "utilities": "650",
                    "phone": "200",
                    "rent": "350",
                    "medical": "800",
                    "education": "900",
                    "total_expenses": "6900 ج.م"
                }
            },
            "page5": {
                "duration": "سنة كاملة تجدد في أول سبتمبر 2027",
                "entry_reason": "ضعف دخل الزوج بسبب العجز الصحي الجزئي ووجود طالبين في مراحل الشهادات",
                "approved_amount": "2000",
                "notes": "صرف روشتة علاجية شهرية ومتابعة البحث سنوياً",
                "committee_members": ["د. سامح منير", "أ. ميخائيل وديع", "م. رامي فايز"]
            },
            "page6": {
                "family_head": "مينا حنا الله جرجس",
                "church_records_id": "784/2026",
                "cathedral_care_id": "CAT-9042",
                "church_membership_id": "MEM-1104",
                "from_date": "2026/09/01",
                "to_date": "2027/08/31",
                "aid_ledger": [
                    {"aid_type": "مساعدة شهرية سبتمبر", "amount": "2000 ج.م", "entity": "خزينة الكنيسة", "date": "2026/09/05", "recipient_signature": "مينا حنا الله"}
                ],
                "signatures": ["أمين الخدمة", "أمين الصندوق", "كاهن الرعاية"]
            }
        }
        res = engine.generate(mock_data, test_output)
        print(f"Test generation successful! Output: {res['output_path']} ({res['size_bytes']} bytes)")
        return

    if args.input and args.output:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
        engine = PDFCareReportEngine(args.template)
        res = engine.generate(data, args.output)
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
