import type { PriceItem } from "./types";

let n = 0;
const p = (name: string, category: "SERVICE" | "PARTS", price: number, wheelSize: string | null = null): PriceItem => ({
  id: `p${++n}`,
  name,
  category,
  price,
  wheelSize,
});

export const INITIAL_PRICES: PriceItem[] = [
  // ── Services (~15) ──
  p("Quick Fix", "SERVICE", 99),
  p("Wash & Polish", "SERVICE", 99),
  p("Basic Service", "SERVICE", 299),
  p("Standard Service", "SERVICE", 499),
  p("Premium Service", "SERVICE", 799),
  p("Full Overhaul", "SERVICE", 1199),
  p("Gear Tune-up", "SERVICE", 199),
  p("Brake Adjustment", "SERVICE", 149),
  p("Wheel Truing (per wheel)", "SERVICE", 199),
  p("Puncture Repair", "SERVICE", 60),
  p("Chain Cleaning & Lube", "SERVICE", 149),
  p("E-Cycle Diagnostic", "SERVICE", 349),
  p("E-Cycle Full Service", "SERVICE", 999),
  p("Kids Bike Service", "SERVICE", 249),
  p("Assembly (new bike)", "SERVICE", 399),

  // ── Parts (~45) across wheel sizes ──
  // Tubes & tyres
  p("Tube 14T", "PARTS", 140, "14"),
  p("Tube 20T", "PARTS", 160, "20"),
  p("Tube 24T", "PARTS", 170, "24"),
  p("Tube 26T", "PARTS", 180, "26"),
  p("Tube 27.5T", "PARTS", 220, "27.5"),
  p("Tube 29T", "PARTS", 250, "29"),
  p("Tyre 14T", "PARTS", 450, "14"),
  p("Tyre 20T", "PARTS", 550, "20"),
  p("Tyre 24T", "PARTS", 650, "24"),
  p("Tyre 26T", "PARTS", 750, "26"),
  p("Tyre 27.5T", "PARTS", 1100, "27.5"),
  p("Tyre 29T", "PARTS", 1350, "29"),
  // Brakes
  p("Brake Shoe Set", "PARTS", 150),
  p("Disc Brake Pads", "PARTS", 350, "27.5"),
  p("Disc Rotor 160mm", "PARTS", 550, "27.5"),
  p("Brake Cable Set", "PARTS", 120),
  p("V-Brake Set (front+rear)", "PARTS", 480, "26"),
  p("Kids Brake Lever Set", "PARTS", 180, "20"),
  // Drivetrain
  p("Chain Single Speed", "PARTS", 300, "26"),
  p("Chain 7/8 Speed", "PARTS", 550, "27.5"),
  p("Chain 9/10/11 Speed", "PARTS", 900, "29"),
  p("Freewheel Single", "PARTS", 350, "26"),
  p("Freewheel 7spd", "PARTS", 550, "27.5"),
  p("Cassette 8spd", "PARTS", 950, "29"),
  p("Crankset Single", "PARTS", 650, "26"),
  p("Crankset MTB 3x", "PARTS", 1450, "27.5"),
  p("Pedal Set Standard", "PARTS", 250),
  p("Bottom Bracket", "PARTS", 380),
  p("Gear Cable Set", "PARTS", 130),
  p("Rear Derailleur Tourney", "PARTS", 750, "27.5"),
  p("Shifter Set 7spd", "PARTS", 850, "27.5"),
  // Wheels & steering
  p("Rim 26T Alloy", "PARTS", 850, "26"),
  p("Spoke Set (36)", "PARTS", 240),
  p("Front Hub", "PARTS", 320),
  p("Rear Hub", "PARTS", 420),
  p("Handlebar MTB", "PARTS", 450),
  p("Grip Set", "PARTS", 120),
  p("Headset Bearing", "PARTS", 180),
  // Accessories & misc
  p("Seat Standard", "PARTS", 350),
  p("Seat Gel Comfort", "PARTS", 650),
  p("Side Stand", "PARTS", 220),
  p("Mudguard Set", "PARTS", 280),
  p("Bell", "PARTS", 80),
  p("Basket Front", "PARTS", 260, "26"),
  p("Training Wheels", "PARTS", 350, "14"),
  p("Kids Seat Cushion", "PARTS", 200, "20"),
  // E-cycle
  p("E-Cycle Battery Cell Service", "PARTS", 1800, "ECYCLE"),
  p("E-Cycle Controller", "PARTS", 2200, "ECYCLE"),
  p("E-Cycle Charger", "PARTS", 1200, "ECYCLE"),
  p("E-Cycle Throttle", "PARTS", 550, "ECYCLE"),
  p("E-Cycle Display Unit", "PARTS", 950, "ECYCLE"),
];
