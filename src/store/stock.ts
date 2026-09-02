// Stock Management store. Kept separate from `data` so a stock refresh never re-renders
// the workshop job lists (and vice versa). Screens read slices with selectors and call
// the mutations below — they never touch mockApi directly.
//
// WHAT IS NOT IN HERE: the product catalogue. It is 10k+ rows, and a global store would
// mean every write re-renders every subscriber and the whole array stays in memory for the
// life of the session. Products are paged into the screen that shows them
// (`usePagedList` + `mockApi.queryProducts`); this store keeps the small shared
// collections, the hub's counters, and the one product a detail screen is looking at.
import { create } from "zustand";
import * as mockApi from "../services/mockApi";
import type { StockSummary } from "../services/mockApi.stock";
import type {
  DeliveryStatus,
  InventoryTransaction,
  Product,
  ProductStatus,
  ProductType,
  Warehouse,
} from "../mock/types";
import { useSession } from "./session";
import { useData } from "./data";

type StockState = {
  summary: StockSummary | null;
  productTypes: ProductType[];
  warehouses: Warehouse[];
  /** The product the detail screen is showing, with its movement history. */
  detail: { product: Product; transactions: InventoryTransaction[] } | null;
  detailLoading: boolean;
  /**
   * Bumped after every mutation. Paged list screens put it in their `resetKey`, so a write
   * anywhere re-runs the queries that are on screen. Without it, approving a transfer would
   * leave the list it was approved from showing the old row — the collections no longer
   * live in this store, so there is nothing for a subscriber to notice changing.
   */
  revision: number;
  loaded: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;

  /** Load once — screens call this on mount; a no-op after the first success. */
  ensureLoaded: () => Promise<void>;
  refresh: () => Promise<void>;
  loadProduct: (productId: string) => Promise<void>;
  clearDetail: () => void;
  setError: (e: string | null) => void;

  adjustStock: (p: { productId: string; warehouseId: string; delta: number; reason: string }) => Promise<void>;
  setProductStatus: (productId: string, status: ProductStatus) => Promise<void>;
  saveProductType: (p: { id?: string; name: string; isActive?: boolean }) => Promise<void>;
  recordCountItem: (p: { countId: string; itemId: string; countedQty: number | null; notes?: string | null }) => Promise<void>;
  submitStockCount: (countId: string) => Promise<void>;
  reviewStockCount: (p: { countId: string; approve: boolean; reason?: string }) => Promise<void>;
  receiveInboundLine: (p: { shipmentId: string; lineId: string; deliveredQty: number }) => Promise<void>;
  updateDeliveryStatus: (p: { id: string; status: DeliveryStatus; flagReason?: string; vehicleNo?: string }) => Promise<void>;
  createTransferOrder: (p: { fromWarehouseId: string; toWarehouseId: string; items: Array<{ productId: string; quantity: number }>; notes: string | null }) => Promise<void>;
  reviewTransfer: (p: { id: string; approve: boolean; note?: string }) => Promise<void>;
};

const actorName = () => useSession.getState().user?.name ?? "Unknown";
const toast = (msg: string) => useData.getState().showToast(msg);

export const useStock = create<StockState>((set, get) => {
  // Every mutation: call the API, surface the error to the caller AND the banner, then
  // re-pull the shared collections. A detail screen that is open reloads its own product,
  // because the catalogue is no longer held in one place that can be refreshed wholesale.
  const run = async (fn: () => Promise<unknown>, successMsg: string) => {
    try {
      await fn();
      set({ revision: get().revision + 1 });
      await get().refresh();
      const openId = get().detail?.product.id;
      if (openId) await get().loadProduct(openId);
      toast(successMsg);
    } catch (e: any) {
      const message = e?.message ?? "Something went wrong";
      set({ error: message });
      throw new Error(message);
    }
  };

  return {
    summary: null,
    productTypes: [],
    warehouses: [],
    detail: null,
    detailLoading: false,
    revision: 0,
    loaded: false,
    loading: false,
    refreshing: false,
    error: null,

    ensureLoaded: async () => {
      if (get().loaded || get().loading) return;
      set({ loading: true });
      await get().refresh();
    },

    refresh: async () => {
      set({ refreshing: true });
      try {
        const [summary, productTypes, warehouses] = await Promise.all([
          mockApi.getStockSummary(),
          mockApi.getProductTypes(),
          mockApi.getWarehouses(),
        ]);
        set({
          summary, productTypes, warehouses,
          loaded: true, loading: false, refreshing: false, error: null,
        });
      } catch (e: any) {
        set({ loading: false, refreshing: false, error: e?.message ?? "Refresh failed" });
      }
    },

    loadProduct: async (productId) => {
      set({ detailLoading: true });
      try {
        const detail = await mockApi.getProduct(productId);
        set({ detail, detailLoading: false });
      } catch (e: any) {
        set({ detailLoading: false, error: e?.message ?? "Could not load product" });
      }
    },

    clearDetail: () => set({ detail: null }),

    setError: (error) => set({ error }),

    adjustStock: (p) => run(() => mockApi.adjustStock({ ...p, userName: actorName() }), "Stock adjusted"),
    setProductStatus: (productId, status) =>
      run(() => mockApi.setProductStatus(productId, status), status === "ACTIVE" ? "Product restored" : "Product deactivated"),
    saveProductType: (p) => run(() => mockApi.saveProductType(p), p.id ? "Product type updated" : "Product type added"),
    recordCountItem: (p) => run(() => mockApi.recordCountItem(p), "Count saved"),
    submitStockCount: (countId) => run(() => mockApi.submitStockCount(countId), "Count submitted for approval"),
    reviewStockCount: (p) =>
      run(() => mockApi.reviewStockCount({ ...p, userName: actorName() }), p.approve ? "Count approved — stock adjusted" : "Count rejected"),
    receiveInboundLine: (p) => run(() => mockApi.receiveInboundLine({ ...p, userName: actorName() }), "Received into BCH Warehouse"),
    updateDeliveryStatus: (p) => run(() => mockApi.updateDeliveryStatus(p), "Delivery updated"),
    createTransferOrder: (p) => run(() => mockApi.createTransferOrder({ ...p, userName: actorName() }), "Transfer request raised"),
    reviewTransfer: (p) =>
      run(() => mockApi.reviewTransfer({ ...p, userName: actorName() }), p.approve ? "Transfer approved — stock moved" : "Transfer rejected"),
  };
});
