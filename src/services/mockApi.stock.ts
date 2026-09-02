// Stock Management slice of the mock API. Re-exported through ./mockApi so screens keep a
// single import (`import * as mockApi`). Mirrors the PWA's REST surface:
//
//   queryProducts()                    ← /api/products        (paged: cursor + limit)
//   searchProducts()/getStockSummary() ← /api/products/search, /api/stock/summary
//   getProduct()                       ← /api/products/[id]
//   adjustStock()/setProductStatus()   ← /api/stock/adjust, PATCH /api/products/[id]
//   getProductTypes()/saveProductType()← /api/product-types
//   getStockCounts()/recordCountItem()/submitStockCount()/reviewStockCount()
//                                      ← /api/stock-counts/*
//   getInboundShipments()/receiveInboundLine()  ← /api/inbound/*
//   getDeliveries()/updateDeliveryStatus()      ← /api/deliveries/*
//   getTransferOrders()/createTransferOrder()/reviewTransfer() ← /api/transfer-orders/*
//
// Every call sleeps 250–500ms so spinners and skeletons are exercised.
import {
  INITIAL_DELIVERIES,
  INITIAL_INBOUND,
  INITIAL_PRODUCTS,
  INITIAL_PRODUCT_TYPES,
  INITIAL_STOCK_COUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_TRANSFERS,
  WAREHOUSES,
} from "../mock/stock";
import { generateProducts } from "../mock/stock-catalog";
import { generateVolume } from "../mock/stock-volume";
import { getStartOfTodayIST, getTodayIST, isToday } from "../lib/timezone";
import { byDateDesc, createPagedResource, type PageQuery, type PageResult } from "./paged";
import type {
  Delivery,
  DeliveryStatus,
  InboundShipment,
  InventoryTransaction,
  Product,
  ProductStatus,
  ProductType,
  StockCount,
  StockCountItem,
  TransactionType,
  TransferOrder,
  Warehouse,
} from "../mock/types";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ── In-memory DB (mutable across the session) ────────────────────────────
//
// Products are NOT cloned on read. The catalogue is ~10k rows; a JSON round-trip of the
// whole array per request costs ~80ms and turns every scroll into a stutter, which would
// be an artefact of the mock rather than of the design. Reads clone the PAGE only.
let products: Product[] = [...INITIAL_PRODUCTS, ...generateProducts()];
/** id -> product. Keeps requireProduct O(1); a linear scan over 10k ran on every mutation. */
const productIndex = new Map<string, Product>(products.map((p) => [p.id, p]));

// The hand-written fixtures stay at the front of every collection — they are what demos
// and screenshots show — with the generated volume behind them.
const volume = generateVolume(products);

let productTypes: ProductType[] = clone(INITIAL_PRODUCT_TYPES);
let transactions: InventoryTransaction[] = clone(INITIAL_TRANSACTIONS);
let stockCounts: StockCount[] = [...clone(INITIAL_STOCK_COUNTS), ...volume.stockCounts];
let inbound: InboundShipment[] = [...clone(INITIAL_INBOUND), ...volume.inbound];
let deliveries: Delivery[] = [...clone(INITIAL_DELIVERIES), ...volume.deliveries];
let transfers: TransferOrder[] = [...clone(INITIAL_TRANSFERS), ...volume.transfers];

// id indexes — `find` over thousands of rows on every mutation is the same mistake the
// catalogue made.
const countIndex = new Map<string, StockCount>();
const inboundIndex = new Map<string, InboundShipment>();
const deliveryIndex = new Map<string, Delivery>();
const transferIndex = new Map<string, TransferOrder>();
const reindex = () => {
  countIndex.clear(); for (const c of stockCounts) countIndex.set(c.id, c);
  inboundIndex.clear(); for (const s of inbound) inboundIndex.set(s.id, s);
  deliveryIndex.clear(); for (const d of deliveries) deliveryIndex.set(d.id, d);
  transferIndex.clear(); for (const t of transfers) transferIndex.set(t.id, t);
};
reindex();
let seq = 100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function simulate() {
  await sleep(250 + Math.random() * 250);
}

// An instant, not a business date — UTC is correct here and stays.
const nowIso = () => new Date().toISOString();
const nextId = (prefix: string) => `${prefix}-live-${++seq}`;
// Document-number prefix (IB-202609-0001). This IS a business date: built from the device
// clock it stamped the wrong month for anyone west of IST for the first 5.5h of the 1st.
const yyyymm = () => getTodayIST().slice(0, 7).replace("-", "");

function requireProduct(id: string): Product {
  const p = productIndex.get(id);
  if (!p) throw new Error("Product not found");
  return p;
}

/** Product.currentStock is the cached SUM of its StockLevel rows — recompute after any change. */
function recomputeStock(p: Product) {
  p.currentStock = p.stockLevels.reduce((s, l) => s + l.quantity, 0);
  p.reservedStock = p.stockLevels.reduce((s, l) => s + l.reservedQuantity, 0);
  p.updatedAt = nowIso();
  // Stock moved, so the memoised match set is stale: this row may belong to a different
  // health chip now, or sit elsewhere under a stock sort. Every write path that touches
  // quantity funnels through here — receiving, adjusting, transfers, count approval.
  invalidateProductCache();
}

