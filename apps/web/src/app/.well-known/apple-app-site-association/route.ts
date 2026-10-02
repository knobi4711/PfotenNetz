import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const bundleId = 'app.pfotennetz';

function appleTeamId(): string | null {
  const value = process.env.APPLE_TEAM_ID?.trim().toUpperCase() ?? '';
  return /^[A-Z0-9]{10}$/.test(value) ? value : null;
}

export function GET() {
  const teamId = appleTeamId();
  if (teamId === null) {
    return NextResponse.json({ error: 'APPLE_TEAM_ID is not configured' }, { status: 503 });
  }

  const appId = `${teamId}.${bundleId}`;
  return NextResponse.json({
    applinks: {
      apps: [],
      details: [{ appID: appId, paths: ['*'] }],
    },
    webcredentials: {
      apps: [appId],
    },
  });
}
