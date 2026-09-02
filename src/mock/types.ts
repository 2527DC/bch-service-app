// Shapes mirror the Prisma models of the PWA so screen code is byte-for-byte comparable.

export type User = { id: string; name: string; emoji: string; role: string; email: string };

export type Review = { rating: number; googleReview: boolean };

export type Job = {
  id: string;
  tokenNumber: string;
  status: string;
  jobType: string;
  bikeType: string;
  complaint: string | null;
  partsNeeded: string | null;
  holdReason: string | null;
  notes: string | null;
  workDone: string | null;
  estimatedHrs: number;
  amount: number | null;
  isEcycle: boolean;
  priority: number;
  receivedAt: string;
  promisedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  zohoInvoiceId: string | null;
  photos: string[];
  afterPhotos: string[];
  customer: { name: string; phone: string };
  mechanic: { id: string; name: string; emoji: string } | null;
  review: Review | null;
};

export type PriceItem = {
  id: string;
  name: string;
  category: "SERVICE" | "PARTS";
  wheelSize: string | null;
  price: number;
};

export type Incentive = {
  id: string;
  name: string;
  emoji: string;
  todayDelivered: number;
  todayIncentive: number;
  todayProgress: number;
  monthDelivered: number;
  monthIncentive: number;
};

export type AssemblyLog = {
  id: string;
  assemblyType: "A50" | "A85" | "FULL";
  bikeModel: string | null;
  photos: string[];
  createdAt: string;
  mechanic: { name: string; emoji: string };
};

export type AuditEntry = {
  id: string;
  jobId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  details: string | null;
  userName: string;
  userRole: string;
  createdAt: string;
};

// ── Staff module ──────────────────────────────────────────────────────────
export type StaffMember = User & {
  phone: string;
  joinedAt: string;
  shift: "MORNING" | "EVENING" | "FULL";
  skills: string[];
  active: boolean;
};

// ── LMS module ────────────────────────────────────────────────────────────
export type Lesson = {
  id: string;
  title: string;
  durationMins: number;
  kind: "VIDEO" | "READING" | "PRACTICAL";
  summary: string;
};

export type Course = {
  id: string;
  title: string;
  description: string;
  category: "SAFETY" | "REPAIR" | "SERVICE" | "CUSTOMER";
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  emoji: string;
  lessons: Lesson[];
  requiredFor: string[]; // roles this course is mandatory for
};

// Per-user progress: which lesson ids are done.
export type CourseProgress = {
  courseId: string;
  userId: string;
  completedLessonIds: string[];
};

// ── Stock Management module ───────────────────────────────────────────────
// Mirrors BCH-Management's Prisma models (ProductType, Product, StockLevel, Bin,
// StockCount, InboundShipment, Delivery, TransferOrder) in the joined shape the
// PWA's list/detail APIs return.
export type ProductType = {
  id: string;
  name: string; // "Cycles", "Spares" — free text, renameable
  sortOrder: number; // tab order on /stock
  isActive: boolean; // retire without deleting
  productCount: number;
};

export type Brand = { id: string; name: string };
export type Category = { id: string; name: string };

/** A physical space that holds stock. `code` reuses the old StockLocation strings. */
export type Warehouse = { id: string; code: string; name: string };

export type Bin = { id: string; code: string; name: string; location: string };

export type ProductStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";
export type ProductCondition = "NEW" | "REFURBISHED_EXCELLENT" | "REFURBISHED_GOOD" | "REFURBISHED_FAIR" | "DAMAGED";

