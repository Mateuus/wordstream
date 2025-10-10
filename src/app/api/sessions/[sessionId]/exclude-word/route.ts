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

    // Deletar a palavra completamente do contador
    const wordCounts = new Map(sessionData.wordCounts);
    const existingWord = wordCounts.get(word.toLowerCase());
    
    if (existingWord) {
      // Remover a palavra completamente do contador
      wordCounts.delete(word.toLowerCase());
      
      // Recalcular total de palavras
      const newTotalWords = Array.from(wordCounts.values())
        .reduce((total, wordCount) => total + wordCount.count, 0);
      
      await redisSessionManager.updateSession(sessionId, {
        wordCounts,
        totalWords: newTotalWords
      });
      
      // Enviar atualização das estatísticas
      const updatedStats = await redisSessionManager.getSessionStats(sessionId);
      if (updatedStats) {
        broadcastToChannel(sessionId, {
          type: 'wordUpdate',
          stats: updatedStats
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Palavra "${word}" excluída com sucesso`
    });

  } catch (error) {
    console.error('Erro ao excluir palavra:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
