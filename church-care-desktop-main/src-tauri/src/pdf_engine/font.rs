use lopdf::{dictionary, Dictionary, Document, Object, ObjectId, Stream};
use ttf_parser::Face;

pub struct EmbeddedPdfFont {
    pub font_name: String,
    pub font_object_id: ObjectId,
    pub units_per_em: u16,
    pub ascent: i16,
    pub descent: i16,
}

/// Embeds a TrueType font into a `lopdf::Document` as a Type0 / CIDFontType2 font
/// with `/Identity-H` encoding and `/CIDToGIDMap /Identity`.
/// This enables rendering arbitrary shaped glyph IDs produced by HarfBuzz (rustybuzz).
pub fn embed_truetype_font(
    doc: &mut Document,
    font_bytes: &[u8],
    font_alias: &str,
) -> Result<EmbeddedPdfFont, String> {
    let face = Face::parse(font_bytes, 0).map_err(|e| format!("Failed to parse TTF: {:?}", e))?;

    let postscript_name = face
        .names()
        .into_iter()
        .find(|n| n.name_id == ttf_parser::name_id::POST_SCRIPT_NAME && n.is_unicode())
        .and_then(|n| n.to_string())
        .unwrap_or_else(|| font_alias.to_string());

    let units_per_em = face.units_per_em();
    let ascent = face.ascender();
    let descent = face.descender();
    let cap_height = face.capital_height().unwrap_or(700);
    let bbox = face.global_bounding_box();

    // 1. FontFile2 Stream (The raw TTF font bytes)
    let mut font_file_dict = Dictionary::new();
    font_file_dict.set("Length", Object::Integer(font_bytes.len() as i64));
    font_file_dict.set("Length1", Object::Integer(font_bytes.len() as i64));
    let font_file_stream = Stream::new(font_file_dict, font_bytes.to_vec());
    let font_file_id = doc.add_object(Object::Stream(font_file_stream));

    // 2. FontDescriptor
    let font_descriptor = dictionary! {
        "Type" => Object::Name(b"FontDescriptor".to_vec()),
        "FontName" => Object::Name(postscript_name.as_bytes().to_vec()),
        "Flags" => Object::Integer(4), // Non-symbolic
        "FontBBox" => Object::Array(vec![
            Object::Integer(bbox.x_min as i64),
            Object::Integer(bbox.y_min as i64),
            Object::Integer(bbox.x_max as i64),
            Object::Integer(bbox.y_max as i64),
        ]),
        "ItalicAngle" => Object::Integer(face.italic_angle() as i64),
        "Ascent" => Object::Integer(ascent as i64),
        "Descent" => Object::Integer(descent as i64),
        "CapHeight" => Object::Integer(cap_height as i64),
        "StemV" => Object::Integer(80),
        "FontFile2" => Object::Reference(font_file_id),
    };
    let font_descriptor_id = doc.add_object(Object::Dictionary(font_descriptor));

    // 3. Build Widths Array (W) for all glyphs in font
    // Format: [ c1 [ w1 w2 ... ] c2 [ ... ] ]
    let num_glyphs = face.number_of_glyphs();
    let mut widths_array = Vec::new();
    let mut current_start = 0u16;
    let mut current_chunk = Vec::new();

    for gid in 0..num_glyphs {
        let gid_typed = ttf_parser::GlyphId(gid);
        let advance = face.glyph_hor_advance(gid_typed).unwrap_or(units_per_em / 2);
        // Normalize advance to 1000 units scale
        let scaled_adv = (advance as f64 / units_per_em as f64 * 1000.0).round() as i64;

        if current_chunk.is_empty() {
            current_start = gid;
            current_chunk.push(Object::Integer(scaled_adv));
        } else if current_chunk.len() < 255 {
            current_chunk.push(Object::Integer(scaled_adv));
        } else {
            widths_array.push(Object::Integer(current_start as i64));
            widths_array.push(Object::Array(current_chunk.clone()));
            current_chunk.clear();
            current_start = gid;
            current_chunk.push(Object::Integer(scaled_adv));
        }
    }
    if !current_chunk.is_empty() {
        widths_array.push(Object::Integer(current_start as i64));
        widths_array.push(Object::Array(current_chunk));
    }

    // 4. CIDFontType2 (DescendantFont)
    let cid_system_info = dictionary! {
        "Registry" => Object::String(b"Adobe".to_vec(), lopdf::StringFormat::Literal),
        "Ordering" => Object::String(b"Identity".to_vec(), lopdf::StringFormat::Literal),
        "Supplement" => Object::Integer(0),
    };

    let cid_font = dictionary! {
        "Type" => Object::Name(b"Font".to_vec()),
        "Subtype" => Object::Name(b"CIDFontType2".to_vec()),
        "BaseFont" => Object::Name(postscript_name.as_bytes().to_vec()),
        "CIDSystemInfo" => Object::Dictionary(cid_system_info),
        "FontDescriptor" => Object::Reference(font_descriptor_id),
        "CIDToGIDMap" => Object::Name(b"Identity".to_vec()),
        "DW" => Object::Integer(1000),
        "W" => Object::Array(widths_array),
    };
    let cid_font_id = doc.add_object(Object::Dictionary(cid_font));

    // 5. Type0 Font
    let type0_font = dictionary! {
        "Type" => Object::Name(b"Font".to_vec()),
        "Subtype" => Object::Name(b"Type0".to_vec()),
        "BaseFont" => Object::Name(postscript_name.as_bytes().to_vec()),
        "Encoding" => Object::Name(b"Identity-H".to_vec()),
        "DescendantFonts" => Object::Array(vec![Object::Reference(cid_font_id)]),
    };
    let type0_font_id = doc.add_object(Object::Dictionary(type0_font));

    Ok(EmbeddedPdfFont {
        font_name: font_alias.to_string(),
        font_object_id: type0_font_id,
        units_per_em,
        ascent,
        descent,
    })
}