function moveStock(p: Product, warehouseId: string, delta: number) {
  const lvl = p.stockLevels.find((l) => l.warehouseId === warehouseId);
  if (!lvl) throw new Error("Unknown warehouse");
  if (lvl.quantity + delta < 0) throw new Error(`Only ${lvl.quantity} in ${lvl.warehouseName}`);
  lvl.quantity += delta;
}

function pushTx(p: Product, type: TransactionType, quantity: number, previousStock: number, referenceNo: string | null, notes: string | null, userName: string) {
  transactions = [
    { id: nextId("tx"), type, productId: p.id, quantity, previousStock, newStock: p.currentStock, referenceNo, notes, userName, createdAt: nowIso() },
    ...transactions,
  ].slice(0, 200);
}

function withTypeCounts(list: ProductType[]): ProductType[] {
  const tally = new Map<string, number>();
  for (const p of products) tally.set(p.productTypeId, (tally.get(p.productTypeId) ?? 0) + 1);
  return list.map((t) => ({ ...t, productCount: tally.get(t.id) ?? 0 }));
}

// ── Masters ───────────────────────────────────────────────────────────────
export async function getWarehouses(): Promise<Warehouse[]> {
  await simulate();
  return WAREHOUSES;
}

// ── Products / Stock ──────────────────────────────────────────────────────
//
// The catalogue is served a PAGE AT A TIME, the way /api/products serves it — the screen
// never holds the whole thing. See `usePagedList` for the consuming side.

export type ProductHealth = "ALL" | "IN_STOCK" | "LOW_STOCK" | "NO_STOCK" | "INACTIVE";
export type ProductSort = "NAME" | "STOCK_LOW_FIRST" | "STOCK_HIGH_FIRST" | "RECENT";

export type ProductQuery = {
  cursor?: string | null;
  limit?: number;
  q?: string;
  typeId?: string | null; // null / "ALL" = every type
  health?: ProductHealth;
  sort?: ProductSort;
};

export type ProductPage = {
  items: Product[];
  nextCursor: string | null;
  /** Rows matching the query, not rows returned — this is what the header counts. */
  total: number;
  /** Per-chip totals for the CURRENT search + type, so the chips stay honest while filtering. */
  healthCounts: Record<Exclude<ProductHealth, "ALL">, number> & { ALL: number };
};

export const PRODUCT_PAGE_SIZE = 24;

function healthOf(p: Product): Exclude<ProductHealth, "ALL"> {
  if (p.status !== "ACTIVE") return "INACTIVE";
  if (p.currentStock <= 0) return "NO_STOCK";
  if (p.reorderLevel > 0 && p.currentStock <= p.reorderLevel) return "LOW_STOCK";
  return "IN_STOCK";
}

// Declared, not hand-written: search, chips-with-counts, sort, memoisation and cursor
// paging all come from the shared engine. See src/services/paged.ts.
const productResource = createPagedResource<Product, Exclude<ProductHealth, "ALL">, ProductSort>({
  rows: () => products,
  idOf: (p) => p.id,
  searchText: (p) => `${p.name} ${p.sku} ${p.brand?.name ?? ""} ${p.category?.name ?? ""} ${p.size ?? ""} ${p.color ?? ""}`,
  filters: {
    IN_STOCK: (p) => healthOf(p) === "IN_STOCK",
    LOW_STOCK: (p) => healthOf(p) === "LOW_STOCK",
    NO_STOCK: (p) => healthOf(p) === "NO_STOCK",
    INACTIVE: (p) => healthOf(p) === "INACTIVE",
  },
  sorts: {
    NAME: (a, b) => a.name.localeCompare(b.name),
    STOCK_LOW_FIRST: (a, b) => a.currentStock - b.currentStock || a.name.localeCompare(b.name),
    STOCK_HIGH_FIRST: (a, b) => b.currentStock - a.currentStock || a.name.localeCompare(b.name),
    RECENT: byDateDesc((p) => p.updatedAt),
  },
  defaultSort: "NAME",
  scope: (p, typeId) => p.productTypeId === typeId,
  pageSize: PRODUCT_PAGE_SIZE,
});

/** Any write invalidates the memo — otherwise an adjusted product keeps its old position. */
function invalidateProductCache() {
  productResource.invalidate();
}

/**
 * One page of the catalogue. `cursor` is an opaque offset; a real endpoint would hand back
 * a keyset cursor, and the screen would not know the difference because it only ever echoes
 * `nextCursor` back.
 */
export async function queryProducts(query: ProductQuery = {}): Promise<ProductPage> {
  await simulate();
  const page = productResource.query({
    cursor: query.cursor,
    limit: query.limit,
    q: query.q,
    filter: query.health ?? "ALL",
    sort: query.sort,
    scopeId: query.typeId && query.typeId !== "ALL" ? query.typeId : null,
  });
  return {
    items: clone(page.items),
    nextCursor: page.nextCursor,
    total: page.total,
    healthCounts: page.facets,
  };
}

