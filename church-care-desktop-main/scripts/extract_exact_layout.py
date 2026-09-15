import cv2
import numpy as np
import os
import json

IMG_DIR = "Pages in Image"
PAGES = [
    "بحث أخوة الرب 2026.jpg",
    "بحث أخوة الرب 20262.jpg",
    "بحث أخوة الرب 20263.jpg",
    "بحث أخوة الرب 20264.jpg",
    "بحث أخوة الرب 20265.jpg",
    "بحث أخوة الرب 20266.jpg"
]

def analyze_page(page_idx, filename):
    filepath = os.path.join(IMG_DIR, filename)
    img = cv2.imread(filepath)
    if img is None:
        print(f"Failed to load {filepath}")
        return None
    h, w = img.shape[:2]
    print(f"\n================ PAGE {page_idx+1}: {filename} ({w}x{h}) ================")
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(~gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, -2)
    
    # Horizontal lines
    cols = thresh.shape[1]
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (cols // 35, 1))
    h_lines = cv2.erode(thresh, h_kernel)
    h_lines = cv2.dilate(h_lines, h_kernel)
    
    # Vertical lines
    rows = thresh.shape[0]
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, rows // 35))
    v_lines = cv2.erode(thresh, v_kernel)
    v_lines = cv2.dilate(v_lines, v_kernel)
    
    # Table mask
    table_mask = cv2.bitwise_or(h_lines, v_lines)
    contours, _ = cv2.findContours(table_mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    
    cells = []
    for c in contours:
        x, y, cw, ch = cv2.boundingRect(c)
        if cw > 60 and ch > 20 and cw < w * 0.9 and ch < h * 0.5:
            cells.append((x, y, cw, ch))
            
    cells.sort(key=lambda c: (round(c[1]/15), c[0]))
    print(f"Found {len(cells)} table cell candidates")
    for x, y, cw, ch in cells[:30]:
        print(f"  Cell: x={x:4d}, y={y:4d}, w={cw:4d}, h={ch:4d} | left: {x/w*100:5.2f}%, top: {y/h*100:5.2f}%, w: {cw/w*100:5.2f}%, h: {ch/h*100:5.2f}%")

if __name__ == "__main__":
    for i, p in enumerate(PAGES):
        analyze_page(i, p)
