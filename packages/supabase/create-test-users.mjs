#!/usr/bin/env node
/**
 * Creates 5 test users in the remote Supabase project for PfotenNetz.
 * Uses Supabase Management API (Admin API) with Service Role Key.
 *
 * Usage: node scripts/create-test-users.mjs
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Create admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test users to create
const testUsers = [
  { email: 'test1@pfotennetz.local', displayName: 'Anna Test', password: 'TestPass123!' },
  { email: 'test2@pfotennetz.local', displayName: 'Ben Test', password: 'TestPass123!' },
  { email: 'test3@pfotennetz.local', displayName: 'Clara Test', password: 'TestPass123!' },
  { email: 'test4@pfotennetz.local', displayName: 'David Test', password: 'TestPass123!' },
  { email: 'test5@pfotennetz.local', displayName: 'Eva Test', password: 'TestPass123!' },
];

async function createTestUsers() {
  console.log('🔍 Checking existing users...\n');

  // First, check which users already exist
  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError.message);
    process.exit(1);
  }

  const existingEmails = new Set(existingUsers.users.map((u) => u.email.toLowerCase()));

  const results = [];
  let created = 0;
  let existing = 0;
  let errors = 0;

  for (const testUser of testUsers) {
    const email = testUser.email.toLowerCase();

    console.log(`\n📧 Processing: ${email}`);

    if (existingEmails.has(email)) {
      console.log(`   ⏭️  Already exists, skipping creation`);
      existing++;

      // Still verify profile exists
      const existingUser = existingUsers.users.find((u) => u.email.toLowerCase() === email);
      if (existingUser) {
        // Check profile
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, display_name, role, trust_level, email')
          .eq('id', existingUser.id)
          .single();

        results.push({
          email,
          userId: existingUser.id,
          profileId: profile?.id || null,
          displayName: profile?.display_name || 'Existing',
          role: profile?.role || 'user',
          trustLevel: profile?.trust_level || 'basic',
          emailConfirmed: existingUser.email_confirmed_at ? 'Ja' : 'Nein',
          status: 'existing',
        });
      }
      continue;
    }

    // Create the auth user
    console.log(`   👤 Creating auth user...`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        display_name: testUser.displayName,
      },
    });

    if (authError) {
      console.error(`   ❌ Auth creation failed: ${authError.message}`);
      errors++;
      results.push({
        email,
        userId: null,
        profileId: null,
        displayName: testUser.displayName,
        role: 'user',
        emailConfirmed: 'Fehler',
        status: 'error',
        error: authError.message,
      });
      continue;
    }

    const userId = authData.user.id;
    console.log(`   ✅ Auth user created: ${userId}`);

    // Create profile
    console.log(`   📝 Creating profile...`);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: testUser.email,
        display_name: testUser.displayName,
        role: 'user',
        trust_level: 'basic',
      })
      .select()
      .single();

    if (profileError) {
      console.error(`   ❌ Profile creation failed: ${profileError.message}`);
      errors++;
      results.push({
        email,
        userId,
        profileId: null,
        displayName: testUser.displayName,
        role: 'user',
        emailConfirmed: 'Ja',
        status: 'error',
        error: profileError.message,
      });
      continue;
    }

    console.log(`   ✅ Profile created: ${profile.id}`);
    created++;
    results.push({
      email,
      userId,
      profileId: profile.id,
      displayName: profile.display_name,
      role: profile.role,
      trustLevel: profile.trust_level,
      emailConfirmed: 'Ja',
      status: 'created',
    });
  }

  // Verify all created users
  console.log('\n🔍 Verifying created users...\n');

  const { data: verifyUsers, error: verifyError } = await supabaseAdmin.auth.admin.listUsers();

  if (!verifyError) {
    for (const testUser of testUsers) {
      const email = testUser.email.toLowerCase();
      const authUser = verifyUsers.users.find((u) => u.email.toLowerCase() === email);
      const result = results.find((r) => r.email === email);

      if (authUser && result) {
        // Check profile
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, display_name, role, trust_level, email')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          const matches =
            profile.id === authUser.id &&
            profile.email === testUser.email &&
            profile.display_name === testUser.displayName &&
            profile.role === 'user' &&
            profile.trust_level === 'basic' &&
            authUser.email_confirmed_at !== null;

          if (matches) {
            console.log(`   ✅ ${email}: All checks passed`);
          } else {
            console.log(`   ⚠️  ${email}: Profile mismatch`);
            console.log(`      Profile: ${JSON.stringify(profile)}`);
            console.log(
              `      Auth: ${JSON.stringify({ id: authUser.id, email: authUser.email, confirmed: authUser.email_confirmed_at })}`
            );
          }
        }
      }
    }
  }

  // Print summary table
  console.log('\n' + '='.repeat(100));
  console.log('📊 ERGEBNIS-ÜBERSICHT');
  console.log('='.repeat(100));

  console.log(
    '\n| Nr. | E-Mail                    | User-ID                              | Profile-ID                           | Name          | Rolle | trust_level | bestätigt |'
  );
  console.log(
    '|-----|---------------------------|--------------------------------------|--------------------------------------|---------------|-------|-------------|-----------|'
  );

  testUsers.forEach((testUser, index) => {
    const result = results.find((r) => r.email === testUser.email.toLowerCase());
    if (result) {
      const userIdShort = result.userId ? result.userId.substring(0, 36) : 'N/A';
      const profileIdShort = result.profileId ? result.profileId.substring(0, 36) : 'N/A';
      const nameShort =
        result.displayName.length > 13 ? result.displayName.substring(0, 13) : result.displayName;
      const confirmed =
        result.emailConfirmed === 'Ja'
          ? '✅ Ja'
          : result.emailConfirmed === 'Nein'
            ? '❌ Nein'
            : result.emailConfirmed;
      const trustLevel = result.trustLevel || 'basic';
      console.log(
        `| ${index + 1}   | ${result.email.padEnd(25)} | ${userIdShort.padEnd(36)} | ${profileIdShort.padEnd(36)} | ${nameShort.padEnd(13)} | ${(result.role || 'user').padEnd(5)} | ${trustLevel.padEnd(11)} | ${confirmed.padEnd(9)} |`
      );
    }
  });

  console.log('\n' + '-'.repeat(100));
  console.log(`✅ Erfolgreich angelegt: ${created}`);
  console.log(`⏭️  Bereits vorhanden: ${existing}`);
  console.log(`❌ Fehler: ${errors}`);
  console.log(`📊 Gesamt: ${testUsers.length}`);

  if (errors > 0) {
    console.log('\n❌ Fehlerdetails:');
    results
      .filter((r) => r.status === 'error')
      .forEach((r) => {
        console.log(`   - ${r.email}: ${r.error}`);
      });
  }

  if (errors === 0 && created + existing === testUsers.length) {
    console.log('\n🎉 Alle Testnutzer erfolgreich angelegt/verifiziert!');
  }
}

createTestUsers().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