/**
 * Type-ahead for pickers (transfer builder). Never paged — it is capped instead, and it
 * reuses the catalogue resource so it shares the same search index and memo.
 */
export async function searchProducts(q: string, limit = 8): Promise<Product[]> {
  await simulate();
  if (!q.trim()) return [];
  const page = productResource.query({ q, limit, filter: "ALL", sort: "NAME" });
  return clone(page.items.filter((p) => p.status === "ACTIVE"));
}

export type StockSummary = {
  activeCount: number;
  lowCount: number;
  outCount: number;
  totalCount: number;
  pendingTransfers: number;
  inboundInTransit: number;
  inboundOverdue: number;
  deliveriesToday: number;
  deliveriesFlagged: number;
  openCounts: number;
  countsToApprove: number;

  // ── KPI tiles on the listing screens (plan §13.8 G3) ────────────────────
  //
  // The Inwards tiles show UNITS as the headline with the bill count as the caption —
  // "50 / In Transit / 1 bills" — so the two are counted separately. `inboundInTransit`
  // above is the bill count; these are the units.
  //
  // They live here, not in a page's facets: facets are scoped to the current search, so
  // tiles fed from them would tick down as someone types, which reads as a bug.
  /** Units on every shipment not yet delivered. */
  inboundInTransitUnits: number;
  /** Shipments expected from today through the next 7 days, overdue excluded. */
  inboundThisWeekBills: number;
  inboundThisWeekUnits: number;
  /** Units on undelivered lines already spoken for by a customer. */
  inboundPrebookedUnits: number;
  /** Units received since the start of the current IST month. */
  inboundDeliveredThisMonthUnits: number;
  deliveriesPending: number;
  deliveriesScheduled: number;
};

/**
 * Every counter the hub shows, in one call.
 *
 * This is the whole reason the hub is fast: it is a scan of the collections that produces
 * eleven integers, instead of six screens' worth of rows being pulled into a store so the
 * hub can call `.filter().length` on them.
 */
export async function getStockSummary(): Promise<StockSummary> {
  await simulate();
  let activeCount = 0, lowCount = 0, outCount = 0;
  for (const p of products) {
    const h = healthOf(p);
    if (h === "INACTIVE") continue;
    activeCount++;
    if (h === "LOW_STOCK") lowCount++;
    else if (h === "NO_STOCK") outCount++;
  }

  let pendingTransfers = 0;
  for (const t of transfers) if (t.status === "PENDING") pendingTransfers++;

  let inboundInTransit = 0, inboundOverdueCount = 0;
  let inboundInTransitUnits = 0, inboundThisWeekBills = 0, inboundThisWeekUnits = 0;
  let inboundPrebookedUnits = 0, inboundDeliveredThisMonthUnits = 0;
  // Overdue = expected before the start of the IST business day. This used to be a rolling
  // "now minus 24h", which disagreed with the Inbound screen's own isOverdue() at the day
  // boundary — the hub's badge and the list it opened could show different counts.
  const startOfToday = getStartOfTodayIST().getTime();
  const endOfWeek = startOfToday + 7 * 86_400_000;
  // IST month start, built from the IST calendar date rather than the device's.
  const startOfMonth = new Date(`${getTodayIST().slice(0, 7)}-01T00:00:00+05:30`).getTime();

  for (const s of inbound) {
    if (s.status === "DELIVERED") {
      if (s.deliveredAt && new Date(s.deliveredAt).getTime() >= startOfMonth) {
        inboundDeliveredThisMonthUnits += s.totalItems;
      }
      continue;
    }
    inboundInTransit++;
    inboundInTransitUnits += s.totalItems;

    const expected = new Date(s.expectedDeliveryDate).getTime();
    // Overdue and "this week" are exclusive: a shipment that is already late belongs to
    // the overdue count, not to the upcoming week.
    if (expected < startOfToday) inboundOverdueCount++;
    else if (expected < endOfWeek) {
      inboundThisWeekBills++;
      inboundThisWeekUnits += s.totalItems;
    }

    for (const l of s.lineItems) if (l.preBookedCustomerName) inboundPrebookedUnits += l.quantity;
  }

  let deliveriesToday = 0, deliveriesFlagged = 0, deliveriesPending = 0, deliveriesScheduled = 0;
  for (const d of deliveries) {
    if (isTodayRun(d)) deliveriesToday++;
    if (d.status === "FLAGGED") deliveriesFlagged++;
    if (d.status === "PENDING") deliveriesPending++;
    if (d.status === "SCHEDULED") deliveriesScheduled++;
  }

  let openCounts = 0, countsToApprove = 0;
  for (const c of stockCounts) {
    if (c.status === "PENDING" || c.status === "IN_PROGRESS") openCounts++;
    else if (c.status === "COMPLETED") countsToApprove++;
  }

  return {
    activeCount, lowCount, outCount, totalCount: products.length,
    pendingTransfers, inboundInTransit, inboundOverdue: inboundOverdueCount,
    deliveriesToday, deliveriesFlagged, openCounts, countsToApprove,
    inboundInTransitUnits, inboundThisWeekBills, inboundThisWeekUnits,
    inboundPrebookedUnits, inboundDeliveredThisMonthUnits,
    deliveriesPending, deliveriesScheduled,
  };
}

