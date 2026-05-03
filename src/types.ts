export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  taxRate?: number;
  tiktokHandle?: string;
  tiktokAccessToken?: string;
  tiktokRefreshToken?: string;
  tiktokTokenExpiry?: number;
  onboarded?: boolean;
  customExpenseCategories?: string[];
  createdAt: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  brand: string;
  link: string;
  description: string;
  targetAudience: string;
  workup?: string;
  createdAt: any;
}

export interface Script {
  id: string;
  userId: string;
  productId: string;
  title: string;
  content: string;
  hooks: {
    visual: string;
    tos: string;
    verbal: string;
  }[];
  type: string;
  hashtags: string[];
  caption: string;
  scheduledDate?: string;
  savedToArchive: boolean;
  videoUrl?: string; // Manual sync link for TikTok
  createdAt: any;
}

export interface GoalSet {
  id: string;
  userId: string;
  month: string;
  gmvGoal: number;
  commissionGoal: number;
  videosTarget: number;
  livesTarget?: number;
  topGoals: string[];
}

export interface DailyLog {
  id: string;
  userId: string;
  date: string;
  income: {
    affiliate: number;
    rewards: number;
    live: number;
    brandDeals: number;
    other: number;
  };
  metrics: {
    videosPosted: number;
    livesCompleted: number;
    views: number;
    a2c: number;
    gmv: number;
  };
  mileage: number;
  moneyMoves?: string[];
  topHooks?: string[];
  livePlan?: {
    offer: string;
    sequence: string;
  };
}

export interface BrandDeal {
  id: string;
  userId: string;
  brandName: string;
  productName: string;
  dealType: string;
  fee: number;
  deadline: string;
  status: 'pitched' | 'negotiating' | 'signed' | 'content_posted' | 'paid';
  createdAt: any;
}

export interface ContentPiece {
  id: string;
  userId: string;
  idea: string;
  tone: string;
  linkedin: string;
  twitter: string;
  instagram: string;
  script: string;
  images?: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
  };
  status: 'draft' | 'published';
  createdAt: any; // Firestore Timestamp
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: any; // Firestore Timestamp
  receiptUrl?: string;
  weekId?: string; // YYYY-WW
}

export interface IncomeEntry {
  id: string;
  userId: string;
  amount: number;
  productId: string;
  source: 'affiliate' | 'live' | 'brand_deal' | 'other';
  date: any;
  description: string;
}

export interface WeeklyBudget {
  id: string;
  userId: string;
  weekId: string; // YYYY-WW
  categoryBudgets: {
    [category: string]: number;
  };
  salesGoal: number;
}
