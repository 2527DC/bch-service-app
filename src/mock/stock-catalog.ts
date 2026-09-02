// Procedural catalogue generator — the reason this module can be tested at real scale.
//
// The 24 hand-written products in `stock.ts` are the ones screenshots and demos use; they
// stay first in the list and keep their readable ids. Everything after them is generated
// here so the list screen is exercised against a catalogue the size of a real one
// (Bharath Cycle Hub's Zoho export is in the tens of thousands of SKUs).
//
// Two properties matter and are deliberate:
//
//   1. DETERMINISTIC. A seeded PRNG, not `Math.random()`. The same SKU has the same stock
//      on every reload, so "scroll to row 4,000 and check the number" is a repeatable test
//      and a screenshot does not change under you.
//   2. BUILT ONCE, MUTATED IN PLACE. `mockApi.stock` takes this array as its database
//      rather than deep-cloning it. Cloning 10k products through JSON on every read is
//      what makes a mock feel slower than the server it stands in for.
import type { Product, StockLevel } from "./types";
import { BINS, BRANDS, CATEGORIES, INITIAL_PRODUCT_TYPES } from "./stock";

/** How many products to generate on top of the hand-written seed. */
export const GENERATED_PRODUCT_COUNT = 10_000;

// ── Deterministic PRNG (mulberry32) ───────────────────────────────────────
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

const rnd = mulberry32(0x8cf3_1a7b);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const between = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

// ── Name parts ────────────────────────────────────────────────────────────
// Combined into "<Brand> <Model> <Variant> <Size>" so names are searchable, varied and
// plausible without ever reading as filler.
const CYCLE_MODELS = [
  "Sprint", "Ranger", "Trailblazer", "Roadeo", "Velocity", "Nomad", "Summit", "Cyclone",
  "Voyager", "Rapid", "Terrain", "Falcon", "Meteor", "Comet", "Vector", "Drift",
  "Cruiser", "Pioneer", "Horizon", "Ascent", "Boulder", "Rampage", "Vertex", "Quest",
] as const;
const CYCLE_VARIANTS = ["Pro", "Sport", "XT", "Elite", "Classic", "DX", "Plus", "Lite", "SE", "Trail"] as const;
const WHEEL_SIZES = ["14", "20", "24", "26", "27.5", "29"] as const;

const SPARE_PARTS = [
  "Chain", "Cassette", "Rear Derailleur", "Front Derailleur", "Brake Lever", "Brake Cable",
  "Gear Cable", "Bottom Bracket", "Crank Set", "Freewheel", "Hub Axle", "Spoke Set",
  "Rim Tape", "Handlebar Grip", "Saddle", "Seat Post", "Pedal Pair", "Kickstand",
  "Mudguard Set", "Chain Wheel", "Bearing Set", "Headset", "Fork Boot", "Tyre", "Inner Tube",
] as const;
const SPARE_SPECS = ["7-Speed", "9-Speed", "21-Speed", "Alloy", "Steel", "Nylon", "Heavy Duty", "Universal"] as const;

const ACCESSORIES = [
  "Helmet", "Front Light", "Tail Light", "Cable Lock", "U-Lock", "Water Bottle", "Bottle Cage",
  "Bike Pump", "Puncture Kit", "Cycling Gloves", "Knee Guard", "Elbow Guard", "Bell",
  "Mirror", "Phone Mount", "Pannier Bag", "Saddle Bag", "Rear Carrier", "Reflector Set",
  "Chain Lube", "Multi-Tool", "Bike Cover", "Training Wheels", "Basket",
] as const;
const ACC_SPECS = ["Small", "Medium", "Large", "Junior", "Adult", "300lm", "600lm", "1m", "1.5m", "750ml"] as const;

const COLORS = [
  "Matte Black", "Gloss White", "Racing Red", "Cobalt Blue", "Forest Green", "Sunburst Orange",
  "Graphite", "Silver", "Teal", "Neon Yellow", "Deep Purple", "Sand",
] as const;

const CYCLE_CATS = ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5"];
const SPARE_CATS = ["cat-6", "cat-7"];
const ACC_CATS = ["cat-8", "cat-9"];

const brandById = new Map(BRANDS.map((b) => [b.id, b]));
const catById = new Map(CATEGORIES.map((c) => [c.id, c]));
const typeById = new Map(INITIAL_PRODUCT_TYPES.map((t) => [t.id, t]));

const slug = (s: string) =>
  s.replace(/[^A-Za-z0-9]+/g, "").slice(0, 4).toUpperCase().padEnd(3, "X");

const DAY = 86_400_000;

