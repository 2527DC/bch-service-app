// Navigation config — single source of truth for both the bottom tab bar and
// the drawer. Icons are Ionicons name pairs (outline = inactive, solid = active)
// per AGENTS.md §5.
import type { Ionicons } from "@expo/vector-icons";

type IoniconName = keyof typeof Ionicons.glyphMap;

export type NavItem = {
  href: string;
  label: string;
  icon: IoniconName; // solid — shown when active
  iconOutline: IoniconName; // outline — shown when inactive
};

export type DrawerSection = { title: string; items: NavItem[] };

// ── Bottom tabs: the 3-4 high-frequency screens per role + Profile ──────────
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

// ── Drawer: every module, grouped. Roles gate what is visible. ─────────────
const WORKSHOP: NavItem[] = [
  { href: "/mechanic", label: "My Jobs", icon: "clipboard", iconOutline: "clipboard-outline" },
  { href: "/supervisor", label: "All Jobs", icon: "layers", iconOutline: "layers-outline" },
  { href: "/counter", label: "New Job", icon: "add-circle", iconOutline: "add-circle-outline" },
  { href: "/assembly", label: "Assembly", icon: "cube", iconOutline: "cube-outline" },
];

const MODULES: NavItem[] = [
  { href: "/staff", label: "Staff", icon: "people", iconOutline: "people-outline" },
  { href: "/lms", label: "Training (LMS)", icon: "school", iconOutline: "school-outline" },
];

const BUSINESS: NavItem[] = [
  { href: "/manager", label: "Dashboard", icon: "grid", iconOutline: "grid-outline" },
  { href: "/history", label: "History", icon: "time", iconOutline: "time-outline" },
  { href: "/prices", label: "Price List", icon: "pricetags", iconOutline: "pricetags-outline" },
];

const ACCOUNT: NavItem[] = [
  { href: "/profile", label: "Profile", icon: "person", iconOutline: "person-outline" },
];

// Which drawer sections each role sees.
export function drawerSectionsForRole(role: string): DrawerSection[] {
  const sections: DrawerSection[] = [{ title: "Workshop", items: WORKSHOP }];

  if (role === "MECHANIC") {
    // Mechanics see their own jobs, not the full queue.
    sections[0] = { title: "Workshop", items: WORKSHOP.filter((i) => i.href !== "/supervisor") };
  }

  sections.push({ title: "Modules", items: MODULES });

  if (role === "MANAGER" || role === "SUPERVISOR") {
    sections.push({
      title: "Business",
      items: role === "MANAGER" ? BUSINESS : BUSINESS.filter((i) => i.href !== "/manager"),
    });
  }

  sections.push({ title: "Account", items: ACCOUNT });
  return sections;
}
