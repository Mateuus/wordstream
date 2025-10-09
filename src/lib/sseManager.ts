// Map para armazenar conexões SSE ativas
const activeConnections = new Map<string, ReadableStreamDefaultController[]>();

export function registerConnection(sessionId: string, controller: ReadableStreamDefaultController) {
  if (!activeConnections.has(sessionId)) {
    activeConnections.set(sessionId, []);
  }
  activeConnections.get(sessionId)!.push(controller);
}

export function unregisterConnection(sessionId: string, controller: ReadableStreamDefaultController) {
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

export function getActiveConnectionsCount(sessionId: string): number {
  return activeConnections.get(sessionId)?.length || 0;
}

