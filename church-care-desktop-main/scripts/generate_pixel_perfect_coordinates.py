import cv2
import numpy as np
import os
import json

IMG_DIR = "Pages in Image"
OUT_DIR = "scripts/annotated_pages"
os.makedirs(OUT_DIR, exist_ok=True)

PAGES = [
    "بحث أخوة الرب 2026.jpg",
    "بحث أخوة الرب 20262.jpg",
    "بحث أخوة الرب 20263.jpg",
    "بحث أخوة الرب 20264.jpg",
    "بحث أخوة الرب 20265.jpg",
    "بحث أخوة الرب 20266.jpg"
]

def analyze_all():
    results = {}
    
    # =========================================================================
    # PAGE 1
    # =========================================================================
    p1 = cv2.imread(os.path.join(IMG_DIR, PAGES[0]))
    h1, w1 = p1.shape[:2] # 2480 x 3508
    
    # Page 1 exact detected elements:
    # 1. رقم البحث بالكنيسة (Box)
    # Box: x=952, y=449, w=185, h=76 -> top: 12.80%, left: 38.39%, w: 7.46%, h: 2.17%
    # 2. تاريخ بحث الحالة: line from x=215 to x=645, y=600 to 650
    # 3. بطاقة الزوج وجه: x=1373, y=1012, w=839, h=579 -> left: 55.36%, top: 28.85%, w: 33.83%, h: 16.51%
    # 4. بطاقة الزوجة وجه: x=269, y=1012, w=838, h=579 -> left: 10.85%, top: 28.85%, w: 33.79%, h: 16.51%
    # 5. بطاقة الزوج ظهر: x=1373, y=1644, w=839, h=578 -> left: 55.36%, top: 46.86%, w: 33.83%, h: 16.48%
    # 6. بطاقة الزوجة ظهر: x=269, y=1644, w=838, h=578 -> left: 10.85%, top: 46.86%, w: 33.79%, h: 16.48%
    # 7. المنطقة: line at y=2420, from x=215 to x=2150
    # 8. اسم الكاهن المسؤول: line at y=2645, from x=215 to x=1950
    # 9. رقم بحث الكاتدرائية: line at y=2865, from x=215 to x=1480
    # 10. رقم الأسرة بالعضوية: line at y=3085, from x=215 to x=1440
    
    results["page1"] = {
        "church_study_id": {"x": 952, "y": 449, "w": 185, "h": 76},
        "study_date": {"x": 215, "y": 595, "w": 520, "h": 85},
        "husband_id_front": {"x": 1373, "y": 1012, "w": 839, "h": 579},
        "wife_id_front": {"x": 269, "y": 1012, "w": 838, "h": 579},
        "husband_id_back": {"x": 1373, "y": 1644, "w": 839, "h": 578},
        "wife_id_back": {"x": 269, "y": 1644, "w": 838, "h": 578},
        "area": {"x": 215, "y": 2385, "w": 1935, "h": 90},
        "responsible_priest": {"x": 215, "y": 2605, "w": 1735, "h": 90},
        "cathedral_care_id": {"x": 215, "y": 2825, "w": 1265, "h": 90},
        "church_membership_id": {"x": 215, "y": 3045, "w": 1225, "h": 90}
    }
    
    # Let's inspect Page 2 lines specifically
    p2 = cv2.imread(os.path.join(IMG_DIR, PAGES[1]))
    h2, w2 = p2.shape[:2]
    # Husband rows: x=1237 to 1947 (w=710). Rows y: 559, 680, 801, 922, 1043, 1164, 1285, 1406
    # Wife rows: x=237 to 936 (w=699). Rows y: same
    # Row height = 121
    row_ys = [559, 680, 801, 922, 1043, 1164, 1285, 1406]
    
    husband_fields = ["name", "nickname", "national_id", "job", "salary", "phone", "confession_father", "insurance_no"]
    wife_fields = ["name", "nickname", "national_id", "job", "salary", "phone", "confession_father", "insurance_no"]
    
    p2_dict = {"husband": {}, "wife": {}}
    for idx, (f_h, f_w) in enumerate(zip(husband_fields, wife_fields)):
        ry = row_ys[idx]
        p2_dict["husband"][f_h] = {"x": 1237, "y": ry, "w": 710, "h": 121}
        p2_dict["wife"][f_w] = {"x": 237, "y": ry, "w": 699, "h": 121}
        
    # Address section on page 2:
    # Let's inspect coordinates on Page 2 for address fields
    # We will refine with OCR / line analysis
    results["page2"] = p2_dict
    
    # Save json
    with open("scripts/pixel_perfect_coords.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("Saved preliminary coordinates.")

if __name__ == "__main__":
    analyze_all()