/** Every ops collection's memo. Cheap, and cheaper than reasoning about which one moved. */
function invalidateOps() {
  countResource.invalidate();
  inboundResource.invalidate();
  deliveryResource.invalidate();
  transferResource.invalidate();
  // Counting a line moves it between the Uncounted and Counted chips, so the open sheet's
  // memo has to go too.
  openSheet?.resource.invalidate();
}

export async function getProduct(id: string): Promise<{ product: Product; transactions: InventoryTransaction[] }> {
  await simulate();
  const product = requireProduct(id);
  return { product: clone(product), transactions: clone(transactions.filter((t) => t.productId === id)) };
}

export async function adjustStock(params: {
  productId: string;
  warehouseId: string;
  delta: number;
  reason: string;
  userName: string;
}): Promise<Product> {
  await simulate();
  const p = requireProduct(params.productId);
  if (!params.delta) throw new Error("Enter a quantity");
  const previous = p.currentStock;
  moveStock(p, params.warehouseId, params.delta);
  recomputeStock(p);
  pushTx(p, "ADJUSTMENT", params.delta, previous, null, params.reason || null, params.userName);
  return clone(p);
}

export async function setProductStatus(productId: string, status: ProductStatus): Promise<Product> {
  await simulate();
  const p = requireProduct(productId);
  p.status = status;
  p.updatedAt = nowIso();
  invalidateProductCache();
  return clone(p);
}

