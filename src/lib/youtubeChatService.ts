import { google } from 'googleapis';
import { broadcastToSharedSession } from './sharedSSEManager';

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

export interface YouTubeLiveStream {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  liveChatId: string;
  isLive: boolean;
  viewerCount?: number;
}

export class YouTubeChatService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private youtube: any;
  private liveChatId: string | null = null;
  private nextPageToken: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private sessionId: string;
  private channelId: string;

  constructor(sessionId: string, channelId: string, apiKey?: string) {
    this.sessionId = sessionId;
    this.channelId = channelId;
    
    // Usar API Key do .env se não fornecida
    const finalApiKey = apiKey || process.env.YOUTUBE_API_KEY;
    
    if (!finalApiKey) {
      throw new Error('YouTube API Key não configurada. Configure YOUTUBE_API_KEY no .env');
    }
    
    // Inicializar a API do YouTube
    this.youtube = google.youtube({
      version: 'v3',
      auth: finalApiKey
    });
  }

  /**
   * Inicia a captura do chat do YouTube Live
   */
  async startChatCapture(): Promise<boolean> {
    try {
      console.log(`🎬 Iniciando captura do chat do YouTube para canal: ${this.channelId}`);
      
      // 1. Buscar transmissões ao vivo do canal
      const liveStream = await this.findActiveLiveStream();
      if (!liveStream) {
        console.log('❌ Nenhuma transmissão ao vivo encontrada');
        return false;
      }

      this.liveChatId = liveStream.liveChatId;
      console.log(`✅ Transmissão ao vivo encontrada: ${liveStream.title}`);
      console.log(`🔗 Live Chat ID: ${this.liveChatId}`);

      // 2. Iniciar polling das mensagens
      this.startPolling();
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao iniciar captura do chat:', error);
      return false;
    }
  }

  /**
   * Para a captura do chat
   */
  stopChatCapture(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    this.liveChatId = null;
    this.nextPageToken = null;
    console.log('🛑 Captura do chat do YouTube interrompida');
  }

  /**
   * Busca transmissões ao vivo ativas do canal
   */
  private async findActiveLiveStream(): Promise<YouTubeLiveStream | null> {
    try {
      console.log(`🔍 Buscando transmissões ao vivo para canal: ${this.channelId}`);
      
      // Buscar transmissões ao vivo do canal
      const searchResponse = await this.youtube.search.list({
        part: 'snippet',
        channelId: this.channelId,
        type: 'video',
        eventType: 'live',
        order: 'date'
      });

      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        console.log('❌ Nenhuma transmissão ao vivo encontrada');
        return null;
      }

      console.log(`✅ ${searchResponse.data.items.length} transmissão(ões) ao vivo encontrada(s)`);

      // Pegar a primeira transmissão ao vivo
      const liveVideo = searchResponse.data.items[0];
      console.log(`📺 Vídeo: ${liveVideo.snippet.title}`);
      
      // Buscar detalhes da transmissão para obter o liveChatId
      const videoDetails = await this.youtube.videos.list({
        part: 'liveStreamingDetails,snippet,statistics',
        id: liveVideo.id.videoId
      });

      if (!videoDetails.data.items || videoDetails.data.items.length === 0) {
        console.log('❌ Detalhes do vídeo não encontrados');
        return null;
      }

      const video = videoDetails.data.items[0];
      const liveStreamingDetails = video.liveStreamingDetails;

      if (!liveStreamingDetails?.activeLiveChatId) {
        console.log('❌ Live Chat ID não encontrado - chat pode estar desabilitado');
        return null;
      }

      const liveChatId = liveStreamingDetails.activeLiveChatId;
      console.log(`🔗 Live Chat ID: ${liveChatId}`);

      return {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        channelId: video.snippet.channelId,
        channelTitle: video.snippet.channelTitle,
        liveChatId: liveChatId,
        isLive: true,
        viewerCount: parseInt(video.statistics?.viewCount || '0')
      };
    } catch (error) {
      console.error('❌ Erro ao buscar transmissão ao vivo:', error);
      return null;
    }
  }

  /**
   * Inicia o polling das mensagens do chat
   */
  private startPolling(): void {
    if (this.isPolling) return;
    
    this.isPolling = true;
    console.log('🔄 Iniciando polling das mensagens do chat...');

    // Primeira busca imediata
    this.pollMessages();

    // Configurar polling a cada 3 segundos (recomendado pela API)
    this.pollingInterval = setInterval(() => {
      this.pollMessages();
    }, 3000);
  }

  /**
   * Busca mensagens do chat
   */
  private async pollMessages(): Promise<void> {
    if (!this.liveChatId) return;

    try {
      console.log('💬 Buscando mensagens do chat...');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        part: 'snippet,authorDetails',
        liveChatId: this.liveChatId,
        maxResults: 200
      };

      if (this.nextPageToken) {
        params.pageToken = this.nextPageToken;
      }

      const response = await this.youtube.liveChatMessages.list(params);
      
      if (response.data.items && response.data.items.length > 0) {
        console.log(`✅ ${response.data.items.length} mensagem(ns) encontrada(s)`);
        this.nextPageToken = response.data.nextPageToken;
        
        // Processar mensagens
        for (const item of response.data.items) {
          this.processMessage(item);
        }
      } else {
        console.log('⚠️ Nenhuma mensagem encontrada no chat (pode estar vazio ou com restrições)');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens do chat:', error instanceof Error ? error.message : String(error));
      
      // Se houver erro de quota ou autenticação, parar o polling
      if (error instanceof Error && (error.message.includes('403') || error.message.includes('401'))) {
        console.error('🚫 Erro de autenticação ou quota excedida. Parando captura.');
        this.stopChatCapture();
      }
    }
  }

  /**
   * Processa uma mensagem individual do chat
   */
  private processMessage(item: unknown): void {
    try {
      const messageItem = item as {
        id: string;
        snippet: {
          type: string;
          publishedAt: string;
          textMessageDetails?: { messageText: string };
          superChatDetails?: {
            amountMicros: string;
            currency: string;
            amountDisplayString: string;
            userComment: string;
            tier: number;
          };
          superStickerDetails?: {
            superStickerMetadata?: {
              stickerId: string;
              altText: string;
            };
            amountMicros: string;
            currency: string;
            amountDisplayString: string;
            tier: number;
          };
          memberMilestoneChatDetails?: { userComment: string };
          fanFundingEventDetails?: { userComment: string };
          pollDetails?: { metadata: { questionText: string } };
          membershipGiftingDetails?: { giftMembershipsCount: number };
          userBannedDetails?: { bannedUserDetails: { displayName: string } };
        };
        authorDetails: {
          channelId: string;
          displayName: string;
          profileImageUrl: string;
          isChatOwner?: boolean;
          isChatModerator?: boolean;
          isChatSponsor?: boolean;
          isVerified?: boolean;
        };
      };
      
      const snippet = messageItem.snippet;
      const authorDetails = messageItem.authorDetails;

      // Determinar o tipo da mensagem
      let messageType: YouTubeChatMessage['type'] = 'textMessage';
      let messageText = '';
      let superChatDetails = undefined;
      let superStickerDetails = undefined;

      switch (snippet.type) {
        case 'textMessageEvent':
          messageText = snippet.textMessageDetails?.messageText || '';
          break;
        case 'superChatEvent':
          messageType = 'superChat';
          messageText = snippet.superChatDetails?.userComment || '';
          superChatDetails = {
            amountMicros: snippet.superChatDetails?.amountMicros || '0',
            currency: snippet.superChatDetails?.currency || '',
            amountDisplayString: snippet.superChatDetails?.amountDisplayString || '',
            userComment: snippet.superChatDetails?.userComment || '',
            tier: snippet.superChatDetails?.tier || 0
          };
          break;
        case 'superStickerEvent':
          messageType = 'superSticker';
          messageText = snippet.superStickerDetails?.superStickerMetadata?.altText || '';
          superStickerDetails = {
            stickerId: snippet.superStickerDetails?.superStickerMetadata?.stickerId || '',
            altText: snippet.superStickerDetails?.superStickerMetadata?.altText || '',
            amountMicros: snippet.superStickerDetails?.amountMicros || '0',
            currency: snippet.superStickerDetails?.currency || '',
            amountDisplayString: snippet.superStickerDetails?.amountDisplayString || '',
            tier: snippet.superStickerDetails?.tier || 0
          };
          break;
        case 'memberMilestoneChatEvent':
          messageType = 'memberMilestone';
          messageText = snippet.memberMilestoneChatDetails?.userComment || '';
          break;
        case 'newSponsorEvent':
          messageType = 'newSponsor';
          messageText = `Novo patrocinador: ${authorDetails.displayName}`;
          break;
        case 'fanFundingEvent':
          messageType = 'fanFunding';
          messageText = snippet.fanFundingEventDetails?.userComment || '';
          break;
        case 'pollEvent':
          messageType = 'poll';
          messageText = snippet.pollDetails?.metadata?.questionText || '';
          break;
        case 'membershipGiftingEvent':
          messageType = 'membershipGifting';
          messageText = `${authorDetails.displayName} presenteou ${snippet.membershipGiftingDetails?.giftMembershipsCount} assinaturas!`;
          break;
        case 'giftMembershipReceivedEvent':
          messageType = 'giftMembershipReceived';
          messageText = `${authorDetails.displayName} recebeu uma assinatura de presente!`;
          break;
        case 'messageDeletedEvent':
          messageType = 'messageDeleted';
          messageText = 'Mensagem deletada por moderador';
          break;
        case 'userBannedEvent':
          messageType = 'userBanned';
          messageText = `Usuário banido: ${snippet.userBannedDetails?.bannedUserDetails?.displayName}`;
          break;
        case 'chatEndedEvent':
          messageType = 'chatEnded';
          messageText = 'Chat encerrado';
          break;
        case 'sponsorOnlyModeStartedEvent':
          messageType = 'sponsorOnlyModeStarted';
          messageText = 'Chat restrito apenas para patrocinadores';
          break;
        case 'sponsorOnlyModeEndedEvent':
          messageType = 'sponsorOnlyModeEnded';
          messageText = 'Chat liberado para todos';
          break;
        default:
          console.log(`⚠️ Tipo de mensagem não reconhecido: ${snippet.type}`);
          return;
      }

      const chatMessage: YouTubeChatMessage = {
        id: messageItem.id,
        authorChannelId: authorDetails.channelId,
        displayName: authorDetails.displayName,
        profileImageUrl: authorDetails.profileImageUrl,
        messageText,
        publishedAt: snippet.publishedAt,
        isChatOwner: authorDetails.isChatOwner || false,
        isChatModerator: authorDetails.isChatModerator || false,
        isChatSponsor: authorDetails.isChatSponsor || false,
        isVerified: authorDetails.isVerified || false,
        type: messageType,
        superChatDetails,
        superStickerDetails
      };

      // Log detalhado da mensagem
      console.log(`📨 [YouTube] Mensagem recebida:`, {
        id: chatMessage.id,
        username: chatMessage.displayName,
        message: chatMessage.messageText,
        type: chatMessage.type,
        platform: 'youtube',
        channel: this.channelId,
        sessionId: this.sessionId,
        timestamp: chatMessage.publishedAt,
        badges: this.getBadges(chatMessage),
        isOwner: chatMessage.isChatOwner,
        isModerator: chatMessage.isChatModerator,
        isSponsor: chatMessage.isChatSponsor,
        isVerified: chatMessage.isVerified
      });

      // Broadcast da mensagem para a sessão usando o sistema SSE existente
      broadcastToSharedSession(this.sessionId, {
        type: 'chatMessage',
        message: {
          id: chatMessage.id,
          username: chatMessage.displayName,
          message: chatMessage.messageText,
          timestamp: new Date(chatMessage.publishedAt).getTime(),
          platform: 'youtube',
          channel: this.channelId,
          badges: this.getBadges(chatMessage),
          emotes: [], // YouTube não tem emotes como Twitch
          color: this.getUserColor(chatMessage),
          isOwner: chatMessage.isChatOwner,
          isModerator: chatMessage.isChatModerator,
          isSponsor: chatMessage.isChatSponsor,
          isVerified: chatMessage.isVerified,
          messageType: chatMessage.type,
          superChatDetails: chatMessage.superChatDetails,
          superStickerDetails: chatMessage.superStickerDetails
        }
      });

      console.log(`✅ [YouTube] Mensagem enviada para SSE: ${chatMessage.displayName}: ${chatMessage.messageText}`);
      
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Gera badges baseadas nas propriedades do usuário
   */
  private getBadges(message: YouTubeChatMessage): string[] {
    const badges: string[] = [];
    
    if (message.isChatOwner) badges.push('owner');
    if (message.isChatModerator) badges.push('moderator');
    if (message.isChatSponsor) badges.push('sponsor');
    if (message.isVerified) badges.push('verified');
    
    return badges;
  }

  /**
   * Gera cor baseada no ID do canal do usuário
   */
  private getUserColor(message: YouTubeChatMessage): string {
    // Gerar cor baseada no channelId
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
    return this.isPolling && this.liveChatId !== null;
  }

  /**
   * Obtém informações da transmissão atual
   */
  async getLiveStreamInfo(): Promise<YouTubeLiveStream | null> {
    return this.findActiveLiveStream();
  }
}
