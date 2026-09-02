// Seed data for the Stock Management module. Shapes mirror the PWA's Prisma models
// (see types.ts). Dates are relative to "now" so overdue/aging states stay exercised.
import type {
  Bin,
  Brand,
  Category,
  Delivery,
  InboundShipment,
  InventoryTransaction,
  Product,
  ProductType,
  StockCount,
  StockLevel,
  TransferOrder,
  Warehouse,
} from "./types";

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const daysAhead = (n: number) => new Date(Date.now() + n * DAY).toISOString();

// ── Masters ───────────────────────────────────────────────────────────────
export const WAREHOUSES: Warehouse[] = [
  { id: "wh-1", code: "BCH_WAREHOUSE", name: "BCH Warehouse" },
  { id: "wh-2", code: "BCC_WAREHOUSE", name: "BCC Warehouse" },
];

export const BINS: Bin[] = [
  { id: "bin-1", code: "A-01-01", name: "Aisle A · Rack 1 · Shelf 1", location: "Warehouse" },
  { id: "bin-2", code: "A-01-02", name: "Aisle A · Rack 1 · Shelf 2", location: "Warehouse" },
  { id: "bin-3", code: "B-02-01", name: "Aisle B · Rack 2 · Shelf 1", location: "Warehouse" },
  { id: "bin-4", code: "FLOOR-01", name: "Display Floor · Front", location: "Store" },
  { id: "bin-5", code: "FLOOR-02", name: "Display Floor · Kids", location: "Store" },
  { id: "bin-6", code: "CNTR-01", name: "Counter Drawer", location: "Store" },
];

export const BRANDS: Brand[] = [
  { id: "br-1", name: "Hero" },
  { id: "br-2", name: "Firefox" },
  { id: "br-3", name: "Hercules" },
  { id: "br-4", name: "BSA" },
  { id: "br-5", name: "Montra" },
  { id: "br-6", name: "Shimano" },
  { id: "br-7", name: "Btwin" },
  { id: "br-8", name: "EMotorad" },
];

export const CATEGORIES: Category[] = [
  { id: "cat-1", name: "MTB" },
  { id: "cat-2", name: "Kids" },
  { id: "cat-3", name: "Hybrid" },
  { id: "cat-4", name: "Road" },
  { id: "cat-5", name: "E-Cycle" },
  { id: "cat-6", name: "Drivetrain" },
  { id: "cat-7", name: "Tyres & Tubes" },
  { id: "cat-8", name: "Safety" },
  { id: "cat-9", name: "Lights" },
];

export const INITIAL_PRODUCT_TYPES: ProductType[] = [
  { id: "pt-1", name: "Cycles", sortOrder: 10, isActive: true, productCount: 0 },
  { id: "pt-2", name: "Spares", sortOrder: 20, isActive: true, productCount: 0 },
  { id: "pt-3", name: "Accessories", sortOrder: 30, isActive: true, productCount: 0 },
  { id: "pt-4", name: "Second-Hand", sortOrder: 40, isActive: false, productCount: 0 },
];

// ── Products ──────────────────────────────────────────────────────────────
const brand = (id: string) => BRANDS.find((b) => b.id === id)!;
const cat = (id: string) => CATEGORIES.find((c) => c.id === id)!;
const pt = (id: string) => {
  const t = INITIAL_PRODUCT_TYPES.find((p) => p.id === id)!;
  return { id: t.id, name: t.name };
};
const bin = (id: string | null) => {
  if (!id) return null;
  const b = BINS.find((x) => x.id === id)!;
  return { code: b.code, location: b.location };
};
const levels = (wh1: number, wh2: number, reserved = 0): StockLevel[] => [
  { warehouseId: "wh-1", warehouseCode: "BCH_WAREHOUSE", warehouseName: "BCH Warehouse", quantity: wh1, reservedQuantity: reserved },
  { warehouseId: "wh-2", warehouseCode: "BCC_WAREHOUSE", warehouseName: "BCC Warehouse", quantity: wh2, reservedQuantity: 0 },
];

type Seed = {
  id: string; sku: string; name: string; type: string; brand: string; cat: string;
  cost: number; sell: number; mrp: number; gst?: number; hsn?: string;
  wh: [number, number]; reserved?: number; reorder: number; reorderQty?: number;
  size?: string | null; color?: string | null; bin?: string | null; status?: Product["status"];
  tags?: string[]; updated: number;
};