// ── Product types ─────────────────────────────────────────────────────────
export async function getProductTypes(): Promise<ProductType[]> {
  await simulate();
  return clone(withTypeCounts(productTypes)).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveProductType(params: { id?: string; name: string; isActive?: boolean }): Promise<ProductType> {
  await simulate();
  const name = params.name.trim();
  if (!name) throw new Error("Name is required");
  const dup = productTypes.find((t) => t.name.toLowerCase() === name.toLowerCase() && t.id !== params.id);
  if (dup) throw new Error(`"${dup.name}" already exists`);

  if (params.id) {
    const t = productTypes.find((x) => x.id === params.id);
    if (!t) throw new Error("Product type not found");
    t.name = name;
    if (params.isActive !== undefined) t.isActive = params.isActive;
    // Denormalised copy on each product — the PWA joins; the mock keeps them in step.
    for (const p of products) if (p.productTypeId === t.id) p.productType = { id: t.id, name: t.name };
    invalidateProductCache();
    return clone(withTypeCounts([t])[0]);
  }

  const t: ProductType = {
    id: nextId("pt"),
    name,
    sortOrder: Math.max(0, ...productTypes.map((x) => x.sortOrder)) + 10,
    isActive: params.isActive ?? true,
    productCount: 0,
  };
  productTypes = [...productTypes, t];
  return clone(t);
}

// ── Stock counts ──────────────────────────────────────────────────────────
export type CountFilter = "OPEN" | "TO_APPROVE" | "DONE" | "OVERDUE";
export type CountSort = "RECENT" | "DUE" | "PROGRESS";

const isCountOpen = (c: StockCount) => c.status === "PENDING" || c.status === "IN_PROGRESS";
const countProgress = (c: StockCount) => {
  const done = c.items.reduce((n, i) => n + (i.countedQty !== null ? 1 : 0), 0);
  return c.items.length ? done / c.items.length : 0;
};

const countResource = createPagedResource<StockCount, CountFilter, CountSort>({
  rows: () => stockCounts,
  idOf: (c) => c.id,
  searchText: (c) => `${c.title} ${c.countNo ?? ""} ${c.assignedTo.name} ${c.productType ?? ""} ${c.location ?? ""}`,
  filters: {
    OPEN: isCountOpen,
    TO_APPROVE: (c) => c.status === "COMPLETED",
    DONE: (c) => c.status === "APPROVED" || c.status === "REJECTED",
    OVERDUE: (c) => isCountOpen(c) && new Date(c.dueDate).getTime() < Date.now() - 86_400_000,
  },
  sorts: {
    // Overdue work first, then newest — the order someone actually wants to work in.
    RECENT: (a, b) => {
      const ao = isCountOpen(a) && new Date(a.dueDate).getTime() < Date.now() ? 0 : 1;
      const bo = isCountOpen(b) && new Date(b.dueDate).getTime() < Date.now() ? 0 : 1;
      return ao - bo || b.createdAt.localeCompare(a.createdAt);
    },
    DUE: (a, b) => a.dueDate.localeCompare(b.dueDate),
    PROGRESS: (a, b) => countProgress(b) - countProgress(a),
  },
  defaultSort: "RECENT",
});

/** The list never carries `items` — a full-store count has thousands and the list shows none. */
export type StockCountSummaryRow = Omit<StockCount, "items"> & { totalItems: number; countedItems: number };

function summariseCount(c: StockCount): StockCountSummaryRow {
  const { items, ...rest } = c;
  return { ...rest, totalItems: items.length, countedItems: items.reduce((n, i) => n + (i.countedQty !== null ? 1 : 0), 0) };
}

export async function queryStockCounts(
  query: PageQuery<CountFilter, CountSort> = {}
): Promise<PageResult<StockCountSummaryRow, CountFilter>> {
  await simulate();
  const page = countResource.query(query);
  return { ...page, items: page.items.map((c) => clone(summariseCount(c))) };
}

function requireCount(id: string): StockCount {
  const c = countIndex.get(id);
  if (!c) throw new Error("Stock count not found");
  return c;
}

/** Header only. The sheet's lines are paged separately by `queryCountItems`. */
export async function getStockCount(id: string): Promise<StockCountSummaryRow> {
  await simulate();
  return clone(summariseCount(requireCount(id)));
}

export type CountItemFilter = "UNCOUNTED" | "COUNTED" | "VARIANCE";

/**
 * Lines of one count sheet, paged. A full-store count is 1,200–2,400 lines; rendering
 * them all was the single worst scaling bug in this module.
 */
// Exactly ONE sheet is cached — the one being worked. Building a resource per call would
// rebuild the search index of a 2,400-line sheet on every page; caching every sheet a
// person opened would hold them all for the session. One is the right number: a counter
// works a sheet top to bottom, and opening another drops the previous one.
let openSheet: { id: string; resource: ReturnType<typeof createPagedResource<StockCountItem, CountItemFilter, "ORDER">> } | null = null;

function sheetResource(c: StockCount) {
  if (openSheet?.id === c.id) return openSheet.resource;
  const resource = createPagedResource<StockCountItem, CountItemFilter, "ORDER">({
    rows: () => c.items,
    idOf: (i) => i.id,
    searchText: (i) => `${i.product.name} ${i.product.sku}`,
    filters: {
      UNCOUNTED: (i) => i.countedQty === null,
      COUNTED: (i) => i.countedQty !== null,
      VARIANCE: (i) => !!i.variance,
    },
    // Sheet order is the order it was generated in — a counter walks the shelf in that order.
    sorts: { ORDER: () => 0 },
    defaultSort: "ORDER",
    pageSize: 30,
  });
  openSheet = { id: c.id, resource };
  return resource;
}

export async function queryCountItems(
  countId: string,
  query: PageQuery<CountItemFilter, "ORDER"> = {}
): Promise<PageResult<StockCountItem, CountItemFilter>> {
  await simulate();
  const c = requireCount(countId);
  const page = sheetResource(c).query(query);
  return { ...page, items: clone(page.items) };
}

export async function recordCountItem(params: { countId: string; itemId: string; countedQty: number | null; notes?: string | null }): Promise<StockCount> {
  await simulate();
  const c = requireCount(params.countId);
  if (!["PENDING", "IN_PROGRESS"].includes(c.status)) throw new Error("This count is closed");
  const item = c.items.find((i) => i.id === params.itemId);
  if (!item) throw new Error("Line not found");
  item.countedQty = params.countedQty;
  item.variance = params.countedQty === null ? null : params.countedQty - item.systemQty;
  item.countedAt = params.countedQty === null ? null : nowIso();
  if (params.notes !== undefined) item.notes = params.notes;
  if (c.status === "PENDING") c.status = "IN_PROGRESS";
  invalidateOps();
  return clone(c);
}

export async function submitStockCount(countId: string): Promise<StockCount> {
  await simulate();
  const c = requireCount(countId);
  const pending = c.items.filter((i) => i.countedQty === null).length;
  if (pending > 0) throw new Error(`${pending} line${pending === 1 ? "" : "s"} still uncounted`);
  c.status = "COMPLETED";
  c.completedAt = nowIso();
  invalidateOps();
  return clone(c);
}

/** Approve applies every non-zero variance as an ADJUSTMENT against BCH Warehouse. */
export async function reviewStockCount(params: { countId: string; approve: boolean; reason?: string; userName: string }): Promise<StockCount> {
  await simulate();
  const c = requireCount(params.countId);
  if (c.status !== "COMPLETED") throw new Error("Only a completed count can be reviewed");
  if (params.approve) {
    const whId = WAREHOUSES.find((w) => w.code === c.location)?.id ?? "wh-1";
    for (const item of c.items) {
      if (!item.variance) continue;
      const p = productIndex.get(item.productId);
      if (!p) continue;
      const previous = p.currentStock;
      const lvl = p.stockLevels.find((l) => l.warehouseId === whId) ?? p.stockLevels[0];
      lvl.quantity = Math.max(0, lvl.quantity + item.variance);
      recomputeStock(p);
      pushTx(p, "ADJUSTMENT", item.variance, previous, c.countNo, item.notes ?? "Count variance", params.userName);
    }
    c.status = "APPROVED";
    c.approvedAt = nowIso();
    c.approvedBy = { name: params.userName };
  } else {
    if (!params.reason?.trim()) throw new Error("A rejection reason is required");
    c.status = "REJECTED";
    c.rejectionReason = params.reason.trim();
  }
  invalidateOps();
  return clone(c);
}

// ── Inbound ───────────────────────────────────────────────────────────────
export type InboundFilter = "IN_TRANSIT" | "PARTIAL" | "RECEIVED" | "OVERDUE";
export type InboundSort = "RECENT" | "EXPECTED" | "VALUE";

// Overdue = expected before the start of the IST business day. Was a rolling "now minus
// 24h", which disagreed with the Inbound screen's isOverdue() and with getStockSummary —
// three definitions of the same word, so the chip, the badge and the row could each say
// something different about one shipment.
const inboundOverdue = (s: InboundShipment) =>
  s.status !== "DELIVERED" && new Date(s.expectedDeliveryDate).getTime() < getStartOfTodayIST().getTime();

const inboundResource = createPagedResource<InboundShipment, InboundFilter, InboundSort>({
  rows: () => inbound,
  idOf: (s) => s.id,
  searchText: (s) => `${s.brand.name} ${s.billNo} ${s.shipmentNo} ${s.lineItems.map((l) => l.productName).join(" ")}`,
  filters: {
    IN_TRANSIT: (s) => s.status === "IN_TRANSIT",
    PARTIAL: (s) => s.status === "PARTIALLY_DELIVERED",
    RECEIVED: (s) => s.status === "DELIVERED",
    OVERDUE: inboundOverdue,
  },
  sorts: {
    RECENT: (a, b) => Number(inboundOverdue(b)) - Number(inboundOverdue(a)) || b.createdAt.localeCompare(a.createdAt),
    EXPECTED: (a, b) => a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate),
    VALUE: (a, b) => b.totalAmount - a.totalAmount,
  },
  defaultSort: "RECENT",
});

