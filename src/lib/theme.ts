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

// Neutrals used for icon tints (mirrors Tailwind's gray scale).
export const NEUTRAL = {
  400: "#9ca3af", // inactive icon
  500: "#6b7280", // secondary icon
  800: "#1f2937", // primary text
} as const;

export const ACTIVE_TINT = BRAND[600];
export const INACTIVE_TINT = NEUTRAL[400];
