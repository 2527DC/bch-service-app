// Volume data for the rest of the Stock Management collections.
//
// Same reasoning as `stock-catalog.ts`: a screen that has only ever been run against eight
// rows has not been tested. Deliveries and transfers accumulate forever in a real shop —
// a year of counter sales is thousands of invoices — so the screens that show them are
// built and measured against that, not against a demo fixture.
//
// Seeded, so every id, quantity and date is identical on each reload.
import type {
  Delivery,
  DeliveryStatus,
  InboundShipment,
  InboundLineItem,
  Product,
  StockCount,
  StockCountItem,
  StockCountStatus,
  TransferOrder,
  TransferOrderStatus,
} from "./types";
import { BRANDS, WAREHOUSES } from "./stock";

export const VOLUME = {
  deliveries: 4000,
  inboundShipments: 600,
  transfers: 1200,
  stockCounts: 150,
} as const;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;

const FIRST = [
  "Ramesh", "Priya", "Arun", "Divya", "Karthik", "Sneha", "Mohammed", "Anita", "Vikram", "Kavitha",
  "Suresh", "Meera", "Nikhil", "Lakshmi", "Rahul", "Deepa", "Ganesh", "Pooja", "Sanjay", "Rekha",
  "Manoj", "Swathi", "Prakash", "Nandini", "Aditya", "Shalini", "Naveen", "Bhavana", "Rajesh", "Aishwarya",
] as const;
const LAST = [
  "Kumar", "Nair", "Reddy", "Rao", "Sharma", "Iyer", "Prasad", "Gowda", "Menon", "Shetty",
  "Krishnan", "Bhat", "Desai", "Pillai", "Verma", "Hegde", "Naidu", "Chandra",
] as const;
const AREAS = [
  ["HSR Layout", "560102"], ["Bellandur", "560103"], ["Koramangala", "560034"], ["Indiranagar", "560038"],
  ["Whitefield", "560066"], ["Jayanagar", "560041"], ["Rajajinagar", "560010"], ["Malleshwaram", "560003"],
  ["Frazer Town", "560005"], ["Banashankari", "560070"], ["Marathahalli", "560037"], ["Hebbal", "560024"],
  ["JP Nagar", "560078"], ["Yelahanka", "560064"], ["Electronic City", "560100"], ["Panathur", "560087"],
] as const;
const OUTSTATION = [
  ["Hyderabad", "500033"], ["Chennai", "600042"], ["Mysore", "570009"], ["Mangalore", "575003"],
  ["Pune", "411045"], ["Kochi", "682024"],
] as const;
const COURIERS = ["Delhivery", "BlueDart", "DTDC", "Safexpress", "VRL Logistics"] as const;
const SALES = ["Shravan", "Ibrahim", "Sanjay", "Mohan"] as const;
const STAFF = [
  { id: "u1", name: "Appi" }, { id: "u2", name: "Sanjay" }, { id: "u3", name: "Baba" },
  { id: "u4", name: "Mohan" }, { id: "u7", name: "Shravan" }, { id: "u8", name: "Ibrahim" },
] as const;

// Status mixes are weighted so the busy end of each screen is populated: plenty of open
// work, a long closed tail behind it.
const DELIVERY_MIX: Array<[DeliveryStatus, number]> = [
  ["DELIVERED", 0.58], ["WALK_OUT", 0.14], ["SCHEDULED", 0.08], ["OUT_FOR_DELIVERY", 0.05],
  ["PENDING", 0.06], ["VERIFIED", 0.04], ["PREBOOKED", 0.03], ["FLAGGED", 0.02],
];
const TRANSFER_MIX: Array<[TransferOrderStatus, number]> = [
  ["APPROVED", 0.68], ["REJECTED", 0.12], ["CANCELLED", 0.05], ["PENDING", 0.15],
];
const COUNT_MIX: Array<[StockCountStatus, number]> = [
  ["APPROVED", 0.6], ["REJECTED", 0.06], ["COMPLETED", 0.1], ["IN_PROGRESS", 0.12], ["PENDING", 0.12],
];