export async function queryInbound(
  query: PageQuery<InboundFilter, InboundSort> = {}
): Promise<PageResult<InboundShipment, InboundFilter>> {
  await simulate();
  const page = inboundResource.query(query);
  return { ...page, items: clone(page.items) };
}

export async function getInboundShipment(id: string): Promise<InboundShipment> {
  await simulate();
  const s = inboundIndex.get(id);
  if (!s) throw new Error("Shipment not found");
  return clone(s);
}

export async function receiveInboundLine(params: { shipmentId: string; lineId: string; deliveredQty: number; userName: string }): Promise<InboundShipment> {
  await simulate();
  const s = inboundIndex.get(params.shipmentId);
  if (!s) throw new Error("Shipment not found");
  const line = s.lineItems.find((l) => l.id === params.lineId);
  if (!line) throw new Error("Line not found");
  if (params.deliveredQty <= 0) throw new Error("Enter the quantity received");
  if (params.deliveredQty > line.quantity) throw new Error(`Bill shows only ${line.quantity}`);

  const already = line.deliveredQty ?? 0;
  const inc = params.deliveredQty - already;
  line.deliveredQty = params.deliveredQty;
  line.isDelivered = true;

  // Receiving IS the inward — stock lands in BCH Warehouse.
  if (line.productId && inc !== 0) {
    const p = productIndex.get(line.productId);
    if (p) {
      const previous = p.currentStock;
      moveStock(p, "wh-1", inc);
      recomputeStock(p);
      pushTx(p, "INWARD", inc, previous, s.shipmentNo, `${s.brand.name} bill ${s.billNo}`, params.userName);
    }
  }

  const full = s.lineItems.every((l) => l.isDelivered && (l.deliveredQty ?? 0) >= l.quantity);
  const any = s.lineItems.some((l) => l.isDelivered);
  s.status = full ? "DELIVERED" : any ? "PARTIALLY_DELIVERED" : "IN_TRANSIT";
  if (any && !s.deliveredAt) s.deliveredAt = nowIso();
  if (full) s.putawayAt = nowIso();
  invalidateOps();
  return clone(s);
}

// ── Deliveries ────────────────────────────────────────────────────────────
export type DeliveryFilter = "TODAY" | "OPEN" | "ON_ROAD" | "FLAGGED" | "DONE";
export type DeliverySort = "RUN" | "RECENT" | "AREA";

const CLOSED_DELIVERY: DeliveryStatus[] = ["DELIVERED", "WALK_OUT"];
// "Today" here is a BUSINESS day in IST, not the device's midnight (AGENTS.md §6).
// This drives both the TODAY chip and its facet count, so a phone in another timezone
// used to show a different run board than the shop floor's.
const isTodayRun = (d: Delivery) =>
  d.status === "OUT_FOR_DELIVERY" ||
  (d.status === "SCHEDULED" && !!d.scheduledDate && isToday(d.scheduledDate));

