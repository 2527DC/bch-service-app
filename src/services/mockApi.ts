// Mirrors the PWA's REST surface 1:1 so a later swap to fetch() is a one-file change.
//
//   getMe()                ← /api/auth/me
//   listUsers()            ← /api/auth/users
//   login(name, pin)       ← /api/auth/login
//   getJobs({...})         ← /api/jobs
//   updateJobStatus({...}) ← /api/jobs/update-status
//   saveNotes(...)         ← /api/jobs/notes
//   deleteJob(...)         ← /api/jobs/delete
//   getPrices()/savePrice()/deletePrice() ← /api/prices
//   getIncentives()/getAssemblies()/getAudit()
//
// Every call sleeps 250–500ms so spinners/skeletons are exercised.

import { INITIAL_JOBS } from "../mock/jobs";
import { INITIAL_PRICES } from "../mock/prices";
import { INITIAL_ASSEMBLIES } from "../mock/assemblies";
import { INITIAL_AUDIT } from "../mock/audit";
import { USERS } from "../mock/users";
import type { AssemblyLog, AuditEntry, Incentive, Job, PriceItem, User } from "../mock/types";
import { getStartOfTodayIST } from "../lib/timezone";

// ── In-memory DB (mutable across the session) ────────────────────────────
let jobs: Job[] = JSON.parse(JSON.stringify(INITIAL_JOBS));
let prices: PriceItem[] = JSON.parse(JSON.stringify(INITIAL_PRICES));
const assemblies: AssemblyLog[] = INITIAL_ASSEMBLIES;
let audit: AuditEntry[] = JSON.parse(JSON.stringify(INITIAL_AUDIT));
let priceSeq = 1000;