/** Per-location stock — one row per (product, warehouse). Product.currentStock is the SUM. */
export type StockLevel = {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  quantity: number;
  reservedQuantity: number;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  productTypeId: string;
  productType: { id: string; name: string };
  status: ProductStatus;
  condition: ProductCondition;
  // Pricing
  costPrice: number; // hidden in the UI without `cost_price.view` — the API omits it server-side
  sellingPrice: number;
  mrp: number;
  gstRate: number;
  hsnCode: string | null;
  // Stock
  currentStock: number;
  reservedStock: number;
  minStock: number;
  reorderLevel: number;
  reorderQty: number;
  // Bicycle specific
  size: string | null;
  color: string | null;
  tags: string[];
  category: Category | null;
  brand: Brand | null;
  bin: { code: string; location: string } | null;
  stockLevels: StockLevel[];
  updatedAt: string;
};

export type TransactionType = "INWARD" | "OUTWARD" | "TRANSFER" | "ADJUSTMENT";

export type InventoryTransaction = {
  id: string;
  type: TransactionType;
  productId: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceNo: string | null;
  notes: string | null;
  userName: string;
  createdAt: string;
};

export type StockCountStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "APPROVED" | "REJECTED";

export type StockCountItem = {
  id: string;
  productId: string;
  product: { name: string; sku: string };
  systemQty: number;
  countedQty: number | null;
  variance: number | null;
  notes: string | null;
  countedAt: string | null;
};

export type StockCount = {
  id: string;
  countNo: string | null; // Auto: SC-YYYYMM-NNNN
  title: string;
  status: StockCountStatus;
  dueDate: string;
  completedAt: string | null;
  approvedAt: string | null;
  approvedBy: { name: string } | null;
  rejectionReason: string | null;
  notes: string | null;
  productType: string | null; // scope filter, null = all
  location: string | null; // warehouse code scope, null = all
  assignedTo: { id: string; name: string };
  items: StockCountItem[];
  createdAt: string;
};

export type InboundShipmentStatus = "IN_TRANSIT" | "PARTIALLY_DELIVERED" | "DELIVERED";

export type InboundLineItem = {
  id: string;
  productName: string; // as read from the bill
  productId: string | null; // matched to an existing product
  sku: string | null;
  quantity: number;
  rate: number;
  gstPercent: number;
  amount: number;
  isDelivered: boolean;
  deliveredQty: number | null;
  preBookedCustomerName: string | null;
  preBookedCustomerPhone: string | null;
  bin: { code: string } | null;
};

export type InboundShipment = {
  id: string;
  shipmentNo: string; // Auto: IB-YYYYMM-0001
  brand: Brand;
  billNo: string;
  billDate: string;
  expectedDeliveryDate: string;
  status: InboundShipmentStatus;
  totalAmount: number;
  totalItems: number;
  deliveredAt: string | null;
  putawayAt: string | null;
  notes: string | null;
  createdBy: { name: string };
  createdAt: string;
  lineItems: InboundLineItem[];
};

export type DeliveryStatus =
  | "PENDING"
  | "VERIFIED"
  | "WALK_OUT"
  | "SCHEDULED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FLAGGED"
  | "PREBOOKED";

export type Delivery = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceAmount: number;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  customerArea: string | null;
  customerPincode: string | null;
  status: DeliveryStatus;
  scheduledDate: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  flagReason: string | null;
  isOutstation: boolean;
  courierName: string | null;
  courierTrackingNo: string | null;
  vehicleNo: string | null;
  salesPerson: string | null;
  lineItems: Array<{ name: string; qty: number }>;
  notes: string | null;
  deliveryNotes: string | null;
  createdAt: string;
};

export type TransferOrderStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type TransferOrderItem = {
  id: string;
  productId: string;
  product: { name: string; sku: string; currentStock: number };
  quantity: number;
  fromWarehouse: Warehouse | null;
  toWarehouse: Warehouse | null;
};

export type TransferOrder = {
  id: string;
  orderNo: string; // Auto: TRF-YYYYMM-NNNN
  status: TransferOrderStatus;
  notes: string | null;
  rejectionNote: string | null;
  createdBy: { name: string };
  reviewedBy: { name: string } | null;
  reviewedAt: string | null;
  createdAt: string;
  items: TransferOrderItem[];
};