// The run order: what is moving, then what is promised, then what is stuck, then the tail.
// Grouping on the LIST is derived from this order, which is what lets a grouped list page.
const RUN_RANK: Record<DeliveryStatus, number> = {
  OUT_FOR_DELIVERY: 0, SCHEDULED: 1, FLAGGED: 2, PREBOOKED: 3,
  VERIFIED: 4, PENDING: 5, DELIVERED: 6, WALK_OUT: 7,
};

// ── Filter-screen groups (plan R10, §13.4) ────────────────────────────────
//
// Mapped onto the REAL model, not onto the mock. Three corrections the design needed:
//   * "Packed" is not a DeliveryStatus and is dropped.
//   * VERIFIED, WALK_OUT and PREBOOKED are real statuses the design had no control for,
//     and are added — otherwise a third of the board is unreachable from the filter.
//   * "Dispatch type" was drawn as Walk-out / Bangalore / Outstation, which mixes a STATUS
//     with a geography flag. It is what it actually is: the `isOutstation` boolean.
//
// The date a delivery is judged on is the one it is promised for, falling back to the
// invoice date — filtering a run board on invoice date would answer the wrong question.
const deliveryDateMs = (d: Delivery) =>
  new Date(d.scheduledDate ?? d.deliveredAt ?? d.invoiceDate).getTime();

/** Within the next N days, counting from the start of today IST. Excludes the past. */
const withinDays = (d: Delivery, days: number) => {
  const start = getStartOfTodayIST().getTime();
  const t = deliveryDateMs(d);
  return t >= start && t < start + days * 86_400_000;
};

export const DELIVERY_FILTER_GROUPS = {
  status: {
    PENDING: (d: Delivery) => d.status === "PENDING",
    VERIFIED: (d: Delivery) => d.status === "VERIFIED",
    SCHEDULED: (d: Delivery) => d.status === "SCHEDULED",
    OUT_FOR_DELIVERY: (d: Delivery) => d.status === "OUT_FOR_DELIVERY",
    DELIVERED: (d: Delivery) => d.status === "DELIVERED",
    WALK_OUT: (d: Delivery) => d.status === "WALK_OUT",
    FLAGGED: (d: Delivery) => d.status === "FLAGGED",
    PREBOOKED: (d: Delivery) => d.status === "PREBOOKED",
  },
  timeline: {
    // "Custom" from the design is NOT here: a custom range needs a date-range picker wired
    // to the query, which is its own piece of work. The four presets cover the run board.
    TODAY: (d: Delivery) => isToday(d.scheduledDate ?? d.deliveredAt ?? d.invoiceDate),
    DAYS_3: (d: Delivery) => withinDays(d, 3),
    THIS_WEEK: (d: Delivery) => withinDays(d, 7),
    THIS_MONTH: (d: Delivery) => withinDays(d, 31),
  },
  dispatch: {
    LOCAL: (d: Delivery) => !d.isOutstation,
    OUTSTATION: (d: Delivery) => d.isOutstation,
  },
};

const deliveryResource = createPagedResource<Delivery, DeliveryFilter, DeliverySort>({
  rows: () => deliveries,
  idOf: (d) => d.id,
  searchText: (d) => `${d.customerName} ${d.invoiceNo} ${d.customerPhone ?? ""} ${d.customerArea ?? ""} ${d.salesPerson ?? ""}`,
  filters: {
    TODAY: isTodayRun,
    OPEN: (d) => !CLOSED_DELIVERY.includes(d.status),
    ON_ROAD: (d) => d.status === "OUT_FOR_DELIVERY",
    FLAGGED: (d) => d.status === "FLAGGED",
    DONE: (d) => CLOSED_DELIVERY.includes(d.status),
  },
  filterGroups: DELIVERY_FILTER_GROUPS,
  sorts: {
    RUN: (a, b) => RUN_RANK[a.status] - RUN_RANK[b.status] || b.invoiceDate.localeCompare(a.invoiceDate),
    RECENT: byDateDesc((d) => d.invoiceDate),
    AREA: (a, b) => (a.customerArea ?? "").localeCompare(b.customerArea ?? "") || b.invoiceDate.localeCompare(a.invoiceDate),
  },
  defaultSort: "RUN",
});

export async function queryDeliveries(
  query: PageQuery<DeliveryFilter, DeliverySort> = {}
): Promise<PageResult<Delivery, DeliveryFilter>> {
  await simulate();
  const page = deliveryResource.query(query);
  return { ...page, items: clone(page.items) };
}

export async function getDelivery(id: string): Promise<Delivery> {
  await simulate();
  const d = deliveryIndex.get(id);
  if (!d) throw new Error("Delivery not found");
  return clone(d);
}

