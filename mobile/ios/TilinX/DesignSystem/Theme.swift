import SwiftUI

// The resolved semantic palette for one theme mode.
//
// Every colour the app draws comes from here. `Theme` wraps the generated
// `TilinXColors` token pairs (packages/design-tokens/dist/swift) and resolves
// each pair against the app's own light/dark mode, matching how the web/desktop
// app toggles `[data-theme]` rather than following the system appearance.
//
// Roles mirror the `--ht-*` CSS custom properties one-for-one. NO raw hex or
// rgba may appear anywhere else in the app; reach for a role on `Theme` instead.
struct Theme: Equatable {
    let mode: TilinXTheme

    // Grounds — base (the app frame) then background (the main pane) then input (the white surface)
    var base: Color { TilinXColors.base.resolve(mode) }
    var background: Color { TilinXColors.background.resolve(mode) }
    var input: Color { TilinXColors.input.resolve(mode) }

    // Ink (text)
    var ink: Color { TilinXColors.ink.resolve(mode) }
    var inkMuted: Color { TilinXColors.inkMuted.resolve(mode) }

    // Elevated surfaces
    var card: Color { TilinXColors.card.resolve(mode) }
    var cardText: Color { TilinXColors.cardText.resolve(mode) }
    var cardSolid: Color { TilinXColors.cardSolid.resolve(mode) }
    var popover: Color { TilinXColors.popover.resolve(mode) }
    var popoverText: Color { TilinXColors.popoverText.resolve(mode) }

    // Accents / emphasis
    var action: Color { TilinXColors.action.resolve(mode) }
    var actionText: Color { TilinXColors.actionText.resolve(mode) }
    var chip: Color { TilinXColors.chip.resolve(mode) }
    var chipText: Color { TilinXColors.chipText.resolve(mode) }
    var chipSubtle: Color { TilinXColors.chipSubtle.resolve(mode) }
    var hover: Color { TilinXColors.hover.resolve(mode) }
    var hoverText: Color { TilinXColors.hoverText.resolve(mode) }

    // Status
    var danger: Color { TilinXColors.danger.resolve(mode) }
    var dangerText: Color { TilinXColors.dangerText.resolve(mode) }
    var success: Color { TilinXColors.success.resolve(mode) }
    var successText: Color { TilinXColors.successText.resolve(mode) }
    var warning: Color { TilinXColors.warning.resolve(mode) }
    var warningText: Color { TilinXColors.warningText.resolve(mode) }
    var highlight: Color { TilinXColors.highlight.resolve(mode) }
    var highlightText: Color { TilinXColors.highlightText.resolve(mode) }

    // Chrome
    var line: Color { TilinXColors.line.resolve(mode) }
    var lineInput: Color { TilinXColors.lineInput.resolve(mode) }
    var focus: Color { TilinXColors.focus.resolve(mode) }
    var sidebar: Color { TilinXColors.sidebar.resolve(mode) }
    var sidebarText: Color { TilinXColors.sidebarText.resolve(mode) }
    var sidebarLine: Color { TilinXColors.sidebarLine.resolve(mode) }
    var sidebarHover: Color { TilinXColors.sidebarHover.resolve(mode) }
    var sidebarHoverText: Color { TilinXColors.sidebarHoverText.resolve(mode) }

    /// The faint circle tint behind an agent's helmet: `chip 82% + agentColor 18%`
    /// (PARITY §4). `agentColor` is the agent's themed hex; nil falls back to TilinX gray.
    func agentAvatarBackground(_ agentColor: Color?) -> Color {
        ColorMix.mix(chip, agentColor ?? AgentColor.fallback, ratio: 0.18)
    }
}

private struct ThemeKey: EnvironmentKey {
    static let defaultValue = Theme(mode: .light)
}

extension EnvironmentValues {
    /// The active TilinX theme. Read it with `@Environment(\.theme) private var theme`.
    var theme: Theme {
        get { self[ThemeKey.self] }
        set { self[ThemeKey.self] = newValue }
    }
}

extension View {
    /// Publish a TilinX theme mode to the subtree and pin the SwiftUI colour
    /// scheme to it (TilinX drives its own light/dark, not the system one).
    func tilinxTheme(_ mode: TilinXTheme) -> some View {
        environment(\.theme, Theme(mode: mode))
            .preferredColorScheme(mode == .dark ? .dark : .light)
    }
}
