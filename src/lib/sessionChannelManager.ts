/**
 * SessionChannelManager - Sistema moderno de broadcast SSE
 * 
 * Arquitetura:
 * - 1 SessionChannel por publicId (sessão)
 * - N clientes SSE conectam ao mesmo canal
 * - Mensagens são enviadas UMA VEZ ao canal
 * - O canal distribui para todos os clientes
 * - Zero duplicação, independente do número de conexões
 */

import { RedisPubSubManager } from './redisPubSubManager';
import { randomBytes } from 'crypto';

// ID único deste processo para evitar loops do Redis
const PROCESS_ID = randomBytes(8).toString('hex');

type ClientType = 'session' | 'overlay';

interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
  type: ClientType;
  connectedAt: number;
}

/**
 * SessionChannel - Canal único para uma sessão
 * Todos os clientes SSE desta sessão compartilham este canal
 */
class SessionChannel {
  private publicId: string;
  private clients: Map<string, SSEClient> = new Map();
  private redisSubscribed: boolean = false;
  private createdAt: number = Date.now();
  private lastActivity: number = Date.now();

  constructor(publicId: string) {
    this.publicId = publicId;
    this.setupRedisSubscription();
  }

  /**
   * Configura assinatura Redis UMA VEZ para este canal
   */
  private setupRedisSubscription(): void {
    const redis = RedisPubSubManager.getInstance();
    
    redis.subscribe(this.publicId, (data) => {
      // Verificar se a mensagem veio de outro processo
      const msg = data as { _processId?: string };
      
      if (msg._processId && msg._processId !== PROCESS_ID) {
        // Mensagem de outro processo, fazer broadcast local
        this.broadcastToClients(data);
      }
      // Se _processId === PROCESS_ID, ignorar (já enviamos localmente)
    }).catch(console.error);
    
    this.redisSubscribed = true;
  }

  /**
   * Adiciona um cliente SSE ao canal
   */
  addClient(controller: ReadableStreamDefaultController, type: ClientType): string {
    const clientId = `${Date.now()}_${randomBytes(4).toString('hex')}`;
    
    this.clients.set(clientId, {
      id: clientId,
      controller,
      type,
      connectedAt: Date.now()
    });
    
    this.lastActivity = Date.now();
    
    return clientId;
  }

  /**
   * Remove um cliente SSE do canal
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
    this.lastActivity = Date.now();
  }

  /**
   * Verifica se o canal tem clientes ativos
   */
  hasClients(): boolean {
    return this.clients.size > 0;
  }

  /**
   * Obtém número de clientes conectados
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Broadcast UMA mensagem para TODOS os clientes do canal
   * Com filtro baseado no tipo de cliente
   */
  private broadcastToClients(data: unknown): void {
    // Remover _processId antes de enviar aos clientes
    const cleanData = { ...data as object };
    delete (cleanData as { _processId?: string })._processId;
    
    const messageType = (cleanData as { type?: string })?.type || 'unknown';
    const message = `data: ${JSON.stringify(cleanData)}\n\n`;
    const encodedMessage = new TextEncoder().encode(message);
    
    const deadClients: string[] = [];
    
    // Enviar para cada cliente (com filtro por tipo)
    this.clients.forEach((client) => {
      try {
        // Filtro: overlays não recebem chatMessage
        if (client.type === 'overlay' && messageType === 'chatMessage') {
          return; // Skip
        }
        
        client.controller.enqueue(encodedMessage);
      } catch {
        // Cliente desconectado, marcar para remoção
        deadClients.push(client.id);
      }
    });
    
    // Limpar clientes mortos
    deadClients.forEach(id => this.clients.delete(id));
  }

  /**
   * Publica uma mensagem neste canal
   * - Envia localmente para todos os clientes
   * - Publica no Redis para outros processos
   */
  publish(data: unknown): void {
    // 1. Broadcast local PRIMEIRO
    this.broadcastToClients(data);
    
    // 2. Publicar no Redis com ID do processo
    const messageWithProcessId = {
      ...data as object,
      _processId: PROCESS_ID
    };
    
    const redis = RedisPubSubManager.getInstance();
    redis.publish(this.publicId, messageWithProcessId).catch(console.error);
    
    this.lastActivity = Date.now();
  }

