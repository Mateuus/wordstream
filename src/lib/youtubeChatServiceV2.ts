import { LiveChat } from 'youtube-chat';
import { broadcastToSharedSession } from './sharedSSEManager';
import { RedisSessionManager } from './redisSessionManager';

export interface YouTubeChatMessage {
  id: string;
  authorChannelId: string;
  displayName: string;
  profileImageUrl: string;
  messageText: string;
  publishedAt: string;
  isChatOwner: boolean;
  isChatModerator: boolean;
  isChatSponsor: boolean;
  isVerified: boolean;
  type: 'textMessage' | 'superChat' | 'superSticker' | 'memberMilestone' | 'newSponsor' | 'fanFunding' | 'poll' | 'membershipGifting' | 'giftMembershipReceived' | 'messageDeleted' | 'userBanned' | 'chatEnded' | 'sponsorOnlyModeStarted' | 'sponsorOnlyModeEnded';
  superChatDetails?: {
    amountMicros: string;
    currency: string;
    amountDisplayString: string;
    userComment: string;
    tier: number;
  };
  superStickerDetails?: {
    stickerId: string;
    altText: string;
    amountMicros: string;
    currency: string;
    amountDisplayString: string;
    tier: number;
  };
}

export class YouTubeChatServiceV2 {
  private liveChat: LiveChat | null = null;
  private sessionId: string;
  private channelId: string;
  private sessionManager: RedisSessionManager;
  private isCapturing: boolean = false;
  private lastActivity: number = Date.now();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(sessionId: string, channelId: string) {
    this.sessionId = sessionId;
    this.channelId = channelId;
    this.sessionManager = RedisSessionManager.getInstance();
  }

  /**
   * Inicia a captura do chat do YouTube Live usando youtube-chat
   */
  async startChatCapture(): Promise<boolean> {
    try {
      console.log(`🎬 [YouTube V2] Iniciando captura para canal: ${this.channelId}`);
      
      if (this.isCapturing) {
        console.log('⚠️ [YouTube V2] Captura já está ativa');
        return true;
      }

      // Criar instância do LiveChat
      this.liveChat = new LiveChat({ channelId: this.channelId });

      // Configurar eventos
      this.setupEventHandlers();

      // Iniciar captura
      const started = await this.liveChat.start();
      
      if (started) {
        this.isCapturing = true;
        this.lastActivity = Date.now();
        this.startHeartbeat();
        console.log(`✅ [YouTube V2] Captura iniciada com sucesso para canal: ${this.channelId}`);
        return true;
      } else {
        console.log('❌ [YouTube V2] Falha ao iniciar captura');
        return false;
      }
    } catch (error) {
      console.error('❌ [YouTube V2] Erro ao iniciar captura:', error);
      return false;
    }
  }

  /**
   * Para a captura do chat
   */
  stopChatCapture(): void {
    if (this.liveChat && this.isCapturing) {
      try {
        this.stopHeartbeat();
        this.liveChat.stop();
        console.log(`🛑 [YouTube V2] Captura interrompida para canal: ${this.channelId}`);
      } catch (error) {
        console.error('❌ [YouTube V2] Erro ao parar captura:', error);
      } finally {
        this.isCapturing = false;
        this.liveChat = null;
      }
    }
  }

  /**
   * Configura os event handlers do LiveChat
   */
  private setupEventHandlers(): void {
    if (!this.liveChat) return;

    // Evento de início
    this.liveChat.on('start', (liveId: string) => {
      console.log(`🚀 [YouTube V2] Live iniciada: ${liveId}`);
    });

    // Evento de mensagem de chat
    this.liveChat.on('chat', (chatItem: unknown) => {
      this.processChatMessage(chatItem);
    });

    // Evento de erro
    this.liveChat.on('error', (error: unknown) => {
      console.error('❌ [YouTube V2] Erro no chat:', error);
      
      // Se for erro 400 (Bad Request), pode indicar que a live não existe mais
      if (error && typeof error === 'object' && 'status' in error) {
        const axiosError = error as { status: number; code?: string };
        if (axiosError.status === 400) {
          console.log('🔄 [YouTube V2] Erro 400 detectado - possivelmente live encerrada, parando captura');
          this.stopChatCapture();
        }
      }
    });

    // Evento de fim
    this.liveChat.on('end', () => {
      console.log('🏁 [YouTube V2] Live encerrada');
      this.isCapturing = false;
    });
  }

