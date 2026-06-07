-- 000: Baseline schema (pre-001).
--
-- ⚠️ RECONSTRUCTED, NOT YET pg_dump-VERIFIED.
-- The original schema was created ad-hoc against a live database; this baseline
-- was reconstructed from the application's INSERT/UPDATE/SELECT statements and the
-- known deltas (001–004). It captures the schema AS IT EXISTED BEFORE 001, so the
-- existing migrations apply cleanly on top:
--   * the `payments` table is intentionally absent (added by 001);
--   * `bookings` intentionally has NO `type_of_booking`/`pet_id`/`child_id`
--     (added by 002; the single-id columns are then dropped by 003).
-- Before trusting this in CI/staging, diff it against a real
-- `pg_dump --schema-only --no-owner --no-privileges` of the production DB and
-- reconcile exact types, NOT NULL/DEFAULT, and FK on-delete actions.
--
-- Idempotent (`IF NOT EXISTS`) so it is a safe no-op against an environment that
-- already has the live schema.

-- ── Identity ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  email        VARCHAR(255) NOT NULL UNIQUE,
  user_type    VARCHAR(20)  NOT NULL CHECK (user_type IN ('customer', 'sitter')),
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name     VARCHAR(255) NOT NULL,
  date_of_birth DATE         NOT NULL,
  phone         VARCHAR(30)  NOT NULL,
  area          VARCHAR(120) NOT NULL,
  city          VARCHAR(120) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sitters (
  id                            SERIAL PRIMARY KEY,
  user_id                       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name                     VARCHAR(255) NOT NULL,
  age                           INTEGER,
  date_of_birth                 DATE         NOT NULL,
  area                          VARCHAR(120) NOT NULL,
  city                          VARCHAR(120) NOT NULL,
  phone                         VARCHAR(30)  NOT NULL,
  hours_per_week                INTEGER      NOT NULL,
  -- 'B' baby-sitter, 'P' pet-sitter, 'T' both.
  sitter_type                   VARCHAR(1)   NOT NULL CHECK (sitter_type IN ('B', 'P', 'T')),
  experience                    TEXT,
  description                   TEXT,
  cv_url                        TEXT,
  identity_document_url         TEXT,
  cv_uploaded_at                TIMESTAMP,
  identity_document_uploaded_at TIMESTAMP,
  -- Bookable only when is_active = TRUE AND is_verified = TRUE.
  is_active                     BOOLEAN      NOT NULL DEFAULT TRUE,
  is_verified                   BOOLEAN      NOT NULL DEFAULT FALSE,
  rating                        DECIMAL(3, 2) NOT NULL DEFAULT 0,
  created_at                    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Care recipients (soft-deleted via is_active) ────────────────────────────
CREATE TABLE IF NOT EXISTS children (
  id            SERIAL PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  age           INTEGER,
  gender        VARCHAR(20),
  hobbies       TEXT,
  school_type   VARCHAR(120),
  special_needs TEXT,
  is_active     BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pets (
  id                SERIAL PRIMARY KEY,
  customer_id       INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  age               INTEGER,
  type              VARCHAR(50),
  breed             VARCHAR(120),
  personality       TEXT,
  care_instructions TEXT,
  special_needs     TEXT,
  is_active         BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Locations (soft-deleted via is_active) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS user_locations (
  id            SERIAL PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_name VARCHAR(255),
  address_name  VARCHAR(255),
  street_name   VARCHAR(255),
  building_name VARCHAR(255),
  floor         VARCHAR(50),
  address_line  TEXT,
  area          VARCHAR(120),
  city          VARCHAR(120),
  postal_code   VARCHAR(20),
  latitude      DECIMAL(10, 7),
  longitude     DECIMAL(10, 7),
  is_default    BOOLEAN   NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Bookings (pre-002: no type_of_booking/pet_id/child_id) ───────────────────
-- booking_from/booking_to are timestamptz so migration 004's tstzrange overlap
-- constraint applies without modification. If a real pg_dump shows these as
-- `timestamp without time zone`, change these to TIMESTAMP and 004 to tsrange.
CREATE TABLE IF NOT EXISTS bookings (
  id               SERIAL PRIMARY KEY,
  sitter_id        INTEGER NOT NULL REFERENCES sitters(id),
  customer_id      INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_id      INTEGER REFERENCES user_locations(id),
  booking_from     TIMESTAMPTZ  NOT NULL,
  booking_to       TIMESTAMPTZ  NOT NULL,
  payment_method   VARCHAR(50),
  price_usd        DECIMAL(10, 2) NOT NULL,
  discount         DECIMAL(5, 2)  NOT NULL DEFAULT 0,
  status           VARCHAR(20)  NOT NULL DEFAULT 'UPCOMING',
  additional_notes TEXT,
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Junction tables (a booking links many children and/or pets) ──────────────
CREATE TABLE IF NOT EXISTS booking_children (
  id         SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  child_id   INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  CONSTRAINT booking_children_unique UNIQUE (booking_id, child_id)
);

CREATE TABLE IF NOT EXISTS booking_pets (
  id         SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  pet_id     INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  CONSTRAINT booking_pets_unique UNIQUE (booking_id, pet_id)
);

-- ── Sitter skills ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sitter_skills (
  id         SERIAL PRIMARY KEY,
  sitter_id  INTEGER NOT NULL REFERENCES sitters(id) ON DELETE CASCADE,
  skill_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Indexes for common lookups ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_user_id      ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_sitters_user_id        ON sitters(user_id);
CREATE INDEX IF NOT EXISTS idx_children_customer_id   ON children(customer_id);
CREATE INDEX IF NOT EXISTS idx_pets_customer_id       ON pets(customer_id);
CREATE INDEX IF NOT EXISTS idx_locations_customer_id  ON user_locations(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_sitter_id     ON bookings(sitter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id   ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_children_bid   ON booking_children(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_pets_bid       ON booking_pets(booking_id);
CREATE INDEX IF NOT EXISTS idx_sitter_skills_sitter   ON sitter_skills(sitter_id);
