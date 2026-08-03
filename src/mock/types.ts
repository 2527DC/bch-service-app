// Shapes mirror the Prisma models of the PWA so screen code is byte-for-byte comparable.

export type User = { id: string; name: string; emoji: string; role: string };

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
