import { NextRequest, NextResponse } from 'next/server';
import { SimpleChatConnector } from '@/src/lib/simpleChatConnector';

const chatConnector = SimpleChatConnector.getInstance();

// POST - Reiniciar conexões do chat (YouTube e Twitch)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID é obrigatório' 
      }, { status: 400 });
    }

    console.log(`🔄 Reiniciando conexões para sessão: ${sessionId}`);

    // Reiniciar conexões usando o método do SimpleChatConnector
    const result = await chatConnector.restartConnections(sessionId);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Falha ao reiniciar conexões' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Conexões reiniciadas com sucesso',
      sessionId,
      platforms: result.platforms,
      details: result.details
    });

  } catch (error) {
    console.error('Erro ao reiniciar conexões:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
