import { RedisPubSubManager } from './redisPubSubManager';

interface SharedSSEConnection {
  controller: ReadableStreamDefaultController;
  clientId: string;
  connectedAt: number;
  clientType: 'session' | 'overlay'; // Tipo de cliente
}

interface SharedSSESession {
  publicId: string;
  channel: string;
  connections: Map<string, SharedSSEConnection>;
  redisSubscription: boolean;
  createdAt: number;
  lastActivity: number;
}

// Map para armazenar sessões SSE compartilhadas
const sharedSessions = new Map<string, SharedSSESession>();
const redisPubSub = RedisPubSubManager.getInstance();

/**
 * Registra uma nova conexão SSE para uma sessão compartilhada
 * Se a sessão já existe, apenas adiciona a nova conexão
 * Se não existe, cria uma nova sessão e conecta ao Redis
 */
export function registerSharedConnection(
  publicId: string, 
  channel: string, 
  controller: ReadableStreamDefaultController,
  clientType: 'session' | 'overlay' = 'session'
): string {
  const clientId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Verificar se a sessão já existe
  let session = sharedSessions.get(publicId);
  
  if (!session) {
    // Criar nova sessão compartilhada
    session = {
      publicId,
      channel,
      connections: new Map(),
      redisSubscription: false,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    sharedSessions.set(publicId, session);
    // Conectar ao Redis apenas uma vez por sessão
    redisPubSub.subscribe(publicId, (data) => {
      broadcastToSession(publicId, data);
    }).catch(console.error);
    
    session.redisSubscription = true;
  }
  
  // Adicionar nova conexão à sessão
  session.connections.set(clientId, {
    controller,
    clientId,
    connectedAt: Date.now(),
    clientType
  });
  
  session.lastActivity = Date.now();
  
  return clientId;
}

/**
 * Remove uma conexão específica de uma sessão compartilhada
 * Se não há mais conexões, remove a sessão e desconecta do Redis
 */
export function unregisterSharedConnection(publicId: string, clientId: string): void {
  const session = sharedSessions.get(publicId);
  if (!session) return;
  
  // Remover conexão específica
  session.connections.delete(clientId);
  
  // Se não há mais conexões, limpar sessão
  if (session.connections.size === 0) {
    sharedSessions.delete(publicId);
    
    // Desconectar do Redis
    if (session.redisSubscription) {
      redisPubSub.unsubscribe(publicId).catch(console.error);
    }
  }
}

/**
 * Faz broadcast para todas as conexões de uma sessão compartilhada
 * Filtra mensagens baseado no tipo de cliente
 */
function broadcastToSession(publicId: string, data: unknown): void {
  const session = sharedSessions.get(publicId);
  if (!session || session.connections.size === 0) {
    return;
  }
  
  // Filtrar mensagens baseado no tipo de cliente
  const shouldSendToClient = (clientType: 'session' | 'overlay', messageType: string): boolean => {
    // Overlays não recebem mensagens de chat
    if (clientType === 'overlay' && messageType === 'chatMessage') {
      return false;
    }
    
    // Todos os outros tipos de mensagem são enviados para todos
    return true;
  };
  
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encodedMessage = new TextEncoder().encode(message);
  
  // Determinar tipo de mensagem
  const messageType = (data as { type?: string })?.type || 'unknown';
  
  // Enviar para todas as conexões da sessão (com filtro)
  const deadConnections: string[] = [];
  
  session.connections.forEach((connection, clientId) => {
    try {
      if (shouldSendToClient(connection.clientType, messageType)) {
        connection.controller.enqueue(encodedMessage);
      }
    } catch {
      // Conexão foi fechada, marcar para remoção
      deadConnections.push(clientId);
    }
  });
  
  // Remover conexões mortas
  deadConnections.forEach(clientId => {
    session.connections.delete(clientId);
  });
}

/**
 * Faz broadcast via Redis para uma sessão compartilhada
 */
export function broadcastToSharedSession(publicId: string, data: unknown): void {
  redisPubSub.publish(publicId, data).catch((error) => {
    console.error(`Erro ao publicar via Redis:`, error);
    
    // Fallback: enviar localmente se Redis falhar
    broadcastToSession(publicId, data);
  });
}

/**
 * Obtém estatísticas das sessões compartilhadas
 */
export function getSharedSessionStats(): {
  totalSessions: number;
  totalConnections: number;
  sessions: Array<{
    publicId: string;
    channel: string;
    connections: number;
    createdAt: number;
    lastActivity: number;
  }>;
} {
  const sessions = Array.from(sharedSessions.values()).map(session => ({
    publicId: session.publicId,
    channel: session.channel,
    connections: session.connections.size,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity
  }));
  
  const totalConnections = sessions.reduce((sum, session) => sum + session.connections, 0);
  
  return {
    totalSessions: sharedSessions.size,
    totalConnections,
    sessions
  };
}

/**
 * Limpa sessões inativas (mais de 5 minutos sem atividade)
 */
export function cleanupInactiveSessions(): void {
  const now = Date.now();
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos
  
  const inactiveSessions: string[] = [];
  
  sharedSessions.forEach((session, publicId) => {
    if (now - session.lastActivity > INACTIVITY_TIMEOUT) {
      inactiveSessions.push(publicId);
    }
  });
  
  inactiveSessions.forEach(publicId => {
    const session = sharedSessions.get(publicId);
    if (session) {
      // Fechar todas as conexões
      session.connections.forEach((connection) => {
        try {
          connection.controller.close();
        } catch {
          // Ignorar erros ao fechar
        }
      });
      
      // Remover sessão
      sharedSessions.delete(publicId);
      
      // Desconectar do Redis
      if (session.redisSubscription) {
        redisPubSub.unsubscribe(publicId).catch(console.error);
      }
    }
  });
  
}

// Limpeza automática a cada 2 minutos
setInterval(cleanupInactiveSessions, 2 * 60 * 1000);
