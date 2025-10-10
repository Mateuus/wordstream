import tmi from 'tmi.js';
import { broadcastToChannel, getActiveConnectionsCount } from './simpleSSEManager';
import { RedisSessionManager } from './redisSessionManager';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  platform: 'twitch' | 'kick';
  channel: string;
}

export class SimpleChatConnector {
  private static instance: SimpleChatConnector;
  private connections = new Map<string, tmi.Client>(); // channelName -> client
  private sessionToChannel = new Map<string, string>(); // sessionId -> channelName
  private sessionManager = RedisSessionManager.getInstance();
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  static getInstance(): SimpleChatConnector {
    if (!SimpleChatConnector.instance) {
      SimpleChatConnector.instance = new SimpleChatConnector();
    }
    return SimpleChatConnector.instance;
  }

  async connectToChannel(channel: string, _platform: 'twitch' | 'kick' = 'twitch', existingSessionId?: string): Promise<string> {
    try {
      // SEMPRE usar a sessão existente fornecida
      if (!existingSessionId) {
        throw new Error('SessionId é obrigatório para conectar ao chat: ' + _platform);
      }
      
      console.log(`🔗 Conectando chat à sessão existente: ${existingSessionId}`);
      
      // 🔍 Buscar dados da sessão pelo publicId para obter o canal e plataforma corretos
      // Isso garante que usamos os dados da sessão criada, não os parâmetros
      const session = await this.sessionManager.getSessionByPublicId(existingSessionId);
      if (!session) {
        throw new Error(`Sessão ${existingSessionId} não encontrada`);
      }
      
      const actualChannel = session.channel;
      const actualPlatform = session.platform;
      
      console.log(`📺 Canal obtido da sessão: ${actualChannel} (plataforma: ${actualPlatform})`);
      
      if (actualPlatform === 'twitch') {
        await this.connectToTwitch(actualChannel, existingSessionId);
      }
      
      // Iniciar verificação periódica de conexões SSE
      this.startConnectionCheck();
      
      return existingSessionId;
    } catch (error) {
      console.error('Erro ao conectar ao canal:', error);
      throw error;
    }
  }

  private async connectToTwitch(channel: string, sessionId: string): Promise<void> {
    try {
      const client = new tmi.Client({
        options: { debug: false },
        connection: {
          secure: true,
          reconnect: true,
          maxReconnectAttempts: 5,
          maxReconnectInterval: 30000
        },
        channels: [channel]
      });

      client.on('message', async (channel: string, tags: unknown, message: string, self: boolean) => {
        if (self) return;

        const chatMessage: ChatMessage = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          username: (tags as { username?: string }).username || 'Anônimo',
          message: message,
          timestamp: new Date(),
          platform: 'twitch',
          channel: channel.replace('#', '')
        };

        await this.processMessage(sessionId, chatMessage);
      });

      client.on('connected', () => {
        console.log(`✅ Conectado ao canal Twitch: ${channel}`);
        
        // 🔑 Enviar status de conexão via SSE usando sessionId (publicId)
        broadcastToChannel(sessionId, {
          type: 'connectionStatus',
          status: { isConnected: true, channel, platform: 'twitch' }
        });
      });

      client.on('disconnected', (reason: string) => {
        console.log(`❌ Desconectado do canal Twitch: ${channel}`, reason);
        
        // 🔑 Enviar status de desconexão via SSE usando sessionId (publicId)
        broadcastToChannel(sessionId, {
          type: 'connectionStatus',
          status: { isConnected: false, channel, platform: 'twitch' }
        });
      });

      await client.connect();
      this.connections.set(channel, client);
      this.sessionToChannel.set(sessionId, channel); // Mapear sessionId -> channelName
      console.log(`🔗 Mapeamento criado: sessionId ${sessionId} -> canal ${channel}`);

    } catch (error) {
      console.error('Erro ao conectar ao Twitch:', error);
      throw error;
    }
  }

  private async processMessage(sessionId: string, message: ChatMessage): Promise<void> {
    try {
      // 🔑 SEMPRE enviar via SSE - o broadcast vai falhar silenciosamente se não houver conexões
      // Isso resolve o problema de serverless onde o Map de conexões não é compartilhado entre processos
      broadcastToChannel(sessionId, {
        type: 'chatMessage',
        message: message
      });

      // Processar primeira palavra da mensagem
      const firstWord = this.extractFirstWord(message.message);
      if (firstWord) {
        await this.sessionManager.processWord(sessionId, firstWord);
        
        // Enviar atualização de palavras via SSE usando sessionId (publicId)
        const stats = await this.sessionManager.getSessionStats(sessionId);
        if (stats) {
          broadcastToChannel(sessionId, {
            type: 'wordUpdate',
            stats: stats
          });
        }
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  }

  private extractFirstWord(message: string): string | null {
    // Extrair primeira palavra válida da mensagem
    const words = message.trim().split(/\s+/);
    const firstWord = words[0];
    
    if (!firstWord || firstWord.length < 2) return null;
    
    // Filtrar palavras muito repetitivas
    const repeatedChars = /(.)\1{2,}/;
    if (repeatedChars.test(firstWord)) return null;
    
    // Filtrar palavras muito comuns
    const commonWords = ['kkk', 'kkkk', 'kkkkk', 'haha', 'hahaha', 'rsrs', 'rsrsrs', 'lol', 'wtf', 'omg'];
    if (commonWords.includes(firstWord.toLowerCase())) return null;
    
    return firstWord;
  }

  async disconnectFromChannel(channel: string): Promise<void> {
    const client = this.connections.get(channel);
    if (client) {
      await client.disconnect();
      this.connections.delete(channel);
      console.log(`🔌 Desconectado do canal: ${channel}`);
    }
  }

  async getSessionStats(sessionId: string) {
    return await this.sessionManager.getSessionStats(sessionId);
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.sessionManager.clearSession(sessionId);
  }

  /**
   * Inicia verificação periódica de conexões SSE
   * Se não há conexões ativas, desconecta do chat para economizar recursos
   */
  private startConnectionCheck(): void {
    if (this.connectionCheckInterval) {
      return; // Já está rodando
    }

    this.connectionCheckInterval = setInterval(() => {
      this.checkAndDisconnectInactiveChannels();
    }, 30000); // Verificar a cada 30 segundos

    console.log('🔄 Verificação periódica de conexões SSE iniciada');
  }

  /**
   * Para a verificação periódica de conexões
   */
  private stopConnectionCheck(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  /**
   * Verifica sessões sem conexões SSE ativas e desconecta os canais
   */
  private async checkAndDisconnectInactiveChannels(): Promise<void> {
    const channelsToDisconnect: string[] = [];

    // Verificar cada sessionId para ver se tem conexões SSE ativas
    for (const [sessionId, channelName] of this.sessionToChannel.entries()) {
      const activeConnections = getActiveConnectionsCount(sessionId);
      
      if (activeConnections === 0) {
        channelsToDisconnect.push(channelName);
        this.sessionToChannel.delete(sessionId); // Remover mapeamento
      }
    }

    // Desconectar canais inativos
    for (const channel of channelsToDisconnect) {
      await this.disconnectFromChannel(channel);
    }

    // Se não há mais conexões, parar a verificação
    if (this.connections.size === 0) {
      this.stopConnectionCheck();
    }
  }
}
