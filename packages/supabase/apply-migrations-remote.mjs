#!/usr/bin/env node
/**
 * Wendet lokale Migrationen per Supabase Management API (SQL-Editor-Endpunkt)
 * auf das Remote-Projekt an. Nur CREATE OR REPLACE / DROP IF EXISTS + CREATE.
 * Usage: node apply-migrations-remote.mjs 025 026
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env') });

const { SUPABASE_ACCESS_TOKEN } = process.env;
const REF = 'njkyujhbcolvtcnlahsk';
if (!SUPABASE_ACCESS_TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in .env');
  process.exit(1);
}

const MIGRATIONS = {
  '025': '../../supabase/migrations/025_helper_workflow.sql',
  '026': '../../supabase/migrations/026_booking_notifications.sql',
};

const wanted = process.argv.slice(2).filter((a) => a in MIGRATIONS);
if (wanted.length === 0) {
  console.error(`Usage: node apply-migrations-remote.mjs ${Object.keys(MIGRATIONS).join(' ')}`);
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

const proj = await fetch(`https://api.supabase.com/v1/projects/${REF}`, { headers });
if (!proj.ok) {
  console.error(`Token/Projekt-Check fehlgeschlagen: HTTP ${proj.status}`);
  process.exit(1);
}
console.log('✅ Projekt verifiziert (Token OK)');

for (const key of wanted) {
  const sql = readFileSync(resolve(process.cwd(), MIGRATIONS[key]), 'utf8');
  console.log(`\n▶ Wende Migration ${key} an …`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ Migration ${key}: HTTP ${res.status}\n${text.slice(0, 2000)}`);
    process.exit(1);
  }
  console.log(`✅ Migration ${key} applied`);
}
