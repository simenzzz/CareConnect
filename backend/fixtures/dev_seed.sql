-- CareConnect disposable development seed.
--
-- This script is executed by backend/fixtures/dev_seed.sh during first-time
-- Docker Postgres initialization, but only when all DEV_SEED_FIREBASE_UID_*
-- environment variables are set. It expects a fresh schema from migrations/init.sql.

BEGIN;

CREATE TEMP TABLE dev_seed_auth (
  user_key TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  firebase_uid TEXT NOT NULL,
  user_type TEXT NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE dev_seed_user_map (
  user_key TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE dev_seed_customer_map (
  customer_key TEXT PRIMARY KEY,
  customer_id INTEGER NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE dev_seed_sitter_map (
  sitter_key TEXT PRIMARY KEY,
  sitter_id INTEGER NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE dev_seed_booking_map (
  booking_key TEXT PRIMARY KEY,
  booking_id INTEGER NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE dev_seed_child_map (
  child_key TEXT PRIMARY KEY,
  child_id INTEGER NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE dev_seed_pet_map (
  pet_key TEXT PRIMARY KEY,
  pet_id INTEGER NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE dev_seed_location_map (
  location_key TEXT PRIMARY KEY,
  location_id INTEGER NOT NULL
) ON COMMIT DROP;

INSERT INTO dev_seed_auth (user_key, email, firebase_uid, user_type) VALUES
  ('customer_demo', 'customer.demo@careconnect.local', :'customer_uid', 'customer'),
  ('sitter_baby', 'sitter.baby@careconnect.local', :'sitter_baby_uid', 'sitter'),
  ('sitter_pet', 'sitter.pet@careconnect.local', :'sitter_pet_uid', 'sitter'),
  ('sitter_both', 'sitter.both@careconnect.local', :'sitter_both_uid', 'sitter'),
  ('sitter_unverified', 'sitter.unverified@careconnect.local', :'sitter_unverified_uid', 'sitter');

INSERT INTO users (firebase_uid, email, user_type)
SELECT firebase_uid, email, user_type
FROM dev_seed_auth;

INSERT INTO dev_seed_user_map (user_key, user_id)
SELECT a.user_key, u.id
FROM dev_seed_auth a
JOIN users u ON u.firebase_uid = a.firebase_uid;

DO $$
DECLARE
  v_user_id INTEGER;
  v_new_id INTEGER;
BEGIN
  SELECT user_id INTO v_user_id FROM dev_seed_user_map WHERE user_key = 'customer_demo';
  INSERT INTO customers (user_id, full_name, date_of_birth, phone, area, city)
  VALUES (v_user_id, 'Maya Haddad', DATE '1990-04-12', '+961 70 100 200', 'Achrafieh', 'Beirut')
  RETURNING id INTO v_new_id;
  INSERT INTO dev_seed_customer_map VALUES ('customer_demo', v_new_id);

  SELECT user_id INTO v_user_id FROM dev_seed_user_map WHERE user_key = 'sitter_baby';
  INSERT INTO sitters (
    user_id, full_name, age, date_of_birth, area, city, latitude, longitude,
    phone, hours_per_week, sitter_type, experience, description,
    profile_image_url, profile_image_path, cv_url,
    identity_document_url, cv_uploaded_at, identity_document_uploaded_at,
    is_active, is_verified
  )
  VALUES (
    v_user_id, 'Nour Khoury', 27, DATE '1998-03-18', 'Achrafieh', 'Beirut',
    33.8899000, 35.5163000, '+961 71 210 110', 32, 'B',
    'Five years supporting toddlers, homework routines, and evening care.',
    'Calm baby-sitter focused on routines, early learning, and clear parent updates.',
    'https://example.invalid/dev-seed/profile/nour-khoury.jpg',
    'sitter-profile-images/dev-seed-sitter-baby/profile.jpg',
    'https://example.invalid/dev-seed/cv/nour-khoury.pdf',
    'https://example.invalid/dev-seed/kyc/nour-khoury.pdf',
    NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', TRUE, TRUE
  )
  RETURNING id INTO v_new_id;
  INSERT INTO dev_seed_sitter_map VALUES ('sitter_baby', v_new_id);

  SELECT user_id INTO v_user_id FROM dev_seed_user_map WHERE user_key = 'sitter_pet';
  INSERT INTO sitters (
    user_id, full_name, age, date_of_birth, area, city, latitude, longitude,
    phone, hours_per_week, sitter_type, experience, description,
    profile_image_url, profile_image_path, cv_url,
    identity_document_url, cv_uploaded_at, identity_document_uploaded_at,
    is_active, is_verified
  )
  VALUES (
    v_user_id, 'Karim Mansour', 31, DATE '1994-09-05', 'Hamra', 'Beirut',
    33.8957000, 35.4822000, '+961 76 220 120', 28, 'P',
    'Experienced with dogs, cats, medication reminders, and anxious pets.',
    'Patient pet-sitter available for walks, feeding, and overnight check-ins.',
    'https://example.invalid/dev-seed/profile/karim-mansour.jpg',
    'sitter-profile-images/dev-seed-sitter-pet/profile.jpg',
    'https://example.invalid/dev-seed/cv/karim-mansour.pdf',
    'https://example.invalid/dev-seed/kyc/karim-mansour.pdf',
    NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days', TRUE, TRUE
  )
  RETURNING id INTO v_new_id;
  INSERT INTO dev_seed_sitter_map VALUES ('sitter_pet', v_new_id);

  SELECT user_id INTO v_user_id FROM dev_seed_user_map WHERE user_key = 'sitter_both';
  INSERT INTO sitters (
    user_id, full_name, age, date_of_birth, area, city, latitude, longitude,
    phone, hours_per_week, sitter_type, experience, description,
    profile_image_url, profile_image_path, cv_url,
    identity_document_url, cv_uploaded_at, identity_document_uploaded_at,
    is_active, is_verified
  )
  VALUES (
    v_user_id, 'Lea Saad', 29, DATE '1996-01-22', 'Badaro', 'Beirut',
    33.8736000, 35.5139000, '+961 81 230 130', 40, 'T',
    'Works with families who need mixed child and pet care during long days.',
    'Flexible sitter for children and pets, comfortable with structured schedules.',
    'https://example.invalid/dev-seed/profile/lea-saad.jpg',
    'sitter-profile-images/dev-seed-sitter-both/profile.jpg',
    'https://example.invalid/dev-seed/cv/lea-saad.pdf',
    'https://example.invalid/dev-seed/kyc/lea-saad.pdf',
    NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', TRUE, TRUE
  )
  RETURNING id INTO v_new_id;
  INSERT INTO dev_seed_sitter_map VALUES ('sitter_both', v_new_id);

  SELECT user_id INTO v_user_id FROM dev_seed_user_map WHERE user_key = 'sitter_unverified';
  INSERT INTO sitters (
    user_id, full_name, age, date_of_birth, area, city, latitude, longitude,
    phone, hours_per_week, sitter_type, experience, description,
    profile_image_url, profile_image_path, cv_url,
    identity_document_url, cv_uploaded_at, identity_document_uploaded_at,
    is_active, is_verified
  )
  VALUES (
    v_user_id, 'Tala Farah', 25, DATE '2000-06-14', 'Jounieh', 'Keserwan',
    33.9808000, 35.6178000, '+961 79 240 140', 20, 'T',
    'New applicant awaiting document review.',
    'Unverified sitter seeded to test filtering and onboarding states.',
    'https://example.invalid/dev-seed/profile/tala-farah.jpg',
    'sitter-profile-images/dev-seed-sitter-unverified/profile.jpg',
    NULL, NULL, NULL, NULL, TRUE, FALSE
  )
  RETURNING id INTO v_new_id;
  INSERT INTO dev_seed_sitter_map VALUES ('sitter_unverified', v_new_id);
END $$;

DO $$
DECLARE
  v_customer_id INTEGER;
  v_new_id INTEGER;
BEGIN
  SELECT customer_id INTO v_customer_id
  FROM dev_seed_customer_map
  WHERE customer_key = 'customer_demo';

  INSERT INTO children (customer_id, name, age, gender, hobbies, school_type, special_needs)
  VALUES (v_customer_id, 'Adam Haddad', 6, 'male', 'lego reading drawing', 'International school', 'needs quiet bedtime routine')
  RETURNING id INTO v_new_id;
  INSERT INTO dev_seed_child_map VALUES ('adam', v_new_id);

  INSERT INTO children (customer_id, name, age, gender, hobbies, school_type, special_needs)
  VALUES (v_customer_id, 'Lina Haddad', 3, 'female', 'music puzzles pretend play', 'Nursery', 'peanut allergy')
  RETURNING id INTO v_new_id;
  INSERT INTO dev_seed_child_map VALUES ('lina', v_new_id);

  INSERT INTO pets (customer_id, name, age, type, breed, personality, care_instructions, special_needs)
  VALUES (v_customer_id, 'Milo', 4, 'dog', 'Cocker Spaniel', 'friendly energetic leash trained', 'two walks daily and dinner at 7pm', 'anxious during thunder')
  RETURNING id INTO v_new_id;
  INSERT INTO dev_seed_pet_map VALUES ('milo', v_new_id);

  INSERT INTO pets (customer_id, name, age, type, breed, personality, care_instructions, special_needs)
  VALUES (v_customer_id, 'Nala', 2, 'cat', 'Domestic Shorthair', 'shy playful independent', 'wet food morning and evening', 'keep indoors')
  RETURNING id INTO v_new_id;
  INSERT INTO dev_seed_pet_map VALUES ('nala', v_new_id);

  INSERT INTO user_locations (
    customer_id, location_name, address_name, street_name, building_name, floor,
    address_line, area, city, postal_code, latitude, longitude, is_default
  )
  VALUES (
    v_customer_id, 'Home', 'Sursock Home', 'Sursock Street', 'Haddad Building',
    '4', 'Sursock Street, Haddad Building, floor 4', 'Achrafieh', 'Beirut',
    '1100', 33.8909000, 35.5206000, TRUE
  )
  RETURNING id INTO v_new_id;
  INSERT INTO dev_seed_location_map VALUES ('home', v_new_id);

  INSERT INTO user_locations (
    customer_id, location_name, address_name, street_name, building_name, floor,
    address_line, area, city, postal_code, latitude, longitude, is_default
  )
  VALUES (
    v_customer_id, 'Grandparents', 'Hamra Family Apartment', 'Jeanne d Arc Street',
    'Mansour Residence', '2', 'Jeanne d Arc Street, Mansour Residence, floor 2',
    'Hamra', 'Beirut', '1103', 33.8971000, 35.4829000, FALSE
  )
  RETURNING id INTO v_new_id;
  INSERT INTO dev_seed_location_map VALUES ('grandparents', v_new_id);

  INSERT INTO user_locations (
    customer_id, location_name, address_name, street_name, building_name, floor,
    address_line, area, city, postal_code, latitude, longitude, is_default
  )
  VALUES (
    v_customer_id, 'Weekend Chalet', 'Jounieh Seaside', 'Old Coastal Road',
    'Cedars Block', '1', 'Old Coastal Road, Cedars Block, floor 1',
    'Jounieh', 'Keserwan', '1200', 33.9850000, 35.6230000, FALSE
  )
  RETURNING id INTO v_new_id;
  INSERT INTO dev_seed_location_map VALUES ('chalet', v_new_id);
END $$;

INSERT INTO sitter_skills (sitter_id, skill_name)
SELECT sm.sitter_id, seed.skill_name
FROM dev_seed_sitter_map sm
JOIN (
  VALUES
    ('sitter_baby', 'Toddlers'),
    ('sitter_baby', 'Homework help'),
    ('sitter_baby', 'Bedtime routine'),
    ('sitter_pet', 'Dog walking'),
    ('sitter_pet', 'Cat care'),
    ('sitter_pet', 'Medication reminders'),
    ('sitter_both', 'Mixed child and pet care'),
    ('sitter_both', 'Meal prep'),
    ('sitter_both', 'Structured schedules'),
    ('sitter_unverified', 'Awaiting verification')
) AS seed(sitter_key, skill_name) ON seed.sitter_key = sm.sitter_key;

INSERT INTO sitter_availability (sitter_id, day_of_week, start_time, end_time)
SELECT sm.sitter_id, seed.day_of_week, seed.start_time::time, seed.end_time::time
FROM dev_seed_sitter_map sm
JOIN (
  VALUES
    ('sitter_baby', 1, '08:00', '18:00'),
    ('sitter_baby', 2, '08:00', '18:00'),
    ('sitter_baby', 3, '08:00', '18:00'),
    ('sitter_baby', 4, '08:00', '18:00'),
    ('sitter_pet', 1, '07:00', '13:00'),
    ('sitter_pet', 3, '07:00', '13:00'),
    ('sitter_pet', 5, '15:00', '21:00'),
    ('sitter_both', 1, '09:00', '20:00'),
    ('sitter_both', 2, '09:00', '20:00'),
    ('sitter_both', 4, '09:00', '20:00'),
    ('sitter_both', 6, '10:00', '18:00'),
    ('sitter_unverified', 2, '10:00', '16:00')
) AS seed(sitter_key, day_of_week, start_time, end_time) ON seed.sitter_key = sm.sitter_key;

DO $$
DECLARE
  v_customer_id INTEGER;
  v_home_location_id INTEGER;
  v_grandparents_location_id INTEGER;
  v_chalet_location_id INTEGER;
  v_baby_sitter_id INTEGER;
  v_pet_sitter_id INTEGER;
  v_both_sitter_id INTEGER;
  v_new_booking_id INTEGER;
BEGIN
  SELECT customer_id INTO v_customer_id
  FROM dev_seed_customer_map
  WHERE customer_key = 'customer_demo';

  SELECT location_id INTO v_home_location_id
  FROM dev_seed_location_map
  WHERE location_key = 'home';

  SELECT location_id INTO v_grandparents_location_id
  FROM dev_seed_location_map
  WHERE location_key = 'grandparents';

  SELECT location_id INTO v_chalet_location_id
  FROM dev_seed_location_map
  WHERE location_key = 'chalet';

  SELECT sitter_id INTO v_baby_sitter_id
  FROM dev_seed_sitter_map
  WHERE sitter_key = 'sitter_baby';

  SELECT sitter_id INTO v_pet_sitter_id
  FROM dev_seed_sitter_map
  WHERE sitter_key = 'sitter_pet';

  SELECT sitter_id INTO v_both_sitter_id
  FROM dev_seed_sitter_map
  WHERE sitter_key = 'sitter_both';

  INSERT INTO bookings (
    sitter_id, customer_id, location_id, booking_from, booking_to, payment_method,
    price_usd, discount, status, type_of_booking, additional_notes
  )
  VALUES (
    v_baby_sitter_id, v_customer_id, v_home_location_id,
    NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days' + INTERVAL '4 hours',
    'CASH', 80.00, 0.00, 'COMPLETED', 'CHILD',
    'Completed child-care booking for review and history testing.'
  )
  RETURNING id INTO v_new_booking_id;
  INSERT INTO dev_seed_booking_map VALUES ('completed_child_reviewed', v_new_booking_id);

  INSERT INTO bookings (
    sitter_id, customer_id, location_id, booking_from, booking_to, payment_method,
    price_usd, discount, status, type_of_booking, additional_notes
  )
  VALUES (
    v_both_sitter_id, v_customer_id, v_grandparents_location_id,
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '3 hours',
    'CASH', 65.00, 0.00, 'COMPLETED', 'PET',
    'Completed pet-care booking without a review yet.'
  )
  RETURNING id INTO v_new_booking_id;
  INSERT INTO dev_seed_booking_map VALUES ('completed_pet_unreviewed', v_new_booking_id);

  INSERT INTO bookings (
    sitter_id, customer_id, location_id, booking_from, booking_to, payment_method,
    price_usd, discount, status, type_of_booking, additional_notes
  )
  VALUES (
    v_baby_sitter_id, v_customer_id, v_home_location_id,
    NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '5 hours',
    'CASH', 95.00, 10.00, 'UPCOMING', 'CHILD',
    'Upcoming child-care booking that can be edited or canceled.'
  )
  RETURNING id INTO v_new_booking_id;
  INSERT INTO dev_seed_booking_map VALUES ('upcoming_child_cash', v_new_booking_id);

  INSERT INTO bookings (
    sitter_id, customer_id, location_id, booking_from, booking_to, payment_method,
    price_usd, discount, status, type_of_booking, additional_notes
  )
  VALUES (
    v_pet_sitter_id, v_customer_id, v_grandparents_location_id,
    NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '4 hours',
    'CASH', 70.00, 0.00, 'UPCOMING', 'PET',
    'Upcoming pet-care booking that can be edited or canceled.'
  )
  RETURNING id INTO v_new_booking_id;
  INSERT INTO dev_seed_booking_map VALUES ('upcoming_pet_cash', v_new_booking_id);

  INSERT INTO bookings (
    sitter_id, customer_id, location_id, booking_from, booking_to, payment_method,
    price_usd, discount, status, type_of_booking, additional_notes
  )
  VALUES (
    v_both_sitter_id, v_customer_id, v_chalet_location_id,
    NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days' + INTERVAL '2 hours',
    'CASH', 40.00, 0.00, 'CANCELED', 'PET',
    'Canceled booking that should not block matching availability.'
  )
  RETURNING id INTO v_new_booking_id;
  INSERT INTO dev_seed_booking_map VALUES ('canceled_pet', v_new_booking_id);

  INSERT INTO bookings (
    sitter_id, customer_id, location_id, booking_from, booking_to, payment_method,
    price_usd, discount, status, type_of_booking, additional_notes
  )
  VALUES (
    v_both_sitter_id, v_customer_id, v_home_location_id,
    NOW() + INTERVAL '8 days', NOW() + INTERVAL '8 days' + INTERVAL '4 hours',
    'WISHMONEY', 110.00, 0.00, 'COMPLETED', 'CHILD',
    'Mocked completed Whish booking for payment-detail testing.'
  )
  RETURNING id INTO v_new_booking_id;
  INSERT INTO dev_seed_booking_map VALUES ('whish_completed_child', v_new_booking_id);

  INSERT INTO bookings (
    sitter_id, customer_id, location_id, booking_from, booking_to, payment_method,
    price_usd, discount, status, type_of_booking, additional_notes
  )
  VALUES (
    v_pet_sitter_id, v_customer_id, v_chalet_location_id,
    NOW() + INTERVAL '12 days', NOW() + INTERVAL '12 days' + INTERVAL '3 hours',
    'WISHMONEY', 75.00, 5.00, 'UPCOMING', 'PET',
    'Mocked pending Whish booking; no real Whish call is required.'
  )
  RETURNING id INTO v_new_booking_id;
  INSERT INTO dev_seed_booking_map VALUES ('whish_pending_pet', v_new_booking_id);

  INSERT INTO bookings (
    sitter_id, customer_id, location_id, booking_from, booking_to, payment_method,
    price_usd, discount, status, type_of_booking, additional_notes
  )
  VALUES (
    v_baby_sitter_id, v_customer_id, v_grandparents_location_id,
    NOW() + INTERVAL '15 days', NOW() + INTERVAL '15 days' + INTERVAL '3 hours',
    'WISHMONEY', 85.00, 0.00, 'UPCOMING', 'CHILD',
    'Mocked failed Whish booking; useful for retry/error UI.'
  )
  RETURNING id INTO v_new_booking_id;
  INSERT INTO dev_seed_booking_map VALUES ('whish_failed_child', v_new_booking_id);
END $$;

INSERT INTO booking_children (booking_id, child_id)
SELECT bm.booking_id, ch.id
FROM dev_seed_booking_map bm
JOIN bookings b ON b.id = bm.booking_id
JOIN dev_seed_child_map cm ON TRUE
JOIN children ch ON ch.id = cm.child_id AND ch.customer_id = b.customer_id
JOIN (
  VALUES
    ('completed_child_reviewed', 'adam'),
    ('completed_child_reviewed', 'lina'),
    ('upcoming_child_cash', 'adam'),
    ('whish_completed_child', 'adam'),
    ('whish_completed_child', 'lina'),
    ('whish_failed_child', 'lina')
) AS seed(booking_key, child_key)
  ON seed.booking_key = bm.booking_key AND seed.child_key = cm.child_key;

INSERT INTO booking_pets (booking_id, pet_id)
SELECT bm.booking_id, p.id
FROM dev_seed_booking_map bm
JOIN bookings b ON b.id = bm.booking_id
JOIN dev_seed_pet_map pm ON TRUE
JOIN pets p ON p.id = pm.pet_id AND p.customer_id = b.customer_id
JOIN (
  VALUES
    ('completed_pet_unreviewed', 'milo'),
    ('upcoming_pet_cash', 'milo'),
    ('upcoming_pet_cash', 'nala'),
    ('canceled_pet', 'nala'),
    ('whish_pending_pet', 'milo')
) AS seed(booking_key, pet_key)
  ON seed.booking_key = bm.booking_key AND seed.pet_key = pm.pet_key;

INSERT INTO payments (
  booking_id,
  amount,
  payment_method,
  payment_status,
  transaction_id,
  phone_number
)
SELECT
  bm.booking_id,
  seed.amount,
  seed.payment_method,
  seed.payment_status,
  seed.transaction_id,
  seed.phone_number
FROM dev_seed_booking_map bm
JOIN (
  VALUES
    ('completed_child_reviewed', 80.00, 'CASH', 'COMPLETED', 'CASH_DEV_COMPLETED_CHILD', NULL),
    ('completed_pet_unreviewed', 65.00, 'CASH', 'COMPLETED', 'CASH_DEV_COMPLETED_PET', NULL),
    ('upcoming_child_cash', 85.50, 'CASH', 'PENDING', 'CASH_DEV_UPCOMING_CHILD', NULL),
    ('upcoming_pet_cash', 70.00, 'CASH', 'PENDING', 'CASH_DEV_UPCOMING_PET', NULL),
    ('whish_completed_child', 110.00, 'WISHMONEY', 'COMPLETED', 'WHISH_DEV_COMPLETED_001', '+96170100200'),
    ('whish_pending_pet', 71.25, 'WISHMONEY', 'PENDING', 'WHISH_DEV_PENDING_001', '+96170100200'),
    ('whish_failed_child', 85.00, 'WISHMONEY', 'FAILED', 'WHISH_DEV_FAILED_001', '+96170100200')
) AS seed(booking_key, amount, payment_method, payment_status, transaction_id, phone_number)
  ON seed.booking_key = bm.booking_key;

INSERT INTO reviews (booking_id, sitter_id, customer_id, rating, comment)
SELECT b.id, b.sitter_id, b.customer_id, 5, 'Reliable, kind, and very clear with updates.'
FROM dev_seed_booking_map bm
JOIN bookings b ON b.id = bm.booking_id
WHERE bm.booking_key = 'completed_child_reviewed';

UPDATE sitters s
SET rating = COALESCE(stats.avg_rating, 0),
    review_count = COALESCE(stats.review_count, 0),
    updated_at = NOW()
FROM (
  SELECT sitter_id, AVG(rating)::decimal(3, 2) AS avg_rating, COUNT(*)::int AS review_count
  FROM reviews
  GROUP BY sitter_id
) stats
WHERE s.id = stats.sitter_id;

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM dev_seed_auth;
  IF v_count <> 5 THEN RAISE EXCEPTION 'Expected 5 auth rows, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM dev_seed_user_map;
  IF v_count <> 5 THEN RAISE EXCEPTION 'Expected 5 user mappings, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM dev_seed_customer_map;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Expected 1 customer mapping, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM dev_seed_sitter_map;
  IF v_count <> 4 THEN RAISE EXCEPTION 'Expected 4 sitter mappings, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM dev_seed_child_map;
  IF v_count <> 2 THEN RAISE EXCEPTION 'Expected 2 child mappings, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM dev_seed_pet_map;
  IF v_count <> 2 THEN RAISE EXCEPTION 'Expected 2 pet mappings, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM dev_seed_location_map;
  IF v_count <> 3 THEN RAISE EXCEPTION 'Expected 3 location mappings, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM dev_seed_booking_map;
  IF v_count <> 8 THEN RAISE EXCEPTION 'Expected 8 booking mappings, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM sitter_skills ss JOIN dev_seed_sitter_map sm ON sm.sitter_id = ss.sitter_id;
  IF v_count <> 10 THEN RAISE EXCEPTION 'Expected 10 sitter skill rows, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM sitter_availability sa JOIN dev_seed_sitter_map sm ON sm.sitter_id = sa.sitter_id;
  IF v_count <> 12 THEN RAISE EXCEPTION 'Expected 12 sitter availability rows, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM booking_children bc JOIN dev_seed_booking_map bm ON bm.booking_id = bc.booking_id;
  IF v_count <> 6 THEN RAISE EXCEPTION 'Expected 6 booking_children rows, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM booking_pets bp JOIN dev_seed_booking_map bm ON bm.booking_id = bp.booking_id;
  IF v_count <> 5 THEN RAISE EXCEPTION 'Expected 5 booking_pets rows, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM payments p JOIN dev_seed_booking_map bm ON bm.booking_id = p.booking_id;
  IF v_count <> 7 THEN RAISE EXCEPTION 'Expected 7 payment rows, got %', v_count; END IF;

  SELECT COUNT(*) INTO v_count FROM reviews r JOIN dev_seed_booking_map bm ON bm.booking_id = r.booking_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Expected 1 review row, got %', v_count; END IF;
END $$;

COMMIT;
