import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function fingerprints(): string[] {
  return (process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[0-9A-F]{2}(?::[0-9A-F]{2}){31}$/.test(value));
}

export function GET() {
  const sha256CertFingerprints = fingerprints();
  if (sha256CertFingerprints.length === 0) {
    return NextResponse.json(
      { error: 'ANDROID_SHA256_CERT_FINGERPRINTS is not configured' },
      { status: 503 }
    );
  }
  return NextResponse.json([
    {
      relation: [
        'delegate_permission/common.handle_all_urls',
        'delegate_permission/common.get_login_creds',
      ],
      target: {
        namespace: 'android_app',
        package_name: 'app.pfotennetz',
        sha256_cert_fingerprints: sha256CertFingerprints,
      },
    },
  ]);
}
