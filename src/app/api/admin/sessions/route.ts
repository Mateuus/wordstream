import { NextRequest, NextResponse } from 'next/server';
import { RedisSessionManager } from '@/src/lib/redisSessionManager';

const sessionManager = RedisSessionManager.getInstance();

// POST - Criar nova sessão compartilhada
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, platform = 'twitch', createdBy = 'admin', password } = body;

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

    // Criar sessão com ID público
    const { sessionId, publicId, adminKey } = await sessionManager.createSession(channel, platform, createdBy, password);
    
    return NextResponse.json({ 
      sessionId,
      publicId,
      adminKey,
      channel,
      platform,
      shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/session/${publicId}`,
      adminUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/session/${publicId}?admin=${adminKey}`,
      message: `Sessão compartilhada criada: ${publicId}`
    });

  } catch (error) {
    console.error('Error creating shared session:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create session' 
    }, { status: 500 });
  }
}

// GET - Listar sessões ativas (apenas para admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('adminKey');
    
    // Verificação simples de admin (em produção usar JWT)
    if (adminKey !== 'admin123') {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const sessions = await sessionManager.getAllActiveSessions();
    
    return NextResponse.json({
      sessions: sessions.map(session => ({
        sessionId: session.id,
        publicId: session.publicId,
        channel: session.channel,
        platform: session.platform,
        totalWords: session.totalWords,
        uniqueWords: session.wordCounts.size,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        createdBy: session.createdBy,
        shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/session/${session.publicId}`
      }))
    });

  } catch (error) {
    console.error('Error getting sessions:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// PUT - Renovar sessão
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const adminKey = searchParams.get('adminKey');

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID required' 
      }, { status: 400 });
    }

    if (adminKey !== 'admin123') {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const renewed = await sessionManager.renewSession(sessionId);
    
    if (!renewed) {
      return NextResponse.json({ 
        error: 'Session not found or already expired' 
      }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Session renewed successfully',
      sessionId
    });

  } catch (error) {
    console.error('Error renewing session:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE - Desativar sessão
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const adminKey = searchParams.get('adminKey');

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID required' 
      }, { status: 400 });
    }

    if (adminKey !== 'admin123') {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    await sessionManager.clearSession(sessionId);

    return NextResponse.json({ 
      message: 'Session deactivated successfully' 
    });

  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