const SEED: Seed[] = [
  { id: "p-01", sku: "HRO-SPRINT-26", name: "Hero Sprint Pro 26T 21-Speed", type: "pt-1", brand: "br-1", cat: "cat-1", cost: 7200, sell: 9499, mrp: 10999, hsn: "8712", wh: [4, 2], reorder: 3, reorderQty: 6, size: "26", color: "Matte Black", bin: "bin-4", updated: 1 },
  { id: "p-02", sku: "FFX-BADDOG-27", name: "Firefox Bad Attitude 27.5T", type: "pt-1", brand: "br-2", cat: "cat-1", cost: 16800, sell: 21500, mrp: 23999, hsn: "8712", wh: [1, 0], reserved: 1, reorder: 2, reorderQty: 3, size: "27.5", color: "Red / Black", bin: "bin-4", updated: 2 },
  { id: "p-03", sku: "HRC-ROADEO-29", name: "Hercules Roadeo A75 29T", type: "pt-1", brand: "br-3", cat: "cat-1", cost: 12900, sell: 15999, mrp: 17500, hsn: "8712", wh: [0, 0], reorder: 2, reorderQty: 4, size: "29", color: "Blue", bin: "bin-4", updated: 5 },
  { id: "p-04", sku: "BSA-LADYBIRD-24", name: "BSA Ladybird Dreamz 24T", type: "pt-1", brand: "br-4", cat: "cat-3", cost: 5400, sell: 6999, mrp: 7999, hsn: "8712", wh: [6, 3], reorder: 3, reorderQty: 6, size: "24", color: "Pink", bin: "bin-4", updated: 0 },
  { id: "p-05", sku: "HRO-BLAST-20", name: "Hero Blast 20T Kids", type: "pt-1", brand: "br-1", cat: "cat-2", cost: 3900, sell: 4999, mrp: 5699, hsn: "8712", wh: [9, 4], reorder: 4, reorderQty: 8, size: "20", color: "Green", bin: "bin-5", updated: 1 },
  { id: "p-06", sku: "BTW-RUNRIDE-14", name: "Btwin Runride 500 14T Balance", type: "pt-1", brand: "br-7", cat: "cat-2", cost: 2700, sell: 3499, mrp: 3999, hsn: "8712", wh: [2, 0], reorder: 2, reorderQty: 4, size: "14", color: "Yellow", bin: "bin-5", updated: 3 },
  { id: "p-07", sku: "MTR-TRANCE-26", name: "Montra Trance Pro 26T", type: "pt-1", brand: "br-5", cat: "cat-1", cost: 9800, sell: 12499, mrp: 13999, hsn: "8712", wh: [3, 1], reorder: 2, reorderQty: 4, size: "26", color: "Grey", bin: "bin-4", updated: 4 },
  { id: "p-08", sku: "EMR-X1-27", name: "EMotorad X1 E-Cycle 27.5T", type: "pt-1", brand: "br-8", cat: "cat-5", cost: 22500, sell: 27999, mrp: 32999, gst: 5, hsn: "8711", wh: [2, 0], reserved: 1, reorder: 1, reorderQty: 2, size: "ECYCLE", color: "Black", bin: "bin-4", updated: 0 },
  { id: "p-09", sku: "HRC-TOPGEAR-26", name: "Hercules Top Gear CX70 26T", type: "pt-1", brand: "br-3", cat: "cat-1", cost: 8100, sell: 10499, mrp: 11999, hsn: "8712", wh: [0, 1], reorder: 2, reorderQty: 4, size: "26", color: "Orange", bin: "bin-4", updated: 12 },
  { id: "p-10", sku: "FFX-ROAD-700", name: "Firefox Tarmac 700C Road", type: "pt-1", brand: "br-2", cat: "cat-4", cost: 19500, sell: 24999, mrp: 27999, hsn: "8712", wh: [1, 0], reorder: 1, reorderQty: 2, size: "29", color: "White", bin: "bin-4", status: "INACTIVE", updated: 40 },

  { id: "p-11", sku: "SHM-CHAIN-HG53", name: "Shimano HG53 9-Speed Chain", type: "pt-2", brand: "br-6", cat: "cat-6", cost: 640, sell: 899, mrp: 999, hsn: "8714", wh: [14, 6], reorder: 8, reorderQty: 20, bin: "bin-1", updated: 1 },
  { id: "p-12", sku: "SHM-CASS-HG200", name: "Shimano HG200 7-Speed Cassette", type: "pt-2", brand: "br-6", cat: "cat-6", cost: 780, sell: 1099, mrp: 1250, hsn: "8714", wh: [5, 2], reorder: 6, reorderQty: 12, bin: "bin-1", updated: 2 },
  { id: "p-13", sku: "TYR-26X195-MTB", name: "MTB Tyre 26 x 1.95 Nylon", type: "pt-2", brand: "br-3", cat: "cat-7", cost: 310, sell: 449, mrp: 499, hsn: "4011", wh: [22, 10], reorder: 10, reorderQty: 30, size: "26", bin: "bin-2", updated: 0 },
  { id: "p-14", sku: "TUB-26-PRESTA", name: "Inner Tube 26\" Presta", type: "pt-2", brand: "br-3", cat: "cat-7", cost: 95, sell: 149, mrp: 179, hsn: "4013", wh: [3, 0], reorder: 15, reorderQty: 50, size: "26", bin: "bin-2", updated: 1 },
  { id: "p-15", sku: "TUB-20-SCHRADER", name: "Inner Tube 20\" Schrader", type: "pt-2", brand: "br-3", cat: "cat-7", cost: 80, sell: 129, mrp: 149, hsn: "4013", wh: [0, 0], reorder: 15, reorderQty: 50, size: "20", bin: "bin-2", updated: 3 },
  { id: "p-16", sku: "BRK-PAD-VBRAKE", name: "V-Brake Pad Set (Pair)", type: "pt-2", brand: "br-6", cat: "cat-6", cost: 110, sell: 199, mrp: 249, hsn: "8714", wh: [30, 12], reorder: 12, reorderQty: 40, bin: "bin-3", updated: 6 },
  { id: "p-17", sku: "SHM-DER-TY300", name: "Shimano Tourney TY300 Rear Derailleur", type: "pt-2", brand: "br-6", cat: "cat-6", cost: 590, sell: 849, mrp: 949, hsn: "8714", wh: [4, 1], reorder: 4, reorderQty: 10, bin: "bin-3", updated: 2 },
  { id: "p-18", sku: "SDL-GEL-COMFORT", name: "Gel Comfort Saddle", type: "pt-2", brand: "br-3", cat: "cat-6", cost: 260, sell: 399, mrp: 449, hsn: "8714", wh: [7, 3], reorder: 5, reorderQty: 12, bin: "bin-3", updated: 9 },

  { id: "p-19", sku: "HLM-BTW-500-M", name: "Btwin 500 Helmet — Medium", type: "pt-3", brand: "br-7", cat: "cat-8", cost: 890, sell: 1299, mrp: 1499, hsn: "6506", wh: [6, 2], reorder: 4, reorderQty: 10, size: null, color: "Black", bin: "bin-6", updated: 1 },
  { id: "p-20", sku: "HLM-KIDS-S", name: "Kids Helmet — Small", type: "pt-3", brand: "br-1", cat: "cat-8", cost: 420, sell: 649, mrp: 749, hsn: "6506", wh: [2, 1], reorder: 4, reorderQty: 10, color: "Blue", bin: "bin-6", updated: 2 },
  { id: "p-21", sku: "LGT-USB-FRONT", name: "USB Rechargeable Front Light 300lm", type: "pt-3", brand: "br-2", cat: "cat-9", cost: 340, sell: 549, mrp: 649, hsn: "8512", wh: [11, 4], reorder: 6, reorderQty: 15, bin: "bin-6", updated: 0 },
  { id: "p-22", sku: "LGT-TAIL-RED", name: "Rear Tail Light Red LED", type: "pt-3", brand: "br-2", cat: "cat-9", cost: 120, sell: 199, mrp: 249, hsn: "8512", wh: [0, 0], reorder: 6, reorderQty: 20, bin: "bin-6", updated: 4 },
  { id: "p-23", sku: "LCK-CABLE-1M", name: "Cable Lock 1m Combination", type: "pt-3", brand: "br-1", cat: "cat-8", cost: 150, sell: 249, mrp: 299, hsn: "8301", wh: [9, 0], reorder: 5, reorderQty: 15, bin: "bin-6", updated: 7 },
  { id: "p-24", sku: "BTL-750-STEEL", name: "Steel Bottle 750ml + Cage", type: "pt-3", brand: "br-7", cat: "cat-8", cost: 210, sell: 349, mrp: 399, hsn: "7323", wh: [4, 2], reorder: 5, reorderQty: 15, bin: "bin-6", updated: 1 },
];

