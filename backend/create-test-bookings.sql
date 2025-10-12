-- First, let's find the sitter with email sitterbook@gmail.com
-- SELECT s.id, s.full_name FROM sitters s JOIN users u ON s.user_id = u.id WHERE u.email = 'sitterbook@gmail.com';

-- And find a customer with pets, children, and locations
-- SELECT c.id, c.full_name FROM customers c LIMIT 1;

-- Assuming sitter_id = 3 and customer_id = 1 (update these based on your data)
-- Also assuming you have pets (id 1,2), children (id 1,2), and locations (id 1,2,3)

-- Old pet booking (finished 2 days ago)
INSERT INTO bookings 
  (sitter_id, customer_id, location_id, booking_from, booking_to, payment_method, price_usd, discount, status, type_of_booking, pet_id, additional_notes)
VALUES 
  (
    (SELECT s.id FROM sitters s JOIN users u ON s.user_id = u.id WHERE u.email = 'sitterbook@gmail.com'),
    (SELECT id FROM customers LIMIT 1),
    (SELECT id FROM user_locations WHERE customer_id = (SELECT id FROM customers LIMIT 1) LIMIT 1),
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days',
    'CREDIT_CARD',
    75.00,
    0,
    'COMPLETED',
    'PET',
    (SELECT id FROM pets WHERE customer_id = (SELECT id FROM customers LIMIT 1) AND is_active = TRUE LIMIT 1),
    'Test old pet booking'
  );

-- Upcoming pet booking (tomorrow)
INSERT INTO bookings 
  (sitter_id, customer_id, location_id, booking_from, booking_to, payment_method, price_usd, discount, status, type_of_booking, pet_id, additional_notes)
VALUES 
  (
    (SELECT s.id FROM sitters s JOIN users u ON s.user_id = u.id WHERE u.email = 'sitterbook@gmail.com'),
    (SELECT id FROM customers LIMIT 1),
    (SELECT id FROM user_locations WHERE customer_id = (SELECT id FROM customers LIMIT 1) OFFSET 1 LIMIT 1),
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day' + INTERVAL '4 hours',
    'CASH',
    50.00,
    10,
    'UPCOMING',
    'PET',
    (SELECT id FROM pets WHERE customer_id = (SELECT id FROM customers LIMIT 1) AND is_active = TRUE OFFSET 1 LIMIT 1),
    'Test upcoming pet booking'
  );

-- Old child booking (finished 5 days ago)
INSERT INTO bookings 
  (sitter_id, customer_id, location_id, booking_from, booking_to, payment_method, price_usd, discount, status, type_of_booking, child_id, additional_notes)
VALUES 
  (
    (SELECT s.id FROM sitters s JOIN users u ON s.user_id = u.id WHERE u.email = 'sitterbook@gmail.com'),
    (SELECT id FROM customers LIMIT 1),
    (SELECT id FROM user_locations WHERE customer_id = (SELECT id FROM customers LIMIT 1) LIMIT 1),
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '5 days',
    'CREDIT_CARD',
    100.00,
    15,
    'COMPLETED',
    'CHILD',
    (SELECT id FROM children WHERE customer_id = (SELECT id FROM customers LIMIT 1) AND is_active = TRUE LIMIT 1),
    'Test old child booking'
  );

-- Upcoming child booking (3 days from now)
INSERT INTO bookings 
  (sitter_id, customer_id, location_id, booking_from, booking_to, payment_method, price_usd, discount, status, type_of_booking, child_id, additional_notes)
VALUES 
  (
    (SELECT s.id FROM sitters s JOIN users u ON s.user_id = u.id WHERE u.email = 'sitterbook@gmail.com'),
    (SELECT id FROM customers LIMIT 1),
    (SELECT id FROM user_locations WHERE customer_id = (SELECT id FROM customers LIMIT 1) OFFSET 2 LIMIT 1),
    NOW() + INTERVAL '3 days',
    NOW() + INTERVAL '3 days' + INTERVAL '6 hours',
    'CASH',
    120.00,
    0,
    'UPCOMING',
    'CHILD',
    (SELECT id FROM children WHERE customer_id = (SELECT id FROM customers LIMIT 1) AND is_active = TRUE OFFSET 1 LIMIT 1),
    'Test upcoming child booking'
  );

-- Another upcoming pet booking (next week)
INSERT INTO bookings 
  (sitter_id, customer_id, location_id, booking_from, booking_to, payment_method, price_usd, discount, status, type_of_booking, pet_id, additional_notes)
VALUES 
  (
    (SELECT s.id FROM sitters s JOIN users u ON s.user_id = u.id WHERE u.email = 'sitterbook@gmail.com'),
    (SELECT id FROM customers LIMIT 1),
    (SELECT id FROM user_locations WHERE customer_id = (SELECT id FROM customers LIMIT 1) LIMIT 1),
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '3 hours',
    'CREDIT_CARD',
    60.00,
    20,
    'UPCOMING',
    'PET',
    (SELECT id FROM pets WHERE customer_id = (SELECT id FROM customers LIMIT 1) AND is_active = TRUE LIMIT 1),
    'Test upcoming pet booking next week'
  );

-- Verify the bookings were created
SELECT 
  b.id,
  b.type_of_booking,
  b.booking_from,
  b.booking_to,
  b.price_usd,
  b.discount,
  b.status,
  CASE 
    WHEN p.name IS NOT NULL THEN p.name
    WHEN c.name IS NOT NULL THEN c.name
    ELSE 'N/A'
  END as entity_name
FROM bookings b
LEFT JOIN pets p ON b.pet_id = p.id
LEFT JOIN children c ON b.child_id = c.id
WHERE b.sitter_id = (SELECT s.id FROM sitters s JOIN users u ON s.user_id = u.id WHERE u.email = 'sitterbook@gmail.com')
ORDER BY b.booking_from;

