import { RedisPubSubManager } from './redisPubSubManager';

// Map para armazenar conexões SSE ativas por canal (local deste processo)
const activeConnections = new Map<string, ReadableStreamDefaultController[]>();
const redisPubSub = RedisPubSubManager.getInstance();

export function registerConnection(channel: string, controller: ReadableStreamDefaultController) {
  if (!activeConnections.has(channel)) {
    activeConnections.set(channel, []);
    
    // 🔥 IMPORTANTE: Assinar o canal Redis para receber broadcasts de outros processos
    redisPubSub.subscribe(channel, (data) => {
      broadcastToLocalConnections(channel, data);
    }).catch(console.error);
  }
  
  const connections = activeConnections.get(channel)!;
  connections.push(controller);
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
      // Desassinar do Redis
      redisPubSub.unsubscribe(channel).catch(console.error);
    }
  }
}

/**
 * Envia mensagem para as conexões SSE locais (deste processo)
 */
function broadcastToLocalConnections(channel: string, data: unknown): void {
  const connections = activeConnections.get(channel);
  if (!connections || connections.length === 0) {
    return;
  }

  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encodedMessage = new TextEncoder().encode(message);
  
  connections.forEach(controller => {
    try {
      controller.enqueue(encodedMessage);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Conexão foi fechada, remover da lista
      const index = connections.indexOf(controller);
      if (index > -1) {
        connections.splice(index, 1);
      }
    }
  });
}

/**
 * Faz broadcast via Redis Pub/Sub
 * A mensagem será recebida por TODOS os processos que têm conexões SSE ativas
 */
export function broadcastToChannel(channel: string, data: unknown): void {
  // 🔥 Publicar via Redis - será recebido por todos os processos
  redisPubSub.publish(channel, data).catch((error) => {
    console.error(`❌ Erro ao publicar via Redis:`, error);
    
    // Fallback: enviar localmente se Redis falhar
    broadcastToLocalConnections(channel, data);
  });
}

export function getActiveConnectionsCount(channel: string): number {
  return activeConnections.get(channel)?.length || 0;
}

export function getAllActiveChannels(): string[] {
  return Array.from(activeConnections.keys());
}