export const INITIAL_PRODUCTS: Product[] = SEED.map((s) => {
  const stockLevels = levels(s.wh[0], s.wh[1], s.reserved ?? 0);
  return {
    id: s.id,
    sku: s.sku,
    name: s.name,
    description: null,
    productTypeId: s.type,
    productType: pt(s.type),
    status: s.status ?? "ACTIVE",
    condition: "NEW",
    costPrice: s.cost,
    sellingPrice: s.sell,
    mrp: s.mrp,
    gstRate: s.gst ?? 18,
    hsnCode: s.hsn ?? null,
    currentStock: s.wh[0] + s.wh[1],
    reservedStock: s.reserved ?? 0,
    minStock: 0,
    reorderLevel: s.reorder,
    reorderQty: s.reorderQty ?? 0,
    size: s.size ?? null,
    color: s.color ?? null,
    tags: s.tags ?? [],
    category: cat(s.cat),
    brand: brand(s.brand),
    bin: bin(s.bin ?? null),
    stockLevels,
    updatedAt: daysAgo(s.updated),
  };
});

// ── Inventory transactions (recent movements per product) ────────────────
export const INITIAL_TRANSACTIONS: InventoryTransaction[] = [
  { id: "tx-1", type: "INWARD", productId: "p-01", quantity: 6, previousStock: 0, newStock: 6, referenceNo: "IB-202608-0003", notes: "Hero bill HR/4471", userName: "Ibrahim", createdAt: daysAgo(9) },
  { id: "tx-2", type: "OUTWARD", productId: "p-01", quantity: -1, previousStock: 6, newStock: 5, referenceNo: "INV-2026-1188", notes: null, userName: "Shravan", createdAt: daysAgo(3) },
  { id: "tx-3", type: "TRANSFER", productId: "p-01", quantity: -2, previousStock: 5, newStock: 5, referenceNo: "TRF-202608-0012", notes: "BCH Warehouse → BCC Warehouse", userName: "Ibrahim", createdAt: daysAgo(2) },
  { id: "tx-4", type: "OUTWARD", productId: "p-01", quantity: -1, previousStock: 6, newStock: 6, referenceNo: "INV-2026-1204", notes: null, userName: "Shravan", createdAt: daysAgo(1) },
  { id: "tx-5", type: "ADJUSTMENT", productId: "p-14", quantity: -2, previousStock: 5, newStock: 3, referenceNo: "SC-202608-0002", notes: "Count variance — 2 punctured", userName: "Mohan", createdAt: daysAgo(4) },
  { id: "tx-6", type: "INWARD", productId: "p-13", quantity: 30, previousStock: 2, newStock: 32, referenceNo: "IB-202608-0002", notes: null, userName: "Ibrahim", createdAt: daysAgo(6) },
  { id: "tx-7", type: "OUTWARD", productId: "p-08", quantity: -1, previousStock: 3, newStock: 2, referenceNo: "INV-2026-1190", notes: "Pre-booked delivery", userName: "Shravan", createdAt: daysAgo(2) },
  { id: "tx-8", type: "OUTWARD", productId: "p-05", quantity: -2, previousStock: 15, newStock: 13, referenceNo: "INV-2026-1195", notes: null, userName: "Shravan", createdAt: daysAgo(1) },
  { id: "tx-9", type: "INWARD", productId: "p-11", quantity: 20, previousStock: 0, newStock: 20, referenceNo: "IB-202608-0001", notes: null, userName: "Ibrahim", createdAt: daysAgo(14) },
];

