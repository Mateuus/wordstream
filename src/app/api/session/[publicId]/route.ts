import { NextRequest, NextResponse } from 'next/server';
import { RedisSessionManager } from '@/src/lib/redisSessionManager';

const sessionManager = RedisSessionManager.getInstance();

// GET - Obter sessão por ID público
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;

    const session = await sessionManager.getSessionByPublicId(publicId);
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Session not found or inactive' 
      }, { status: 404 });
    }

    const stats = await sessionManager.getSessionStats(session.id);
    
    if (!stats) {
      return NextResponse.json({ 
        error: 'Session data not available' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      ...stats,
      shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/session/${publicId}`
    });

  } catch (error) {
    console.error('Error getting session by public ID:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}