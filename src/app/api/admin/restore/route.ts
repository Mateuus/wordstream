import { NextRequest, NextResponse } from 'next/server';
import { RedisSessionManager } from '@/src/lib/redisSessionManager';

const sessionManager = RedisSessionManager.getInstance();

// POST - Verificar se uma sessão existe e restaurar acesso
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicId, password } = body;

    if (!publicId) {
      return NextResponse.json({ 
        error: 'Public ID required' 
      }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ 
        error: 'Password required' 
      }, { status: 400 });
    }

    // Verificar se a sessão existe
    const session = await sessionManager.getSessionByPublicId(publicId);
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Session not found or expired' 
      }, { status: 404 });
    }

    // Verificar se a senha está correta
    const isValidPassword = await sessionManager.verifyPassword(session.id, password);
    if (!isValidPassword) {
      return NextResponse.json({ 
        error: 'Invalid password' 
      }, { status: 401 });
    }

    // Renovar a sessão automaticamente ao restaurar
    const renewed = await sessionManager.renewSession(session.id);
    
    if (!renewed) {
      return NextResponse.json({ 
        error: 'Failed to renew session' 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Session restored successfully',
      session: {
        sessionId: session.id,
        publicId: session.publicId,
        channel: session.channel,
        platform: session.platform,
        isActive: session.isActive,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        createdBy: session.createdBy,
        shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://contador.bdjcoins.com'}/session/${publicId}`,
        adminUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://contador.bdjcoins.com'}/session/${publicId}?admin=${session.adminKey}`
      }
    });

  } catch (error) {
    console.error('Error restoring session:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// GET - Verificar status de uma sessão
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return NextResponse.json({ 
        error: 'Public ID required' 
      }, { status: 400 });
    }

    // Verificar se a sessão existe
    const session = await sessionManager.getSessionByPublicId(publicId);
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Session not found or expired' 
      }, { status: 404 });
    }

    return NextResponse.json({
      exists: true,
      session: {
        publicId: session.publicId,
        channel: session.channel,
        platform: session.platform,
        isActive: session.isActive,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        createdBy: session.createdBy
      }
    });

  } catch (error) {
    console.error('Error checking session status:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
