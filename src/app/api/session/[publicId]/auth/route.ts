import { NextRequest, NextResponse } from 'next/server';
import { RedisSessionManager } from '@/src/lib/redisSessionManager';

const sessionManager = RedisSessionManager.getInstance();

// POST - Verificar senha da sessão
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ 
        error: 'Password required' 
      }, { status: 400 });
    }

    console.log(`🔐 Verificando senha para sessão: ${publicId}`);

    const session = await sessionManager.getSessionByPublicId(publicId);
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    // Verificar se a sessão tem senha
    if (!session.password) {
      return NextResponse.json({ 
        error: 'Session does not require password' 
      }, { status: 400 });
    }

    // Verificar senha
    const isValid = await sessionManager.verifyPassword(session.id, password);
    
    if (isValid) {
      console.log(`✅ Senha válida para sessão: ${publicId}`);
      return NextResponse.json({ 
        success: true,
        message: 'Password verified successfully'
      });
    } else {
      console.log(`❌ Senha inválida para sessão: ${publicId}`);
      return NextResponse.json({ 
        error: 'Invalid password' 
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Error verifying password:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