  /**
   * Processa uma mensagem de chat recebida
   */
  private async processChatMessage(chatItem: unknown): Promise<void> {
    try {
      // Atualizar última atividade
      this.lastActivity = Date.now();
      
      // Validar se chatItem é válido
      if (!chatItem || typeof chatItem !== 'object') {
        console.warn('⚠️ [YouTube V2] ChatItem inválido recebido:', chatItem);
        return;
      }

      // Converter formato da biblioteca para nosso formato
      const item = chatItem as Record<string, unknown>;
      
      // Validar se item tem propriedades necessárias
      if (!item.author && !item.message) {
        console.warn('⚠️ [YouTube V2] Item sem autor ou mensagem:', item);
        return;
      }
      
      // Extrair dados do autor
      const author = (item.author as Record<string, unknown>) || {};
      const authorName = (author.name as string) || 'Usuário';
      const authorChannelId = (author.channelId as string) || '';
      const authorThumbnail = (author.thumbnail as Record<string, unknown>) || {};
      const profileImageUrl = (authorThumbnail.url as string) || '';
      
      // Extrair badge se existir
      const badge = (author.badge as Record<string, unknown>) || {};
      const badgeLabel = (badge.label as string) || '';
      
      // Processar mensagem (pode ser array de objetos)
      const messageArray = item.message as unknown[] || [];
      let messageText = '';
      
      if (Array.isArray(messageArray) && messageArray.length > 0) {
        messageText = messageArray
          .map(msg => {
            if (typeof msg === 'object' && msg !== null) {
              const msgObj = msg as Record<string, unknown>;
              if (msgObj.text) {
                return msgObj.text as string;
              } else if (msgObj.emojiText) {
                return msgObj.emojiText as string;
              }
            }
            return '';
          })
          .filter(text => text.length > 0)
          .join(' ');
      } else if (typeof item.message === 'string') {
        // Se a mensagem for uma string simples
        messageText = item.message as string;
      }
      
      // Validar se temos uma mensagem válida
      if (!messageText || messageText.trim().length === 0) {
        console.warn('⚠️ [YouTube V2] Mensagem vazia ignorada:', item);
        return;
      }
      
      const chatMessage: YouTubeChatMessage = {
        id: (item.id as string) || `yt_${Date.now()}_${Math.random()}`,
        authorChannelId: authorChannelId,
        displayName: authorName,
        profileImageUrl: profileImageUrl,
        messageText: messageText,
        publishedAt: (item.timestamp as string) || new Date().toISOString(),
        isChatOwner: (item.isOwner as boolean) || false,
        isChatModerator: (item.isModerator as boolean) || false,
        isChatSponsor: (item.isMembership as boolean) || false,
        isVerified: (item.isVerified as boolean) || false,
        type: 'textMessage'
      };

      // Broadcast da mensagem para a sessão
      broadcastToSharedSession(this.sessionId, {
        type: 'chatMessage',
        message: {
          id: chatMessage.id,
          username: chatMessage.displayName,
          message: chatMessage.messageText,
          timestamp: new Date(chatMessage.publishedAt).getTime(),
          platform: 'youtube',
          channel: this.channelId,
          badges: this.getBadges(chatMessage, badgeLabel),
          emotes: [],
          color: this.getUserColor(chatMessage),
          isOwner: chatMessage.isChatOwner,
          isModerator: chatMessage.isChatModerator,
          isSponsor: chatMessage.isChatSponsor,
          isVerified: chatMessage.isVerified,
          messageType: chatMessage.type,
          profileImageUrl: chatMessage.profileImageUrl
        }
      });

      // Processar primeira palavra da mensagem para o contador
      try {
        const firstWord = this.extractFirstWord(chatMessage.messageText);
        if (firstWord) {
          await this.sessionManager.processWord(this.sessionId, firstWord);
          
          // Enviar atualização de palavras
          const stats = await this.sessionManager.getSessionStats(this.sessionId);
          if (stats) {
            broadcastToSharedSession(this.sessionId, {
              type: 'wordUpdate',
              stats: stats
            });
          }
        }
      } catch (wordError) {
        console.error('❌ [YouTube V2] Erro ao processar palavra:', wordError);
      }
    } catch (error) {
      console.error('❌ [YouTube V2] Erro ao processar mensagem:', error);
    }
  }

