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

    console.log(`Looking for session with publicId: ${publicId}`);
    
    const session = await sessionManager.getSessionByPublicId(publicId);
    
    if (!session) {
      console.log(`Session not found for publicId: ${publicId}`);
      return NextResponse.json({ 
        error: 'Session not found or inactive',
        debug: {
          publicId,
          timestamp: new Date().toISOString(),
          redisAvailable: sessionManager['redisAvailable']
        }
      }, { status: 404 });
    }

    console.log(`Session found: ${session.id} for publicId: ${publicId}`);
    
    const stats = await sessionManager.getSessionStats(session.id);
    
    if (!stats) {
      console.log(`Session stats not available for: ${session.id}`);
      return NextResponse.json({ 
        error: 'Session data not available' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      ...stats,
      shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/session/${publicId}`,
      requiresPassword: !!session.password
    });

  } catch (error) {
    console.error('Error getting session by public ID:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: {
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}