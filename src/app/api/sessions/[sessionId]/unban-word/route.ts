import { NextRequest, NextResponse } from 'next/server';
import { RedisSessionManager } from '@/src/lib/redisSessionManager';
import { publishToSession } from '@/src/lib/sessionChannelManager';

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

    // Aguardar Redis estar pronto (com timeout)
    const redisReady = await Promise.race([
      redisSessionManager.ensureRedisReady(),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)) // 5s timeout
    ]);

    if (!redisReady) {
      console.warn('⚠️ Redis não está pronto, usando cache local');
    }

    // Buscar dados da sessão
    const sessionData = await redisSessionManager.getSession(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Remover palavra da lista de banidas
    const bannedWords = sessionData.bannedWords || [];
    const filteredBannedWords = bannedWords.filter((w: string) => w !== word.toLowerCase());
    
    await redisSessionManager.updateSession(sessionId, {
      bannedWords: filteredBannedWords
    });
    
    // Enviar atualização via SSE
      publishToSession(sessionId, {
      type: 'bannedWordsUpdate',
      bannedWords: filteredBannedWords
    });

    return NextResponse.json({ 
      success: true, 
      message: `Palavra "${word}" desbanida com sucesso`,
      bannedWords: filteredBannedWords 
    });

  } catch (error) {
    console.error('Erro ao desbanir palavra:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
