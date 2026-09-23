import { z } from 'zod';

export const emailSchema = z.string().email('Ungültige E-Mail-Adresse').min(1).max(254);

export const passwordSchema = z
  .string()
  .min(8, 'Passwort muss mindestens 8 Zeichen haben')
  .max(128)
  .regex(/[A-Z]/, 'Mindestens ein Großbuchstabe erforderlich')
  .regex(/[a-z]/, 'Mindestens ein Kleinbuchstabe erforderlich')
  .regex(/[0-9]/, 'Mindestens eine Zahl erforderlich');

export const displayNameSchema = z
  .string()
  .min(2, 'Name muss mindestens 2 Zeichen haben')
  .max(50, 'Name darf maximal 50 Zeichen haben')
  .regex(/^[\p{L}\p{N}\s\-']+$/u, 'Name enthält ungültige Zeichen');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Ungültige Telefonnummer')
  .optional()
  .nullable();

export const petNameSchema = z.string().min(1).max(50);
export const petBreedSchema = z.string().max(50).optional().nullable();
export const petSpeciesSchema = z.enum(['dog', 'cat', 'rabbit', 'guinea_pig', 'bird', 'other']);

export const bookingTypeSchema = z.enum(['walk', 'feeding', 'vacation', 'daycare']);
export const bookingStatusSchema = z.enum([
  'requested',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
]);

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
});

export const hazardTypeSchema = z.enum([
  'poison_bait',
  'glass_shards',
  'wasp_nest',
  'aggressive_dog',
  'trap',
  'other',
]);
export const hazardSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const hazardStatusSchema = z.enum([
  'draft',
  'pending_review',
  'active',
  'resolved',
  'expired',
  'rejected',
]);

export const trustLevelSchema = z.enum(['basic', 'bronze', 'silver', 'gold']);
export const userRoleSchema = z.enum(['user', 'helper', 'admin']);

export const kiezRadiusSchema = z.enum(['0.5', '1.0', '1.5', '3.0']).transform(Number);

export const notificationPreferencesSchema = z.object({
  push_enabled: z.boolean().default(true),
  email_enabled: z.boolean().default(true),
  chat_messages: z.boolean().default(true),
  booking_updates: z.boolean().default(true),
  hazard_alerts: z.boolean().default(true),
  community_posts: z.boolean().default(false),
});

export const createBookingSchema = z.object({
  type: bookingTypeSchema,
  pet_id: z.string().uuid(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  meeting_address: z.string().min(5).max(200).optional(),
  key_handoff_type: z.enum(['lockbox', 'personal', 'smartlock', 'neighbor']).optional(),
  price_eur_cents: z.number().int().min(0).default(0),
  price_kiez_hours: z.number().min(0).default(0),
  currency: z.enum(['EUR', 'KIEZ_HOURS']).default('KIEZ_HOURS'),
});

export const updateProfileSchema = z.object({
  display_name: displayNameSchema.optional(),
  phone: phoneSchema,
  kiez_radius_km: kiezRadiusSchema.optional(),
  notification_prefs: notificationPreferencesSchema.partial().optional(),
  timezone: z.string().optional(),
  language: z.string().min(2).max(5).optional(),
});

export const createPetSchema = z.object({
  name: petNameSchema,
  species: petSpeciesSchema,
  breed: petBreedSchema,
  birth_date: z.string().date().optional().nullable(),
  weight_kg: z.number().positive().max(200).optional().nullable(),
  color: z.string().max(30).optional().nullable(),
  microchip_number: z.string().max(20).optional().nullable(),
});

export const createHazardSchema = z.object({
  type: hazardTypeSchema,
  severity: hazardSeveritySchema.default('medium'),
  location: locationSchema,
  address: z.string().min(5).max(200).optional(),
  radius_km: z.number().min(0.1).max(10).default(1.5),
  description: z.string().max(1000).optional(),
  photos: z.array(z.string().url()).max(5).default([]),
});

export const createMessageSchema = z.object({
  booking_id: z.string().uuid(),
  type: z.enum(['text', 'image', 'location', 'voice', 'system']).default('text'),
  content: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const timebankTransactionSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(['earned', 'spent', 'bonus', 'adjustment', 'transfer']),
  amount_hours: z.number().multipleOf(0.1),
  reference_type: z.string().min(1),
  reference_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(500),
});

export const deviceSchema = z.object({
  user_id: z.string().uuid(),
  platform: z.enum(['ios', 'android', 'web']),
  device_name: z.string().max(100).optional().nullable(),
  push_token: z.string().optional().nullable(),
  app_version: z.string().optional().nullable(),
});

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Validation failed: ${errors}`);
  }
  return result.data;
}
