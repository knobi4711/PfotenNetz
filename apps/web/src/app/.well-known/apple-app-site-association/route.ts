import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!teamId) {
    return NextResponse.json({ error: 'APPLE_TEAM_ID is not configured' }, { status: 503 });
  }
  return NextResponse.json({ webcredentials: { apps: [`${teamId}.app.pfotennetz`] } });
}
