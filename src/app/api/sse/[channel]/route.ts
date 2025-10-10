import { NextRequest } from 'next/server';
import { registerConnection, unregisterConnection } from '@/src/lib/simpleSSEManager';
import { RedisSessionManager } from '@/src/lib/redisSessionManager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  // 🔑 channel aqui é o publicId da sessão (ex: WQD68Y3S)
  const { channel: publicId } = await params;
  const { searchParams } = new URL(request.url);
  const twitchChannel = searchParams.get('channel'); // Nome do canal Twitch (ex: fontinnelerj)

  const stream = new ReadableStream({
    async start(controller) {
      // Registrar conexão usando publicId como identificador único
      registerConnection(publicId, controller);
      console.log(`🔌 SSE registrado para publicId: ${publicId} (canal: ${twitchChannel || 'desconhecido'})`);

      // Enviar mensagem de conexão
      const connectMessage = `data: ${JSON.stringify({
        type: 'connected',
        publicId,
        channel: twitchChannel,
        timestamp: Date.now()
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(connectMessage));

      // 🆕 Enviar dados iniciais da sessão
      try {
        const sessionManager = RedisSessionManager.getInstance();
        const stats = await sessionManager.getSessionStats(publicId);
        
        if (stats) {
          console.log(`📊 Enviando stats iniciais para publicId ${publicId}:`, {
            totalWords: stats.totalWords,
            uniqueWords: stats.uniqueWords,
            topWords: stats.topWords.length
          });
          
          const statsMessage = `data: ${JSON.stringify({
            type: 'wordUpdate',
            stats: stats
          })}\n\n`;
          
          controller.enqueue(new TextEncoder().encode(statsMessage));
        } else {
          console.log(`ℹ️ Sessão ${publicId} não tem stats ainda`);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar stats iniciais:', error);
      }

      // Heartbeat para manter conexão viva
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMessage = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: Date.now()
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeatMessage));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup quando conexão for fechada
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unregisterConnection(publicId, controller);
        console.log(`🔌 SSE desconectado para publicId: ${publicId}`);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}