// ── Stock counts ──────────────────────────────────────────────────────────
export const INITIAL_STOCK_COUNTS: StockCount[] = [
  {
    id: "sc-1",
    countNo: "SC-202609-0001",
    title: "Weekly Spares Audit — Aisle A",
    status: "IN_PROGRESS",
    dueDate: daysAhead(1),
    completedAt: null,
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    notes: "Focus on tubes — variance last week.",
    productType: "Spares",
    location: "BCH_WAREHOUSE",
    assignedTo: { id: "u4", name: "Mohan" },
    createdAt: daysAgo(1),
    items: [
      { id: "sci-1", productId: "p-11", product: { name: "Shimano HG53 9-Speed Chain", sku: "SHM-CHAIN-HG53" }, systemQty: 14, countedQty: 14, variance: 0, notes: null, countedAt: daysAgo(0.2) },
      { id: "sci-2", productId: "p-12", product: { name: "Shimano HG200 7-Speed Cassette", sku: "SHM-CASS-HG200" }, systemQty: 5, countedQty: 4, variance: -1, notes: "One box empty", countedAt: daysAgo(0.2) },
      { id: "sci-3", productId: "p-13", product: { name: "MTB Tyre 26 x 1.95 Nylon", sku: "TYR-26X195-MTB" }, systemQty: 22, countedQty: null, variance: null, notes: null, countedAt: null },
      { id: "sci-4", productId: "p-14", product: { name: "Inner Tube 26\" Presta", sku: "TUB-26-PRESTA" }, systemQty: 3, countedQty: null, variance: null, notes: null, countedAt: null },
      { id: "sci-5", productId: "p-15", product: { name: "Inner Tube 20\" Schrader", sku: "TUB-20-SCHRADER" }, systemQty: 0, countedQty: null, variance: null, notes: null, countedAt: null },
    ],
  },
  {
    id: "sc-2",
    countNo: "SC-202608-0004",
    title: "Display Floor — Cycles",
    status: "COMPLETED",
    dueDate: daysAgo(2),
    completedAt: daysAgo(2),
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    notes: null,
    productType: "Cycles",
    location: null,
    assignedTo: { id: "u7", name: "Shravan" },
    createdAt: daysAgo(5),
    items: [
      { id: "sci-6", productId: "p-01", product: { name: "Hero Sprint Pro 26T 21-Speed", sku: "HRO-SPRINT-26" }, systemQty: 6, countedQty: 6, variance: 0, notes: null, countedAt: daysAgo(2) },
      { id: "sci-7", productId: "p-02", product: { name: "Firefox Bad Attitude 27.5T", sku: "FFX-BADDOG-27" }, systemQty: 1, countedQty: 1, variance: 0, notes: null, countedAt: daysAgo(2) },
      { id: "sci-8", productId: "p-04", product: { name: "BSA Ladybird Dreamz 24T", sku: "BSA-LADYBIRD-24" }, systemQty: 9, countedQty: 8, variance: -1, notes: "One on demo ride, not returned", countedAt: daysAgo(2) },
      { id: "sci-9", productId: "p-07", product: { name: "Montra Trance Pro 26T", sku: "MTR-TRANCE-26" }, systemQty: 4, countedQty: 4, variance: 0, notes: null, countedAt: daysAgo(2) },
    ],
  },
  {
    id: "sc-3",
    countNo: "SC-202608-0003",
    title: "Accessories Counter Drawer",
    status: "PENDING",
    dueDate: daysAgo(1),
    completedAt: null,
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    notes: null,
    productType: "Accessories",
    location: null,
    assignedTo: { id: "u2", name: "Sanjay" },
    createdAt: daysAgo(4),
    items: [
      { id: "sci-10", productId: "p-19", product: { name: "Btwin 500 Helmet — Medium", sku: "HLM-BTW-500-M" }, systemQty: 8, countedQty: null, variance: null, notes: null, countedAt: null },
      { id: "sci-11", productId: "p-21", product: { name: "USB Rechargeable Front Light 300lm", sku: "LGT-USB-FRONT" }, systemQty: 15, countedQty: null, variance: null, notes: null, countedAt: null },
      { id: "sci-12", productId: "p-23", product: { name: "Cable Lock 1m Combination", sku: "LCK-CABLE-1M" }, systemQty: 9, countedQty: null, variance: null, notes: null, countedAt: null },
    ],
  },
  {
    id: "sc-4",
    countNo: "SC-202608-0002",
    title: "Tubes & Tyres Recount",
    status: "APPROVED",
    dueDate: daysAgo(6),
    completedAt: daysAgo(5),
    approvedAt: daysAgo(4),
    approvedBy: { name: "Ibrahim" },
    rejectionReason: null,
    notes: "Adjusted 2 tubes as damaged.",
    productType: "Spares",
    location: "BCH_WAREHOUSE",
    assignedTo: { id: "u4", name: "Mohan" },
    createdAt: daysAgo(8),
    items: [
      { id: "sci-13", productId: "p-13", product: { name: "MTB Tyre 26 x 1.95 Nylon", sku: "TYR-26X195-MTB" }, systemQty: 22, countedQty: 22, variance: 0, notes: null, countedAt: daysAgo(5) },
      { id: "sci-14", productId: "p-14", product: { name: "Inner Tube 26\" Presta", sku: "TUB-26-PRESTA" }, systemQty: 5, countedQty: 3, variance: -2, notes: "2 punctured", countedAt: daysAgo(5) },
    ],
  },
];

