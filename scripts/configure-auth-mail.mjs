#!/usr/bin/env node
/**
 * Konfiguriert die Auth-Mails des Hosted-Supabase-Projekts:
 * eigener SMTP-Versand (Brevo), Rate Limit und deutsche Texte.
 *
 * Aufruf:
 *   node scripts/configure-auth-mail.mjs                      # Dry-Run, zeigt nur die Änderungen
 *   node scripts/configure-auth-mail.mjs --apply              # SMTP + Texte anwenden
 *   node scripts/configure-auth-mail.mjs --apply --templates-only   # nur deutsche Texte
 *   node scripts/configure-auth-mail.mjs --check              # DNS-Records (Brevo/SPF/DMARC/MX) prüfen
 *
 * Benötigt in .env (oder als Umgebungsvariable):
 *   SUPABASE_ACCESS_TOKEN
 *   AUTH_MAIL_SMTP_HOST, AUTH_MAIL_SMTP_PORT, AUTH_MAIL_SMTP_USER,
 *   AUTH_MAIL_SMTP_PASS, AUTH_MAIL_FROM, AUTH_MAIL_FROM_NAME
 * Optional:
 *   SUPABASE_PROJECT_REF (sonst supabase/.temp/project-ref)
 *   AUTH_MAIL_RATE_LIMIT  (Mails pro Stunde, Standard 60)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APPLY = process.argv.includes('--apply');
const TEMPLATES_ONLY = process.argv.includes('--templates-only');
const CHECK_ONLY = process.argv.includes('--check');

const DEFAULT_RATE_LIMIT = 60;

const SUBJECTS = {
  mailer_subjects_confirmation: 'Bitte bestätige deine E-Mail-Adresse',
  mailer_subjects_recovery: 'Passwort für PfotenNetz zurücksetzen',
  mailer_subjects_magic_link: 'Dein Anmelde-Link für PfotenNetz',
  mailer_subjects_invite: 'Einladung zu PfotenNetz',
  mailer_subjects_email_change: 'Bestätige deine neue E-Mail-Adresse',
  mailer_subjects_reauthentication: 'Dein Bestätigungscode',
};

/**
 * Inhalte orientieren sich an den Supabase-Standardtemplates und nutzen
 * ausschließlich deren Platzhalter, damit Links/OTP weiter funktionieren.
 */
const TEMPLATES = {
  mailer_templates_confirmation_content: `
<h2>Fast geschafft!</h2>

<p>Bitte bestätige deine E-Mail-Adresse, damit dein PfotenNetz-Konto aktiv wird.</p>
<p><a href="{{ .ConfirmationURL }}">E-Mail-Adresse bestätigen</a></p>

<p>Falls du dich nicht bei PfotenNetz registriert hast, kannst du diese E-Mail ignorieren.</p>
`.trim(),

  mailer_templates_recovery_content: `
<h2>Passwort zurücksetzen</h2>

<p>Wir haben eine Anfrage zum Zurücksetzen deines Passworts erhalten. Über den folgenden Link kannst du ein neues Passwort vergeben:</p>
<p><a href="{{ .ConfirmationURL }}">Neues Passwort festlegen</a></p>

<p>Der Link ist zeitlich begrenzt gültig. Falls du kein neues Passwort angefordert hast, ignoriere diese E-Mail – dein Passwort bleibt unverändert.</p>
`.trim(),

  mailer_templates_magic_link_content: `
<h2>Dein Anmelde-Link</h2>

<p>Mit diesem Link meldest du dich bei PfotenNetz an. Er ist nur kurz gültig und kann nur einmal verwendet werden.</p>
<p><a href="{{ .ConfirmationURL }}">Jetzt anmelden</a></p>

<p>Falls du keinen Anmelde-Link angefordert hast, ignoriere diese E-Mail.</p>
`.trim(),

  mailer_templates_invite_content: `
<h2>Einladung zu PfotenNetz</h2>

<p>Du wurdest eingeladen, ein PfotenNetz-Konto zu erstellen. Über den folgenden Link kannst du die Einladung annehmen:</p>
<p><a href="{{ .ConfirmationURL }}">Einladung annehmen</a></p>

<p>Falls du keine Einladung erwartest, ignoriere diese E-Mail.</p>
`.trim(),

  mailer_templates_email_change_content: `
<h2>Neue E-Mail-Adresse bestätigen</h2>

<p>Bitte bestätige, dass {{ .NewEmail }} künftig zu deinem PfotenNetz-Konto gehören soll.</p>
<p><a href="{{ .ConfirmationURL }}">Neue E-Mail-Adresse bestätigen</a></p>

<p>Falls du diese Änderung nicht angefordert hast, ignoriere diese E-Mail.</p>
`.trim(),

  mailer_templates_reauthentication_content: `
<h2>Dein Bestätigungscode</h2>

<p>Mit diesem Code bestätigst du deine Identität. Er ist nur kurz gültig.</p>
<p>{{ .Token }}</p>

<p>Falls du diesen Code nicht angefordert hast, ändere sicherheitshalber dein Passwort.</p>
`.trim(),
};

