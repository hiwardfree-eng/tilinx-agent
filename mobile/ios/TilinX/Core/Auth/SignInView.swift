import AuthenticationServices
import SwiftUI

/// The sign-in surface: TilinX mark, the four ways in (Apple native, Google,
/// Microsoft, passwordless email code — same set as desktop, Apple added per
/// App Store guideline 4.8), and an inline error line. All visual values come
/// from the design tokens; all copy from `Strings.Auth` (the Apple button
/// localizes itself).
struct SignInView: View {
    /// Which provider button is showing its spinner (view concern only).
    enum PendingProvider {
        case google
        case microsoft
    }

    let controller: AuthController
    @Environment(\.colorScheme) private var colorScheme
    @State private var pending: PendingProvider?

    private var theme: TilinXTheme { colorScheme == .dark ? .dark : .light }
    private var busy: Bool { controller.state == .signingIn }

    var body: some View {
        ZStack {
            TilinXColors.input.resolve(theme).ignoresSafeArea()
            VStack(spacing: TilinXSpacing.space24) {
                Spacer()
                TilinXMark()
                    .frame(width: 48, height: 48)
                header
                providerButtons
                divider
                EmailCodeSignIn(controller: controller, theme: theme)
                if let message = controller.errorMessage {
                    Text(message)
                        .font(.system(size: TilinXFontSize.xs))
                        .foregroundStyle(TilinXColors.danger.resolve(theme))
                        .multilineTextAlignment(.center)
                }
                Spacer()
            }
            .padding(.horizontal, TilinXSpacing.space24)
            .frame(maxWidth: 360)
        }
    }

    private var header: some View {
        VStack(spacing: TilinXSpacing.space8) {
            Text(Strings.Auth.welcomeTitle)
                .font(.system(size: TilinXFontSize.h1, weight: TilinXFontWeight.semibold))
                .foregroundStyle(TilinXColors.ink.resolve(theme))
            Text(Strings.Auth.welcomeSubtitle)
                .font(.system(size: TilinXFontSize.sm))
                .foregroundStyle(TilinXColors.inkMuted.resolve(theme))
                .multilineTextAlignment(.center)
        }
    }

    private var providerButtons: some View {
        VStack(spacing: TilinXSpacing.space8) {
            SignInWithAppleButton(.continue) { request in
                controller.prepareAppleRequest(request)
            } onCompletion: { result in
                Task { await controller.completeAppleSignIn(result) }
            }
            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
            .frame(height: 44)
            .clipShape(RoundedRectangle(cornerRadius: TilinXRadius.full))
            .disabled(busy)

            providerButton(label: Strings.Auth.continueWithGoogle, pending: .google) {
                GoogleMark()
            } action: {
                await controller.signInWithGoogle()
            }
            providerButton(label: Strings.Auth.continueWithMicrosoft, pending: .microsoft) {
                MicrosoftMark()
            } action: {
                await controller.signInWithMicrosoft()
            }
        }
    }

    /// A neutral provider button (per Google/Microsoft brand guidance the mark
    /// itself is the only accent): card surface, hairline border, 44pt target.
    private func providerButton(
        label: String,
        pending kind: PendingProvider,
        @ViewBuilder icon: () -> some View,
        action: @escaping () async -> Void
    ) -> some View {
        Button {
            pending = kind
            Task {
                await action()
                pending = nil
            }
        } label: {
            HStack(spacing: TilinXSpacing.space8) {
                if pending == kind, busy {
                    ProgressView().tint(TilinXColors.ink.resolve(theme))
                } else {
                    icon()
                }
                Text(label)
                    .font(.system(size: TilinXFontSize.base, weight: TilinXFontWeight.medium))
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .foregroundStyle(TilinXColors.ink.resolve(theme))
            .background(TilinXColors.card.resolve(theme))
            .clipShape(RoundedRectangle(cornerRadius: TilinXRadius.full))
            .overlay(
                RoundedRectangle(cornerRadius: TilinXRadius.full)
                    .strokeBorder(TilinXColors.line.resolve(theme))
            )
        }
        .disabled(busy)
    }

    private var divider: some View {
        HStack(spacing: TilinXSpacing.space12) {
            Rectangle()
                .fill(TilinXColors.line.resolve(theme))
                .frame(height: 1)
            Text(Strings.Auth.orDivider)
                .font(.system(size: TilinXFontSize.xs))
                .foregroundStyle(TilinXColors.inkMuted.resolve(theme))
            Rectangle()
                .fill(TilinXColors.line.resolve(theme))
                .frame(height: 1)
        }
    }
}