// ── Inbound shipments ─────────────────────────────────────────────────────
export const INITIAL_INBOUND: InboundShipment[] = [
  {
    id: "ib-1",
    shipmentNo: "IB-202609-0001",
    brand: brand("br-1"),
    billNo: "HR/4512",
    billDate: daysAgo(3),
    expectedDeliveryDate: daysAhead(2),
    status: "IN_TRANSIT",
    totalAmount: 61200,
    totalItems: 8,
    deliveredAt: null,
    putawayAt: null,
    notes: "Dispatched from Ludhiana by road.",
    createdBy: { name: "Ibrahim" },
    createdAt: daysAgo(3),
    lineItems: [
      { id: "ibl-1", productName: "Hero Sprint Pro 26T", productId: "p-01", sku: "HRO-SPRINT-26", quantity: 4, rate: 7200, gstPercent: 12, amount: 32256, isDelivered: false, deliveredQty: null, preBookedCustomerName: null, preBookedCustomerPhone: null, bin: null },
      { id: "ibl-2", productName: "Hero Blast 20T", productId: "p-05", sku: "HRO-BLAST-20", quantity: 4, rate: 3900, gstPercent: 12, amount: 17472, isDelivered: false, deliveredQty: null, preBookedCustomerName: "Kavitha R", preBookedCustomerPhone: "9845012345", bin: null },
    ],
  },
  {
    id: "ib-2",
    shipmentNo: "IB-202608-0006",
    brand: brand("br-8"),
    billNo: "EMR-BLR-2291",
    billDate: daysAgo(6),
    expectedDeliveryDate: daysAgo(1),
    status: "PARTIALLY_DELIVERED",
    totalAmount: 47250,
    totalItems: 2,
    deliveredAt: daysAgo(1),
    putawayAt: null,
    notes: "One unit short — brand to send balance.",
    createdBy: { name: "Ibrahim" },
    createdAt: daysAgo(6),
    lineItems: [
      { id: "ibl-3", productName: "EMotorad X1 27.5", productId: "p-08", sku: "EMR-X1-27", quantity: 2, rate: 22500, gstPercent: 5, amount: 47250, isDelivered: true, deliveredQty: 1, preBookedCustomerName: "Arun Prasad", preBookedCustomerPhone: "9900011223", bin: { code: "FLOOR-01" } },
    ],
  },
  {
    id: "ib-3",
    shipmentNo: "IB-202608-0005",
    brand: brand("br-6"),
    billNo: "SHM/IN/88710",
    billDate: daysAgo(9),
    expectedDeliveryDate: daysAgo(5),
    status: "DELIVERED",
    totalAmount: 26432,
    totalItems: 40,
    deliveredAt: daysAgo(5),
    putawayAt: daysAgo(5),
    notes: null,
    createdBy: { name: "Shravan" },
    createdAt: daysAgo(9),
    lineItems: [
      { id: "ibl-4", productName: "HG53 Chain 9s", productId: "p-11", sku: "SHM-CHAIN-HG53", quantity: 20, rate: 640, gstPercent: 18, amount: 15104, isDelivered: true, deliveredQty: 20, preBookedCustomerName: null, preBookedCustomerPhone: null, bin: { code: "A-01-01" } },
      { id: "ibl-5", productName: "HG200 Cassette 7s", productId: "p-12", sku: "SHM-CASS-HG200", quantity: 10, rate: 780, gstPercent: 18, amount: 9204, isDelivered: true, deliveredQty: 10, preBookedCustomerName: null, preBookedCustomerPhone: null, bin: { code: "A-01-01" } },
      { id: "ibl-6", productName: "Tourney TY300 RD", productId: "p-17", sku: "SHM-DER-TY300", quantity: 10, rate: 590, gstPercent: 18, amount: 6962, isDelivered: true, deliveredQty: 10, preBookedCustomerName: null, preBookedCustomerPhone: null, bin: { code: "B-02-01" } },
    ],
  },
  {
    id: "ib-4",
    shipmentNo: "IB-202608-0004",
    brand: brand("br-2"),
    billNo: "FFX-2026-0931",
    billDate: daysAgo(12),
    expectedDeliveryDate: daysAgo(3),
    status: "IN_TRANSIT",
    totalAmount: 24080,
    totalItems: 1,
    deliveredAt: null,
    putawayAt: null,
    notes: "Overdue — follow up with Firefox logistics.",
    createdBy: { name: "Ibrahim" },
    createdAt: daysAgo(12),
    lineItems: [
      { id: "ibl-7", productName: "Bad Attitude 27.5 Red", productId: "p-02", sku: "FFX-BADDOG-27", quantity: 1, rate: 16800, gstPercent: 12, amount: 18816, isDelivered: false, deliveredQty: null, preBookedCustomerName: "Nikhil S", preBookedCustomerPhone: "9741122334", bin: null },
      { id: "ibl-8", productName: "USB Front Light 300lm", productId: "p-21", sku: "LGT-USB-FRONT", quantity: 10, rate: 340, gstPercent: 18, amount: 4012, isDelivered: false, deliveredQty: null, preBookedCustomerName: null, preBookedCustomerPhone: null, bin: null },
    ],
  },
];

