pub mod font;
pub mod resolver;
pub mod stamper;
pub mod typography;

use std::fs;
use std::path::PathBuf;
use std::time::Instant;

use lopdf::{dictionary, Document, Object, ObjectId};
use rustybuzz::Face;
use serde_json::Value;

use self::font::embed_truetype_font;
use self::resolver::resolve_field_value;
use self::stamper::{
    create_check_stream, create_image_draw_stream, create_text_stream, embed_image_xobject,
    pct_to_pdf_rect, StampingContext,
};

// Embed fonts directly into binary for 0ms font loading & 100% offline portability
const REGULAR_FONT_BYTES: &[u8] = include_bytes!("../../../fonts/IBMPlexSansArabic-Regular.ttf");
const BOLD_FONT_BYTES: &[u8] = include_bytes!("../../../fonts/IBMPlexSansArabic-Bold.ttf");

/// Locates the base template PDF across known deployment and dev locations
pub fn find_template_pdf() -> Result<PathBuf, String> {
    let filename = "بحث أخوة الرب 2026 V3.pdf";

    // 1. Environment variable override
    if let Ok(env_path) = std::env::var("TEMPLATE_PDF_PATH") {
        let p = PathBuf::from(env_path);
        if p.exists() {
            return Ok(p);
        }
    }

    // 2. Candidate paths
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));

    let candidates = [
        PathBuf::from(filename),
        PathBuf::from(format!("../{}", filename)),
        exe_dir.join(filename),
        exe_dir.join("resources").join(filename),
        exe_dir.join("../Resources").join(filename),
        PathBuf::from("src-tauri").join(filename),
        PathBuf::from("../src-tauri").join(filename),
    ];

    for c in &candidates {
        if c.exists() {
            return Ok(c.clone());
        }
    }

    Err(format!(
        "لم يتم العثور على ملف قالب PDF الأصلي ('{}') في مسارات المشروع أو المجلد المرفق.",
        filename
    ))
}

/// Helper to ensure a page dictionary has a valid `/Resources` dictionary with `/Font` and `/XObject`
fn ensure_page_resources(
    doc: &mut Document,
    page_id: ObjectId,
    regular_font_id: ObjectId,
    bold_font_id: ObjectId,
) -> Result<(), String> {
    let page_obj = doc.get_object_mut(page_id).map_err(|e| format!("{:?}", e))?;
    let page_dict = page_obj.as_dict_mut().map_err(|e| format!("{:?}", e))?;

    if !page_dict.has(b"Resources") {
        page_dict.set("Resources", Object::Dictionary(lopdf::Dictionary::new()));
    }

    // Resources might be an inline dictionary or a reference
    let resources_val = page_dict.get(b"Resources").map_err(|e| format!("{:?}", e))?.clone();

    match resources_val {
        Object::Reference(res_id) => {
            let res_obj = doc.get_object_mut(res_id).map_err(|e| format!("{:?}", e))?;
            let res_dict = res_obj.as_dict_mut().map_err(|e| format!("{:?}", e))?;
            inject_fonts_into_res_dict(res_dict, regular_font_id, bold_font_id);
        }
        Object::Dictionary(mut d) => {
            inject_fonts_into_res_dict(&mut d, regular_font_id, bold_font_id);
            let page_obj = doc.get_object_mut(page_id).map_err(|e| format!("{:?}", e))?;
            let page_dict = page_obj.as_dict_mut().map_err(|e| format!("{:?}", e))?;
            page_dict.set("Resources", Object::Dictionary(d));
        }
        _ => {}
    }

    Ok(())
}

fn inject_fonts_into_res_dict(
    res_dict: &mut lopdf::Dictionary,
    reg_id: ObjectId,
    bold_id: ObjectId,
) {
    if !res_dict.has(b"Font") {
        res_dict.set("Font", Object::Dictionary(lopdf::Dictionary::new()));
    }
    if let Ok(font_dict) = res_dict.get_mut(b"Font").and_then(|o| o.as_dict_mut()) {
        font_dict.set("F_Regular", Object::Reference(reg_id));
        font_dict.set("F_Bold", Object::Reference(bold_id));
    }
}

