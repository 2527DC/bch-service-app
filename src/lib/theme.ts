// Single source of truth for colors consumed outside NativeWind classes —
// icon `color` props, Reanimated styles, native component tints.
// Keep in sync with theme.extend.colors.brand in tailwind.config.js.
export const BRAND = {
  50: "#eff6ff",
  100: "#dbeafe",
  200: "#bfdbfe",
  500: "#3b82f6",
  600: "#2563eb",
  700: "#1d4ed8",
} as const;

// Precision Logic design system (doc/stitch/). Keep in sync with theme.extend.colors
// in tailwind.config.js.
/** Page ground. Cards stay white on top of it. */
export const SURFACE = "#f8f9ff";
/** Selected / inverted fill — active chip, primary button. Tailwind slate-800. */
export const INK = "#1e293b";
/** Foreground on a brand or ink fill — for icon `color` props, which take no className. */
export const ON_BRAND = "#ffffff";

// Neutrals used for icon tints (mirrors Tailwind's gray scale).
export const NEUTRAL = {
  400: "#9ca3af", // inactive icon
  500: "#6b7280", // secondary icon
  800: "#1f2937", // primary text
} as const;

export const ACTIVE_TINT = BRAND[600];
export const INACTIVE_TINT = NEUTRAL[400];
