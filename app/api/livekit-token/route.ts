import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomCode = searchParams.get('room');
  const playerId = searchParams.get('playerId');
  const displayName = searchParams.get('displayName');

  if (!roomCode || !playerId) {
    return NextResponse.json({ error: 'Missing room or playerId' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: playerId,
    name: displayName ?? playerId,
    ttl: '4h',
  });

  at.addGrant({
    roomJoin: true,
    room: `conquian-${roomCode}`,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({ token });
}