  /**
   * Fecha o canal e todos os clientes
   */
  close(): void {
    // Fechar todas as conexões
    this.clients.forEach(client => {
      try {
        client.controller.close();
      } catch {
        // Ignorar erros
      }
    });
    
    this.clients.clear();
    
    // Desassinar do Redis
    if (this.redisSubscribed) {
      const redis = RedisPubSubManager.getInstance();
      redis.unsubscribe(this.publicId).catch(console.error);
    }
  }

  /**
   * Verifica se o canal está inativo
   */
  isInactive(timeoutMs: number): boolean {
    return Date.now() - this.lastActivity > timeoutMs;
  }

  /**
   * Obtém estatísticas do canal
   */
  getStats() {
    return {
      publicId: this.publicId,
      clientCount: this.clients.size,
      clients: Array.from(this.clients.values()).map(c => ({
        id: c.id,
        type: c.type,
        connectedAt: c.connectedAt
      })),
      createdAt: this.createdAt,
      lastActivity: this.lastActivity
    };
  }
}

/**
 * SessionChannelManager - Gerenciador global de canais
 * Singleton que mantém um canal por sessão
 */
class SessionChannelManager {
  private static instance: SessionChannelManager;
  private channels: Map<string, SessionChannel> = new Map();

  private constructor() {
    // Limpeza automática de canais inativos
    setInterval(() => this.cleanupInactiveChannels(), 2 * 60 * 1000);
  }

  static getInstance(): SessionChannelManager {
    if (!SessionChannelManager.instance) {
      SessionChannelManager.instance = new SessionChannelManager();
    }
    return SessionChannelManager.instance;
  }

  /**
   * Obtém ou cria um canal para uma sessão
   */
  getOrCreateChannel(publicId: string): SessionChannel {
    let channel = this.channels.get(publicId);
    
    if (!channel) {
      channel = new SessionChannel(publicId);
      this.channels.set(publicId, channel);
    }
    
    return channel;
  }

  /**
   * Remove um canal
   */
  removeChannel(publicId: string): void {
    const channel = this.channels.get(publicId);
    if (channel) {
      channel.close();
      this.channels.delete(publicId);
    }
  }

  /**
   * Publica uma mensagem em um canal
   */
  publish(publicId: string, data: unknown): void {
    const channel = this.channels.get(publicId);
    if (channel) {
      channel.publish(data);
    }
  }

  /**
   * Limpa canais inativos (sem clientes por mais de 5 minutos)
   */
  private cleanupInactiveChannels(): void {
    const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos
    
    const inactiveChannels: string[] = [];
    
    this.channels.forEach((channel, publicId) => {
      if (!channel.hasClients() && channel.isInactive(INACTIVITY_TIMEOUT)) {
        inactiveChannels.push(publicId);
      }
    });
    
    inactiveChannels.forEach(publicId => this.removeChannel(publicId));
  }

  /**
   * Obtém estatísticas de todos os canais
   */
  getStats() {
    const channels = Array.from(this.channels.values()).map(c => c.getStats());
    const totalClients = channels.reduce((sum, c) => sum + c.clientCount, 0);
    
    return {
      totalChannels: this.channels.size,
      totalClients,
      channels,
      processId: PROCESS_ID
    };
  }
}

// Exportar singleton
export const sessionChannelManager = SessionChannelManager.getInstance();

// Funções de conveniência
export function subscribeToSession(
  publicId: string,
  controller: ReadableStreamDefaultController,
  clientType: ClientType = 'session'
): string {
  const channel = sessionChannelManager.getOrCreateChannel(publicId);
  return channel.addClient(controller, clientType);
}

export function unsubscribeFromSession(publicId: string, clientId: string): void {
  const channel = sessionChannelManager.getOrCreateChannel(publicId);
  channel.removeClient(clientId);
  
  // Se não há mais clientes, remover canal após um tempo
  if (!channel.hasClients()) {
    setTimeout(() => {
      if (!channel.hasClients()) {
        sessionChannelManager.removeChannel(publicId);
      }
    }, 60000); // 1 minuto
  }
}

export function publishToSession(publicId: string, data: unknown): void {
  sessionChannelManager.publish(publicId, data);
}

export function getSessionStats() {
  return sessionChannelManager.getStats();
}

