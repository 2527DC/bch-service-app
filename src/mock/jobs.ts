// ~60 jobs generated across a 45-day window, relative to "now" so the
// deliberate edge cases (overdue, due-today, ready-not-picked-up…) always hold.
import { CUSTOMERS } from "./customers";
import { USERS } from "./users";
import type { Job } from "./types";

const JOB_TYPES = ["QFX", "RSVC", "FSVC", "SND", "WSH", "ECYC"] as const;
const BIKES = [
  "Hercules Roadeo", "Btwin Rockrider", "Firefox Bad Attitude", "Ninety One Meraki",
  "Hero Sprint Pro", "Cannondale Trail 8", "EMotorad X2", "Kids BSA Champ 20″",
  "Giant Talon 3", "Montra Helicon", "Schnell Border", "Hero Lectro C5",
];
const COMPLAINTS = [
  "Brakes not working, chain slips under load",
  "Gear shifting rough, needs full tune-up",
  "Puncture + wheel wobble",
  "Full service — bike unused for 6 months",
  "Pedal bearing noise, seat torn",
  "Handlebar loose, wants accessories fitted",
  "Battery not charging properly",
  "Chain rusted, both tyres flat",
  null,
];
const PARTS_LINES = [
  "Brake Shoe Set (₹150), Chain 26T (₹450)",
  "Tube 26T x2 (₹360), Grip Set (₹120)",
  "Freewheel 7spd (₹550), Cable Set (₹180)",
  "Full Service (₹499), Chain Lube (₹150)",
];
const HOLD_REASONS = [
  "Waiting for tube 26T, spoke set ordered",
  "Freewheel out of stock — arriving Thursday",
  "Customer to confirm parts cost on call",
  "E-cycle controller sent for testing",
];

const mechanics = USERS.filter((u) => u.role === "MECHANIC");