export async function updateDeliveryStatus(params: {
  id: string;
  status: DeliveryStatus;
  flagReason?: string;
  scheduledDate?: string;
  vehicleNo?: string;
  deliveryNotes?: string;
}): Promise<Delivery> {
  await simulate();
  const d = deliveryIndex.get(params.id);
  if (!d) throw new Error("Delivery not found");
  const t = nowIso();
  d.status = params.status;
  if (params.status === "SCHEDULED") d.scheduledDate = params.scheduledDate ?? t;
  if (params.status === "OUT_FOR_DELIVERY") {
    d.dispatchedAt = t;
    if (params.vehicleNo) d.vehicleNo = params.vehicleNo;
  }
  if (params.status === "DELIVERED" || params.status === "WALK_OUT") d.deliveredAt = t;
  if (params.status === "FLAGGED") {
    if (!params.flagReason?.trim()) throw new Error("Say why it is flagged");
    d.flagReason = params.flagReason.trim();
  } else {
    d.flagReason = null;
  }
  if (params.deliveryNotes !== undefined) d.deliveryNotes = params.deliveryNotes;
  invalidateOps();
  return clone(d);
}

// ── Transfers ─────────────────────────────────────────────────────────────
export type TransferFilter = "PENDING" | "APPROVED" | "REJECTED";
export type TransferSort = "RECENT" | "SIZE";

const transferResource = createPagedResource<TransferOrder, TransferFilter, TransferSort>({
  rows: () => transfers,
  idOf: (t) => t.id,
  searchText: (t) => `${t.orderNo} ${t.createdBy.name} ${t.items.map((i) => `${i.product.name} ${i.product.sku}`).join(" ")}`,
  filters: {
    PENDING: (t) => t.status === "PENDING",
    APPROVED: (t) => t.status === "APPROVED",
    REJECTED: (t) => t.status === "REJECTED" || t.status === "CANCELLED",
  },
  sorts: {
    // Anything awaiting a decision sits above the history, whatever the dates say.
    RECENT: (a, b) =>
      Number(b.status === "PENDING") - Number(a.status === "PENDING") || b.createdAt.localeCompare(a.createdAt),
    SIZE: (a, b) =>
      b.items.reduce((n, i) => n + i.quantity, 0) - a.items.reduce((n, i) => n + i.quantity, 0),
  },
  defaultSort: "RECENT",
});

export async function queryTransfers(
  query: PageQuery<TransferFilter, TransferSort> = {}
): Promise<PageResult<TransferOrder, TransferFilter>> {
  await simulate();
  const page = transferResource.query(query);
  return { ...page, items: clone(page.items) };
}

export async function createTransferOrder(params: {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: Array<{ productId: string; quantity: number }>;
  notes: string | null;
  userName: string;
}): Promise<TransferOrder> {
  await simulate();
  if (params.fromWarehouseId === params.toWarehouseId) throw new Error("Source and destination must differ");
  const from = WAREHOUSES.find((w) => w.id === params.fromWarehouseId);
  const to = WAREHOUSES.find((w) => w.id === params.toWarehouseId);
  if (!from || !to) throw new Error("Unknown warehouse");
  const lines = params.items.filter((i) => i.quantity > 0);
  if (lines.length === 0) throw new Error("Add at least one item");

  const items = lines.map((i) => {
    const p = requireProduct(i.productId);
    const avail = p.stockLevels.find((l) => l.warehouseId === from.id)?.quantity ?? 0;
    if (i.quantity > avail) throw new Error(`${p.name}: only ${avail} in ${from.name}`);
    return {
      id: nextId("tri"),
      productId: p.id,
      product: { name: p.name, sku: p.sku, currentStock: p.currentStock },
      quantity: i.quantity,
      fromWarehouse: from,
      toWarehouse: to,
    };
  });

  const count = transfers.length + 1;
  const order: TransferOrder = {
    id: nextId("tr"),
    orderNo: `TRF-${yyyymm()}-${String(count).padStart(4, "0")}`,
    status: "PENDING",
    notes: params.notes,
    rejectionNote: null,
    createdBy: { name: params.userName },
    reviewedBy: null,
    reviewedAt: null,
    createdAt: nowIso(),
    items,
  };
  transfers = [order, ...transfers];
  transferIndex.set(order.id, order);
  invalidateOps();
  return clone(order);
}

/** Approving MOVES the stock between the two StockLevel rows — the transfer is the transaction. */
export async function reviewTransfer(params: { id: string; approve: boolean; note?: string; userName: string }): Promise<TransferOrder> {
  await simulate();
  const o = transferIndex.get(params.id);
  if (!o) throw new Error("Transfer not found");
  if (o.status !== "PENDING") throw new Error("Already reviewed");

  if (params.approve) {
    for (const item of o.items) {
      if (!item.fromWarehouse || !item.toWarehouse) continue;
      const p = requireProduct(item.productId);
      const previous = p.currentStock;
      moveStock(p, item.fromWarehouse.id, -item.quantity);
      moveStock(p, item.toWarehouse.id, item.quantity);
      recomputeStock(p);
      pushTx(p, "TRANSFER", item.quantity, previous, o.orderNo, `${item.fromWarehouse.name} → ${item.toWarehouse.name}`, params.userName);
    }
    o.status = "APPROVED";
  } else {
    if (!params.note?.trim()) throw new Error("A rejection note is required");
    o.status = "REJECTED";
    o.rejectionNote = params.note.trim();
  }
  o.reviewedBy = { name: params.userName };
  o.reviewedAt = nowIso();
  invalidateOps();
  return clone(o);
}
