import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { room, participantName } = await req.json();

    if (!room || !participantName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit credentials missing via .env.local' }, { status: 500 });
    }

    // Generate strict capability token payload mapping back to the player display profile
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });
    
    // Explicitly scope the grant array strictly to this specific exact gameroom
    at.addGrant({ roomJoin: true, room: room, canPublish: true, canSubscribe: true, canPublishData: true });

    return NextResponse.json({ token: await at.toJwt() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
