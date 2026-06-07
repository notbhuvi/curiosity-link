CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_type TEXT NOT NULL,
  browser TEXT NOT NULL,
  operating_system TEXT NOT NULL,
  screen_resolution TEXT NOT NULL,
  language TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Unknown',
  city TEXT NOT NULL DEFAULT 'Unknown',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_accuracy DOUBLE PRECISION,
  location_source TEXT NOT NULL DEFAULT 'ip',
  referrer TEXT,
  ip_hash TEXT,
  user_agent TEXT
);

ALTER TABLE visits ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS location_source TEXT NOT NULL DEFAULT 'ip';

CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits (visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits (visitor_id);
CREATE INDEX IF NOT EXISTS idx_visits_country ON visits (country);
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  landing_text TEXT NOT NULL,
  button_text TEXT NOT NULL DEFAULT 'Continue',
  primary_color TEXT NOT NULL DEFAULT '#ff4f93',
  accent_color TEXT NOT NULL DEFAULT '#7c5cff',
  background_color TEXT NOT NULL DEFAULT '#070711',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO settings (id, landing_text, button_text, primary_color, accent_color, background_color)
VALUES (
  1,
  '🚫 I specifically told you not to click.

Yet here you are.

So now I have a few questions:

• Are you always this curious?
• Do you ignore all warnings or just mine?
• Or were you secretly hoping I’d notice?

Since you’ve already broken Rule #1, you might as well stay for a second.

Fun fact: Every person who reached this page thought they were just clicking a random link.

Now tell me—what made you do it? 😉',
  'Continue',
  '#ff4f93',
  '#7c5cff',
  '#070711'
)
ON CONFLICT (id) DO NOTHING;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
