import { MECHANICS } from "../lib/constants";
import type { User } from "./types";

export const USERS: User[] = MECHANICS.map((m, i) => ({
  id: `u${i + 1}`,
  name: m.name,
  emoji: m.emoji,
  role: m.role,
  // Work email — derived from the roster name (mirrors the PWA's user@domain scheme)
  email: `${m.name.toLowerCase()}@bharathcyclehub.com`,
}));
