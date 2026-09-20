import SwiftUI

/// The type scale, built from the generated `TilinXFontSize` / `TilinXFontWeight`
/// tokens. The web stack resolves to the system UI font, so iOS uses the native
/// system font (Dynamic Type friendly) at the token sizes. Never construct
/// `Font.system(size:)` with a raw literal in a feature — add a role here.
enum Typography {
    /// 28 / semibold — page titles ("Mission Control", "Archived").
    static let h1 = Font.system(size: TilinXFontSize.h1, weight: TilinXFontWeight.semibold)
    /// 18 / semibold — section + card titles.
    static let title = Font.system(size: TilinXFontSize.lg, weight: TilinXFontWeight.semibold)
    /// 16 / regular — primary body copy.
    static let body = Font.system(size: TilinXFontSize.base, weight: TilinXFontWeight.regular)
    /// 16 / medium — emphasised body (row labels).
    static let bodyMedium = Font.system(size: TilinXFontSize.base, weight: TilinXFontWeight.medium)
    /// 14 / regular — secondary copy, descriptions, snippets.
    static let callout = Font.system(size: TilinXFontSize.sm, weight: TilinXFontWeight.regular)
    /// 14 / medium — chips, buttons, tags.
    static let label = Font.system(size: TilinXFontSize.sm, weight: TilinXFontWeight.medium)
    /// 12 / regular — captions, metadata, the muted group line above a title.
    static let caption = Font.system(size: TilinXFontSize.xs, weight: TilinXFontWeight.regular)
    /// 12 / semibold — uppercase section headers, count badges.
    static let captionStrong = Font.system(size: TilinXFontSize.xs, weight: TilinXFontWeight.semibold)

    /// Escape hatch for a one-off size that still comes from the token scale.
    static func font(_ size: CGFloat, _ weight: Font.Weight = TilinXFontWeight.regular) -> Font {
        Font.system(size: size, weight: weight)
    }
}
