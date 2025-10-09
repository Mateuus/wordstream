import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/src/lib/sessionManager';

const sessionManager = SessionManager.getInstance();

// POST - Gerar código de acesso
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const accessCode = await sessionManager.generateAccessCode(sessionId);
    
    return NextResponse.json({ 
      accessCode,
      message: 'Access code generated successfully',
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${accessCode}`
    });

  } catch (error) {
    console.error('Error generating access code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Buscar sessão por código
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    const session = await sessionManager.getSessionByCode(code);
    
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 404 });
    }

    return NextResponse.json({ 
      sessionId: session.id,
      message: 'Session found'
    });

  } catch (error) {
    console.error('Error finding session by code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
