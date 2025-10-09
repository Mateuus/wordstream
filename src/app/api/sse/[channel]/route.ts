import { NextRequest } from 'next/server';
import { registerConnection, unregisterConnection } from '@/src/lib/simpleSSEManager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params;

  const stream = new ReadableStream({
    start(controller) {
      // Registrar conexão para o canal
      registerConnection(channel, controller);

      // Enviar mensagem de conexão
      const connectMessage = `data: ${JSON.stringify({
        type: 'connected',
        channel,
        timestamp: Date.now()
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(connectMessage));

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
        unregisterConnection(channel, controller);
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
