# Bookings API Documentation

Base URL: `http://localhost:5000/api/bookings`

All endpoints require authentication via Firebase token in the `Authorization` header:
```
Authorization: Bearer <firebase-id-token>
```

---

## Endpoints

### 1. GET `/api/bookings`
Get all bookings for the authenticated user (customer or sitter).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "userType": "customer",
  "bookings": [
    {
      "id": 1,
      "sitterId": 5,
      "customerId": 3,
      "bookingFrom": "2025-01-10T10:00:00.000Z",
      "bookingTo": "2025-01-10T18:00:00.000Z",
      "paymentMethod": "Credit Card",
      "priceUsd": 150.00,
      "discount": 0.10,
      "status": "UPCOMING",
      "createdAt": "2025-01-04T12:00:00.000Z",
      "updatedAt": "2025-01-04T12:00:00.000Z",
      "sitter": {
        "name": "Jane Smith",
        "phone": "70123456",
        "area": "Mount Lebanon",
        "city": "Jounieh"
      },
      "children": [
        {
          "id": 1,
          "fullName": "John Doe Jr.",
          "dateOfBirth": "2018-05-15",
          "gender": "M"
        }
      ],
      "pets": []
    }
  ]
}
```

**Notes:**
- Customers will see sitter details in their bookings
- Sitters will see customer details in their bookings
- Returns empty array if no bookings found

---

### 2. GET `/api/bookings/:id`
Get a specific booking by ID.

**Authentication:** Required  
**Parameters:**
- `id` (path parameter): Booking ID

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": 1,
    "sitterId": 5,
    "customerId": 3,
    "bookingFrom": "2025-01-10T10:00:00.000Z",
    "bookingTo": "2025-01-10T18:00:00.000Z",
    "paymentMethod": "Credit Card",
    "priceUsd": 150.00,
    "discount": 0.10,
    "status": "UPCOMING",
    "createdAt": "2025-01-04T12:00:00.000Z",
    "updatedAt": "2025-01-04T12:00:00.000Z",
    "sitter": {
      "name": "Jane Smith",
      "phone": "70123456",
      "area": "Mount Lebanon",
      "city": "Jounieh"
    },
    "children": [
      {
        "id": 1,
        "fullName": "John Doe Jr.",
        "dateOfBirth": "2018-05-15",
        "gender": "M"
      }
    ],
    "pets": []
  }
}
```

**Error Responses:**
- `404`: Booking not found or access denied
- `400`: Invalid booking ID

---

### 3. POST `/api/bookings`
Create a new booking (customers only).

**Authentication:** Required (Customer only)

**Request Body:**
```json
{
  "sitterId": 5,
  "bookingFrom": "2025-01-10T10:00:00.000Z",
  "bookingTo": "2025-01-10T18:00:00.000Z",
  "paymentMethod": "Credit Card",
  "priceUsd": 150.00,
  "discount": 0.10,
  "matchEventId": 321,
  "childrenIds": [1, 2],
  "petIds": [3]
}
```

**Required Fields:**
- `sitterId`: ID of the sitter
- `bookingFrom`: Start datetime
- `bookingTo`: End datetime
- `priceUsd`: Booking price in USD
- At least one of `childrenIds` or `petIds` must be provided

**Optional Fields:**
- `paymentMethod`: Payment method (default: null)
- `discount`: Discount ratio from 0 to 1 (default: 0)
- `matchEventId`: suggestion impression id returned by `/api/bookings/suggestions`;
  when valid, it is marked selected and linked to the created booking