function loadEnv() {
  try {
    process.loadEnvFile(resolve(process.cwd(), '.env'));
  } catch {
    // .env ist optional; CI kann die Werte direkt setzen.
  }
}

function projectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF.trim();
  try {
    return readFileSync(resolve('supabase/.temp/project-ref'), 'utf8').trim();
  } catch {
    return null;
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) missing.push(name);
  return value ?? '';
}

const missing = [];

function smtpPayload() {
  const rateLimit = Number(process.env.AUTH_MAIL_RATE_LIMIT ?? DEFAULT_RATE_LIMIT);
  if (!Number.isInteger(rateLimit) || rateLimit < 1) {
    throw new Error(
      `AUTH_MAIL_RATE_LIMIT ist keine gültige Zahl: ${process.env.AUTH_MAIL_RATE_LIMIT}`
    );
  }

  return {
    smtp_host: requireEnv('AUTH_MAIL_SMTP_HOST'),
    smtp_port: requireEnv('AUTH_MAIL_SMTP_PORT'),
    smtp_user: requireEnv('AUTH_MAIL_SMTP_USER'),
    smtp_pass: requireEnv('AUTH_MAIL_SMTP_PASS'),
    smtp_admin_email: requireEnv('AUTH_MAIL_FROM'),
    smtp_sender_name: process.env.AUTH_MAIL_FROM_NAME?.trim() || 'PfotenNetz',
    smtp_max_frequency: 10,
    rate_limit_email_sent: rateLimit,
  };
}

function masked(value) {
  if (!value) return '(leer)';
  // Secrets nie teilweise ausgeben – auch nicht die ersten/letzten Zeichen.
  return `*** (Länge ${value.length})`;
}

