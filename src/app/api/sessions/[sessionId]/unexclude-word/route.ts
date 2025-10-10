import { NextRequest, NextResponse } from 'next/server';
import { RedisSessionManager } from '@/src/lib/redisSessionManager';
import { broadcastToChannel } from '@/src/lib/simpleSSEManager';

const redisSessionManager = RedisSessionManager.getInstance();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { word } = await request.json();

    if (!word || typeof word !== 'string') {
      return NextResponse.json(
        { error: 'Palavra é obrigatória' },
        { status: 400 }
      );
    }

    // Buscar dados da sessão
    const sessionData = await redisSessionManager.getSession(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Remover palavra da lista de excluídas
    const excludedWords = sessionData.excludedWords || [];
    const filteredExcludedWords = excludedWords.filter((w: string) => w !== word.toLowerCase());
    
    await redisSessionManager.updateSession(sessionId, {
      excludedWords: filteredExcludedWords
    });
    
    // Enviar atualização via SSE
    broadcastToChannel(sessionId, {
      type: 'excludedWordsUpdate',
      excludedWords: filteredExcludedWords
    });
    
    // Enviar atualização das estatísticas para refletir a reabilitação
    const updatedStats = await redisSessionManager.getSessionStats(sessionId);
    if (updatedStats) {
      broadcastToChannel(sessionId, {
        type: 'wordUpdate',
        stats: updatedStats
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Palavra "${word}" reabilitada com sucesso`,
      excludedWords: filteredExcludedWords 
    });

  } catch (error) {
    console.error('Erro ao reabilitar palavra:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
