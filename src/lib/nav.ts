// Navigation config — single source of truth for both the bottom tab bar and
// the drawer. Service Module + Staff LMS Module + Stock Management Module.
import type { Ionicons } from "@expo/vector-icons";
import { moduleIonicon, moduleByKey, stockChildren, STOCK_MANAGEMENT_KEY } from "./modules";

type IoniconName = keyof typeof Ionicons.glyphMap;

export type NavItem = {
  href: string;
  label: string;
  badge?: string;
  icon: IoniconName; // solid — shown when active
  iconOutline: IoniconName; // outline — shown when inactive
  /** RBAC module key. When set, the drawer hides the row unless `can(moduleKey)` is true. */
  moduleKey?: string;
  /** Rendered indented under the row above it (a sub-module of a parent module). */
  child?: boolean;
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

// ── Drawer: Service, Stock Management & Staff LMS ──────────────────────────
const WORKSHOP: NavItem[] = [
  { href: "/mechanic", label: "My Active Jobs", icon: "construct", iconOutline: "construct-outline" },
  { href: "/supervisor", label: "Workshop Queue", icon: "layers", iconOutline: "layers-outline" },
  { href: "/counter", label: "New Service Token", icon: "add-circle", iconOutline: "add-circle-outline" },
  { href: "/assembly", label: "New Bike Assembly", icon: "cube", iconOutline: "cube-outline" },
  { href: "/history", label: "Service History & Logs", icon: "time", iconOutline: "time-outline" },
  { href: "/prices", label: "Rates & Parts Catalog", icon: "pricetags", iconOutline: "pricetags-outline" },
];

// Derived from the module catalog so the drawer, the hub screen and the permission map
// can never disagree about what "Stock Management" contains. Parent first, then its six
// children in catalog sortOrder, each gated by its own `moduleKey`.
function buildStockSection(): NavItem[] {
  const parent = moduleByKey(STOCK_MANAGEMENT_KEY)!;
  const parentIcon = moduleIonicon(parent.icon);
  const items: NavItem[] = [
    { href: parent.route!, label: parent.label, moduleKey: parent.key, ...parentIcon },
  ];
  for (const m of stockChildren()) {
    if (!m.route) continue;
    items.push({ href: m.route, label: m.label, moduleKey: m.key, child: true, ...moduleIonicon(m.icon) });
  }
  return items;
}
const STOCK: NavItem[] = buildStockSection();

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

/** Returns true when a row may be shown. Rows without a `moduleKey` are always shown. */
export type CanView = (moduleKey: string) => boolean;

export function drawerSectionsForRole(role: string, can: CanView = () => true): DrawerSection[] {
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

  // 2. Stock Management — permission-driven. A person who holds none of the stock grants
  //    never sees the section; one who holds only some sees only those rows.
  const stockItems = STOCK.filter((i) => !i.moduleKey || can(i.moduleKey));
  if (stockItems.length > 0) {
    sections.push({ title: "Stock Management", items: stockItems });
  }

  // 3. Staff LMS / Academy Section
  sections.push({ title: "Staff Academy & Skills", items: STAFF_ACADEMY });

  // 4. Account
  sections.push({ title: "Account & Settings", items: ACCOUNT });

  return sections;
}
