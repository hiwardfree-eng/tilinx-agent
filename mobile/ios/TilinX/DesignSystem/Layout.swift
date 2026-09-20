import SwiftUI

/// Spacing scale — a thin, lossless alias over the generated `TilinXSpacing`
/// tokens so features read `Spacing.space16` instead of reaching for a literal.
/// The full token scale (2…64) is available; every gap/pad in a feature must
/// come from here.
typealias Spacing = TilinXSpacing

/// Corner-radius scale — alias over the generated `TilinXRadius` tokens
/// (`sm`…`full`, plus the composer radius). No literal corner radii in features.
typealias Radius = TilinXRadius

/// Motion durations, aliased from `TilinXDuration` (seconds).
typealias Motion = TilinXDuration