  /**
   * Extrai a primeira palavra válida da mensagem
   */
  private extractFirstWord(message: string): string | null {
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

  /**
   * Gera badges baseadas nas propriedades do usuário
   */
  private getBadges(message: YouTubeChatMessage, badgeLabel?: string): string[] {
    const badges: string[] = [];
    
    if (message.isChatOwner) badges.push('owner');
    if (message.isChatModerator) badges.push('moderator');
    if (message.isChatSponsor) badges.push('sponsor');
    if (message.isVerified) badges.push('verified');
    
    // Adicionar badge específico do YouTube se existir
    if (badgeLabel) {
      if (badgeLabel.includes('Member')) {
        badges.push('member');
      } else if (badgeLabel.includes('New member')) {
        badges.push('new-member');
      }
    }
    
    return badges;
  }

  /**
   * Gera cor baseada no ID do canal do usuário
   */
  private getUserColor(message: YouTubeChatMessage): string {
    const hash = message.authorChannelId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  /**
   * Verifica se o serviço está ativo
   */
  isActive(): boolean {
    return this.isCapturing && this.liveChat !== null;
  }

  /**
   * Inicia o sistema de heartbeat para monitorar a conexão
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Garantir que não há heartbeat duplicado
    
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivity;
      
      // Se não há atividade há mais de 2 minutos, verificar se ainda há usuários conectados
      if (timeSinceLastActivity > 2 * 60 * 1000) {
        this.checkIfShouldDisconnect();
      }
    }, 30000); // Verificar a cada 30 segundos
  }

  /**
   * Para o sistema de heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Verifica se deve desconectar baseado na atividade da sessão
   */
  private async checkIfShouldDisconnect(): Promise<void> {
    try {
      // Verificar se há conexões SSE ativas para esta sessão
      const hasActiveConnections = await this.hasActiveSSEConnections();
      
      if (!hasActiveConnections) {
        console.log(`🔌 [YouTube V2] Sem usuários conectados há mais de 2 minutos, desconectando: ${this.channelId}`);
        this.stopChatCapture();
        
        // Notificar via Redis que a sessão foi desconectada por inatividade
        const { broadcastToSharedSession } = await import('./sharedSSEManager');
        broadcastToSharedSession(this.sessionId, {
          type: 'connectionStatus',
          status: { 
            isConnected: false, 
            channel: this.channelId, 
            platform: 'youtube',
            message: 'Conexão desconectada automaticamente - sessão sem usuários'
          }
        });
      }
    } catch (error) {
      console.error('❌ [YouTube V2] Erro ao verificar conexões ativas:', error);
    }
  }

  /**
   * Verifica se há conexões SSE ativas para esta sessão
   */
  private async hasActiveSSEConnections(): Promise<boolean> {
    try {
      const { getSharedSessionStats } = await import('./sharedSSEManager');
      const stats = getSharedSessionStats();
      
      const session = stats.sessions.find(s => s.publicId === this.sessionId);
      return session ? session.connections > 0 : false;
    } catch (error) {
      console.error('❌ [YouTube V2] Erro ao verificar estatísticas da sessão:', error);
      return false;
    }
  }
}