fn inject_xobject_into_page(
    doc: &mut Document,
    page_id: ObjectId,
    name: &str,
    xobj_id: ObjectId,
) -> Result<(), String> {
    let page_obj = doc.get_object_mut(page_id).map_err(|e| format!("{:?}", e))?;
    let page_dict = page_obj.as_dict_mut().map_err(|e| format!("{:?}", e))?;
    let resources_val = page_dict.get(b"Resources").map_err(|e| format!("{:?}", e))?.clone();

    match resources_val {
        Object::Reference(res_id) => {
            let res_obj = doc.get_object_mut(res_id).map_err(|e| format!("{:?}", e))?;
            let res_dict = res_obj.as_dict_mut().map_err(|e| format!("{:?}", e))?;
            if !res_dict.has(b"XObject") {
                res_dict.set("XObject", Object::Dictionary(lopdf::Dictionary::new()));
            }
            if let Ok(xo_dict) = res_dict.get_mut(b"XObject").and_then(|o| o.as_dict_mut()) {
                xo_dict.set(name, Object::Reference(xobj_id));
            }
        }
        Object::Dictionary(mut d) => {
            if !d.has(b"XObject") {
                d.set("XObject", Object::Dictionary(lopdf::Dictionary::new()));
            }
            if let Ok(xo_dict) = d.get_mut(b"XObject").and_then(|o| o.as_dict_mut()) {
                xo_dict.set(name, Object::Reference(xobj_id));
            }
            let page_obj = doc.get_object_mut(page_id).map_err(|e| format!("{:?}", e))?;
            let page_dict = page_obj.as_dict_mut().map_err(|e| format!("{:?}", e))?;
            page_dict.set("Resources", Object::Dictionary(d));
        }
        _ => {}
    }
    Ok(())
}

/// Appends raw bytes into a page's `/Contents` stream
fn append_content_to_page(doc: &mut Document, page_id: ObjectId, bytes: Vec<u8>) -> Result<(), String> {
    if bytes.is_empty() {
        return Ok(());
    }

    let stream = lopdf::Stream::new(dictionary! { "Length" => Object::Integer(bytes.len() as i64) }, bytes);
    let new_stream_id = doc.add_object(Object::Stream(stream));

    let page_obj = doc.get_object_mut(page_id).map_err(|e| format!("{:?}", e))?;
    let page_dict = page_obj.as_dict_mut().map_err(|e| format!("{:?}", e))?;

    if let Ok(contents) = page_dict.get(b"Contents") {
        match contents {
            Object::Reference(old_id) => {
                let old_ref = *old_id;
                page_dict.set("Contents", Object::Array(vec![Object::Reference(old_ref), Object::Reference(new_stream_id)]));
            }
            Object::Array(arr) => {
                let mut new_arr = arr.clone();
                new_arr.push(Object::Reference(new_stream_id));
                page_dict.set("Contents", Object::Array(new_arr));
            }
            _ => {
                page_dict.set("Contents", Object::Reference(new_stream_id));
            }
        }
    } else {
        page_dict.set("Contents", Object::Reference(new_stream_id));
    }

    Ok(())
}