// ── Deliveries ────────────────────────────────────────────────────────────
export const INITIAL_DELIVERIES: Delivery[] = [
  { id: "dl-1", invoiceNo: "INV-2026-1204", invoiceDate: daysAgo(1), invoiceAmount: 9499, customerName: "Ramesh Kumar", customerPhone: "9845098450", customerAddress: "#12, 3rd Cross, HSR Layout Sector 2", customerArea: "HSR Layout", customerPincode: "560102", status: "SCHEDULED", scheduledDate: daysAhead(0), dispatchedAt: null, deliveredAt: null, flagReason: null, isOutstation: false, courierName: null, courierTrackingNo: null, vehicleNo: null, salesPerson: "Shravan", lineItems: [{ name: "Hero Sprint Pro 26T 21-Speed", qty: 1 }], notes: null, deliveryNotes: "Call before 6pm", createdAt: daysAgo(1) },
  { id: "dl-2", invoiceNo: "INV-2026-1201", invoiceDate: daysAgo(1), invoiceAmount: 4999, customerName: "Priya Nair", customerPhone: "9900123456", customerAddress: "Prestige Ferns, Bellandur", customerArea: "Bellandur", customerPincode: "560103", status: "OUT_FOR_DELIVERY", scheduledDate: daysAgo(0), dispatchedAt: daysAgo(0.1), deliveredAt: null, flagReason: null, isOutstation: false, courierName: null, courierTrackingNo: null, vehicleNo: "KA-05-MK-2231", salesPerson: "Shravan", lineItems: [{ name: "Hero Blast 20T Kids", qty: 1 }, { name: "Kids Helmet — Small", qty: 1 }], notes: null, deliveryNotes: null, createdAt: daysAgo(1) },
  { id: "dl-3", invoiceNo: "INV-2026-1198", invoiceDate: daysAgo(2), invoiceAmount: 27999, customerName: "Arun Prasad", customerPhone: "9900011223", customerAddress: "Sobha Dream Acres, Panathur", customerArea: "Panathur", customerPincode: "560087", status: "PREBOOKED", scheduledDate: null, dispatchedAt: null, deliveredAt: null, flagReason: null, isOutstation: false, courierName: null, courierTrackingNo: null, vehicleNo: null, salesPerson: "Ibrahim", lineItems: [{ name: "EMotorad X1 E-Cycle 27.5T", qty: 1 }], notes: "Awaiting IB-202608-0006 balance unit", deliveryNotes: null, createdAt: daysAgo(2) },
  { id: "dl-4", invoiceNo: "INV-2026-1195", invoiceDate: daysAgo(2), invoiceAmount: 6999, customerName: "Divya S", customerPhone: "9886011122", customerAddress: null, customerArea: "Koramangala", customerPincode: "560034", status: "PENDING", scheduledDate: null, dispatchedAt: null, deliveredAt: null, flagReason: null, isOutstation: false, courierName: null, courierTrackingNo: null, vehicleNo: null, salesPerson: "Shravan", lineItems: [{ name: "BSA Ladybird Dreamz 24T", qty: 1 }], notes: null, deliveryNotes: null, createdAt: daysAgo(2) },
  { id: "dl-5", invoiceNo: "INV-2026-1190", invoiceDate: daysAgo(3), invoiceAmount: 12499, customerName: "Mohammed Faisal", customerPhone: "9008899001", customerAddress: "Frazer Town", customerArea: "Frazer Town", customerPincode: "560005", status: "FLAGGED", scheduledDate: daysAgo(1), dispatchedAt: null, deliveredAt: null, flagReason: "Customer not reachable — 3 attempts", isOutstation: false, courierName: null, courierTrackingNo: null, vehicleNo: null, salesPerson: "Shravan", lineItems: [{ name: "Montra Trance Pro 26T", qty: 1 }], notes: null, deliveryNotes: null, createdAt: daysAgo(3) },
  { id: "dl-6", invoiceNo: "INV-2026-1188", invoiceDate: daysAgo(3), invoiceAmount: 21500, customerName: "Sneha Reddy", customerPhone: "9440012345", customerAddress: "Jubilee Hills, Hyderabad", customerArea: "Hyderabad", customerPincode: "500033", status: "OUT_FOR_DELIVERY", scheduledDate: daysAgo(2), dispatchedAt: daysAgo(2), deliveredAt: null, flagReason: null, isOutstation: true, courierName: "Delhivery", courierTrackingNo: "DLV4482210991", vehicleNo: null, salesPerson: "Ibrahim", lineItems: [{ name: "Firefox Bad Attitude 27.5T", qty: 1 }], notes: null, deliveryNotes: "Outstation — box packed with front wheel off", createdAt: daysAgo(3) },
  { id: "dl-7", invoiceNo: "INV-2026-1186", invoiceDate: daysAgo(4), invoiceAmount: 3499, customerName: "Walk-in", customerPhone: null, customerAddress: null, customerArea: null, customerPincode: null, status: "WALK_OUT", scheduledDate: null, dispatchedAt: null, deliveredAt: daysAgo(4), flagReason: null, isOutstation: false, courierName: null, courierTrackingNo: null, vehicleNo: null, salesPerson: "Shravan", lineItems: [{ name: "Btwin Runride 500 14T Balance", qty: 1 }], notes: null, deliveryNotes: null, createdAt: daysAgo(4) },
  { id: "dl-8", invoiceNo: "INV-2026-1180", invoiceDate: daysAgo(5), invoiceAmount: 10499, customerName: "Karthik V", customerPhone: "9741100022", customerAddress: "Whitefield", customerArea: "Whitefield", customerPincode: "560066", status: "DELIVERED", scheduledDate: daysAgo(4), dispatchedAt: daysAgo(4), deliveredAt: daysAgo(4), flagReason: null, isOutstation: false, courierName: null, courierTrackingNo: null, vehicleNo: "KA-05-MK-2231", salesPerson: "Shravan", lineItems: [{ name: "Hercules Top Gear CX70 26T", qty: 1 }], notes: null, deliveryNotes: null, createdAt: daysAgo(5) },
  { id: "dl-9", invoiceNo: "INV-2026-1177", invoiceDate: daysAgo(6), invoiceAmount: 1848, customerName: "Anita George", customerPhone: "9845667788", customerAddress: "Indiranagar", customerArea: "Indiranagar", customerPincode: "560038", status: "VERIFIED", scheduledDate: null, dispatchedAt: null, deliveredAt: null, flagReason: null, isOutstation: false, courierName: null, courierTrackingNo: null, vehicleNo: null, salesPerson: "Shravan", lineItems: [{ name: "Btwin 500 Helmet — Medium", qty: 1 }, { name: "USB Rechargeable Front Light 300lm", qty: 1 }], notes: null, deliveryNotes: null, createdAt: daysAgo(6) },
];