function weighted<V extends string>(mix: Array<[V, number]>, r: number): V {
  let acc = 0;
  for (const [v, w] of mix) {
    acc += w;
    if (r <= acc) return v;
  }
  return mix[mix.length - 1][0];
}

export type VolumeData = {
  deliveries: Delivery[];
  inbound: InboundShipment[];
  transfers: TransferOrder[];
  stockCounts: StockCount[];
};

export function generateVolume(products: Product[]): VolumeData {
  const rnd = mulberry32(0x51f7_c23d);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
  const between = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const now = Date.now();
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

  const sellable = products.filter((p) => p.status === "ACTIVE");
  const someProduct = () => sellable[Math.floor(rnd() * sellable.length)];

  // ── Deliveries ──────────────────────────────────────────────────────────
  const deliveries: Delivery[] = new Array(VOLUME.deliveries);
  for (let i = 0; i < VOLUME.deliveries; i++) {
    const n = 2000 + i;
    // Older as the index grows, so "newest first" produces a believable feed.
    const ageDays = Math.floor((i / VOLUME.deliveries) * 400) + rnd() * 2;
    const created = ageDays * DAY;
    const status = weighted(DELIVERY_MIX, rnd());
    const outstation = rnd() < 0.09;
    const [area, pin] = outstation ? pick(OUTSTATION) : pick(AREAS);
    const name = `${pick(FIRST)} ${pick(LAST)}`;

    const lineCount = rnd() < 0.72 ? 1 : between(2, 3);
    const lineItems: Array<{ name: string; qty: number }> = [];
    let amount = 0;
    for (let l = 0; l < lineCount; l++) {
      const p = someProduct();
      const qty = rnd() < 0.85 ? 1 : between(2, 3);
      lineItems.push({ name: p.name, qty });
      amount += p.sellingPrice * qty;
    }

    const scheduled = ["SCHEDULED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status)
      ? iso(created - between(0, 2) * DAY)
      : null;
    const dispatched = ["OUT_FOR_DELIVERY", "DELIVERED"].includes(status) ? iso(created - 2 * DAY) : null;
    const delivered = status === "DELIVERED" || status === "WALK_OUT" ? iso(created - 3 * DAY) : null;

    deliveries[i] = {
      id: `dl-${n}`,
      invoiceNo: `INV-2026-${String(9000 - i).padStart(4, "0")}`,
      invoiceDate: iso(created),
      invoiceAmount: amount,
      customerName: status === "WALK_OUT" && rnd() < 0.4 ? "Walk-in" : name,
      customerPhone: rnd() < 0.94 ? `9${between(100000000, 999999999)}` : null,
      customerAddress: rnd() < 0.8 ? `${between(1, 400)}, ${area}` : null,
      customerArea: area,
      customerPincode: pin,
      status,
      scheduledDate: scheduled,
      dispatchedAt: dispatched,
      deliveredAt: delivered,
      flagReason:
        status === "FLAGGED"
          ? pick(["Customer not reachable — 3 attempts", "Address not found", "Customer asked to reschedule", "Payment pending on delivery"])
          : null,
      isOutstation: outstation,
      courierName: outstation ? pick(COURIERS) : null,
      courierTrackingNo: outstation ? `${pick(["DLV", "BD", "DT"])}${between(1000000000, 9999999999)}` : null,
      vehicleNo: !outstation && dispatched ? `KA-05-MK-${between(1000, 9999)}` : null,
      salesPerson: pick(SALES),
      lineItems,
      notes: null,
      deliveryNotes: rnd() < 0.12 ? pick(["Call before 6pm", "Leave with security", "Second floor, no lift", "Weekend delivery only"]) : null,
      createdAt: iso(created),
    };
  }

  // ── Inbound shipments ───────────────────────────────────────────────────
  const inbound: InboundShipment[] = new Array(VOLUME.inboundShipments);
  for (let i = 0; i < VOLUME.inboundShipments; i++) {
    const n = 2000 + i;
    const ageDays = Math.floor((i / VOLUME.inboundShipments) * 380) + rnd() * 2;
    const created = ageDays * DAY;
    const brand = pick(BRANDS);
    const lineCount = between(1, 8);
    const lineItems: InboundLineItem[] = [];
    let totalAmount = 0;
    let totalItems = 0;

    // Recent shipments are the ones still moving; older ones have landed.
    const status: InboundShipment["status"] = ageDays < 6 ? (rnd() < 0.6 ? "IN_TRANSIT" : "PARTIALLY_DELIVERED") : ageDays < 12 && rnd() < 0.25 ? "PARTIALLY_DELIVERED" : "DELIVERED";

    for (let l = 0; l < lineCount; l++) {
      const p = someProduct();
      const qty = between(1, 30);
      const rate = p.costPrice;
      const gst = p.gstRate;
      const amount = Math.round(qty * rate * (1 + gst / 100));
      const done = status === "DELIVERED" || (status === "PARTIALLY_DELIVERED" && rnd() < 0.5);
      lineItems.push({
        id: `ibl-${n}-${l}`,
        productName: p.name,
        productId: p.id,
        sku: p.sku,
        quantity: qty,
        rate,
        gstPercent: gst,
        amount,
        isDelivered: done,
        deliveredQty: done ? (rnd() < 0.9 ? qty : qty - 1) : null,
        preBookedCustomerName: rnd() < 0.1 ? `${pick(FIRST)} ${pick(LAST)}` : null,
        preBookedCustomerPhone: rnd() < 0.1 ? `9${between(100000000, 999999999)}` : null,
        bin: done ? { code: pick(["A-01-01", "A-01-02", "B-02-01", "FLOOR-01"]) } : null,
      });
      totalAmount += amount;
      totalItems += qty;
    }

    inbound[i] = {
      id: `ib-${n}`,
      shipmentNo: `IB-2026-${String(5000 - i).padStart(4, "0")}`,
      brand,
      billNo: `${brand.name.slice(0, 3).toUpperCase()}/${between(1000, 9999)}`,
      billDate: iso(created + 2 * DAY),
      expectedDeliveryDate: iso(created - between(0, 5) * DAY),
      status,
      totalAmount,
      totalItems,
      deliveredAt: status !== "IN_TRANSIT" ? iso(created - DAY) : null,
      putawayAt: status === "DELIVERED" ? iso(created - DAY) : null,
      notes: rnd() < 0.15 ? pick(["Dispatched by road", "Short shipment — balance to follow", "Damaged carton, 1 unit rejected", "Priority restock"]) : null,
      createdBy: { name: pick(STAFF).name },
      createdAt: iso(created),
      lineItems,
    };
  }

  // ── Transfer orders ─────────────────────────────────────────────────────
  const transfers: TransferOrder[] = new Array(VOLUME.transfers);
  for (let i = 0; i < VOLUME.transfers; i++) {
    const n = 2000 + i;
    const ageDays = Math.floor((i / VOLUME.transfers) * 390) + rnd() * 2;
    const created = ageDays * DAY;
    const status = ageDays < 4 ? weighted(TRANSFER_MIX, rnd()) : rnd() < 0.85 ? "APPROVED" : "REJECTED";
    const from = rnd() < 0.75 ? WAREHOUSES[0] : WAREHOUSES[1];
    const to = from.id === WAREHOUSES[0].id ? WAREHOUSES[1] : WAREHOUSES[0];
    const itemCount = between(1, 5);
    const items = [];
    for (let l = 0; l < itemCount; l++) {
      const p = someProduct();
      items.push({
        id: `tri-${n}-${l}`,
        productId: p.id,
        product: { name: p.name, sku: p.sku, currentStock: p.currentStock },
        quantity: between(1, 12),
        fromWarehouse: from,
        toWarehouse: to,
      });
    }
    const reviewer = pick(STAFF).name;
    transfers[i] = {
      id: `tr-${n}`,
      orderNo: `TRF-2026-${String(4000 - i).padStart(4, "0")}`,
      status,
      notes: rnd() < 0.25 ? pick(["Display running low", "Restock after weekend sales", "Customer order at other branch", "Rebalancing slow movers"]) : null,
      rejectionNote: status === "REJECTED" ? pick(["Not enough stock at source", "Reserved for a pre-booking", "Raise again after the inbound lands"]) : null,
      createdBy: { name: pick(STAFF).name },
      reviewedBy: status === "PENDING" ? null : { name: reviewer },
      reviewedAt: status === "PENDING" ? null : iso(created - DAY),
      createdAt: iso(created),
      items,
    };
  }

  // ── Stock counts ────────────────────────────────────────────────────────
  // A handful are deliberately enormous. A full-store count really is thousands of lines,
  // and that is the case the count sheet has to survive.
  const stockCounts: StockCount[] = new Array(VOLUME.stockCounts);
  for (let i = 0; i < VOLUME.stockCounts; i++) {
    const n = 2000 + i;
    const ageDays = Math.floor((i / VOLUME.stockCounts) * 370) + rnd() * 2;
    const created = ageDays * DAY;
    const status = ageDays < 5 ? weighted(COUNT_MIX, rnd()) : rnd() < 0.9 ? "APPROVED" : "REJECTED";
    const assignee = pick(STAFF);
    const full = i % 25 === 0; // every 25th is a full-store count
    const lineCount = full ? between(1200, 2400) : between(6, 60);

    const items: StockCountItem[] = new Array(lineCount);
    for (let l = 0; l < lineCount; l++) {
      const p = someProduct();
      const systemQty = p.currentStock;
      const counted =
        status === "PENDING" ? null : status === "IN_PROGRESS" && l > lineCount * 0.4 ? null : Math.max(0, systemQty + (rnd() < 0.12 ? between(-3, 2) : 0));
      items[l] = {
        id: `sci-${n}-${l}`,
        productId: p.id,
        product: { name: p.name, sku: p.sku },
        systemQty,
        countedQty: counted,
        variance: counted === null ? null : counted - systemQty,
        notes: counted !== null && counted !== systemQty && rnd() < 0.5 ? pick(["Box empty", "Found in the back", "Damaged, set aside", "On a demo bike"]) : null,
        countedAt: counted === null ? null : iso(created - DAY),
      };
    }

    const closed = status === "APPROVED" || status === "REJECTED";
    stockCounts[i] = {
      id: `sc-${n}`,
      countNo: `SC-2026-${String(3000 - i).padStart(4, "0")}`,
      title: full
        ? `Full store count — ${pick(["Q1", "Q2", "Q3", "Q4"])} ${pick(["cycle", "review", "reconciliation"])}`
        : `${pick(["Weekly", "Spot", "Monthly", "Ad-hoc"])} count — ${pick(["Aisle A", "Aisle B", "Display floor", "Counter drawer", "Back store", "Kids section"])}`,
      status,
      dueDate: iso(created - between(0, 4) * DAY),
      completedAt: status === "COMPLETED" || closed ? iso(created - DAY) : null,
      approvedAt: status === "APPROVED" ? iso(created - DAY) : null,
      approvedBy: status === "APPROVED" ? { name: "Ibrahim" } : null,
      rejectionReason: status === "REJECTED" ? pick(["Recount aisle A", "Numbers do not reconcile", "Counted against the wrong location"]) : null,
      notes: rnd() < 0.2 ? pick(["Focus on tubes", "Check the reserved units", "New staff — verify a sample"]) : null,
      productType: full ? null : pick(["Cycles", "Spares", "Accessories"]),
      location: rnd() < 0.6 ? "BCH_WAREHOUSE" : null,
      assignedTo: { id: assignee.id, name: assignee.name },
      items,
      createdAt: iso(created),
    };
  }

  return { deliveries, inbound, transfers, stockCounts };
}
