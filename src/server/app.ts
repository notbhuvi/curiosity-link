import "dotenv/config";
import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import session from "express-session";
import geoip from "geoip-lite";
import helmet from "helmet";
import { UAParser } from "ua-parser-js";
import { requireAdmin, verifyAdmin } from "./auth.js";
import { pool, query } from "./db.js";
import { analyticsLimiter, getClientIp, hashIp, loginLimiter, toCsvCell } from "./security.js";
import { browserLocationSchema, loginSchema, settingsSchema, visitSchema } from "./validation.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const appOrigin = process.env.APP_ORIGIN || "http://localhost:5173";
const secureCookies = isProduction && appOrigin.startsWith("https://");

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required");
}

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
          }
        }
      : false
  })
);
app.use(
  cors({
    origin: isProduction ? appOrigin : ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true
  })
);
app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: false
    }),
    name: "curiosity.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/settings/public", async (_req, res, next) => {
  try {
    const result = await query<{
      landing_text: string;
      button_text: string;
      primary_color: string;
      accent_color: string;
      background_color: string;
    }>(
      "SELECT landing_text, button_text, primary_color, accent_color, background_color FROM settings WHERE id = 1"
    );
    res.json(toSettingsDto(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.post("/api/visits", analyticsLimiter, async (req, res, next) => {
  try {
    const body = visitSchema.parse(req.body);
    const parser = new UAParser(req.headers["user-agent"] || "");
    const device = parser.getDevice();
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const deviceType = device.type || "desktop";
    const ip = getClientIp(req);
    const geo = ip ? geoip.lookup(ip) : null;

    await query(
      `INSERT INTO visits (
        visitor_id,
        device_type,
        browser,
        operating_system,
        screen_resolution,
        language,
        country,
        city,
        latitude,
        longitude,
        location_accuracy,
        location_source,
        referrer,
        ip_hash,
        user_agent
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        body.visitorId,
        deviceType,
        browser.name || "Unknown",
        os.name || "Unknown",
        body.screenResolution,
        body.language,
        geo?.country || "Unknown",
        geo?.city || "Unknown",
        geo?.ll?.[0] ?? null,
        geo?.ll?.[1] ?? null,
        null,
        "ip",
        body.referrer || null,
        hashIp(ip),
        req.headers["user-agent"] || null
      ]
    );

    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/visits/location", analyticsLimiter, async (req, res, next) => {
  try {
    const body = browserLocationSchema.parse(req.body);
    await query(
      `UPDATE visits
       SET latitude = $1,
           longitude = $2,
           location_accuracy = $3,
           location_source = 'browser'
       WHERE id = (
         SELECT id
         FROM visits
         WHERE visitor_id = $4
           AND visited_at >= now() - interval '30 minutes'
         ORDER BY visited_at DESC
         LIMIT 1
       )`,
      [body.latitude, body.longitude, body.accuracy ?? null, body.visitorId]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/login", loginLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const admin = await verifyAdmin(body.username, body.password);
    if (!admin) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    req.session.adminUserId = admin.id;
    res.json({ admin: { username: admin.username } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/logout", requireAdmin, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      next(error);
      return;
    }
    res.clearCookie("curiosity.sid");
    res.json({ ok: true });
  });
});

app.get("/api/admin/me", (req, res) => {
  res.json({ authenticated: Boolean(req.session.adminUserId) });
});

app.get("/api/admin/settings", requireAdmin, async (_req, res, next) => {
  try {
    const result = await query(
      "SELECT landing_text, button_text, primary_color, accent_color, background_color FROM settings WHERE id = 1"
    );
    res.json(toSettingsDto(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/settings", requireAdmin, async (req, res, next) => {
  try {
    const body = settingsSchema.parse(req.body);
    const result = await query(
      `UPDATE settings
       SET landing_text = $1, button_text = $2, primary_color = $3, accent_color = $4, background_color = $5, updated_at = now()
       WHERE id = 1
       RETURNING landing_text, button_text, primary_color, accent_color, background_color`,
      [body.landingText, body.buttonText, body.primaryColor, body.accentColor, body.backgroundColor]
    );
    res.json(toSettingsDto(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/analytics", requireAdmin, async (_req, res, next) => {
  try {
    const [
      totals,
      countries,
      devices,
      browsers,
      daily,
      recent
    ] = await Promise.all([
      query<{
        total_visits: string;
        unique_visitors: string;
        visits_today: string;
        visits_week: string;
      }>(
        `SELECT
          COUNT(*)::text AS total_visits,
          COUNT(DISTINCT visitor_id)::text AS unique_visitors,
          COUNT(*) FILTER (WHERE visited_at >= date_trunc('day', now()))::text AS visits_today,
          COUNT(*) FILTER (WHERE visited_at >= date_trunc('week', now()))::text AS visits_week
        FROM visits`
      ),
      query("SELECT country AS label, COUNT(*)::int AS value FROM visits GROUP BY country ORDER BY value DESC LIMIT 12"),
      query("SELECT device_type AS label, COUNT(*)::int AS value FROM visits GROUP BY device_type ORDER BY value DESC"),
      query("SELECT browser AS label, COUNT(*)::int AS value FROM visits GROUP BY browser ORDER BY value DESC LIMIT 12"),
      query(
        `SELECT to_char(day, 'YYYY-MM-DD') AS label, COALESCE(counts.value, 0)::int AS value
         FROM generate_series(current_date - interval '13 days', current_date, interval '1 day') AS day
         LEFT JOIN (
          SELECT date_trunc('day', visited_at)::date AS visit_day, COUNT(*) AS value
          FROM visits
          WHERE visited_at >= current_date - interval '13 days'
          GROUP BY visit_day
         ) counts ON counts.visit_day = day::date
         ORDER BY day`
      ),
      query(
        `SELECT visited_at, country, city, latitude, longitude, location_accuracy, location_source, device_type, browser, operating_system, referrer
         FROM visits
         ORDER BY visited_at DESC
         LIMIT 100`
      )
    ]);

    const totalRow = totals.rows[0] || {
      total_visits: "0",
      unique_visitors: "0",
      visits_today: "0",
      visits_week: "0"
    };

    res.json({
      totals: {
        totalVisits: Number(totalRow.total_visits),
        uniqueVisitors: Number(totalRow.unique_visitors),
        visitsToday: Number(totalRow.visits_today),
        visitsWeek: Number(totalRow.visits_week)
      },
      countries: countries.rows,
      devices: devices.rows,
      browsers: browsers.rows,
      daily: daily.rows,
      recent: recent.rows
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/analytics/export", requireAdmin, async (_req, res, next) => {
  try {
    const result = await query<{
      visited_at: Date;
      country: string;
      city: string;
      latitude: number | null;
      longitude: number | null;
      location_accuracy: number | null;
      location_source: string;
      device_type: string;
      browser: string;
      operating_system: string;
      screen_resolution: string;
      language: string;
      referrer: string | null;
      visitor_id: string;
    }>(
      `SELECT visited_at, country, city, latitude, longitude, location_accuracy, location_source, device_type, browser, operating_system, screen_resolution, language, referrer, visitor_id
       FROM visits
       ORDER BY visited_at DESC`
    );
    const headers = [
      "visited_at",
      "country",
      "city",
      "latitude",
      "longitude",
      "location_accuracy",
      "location_source",
      "device",
      "browser",
      "operating_system",
      "screen_resolution",
      "language",
      "referrer",
      "visitor_id"
    ];
    const lines = [headers.map(toCsvCell).join(",")];
    for (const row of result.rows) {
      lines.push(
        [
          row.visited_at,
          row.country,
          row.city,
          row.latitude,
          row.longitude,
          row.location_accuracy,
          row.location_source,
          row.device_type,
          row.browser,
          row.operating_system,
          row.screen_resolution,
          row.language,
          row.referrer,
          row.visitor_id
        ]
          .map(toCsvCell)
          .join(",")
      );
    }
    res.header("Content-Type", "text/csv");
    res.attachment(`curiosity-link-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(lines.join("\n"));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/analytics", requireAdmin, async (_req, res, next) => {
  try {
    await query("TRUNCATE visits");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (typeof error === "object" && error && "issues" in error) {
    res.status(400).json({ error: "Invalid request", details: error });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Something went wrong" });
});

export { app };

function toSettingsDto(row: any) {
  return {
    landingText: row.landing_text,
    buttonText: row.button_text,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    backgroundColor: row.background_color
  };
}