/**
 * Builds the generated tail of the catalogue.
 *
 * `startIndex` keeps ids unique against the hand-written seed and is baked into the SKU,
 * so every SKU is unique without a collision check over 10k rows.
 */
export function generateProducts(count = GENERATED_PRODUCT_COUNT, startIndex = 1000): Product[] {
  const out: Product[] = new Array(count);
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const n = startIndex + i;

    // Weighted so the catalogue looks like a cycle shop: mostly spares, then accessories,
    // then complete cycles.
    const roll = rnd();
    const typeId = roll < 0.52 ? "pt-2" : roll < 0.82 ? "pt-3" : "pt-1";
    const type = typeById.get(typeId)!;

    const brand = brandById.get(pick(BRANDS).id)!;

    let name: string;
    let categoryId: string;
    let size: string | null = null;
    let color: string | null = null;
    let hsn: string;
    let cost: number;

    if (typeId === "pt-1") {
      const model = pick(CYCLE_MODELS);
      const variant = pick(CYCLE_VARIANTS);
      size = pick(WHEEL_SIZES);
      color = pick(COLORS);
      name = `${brand.name} ${model} ${variant} ${size}T`;
      categoryId = pick(CYCLE_CATS);
      hsn = "8712";
      cost = between(3200, 26000);
    } else if (typeId === "pt-2") {
      const part = pick(SPARE_PARTS);
      const spec = pick(SPARE_SPECS);
      name = `${brand.name} ${part} — ${spec}`;
      categoryId = pick(SPARE_CATS);
      if (rnd() < 0.45) size = pick(WHEEL_SIZES);
      hsn = categoryId === "cat-7" ? "4011" : "8714";
      cost = between(60, 1800);
    } else {
      const acc = pick(ACCESSORIES);
      const spec = pick(ACC_SPECS);
      name = `${brand.name} ${acc} ${spec}`;
      categoryId = pick(ACC_CATS);
      if (rnd() < 0.4) color = pick(COLORS);
      hsn = "8714";
      cost = between(90, 2400);
    }

    const category = catById.get(categoryId)!;
    const margin = 1.32 + rnd() * 0.5;
    const sellingPrice = Math.round((cost * margin) / 10) * 10;
    const mrp = Math.round((sellingPrice * (1.06 + rnd() * 0.16)) / 10) * 10;

    // Health mix that keeps every filter chip populated: ~7% out, ~13% low, the rest fine.
    const health = rnd();
    const reorderLevel = typeId === "pt-1" ? between(1, 4) : between(4, 15);
    let total: number;
    if (health < 0.07) total = 0;
    else if (health < 0.2) total = between(1, Math.max(1, reorderLevel));
    else total = between(reorderLevel + 1, reorderLevel + (typeId === "pt-1" ? 12 : 70));

    const atBcc = total === 0 ? 0 : Math.floor(total * (rnd() * 0.45));
    const atBch = total - atBcc;
    const reserved = total > 2 && rnd() < 0.12 ? between(1, Math.min(3, total)) : 0;

    const stockLevels: StockLevel[] = [
      { warehouseId: "wh-1", warehouseCode: "BCH_WAREHOUSE", warehouseName: "BCH Warehouse", quantity: atBch, reservedQuantity: reserved },
      { warehouseId: "wh-2", warehouseCode: "BCC_WAREHOUSE", warehouseName: "BCC Warehouse", quantity: atBcc, reservedQuantity: 0 },
    ];

    const bin = rnd() < 0.8 ? BINS[Math.floor(rnd() * BINS.length)] : null;

    out[i] = {
      id: `p-${n}`,
      sku: `${slug(brand.name)}-${slug(name.split(" ").slice(1).join(""))}-${n}`,
      name,
      description: null,
      productTypeId: typeId,
      productType: { id: type.id, name: type.name },
      // ~4% retired, so the Inactive filter has something in it without polluting the list.
      status: rnd() < 0.04 ? "INACTIVE" : "ACTIVE",
      condition: "NEW",
      costPrice: cost,
      sellingPrice,
      mrp,
      gstRate: categoryId === "cat-5" ? 5 : typeId === "pt-1" ? 12 : 18,
      hsnCode: hsn,
      currentStock: total,
      reservedStock: reserved,
      minStock: 0,
      reorderLevel,
      reorderQty: reorderLevel * 2,
      size,
      color,
      tags: [],
      category,
      brand,
      bin: bin ? { code: bin.code, location: bin.location } : null,
      stockLevels,
      updatedAt: new Date(now - Math.floor(rnd() * 120) * DAY).toISOString(),
    };
  }

  return out;
}
