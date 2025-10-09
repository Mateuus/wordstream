import tmi from 'tmi.js';
import { broadcastToChannel } from './simpleSSEManager';
import { SimpleSessionManager } from './simpleSessionManager';

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
  private connections = new Map<string, tmi.Client>();
  private sessionManager = SimpleSessionManager.getInstance();

  static getInstance(): SimpleChatConnector {
    if (!SimpleChatConnector.instance) {
      SimpleChatConnector.instance = new SimpleChatConnector();
    }
    return SimpleChatConnector.instance;
  }

  async connectToChannel(channel: string, platform: 'twitch' | 'kick' = 'twitch'): Promise<string> {
    try {
      // Criar sessão para o canal
      const sessionId = this.sessionManager.createSession(channel, platform);
      
      if (platform === 'twitch') {
        await this.connectToTwitch(channel, sessionId);
      }
      
      return sessionId;
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

      client.on('message', (channel: string, tags: unknown, message: string, self: boolean) => {
        if (self) return;

        const chatMessage: ChatMessage = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          username: (tags as { username?: string }).username || 'Anônimo',
          message: message,
          timestamp: new Date(),
          platform: 'twitch',
          channel: channel.replace('#', '')
        };

        this.processMessage(sessionId, chatMessage);
      });

      client.on('connected', () => {
        console.log(`✅ Conectado ao canal Twitch: ${channel}`);
        
        // Enviar status de conexão via SSE
        broadcastToChannel(channel, {
          type: 'connectionStatus',
          status: { isConnected: true, channel, platform: 'twitch' }
        });
      });

      client.on('disconnected', (reason: string) => {
        console.log(`❌ Desconectado do canal Twitch: ${channel}`, reason);
        
        // Enviar status de desconexão via SSE
        broadcastToChannel(channel, {
          type: 'connectionStatus',
          status: { isConnected: false, channel, platform: 'twitch' }
        });
      });

      await client.connect();
      this.connections.set(channel, client);

    } catch (error) {
      console.error('Erro ao conectar ao Twitch:', error);
      throw error;
    }
  }

  private processMessage(sessionId: string, message: ChatMessage): void {
    try {
      // Enviar mensagem via SSE para o frontend
      broadcastToChannel(message.channel, {
        type: 'chatMessage',
        message: message
      });

      // Processar primeira palavra da mensagem
      const firstWord = this.extractFirstWord(message.message);
      if (firstWord) {
        this.sessionManager.processWord(sessionId, firstWord);
        
        // Enviar atualização de palavras via SSE
        const stats = this.sessionManager.getSessionStats(sessionId);
        if (stats) {
          broadcastToChannel(message.channel, {
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

  getSessionStats(sessionId: string) {
    return this.sessionManager.getSessionStats(sessionId);
  }

  clearSession(sessionId: string): boolean {
    return this.sessionManager.clearSession(sessionId);
  }
}
