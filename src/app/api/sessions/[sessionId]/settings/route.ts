import { NextRequest, NextResponse } from 'next/server';
import { RedisSessionManager } from '@/src/lib/redisSessionManager';

const redisSessionManager = RedisSessionManager.getInstance();

// GET - Obter configurações da sessão
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const sessionData = await redisSessionManager.getSession(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      wordLimit: sessionData.settings?.wordLimit || 10,
      bannedWords: sessionData.bannedWords || []
    });

  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar configurações da sessão
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { wordLimit, bannedWords } = await request.json();

    // Buscar dados da sessão
    const sessionData = await redisSessionManager.getSession(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Atualizar configurações
    const updates: Record<string, unknown> = {};
    
    if (wordLimit !== undefined) {
      updates.settings = {
        ...sessionData.settings,
        wordLimit: Math.max(1, Math.min(50, wordLimit)) // Limitar entre 1 e 50
      };
    }
    
    if (bannedWords !== undefined) {
      updates.bannedWords = bannedWords;
    }

    await redisSessionManager.updateSession(sessionId, updates);

    return NextResponse.json({ 
      success: true, 
      message: 'Configurações atualizadas com sucesso',
      settings: {
        wordLimit: (updates.settings as {wordLimit?: number})?.wordLimit || sessionData.settings?.wordLimit || 10,
        bannedWords: updates.bannedWords || sessionData.bannedWords || []
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
