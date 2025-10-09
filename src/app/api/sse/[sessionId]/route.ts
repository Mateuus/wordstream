import { NextRequest } from 'next/server';

// Map para armazenar conexões SSE ativas
const activeConnections = new Map<string, ReadableStreamDefaultController[]>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const stream = new ReadableStream({
    start(controller) {
      // Adicionar conexão ativa
      if (!activeConnections.has(sessionId)) {
        activeConnections.set(sessionId, []);
      }
      activeConnections.get(sessionId)!.push(controller);

      // Enviar mensagem de conexão
      const connectMessage = `data: ${JSON.stringify({
        type: 'connected',
        sessionId,
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
        const connections = activeConnections.get(sessionId);
        if (connections) {
          const index = connections.indexOf(controller);
          if (index > -1) {
            connections.splice(index, 1);
          }
          if (connections.length === 0) {
            activeConnections.delete(sessionId);
          }
        }
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

// Função para broadcast para todos os clientes de uma sessão
export function broadcastToSession(sessionId: string, data: unknown) {
  const connections = activeConnections.get(sessionId);
  if (connections) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encodedMessage = new TextEncoder().encode(message);
    
    connections.forEach(controller => {
      try {
        controller.enqueue(encodedMessage);
      } catch {
        // Conexão foi fechada, remover da lista
        const index = connections.indexOf(controller);
        if (index > -1) {
          connections.splice(index, 1);
        }
      }
    });
  }
}
