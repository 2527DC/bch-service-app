// Stock Management status config — labels, Tailwind classes and hex tints in one place
// (AGENTS.md §4: never inline a status color in a screen). Hex values are for icon
// `color` props only; everything else uses the className pairs.
import type {
  DeliveryStatus,
  InboundShipmentStatus,
  Product,
  StockCountStatus,
  TransactionType,
  TransferOrderStatus,
} from "../mock/types";

export type Tone = "gray" | "green" | "amber" | "red" | "blue" | "purple" | "orange";

export const TONE: Record<Tone, { bg: string; text: string; border: string; dot: string; hex: string }> = {
  gray: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-400", hex: "#6b7280" },
  green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500", hex: "#16a34a" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", hex: "#d97706" },
  red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500", hex: "#dc2626" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500", hex: "#2563eb" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500", hex: "#7c3aed" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500", hex: "#ea580c" },
};

export const DELIVERY_STATUS: Record<DeliveryStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "gray" },
  VERIFIED: { label: "Verified", tone: "blue" },
  WALK_OUT: { label: "Walk-out", tone: "green" },
  SCHEDULED: { label: "Scheduled", tone: "amber" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", tone: "purple" },
  DELIVERED: { label: "Delivered", tone: "green" },
  FLAGGED: { label: "Flagged", tone: "red" },
  PREBOOKED: { label: "Pre-booked", tone: "orange" },
};

export const TRANSFER_STATUS: Record<TransferOrderStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "amber" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  CANCELLED: { label: "Cancelled", tone: "gray" },
};

export const COUNT_STATUS: Record<StockCountStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "amber" },
  IN_PROGRESS: { label: "In progress", tone: "blue" },
  COMPLETED: { label: "Completed", tone: "purple" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
};

export const INBOUND_STATUS: Record<InboundShipmentStatus, { label: string; tone: Tone }> = {
  IN_TRANSIT: { label: "In transit", tone: "amber" },
  PARTIALLY_DELIVERED: { label: "Partially received", tone: "blue" },
  DELIVERED: { label: "Received", tone: "green" },
};

export const TX_TYPE: Record<TransactionType, { label: string; tone: Tone }> = {
  INWARD: { label: "Inward", tone: "green" },
  OUTWARD: { label: "Outward", tone: "red" },
  TRANSFER: { label: "Transfer", tone: "blue" },
  ADJUSTMENT: { label: "Adjustment", tone: "amber" },
};

export type StockHealth = { key: "OUT" | "LOW" | "OK" | "INACTIVE"; label: string; tone: Tone };

/** Same thresholds as the PWA's getStockBadge(): 0 = Out, ≤ reorderLevel = Low. */
export function stockHealth(p: Pick<Product, "currentStock" | "reorderLevel" | "status">): StockHealth {
  if (p.status !== "ACTIVE") return { key: "INACTIVE", label: "Inactive", tone: "gray" };
  if (p.currentStock <= 0) return { key: "OUT", label: "Out", tone: "red" };
  if (p.reorderLevel > 0 && p.currentStock <= p.reorderLevel) return { key: "LOW", label: "Low", tone: "amber" };
  return { key: "OK", label: "OK", tone: "green" };
}

/** Left-border accent per health, matching the PWA's getStockAccent(). */
export const HEALTH_ACCENT: Record<StockHealth["key"], string> = {
  INACTIVE: "border-l-gray-200",
  OUT: "border-l-red-500",
  LOW: "border-l-amber-400",
  OK: "border-l-green-500",
};
