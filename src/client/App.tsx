import {
  BarChart3,
  Download,
  Eye,
  Globe2,
  LogOut,
  Palette,
  RefreshCcw,
  Save,
  Shield,
  Smartphone,
  Trash2,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Analytics,
  Settings,
  api,
  exportCsv,
  getVisitorId
} from "./api";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const fallbackSettings: Settings = {
  landingText: `🚫 I specifically told you not to click.

Yet here you are.

So now I have a few questions:

• Are you always this curious?
• Do you ignore all warnings or just mine?
• Or were you secretly hoping I’d notice?

Since you’ve already broken Rule #1, you might as well stay for a second.

Fun fact: Every person who reached this page thought they were just clicking a random link.

Now tell me—what made you do it? 😉`,
  buttonText: "Continue",
  primaryColor: "#ff4f93",
  accentColor: "#7c5cff",
  backgroundColor: "#070711"
};

export function App() {
  const isAdmin = window.location.pathname.startsWith("/admin");
  return isAdmin ? <AdminApp /> : <LandingPage />;
}

function LandingPage() {
  const [settings, setSettings] = useState<Settings>(fallbackSettings);
  const [continued, setContinued] = useState(false);

  useEffect(() => {
    api<Settings>("/api/settings/public")
      .then(setSettings)
      .catch(() => setSettings(fallbackSettings));
  }, []);

  useEffect(() => {
    const payload = {
      visitorId: getVisitorId(),
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language || "Unknown",
      referrer: document.referrer || ""
    };

    api("/api/visits", {
      method: "POST",
      body: JSON.stringify(payload)
    }).catch(() => undefined);
  }, []);

  const paragraphs = useMemo(
    () => settings.landingText.split(/\n{2,}/).filter(Boolean),
    [settings.landingText]
  );

  return (
    <main
      className="landing-shell"
      style={
        {
          "--primary": settings.primaryColor,
          "--accent": settings.accentColor,
          "--bg": settings.backgroundColor
        } as React.CSSProperties
      }
    >
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="landing-panel">
        <p className="eyebrow">Curiosity Link</p>
        <div className="copy-stack">
          {paragraphs.map((paragraph, index) => (
            <p key={paragraph} style={{ animationDelay: `${index * 90}ms` }}>
              {paragraph}
            </p>
          ))}
        </div>
        <button className="primary-button" onClick={() => setContinued(true)}>
          {settings.buttonText}
        </button>
        {continued && (
          <p className="after-note">Noted. Your curiosity has excellent timing.</p>
        )}
      </section>
    </main>
  );
}

