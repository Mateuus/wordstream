import { RedisPubSubManager } from './redisPubSubManager';

// Map para armazenar conexões SSE ativas por canal (local deste processo)
const activeConnections = new Map<string, ReadableStreamDefaultController[]>();
const redisPubSub = RedisPubSubManager.getInstance();

export function registerConnection(channel: string, controller: ReadableStreamDefaultController) {
  if (!activeConnections.has(channel)) {
    activeConnections.set(channel, []);
    
    // 🔥 IMPORTANTE: Assinar o canal Redis para receber broadcasts de outros processos
    // Mas apenas UMA vez por canal, não por conexão
    redisPubSub.subscribe(channel, (data) => {
      broadcastToLocalConnections(channel, data);
    }).catch(console.error);
    
    console.log(`🔌 Canal Redis '${channel}' assinado pela primeira vez`);
  }
  
  const connections = activeConnections.get(channel)!;
  connections.push(controller);
  
  console.log(`🔌 Conexão SSE registrada para canal '${channel}' (total: ${connections.length})`);
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
    console.log(`⚠️ Nenhuma conexão SSE local encontrada para canal '${channel}'`);
    return;
  }

  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encodedMessage = new TextEncoder().encode(message);
  
  console.log(`📡 Broadcast local para canal '${channel}' - ${connections.length} conexões`);
  
  connections.forEach((controller, index) => {
    try {
      controller.enqueue(encodedMessage);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Conexão foi fechada, remover da lista
      const connectionIndex = connections.indexOf(controller);
      if (connectionIndex > -1) {
        connections.splice(connectionIndex, 1);
        console.log(`🔌 Conexão SSE ${index} removida (fechada) para canal '${channel}'`);
      }
    }
  });
}

/**
 * Faz broadcast via Redis Pub/Sub
 * A mensagem será recebida por TODOS os processos que têm conexões SSE ativas
 */
export function broadcastToChannel(channel: string, data: unknown): void {
  console.log(`📡 Publicando via Redis para canal '${channel}':`, data);
  
  // 🔥 Publicar via Redis - será recebido por todos os processos
  redisPubSub.publish(channel, data).catch((error) => {
    console.error(`❌ Erro ao publicar via Redis:`, error);
    
    // Fallback: enviar localmente se Redis falhar
    console.log(`🔄 Fallback: enviando localmente para canal '${channel}'`);
    broadcastToLocalConnections(channel, data);
  });
}

export function getActiveConnectionsCount(channel: string): number {
  return activeConnections.get(channel)?.length || 0;
}

export function getAllActiveChannels(): string[] {
  return Array.from(activeConnections.keys());
}