fn append_page_to_catalog(doc: &mut Document, new_page_id: ObjectId) -> Result<(), String> {
    let catalog = doc.catalog().map_err(|e| format!("{:?}", e))?;
    let pages_id = catalog
        .get(b"Pages")
        .and_then(|o| o.as_reference())
        .map_err(|e| format!("Catalog missing Pages reference: {:?}", e))?;

    let pages_obj = doc.get_object_mut(pages_id).map_err(|e| format!("{:?}", e))?;
    let pages_dict = pages_obj.as_dict_mut().map_err(|e| format!("{:?}", e))?;

    if let Ok(kids) = pages_dict.get_mut(b"Kids").and_then(|k| k.as_array_mut()) {
        kids.push(Object::Reference(new_page_id));
    } else {
        pages_dict.set("Kids", Object::Array(vec![Object::Reference(new_page_id)]));
    }

    let count = pages_dict.get(b"Count").and_then(|c| c.as_i64()).unwrap_or(0);
    pages_dict.set("Count", Object::Integer(count + 1));

    let page_obj = doc.get_object_mut(new_page_id).map_err(|e| format!("{:?}", e))?;
    let page_dict = page_obj.as_dict_mut().map_err(|e| format!("{:?}", e))?;
    page_dict.set("Parent", Object::Reference(pages_id));

    Ok(())
}

