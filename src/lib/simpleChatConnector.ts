import tmi from 'tmi.js';
import { publishToSession } from './sessionChannelManager';
import { RedisSessionManager } from './redisSessionManager';
import { YouTubeChatService } from './youtubeChatService';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  platform: 'twitch' | 'kick' | 'youtube';
  channel: string;
}

export class SimpleChatConnector {
  private static instance: SimpleChatConnector;
  private connections = new Map<string, tmi.Client>(); // channelName -> client
  private youtubeConnections = new Map<string, YouTubeChatService>(); // sessionId -> youtubeService
  private sessionToChannel = new Map<string, string>(); // sessionId -> channelName
  private sessionManager = RedisSessionManager.getInstance();
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  
  // Sistema de reconexão automática
  private reconnectAttempts = new Map<string, number>(); // channelName -> attempts
  private reconnectTimeouts = new Map<string, NodeJS.Timeout>(); // channelName -> timeout
  private maxReconnectAttempts = 10; // Máximo de tentativas de reconexão
  private baseReconnectDelay = 5000; // Delay base de 5 segundos
  
  // Sistema de desconexão por inatividade
  private sseCheckInterval: NodeJS.Timeout | null = null;
  private readonly SSE_CHECK_INTERVAL = 30000; // Verificar a cada 30 segundos
  private readonly INACTIVITY_TIMEOUT = 60000; // Desconectar após 1 minuto sem SSE

  static getInstance(): SimpleChatConnector {
    if (!SimpleChatConnector.instance) {
      SimpleChatConnector.instance = new SimpleChatConnector();
    }
    return SimpleChatConnector.instance;
  }

  async connectToChannel(channel: string, _platform: 'twitch' | 'kick' | 'youtube' = 'twitch', existingSessionId?: string): Promise<string> {
    try {
      // SEMPRE usar a sessão existente fornecida
      if (!existingSessionId) {
        throw new Error('SessionId é obrigatório para conectar ao chat: ' + _platform);
      }
      
      // Verificar se já existe conexão para este sessionId
      if (this.sessionToChannel.has(existingSessionId)) {
        return existingSessionId;
      }
      
      // 🔍 Buscar dados da sessão pelo publicId para obter o canal e plataforma corretos
      // Isso garante que usamos os dados da sessão criada, não os parâmetros
      const session = await this.sessionManager.getSessionByPublicId(existingSessionId);
      if (!session) {
        throw new Error(`Sessão ${existingSessionId} não encontrada`);
      }
      
      const actualChannel = session.channel;
      const actualPlatform = session.platform;
      
      if (actualPlatform === 'twitch') {
        await this.connectToTwitch(actualChannel, existingSessionId);
      } else if (actualPlatform === 'youtube') {
        await this.connectToYouTube(actualChannel, existingSessionId);
      } else if (actualPlatform === 'kick') {
        // Kick não implementado ainda
        throw new Error('Kick ainda não está implementado');
      } else {
        throw new Error(`Plataforma não suportada: ${actualPlatform}`);
      }
      
      // Iniciar verificação periódica de conexões SSE
      this.startConnectionCheck();
      this.startSSEConnectionCheck();
      
      return existingSessionId;
    } catch (error) {
      console.error('Erro ao conectar ao canal:', error);
      throw error;
    }
  }

  private async connectToTwitch(channel: string, sessionId: string): Promise<void> {
    try {
      // Verificar se já existe conexão para este canal
      if (this.connections.has(channel)) {
        // Mapear sessionId -> channelName mesmo se já existe conexão
        this.sessionToChannel.set(sessionId, channel);
        return;
      }
      
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
        
        // Enviar status de conexão
        publishToSession(sessionId, {
          type: 'connectionStatus',
          status: { isConnected: true, channel, platform: 'twitch' }
        });
      });

      client.on('disconnected', (reason: string) => {
        console.log(`❌ Desconectado do canal Twitch: ${channel}`, reason);
        
        // Enviar status de desconexão
        publishToSession(sessionId, {
          type: 'connectionStatus',
          status: { isConnected: false, channel, platform: 'twitch' }
        });
        
        // Iniciar processo de reconexão automática
        this.handleDisconnection(channel, sessionId);
      });

