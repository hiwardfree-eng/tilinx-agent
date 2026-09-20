import { cn } from "@tilinx-ai/core";
import tilinxIcon from "../../assets/tilinx-icon.svg";
import tilinxIconWhite from "../../assets/tilinx-icon-white.svg";
import { useIsDarkTheme } from "../../lib/use-is-dark-theme";

/**
 * TilinX's mark in the sidebar rail: the product logo, sized to the rail's
 * shared 16px `h-4 w-4` icon slot. The white variant carries the dark theme
 * (the primary mark is tuned for light surfaces), tracking the app's explicit
 * `data-theme` rather than the OS scheme. Decorative: the row's text label is
 * its accessible name. A caller outside the rail (the phone chat header)
 * passes its own size.
 */
export function TilinXLogo({ className }: { className?: string }) {
  const dark = useIsDarkTheme();
  return (
    <img
      src={dark ? tilinxIconWhite : tilinxIcon}
      alt=""
      aria-hidden
      className={cn("h-4 w-4 shrink-0 object-contain", className)}
    />
  );
}
