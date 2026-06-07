export type Settings = {
  landingText: string;
  buttonText: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
};

export type Analytics = {
  totals: {
    totalVisits: number;
    uniqueVisitors: number;
    visitsToday: number;
    visitsWeek: number;
  };
  countries: Breakdown[];
  devices: Breakdown[];
  browsers: Breakdown[];
  daily: Breakdown[];
  recent: RecentVisit[];
};

export type Breakdown = {
  label: string;
  value: number;
};

export type RecentVisit = {
  visited_at: string;
  country: string;
  city: string;
  device_type: string;
  browser: string;
  operating_system: string;
  referrer: string | null;
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const message = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(message.error || "Request failed");
  }

  return response.json();
}

export function getVisitorId() {
  const key = "curiosity_link_visitor_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  document.cookie = `curiosity_visitor=${id}; Max-Age=31536000; Path=/; SameSite=Lax`;
  return id;
}

export async function exportCsv() {
  const response = await fetch("/api/admin/analytics/export", { credentials: "include" });
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `curiosity-link-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