function AdminApp() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ authenticated: boolean }>("/api/admin/me")
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) return <div className="admin-loading">Loading...</div>;
  if (!authenticated) return <Login onSuccess={() => setAuthenticated(true)} />;
  return <Dashboard onLogout={() => setAuthenticated(false)} />;
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-shell login-shell">
      <form className="login-card" onSubmit={submit}>
        <Shield size={32} />
        <h1>Private Dashboard</h1>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [notice, setNotice] = useState("");

  async function loadAll() {
    const [analyticsData, settingsData] = await Promise.all([
      api<Analytics>("/api/admin/analytics"),
      api<Settings>("/api/admin/settings")
    ]);
    setAnalytics(analyticsData);
    setSettings(settingsData);
  }

  useEffect(() => {
    loadAll().catch(() => setNotice("Could not load dashboard data."));
  }, []);

  async function logout() {
    await api("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    onLogout();
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    const next = await api<Settings>("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(settings)
    });
    setSettings(next);
    setNotice("Settings saved.");
  }

  async function resetAnalytics() {
    if (!confirm("Delete all analytics records? This cannot be undone.")) return;
    await api("/api/admin/analytics", { method: "DELETE" });
    await loadAll();
    setNotice("Analytics records deleted.");
  }

  if (!analytics || !settings) return <div className="admin-loading">Loading dashboard...</div>;

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Curiosity Link</p>
          <h1>Analytics Dashboard</h1>
        </div>
        <div className="header-actions">
          <button className="icon-button" onClick={() => loadAll()} title="Refresh">
            <RefreshCcw size={18} />
          </button>
          <button className="icon-button" onClick={logout} title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {notice && <p className="notice">{notice}</p>}

      <section className="metric-grid">
        <Metric icon={<Eye />} label="Total visits" value={analytics.totals.totalVisits} />
        <Metric icon={<Users />} label="Unique visitors" value={analytics.totals.uniqueVisitors} />
        <Metric icon={<BarChart3 />} label="Visits today" value={analytics.totals.visitsToday} />
        <Metric icon={<Globe2 />} label="Visits this week" value={analytics.totals.visitsWeek} />
      </section>

      <section className="dashboard-grid">
        <Panel title="Daily traffic">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={analytics.daily}>
              <defs>
                <linearGradient id="traffic" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#ff4f93" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ff4f93" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#b9bbca", fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: "#b9bbca", fontSize: 12 }} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#13131f", border: "1px solid rgba(255,255,255,.12)" }} />
              <Area type="monotone" dataKey="value" stroke="#ff4f93" fill="url(#traffic)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Country breakdown">
          <BreakdownChart data={analytics.countries} />
        </Panel>
        <Panel title="Device breakdown">
          <BreakdownList data={analytics.devices} icon={<Smartphone size={16} />} />
        </Panel>
        <Panel title="Browser breakdown">
          <BreakdownList data={analytics.browsers} icon={<Globe2 size={16} />} />
        </Panel>
      </section>

      <section className="table-panel">
        <div className="panel-title-row">
          <h2>Recent visitors</h2>
          <button className="secondary-button" onClick={exportCsv}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date & time</th>
                <th>Country</th>
                <th>City</th>
                <th>Device</th>
                <th>Browser</th>
                <th>Operating system</th>
                <th>Referrer</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recent.map((visit, index) => (
                <tr key={`${visit.visited_at}-${index}`}>
                  <td>{new Date(visit.visited_at).toLocaleString()}</td>
                  <td>{visit.country}</td>
                  <td>{visit.city}</td>
                  <td>{visit.device_type}</td>
                  <td>{visit.browser}</td>
                  <td>{visit.operating_system}</td>
                  <td>{visit.referrer || "Direct"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="settings-panel">
        <div className="panel-title-row">
          <h2>Settings</h2>
          <Palette size={20} />
        </div>
        <form onSubmit={saveSettings} className="settings-form">
          <label>
            Landing page text
            <textarea
              value={settings.landingText}
              onChange={(event) => setSettings({ ...settings, landingText: event.target.value })}
            />
          </label>
          <label>
            Button text
            <input
              value={settings.buttonText}
              onChange={(event) => setSettings({ ...settings, buttonText: event.target.value })}
            />
          </label>
          <div className="color-grid">
            <ColorInput label="Primary" value={settings.primaryColor} onChange={(value) => setSettings({ ...settings, primaryColor: value })} />
            <ColorInput label="Accent" value={settings.accentColor} onChange={(value) => setSettings({ ...settings, accentColor: value })} />
            <ColorInput label="Background" value={settings.backgroundColor} onChange={(value) => setSettings({ ...settings, backgroundColor: value })} />
          </div>
          <div className="form-actions">
            <button className="primary-button">
              <Save size={16} />
              Save settings
            </button>
            <button className="danger-button" type="button" onClick={resetAnalytics}>
              <Trash2 size={16} />
              Reset statistics
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value.toLocaleString()}</strong>
    </article>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="chart-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function BreakdownChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#b9bbca", fontSize: 12 }} tickLine={false} />
        <YAxis tick={{ fill: "#b9bbca", fontSize: 12 }} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ background: "#13131f", border: "1px solid rgba(255,255,255,.12)" }} />
        <Bar dataKey="value" fill="#7c5cff" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function BreakdownList({ data, icon }: { data: { label: string; value: number }[]; icon: React.ReactNode }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="breakdown-list">
      {data.map((item) => (
        <div className="breakdown-row" key={item.label}>
          <span>{icon}{item.label || "Unknown"}</span>
          <div className="bar-track">
            <div style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <span className="color-control">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}