// Deterministic PRNG so every reload shows the same dataset
let seed = 42;
function rnd(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function iso(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date(Date.now() - daysAgo * 86400000);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function amountFor(jobType: string): number | null {
  if (jobType === "QFX" || jobType === "WSH") return 99;
  if (jobType === "FSVC") return 0;
  return [499, 649, 799, 999, 1250, 1450, 1899, 2499][Math.floor(rnd() * 8)];
}

function makeJob(i: number, overrides: Partial<Job>): Job {
  const jobType = overrides.jobType ?? pick(JOB_TYPES);
  const receivedDaysAgo = overrides.receivedAt ? 0 : Math.floor(rnd() * 45);
  const receivedAt = overrides.receivedAt ?? iso(receivedDaysAgo, 9 + Math.floor(rnd() * 8), Math.floor(rnd() * 60));
  const amount = overrides.amount !== undefined ? overrides.amount : amountFor(jobType);
  const nPhotos = Math.floor(rnd() * 4); // 0–3
  const photos = overrides.photos ?? Array.from({ length: nPhotos }, () => `bike${1 + Math.floor(rnd() * 5)}`);
  const mech = overrides.mechanic !== undefined ? overrides.mechanic : pick(mechanics);
  return {
    id: `j${i}`,
    tokenNumber: `T-${String(1400 - i).padStart(4, "0")}`,
    status: "RECEIVED",
    jobType,
    bikeType: pick(BIKES),
    complaint: pick(COMPLAINTS),
    partsNeeded: null,
    holdReason: null,
    notes: null,
    workDone: null,
    estimatedHrs: 1 + Math.floor(rnd() * 4),
    amount,
    isEcycle: jobType === "ECYC",
    priority: 0,
    receivedAt,
    promisedAt: null,
    readyAt: null,
    deliveredAt: null,
    zohoInvoiceId: null,
    photos,
    afterPhotos: [],
    customer: pick(CUSTOMERS),
    mechanic: mech,
    review: null,
    ...overrides,
    // fields above `...overrides` that overrides may also set win via the spread
  };
}

function buildJobs(): Job[] {
  const jobs: Job[] = [];
  let i = 1;

  // ── Deliberate edge cases ──────────────────────────────────────────────
  // 1. Overdue pending job (promised 3 days ago, still RECEIVED) + priority
  jobs.push(makeJob(i++, {
    status: "RECEIVED", receivedAt: iso(6, 10), promisedAt: iso(3, 18), priority: 1,
    complaint: "Full overhaul — customer chasing daily",
  }));
  // 2. Overdue hold job with reason
  jobs.push(makeJob(i++, {
    status: "PARTS_NEEDED", receivedAt: iso(8, 11), promisedAt: iso(2, 18),
    partsNeeded: PARTS_LINES[0], holdReason: HOLD_REASONS[0], amount: 1250,
  }));
  // 3. Due today (RECEIVED)
  jobs.push(makeJob(i++, {
    status: "RECEIVED", receivedAt: iso(1, 12), promisedAt: iso(0, 19),
  }));
  // 4. Ready, not picked up for 5 days
  jobs.push(makeJob(i++, {
    status: "READY", receivedAt: iso(9, 10), promisedAt: iso(5, 18), readyAt: iso(5, 16),
    partsNeeded: PARTS_LINES[1], amount: 849, zohoInvoiceId: "INV/26/018342",
  }));
  // 5. Ready, pickup due today
  jobs.push(makeJob(i++, {
    status: "READY", receivedAt: iso(2, 9), promisedAt: iso(0, 18), readyAt: iso(0, 11),
    amount: 99, jobType: "QFX",
  }));
  // 6. Amount but no breakdown (warning row)
  jobs.push(makeJob(i++, {
    status: "RECEIVED", receivedAt: iso(1, 15), amount: 1450, partsNeeded: null,
  }));
  // 7. Unassigned job
  jobs.push(makeJob(i++, {
    status: "RECEIVED", receivedAt: iso(0, 9, 30), mechanic: null, promisedAt: iso(2, 18),
  }));
  // 8. Walk-in QFX delivered today (no phone)
  jobs.push(makeJob(i++, {
    status: "DELIVERED", jobType: "QFX", receivedAt: iso(0, 10), deliveredAt: iso(0, 12),
    customer: CUSTOMERS[24], amount: 99, review: { rating: 5, googleReview: false },
  }));
  // 9. Hold with notes for staff
  jobs.push(makeJob(i++, {
    status: "PARTS_NEEDED", receivedAt: iso(4, 13), promisedAt: iso(1, 18),
    partsNeeded: PARTS_LINES[2], holdReason: HOLD_REASONS[1],
    notes: "Client didn't answer, will call back tomorrow", amount: 980,
  }));
  // 10. E-cycle on hold
  jobs.push(makeJob(i++, {
    status: "PARTS_NEEDED", jobType: "ECYC", isEcycle: true, receivedAt: iso(3, 11),
    promisedAt: iso(-2, 18), partsNeeded: "E-Cycle Controller (₹2200)", holdReason: HOLD_REASONS[3],
    amount: 2700,
  }));

  // ── Bulk fill: statuses weighted RECEIVED 35% / HOLD 15% / READY 15% / DELIVERED 35% ──
  while (jobs.length < 60) {
    const r = rnd();
    if (r < 0.35) {
      // RECEIVED — recent, some with promise dates in the future
      jobs.push(makeJob(i++, {
        status: "RECEIVED",
        receivedAt: iso(Math.floor(rnd() * 4), 9 + Math.floor(rnd() * 8)),
        promisedAt: rnd() < 0.7 ? iso(-(1 + Math.floor(rnd() * 4)), 18) : null,
        priority: rnd() < 0.08 ? 1 : 0,
      }));
    } else if (r < 0.5) {
      jobs.push(makeJob(i++, {
        status: "PARTS_NEEDED",
        receivedAt: iso(1 + Math.floor(rnd() * 6), 10),
        promisedAt: rnd() < 0.6 ? iso(-(1 + Math.floor(rnd() * 3)), 18) : null,
        partsNeeded: pick(PARTS_LINES),
        holdReason: pick(HOLD_REASONS),
      }));
    } else if (r < 0.65) {
      const readyDays = Math.floor(rnd() * 3);
      jobs.push(makeJob(i++, {
        status: "READY",
        receivedAt: iso(readyDays + 2, 10),
        readyAt: iso(readyDays, 15),
        promisedAt: iso(readyDays, 18),
        partsNeeded: rnd() < 0.5 ? pick(PARTS_LINES) : null,
        zohoInvoiceId: rnd() < 0.4 ? `INV/26/01${8000 + Math.floor(rnd() * 999)}` : null,
      }));
    } else {
      // DELIVERED — spread over the last 45 days
      const delDays = Math.floor(rnd() * 45);
      const tatDays = 1 + Math.floor(rnd() * 3);
      const googleReview = rnd() < 0.45;
      jobs.push(makeJob(i++, {
        status: "DELIVERED",
        receivedAt: iso(delDays + tatDays, 10),
        promisedAt: rnd() < 0.8 ? iso(delDays + (rnd() < 0.75 ? 0 : 1), 18) : null,
        readyAt: iso(delDays, 12),
        deliveredAt: iso(delDays, 13 + Math.floor(rnd() * 6)),
        partsNeeded: rnd() < 0.6 ? pick(PARTS_LINES) : null,
        zohoInvoiceId: `INV/26/01${7000 + Math.floor(rnd() * 999)}`,
        review: { rating: rnd() < 0.7 ? 5 : 4, googleReview },
        afterPhotos: rnd() < 0.3 ? [`bike${1 + Math.floor(rnd() * 5)}`] : [],
      }));
    }
  }
  return jobs;
}

export const INITIAL_JOBS: Job[] = buildJobs();
