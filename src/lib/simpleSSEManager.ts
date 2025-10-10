import { RedisPubSubManager } from './redisPubSubManager';

// Map para armazenar conexões SSE ativas por canal (local deste processo)
const activeConnections = new Map<string, ReadableStreamDefaultController[]>();
const redisPubSub = RedisPubSubManager.getInstance();

export function registerConnection(channel: string, controller: ReadableStreamDefaultController) {
  console.log(`🔌 Registrando conexão SSE para canal: ${channel}`);
  
  if (!activeConnections.has(channel)) {
    activeConnections.set(channel, []);
    console.log(`📝 Criando nova lista de conexões para canal: ${channel}`);
    
    // 🔥 IMPORTANTE: Assinar o canal Redis para receber broadcasts de outros processos
    redisPubSub.subscribe(channel, (data) => {
      console.log(`📥 Mensagem Redis recebida para canal ${channel}, tipo: ${data.type}`);
      broadcastToLocalConnections(channel, data);
    }).catch(console.error);
  }
  
  const connections = activeConnections.get(channel)!;
  connections.push(controller);
  
  console.log(`✅ Conexão SSE registrada para canal: ${channel}`);
  console.log(`📊 Total de conexões ativas NESTE PROCESSO para ${channel}: ${connections.length}`);
  console.log(`📋 Todas as conexões ativas NESTE PROCESSO:`, Array.from(activeConnections.keys()));
}

export function unregisterConnection(channel: string, controller: ReadableStreamDefaultController) {
  const connections = activeConnections.get(channel);
  if (connections) {
    const index = connections.indexOf(controller);
    if (index > -1) {
      connections.splice(index, 1);
      console.log(`🔌 Conexão SSE removida para canal: ${channel}. Restantes NESTE PROCESSO: ${connections.length}`);
    } else {
      console.log(`⚠️ Tentou remover conexão que não existe para canal: ${channel}`);
    }
    if (connections.length === 0) {
      activeConnections.delete(channel);
      console.log(`🗑️ Todas as conexões removidas NESTE PROCESSO, deletando canal: ${channel}`);
      // Desassinar do Redis
      redisPubSub.unsubscribe(channel).catch(console.error);
    }
  } else {
    console.log(`⚠️ Tentou desregistrar de canal inexistente: ${channel}`);
  }
}

/**
 * Envia mensagem para as conexões SSE locais (deste processo)
 */
function broadcastToLocalConnections(channel: string, data: unknown): void {
  const connections = activeConnections.get(channel);
  if (!connections || connections.length === 0) {
    console.log(`⚠️ Sem conexões locais para enviar no canal ${channel}`);
    return;
  }

  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encodedMessage = new TextEncoder().encode(message);
  
  let successCount = 0;
  let failCount = 0;
  
  connections.forEach(controller => {
    try {
      controller.enqueue(encodedMessage);
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`❌ Erro ao enviar para conexão:`, error);
      // Conexão foi fechada, remover da lista
      const index = connections.indexOf(controller);
      if (index > -1) {
        connections.splice(index, 1);
      }
    }
  });
  
  console.log(`✅ Broadcast local: ${successCount} sucesso, ${failCount} falhas para canal ${channel}`);
}

/**
 * Faz broadcast via Redis Pub/Sub
 * A mensagem será recebida por TODOS os processos que têm conexões SSE ativas
 */
export function broadcastToChannel(channel: string, data: unknown): void {
  const dataType = data && typeof data === 'object' && 'type' in data ? (data as { type: string }).type : 'unknown';
  console.log(`📡 Broadcasting via Redis para canal ${channel}, tipo: ${dataType}`);
  
  // 🔥 Publicar via Redis - será recebido por todos os processos
  redisPubSub.publish(channel, data).catch((error) => {
    console.error(`❌ Erro ao publicar via Redis:`, error);
    
    // Fallback: enviar localmente se Redis falhar
    console.log(`⚠️ Fallback: enviando apenas para conexões locais`);
    broadcastToLocalConnections(channel, data);
  });
}

export function getActiveConnectionsCount(channel: string): number {
  return activeConnections.get(channel)?.length || 0;
}

export function getAllActiveChannels(): string[] {
  return Array.from(activeConnections.keys());
}