// Injectable failure flag — set true to exercise the red ErrorBanner path.
export let __forceError = false;
export function __setForceError(v: boolean) {
  __forceError = v;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function simulate() {
  await sleep(250 + Math.random() * 250);
  if (__forceError) throw new Error("Mock server error (forced)");
}

function pushAudit(entry: Omit<AuditEntry, "id" | "createdAt">) {
  audit = [
    { ...entry, id: `al-live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date().toISOString() },
    ...audit,
  ].slice(0, 100);
}

// ── Auth ──────────────────────────────────────────────────────────────────
export async function listUsers(): Promise<User[]> {
  await simulate();
  return USERS;
}

export async function login(name: string, pin: string): Promise<User> {
  await simulate();
  const user = USERS.find((u) => u.name === name);
  if (!user) throw new Error("User not found");
  if (!/^\d{4}$/.test(pin)) throw new Error("Wrong PIN");
  return user;
}

// ── Jobs ──────────────────────────────────────────────────────────────────
export async function getJobs(opts?: {
  includeDelivered?: boolean;
  mechanicId?: string;
  search?: string;
  from?: string; // YYYY-MM-DD (IST)
  to?: string;
}): Promise<Job[]> {
  await simulate();
  let out = [...jobs];

  if (!opts?.includeDelivered) out = out.filter((j) => j.status !== "DELIVERED");
  if (opts?.mechanicId) out = out.filter((j) => j.mechanic?.id === opts.mechanicId);

  if (opts?.search) {
    const q = opts.search.toLowerCase();
    out = out.filter(
      (j) =>
        j.tokenNumber.toLowerCase().includes(q) ||
        j.customer.name.toLowerCase().includes(q) ||
        j.customer.phone.includes(q) ||
        j.bikeType.toLowerCase().includes(q) ||
        (j.mechanic?.name.toLowerCase().includes(q) ?? false)
    );
  }

  // Date window: delivered jobs filter on deliveredAt, active jobs on receivedAt
  if (opts?.from) {
    const from = new Date(`${opts.from}T00:00:00+05:30`).getTime();
    const to = opts.to ? new Date(`${opts.to}T23:59:59.999+05:30`).getTime() : Infinity;
    out = out.filter((j) => {
      const t = new Date(j.status === "DELIVERED" && j.deliveredAt ? j.deliveredAt : j.receivedAt).getTime();
      return t >= from && t <= to;
    });
  }

  return out.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
}

export async function updateJobStatus(params: {
  jobId: string;
  newStatus?: string;
  billUpdateOnly?: boolean;
  partsNeeded?: string;
  amount?: number;
  holdReason?: string;
  zohoInvoiceId?: string;
  userName?: string;
  userRole?: string;
}): Promise<Job> {
  await simulate();
  const job = jobs.find((j) => j.id === params.jobId);
  if (!job) throw new Error("Job not found");

  if (params.billUpdateOnly) {
    if (params.partsNeeded !== undefined) job.partsNeeded = params.partsNeeded || null;
    if (params.amount !== undefined) job.amount = params.amount;
    pushAudit({
      jobId: job.id, action: "BILL_UPDATE", fromStatus: null, toStatus: null,
      details: `${job.tokenNumber} · ₹${job.amount ?? 0}`,
      userName: params.userName ?? "You", userRole: params.userRole ?? "MECHANIC",
    });
    return { ...job };
  }

  const from = job.status;
  if (params.newStatus) {
    job.status = params.newStatus;
    if (params.newStatus === "READY") job.readyAt = new Date().toISOString();
    if (params.newStatus === "DELIVERED") job.deliveredAt = new Date().toISOString();
    if (params.newStatus === "RECEIVED") { job.readyAt = null; job.holdReason = null; }
  }
  if (params.partsNeeded !== undefined) job.partsNeeded = params.partsNeeded || null;
  if (params.amount !== undefined) job.amount = params.amount;
  if (params.holdReason !== undefined) job.holdReason = params.holdReason || null;
  if (params.zohoInvoiceId !== undefined) job.zohoInvoiceId = params.zohoInvoiceId || job.zohoInvoiceId;

  pushAudit({
    jobId: job.id, action: "STATUS_CHANGE", fromStatus: from, toStatus: job.status,
    details: job.tokenNumber,
    userName: params.userName ?? "You", userRole: params.userRole ?? "MECHANIC",
  });
  return { ...job };
}

export async function saveNotes(jobId: string, notes: string): Promise<void> {
  await simulate();
  const job = jobs.find((j) => j.id === jobId);
  if (job) job.notes = notes || null;
}

export async function saveReview(tokenNumber: string, rating: number, googleReview: boolean): Promise<void> {
  await simulate();
  const job = jobs.find((j) => j.tokenNumber === tokenNumber);
  if (job) job.review = { rating, googleReview };
}

export async function deleteJob(jobId: string, user?: { name: string; role: string }): Promise<{ tokenNumber: string }> {
  await simulate();
  const job = jobs.find((j) => j.id === jobId);
  if (!job) throw new Error("Job not found");
  jobs = jobs.filter((j) => j.id !== jobId);
  pushAudit({
    jobId, action: "JOB_DELETE", fromStatus: job.status, toStatus: null,
    details: job.tokenNumber, userName: user?.name ?? "You", userRole: user?.role ?? "MANAGER",
  });
  return { tokenNumber: job.tokenNumber };
}

/** Mock photo "upload" — appends a placeholder asset key. */
export async function addAfterPhoto(jobId: string): Promise<void> {
  await simulate();
  const job = jobs.find((j) => j.id === jobId);
  if (job) job.afterPhotos = [...job.afterPhotos, `bike${1 + Math.floor(Math.random() * 5)}`];
}

export async function deletePhoto(jobId: string, index: number, type: "inward" | "after"): Promise<void> {
  await simulate();
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return;
  if (type === "after") job.afterPhotos = job.afterPhotos.filter((_, i) => i !== index);
  else job.photos = job.photos.filter((_, i) => i !== index);
}

// ── Prices ────────────────────────────────────────────────────────────────
export async function getPrices(): Promise<PriceItem[]> {
  await simulate();
  return [...prices];
}

export async function savePrice(item: {
  id?: string;
  name: string;
  category: "SERVICE" | "PARTS";
  price: number;
  wheelSize: string | null;
}): Promise<PriceItem> {
  await simulate();
  if (item.id) {
    const existing = prices.find((p) => p.id === item.id);
    if (!existing) throw new Error("Price item not found");
    existing.name = item.name;
    existing.category = item.category;
    existing.price = item.price;
    existing.wheelSize = item.wheelSize;
    return { ...existing };
  }
  const created: PriceItem = { id: `p-new-${++priceSeq}`, ...item, wheelSize: item.wheelSize };
  prices.push(created);
  return created;
}

export async function deletePrice(id: string): Promise<void> {
  await simulate();
  prices = prices.filter((p) => p.id !== id);
}

// ── Dashboards ────────────────────────────────────────────────────────────
export async function getIncentives(): Promise<Incentive[]> {
  await simulate();
  const startToday = getStartOfTodayIST().getTime();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return USERS.filter((u) => u.role === "MECHANIC").map((u) => {
    const delivered = jobs.filter((j) => j.mechanic?.id === u.id && j.status === "DELIVERED" && j.deliveredAt);
    const today = delivered.filter((j) => new Date(j.deliveredAt!).getTime() >= startToday);
    const month = delivered.filter((j) => new Date(j.deliveredAt!).getTime() >= monthStart);
    // ₹100 per 10 paid jobs with a confirmed Google review
    const todayQualifying = today.filter((j) => (j.amount ?? 0) > 0 && j.review?.googleReview).length;
    const monthQualifying = month.filter((j) => (j.amount ?? 0) > 0 && j.review?.googleReview).length;
    return {
      id: u.id,
      name: u.name,
      emoji: u.emoji,
      todayDelivered: today.length,
      todayIncentive: Math.floor(todayQualifying / 10) * 100,
      todayProgress: todayQualifying % 10,
      monthDelivered: month.length,
      monthIncentive: Math.floor(monthQualifying / 10) * 100,
    };
  });
}

export async function getAssemblies(): Promise<AssemblyLog[]> {
  await simulate();
  return [...assemblies];
}

export async function getAudit(): Promise<AuditEntry[]> {
  await simulate();
  return [...audit];
}