/// The main Native Rust PDF generation function
pub fn generate_pdf_native(payload_json: &str) -> Result<String, String> {
    let start_time = Instant::now();

    let root_val: Value = serde_json::from_str(payload_json)
        .map_err(|e| format!("خطأ في قراءة بيانات JSON المرسلة: {}", e))?;

    let data = root_val.get("data").unwrap_or(&root_val);
    let layout = root_val.get("layout");
    let output_path_opt = root_val.get("output_path").and_then(|v| v.as_str());

    // 1. Locate and load base template PDF
    let template_path = find_template_pdf()?;
    let mut doc = Document::load(&template_path)
        .map_err(|e| format!("فشل تحميل ملف قالب الـ PDF الأصلي: {:?}", e))?;

    // 2. Parse embedded TrueType faces for HarfBuzz shaping
    let regular_face = Face::from_slice(REGULAR_FONT_BYTES, 0)
        .ok_or_else(|| "فشل قراءة خط IBM Plex Sans Regular".to_string())?;
    let bold_face = Face::from_slice(BOLD_FONT_BYTES, 0)
        .ok_or_else(|| "فشل قراءة خط IBM Plex Sans Bold".to_string())?;

    // 3. Embed TrueType fonts as Type0 in the PDF Document
    let regular_font_info = embed_truetype_font(&mut doc, REGULAR_FONT_BYTES, "F_Regular")?;
    let bold_font_info = embed_truetype_font(&mut doc, BOLD_FONT_BYTES, "F_Bold")?;

    let stamping_ctx = StampingContext {
        regular_face: &regular_face,
        bold_face: &bold_face,
        regular_font_name: "F_Regular",
        bold_font_name: "F_Bold",
    };

    // 4. Get pages list from template document
    let page_numbers = doc.get_pages();
    let mut image_counter = 0usize;

    // 5. Populate pages 1 to 6 using layout fields
    if let Some(pages_arr) = layout.and_then(|l| l.get("pages")).and_then(|p| p.as_array()) {
        for page_entry in pages_arr {
            let page_num = page_entry.get("page").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
            if let Some(&page_id) = page_numbers.get(&page_num) {
                // Ensure page resources contain our embedded fonts
                ensure_page_resources(
                    &mut doc,
                    page_id,
                    regular_font_info.font_object_id,
                    bold_font_info.font_object_id,
                )?;

                let mut page_stream_bytes = Vec::new();

                if let Some(fields) = page_entry.get("fields").and_then(|f| f.as_array()) {
                    for field in fields {
                        let rect_obj = match field.get("rect") {
                            Some(r) => r,
                            None => continue,
                        };

                        let left = rect_obj.get("left").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                        let top = rect_obj.get("top").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                        let width = rect_obj.get("width").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                        let height = rect_obj.get("height").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;

                        if width <= 0.0 || height <= 0.0 {
                            continue;
                        }

                        let (x0, y0, x1, y1) = pct_to_pdf_rect(left, top, width, height);

                        let field_type = field.get("type").and_then(|v| v.as_str()).unwrap_or("text");
                        let binding = field.get("binding").and_then(|v| v.as_str()).unwrap_or("");
                        let field_id = field.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let is_bold = field.get("style").and_then(|s| s.get("bold")).and_then(|v| v.as_bool()).unwrap_or(false);
                        let max_fontsize = field.get("style").and_then(|s| s.get("fontSize")).and_then(|v| v.as_f64()).unwrap_or(10.5) as f32;

                        let val = resolve_field_value(data, binding, field_id);

                        if field_type == "image" {
                            if !val.is_empty() {
                                image_counter += 1;
                                if let Ok((img_id, res_name)) = embed_image_xobject(&mut doc, &val, image_counter) {
                                    let _ = inject_xobject_into_page(&mut doc, page_id, &res_name, img_id);
                                    let draw_bytes = create_image_draw_stream(&res_name, x0, y0, x1, y1);
                                    page_stream_bytes.extend(draw_bytes);
                                }
                            }
                            continue;
                        }

                        if field_type == "checkbox" {
                            let is_checked = val == "true" || val == "1" || val == "نعم";
                            if is_checked {
                                let check_bytes = create_check_stream(x0, y0, x1, y1, &stamping_ctx);
                                page_stream_bytes.extend(check_bytes);
                            }
                            continue;
                        }

                        if !val.is_empty() {
                            let text_bytes = create_text_stream(
                                &val,
                                x0,
                                y0,
                                x1,
                                y1,
                                is_bold,
                                max_fontsize,
                                2, // Right-to-Left Arabic alignment
                                &stamping_ctx,
                            );
                            page_stream_bytes.extend(text_bytes);
                        }
                    }
                }

                if !page_stream_bytes.is_empty() {
                    append_content_to_page(&mut doc, page_id, page_stream_bytes)?;
                }
            }
        }
    }

    // 6. Handle Duplicated Ledger Extra Pages (صفحات دفتر الصرف المكررة)
    if let Some(extra_pages) = data.get("extra_pages").and_then(|ep| ep.as_array()) {
        for ep in extra_pages {
            let ep_type = ep.get("type").and_then(|v| v.as_str()).unwrap_or("");
            if ep_type == "duplicated_ledger" {
                // Page 6 is page number 6
                if let Some(&p6_id) = page_numbers.get(&6) {
                    // Clone Page 6 dictionary to create a new duplicate page in catalog
                    if let Ok(p6_dict) = doc.get_object(p6_id).and_then(|o| o.as_dict()).cloned() {
                        let new_page_id = doc.add_object(Object::Dictionary(p6_dict));
                        // Add new page to Document pages catalog
                        let _ = append_page_to_catalog(&mut doc, new_page_id);

                        // Ensure fonts in duplicate page
                        let _ = ensure_page_resources(
                            &mut doc,
                            new_page_id,
                            regular_font_info.font_object_id,
                            bold_font_info.font_object_id,
                        );

                        // If duplicate page has page6Data, stamp it onto the new duplicate page
                        if let Some(p6_data) = ep.get("page6Data") {
                            let mut dup_stream_bytes = Vec::new();
                            if let Some(p6_fields) = layout
                                .and_then(|l| l.get("pages"))
                                .and_then(|p| p.as_array())
                                .and_then(|arr| arr.iter().find(|p| p.get("page").and_then(|v| v.as_u64()) == Some(6)))
                                .and_then(|p| p.get("fields"))
                                .and_then(|f| f.as_array())
                            {
                                for field in p6_fields {
                                    let rect_obj = match field.get("rect") {
                                        Some(r) => r,
                                        None => continue,
                                    };
                                    let left = rect_obj.get("left").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                                    let top = rect_obj.get("top").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                                    let width = rect_obj.get("width").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                                    let height = rect_obj.get("height").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                                    let (x0, y0, x1, y1) = pct_to_pdf_rect(left, top, width, height);

                                    let binding = field.get("binding").and_then(|v| v.as_str()).unwrap_or("");
                                    let field_id = field.get("id").and_then(|v| v.as_str()).unwrap_or("");
                                    let val = resolve_field_value(p6_data, binding, field_id);
                                    if !val.is_empty() {
                                        let text_bytes = create_text_stream(
                                            &val,
                                            x0,
                                            y0,
                                            x1,
                                            y1,
                                            false,
                                            10.5,
                                            2,
                                            &stamping_ctx,
                                        );
                                        dup_stream_bytes.extend(text_bytes);
                                    }
                                }
                            }
                            if !dup_stream_bytes.is_empty() {
                                let _ = append_content_to_page(&mut doc, new_page_id, dup_stream_bytes);
                            }
                        }
                    }
                }
            }
        }
    }

    // 7. Output result to destination path or buffer
    let final_dest = if let Some(target) = output_path_opt {
        PathBuf::from(target)
    } else {
        let temp_dir = std::env::temp_dir();
        temp_dir.join(format!("تقرير_خدمة_الرعاية_{}.pdf", chrono::Local::now().format("%Y%m%d_%H%M%S")))
    };

    if let Some(parent) = final_dest.parent() {
        let _ = fs::create_dir_all(parent);
    }

    doc.save(&final_dest)
        .map_err(|e| format!("فشل حفظ ملف الـ PDF الناتج: {:?}", e))?;

    let elapsed = start_time.elapsed();
    let file_size = fs::metadata(&final_dest).map(|m| m.len()).unwrap_or(0);

    let result_obj = serde_json::json!({
        "status": "success",
        "file_path": final_dest.to_string_lossy(),
        "file_size_bytes": file_size,
        "elapsed_ms": elapsed.as_millis(),
        "engine": "native_rust_lopdf"
    });

    Ok(result_obj.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_pdf_native_pipeline() {
        let test_payload = serde_json::json!({
            "data": {
                "page1": {
                    "church_name": "كنيسة الشهيد أبي سيفين بالقلج",
                    "study_date": "2026/09/24",
                    "church_study_id": "12345",
                    "cathedral_care_id": "67890",
                    "church_membership_id": "999"
                },
                "page2": {
                    "husband": {
                        "name": "مينا سامي إبراهيم",
                        "salary": "3500",
                        "status": "present"
                    },
                    "wife": {
                        "name": "مريم سمير جورج",
                        "salary": "1500"
                    }
                },
                "page4": {
                    "income": {
                        "church_aid": "2000",
                        "base_salary": "3500",
                        "side_project": "1200",
                        "relatives_aid": "1700",
                        "total_income": "8400 ج.م"
                    }
                }
            },
            "layout": {
                "pages": [
                    {
                        "page": 1,
                        "fields": [
                            {
                                "id": "p1_church",
                                "binding": "page1.church_name",
                                "type": "text",
                                "rect": { "left": 40.0, "top": 5.0, "width": 50.0, "height": 3.0 },
                                "style": { "fontSize": 12.0, "bold": true }
                            },
                            {
                                "id": "p1_id",
                                "binding": "page1.church_study_id",
                                "type": "text",
                                "rect": { "left": 10.0, "top": 5.0, "width": 20.0, "height": 3.0 }
                            }
                        ]
                    }
                ]
            }
        });

        let result_str = generate_pdf_native(&test_payload.to_string())
            .expect("Native Rust PDF Generation Failed");

        let result_json: serde_json::Value = serde_json::from_str(&result_str).unwrap();
        assert_eq!(result_json["status"], "success");
        let elapsed_ms = result_json["elapsed_ms"].as_u64().unwrap();
        let file_path = result_json["file_path"].as_str().unwrap();
        let file_size = result_json["file_size_bytes"].as_u64().unwrap();

        println!("=== NATIVE RUST PDF BENCHMARK ===");
        println!("File generated at: {}", file_path);
        println!("File size: {} bytes ({:.1} KB)", file_size, file_size as f64 / 1024.0);
        println!("ELAPSED TIME: {} ms", elapsed_ms);
        assert!(file_size > 100_000, "PDF size must be valid");
        assert!(std::path::Path::new(file_path).exists(), "Output PDF must exist");
    }
}

