#!/usr/bin/env node
/**
 * Creates 5 test pets in the remote Supabase project for PfotenNetz.
 * Uses Supabase Management API (REST API) with Service Role Key.
 *
 * Usage: node scripts/create-test-pets.mjs
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

// Test users with their IDs (from auth.users)
const testUsers = [
  {
    email: 'test1@pfotennetz.local',
    displayName: 'Anna Test',
    userId: '9074be6f-07f0-427b-ad8e-7740c888281c',
  },
  {
    email: 'test2@pfotennetz.local',
    displayName: 'Ben Test',
    userId: 'c5f05749-1428-494f-9372-6a0ab35776c5',
  },
  {
    email: 'test3@pfotennetz.local',
    displayName: 'Clara Test',
    userId: '86658af9-842e-4089-a323-e703b1aa5331',
  },
  {
    email: 'test4@pfotennetz.local',
    displayName: 'David Test',
    userId: 'c4ea89b4-bcb3-4848-a4ea-09ac6273b96b',
  },
  {
    email: 'test5@pfotennetz.local',
    displayName: 'Eva Test',
    userId: 'fe2a4852-8467-4912-ae5e-740a0c9d9e19',
  },
];

// Pets to create for each user
const petsToCreate = [
  {
    ownerEmail: 'test1@pfotennetz.local',
    name: 'Bella',
    species: 'dog',
    breed: 'Labrador Retriever',
  },
  {
    ownerEmail: 'test2@pfotennetz.local',
    name: 'Milo',
    species: 'cat',
    breed: 'Europäisch Kurzhaar',
  },
  { ownerEmail: 'test3@pfotennetz.local', name: 'Luna', species: 'dog', breed: 'Golden Retriever' },
  { ownerEmail: 'test4@pfotennetz.local', name: 'Rocky', species: 'dog', breed: 'Mischling' },
  { ownerEmail: 'test5@pfotennetz.local', name: 'Nala', species: 'cat', breed: 'Maine Coon' },
];

// Map owner email to user ID
const ownerEmailToUserId = {};
for (const user of testUsers) {
  ownerEmailToUserId[user.email] = user.userId;
}

async function createTestPets() {
  console.log('🔍 Checking existing pets...\n');

  // First, check which pets already exist
  const { data: existingPets, error: listError } = await supabaseAdmin
    .from('pets')
    .select('id, name, owner_id, species, breed');

  if (listError) {
    console.error('❌ Error listing pets:', listError.message);
    process.exit(1);
  }

  const existingPetKeys = new Set(existingPets.map((p) => `${p.owner_id}:${p.name.toLowerCase()}`));

  const results = [];
  let created = 0;
  let existing = 0;
  let errors = 0;

  for (const pet of petsToCreate) {
    const ownerEmail = pet.ownerEmail.toLowerCase();
    const ownerId = ownerEmailToUserId[ownerEmail];
    const petKey = `${ownerId}:${pet.name.toLowerCase()}`;

    console.log(`\n📧 Processing: ${pet.ownerEmail} - ${pet.name}`);

    if (existingPetKeys.has(petKey)) {
      console.log(`   ⏭️  Already exists, skipping creation`);
      existing++;
      results.push({
        ownerEmail: pet.ownerEmail,
        petName: pet.name,
        status: 'existing',
        petId: null,
      });
      continue;
    }

    if (!ownerId) {
      console.error(`   ❌ Owner ID not found for ${pet.ownerEmail}`);
      errors++;
      continue;
    }

    // Create the pet
    console.log(`   🐾 Creating pet: ${pet.name}...`);
    const { data: petData, error: petError } = await supabaseAdmin
      .from('pets')
      .insert({
        owner_id: ownerId,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
      })
      .select()
      .single();

    if (petError) {
      console.error(`   ❌ Pet creation failed: ${petError.message}`);
      errors++;
      continue;
    }

    console.log(`   ✅ Pet created: ${petData.id}`);
    created++;

    results.push({
      ownerEmail: pet.ownerEmail,
      petName: pet.name,
      petId: petData.id,
      species: petData.species,
      breed: petData.breed,
      status: 'created',
    });
  }

  // Verify all created pets
  console.log('\n🔍 Verifying created pets...\n');

  const { data: verifyPets, error: verifyError } = await supabaseAdmin
    .from('pets')
    .select('id, name, owner_id, species, breed, is_active')
    .in('owner_id', Object.values(ownerEmailToUserId));

  if (!verifyError) {
    console.log('\n📊 ERGEBNIS-ÜBERSICHT');
    console.log('='.repeat(80));
    console.log(
      '\n| Besitzer          | Haustier | Tierart | Rasse              | ID                                    |'
    );
    console.log(
      '|-------------------|----------|---------|--------------------|---------------------------------------|'
    );

    for (const pet of petsToCreate) {
      const result = verifyPets.find(
        (p) => p.owner_id === ownerEmailToUserId[pet.ownerEmail] && p.name === pet.name
      );
      if (result) {
        console.log(
          `| ${pet.ownerEmail.padEnd(19)} | ${pet.name.padEnd(8)} | ${pet.species.padEnd(7)} | ${pet.breed.padEnd(18)} | ${result.id} |`
        );
      } else {
        console.log(
          `| ${pet.ownerEmail.padEnd(19)} | ${pet.name.padEnd(8)} | ${pet.species.padEnd(7)} | ${pet.breed.padEnd(18)} | FEHLER: Nicht gefunden |`
        );
      }
    }

    console.log('\n');
  }

  // Summary
  console.log('='.repeat(80));
  console.log(`✅ Erfolgreich angelegt: ${created}`);
  console.log(`⏭️  Bereits vorhanden: ${existing}`);
  console.log(`❌ Fehler: ${errors}`);
  console.log(`📊 Gesamt: ${petsToCreate.length}`);

  if (errors > 0) {
    console.log('\n❌ Fehlerdetails:');
    results
      .filter((r) => r.status === 'error')
      .forEach((r) => {
        console.log(`   - ${r.email}: ${r.error}`);
      });
  }

  if (errors === 0 && created + existing === petsToCreate.length) {
    console.log('\n🎉 Alle Testhaustiere erfolgreich angelegt/verifiziert!');
  }
}

createTestPets().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
