use rustybuzz::{Face, UnicodeBuffer};
use unicode_bidi::{BidiInfo, Level};

/// Represents a positioned glyph ready for PDF stream injection
#[derive(Debug, Clone)]
pub struct ShapedGlyph {
    pub glyph_id: u16,
    pub x_advance: f32, // In points (pt)
    pub y_advance: f32,
    pub x_offset: f32,
    pub y_offset: f32,
}

#[derive(Debug, Clone)]
pub struct ShapedTextRun {
    pub glyphs: Vec<ShapedGlyph>,
    pub total_width_pt: f32,
    pub is_rtl: bool,
}

/// Shapes an Arabic or mixed-script string using Unicode BiDi + HarfBuzz (rustybuzz)
pub fn shape_text(
    text: &str,
    face: &Face,
    font_size_pt: f32,
) -> Vec<ShapedGlyph> {
    if text.is_empty() {
        return Vec::new();
    }

    let units_per_em = face.units_per_em() as f32;
    let scale = font_size_pt / units_per_em;

    // 1. Process Unicode BiDi algorithm
    let bidi_info = BidiInfo::new(text, Some(Level::rtl()));
    let mut all_glyphs = Vec::new();

    // Iterate over visual runs in correct display order
    for para in &bidi_info.paragraphs {
        let (levels, runs) = bidi_info.visual_runs(para, para.range.clone());
        for run_range in runs {
            let run_text = &text[run_range.clone()];
            let level = levels[run_range.start];
            let is_rtl = level.is_rtl();

            // 2. Shape run using HarfBuzz
            let mut buffer = UnicodeBuffer::new();
            buffer.push_str(run_text);
            buffer.set_direction(if is_rtl {
                rustybuzz::Direction::RightToLeft
            } else {
                rustybuzz::Direction::LeftToRight
            });
            buffer.set_script(if is_rtl {
                rustybuzz::script::ARABIC
            } else {
                rustybuzz::script::LATIN
            });

            let glyph_buffer = rustybuzz::shape(face, &[], buffer);
            let infos = glyph_buffer.glyph_infos();
            let positions = glyph_buffer.glyph_positions();

            for (info, pos) in infos.iter().zip(positions.iter()) {
                all_glyphs.push(ShapedGlyph {
                    glyph_id: info.glyph_id as u16,
                    x_advance: pos.x_advance as f32 * scale,
                    y_advance: pos.y_advance as f32 * scale,
                    x_offset: pos.x_offset as f32 * scale,
                    y_offset: pos.y_offset as f32 * scale,
                });
            }
        }
    }

    all_glyphs
}

/// Calculate total width of shaped glyphs in points
pub fn calculate_text_width_pt(glyphs: &[ShapedGlyph]) -> f32 {
    glyphs.iter().map(|g| g.x_advance).sum()
}

/// Convert shaped glyph IDs to PDF hex string format: `<004A005B...>`
pub fn glyphs_to_pdf_hex(glyphs: &[ShapedGlyph]) -> String {
    let mut hex = String::with_capacity(glyphs.len() * 4 + 2);
    hex.push('<');
    for g in glyphs {
        use std::fmt::Write;
        let _ = write!(hex, "{:04X}", g.glyph_id);
    }
    hex.push('>');
    hex
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_arabic_shaping() {
        let font_bytes = include_bytes!("../../../fonts/IBMPlexSansArabic-Regular.ttf");
        let face = Face::from_slice(font_bytes, 0).expect("Failed to parse font");

        let text = "كنيسة الشهيد أبي سيفين";
        let glyphs = shape_text(text, &face, 11.0);
        assert!(!glyphs.is_empty(), "Glyphs should not be empty");

        let width = calculate_text_width_pt(&glyphs);
        assert!(width > 10.0, "Width should be positive");

        let hex = glyphs_to_pdf_hex(&glyphs);
        assert!(hex.starts_with('<') && hex.ends_with('>'));
        println!("Shaped '{}' -> width: {:.2}pt, hex: {}", text, width, hex);
    }
}
