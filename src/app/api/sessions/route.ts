import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/src/lib/sessionManager';

const sessionManager = SessionManager.getInstance();

// GET - Buscar dados da sessão
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const stats = await sessionManager.getSessionStats(sessionId);
    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Criar nova sessão
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;

    const sessionId = await sessionManager.createSession(config);
    
    return NextResponse.json({ 
      sessionId,
      message: 'Session created successfully' 
    });

  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Atualizar sessão
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    await sessionManager.updateSessionActivity(sessionId);
    
    return NextResponse.json({ message: 'Session updated' });

  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
