import { User } from "../entities/user.entity";
import { UserRoleType } from "../enums/user-role-type.enum";
import { UserStatus } from "../enums/user-status.enum";
import { UserInvite } from "../entities/user-invite.entity";

// Auth Response Types
export interface SigninResponse {
  accessToken: string;
  refreshToken: string;
}

export interface VerifyInviteResponse {
  email: string;
  roleId: UserRoleType;
  role: UserRoleType;
  token: string;
}

export interface InviteUserResponse {
  id: string;
  email: string;
  role: UserRoleType;
  status: string;
  createdAt: string;
}

export interface GeolocationData {
  countryCode: string;
  countryName: string;
  localCurrencyCode: string;
  localCurrencyName: string;
  detectionMethod: "ip" | "default";
  confidence: "high" | "medium" | "low";
}

export interface UserSessionResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRoleType;
  roles?: UserRoleType[]; // All roles for the user
  phoneNumber?: string;
  country?: string;
  imagePath?: string;
  isVerified: boolean;
  geolocation?: GeolocationData; // Only included when user is authenticated
}

export interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRoleType;
  roles?: UserRoleType[]; // All roles for the user
  status: UserStatus;
  phoneNumber?: string;
  country?: string;
  imagePath?: string;
  isVerified: boolean;
  referralCode?: string;
  dateRegistered?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  notificationPreferences?: Record<string, boolean>;
}

// User Response Types
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRoleType;
  roles?: UserRoleType[]; // All roles for the user
  status: UserStatus;
  phoneNumber?: string;
  imagePath?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStatsResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  usersByRole: {
    admin: number;
    manager: number;
    user: number;
  };
  recentUsers: UserResponse[];
}

// Product Response Types
export interface ConvertedDenomination {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
}

export interface ProductResponse {
  id: string;
  name: string;
  denominations: number[];
  convertedDenominations?: ConvertedDenomination[];
  imagePath?: string;
  category?: {
    id: string;
    name: string;
  };
  currency?: {
    id: string;
    code: string;
    name: string;
  };
  description?: string;
  howToRedeem?: string;
  termsOfService?: string;
  notes?: string;
  status?: string;
  sku?: string;
  allowCustomAmount?: boolean;
  minCustomAmount?: number;
  maxCustomAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductStatsResponse {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  productsByCategory: {
    [categoryName: string]: number;
  };
  recentProducts: ProductResponse[];
}

// Transaction Response Types
export interface TransactionResponse {
  id: string;
  orderNumber: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItemResponse[];
}

export interface OrderItemResponse {
  id: string;
  productName: string;
  denomination: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productImagePath?: string;
}

export interface TransactionStatsResponse {
  totalTransactions: number;
  totalRevenue: number;
  averageOrderValue: number;
  transactionsByStatus: {
    [status: string]: number;
  };
  recentTransactions: TransactionResponse[];
}

// Dashboard Response Types
export interface DashboardStatsResponse {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  products: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  transactions: {
    total: number;
    totalRevenue: number;
    thisMonth: number;
    thisMonthRevenue: number;
  };
  recentActivity: {
    recentUsers: UserResponse[];
    recentProducts: ProductResponse[];
    recentTransactions: TransactionResponse[];
  };
}

// Settings Response Types
export interface SettingResponse {
  id: string;
  key: string;
  value: string;
  description: string;
  isPublic: boolean;
  updatedAt: string;
}

// Notification Response Types
export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Health Check Response Types
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  database: {
    status: string;
    responseTime: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Generic Response Types
export type ApiResponseData =
  | SigninResponse
  | VerifyInviteResponse
  | InviteUserResponse
  | UserSessionResponse
  | UserProfileResponse
  | UserResponse
  | UserStatsResponse
  | ProductResponse
  | ProductStatsResponse
  | TransactionResponse
  | TransactionStatsResponse
  | DashboardStatsResponse
  | SettingResponse
  | NotificationResponse
  | HealthCheckResponse
  | PaginatedResponse<UserResponse>
  | PaginatedResponse<ProductResponse>
  | PaginatedResponse<TransactionResponse>
  | null;

// Audit Log Types
export interface AuditLogData {
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  timestamp: string;
}
