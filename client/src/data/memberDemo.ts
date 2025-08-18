// Demo fixtures for the Member page (safe to swap with SF data later)

export type Voucher = {
  id: string;
  type: "E-Cert" | "Upgrade" | "Travel Bank" | "Companion";
  code: string;
  value?: number; // in USD for e-certs / travel bank
  currency?: string;
  expiresOn: string; // ISO
  status: "Active" | "Used" | "Expired";
  notes?: string;
};

export type Badge = {
  id: string;
  name: string;
  icon: string; // emoji or path
  earnedOn: string;
  description?: string;
};

export type Trip = {
  id: string;
  stayId?: string;
  propertyName?: string;
  city?: string;
  checkInISO?: string;
  checkOutISO?: string;
  confirmation?: string;
  status: "Booked" | "Completed" | "Cancelled" | "Hold";
  estMiles?: number;
};

export type WalletItem = {
  id: string;
  label: string;
  amount: number;
  currency: string;
  kind: "E-Cert" | "Travel Bank" | "Wallet";
};

export const DEMO_VOUCHERS: Voucher[] = [
  {
    id: "v1",
    type: "E-Cert",
    code: "EC-8X2K-91QF",
    value: 100,
    currency: "USD",
    expiresOn: "2025-12-31",
    status: "Active",
    notes: "Issued due to schedule change.",
  },
  {
    id: "v2",
    type: "Upgrade",
    code: "UPG-7431",
    expiresOn: "2025-10-15",
    status: "Active",
    notes: "Eligible for domestic routes only.",
  },
  {
    id: "v3",
    type: "E-Cert",
    code: "EC-1Z9P-33LM",
    value: 50,
    currency: "USD",
    expiresOn: "2025-05-01",
    status: "Expired",
  },
];

export const DEMO_BADGES: Badge[] = [
  {
    id: "b1",
    name: "Weekend Warrior",
    icon: "🏕️",
    earnedOn: "2025-06-21",
    description: "3 weekend stays in a quarter.",
  },
  {
    id: "b2",
    name: "City Hopper",
    icon: "🏙️",
    earnedOn: "2025-04-09",
    description: "Stays in 3 distinct cities.",
  },
  {
    id: "b3",
    name: "Early Bird",
    icon: "🌅",
    earnedOn: "2025-03-12",
    description: "Check-in before 8am once.",
  },
];

export const DEMO_TRIPS: Trip[] = [
  {
    id: "t1",
    stayId: "sea-1",
    propertyName: "Reverie Seattle Downtown",
    city: "Seattle",
    checkInISO: "2025-09-05",
    checkOutISO: "2025-09-08",
    confirmation: "BK-49622003",
    status: "Booked",
    estMiles: 3200,
  },
  {
    id: "t2",
    stayId: "chi-2",
    propertyName: "Lakeshore Suites",
    city: "Chicago",
    checkInISO: "2025-07-11",
    checkOutISO: "2025-07-13",
    confirmation: "BK-47291110",
    status: "Completed",
    estMiles: 1800,
  },
];

export const DEMO_WALLET: WalletItem[] = [
  { id: "w1", label: "Travel Bank", amount: 230, currency: "USD", kind: "Travel Bank" },
  { id: "w2", label: "E-Certs", amount: 150, currency: "USD", kind: "E-Cert" },
  { id: "w3", label: "Wallet Balance", amount: 0, currency: "USD", kind: "Wallet" },
];
