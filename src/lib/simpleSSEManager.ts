// Map para armazenar conexões SSE ativas por canal
const activeConnections = new Map<string, ReadableStreamDefaultController[]>();

export function registerConnection(channel: string, controller: ReadableStreamDefaultController) {
  if (!activeConnections.has(channel)) {
    activeConnections.set(channel, []);
  }
  activeConnections.get(channel)!.push(controller);
  console.log(`🔌 Conexão SSE registrada para canal: ${channel}`);
}

export function unregisterConnection(channel: string, controller: ReadableStreamDefaultController) {
  const connections = activeConnections.get(channel);
  if (connections) {
    const index = connections.indexOf(controller);
    if (index > -1) {
      connections.splice(index, 1);
    }
    if (connections.length === 0) {
      activeConnections.delete(channel);
    }
  }
  console.log(`🔌 Conexão SSE removida para canal: ${channel}`);
}

// Função para broadcast para todos os clientes de um canal
export function broadcastToChannel(channel: string, data: unknown) {
  const connections = activeConnections.get(channel);
  if (connections && connections.length > 0) {
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
    
    console.log(`📡 Broadcast enviado para ${connections.length} clientes do canal ${channel}`);
  }
}

export function getActiveConnectionsCount(channel: string): number {
  return activeConnections.get(channel)?.length || 0;
}

export function getAllActiveChannels(): string[] {
  return Array.from(activeConnections.keys());
}
