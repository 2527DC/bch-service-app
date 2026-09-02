// Module catalog — a client-side mirror of BCH-Management's `prisma/rbac-catalog.ts`.
//
// In the PWA this list lives in the database and arrives via /api/auth/mobile-login as
// `access.modules` + `access.permissions`. The mobile app keeps a copy for two reasons:
//   1. The offline DEMO login must grant "everything" without a network call, and
//      "everything" has to be enumerable — this is the enumeration.
//   2. The drawer needs an Ionicons name per module; the server sends lucide names.
//
// Keys, labels, routes, groups, sortOrder and parentKey match the seed catalog so a
// permission map from the real backend and one from the demo user are interchangeable.
import type { Ionicons } from "@expo/vector-icons";

type IoniconName = keyof typeof Ionicons.glyphMap;

export type ActionKey = "view" | "create" | "edit" | "delete" | "approve" | "fetch";

export type ModuleDef = {
  key: string;
  label: string;
  description: string;
  /** lucide name as the server sends it — kept so `access.modules` round-trips unchanged */
  icon: string;
  route: string | null;
  group: string;
  sortOrder: number;
  actions: ActionKey[];
  parentKey?: string;
};

const CRUD: ActionKey[] = ["view", "create", "edit", "delete"];

export const MODULE_CATALOG: ModuleDef[] = [
  // ── Overview ──────────────────────────────────────────────────────────────
  { key: "dashboard", label: "Dashboard", description: "Home screen, KPIs and operational summary", icon: "LayoutDashboard", route: "/", group: "Overview", sortOrder: 10, actions: ["view"] },
  { key: "activity", label: "Activity Log", description: "Audit trail of user actions across the app", icon: "ClipboardList", route: "/activity", group: "Overview", sortOrder: 20, actions: ["view", "create", "approve"] },

  // ── Operations · Stock Management tree ────────────────────────────────────
  { key: "stock_management", label: "Stock Management", description: "Stock, product types, audits, inbound, dispatch and transfers", icon: "Boxes", route: "/stock-management", group: "Operations", sortOrder: 100, actions: ["view"] },
  { key: "stock", label: "Stock & Inventory", description: "Products, serials, stock levels and locations", icon: "Package", route: "/stock", parentKey: "stock_management", group: "Operations", sortOrder: 101, actions: CRUD },
  { key: "product_types", label: "Product Types", description: "The product type list — the tabs on Stock and what every product is filed under", icon: "Tag", route: "/product-types", parentKey: "stock_management", group: "Operations", sortOrder: 102, actions: ["view", "create", "edit"] },
  { key: "stock_audit", label: "Stock Audit / Count", description: "Physical stock counts, reconciliation and resets", icon: "ClipboardCheck", route: "/stock-audit", parentKey: "stock_management", group: "Operations", sortOrder: 103, actions: ["view", "create", "edit", "delete", "approve"] },
  { key: "inbound", label: "Inbound Tracking", description: "Incoming shipments, receiving, putaway", icon: "ArrowDownCircle", route: "/inbound", parentKey: "stock_management", group: "Operations", sortOrder: 104, actions: ["view", "create", "edit", "delete", "approve", "fetch"] },
  { key: "deliveries", label: "Deliveries & Dispatch", description: "Outward dispatch, delivery runs, pre-bookings", icon: "Truck", route: "/deliveries", parentKey: "stock_management", group: "Operations", sortOrder: 105, actions: ["view", "create", "edit", "delete", "approve", "fetch"] },
  { key: "transfers", label: "Stock Transfers", description: "Inter-location transfer orders", icon: "ArrowRightLeft", route: "/transfers", parentKey: "stock_management", group: "Operations", sortOrder: 106, actions: ["view", "create", "edit", "delete", "approve"] },

  // ── Operations · others ───────────────────────────────────────────────────
  { key: "second_hand", label: "Second-Hand Cycles", description: "Refurbished cycle intake and sale", icon: "Bike", route: "/second-hand", group: "Operations", sortOrder: 150, actions: ["view", "create", "edit", "delete", "approve"] },
  { key: "barcode", label: "Barcode & Labels", description: "Scan and print labels", icon: "QrCode", route: "/scanner", group: "Operations", sortOrder: 160, actions: ["view", "create"] },
  { key: "pos", label: "POS & Settlement", description: "Daily settlement", icon: "CreditCard", route: "/accounts/settlement", group: "Operations", sortOrder: 170, actions: ["view", "create", "edit", "approve"] },

  // ── Purchase ──────────────────────────────────────────────────────────────
  { key: "vendors", label: "Vendors", description: "Vendor master", icon: "Building2", route: "/vendors", group: "Purchase", sortOrder: 200, actions: ["view", "create", "edit", "delete", "fetch"] },
  { key: "purchase_orders", label: "Purchase Orders", description: "Purchase orders", icon: "ShoppingCart", route: "/purchase-orders", group: "Purchase", sortOrder: 210, actions: ["view", "create", "edit", "delete", "approve"] },
  { key: "brands", label: "Brands", description: "Brand master", icon: "Tag", route: "/more/brands", group: "Purchase", sortOrder: 220, actions: CRUD },
  { key: "categories", label: "Categories", description: "Category master", icon: "Tag", route: "/more/categories", group: "Purchase", sortOrder: 225, actions: CRUD },
  { key: "vendor_issues", label: "Vendor / Ops Issues", description: "Issue tracker", icon: "AlertCircle", route: "/vendor-issues", group: "Purchase", sortOrder: 230, actions: ["view", "create", "edit", "delete", "approve"] },
  { key: "reorder", label: "Reorder & AI Insights", description: "Reorder suggestions", icon: "RefreshCw", route: "/reorder", group: "Purchase", sortOrder: 240, actions: ["view", "edit"] },

  // ── Accounts ──────────────────────────────────────────────────────────────
  { key: "accounts", label: "Accounts", description: "Accounts hub", icon: "Calculator", route: "/accounts", group: "Accounts", sortOrder: 290, actions: ["view"] },
  { key: "bills", label: "Bills & Payments", description: "Vendor bills", icon: "FileText", route: null, group: "Accounts", sortOrder: 300, actions: ["view", "create", "edit", "delete", "approve", "fetch"] },
  { key: "expenses", label: "Expenses", description: "Expenses", icon: "Receipt", route: null, group: "Accounts", sortOrder: 310, actions: ["view", "create", "edit", "delete", "approve"] },
  { key: "customers", label: "Customers & Receivables", description: "Receivables", icon: "HandCoins", route: "/receivables", group: "Accounts", sortOrder: 320, actions: ["view", "create", "edit", "delete", "fetch"] },
  { key: "customer_list", label: "Customers", description: "Customer list", icon: "Users", route: "/customers", parentKey: "customers", group: "Accounts", sortOrder: 321, actions: ["view"] },
  { key: "cost_price", label: "Cost Price Visibility", description: "See purchase cost on products", icon: "IndianRupee", route: null, group: "Accounts", sortOrder: 330, actions: ["view"] },
  { key: "brand_ledger", label: "Brand Ledgers", description: "Brand ledgers", icon: "FileText", route: "/ledger", group: "Accounts", sortOrder: 340, actions: ["view", "create", "edit", "delete", "fetch"] },
  { key: "brand_ledger_gaps", label: "Ledger Claims", description: "Ledger claims", icon: "AlertCircle", route: null, group: "Accounts", sortOrder: 350, actions: ["view", "create", "edit", "delete", "approve"] },

  // ── Insights ──────────────────────────────────────────────────────────────
  { key: "reports", label: "Reports", description: "Reports", icon: "BarChart3", route: "/reports", group: "Insights", sortOrder: 400, actions: ["view"] },
  { key: "analytics", label: "Store Analytics", description: "Footfall analytics", icon: "Activity", route: "/analytics", group: "Insights", sortOrder: 410, actions: ["view", "edit"] },

  // ── Admin ─────────────────────────────────────────────────────────────────
  { key: "team", label: "Team Management", description: "Users", icon: "Users", route: "/team", group: "Admin", sortOrder: 500, actions: CRUD },
  { key: "roles", label: "Roles & Permissions", description: "Roles", icon: "ShieldCheck", route: "/team/permissions", group: "Admin", sortOrder: 510, actions: CRUD },
  { key: "settings", label: "Settings", description: "Settings", icon: "Settings", route: "/settings", group: "Admin", sortOrder: 520, actions: CRUD },
  { key: "settings_storage", label: "Storage", description: "Storage", icon: "HardDrive", route: "/settings/storage", parentKey: "settings", group: "Admin", sortOrder: 521, actions: ["view", "edit", "approve"] },
  { key: "zoho", label: "Integrations", description: "Integrations", icon: "Cloud", route: "/settings/integrations", parentKey: "settings", group: "Admin", sortOrder: 522, actions: ["view", "edit", "approve", "fetch"] },
  { key: "whatsapp_templates", label: "WhatsApp Templates", description: "Templates", icon: "MessageSquare", route: "/more/whatsapp-templates", group: "Admin", sortOrder: 530, actions: ["view", "edit"] },
  { key: "store_management", label: "Store Management", description: "Stores and warehouses", icon: "Building2", route: null, group: "Admin", sortOrder: 540, actions: ["view"] },
  { key: "stores", label: "Stores", description: "Stores", icon: "Building2", route: "/stores", parentKey: "store_management", group: "Admin", sortOrder: 541, actions: CRUD },
  { key: "warehouses", label: "Warehouses", description: "Warehouses", icon: "Warehouse", route: "/stores/warehouses", parentKey: "store_management", group: "Admin", sortOrder: 542, actions: CRUD },

  // ── Service ───────────────────────────────────────────────────────────────
  { key: "service_jobs", label: "Service Jobs", description: "Workshop jobs", icon: "Wrench", route: "/services/counter", group: "Service", sortOrder: 600, actions: ["view", "create", "edit", "delete", "approve"] },
  { key: "service_assembly", label: "Assembly Log", description: "Assembly log", icon: "ClipboardCheck", route: "/services/assembly", group: "Service", sortOrder: 610, actions: CRUD },
  { key: "service_billing", label: "Service Billing", description: "Billing", icon: "CreditCard", route: "/services/billing", group: "Service", sortOrder: 620, actions: ["view", "create", "edit", "approve"] },
  { key: "service_prices", label: "Service Pricing", description: "Price list", icon: "IndianRupee", route: "/services/prices", group: "Service", sortOrder: 630, actions: CRUD },
  { key: "service_reviews", label: "Customer Reviews", description: "Reviews", icon: "MessageSquare", route: null, group: "Service", sortOrder: 640, actions: ["view", "delete"] },
  { key: "service_incentives", label: "Mechanic Incentives", description: "Incentives", icon: "BarChart3", route: null, group: "Service", sortOrder: 650, actions: ["view", "edit"] },
  { key: "service_reports", label: "Service Reports", description: "Reports", icon: "BarChart3", route: "/services/manager", group: "Service", sortOrder: 660, actions: ["view"] },

  // ── Staff LMS ─────────────────────────────────────────────────────────────
  { key: "staff_lms", label: "Staff LMS", description: "Staff academy", icon: "GraduationCap", route: "/staff-lms", group: "Staff LMS", sortOrder: 700, actions: ["view", "create", "edit", "delete", "approve"] },
  { key: "staff_lms_learning", label: "Learning", description: "Courses", icon: "BookOpen", route: "/staff-lms/learning", parentKey: "staff_lms", group: "Staff LMS", sortOrder: 710, actions: ["view", "create", "edit", "delete", "approve"] },
  { key: "staff_lms_products", label: "Product Learning", description: "Product cards", icon: "Bike", route: "/staff-lms/product-learning", parentKey: "staff_lms", group: "Staff LMS", sortOrder: 720, actions: ["view", "create", "edit", "delete", "approve"] },
  { key: "staff_lms_practice", label: "Practice & Scenarios", description: "Roleplay", icon: "Swords", route: "/staff-lms/practice", parentKey: "staff_lms", group: "Staff LMS", sortOrder: 725, actions: ["view", "create", "edit", "delete", "approve"] },
  { key: "staff_lms_rank", label: "Leaderboard", description: "Rank", icon: "Trophy", route: "/staff-lms/rank", parentKey: "staff_lms", group: "Staff LMS", sortOrder: 730, actions: ["view"] },
];

