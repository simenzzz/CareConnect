-- CareConnect authoritative schema (pre-launch).
--
-- This is the single init script for the desired end-state schema. While the
-- product is still in development, edit this file directly and re-apply it to a
-- fresh database. Do not add numbered migration files until there is production
-- data to preserve.
--
-- Fresh-DB first: CREATE TABLE IF NOT EXISTS makes a re-run safe, but it will not
-- alter existing live tables. Recreate disposable dev databases before applying.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Identity
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
  latitude                      DECIMAL(10, 7),
  longitude                     DECIMAL(10, 7),
  phone                         VARCHAR(30)  NOT NULL,
  hours_per_week                INTEGER      NOT NULL,
  sitter_type                   VARCHAR(1)   NOT NULL CHECK (sitter_type IN ('B', 'P', 'T')),
  experience                    TEXT,
  description                   TEXT,
  cv_url                        TEXT,
  identity_document_url         TEXT,
  cv_uploaded_at                TIMESTAMP,
  identity_document_uploaded_at TIMESTAMP,
  is_active                     BOOLEAN      NOT NULL DEFAULT TRUE,
  is_verified                   BOOLEAN      NOT NULL DEFAULT FALSE,
  rating                        DECIMAL(3, 2) NOT NULL DEFAULT 0,
  review_count                  INTEGER      NOT NULL DEFAULT 0,
  created_at                    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Care recipients
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

-- Locations
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

-- Bookings
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
  type_of_booking  VARCHAR(10)  CHECK (type_of_booking IN ('PET', 'CHILD')),
  additional_notes TEXT,
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    sitter_id WITH =,
    tstzrange(booking_from, booking_to, '[)') WITH &&
  ) WHERE (status <> 'CANCELED')
);

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

CREATE TABLE IF NOT EXISTS sitter_skills (
  id         SERIAL PRIMARY KEY,
  sitter_id  INTEGER NOT NULL REFERENCES sitters(id) ON DELETE CASCADE,
  skill_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('CARD', 'WISHMONEY', 'CASH')),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  transaction_id VARCHAR(255) UNIQUE,
  card_last_four VARCHAR(4),
  cardholder_name VARCHAR(255),
  phone_number VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_booking_id_key UNIQUE (booking_id)
);

COMMENT ON TABLE payments IS 'Stores payment information for bookings';
COMMENT ON COLUMN payments.payment_method IS 'CARD (credit/debit), WISHMONEY, or CASH';
COMMENT ON COLUMN payments.payment_status IS 'PENDING, PROCESSING, COMPLETED, FAILED, or REFUNDED';
COMMENT ON COLUMN payments.transaction_id IS 'Unique transaction ID from payment gateway';
COMMENT ON COLUMN payments.card_last_four IS 'Last 4 digits of card number (for display only)';
COMMENT ON COLUMN payments.phone_number IS 'Phone number used for Whish Money or mobile payments';
COMMENT ON COLUMN bookings.type_of_booking IS 'Type of booking: PET or CHILD';

-- Reviews and matching signals
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER  NOT NULL REFERENCES bookings(id)  ON DELETE CASCADE,
  sitter_id   INTEGER  NOT NULL REFERENCES sitters(id)   ON DELETE CASCADE,
  customer_id INTEGER  NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT reviews_booking_unique UNIQUE (booking_id)
);

CREATE TABLE IF NOT EXISTS sitter_availability (
  id          SERIAL PRIMARY KEY,
  sitter_id   INTEGER  NOT NULL REFERENCES sitters(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME     NOT NULL,
  end_time    TIME     NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT sitter_availability_window CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS match_events (
  id              SERIAL PRIMARY KEY,
  request_group   UUID     NOT NULL,
  customer_id     INTEGER  NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sitter_id       INTEGER  NOT NULL REFERENCES sitters(id)   ON DELETE CASCADE,
  location_id      INTEGER  NOT NULL REFERENCES user_locations(id) ON DELETE CASCADE,
  type_of_booking VARCHAR(10) NOT NULL CHECK (type_of_booking IN ('PET', 'CHILD')),
  booking_from     TIMESTAMPTZ NOT NULL,
  booking_to       TIMESTAMPTZ NOT NULL,
  rank            INTEGER  NOT NULL,
  score           DECIMAL(6, 4) NOT NULL,
  was_selected    BOOLEAN  NOT NULL DEFAULT FALSE,
  booking_id      INTEGER  REFERENCES bookings(id) ON DELETE SET NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
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
CREATE INDEX IF NOT EXISTS idx_payments_booking_id    ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status        ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_method        ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_reviews_sitter_id      ON reviews(sitter_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id    ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_sitter_availability_sitter ON sitter_availability(sitter_id);
CREATE INDEX IF NOT EXISTS idx_match_events_request_group ON match_events(request_group);
CREATE INDEX IF NOT EXISTS idx_match_events_customer_id   ON match_events(customer_id);
