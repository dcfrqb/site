/**
 * API клиент для web-api.
 * Все запросы идут через /api/* (проксируются Next.js → web-api).
 */

const BASE = "/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include", // включаем cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || body.message || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface AuthUser {
  telegram_id: number;
  username: string | null;
  first_name: string;
  is_admin: boolean;
}

export const authApi = {
  loginTelegram: (data: TelegramAuthData) =>
    request<AuthUser>("/auth/telegram", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => request<AuthUser>("/auth/me"),

  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  refresh: () => request<{ ok: boolean }>("/auth/refresh", { method: "POST" }),
};

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  created_at: string;
  last_activity_at: string | null;
  has_active_subscription: boolean;
  payments_count: number;
}

export const profileApi = {
  get: () => request<Profile>("/profile"),
};

// ─── Subscriptions ───────────────────────────────────────────────────────────

export interface Subscription {
  active: boolean;
  plan_code: string | null;
  plan_name: string | null;
  valid_until: string | null;
  is_lifetime: boolean;
  status: "active" | "expired" | "none";
  days_left: number | null;
}

export interface SubscriptionStatus {
  status: "active" | "expired" | "none" | "error" | "unknown";
  expires_at: string | null;
  days_left?: number;
  is_lifetime?: boolean;
}

export interface ConnectInfo {
  subscription_url: string | null;
  remna_user_id: string | null;
}

export const subscriptionsApi = {
  current: () => request<Subscription>("/subscriptions/current"),
  status: () => request<SubscriptionStatus>("/subscriptions/status"),
  connect: () => request<ConnectInfo>("/subscriptions/connect"),
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface Payment {
  id: number;
  provider: string;
  external_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Plan {
  amount: number;
  plan_code: string;
  period_months: number;
  label: string;
  plan_name: string;
}

export interface CreatePaymentResponse {
  payment_url: string;
  payment_id: string;
  amount: number;
  currency: string;
}

export const paymentsApi = {
  list: (limit = 20, offset = 0) =>
    request<Payment[]>(`/payments?limit=${limit}&offset=${offset}`),

  create: (tariff: string) =>
    request<CreatePaymentResponse>("/payments/create", {
      method: "POST",
      body: JSON.stringify({ tariff }),
    }),

  plans: () => request<Record<string, Plan>>("/payments/plans"),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  total_users: number;
  active_subscriptions: number;
  total_payments: number;
  succeeded_payments: number;
  revenue_rub: number;
}

export const adminApi = {
  stats: () => request<AdminStats>("/admin/stats"),

  users: (limit = 50, offset = 0, search?: string) =>
    request<any[]>(
      `/admin/users?limit=${limit}&offset=${offset}${search ? `&search=${search}` : ""}`
    ),

  payments: (limit = 50, offset = 0, status?: string) =>
    request<any[]>(
      `/admin/payments?limit=${limit}&offset=${offset}${status ? `&status_filter=${status}` : ""}`
    ),

  subscriptions: (limit = 50, offset = 0, activeOnly = false) =>
    request<any[]>(
      `/admin/subscriptions?limit=${limit}&offset=${offset}&active_only=${activeOnly}`
    ),

  grant: (telegramId: number, tariff: string, reason?: string) =>
    request<{ ok: boolean }>(`/admin/grant/${telegramId}`, {
      method: "POST",
      body: JSON.stringify({ tariff, reason }),
    }),
};

export { ApiError };
