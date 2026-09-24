use lopdf::{dictionary, Document, Object, ObjectId, Stream};
use rustybuzz::Face;
use std::io::Cursor;
use crate::pdf_engine::typography::{calculate_text_width_pt, glyphs_to_pdf_hex, shape_text};

pub const A4_WIDTH_PT: f32 = 595.28;
pub const A4_HEIGHT_PT: f32 = 841.89;

pub struct StampingContext<'a> {
    pub regular_face: &'a Face<'a>,
    pub bold_face: &'a Face<'a>,
    pub regular_font_name: &'static str,
    pub bold_font_name: &'static str,
}

/// Converts top-left percentage coordinates to PDF bottom-left points
pub fn pct_to_pdf_rect(left: f32, top: f32, width: f32, height: f32) -> (f32, f32, f32, f32) {
    let x0 = (left / 100.0) * A4_WIDTH_PT;
    let x1 = ((left + width) / 100.0) * A4_WIDTH_PT;
    let y0 = (1.0 - (top + height) / 100.0) * A4_HEIGHT_PT;
    let y1 = (1.0 - top / 100.0) * A4_HEIGHT_PT;
    (x0, y0, x1, y1)
}

/// Generates PDF content stream bytes for rendering shaped Arabic text within a bounding box
pub fn create_text_stream(
    text: &str,
    x0: f32,
    y0: f32,
    x1: f32,
    y1: f32,
    is_bold: bool,
    max_fontsize: f32,
    align: u8, // 0 = Left, 1 = Center, 2 = Right
    ctx: &StampingContext,
) -> Vec<u8> {
    if text.trim().is_empty() {
        return Vec::new();
    }

    let face = if is_bold { ctx.bold_face } else { ctx.regular_face };
    let font_name = if is_bold { ctx.bold_font_name } else { ctx.regular_font_name };

    let box_w = (x1 - x0).abs();
    let box_h = (y1 - y0).abs();

    // Auto-fit font size based on box dimensions
    let mut fontsize = max_fontsize;
    if fontsize <= 0.0 {
        fontsize = 10.5;
    }
    // Cap vertical font size to fit box comfortably
    fontsize = fontsize.min((box_h - 2.0).max(6.0));

    let mut glyphs = shape_text(text, face, fontsize);
    let mut text_w = calculate_text_width_pt(&glyphs);

    // If text exceeds box width, scale down font size gracefully
    if text_w > (box_w - 4.0) && box_w > 10.0 {
        let ratio = (box_w - 4.0) / text_w;
        fontsize = (fontsize * ratio).max(7.5);
        glyphs = shape_text(text, face, fontsize);
        text_w = calculate_text_width_pt(&glyphs);
    }

    let hex_glyphs = glyphs_to_pdf_hex(&glyphs);

    // Baseline calculation
    let baseline_x = match align {
        1 => x0 + ((box_w - text_w) / 2.0).max(0.0), // Center
        0 => x0 + 2.0,                               // Left
        _ => (x1 - 3.0 - text_w).max(x0),            // Right (Arabic default)
    };

    let baseline_y = y0 + ((box_h - fontsize) / 2.0).max(0.0) + (fontsize * 0.22);

    let stream_str = format!(
        "q\n0.1 0.1 0.1 rg\nBT\n/{} {:.2} Tf\n{:.2} {:.2} Td\n{} Tj\nET\nQ\n",
        font_name, fontsize, baseline_x, baseline_y, hex_glyphs
    );

    stream_str.into_bytes()
}

/// Generates PDF content stream bytes for rendering a checkmark
pub fn create_check_stream(x0: f32, y0: f32, x1: f32, y1: f32, ctx: &StampingContext) -> Vec<u8> {
    create_text_stream("✔", x0, y0, x1, y1, true, 12.0, 1, ctx)
}

/// Embeds an image as a PDF Image XObject and returns its ObjectId and resource name
pub fn embed_image_xobject(
    doc: &mut Document,
    image_base64: &str,
    img_index: usize,
) -> Result<(ObjectId, String), String> {
    use base64::Engine;

    // Clean data URL prefix if present: "data:image/jpeg;base64,..."
    let b64_clean = if let Some(idx) = image_base64.find("base64,") {
        &image_base64[idx + 7..]
    } else {
        image_base64
    };

    let raw_bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_clean.trim())
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    let dynamic_img = image::load_from_memory(&raw_bytes)
        .map_err(|e| format!("Failed to decode image format: {}", e))?;

    let rgb_img = dynamic_img.to_rgb8();
    let (width, height) = rgb_img.dimensions();

    // Re-encode to high quality JPEG buffer to save PDF space
    let mut jpeg_buf = Vec::new();
    let mut cursor = Cursor::new(&mut jpeg_buf);
    dynamic_img
        .write_to(&mut cursor, image::ImageFormat::Jpeg)
        .map_err(|e| format!("Failed to re-encode image to JPEG: {}", e))?;

    let img_dict = dictionary! {
        "Type" => Object::Name(b"XObject".to_vec()),
        "Subtype" => Object::Name(b"Image".to_vec()),
        "Width" => Object::Integer(width as i64),
        "Height" => Object::Integer(height as i64),
        "ColorSpace" => Object::Name(b"DeviceRGB".to_vec()),
        "BitsPerComponent" => Object::Integer(8),
        "Filter" => Object::Name(b"DCTDecode".to_vec()), // Standard JPEG filter in PDF
        "Length" => Object::Integer(jpeg_buf.len() as i64),
    };

    let img_stream = Stream::new(img_dict, jpeg_buf);
    let img_id = doc.add_object(Object::Stream(img_stream));
    let resource_name = format!("Im{}", img_index);

    Ok((img_id, resource_name))
}

/// Generates PDF content stream bytes for drawing an Image XObject into a bounding box
pub fn create_image_draw_stream(
    resource_name: &str,
    x0: f32,
    y0: f32,
    x1: f32,
    y1: f32,
) -> Vec<u8> {
    let w = (x1 - x0).abs();
    let h = (y1 - y0).abs();
    let stream_str = format!(
        "q\n{:.2} 0 0 {:.2} {:.2} {:.2} cm\n/{} Do\nQ\n",
        w, h, x0, y0, resource_name
    );
    stream_str.into_bytes()
}
