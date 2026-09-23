#!/usr/bin/env node
/**
 * Creates a test booking as Anna Test (test1@pfotennetz.local)
 * Tests the RLS policy "Seeker create booking" via authenticated client.
 *
 * Usage: node scripts/create-test-booking.mjs
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY in .env
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

// Service role key for admin operations (profile verification)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Create admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestBooking() {
  console.log('🔐 Signing in as Anna Test (test1@pfotennetz.local)...\n');

  // Create client with anon key for authentication
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  // Sign in as Anna Test
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test1@pfotennetz.local',
    password: 'TestPass123!',
  });

  if (authError) {
    console.error('❌ Sign in failed:', authError.message);
    process.exit(1);
  }

  console.log(`✅ Signed in as: ${authData.user.email}`);
  console.log(`   User ID: ${authData.user.id}`);
  console.log(`   Session: ${authData.session ? 'Active' : 'None'}\n`);

  // Now create a new client with the user's session for RLS
  const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`,
      },
    },
  });

  // Verify the session works
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    console.error('❌ Failed to get user from session:', userError?.message);
    process.exit(1);
  }
  console.log(`✅ Authenticated as: ${user.email} (${user.id})\n`);

  // Verify the user ID matches expected seeker_id
  if (user.id !== '9074be6f-07f0-427b-ad8e-7740c888281c') {
    console.error(
      '❌ User ID mismatch! Expected 9074be6f-07f0-427b-ad8e-7740c888281c, got',
      user.id
    );
    process.exit(1);
  }
  console.log('✅ User ID matches expected seeker_id\n');

  // Verify Bella belongs to this user
  const { data: petData, error: petError } = await supabase
    .from('pets')
    .select('id, owner_id, name')
    .eq('id', 'bc67e70c-da9c-4d39-92fd-22195b78e204')
    .single();

  if (petError || !petData) {
    console.error('❌ Bella not found or not accessible:', petError?.message);
    process.exit(1);
  }

  if (petData.owner_id !== '9074be6f-07f0-427b-ad8e-7740c888281c') {
    console.error('❌ Bella does not belong to Anna Test!');
    process.exit(1);
  }
  console.log(`✅ Bella (${petData.id}) belongs to Anna Test\n`);

  // Verify helper exists (using admin client since RLS prevents reading other users' profiles)
  // We'll use the service role key for this verification only
  const { data: helper, error: helperError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, display_name')
    .eq('id', 'c5f05749-1428-494f-9372-6a0ab35776c5')
    .single();

  if (helperError || !helper) {
    console.error('❌ Helper not found:', helperError?.message);
    process.exit(1);
  }
  console.log(`✅ Helper verified: ${helper.display_name} (${helper.email})\n`);

  // Create the booking
  console.log('📝 Creating booking...\n');

  const bookingData = {
    booking_number: 'BK-20260920-0001',
    type: 'walk',
    status: 'requested',
    seeker_id: '9074be6f-07f0-427b-ad8e-7740c888281c',
    helper_id: 'c5f05749-1428-494f-9372-6a0ab35776c5',
    pet_id: 'bc67e70c-da9c-4d39-92fd-22195b78e204',
    start_at: '2026-09-25T10:00:00+02:00',
    end_at: '2026-09-25T11:00:00+02:00',
    meeting_address: 'Musterstraße 12, 10115 Berlin',
    meeting_location: 'POINT(13.4050 52.5200)',
    key_handoff_type: 'personal',
    key_handoff_details: { details: 'Schlüssel bei Anna abholen' },
    price_eur_cents: 0,
    price_kiez_hours: 2.0,
    currency: 'KIEZ_HOURS',
  };

  const { data: booking, error: insertError } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Booking creation failed:', insertError.message);
    console.error('   Code:', insertError.code);
    console.error('   Details:', insertError.details);
    console.error('   Hint:', insertError.hint);
    process.exit(1);
  }

  console.log('✅ Booking created successfully!\n');
  console.log('📋 Booking Details:');
  console.log('  ID:', booking.id);
  console.log('  Booking Number:', booking.booking_number);
  console.log('  Type:', booking.type);
  console.log('  Status:', booking.status);
  console.log('  Seeker ID:', booking.seeker_id);
  console.log('  Helper ID:', booking.helper_id);
  console.log('  Pet ID:', booking.pet_id);
  console.log('  Start:', booking.start_at);
  console.log('  End:', booking.end_at);
  console.log('  Currency:', booking.currency);
  console.log('  Price (KIEZ Hours):', booking.price_kiez_hours);
  console.log('  Price (EUR Cents):', booking.price_eur_cents);

  // Verify Bella belongs to Anna
  const { data: verifyPet, error: verifyError } = await supabase
    .from('pets')
    .select('id, owner_id, name')
    .eq('id', 'bc67e70c-da9c-4d39-92fd-22195b78e204')
    .single();

  if (verifyError || !verifyPet) {
    console.error('❌ Verification failed:', verifyError?.message);
  } else {
    console.log('\n✅ Verification:');
    console.log('  Bella ID:', verifyPet.id);
    console.log('  Bella Owner ID:', verifyPet.owner_id);
    console.log('  Bella Name:', verifyPet.name);
    console.log(
      '  Matches Anna:',
      verifyPet.owner_id === '9074be6f-07f0-427b-ad8e-7740c888281c' ? '✅ Yes' : '❌ No'
    );
  }

  console.log('\n✅ Test booking created successfully!');
  console.log('Booking ID:', booking.id);
}

createTestBooking().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
