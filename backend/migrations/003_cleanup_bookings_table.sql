-- Clean up bookings table by removing child_id and pet_id columns
-- These are replaced by the junction tables booking_children and booking_pets
-- We're keeping type_of_booking and location_id as they are needed

-- First, let's see what data exists in these columns (for safety)
SELECT 
  id, 
  child_id, 
  pet_id, 
  type_of_booking,
  location_id
FROM bookings 
WHERE child_id IS NOT NULL OR pet_id IS NOT NULL;

-- If the above query shows bookings with child_id or pet_id, 
-- you may want to migrate them to junction tables first.
-- Here's how to do that:

-- Migrate pet_id to booking_pets junction table
INSERT INTO booking_pets (booking_id, pet_id)
SELECT id, pet_id 
FROM bookings 
WHERE pet_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM booking_pets bp 
    WHERE bp.booking_id = bookings.id AND bp.pet_id = bookings.pet_id
  );

-- Migrate child_id to booking_children junction table
INSERT INTO booking_children (booking_id, child_id)
SELECT id, child_id 
FROM bookings 
WHERE child_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM booking_children bc 
    WHERE bc.booking_id = bookings.id AND bc.child_id = bookings.child_id
  );

-- Now verify the migration
SELECT 
  b.id,
  b.type_of_booking,
  COUNT(DISTINCT bp.pet_id) as num_pets,
  COUNT(DISTINCT bc.child_id) as num_children
FROM bookings b
LEFT JOIN booking_pets bp ON b.id = bp.booking_id
LEFT JOIN booking_children bc ON b.id = bc.booking_id
GROUP BY b.id, b.type_of_booking
ORDER BY b.id;

-- Once verified, drop the columns
ALTER TABLE bookings DROP COLUMN IF EXISTS child_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS pet_id;

-- Verify the columns are gone
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;

