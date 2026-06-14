import { z } from 'zod';

/**
 * Validation schemas for the auth router's write boundaries.
 *
 * NOTE: these use `z.looseObject` (unknown keys pass through) on purpose. The
 * existing handlers accept both camelCase and snake_case keys and read fields
 * directly; stripping unknown keys could drop a field a handler relies on. Loose
 * objects still validate + coerce the fields we DO define, which is where the
 * security-relevant constraints live (ranges, types, required presence).
 */

const shortText = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(2000).optional();

// Accept real booleans or the strings "true"/"false". NOT z.coerce.boolean(),
// whose JS Boolean() semantics turn the string "false" into `true`.
const boolish = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((v) => v === true || v === 'true')
  .optional();

// --- Registration / profile (dual-case nested payload kept intact) ---

export const registerSchema = z.looseObject({
  idToken: z.string().min(1, 'idToken is required'),
  userType: z.enum(['customer', 'sitter']),
  profileData: z.looseObject({}),
});

export const profileUpdateSchema = z.looseObject({
  profileData: z.looseObject({}),
});

// --- Children ---

const childFields = {
  name: shortText,
  age: z.coerce.number({ message: 'age must be a number' }).int().min(0).max(18),
  schoolType: shortText,
  hobbies: optionalText,
  specialNeeds: optionalText,
};

export const childCreateSchema = z.looseObject(childFields);
export const childUpdateSchema = z.looseObject({
  name: childFields.name.optional(),
  age: childFields.age.optional(),
  schoolType: childFields.schoolType.optional(),
  hobbies: optionalText,
  specialNeeds: optionalText,
});

// --- Pets ---

const petFields = {
  name: shortText,
  type: shortText,
  age: z.coerce.number().int().min(0).max(100).optional(),
  breed: optionalText,
  personality: optionalText,
  careInstructions: optionalText,
  specialNeeds: optionalText,
};

export const petCreateSchema = z.looseObject(petFields);
export const petUpdateSchema = z.looseObject({
  ...petFields,
  name: petFields.name.optional(),
  type: petFields.type.optional(),
});

// --- Locations ---

const latitude = z.coerce.number().min(-90, 'latitude out of range').max(90, 'latitude out of range');
const longitude = z.coerce.number().min(-180, 'longitude out of range').max(180, 'longitude out of range');

export const locationCreateSchema = z.looseObject({
  locationName: shortText,
  area: shortText,
  city: shortText,
  latitude,
  longitude,
  addressName: optionalText,
  streetName: optionalText,
  buildingName: optionalText,
  floor: optionalText,
  addressLine: optionalText,
  postalCode: z.string().trim().max(20).optional(),
  isDefault: boolish,
});

export const locationUpdateSchema = z.looseObject({
  locationName: shortText.optional(),
  area: shortText.optional(),
  city: shortText.optional(),
  latitude: latitude.optional(),
  longitude: longitude.optional(),
  addressName: optionalText,
  streetName: optionalText,
  buildingName: optionalText,
  floor: optionalText,
  addressLine: optionalText,
  postalCode: z.string().trim().max(20).optional(),
  isDefault: boolish,
});

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must use HH:MM 24-hour format');

export const sitterAvailabilitySchema = z.looseObject({
  slots: z
    .array(
      z
        .looseObject({
          dayOfWeek: z.coerce.number().int().min(0).max(6),
          startTime: timeString,
          endTime: timeString,
        })
        .refine((slot) => slot.startTime < slot.endTime, {
          message: 'endTime must be after startTime',
          path: ['endTime'],
        }),
    )
    .max(56, 'too many availability slots'),
});
