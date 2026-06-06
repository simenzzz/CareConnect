-- Add type_of_booking, pet_id, and child_id to bookings table
ALTER TABLE bookings
ADD COLUMN type_of_booking VARCHAR(10) CHECK (type_of_booking IN ('PET', 'CHILD')),
ADD COLUMN pet_id INTEGER REFERENCES pets(id),
ADD COLUMN child_id INTEGER REFERENCES children(id);

-- Add comment for clarity
COMMENT ON COLUMN bookings.type_of_booking IS 'Type of booking: PET or CHILD';
COMMENT ON COLUMN bookings.pet_id IS 'Reference to pet if type_of_booking is PET';
COMMENT ON COLUMN bookings.child_id IS 'Reference to child if type_of_booking is CHILD';


