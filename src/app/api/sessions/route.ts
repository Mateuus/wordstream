import { NextRequest, NextResponse } from 'next/server';
import { SimpleChatConnector } from '@/src/lib/simpleChatConnector';

const chatConnector = SimpleChatConnector.getInstance();

// POST - Conectar ao canal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, platform = 'twitch', sessionId } = body;

    if (!channel) {
      return NextResponse.json({ 
        error: 'Channel required' 
      }, { status: 400 });
    }

    if (!['twitch', 'kick'].includes(platform)) {
      return NextResponse.json({ 
        error: 'Platform must be twitch or kick' 
      }, { status: 400 });
    }

    // Conectar ao canal usando a sessão existente se fornecida
    const connectedSessionId = await chatConnector.connectToChannel(channel, platform, sessionId);
    
    return NextResponse.json({ 
      sessionId: connectedSessionId,
      channel,
      platform,
      message: `Connected to ${platform} channel: ${channel}`
    });

  } catch (error) {
    console.error('Error connecting to channel:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Connection failed' 
    }, { status: 500 });
  }
}

// GET - Obter estatísticas da sessão
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID required' 
      }, { status: 400 });
    }

    const stats = chatConnector.getSessionStats(sessionId);
    
    if (!stats) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error getting session stats:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE - Limpar sessão
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID required' 
      }, { status: 400 });
    }

    const cleared = chatConnector.clearSession(sessionId);
    
    if (!cleared) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Session cleared successfully' 
    });

  } catch (error) {
    console.error('Error clearing session:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}