**Response:**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "booking": {
    "id": 1,
    "sitterId": 5,
    "customerId": 3,
    "bookingFrom": "2025-01-10T10:00:00.000Z",
    "bookingTo": "2025-01-10T18:00:00.000Z",
    "paymentMethod": "Credit Card",
    "priceUsd": 150.00,
    "discount": 0.10,
    "status": "UPCOMING",
    "createdAt": "2025-01-04T12:00:00.000Z",
    "childrenIds": [1, 2],
    "petIds": [3]
  }
}
```

**Error Responses:**
- `400`: Missing required fields or validation errors
- `403`: Only customers can create bookings
- `404`: Sitter not found or not available

**Validations:**
- Sitter must be active and verified
- Children must belong to the customer
- Pets must belong to the customer
- `bookingTo` must be after `bookingFrom`
- At least one child or pet must be included

---

### 4. PUT `/api/bookings/:id`
Update an existing booking.

**Authentication:** Required  
**Parameters:**
- `id` (path parameter): Booking ID

**Request Body (all fields optional):**
```json
{
  "bookingFrom": "2025-01-10T11:00:00.000Z",
  "bookingTo": "2025-01-10T19:00:00.000Z",
  "paymentMethod": "Cash",
  "priceUsd": 175.00,
  "discount": 0.15,
  "status": "ONGOING",
  "childrenIds": [1],
  "petIds": [3, 4]
}
```

**Valid Status Values:**
- `UPCOMING`
- `ONGOING`
- `COMPLETED`
- `CANCELED`

> `CONFIRMED` is **not** a client-settable status — it is written only by the
> verified Whish payment callback.

**Pricing lock:** once a payment has been initiated for a booking (a `payments`
row exists), the owning **customer** can no longer change `priceUsd`/`discount`
(returns `403`). This prevents lowering the agreed amount after the payment
amount has been computed. Sitters retain price control until payment starts.

**Response:**
```json
{
  "success": true,
  "message": "Booking updated successfully",
  "booking": {
    "id": 1,
    "sitterId": 5,
    "customerId": 3,
    "bookingFrom": "2025-01-10T11:00:00.000Z",
    "bookingTo": "2025-01-10T19:00:00.000Z",
    "paymentMethod": "Cash",
    "priceUsd": 175.00,
    "discount": 0.15,
    "status": "ONGOING",
    "updatedAt": "2025-01-04T13:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Invalid status or booking ID
- `403`: Price/discount change attempted by the customer after payment started
- `404`: Booking not found or access denied

**Notes:**
- Only customers can update `childrenIds` and `petIds`
- Both customers and sitters can update other fields
- Status can be updated by both parties

---

### 5. DELETE `/api/bookings/:id`
Delete/cancel a booking (UPCOMING bookings only).

**Authentication:** Required  
**Parameters:**
- `id` (path parameter): Booking ID

**Response:**
```json
{
  "success": true,
  "message": "Booking deleted successfully"
}
```

**Error Responses:**
- `400`: Cannot delete booking with status other than UPCOMING
- `404`: Booking not found or access denied

**Notes:**
- Only bookings with status `UPCOMING` can be deleted
- Deleting a booking will cascade delete all associated children and pets records
- Both customers and sitters can delete bookings they're part of

---

### 6. GET `/api/bookings/suggestions`

Return a **ranked shortlist of sitters** matched to a specific booking request. The
ranking is deterministic (no ML): a weighted, explainable score combining proximity,
rating, experience, needs-fit, and availability. See
`src/services/matching/` for the engine and `weights.ts` for the tunable weights.

**Authentication:** Required (customers only)

**Query parameters:**
- `typeOfBooking` (required): `PET` or `CHILD`
- `locationId` (required): a location belonging to the authenticated customer
- `bookingFrom`, `bookingTo` (required): ISO datetimes; `bookingTo` must be after `bookingFrom`
- `limit` (optional): 1–50, default 10

The customer (and the location/care-needs referenced) is resolved from the verified
token — `locationId` is validated against the caller's own locations and never trusted
for authorization.

**Hard filters (a sitter must pass all to be a candidate):**
- `is_active = true AND is_verified = true`
- `sitter_type` matches the booking type (`CHILD` → `B`/`T`, `PET` → `P`/`T`)
- not already booked for any time overlapping `[bookingFrom, bookingTo)`
- within the configured max radius of the location (only when both have coordinates)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "fullName": "Nearby Proven",
      "area": "Beirut",
      "city": "Hamra",
      "hoursPerWeek": 30,
      "sitterType": "B",
      "description": null,
      "rating": 4.8,
      "experience": null,
      "skills": ["First Aid"],
      "createdAt": "2026-01-01T00:00:00Z",
      "matchScore": 0.83,
      "matchReasons": ["About 0.0 km away", "Rated 4.8★ across 30 reviews"],
      "matchEventId": 321
    }
  ],
  "meta": { "typeOfBooking": "CHILD", "count": 1 }
}
```

Contact PII (phone) is never included. `matchScore` is in `[0,1]`; `matchReasons` are the
top contributing factors for the "why this match" explanation. `matchEventId` is
best-effort and may be absent if impression logging fails; pass it to booking creation
when present.

**Error Responses:**
- `400`: invalid query, or location does not belong to the customer
- `403`: caller is not a customer
- `404`: user or customer profile not found

---

### 7. Review write API

Base path: `/api/reviews`

Customers can review only their own `COMPLETED` bookings. The backend resolves the
customer from the Firebase token and recomputes the sitter's `rating` and
`review_count` in the same transaction.

**Create:**
```http
POST /api/reviews
```

```json
{
  "bookingId": 123,
  "rating": 5,
  "comment": "Great care and communication."
}
```

**Update:**
```http
PUT /api/reviews/123
```

```json
{
  "rating": 4,
  "comment": "Updated note."
}
```

Errors: `400` for non-completed bookings or validation, `403` for non-customers,
`404` when the booking/review is not token-scoped to the customer, and `409` when
creating a duplicate review for the same booking.

---

## Database Schema

### bookings table
- `id`: SERIAL PRIMARY KEY
- `sitter_id`: INTEGER (references sitters)
- `customer_id`: INTEGER (references customers)
- `booking_from`: TIMESTAMP
- `booking_to`: TIMESTAMP
- `payment_method`: VARCHAR(50)
- `price_usd`: DECIMAL(10, 2)
- `discount`: DECIMAL(3, 2) (0.00 to 1.00)
- `status`: VARCHAR(20) (CANCELED, ONGOING, COMPLETED, UPCOMING)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP (auto-updates)

### booking_children table
- `id`: SERIAL PRIMARY KEY
- `booking_id`: INTEGER (references bookings)
- `child_id`: INTEGER (references children)
- `created_at`: TIMESTAMP

### booking_pets table
- `id`: SERIAL PRIMARY KEY
- `booking_id`: INTEGER (references bookings)
- `pet_id`: INTEGER (references pets)
- `created_at`: TIMESTAMP

---

## Example Usage

### Create a booking with children and pets
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sitterId": 5,
    "bookingFrom": "2025-01-10T10:00:00.000Z",
    "bookingTo": "2025-01-10T18:00:00.000Z",
    "paymentMethod": "Credit Card",
    "priceUsd": 150.00,
    "discount": 0.10,
    "childrenIds": [1, 2],
    "petIds": [3]
  }'
```

### Update booking status
```bash
curl -X PUT http://localhost:5000/api/bookings/1 \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED"
  }'
```

### Get all my bookings
```bash
curl -X GET http://localhost:5000/api/bookings \
  -H "Authorization: Bearer <firebase-token>"
```

### Delete a booking
```bash
curl -X DELETE http://localhost:5000/api/bookings/1 \
  -H "Authorization: Bearer <firebase-token>"
```