async function dnsRecords(name, type) {
  const response = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`
  );
  if (!response.ok) throw new Error(`DNS-Abfrage fehlgeschlagen (${response.status}) für ${name}`);
  const body = await response.json();
  return (body.Answer ?? []).map((answer) => String(answer.data));
}

async function checkDns() {
  const domain = process.env.AUTH_MAIL_DOMAIN?.trim() || 'pfotennetz.app';
  const checks = [
    [
      'Domain-Nachweis (brevo-code)',
      domain,
      'TXT',
      (values) => values.some((v) => v.includes('brevo-code:')),
    ],
    ['SPF', domain, 'TXT', (values) => values.some((v) => v.startsWith('v=spf1'))],
    ['DKIM 1', `brevo1._domainkey.${domain}`, 'CNAME', (values) => values.length > 0],
    ['DKIM 2', `brevo2._domainkey.${domain}`, 'CNAME', (values) => values.length > 0],
    ['DMARC', `_dmarc.${domain}`, 'TXT', (values) => values.some((v) => v.startsWith('v=DMARC1'))],
  ];

  console.log(`DNS-Prüfung für ${domain} (Quelle: dns.google)\n`);

  let allGood = true;
  for (const [label, name, type, ok] of checks) {
    const values = await dnsRecords(name, type);
    const passed = ok(values);
    allGood &&= passed;
    console.log(`${passed ? '[ok]  ' : '[fehlt]'} ${label} (${type} ${name})`);
    for (const value of values) console.log(`        ${value}`);
  }

  const mx = await dnsRecords(domain, 'MX');
  const selfReferencing = mx.some((value) => value.endsWith(`${domain}.`));
  console.log(`\nMX: ${mx.length === 0 ? '(keiner)' : mx.join(', ')}`);
  if (selfReferencing) {
    console.log(
      '        Hinweis: MX zeigt auf die Domain selbst, es gibt aber keinen Mailserver.\n' +
        '        Entweder Cloudflare Email Routing aktivieren oder Null MX (0 .) setzen.'
    );
  }

  // Branded Subdomain: nur für Link-/Bild-Hosting und Return-Path. Für reine
  // Auth-Mails optional, aber Brevos Setup-Dialog zählt die Records mit.
  const branded = [
    ['Branded record', `mail.${domain}`],
    ['Redirection Record', `r.mail.${domain}`],
    ['Image Redirection Record', `img.mail.${domain}`],
  ];
  console.log('\nBranded Subdomain (optional, nur für Brevo-Branding):');
  for (const [label, name] of branded) {
    const values = await dnsRecords(name, 'CNAME');
    console.log(`${values.length > 0 ? '[ok]  ' : '[fehlt]'} ${label} (CNAME ${name})`);
    for (const value of values) console.log(`        ${value}`);
  }

  console.log(
    allGood
      ? '\nAlle Brevo-/SPF-/DMARC-Records gefunden. In Brevo noch „Authenticate this email domain“ klicken.'
      : '\nEs fehlen noch Records – Tabelle in docs/auth-emails.md, Abschnitt 2.'
  );
}

async function main() {
  loadEnv();

  if (CHECK_ONLY) {
    await checkDns();
    return;
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN fehlt (siehe .env / .env.example).');

  const ref = projectRef();
  if (!ref) throw new Error('Projekt-Referenz nicht gefunden – bitte SUPABASE_PROJECT_REF setzen.');

  const payload = { ...SUBJECTS, ...TEMPLATES };
  if (!TEMPLATES_ONLY) Object.assign(payload, smtpPayload());

  const missingVars = [...new Set(missing)];
  if (missingVars.length > 0 && APPLY && !TEMPLATES_ONLY) {
    throw new Error(
      `Folgende Variablen fehlen für den SMTP-Versand: ${missingVars.join(', ')}\n` +
        'Nur die Texte ändern? Dann mit --templates-only aufrufen.'
    );
  }

  const preview = { ...payload };
  if (preview.smtp_pass) preview.smtp_pass = masked(preview.smtp_pass);

  console.log(`Projekt: ${ref}`);
  console.log(`Modus:   ${APPLY ? 'ANWENDEN' : 'Dry-Run (nichts geändert)'}`);
  console.log(
    `Umfang:  ${TEMPLATES_ONLY ? 'nur deutsche Texte' : 'SMTP + Rate Limit + deutsche Texte'}`
  );
  if (missingVars.length > 0) {
    console.log(`Fehlt noch in .env: ${missingVars.join(', ')}`);
  }
  console.log(JSON.stringify(preview, null, 2));

  if (!APPLY) {
    console.log('\nZum Anwenden erneut mit --apply aufrufen.');
    return;
  }

  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    const hint = body.includes('not available for free tier projects')
      ? '\nHinweis: Supabase erlaubt eigene E-Mail-Texte im Free-Tier erst, sobald ein eigener SMTP-Provider konfiguriert ist. Also zuerst SMTP setzen (ohne --templates-only), danach die Texte.'
      : '';
    throw new Error(`Management API antwortete mit ${response.status}: ${body}${hint}`);
  }

  const config = await response.json();
  console.log('\nAktiver Stand:');
  console.log(
    JSON.stringify(
      {
        smtp_host: config.smtp_host || '(eingebauter Mailer)',
        smtp_port: config.smtp_port,
        smtp_admin_email: config.smtp_admin_email,
        smtp_sender_name: config.smtp_sender_name,
        rate_limit_email_sent: config.rate_limit_email_sent,
        mailer_subjects_recovery: config.mailer_subjects_recovery,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`\nFehler: ${error.message}`);
  process.exitCode = 1;
});