      await client.connect();
      this.connections.set(channel, client);
      this.sessionToChannel.set(sessionId, channel); // Mapear sessionId -> channelName

    } catch (error) {
      console.error('Erro ao conectar ao Twitch:', error);
      throw error;
    }
  }

  private async connectToYouTube(channelId: string, sessionId: string): Promise<void> {
    try {
      // Verificar se já existe conexão para este sessionId
      if (this.youtubeConnections.has(sessionId)) {
        this.sessionToChannel.set(sessionId, channelId);
        return;
      }
      
      const youtubeService = new YouTubeChatService(sessionId, channelId);
      
      const started = await youtubeService.startChatCapture();
      if (started) {
        this.youtubeConnections.set(sessionId, youtubeService);
        this.sessionToChannel.set(sessionId, channelId);
        
        // Enviar status de conexão
        publishToSession(sessionId, {
          type: 'connectionStatus',
          status: { isConnected: true, channel: channelId, platform: 'youtube' }
        });
      } else {
        throw new Error('Falha ao iniciar captura do YouTube');
      }
      
    } catch (error) {
      console.error('Erro ao conectar ao YouTube:', error);
      throw error;
    }
  }

  private async processMessage(sessionId: string, message: ChatMessage): Promise<void> {
    try {
      // Publicar mensagem de chat no canal da sessão
      publishToSession(sessionId, {
        type: 'chatMessage',
        message: message
      });

      // Processar primeira palavra da mensagem
      const firstWord = this.extractFirstWord(message.message);
      if (firstWord) {
        await this.sessionManager.processWord(sessionId, firstWord);
        
        // Enviar atualização de palavras
        const stats = await this.sessionManager.getSessionStats(sessionId);
        if (stats) {
          publishToSession(sessionId, {
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
    // Cancelar tentativas de reconexão se existirem
    this.cancelReconnect(channel);
    
    // Desconectar Twitch
    const client = this.connections.get(channel);
    if (client) {
      await client.disconnect();
      this.connections.delete(channel);
      console.log(`🔌 Desconectado do canal Twitch: ${channel}`);
    }
    
    // Desconectar YouTube (buscar por sessionId)
    for (const [sessionId, youtubeService] of this.youtubeConnections.entries()) {
      const mappedChannel = this.sessionToChannel.get(sessionId);
      if (mappedChannel === channel) {
        youtubeService.stopChatCapture();
        this.youtubeConnections.delete(sessionId);
        console.log(`🔌 Desconectado do canal YouTube: ${channel}`);
        break;
      }
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
   * Inicia verificação periódica de conexões SSE ativas
   * Desconecta do chat se não há clientes conectados
   */
  private startSSEConnectionCheck(): void {
    if (this.sseCheckInterval) {
      return; // Já está rodando
    }

    this.sseCheckInterval = setInterval(() => {
      this.checkSSEConnectionsAndDisconnect();
    }, this.SSE_CHECK_INTERVAL);

    console.log('🔍 Verificação de conexões SSE iniciada');
  }

  /**
   * Verifica conexões SSE ativas e desconecta chats sem clientes
   */
  private checkSSEConnectionsAndDisconnect(): void {
    const channelsToDisconnect: string[] = [];

    // Verificar cada canal conectado
    for (const [channel] of this.connections.entries()) {
      // Encontrar sessionId correspondente ao canal
      let sessionId: string | null = null;
      for (const [sid, ch] of this.sessionToChannel.entries()) {
        if (ch === channel) {
          sessionId = sid;
          break;
        }
      }

      if (sessionId) {
        // Verificar se há conexões SSE ativas para esta sessão
        // Como agora usamos sessões compartilhadas, não precisamos mais verificar conexões individuais
      }
    }

    // Desconectar canais sem conexões SSE
    channelsToDisconnect.forEach(channel => {
      this.disconnectFromChannelPrivate(channel, 'Sem conexões SSE ativas');
    });
  }

  /**
   * Desconecta de um canal específico (método privado)
   */
  private disconnectFromChannelPrivate(channel: string, reason: string): void {
    // Desconectar Twitch
    const client = this.connections.get(channel);
    if (client) {
      console.log(`🔌 Desconectando do canal Twitch ${channel}: ${reason}`);
      
      // Desconectar cliente
      client.disconnect().catch(console.error);
      
      // Remover das estruturas de dados
      this.connections.delete(channel);
      
      // Remover mapeamento sessionId -> channel
      for (const [sessionId, ch] of this.sessionToChannel.entries()) {
        if (ch === channel) {
          this.sessionToChannel.delete(sessionId);
          break;
        }
      }
      
      // Limpar tentativas de reconexão
      this.reconnectAttempts.delete(channel);
      const timeout = this.reconnectTimeouts.get(channel);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(channel);
      }
      
      console.log(`✅ Desconectado do canal Twitch ${channel}`);
    }
    
    // Desconectar YouTube
    for (const [sessionId, youtubeService] of this.youtubeConnections.entries()) {
      const mappedChannel = this.sessionToChannel.get(sessionId);
      if (mappedChannel === channel) {
        console.log(`🔌 Desconectando do canal YouTube ${channel}: ${reason}`);
        youtubeService.stopChatCapture();
        this.youtubeConnections.delete(sessionId);
        this.sessionToChannel.delete(sessionId);
        console.log(`✅ Desconectado do canal YouTube ${channel}`);
        break;
      }
    }
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
   * Para a verificação de conexões SSE
   */
  private stopSSEConnectionCheck(): void {
    if (this.sseCheckInterval) {
      clearInterval(this.sseCheckInterval);
      this.sseCheckInterval = null;
    }
  }

  /**
   * Verifica sessões sem conexões SSE ativas e desconecta os canais
   */
  private async checkAndDisconnectInactiveChannels(): Promise<void> {
    const channelsToDisconnect: string[] = [];

    // Verificar cada sessionId para ver se tem conexões SSE ativas
    // Como agora usamos sessões compartilhadas, não precisamos mais verificar conexões individuais

    // Desconectar canais inativos
    for (const channel of channelsToDisconnect) {
      // Cancelar tentativas de reconexão antes de desconectar
      this.cancelReconnect(channel);
      await this.disconnectFromChannel(channel);
    }

    // Se não há mais conexões, parar a verificação
    if (this.connections.size === 0 && this.youtubeConnections.size === 0) {
      this.stopConnectionCheck();
      this.stopSSEConnectionCheck();
    }
  }

  /**
   * Manipula desconexões e inicia processo de reconexão
   */
  private handleDisconnection(channel: string, sessionId: string): void {
    this.scheduleReconnect(channel, sessionId);
  }

  /**
   * Agenda uma tentativa de reconexão para um canal
   */
  private scheduleReconnect(channel: string, sessionId: string): void {
    // Cancelar timeout anterior se existir
    const existingTimeout = this.reconnectTimeouts.get(channel);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Obter número atual de tentativas
    const currentAttempts = this.reconnectAttempts.get(channel) || 0;
    
    if (currentAttempts >= this.maxReconnectAttempts) {
      console.log(`🚫 Máximo de tentativas de reconexão atingido para o canal: ${channel}`);
      
      // Notificar falha definitiva
      publishToSession(sessionId, {
        type: 'connectionStatus',
        status: {
          isConnected: false,
          channel,
          platform: 'youtube', // Será atualizado baseado na sessão
          reconnectFailed: true,
          message: 'Falha na reconexão automática'
        }
      });
      
      return;
    }

    // Calcular delay com backoff exponencial
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, currentAttempts),
      60000 // Máximo de 60 segundos
    );

    console.log(`🔄 Agendando reconexão para ${channel} em ${delay}ms (tentativa ${currentAttempts + 1}/${this.maxReconnectAttempts})`);

    // Notificar tentativa de reconexão
    publishToSession(sessionId, {
      type: 'connectionStatus',
      status: { 
        isConnected: false, 
        channel, 
        platform: 'youtube', // Será atualizado baseado na sessão
        reconnecting: true,
        reconnectAttempt: currentAttempts + 1,
        maxReconnectAttempts: this.maxReconnectAttempts
      }
    });

    const timeout = setTimeout(async () => {
      await this.attemptReconnect(channel, sessionId);
    }, delay);

    this.reconnectTimeouts.set(channel, timeout);
  }

  /**
   * Tenta reconectar a um canal
   */
  private async attemptReconnect(channel: string, sessionId: string): Promise<void> {
    try {
      console.log(`🔄 Tentando reconectar ao canal: ${channel}`);
      
      // Incrementar contador de tentativas
      const currentAttempts = this.reconnectAttempts.get(channel) || 0;
      this.reconnectAttempts.set(channel, currentAttempts + 1);

      // Remover conexão anterior se existir
      const oldClient = this.connections.get(channel);
      if (oldClient) {
        try {
          await oldClient.disconnect();
        } catch (error) {
          console.log('Erro ao desconectar cliente anterior:', error);
        }
        this.connections.delete(channel);
      }

      // Tentar reconectar baseado na plataforma
      const session = await this.sessionManager.getSessionByPublicId(sessionId);
      if (session) {
        if (session.platform === 'twitch') {
          await this.connectToTwitch(channel, sessionId);
        } else if (session.platform === 'youtube') {
          await this.connectToYouTube(channel, sessionId);
        } else if (session.platform === 'kick') {
          // Kick não implementado ainda
          throw new Error('Kick ainda não está implementado');
        }
      }
      
      // Se chegou até aqui, a reconexão foi bem-sucedida
      console.log(`✅ Reconexão bem-sucedida para o canal: ${channel}`);
      
      // Limpar contadores de reconexão
      this.reconnectAttempts.delete(channel);
      this.reconnectTimeouts.delete(channel);
      
    } catch (error) {
      console.error(`❌ Falha na reconexão para ${channel}:`, error);
      
      // Agendar nova tentativa
      this.scheduleReconnect(channel, sessionId);
    }
  }

  /**
   * Cancela tentativas de reconexão para um canal
   */
  private cancelReconnect(channel: string): void {
    const timeout = this.reconnectTimeouts.get(channel);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(channel);
    }
    this.reconnectAttempts.delete(channel);
  }
}