// ── Transfer orders ───────────────────────────────────────────────────────
const wh = (id: string) => WAREHOUSES.find((w) => w.id === id)!;

export const INITIAL_TRANSFERS: TransferOrder[] = [
  {
    id: "tr-1", orderNo: "TRF-202609-0001", status: "PENDING", notes: "BCC display running low on kids cycles.", rejectionNote: null,
    createdBy: { name: "Shravan" }, reviewedBy: null, reviewedAt: null, createdAt: daysAgo(0.3),
    items: [
      { id: "tri-1", productId: "p-05", product: { name: "Hero Blast 20T Kids", sku: "HRO-BLAST-20", currentStock: 13 }, quantity: 3, fromWarehouse: wh("wh-1"), toWarehouse: wh("wh-2") },
      { id: "tri-2", productId: "p-20", product: { name: "Kids Helmet — Small", sku: "HLM-KIDS-S", currentStock: 3 }, quantity: 1, fromWarehouse: wh("wh-1"), toWarehouse: wh("wh-2") },
    ],
  },
  {
    id: "tr-2", orderNo: "TRF-202608-0014", status: "PENDING", notes: null, rejectionNote: null,
    createdBy: { name: "Mohan" }, reviewedBy: null, reviewedAt: null, createdAt: daysAgo(1.5),
    items: [
      { id: "tri-3", productId: "p-16", product: { name: "V-Brake Pad Set (Pair)", sku: "BRK-PAD-VBRAKE", currentStock: 42 }, quantity: 10, fromWarehouse: wh("wh-1"), toWarehouse: wh("wh-2") },
    ],
  },
  {
    id: "tr-3", orderNo: "TRF-202608-0012", status: "APPROVED", notes: "Sprint demand at BCC", rejectionNote: null,
    createdBy: { name: "Ibrahim" }, reviewedBy: { name: "Ibrahim" }, reviewedAt: daysAgo(2), createdAt: daysAgo(2),
    items: [
      { id: "tri-4", productId: "p-01", product: { name: "Hero Sprint Pro 26T 21-Speed", sku: "HRO-SPRINT-26", currentStock: 6 }, quantity: 2, fromWarehouse: wh("wh-1"), toWarehouse: wh("wh-2") },
    ],
  },
  {
    id: "tr-4", orderNo: "TRF-202608-0011", status: "REJECTED", notes: null, rejectionNote: "Only 1 in stock and it is reserved for a pre-booking.",
    createdBy: { name: "Sanjay" }, reviewedBy: { name: "Ibrahim" }, reviewedAt: daysAgo(3), createdAt: daysAgo(4),
    items: [
      { id: "tri-5", productId: "p-02", product: { name: "Firefox Bad Attitude 27.5T", sku: "FFX-BADDOG-27", currentStock: 1 }, quantity: 1, fromWarehouse: wh("wh-1"), toWarehouse: wh("wh-2") },
    ],
  },
  {
    id: "tr-5", orderNo: "TRF-202608-0009", status: "APPROVED", notes: null, rejectionNote: null,
    createdBy: { name: "Mohan" }, reviewedBy: { name: "Shravan" }, reviewedAt: daysAgo(7), createdAt: daysAgo(7),
    items: [
      { id: "tri-6", productId: "p-13", product: { name: "MTB Tyre 26 x 1.95 Nylon", sku: "TYR-26X195-MTB", currentStock: 32 }, quantity: 10, fromWarehouse: wh("wh-1"), toWarehouse: wh("wh-2") },
      { id: "tri-7", productId: "p-11", product: { name: "Shimano HG53 9-Speed Chain", sku: "SHM-CHAIN-HG53", currentStock: 20 }, quantity: 6, fromWarehouse: wh("wh-1"), toWarehouse: wh("wh-2") },
    ],
  },
];
