// Navigation config — single source of truth for both the bottom tab bar and
// the drawer. Strictly scoped to Service Module + Staff LMS Module.
import type { Ionicons } from "@expo/vector-icons";

type IoniconName = keyof typeof Ionicons.glyphMap;

export type NavItem = {
  href: string;
  label: string;
  badge?: string;
  icon: IoniconName; // solid — shown when active
  iconOutline: IoniconName; // outline — shown when inactive
};

export type DrawerSection = { title: string; items: NavItem[] };

// ── Bottom tabs: the high-frequency workshop screens per role + Profile ─────
const TABS: Record<string, NavItem[]> = {
  MECHANIC: [
    { href: "/mechanic", label: "My Jobs", icon: "clipboard", iconOutline: "clipboard-outline" },
    { href: "/assembly", label: "Assembly", icon: "cube", iconOutline: "cube-outline" },
    { href: "/counter", label: "New", icon: "add-circle", iconOutline: "add-circle-outline" },
  ],
  SUPERVISOR: [
    { href: "/supervisor", label: "Jobs", icon: "clipboard", iconOutline: "clipboard-outline" },
    { href: "/counter", label: "New", icon: "add-circle", iconOutline: "add-circle-outline" },
    { href: "/staff", label: "Staff", icon: "people", iconOutline: "people-outline" },
  ],
  MANAGER: [
    { href: "/manager", label: "Home", icon: "grid", iconOutline: "grid-outline" },
    { href: "/supervisor", label: "Jobs", icon: "clipboard", iconOutline: "clipboard-outline" },
    { href: "/history", label: "History", icon: "time", iconOutline: "time-outline" },
  ],
};

const PROFILE_TAB: NavItem = {
  href: "/profile",
  label: "Profile",
  icon: "person",
  iconOutline: "person-outline",
};

export function tabsForRole(role: string): NavItem[] {
  return [...(TABS[role] ?? TABS.MECHANIC), PROFILE_TAB];
}

// ── Drawer: Scoped Strictly to Service & Staff LMS ─────────────────────────
const WORKSHOP: NavItem[] = [
  { href: "/mechanic", label: "My Active Jobs", icon: "construct", iconOutline: "construct-outline" },
  { href: "/supervisor", label: "Workshop Queue", icon: "layers", iconOutline: "layers-outline" },
  { href: "/counter", label: "New Service Token", icon: "add-circle", iconOutline: "add-circle-outline" },
  { href: "/assembly", label: "New Bike Assembly", icon: "cube", iconOutline: "cube-outline" },
  { href: "/history", label: "Service History & Logs", icon: "time", iconOutline: "time-outline" },
  { href: "/prices", label: "Rates & Parts Catalog", icon: "pricetags", iconOutline: "pricetags-outline" },
];

const STAFF_ACADEMY: NavItem[] = [
  { href: "/lms", label: "Academy Hub", badge: "LMS", icon: "school", iconOutline: "school-outline" },
  { href: "/lms/learn", label: "Courses & Tree", badge: "XP", icon: "book", iconOutline: "book-outline" },
  { href: "/lms/practice", label: "Roleplay Simulator", badge: "Live", icon: "chatbubbles", iconOutline: "chatbubbles-outline" },
  { href: "/lms/products", label: "Bike Specs & Pitches", icon: "bicycle", iconOutline: "bicycle-outline" },
  { href: "/lms/rank", label: "Store Leaderboard", badge: "Top", icon: "trophy", iconOutline: "trophy-outline" },
];

const ACCOUNT: NavItem[] = [
  { href: "/profile", label: "Technician Profile", icon: "person", iconOutline: "person-outline" },
];

export function drawerSectionsForRole(role: string): DrawerSection[] {
  const sections: DrawerSection[] = [];

  // 1. Workshop Section
  if (role === "MECHANIC") {
    sections.push({
      title: "Workshop Operations",
      items: WORKSHOP.filter((i) => i.href !== "/supervisor"),
    });
  } else {
    sections.push({ title: "Workshop Operations", items: WORKSHOP });
  }

  // 2. Staff LMS / Academy Section
  sections.push({ title: "Staff Academy & Skills", items: STAFF_ACADEMY });

  // 3. Account
  sections.push({ title: "Account & Settings", items: ACCOUNT });

  return sections;
}