export const STOCK_MANAGEMENT_KEY = "stock_management";

/** The six children of `stock_management`, in sidebar order. */
export function stockChildren(): ModuleDef[] {
  return MODULE_CATALOG.filter((m) => m.parentKey === STOCK_MANAGEMENT_KEY).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

export function moduleByKey(key: string): ModuleDef | undefined {
  return MODULE_CATALOG.find((m) => m.key === key);
}

/** Every permission in the catalog, granted. This is what the DEMO user carries. */
export function grantAllPermissions(): Record<string, Record<string, boolean>> {
  const out: Record<string, Record<string, boolean>> = {};
  for (const m of MODULE_CATALOG) {
    out[m.key] = {};
    for (const a of m.actions) out[m.key][a] = true;
  }
  return out;
}

/** The module list in the same shape `/api/auth/mobile-login` returns. */
export function allModulesForAccess() {
  return MODULE_CATALOG.map((m) => ({
    key: m.key,
    label: m.label,
    icon: m.icon,
    route: m.route,
    group: m.group,
    sortOrder: m.sortOrder,
  }));
}

// lucide (server) → Ionicons (drawer chrome, AGENTS.md §5). Outline/filled pairs.
const ICONS: Record<string, { icon: IoniconName; iconOutline: IoniconName }> = {
  Boxes: { icon: "albums", iconOutline: "albums-outline" },
  Package: { icon: "cube", iconOutline: "cube-outline" },
  Tag: { icon: "pricetag", iconOutline: "pricetag-outline" },
  ClipboardCheck: { icon: "checkbox", iconOutline: "checkbox-outline" },
  ArrowDownCircle: { icon: "arrow-down-circle", iconOutline: "arrow-down-circle-outline" },
  Truck: { icon: "car", iconOutline: "car-outline" },
  ArrowRightLeft: { icon: "swap-horizontal", iconOutline: "swap-horizontal-outline" },
};

const FALLBACK_ICON: { icon: IoniconName; iconOutline: IoniconName } = {
  icon: "ellipse",
  iconOutline: "ellipse-outline",
};

export function moduleIonicon(lucideName: string | null | undefined) {
  return (lucideName && ICONS[lucideName]) || FALLBACK_ICON;
}
