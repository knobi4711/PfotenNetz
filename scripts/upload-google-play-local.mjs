import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageName = process.env.ANDROID_APPLICATION_ID ?? 'app.pfotennetz';
const track = process.env.GOOGLE_PLAY_TRACK ?? 'internal';
const expectedServiceAccount =
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL ??
  'pfotennetz-play-upload@pfotennetz.iam.gserviceaccount.com';
const keyPath = path.resolve(
  rootDir,
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH ??
    'apps/mobile/.secrets/google-play-service-account.json'
);
const aabPath = path.resolve(
  rootDir,
  process.env.ANDROID_AAB_PATH ??
    'apps/mobile/android/app/build/outputs/bundle/release/app-release.aab'
);

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function createJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  return `${unsigned}.${signer.sign(serviceAccount.private_key.replace(/\\n/g, '\n'), 'base64url')}`;
}

async function responseBody(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const body = await responseBody(response);
  if (!response.ok) {
    throw new Error(`Google Play API ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function getAccessToken(serviceAccount) {
  const body = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: createJwt(serviceAccount),
    }),
  });
  return body.access_token;
}

async function main() {
  const [serviceAccount, aab] = await Promise.all([
    fs.readFile(keyPath, 'utf8').then(JSON.parse),
    fs.readFile(aabPath),
  ]);
  if (serviceAccount.client_email !== expectedServiceAccount) {
    throw new Error(
      `Falscher Google-Play-Service-Account: ${serviceAccount.client_email ?? 'unbekannt'}. ` +
        `Erwartet wird ${expectedServiceAccount}. ` +
        `Setze GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH auf den passenden JSON-Schlüssel.`
    );
  }
  const token = await getAccessToken(serviceAccount);
  const authorization = { Authorization: `Bearer ${token}` };
  const apiRoot = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`;

  const edit = await request(`${apiRoot}/edits`, {
    method: 'POST',
    headers: { ...authorization, 'content-type': 'application/json' },
    body: '{}',
  });
  const editRoot = `${apiRoot}/edits/${edit.id}`;
  const uploadRoot = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/edits/${edit.id}`;

  const bundle = await request(`${uploadRoot}/bundles`, {
    method: 'POST',
    headers: {
      ...authorization,
      'content-type': 'application/octet-stream',
      'content-length': String(aab.byteLength),
    },
    body: aab,
  });
  const versionCode = String(bundle.versionCode);

  await request(`${editRoot}/tracks/${encodeURIComponent(track)}`, {
    method: 'PUT',
    headers: { ...authorization, 'content-type': 'application/json' },
    body: JSON.stringify({
      track,
      releases: [{ versionCodes: [versionCode], status: 'completed' }],
    }),
  });

  await request(`${editRoot}:commit`, {
    method: 'POST',
    headers: { ...authorization, 'content-type': 'application/json' },
    body: '{}',
  });

  console.log(
    `Google Play upload successful: ${packageName}, track ${track}, versionCode ${versionCode}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
