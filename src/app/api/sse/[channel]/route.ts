import { NextRequest } from 'next/server';
import { registerSharedConnection, unregisterSharedConnection } from '@/src/lib/sharedSSEManager';
import { RedisSessionManager } from '@/src/lib/redisSessionManager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  // 🔑 channel aqui é o publicId da sessão (ex: WQD68Y3S)
  const { channel: publicId } = await params;
  const { searchParams } = new URL(request.url);
  const twitchChannel = searchParams.get('channel'); // Nome do canal Twitch (ex: fontinnelerj)
  const isOverlay = searchParams.get('overlay') === 'true'; // Identificar se é overlay

  const stream = new ReadableStream({
    async start(controller) {
      // Registrar conexão na sessão compartilhada
      const clientType = isOverlay ? 'overlay' : 'session';
      const clientId = registerSharedConnection(publicId, twitchChannel || 'desconhecido', controller, clientType);
      console.log(`🔌 Cliente SSE ${clientId} conectado à sessão ${publicId} (tipo: ${clientType})`);

      // Enviar mensagem de conexão
      const connectMessage = `data: ${JSON.stringify({
        type: 'connected',
        publicId,
        channel: twitchChannel,
        clientId,
        clientType,
        timestamp: Date.now()
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(connectMessage));

      // 🆕 Enviar dados iniciais da sessão apenas para este cliente
      try {
        const sessionManager = RedisSessionManager.getInstance();
        const stats = await sessionManager.getSessionStats(publicId);
        
        if (stats) {
          const statsMessage = `data: ${JSON.stringify({
            type: 'wordUpdate',
            stats: stats
          })}\n\n`;
          
          controller.enqueue(new TextEncoder().encode(statsMessage));
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
        unregisterSharedConnection(publicId, clientId);
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
