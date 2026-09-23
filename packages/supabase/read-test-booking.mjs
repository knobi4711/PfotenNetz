#!/usr/bin/env node
/**
 * Reads the test booking by booking_number and verifies all fields.
 * Uses only anon key + user login (no service role key needed).
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

async function readTestBooking() {
  console.log('🔐 Signing in as Anna Test (test1@pfotennetz.local)...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test1@pfotennetz.local',
    password: 'TestPass123!',
  });

  if (authError) {
    console.error('❌ Sign in failed:', authError.message);
    process.exit(1);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`,
      },
    },
  });

  // Read the booking by booking_number
  console.log('📖 Reading booking BK-20260920-0001...\n');

  const { data: booking, error: readError } = await userClient
    .from('bookings')
    .select('*')
    .eq('booking_number', 'BK-20260920-0001')
    .single();

  if (readError || !booking) {
    console.error('❌ Booking not found:', readError?.message);
    process.exit(1);
  }

  console.log('✅ Booking found!\n');
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
  console.log('  Meeting Address:', booking.meeting_address);
  console.log('  Key Handoff Type:', booking.key_handoff_type);
  console.log('  Key Handoff Details:', JSON.stringify(booking.key_handoff_details));
  console.log('  Created At:', booking.created_at);
  console.log('  Updated At:', booking.updated_at);

  // Verify Bella belongs to Anna
  const { data: petData, error: petError } = await userClient
    .from('pets')
    .select('id, owner_id, name')
    .eq('id', 'bc67e70c-da9c-4d39-92fd-22195b78e204')
    .single();

  if (petError || !petData) {
    console.error('\n❌ Bella verification failed:', petError?.message);
  } else {
    console.log('\n✅ Pet Verification:');
    console.log('  Bella ID:', petData.id);
    console.log('  Bella Owner ID:', petData.owner_id);
    console.log('  Bella Name:', petData.name);
    console.log(
      '  Matches Anna:',
      petData.owner_id === '9074be6f-07f0-427b-ad8e-7740c888281c' ? '✅ Yes' : '❌ No'
    );
    console.log(
      '  Booking pet_id matches Bella:',
      booking.pet_id === petData.id ? '✅ Yes' : '❌ No'
    );
    console.log(
      '  Booking seeker_id matches Bella owner:',
      booking.seeker_id === petData.owner_id ? '✅ Yes' : '❌ No'
    );
  }

  // Verify all expected fields match
  console.log('\n📊 Field Validation:');
  const checks = [
    { field: 'booking_number', expected: 'BK-20260920-0001', actual: booking.booking_number },
    { field: 'type', expected: 'walk', actual: booking.type },
    { field: 'status', expected: 'requested', actual: booking.status },
    {
      field: 'seeker_id',
      expected: '9074be6f-07f0-427b-ad8e-7740c888281c',
      actual: booking.seeker_id,
    },
    {
      field: 'helper_id',
      expected: 'c5f05749-1428-494f-9372-6a0ab35776c5',
      actual: booking.helper_id,
    },
    { field: 'pet_id', expected: 'bc67e70c-da9c-4d39-92fd-22195b78e204', actual: booking.pet_id },
    { field: 'start_at', expected: '2026-09-25T10:00:00+02:00', actual: booking.start_at },
    { field: 'end_at', expected: '2026-09-25T11:00:00+02:00', actual: booking.end_at },
    { field: 'currency', expected: 'KIEZ_HOURS', actual: booking.currency },
    { field: 'price_kiez_hours', expected: 2.0, actual: booking.price_kiez_hours },
    { field: 'price_eur_cents', expected: 0, actual: booking.price_eur_cents },
  ];

  let allPassed = true;
  for (const check of checks) {
    const passed = check.actual === check.expected;
    console.log(
      `  ${passed ? '✅' : '❌'} ${check.field}: ${passed ? 'OK' : `MISMATCH (expected: ${check.expected}, got: ${check.actual})`}`
    );
    if (!passed) allPassed = false;
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL CHECKS PASSED');
    console.log('Booking ID:', booking.id);
  } else {
    console.log('❌ SOME CHECKS FAILED');
  }
}

readTestBooking().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
