// Local placeholder photo registry — job.photos stores keys like "bike1".
// eslint-disable @typescript-eslint/no-require-imports
export const MOCK_PHOTOS: Record<string, number> = {
  bike1: require("../../assets/mock/bike1.png"),
  bike2: require("../../assets/mock/bike2.png"),
  bike3: require("../../assets/mock/bike3.png"),
  bike4: require("../../assets/mock/bike4.png"),
  bike5: require("../../assets/mock/bike5.png"),
};

export const LOGIN_BG = require("../../assets/mock/login-bg.png");

export function resolvePhoto(key: string): number | null {
  return MOCK_PHOTOS[key] ?? null;
}
