import { NextRequest, NextResponse } from 'next/server';
import { WordProcessor } from '@/src/lib/wordProcessor';
import { SessionManager } from '@/src/lib/sessionManager';

const wordProcessor = WordProcessor.getInstance();
const sessionManager = SessionManager.getInstance();

// POST - Processar mensagem do chat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, platform = 'twitch' } = body;

    if (!message || !sessionId) {
      return NextResponse.json({ 
        error: 'Message and sessionId required' 
      }, { status: 400 });
    }

    // Verificar se sessão existe
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    // Processar mensagem
    const processedMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: message.username || 'Anônimo',
      message: message.content || message.message || '',
      timestamp: new Date(),
      platform: platform as 'twitch' | 'kick',
      sourceChannel: message.channel
    };

    await wordProcessor.processMessage(processedMessage, sessionId);

    return NextResponse.json({ 
      success: true,
      message: 'Message processed successfully'
    });

  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
