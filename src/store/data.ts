// Central mock-data store. All screens read from here; every refresh path
// (🔄 tab, inline button, pull-to-refresh, 60s interval) funnels into refresh().
import { create } from "zustand";
import * as mockApi from "../services/mockApi";
import type { AssemblyLog, AuditEntry, Incentive, Job, PriceItem } from "../mock/types";
import { useSession } from "./session";

type DataState = {
  jobs: Job[]; // all jobs incl. delivered — screens filter what they need
  prices: PriceItem[];
  incentives: Incentive[];
  assemblies: AssemblyLog[];
  auditLogs: AuditEntry[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastRefreshedAt: number | null;
  toast: string | null;

  refresh: () => Promise<void>;
  setError: (e: string | null) => void;
  showToast: (msg: string) => void;

  updateJobStatus: (params: {
    jobId: string;
    newStatus?: string;
    billUpdateOnly?: boolean;
    partsNeeded?: string;
    amount?: number;
    holdReason?: string;
    zohoInvoiceId?: string;
  }) => Promise<void>;
  saveNotes: (jobId: string, notes: string) => Promise<void>;
  saveReview: (tokenNumber: string, rating: number, googleReview: boolean) => Promise<void>;
  deleteJob: (jobId: string) => Promise<string>;
  addAfterPhoto: (jobId: string) => Promise<void>;
  deletePhoto: (jobId: string, index: number, type: "inward" | "after") => Promise<void>;
  savePrice: (item: { id?: string; name: string; category: "SERVICE" | "PARTS"; price: number; wheelSize: string | null }) => Promise<void>;
  deletePrice: (id: string) => Promise<void>;
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useData = create<DataState>((set, get) => ({
  jobs: [],
  prices: [],
  incentives: [],
  assemblies: [],
  auditLogs: [],
  loading: true,
  refreshing: false,
  error: null,
  lastRefreshedAt: null,
  toast: null,

  refresh: async () => {
    set({ refreshing: true });
    try {
      const [jobs, prices, incentives, assemblies, auditLogs] = await Promise.all([
        mockApi.getJobs({ includeDelivered: true }),
        mockApi.getPrices(),
        mockApi.getIncentives(),
        mockApi.getAssemblies(),
        mockApi.getAudit(),
      ]);
      set({
        jobs, prices, incentives, assemblies, auditLogs,
        loading: false, refreshing: false, error: null,
        lastRefreshedAt: Date.now(),
      });
    } catch (e: any) {
      set({ loading: false, refreshing: false, error: e?.message ?? "Refresh failed" });
    }
  },

  setError: (error) => set({ error }),

  showToast: (msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 2500);
  },

  updateJobStatus: async (params) => {
    const user = useSession.getState().user;
    try {
      await mockApi.updateJobStatus({ ...params, userName: user?.name, userRole: user?.role });
      await get().refresh();
    } catch (e: any) {
      set({ error: e?.message ?? "Status update failed" });
      await get().refresh();
    }
  },

  saveNotes: async (jobId, notes) => {
    await mockApi.saveNotes(jobId, notes);
    await get().refresh();
  },

  saveReview: async (tokenNumber, rating, googleReview) => {
    await mockApi.saveReview(tokenNumber, rating, googleReview);
  },

  deleteJob: async (jobId) => {
    const user = useSession.getState().user;
    // Optimistic: drop the card immediately, then re-derive
    set({ jobs: get().jobs.filter((j) => j.id !== jobId) });
    const { tokenNumber } = await mockApi.deleteJob(jobId, user ?? undefined);
    await get().refresh();
    return tokenNumber;
  },

  addAfterPhoto: async (jobId) => {
    await mockApi.addAfterPhoto(jobId);
    await get().refresh();
  },

  deletePhoto: async (jobId, index, type) => {
    await mockApi.deletePhoto(jobId, index, type);
    await get().refresh();
  },

  savePrice: async (item) => {
    await mockApi.savePrice(item);
    await get().refresh();
  },

  deletePrice: async (id) => {
    await mockApi.deletePrice(id);
    await get().refresh();
  },
}));
