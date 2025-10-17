# 🎬 Integração YouTube - Documentação Completa

## 📋 **Visão Geral**

Esta documentação contém toda a lógica necessária para integrar o chat do YouTube Live ao WordStream, incluindo:
- Captura de mensagens em tempo real
- Processamento de diferentes tipos de mensagem
- Integração com o sistema SSE existente
- Configuração via variáveis de ambiente

## 🔧 **Arquivos Necessários**

### **1. Dependências (package.json)**
```json
{
  "dependencies": {
    "googleapis": "^140.0.0"
  }
}
```

### **2. Variáveis de Ambiente (.env.local)**
```bash
# YouTube Configuration
YOUTUBE_API_KEY=AIzaSyCfWuMIQPN9s413_GRVUB0I4AbM46mZoU4
```

## 📁 **Estrutura de Arquivos**

```
src/
├── lib/
│   ├── youtubeChatService.ts          # Serviço principal do YouTube
│   ├── multiPlatformChatManager.ts    # Gerenciador multi-plataforma
│   └── simpleChatConnector.ts         # Conector Twitch (existente)
├── app/
│   ├── api/
│   │   ├── admin/sessions/route.ts    # API de criação de sessões
│   │   └── multiplatform/[channel]/route.ts # API multi-plataforma
│   ├── page.tsx                       # Página principal
│   ├── session/[publicId]/page.tsx   # Página de sessão
│   └── multiplatform/page.tsx         # Página multi-plataforma
├── contexts/
│   └── SimpleSSEContext.tsx          # Contexto SSE
└── components/
    └── MultiPlatformSetup.tsx         # Componente de configuração
```

## 🎯 **1. YouTubeChatService.ts**

```typescript
import { google } from 'googleapis';
import { broadcastToSession } from './sseManager';

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

      // Broadcast da mensagem para a sessão
      broadcastToSession(this.sessionId, {
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

      console.log(`📨 [YouTube] ${chatMessage.displayName}: ${chatMessage.messageText}`);
      
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
```

## 🎯 **2. MultiPlatformChatManager.ts**

```typescript
import { SimpleChatConnector } from './simpleChatConnector';
import { YouTubeChatService, YouTubeLiveStream } from './youtubeChatService';

export interface PlatformConfig {
  twitch?: {
    channel: string;
    enabled: boolean;
  };
  youtube?: {
    channelId: string;
    enabled: boolean;
  };
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  platform: 'twitch' | 'youtube';
  channel: string;
  badges: string[];
  emotes: Array<{
    id: string;
    name: string;
    positions: Array<{ start: number; end: number }>;
  }>;
  color: string;
  isOwner: boolean;
  isModerator: boolean;
  isSponsor: boolean;
  isVerified: boolean;
  messageType?: string;
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

export class MultiPlatformChatManager {
  private sessionId: string;
  private twitchConnector: SimpleChatConnector | null = null;
  private youtubeService: YouTubeChatService | null = null;
  private config: PlatformConfig;
  private isActive: boolean = false;

  constructor(sessionId: string, config: PlatformConfig) {
    this.sessionId = sessionId;
    this.config = config;
  }

  /**
   * Inicia a captura de chat de todas as plataformas configuradas
   */
  async startChatCapture(): Promise<{ success: boolean; platforms: string[] }> {
    const activePlatforms: string[] = [];
    
    try {
      // Iniciar Twitch se configurado
      if (this.config.twitch?.enabled && this.config.twitch.channel) {
        console.log(`🎮 Iniciando captura do Twitch: ${this.config.twitch.channel}`);
        
        this.twitchConnector = SimpleChatConnector.getInstance();
        
        await this.twitchConnector.connectToChannel(this.config.twitch.channel, 'twitch', this.sessionId);
        activePlatforms.push('twitch');
        console.log('✅ Twitch conectado com sucesso');
      }

      // Iniciar YouTube se configurado
      if (this.config.youtube?.enabled && this.config.youtube.channelId) {
        console.log(`🎬 Iniciando captura do YouTube: ${this.config.youtube.channelId}`);
        
        this.youtubeService = new YouTubeChatService(
          this.sessionId,
          this.config.youtube.channelId
        );
        
        const youtubeStarted = await this.youtubeService.startChatCapture();
        if (youtubeStarted) {
          activePlatforms.push('youtube');
          console.log('✅ YouTube conectado com sucesso');
        } else {
          console.log('⚠️ YouTube não pôde ser conectado (sem live ativa)');
        }
      }

      this.isActive = activePlatforms.length > 0;
      
      return {
        success: this.isActive,
        platforms: activePlatforms
      };
      
    } catch (error) {
      console.error('❌ Erro ao iniciar captura multi-plataforma:', error);
      return {
        success: false,
        platforms: activePlatforms
      };
    }
  }

  /**
   * Para a captura de chat de todas as plataformas
   */
  async stopChatCapture(): Promise<void> {
    console.log('🛑 Parando captura multi-plataforma...');
    
    if (this.twitchConnector) {
      await this.twitchConnector.disconnectFromChannel(this.config.twitch?.channel || '');
      this.twitchConnector = null;
      console.log('✅ Twitch desconectado');
    }

    if (this.youtubeService) {
      this.youtubeService.stopChatCapture();
      this.youtubeService = null;
      console.log('✅ YouTube desconectado');
    }

    this.isActive = false;
  }

  /**
   * Verifica se alguma plataforma está ativa
   */
  isAnyPlatformActive(): boolean {
    return this.isActive;
  }

  /**
   * Verifica se uma plataforma específica está ativa
   */
  isPlatformActive(platform: 'twitch' | 'youtube'): boolean {
    switch (platform) {
      case 'twitch':
        return this.twitchConnector !== null;
      case 'youtube':
        return this.youtubeService?.isActive() || false;
      default:
        return false;
    }
  }

  /**
   * Obtém informações das transmissões ativas
   */
  async getActiveStreams(): Promise<{
    twitch?: { channel: string; isLive: boolean };
    youtube?: { channelId: string; isLive: boolean; streamInfo?: YouTubeLiveStream };
  }> {
    const streams: {
      twitch?: { channel: string; isLive: boolean };
      youtube?: { channelId: string; isLive: boolean; streamInfo?: YouTubeLiveStream };
    } = {};

    // Verificar Twitch
    if (this.twitchConnector) {
      streams.twitch = {
        channel: this.config.twitch?.channel || '',
        isLive: true
      };
    }

    // Verificar YouTube
    if (this.youtubeService) {
      const streamInfo = await this.youtubeService.getLiveStreamInfo();
      streams.youtube = {
        channelId: this.config.youtube?.channelId || '',
        isLive: this.youtubeService.isActive(),
        streamInfo: streamInfo || undefined
      };
    }

    return streams;
  }
}
```

## 🎯 **3. API de Sessões (admin/sessions/route.ts)**

```typescript
// Adicionar ao arquivo existente:

// Validação específica para YouTube - usar API Key do .env se não fornecida
if (platform === 'youtube' && !youtubeApiKey && !process.env.YOUTUBE_API_KEY) {
  return NextResponse.json({ 
    error: 'YouTube API Key is required for YouTube platform' 
  }, { status: 400 });
}

// Criar sessão com ID público - usar API Key do .env se não fornecida
const finalYoutubeApiKey = platform === 'youtube' ? (youtubeApiKey || process.env.YOUTUBE_API_KEY) : undefined;
const { sessionId, publicId, adminKey } = await sessionManager.createSession(channel, platform, createdBy, password, finalYoutubeApiKey);
```

## 🎯 **4. API Multi-Platform (multiplatform/[channel]/route.ts)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { MultiPlatformChatManager } from '@/src/lib/multiPlatformChatManager';
import { RedisSessionManager } from '@/src/lib/redisSessionManager';
import { subscribeToSession, unsubscribeFromSession } from '@/src/lib/sessionChannelManager';

const sessionManager = RedisSessionManager.getInstance();

export async function GET(
  request: NextRequest,
  { params }: { params: { channel: string } }
) {
  const { channel: publicId } = params;
  const { searchParams } = new URL(request.url);
  const isOverlay = searchParams.get('overlay') === 'true';

  const stream = new ReadableStream({
    async start(controller) {
      const clientType = isOverlay ? 'overlay' : 'session';
      const clientId = subscribeToSession(publicId, controller, clientType);
      console.log(`🔌 Cliente SSE ${clientId} conectado à sessão multi-plataforma ${publicId} (tipo: ${clientType})`);

      const connectMessage = `data: ${JSON.stringify({
        type: 'connected',
        publicId,
        clientId,
        clientType,
        timestamp: Date.now()
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectMessage));

      // Enviar dados iniciais da sessão
      try {
        const sessionStats = await sessionManager.getSessionStats(publicId);
        if (sessionStats) {
          const statsMessage = `data: ${JSON.stringify({
            type: 'wordUpdate',
            stats: sessionStats
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(statsMessage));
        }
      } catch (error) {
        console.error('❌ Erro ao buscar stats iniciais para multi-plataforma:', error);
      }

      // Heartbeat para manter conexão viva
      const heartbeatInterval = setInterval(() => {
        controller.enqueue(new TextEncoder().encode('data: {"type": "heartbeat"}\n\n'));
      }, 15000); // Envia um heartbeat a cada 15 segundos

      request.signal.onabort = () => {
        clearInterval(heartbeatInterval);
        unsubscribeFromSession(publicId, clientId);
        console.log(`🔌 Cliente SSE ${clientId} desconectado da sessão multi-plataforma ${publicId}`);
      };
    },
    cancel() {
      // O cancelamento é tratado pelo request.signal.onabort
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { channel: string } }
) {
  const { channel: publicId } = params;
  const body = await request.json();
  const { action, config } = body;

  const multiManager = new MultiPlatformChatManager(publicId, config);

  if (action === 'start') {
    try {
      const { success, platforms } = await multiManager.startChatCapture();
      if (success) {
        return NextResponse.json({
          message: 'Multi-platform chat started successfully',
          platforms
        });
      } else {
        return NextResponse.json({
          error: 'Failed to start any platform'
        }, { status: 500 });
      }
    } catch (error) {
      console.error('Error starting multi-platform chat:', error);
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Failed to start multi-platform chat'
      }, { status: 500 });
    }
  } else if (action === 'stop') {
    await multiManager.stopChatCapture();
    return NextResponse.json({ message: 'Multi-platform chat stopped' });
  } else if (action === 'status') {
    const streams = await multiManager.getActiveStreams();
    return NextResponse.json({ streams });
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
```

## 🎯 **5. Contexto SSE (SimpleSSEContext.tsx)**

```typescript
// Adicionar ao contexto existente:

interface SimpleSSEContextType {
  // ... interfaces existentes ...
  connectToMultiPlatform: (config: {
    twitch?: { channel: string; enabled: boolean };
    youtube?: { channelId: string; enabled: boolean };
  }, existingSessionId?: string, isOverlay?: boolean) => Promise<void>;
}

// Implementação da função:
const connectToMultiPlatform = useCallback(async (config: {
  twitch?: { channel: string; enabled: boolean };
  youtube?: { channelId: string; enabled: boolean };
}, existingSessionId?: string, isOverlay: boolean = false) => {
  setIsLoading(true);
  try {
    // Conectar ao SSE primeiro
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseChannel = existingSessionId || 'multiplatform';
    const overlayParam = isOverlay ? '&overlay=true' : '';
    const sseUrl = `/api/sse/${sseChannel}${overlayParam}`;
    
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    // Configurar handlers de mensagem
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            break;
            
          case 'chatMessage':
            setPendingMessages(prev => [...prev, data.message]);
            break;
            
          case 'wordUpdate':
            setPendingStats(data.stats);
            break;
            
          case 'bannedWordsUpdate':
            setPendingBannedWords(data.bannedWords || []);
            break;
            
          case 'timerUpdate':
            setTimer(data.timer);
            break;
            
          case 'timerFinished':
            setWinner(data.winner);
            setTimer(null);
            break;
            
          case 'connectionStatus':
            setConnectionStatus(data.status);
            setIsConnected(data.status.isConnected);
            break;
            
          case 'heartbeat':
            break;
            
          default:
            break;
        }
      } catch (error) {
        console.error('Erro ao processar mensagem SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Erro na conexão SSE:', error);
      setIsConnected(false);
      setConnectionStatus({
        isConnected: false,
        channel: 'multiplatform',
        platform: 'multiplatform',
        message: 'Erro na conexão SSE'
      });
    };

    // Iniciar captura multi-plataforma
    const response = await fetch(`/api/multiplatform/${sseChannel}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'start',
        config
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Chat multi-plataforma iniciado:', result);
      
      setIsConnected(true);
      setConnectionStatus({
        isConnected: true,
        channel: 'multiplatform',
        platform: 'multiplatform',
        message: `Conectado a ${result.platforms.length} plataforma(s)`
      });
    } else {
      throw new Error('Falha ao iniciar chat multi-plataforma');
    }

  } catch (error) {
    console.error('Erro ao conectar multi-plataforma:', error);
    setIsConnected(false);
    setConnectionStatus({
      isConnected: false,
      channel: 'multiplatform',
      platform: 'multiplatform',
      message: 'Erro na conexão'
    });
  } finally {
    setIsLoading(false);
  }
}, []);
```

## 🎯 **6. Página Principal (page.tsx)**

```typescript
// Adicionar ao dropdown:
<option value="youtube">🎬 YouTube</option>

// Atualizar placeholder:
placeholder={`Nome do canal no ${platform === 'twitch' ? 'Twitch' : platform === 'kick' ? 'Kick' : 'YouTube'}`}

// Atualizar descrição:
<p className="text-sm sm:text-base md:text-lg text-gray-400 mb-12 max-w-3xl mx-auto px-4">
  Processamento centralizado no servidor com atualizações instantâneas via SSE. 
  Conecte-se ao chat da Twitch, Kick ou YouTube e veja as palavras mais mencionadas em tempo real.
</p>

// No modal, adicionar campo YouTube:
{platform === 'youtube' && (
  <div className="p-3 bg-green-900 bg-opacity-50 rounded-lg">
    <p className="text-sm text-green-200">
      ✅ <strong>YouTube configurado automaticamente</strong><br/>
      A API Key está configurada no servidor. Apenas digite o ID do canal.
    </p>
  </div>
)}

// Atualizar validação:
// Validação específica para YouTube - API Key configurada no servidor
// Não precisa validar aqui pois a API Key está no .env

// Atualizar envio:
youtubeApiKey: platform === 'youtube' ? undefined : undefined

// Atualizar validação do botão:
disabled={isLoading || !channel.trim()}
```

## 🎯 **7. Componente MultiPlatformSetup.tsx**

```typescript
interface MultiPlatformConfig {
  twitch: {
    channel: string;
    enabled: boolean;
  };
  youtube: {
    channelId: string;
    enabled: boolean;
  };
}

// Remover campo de API Key da interface
// Adicionar mensagem informativa:
{config.youtube.enabled && (
  <div className="space-y-3">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        ID do Canal YouTube
      </label>
      <input
        type="text"
        value={config.youtube.channelId}
        onChange={(e) => setConfig(prev => ({
          ...prev,
          youtube: { ...prev.youtube, channelId: e.target.value }
        }))}
        placeholder="ex: UC1234567890abcdef"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <p className="text-xs text-gray-500 mt-1">
        Encontre o ID do canal em: youtube.com/channel/[ID_DO_CANAL]
      </p>
    </div>
    
    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
      <p className="text-sm text-green-700">
        ✅ <strong>YouTube configurado automaticamente</strong><br/>
        A API Key está configurada no servidor. Apenas digite o ID do canal.
      </p>
    </div>
  </div>
)}

// Atualizar validação:
const isConfigValid = () => {
  const hasTwitch = config.twitch.enabled && config.twitch.channel.trim();
  const hasYouTube = config.youtube.enabled && config.youtube.channelId.trim();
  return hasTwitch || hasYouTube;
};

// Atualizar instruções:
<li>• Para YouTube: Digite apenas o ID do canal (API Key configurada no servidor)</li>
```

## 🎯 **8. Script de Teste**

```javascript
const { google } = require('googleapis');

async function testYouTubeChatCapture() {
  const channelId = 'UCiKtvZFENuKWH7oqB9RoJEQ';
  const apiKey = 'AIzaSyCfWuMIQPN9s413_GRVUB0I4AbM46mZoU4';

  try {
    console.log(`🎬 Testando captura do chat para canal: ${channelId}`);
    
    const youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });

    // Buscar transmissões ao vivo
    const searchResponse = await youtube.search.list({
      part: 'snippet',
      channelId: channelId,
      type: 'video',
      eventType: 'live',
      order: 'date'
    });

    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      console.log('❌ Nenhuma transmissão ao vivo encontrada');
      return;
    }

    console.log(`✅ ${searchResponse.data.items.length} transmissão(ões) ao vivo encontrada(s)`);

    const liveVideo = searchResponse.data.items[0];
    console.log(`📺 Vídeo: ${liveVideo.snippet.title}`);

    // Buscar detalhes da transmissão
    const videoDetails = await youtube.videos.list({
      part: 'liveStreamingDetails,snippet,statistics',
      id: liveVideo.id.videoId
    });

    if (!videoDetails.data.items || videoDetails.data.items.length === 0) {
      console.log('❌ Detalhes do vídeo não encontrados');
      return;
    }

    const video = videoDetails.data.items[0];
    const liveStreamingDetails = video.liveStreamingDetails;

    if (!liveStreamingDetails?.activeLiveChatId) {
      console.log('❌ Live Chat ID não encontrado - chat pode estar desabilitado');
      return;
    }

    const liveChatId = liveStreamingDetails.activeLiveChatId;
    console.log(`🔗 Live Chat ID: ${liveChatId}`);

    // Buscar mensagens do chat
    const chatResponse = await youtube.liveChatMessages.list({
      part: 'snippet,authorDetails',
      liveChatId: liveChatId,
      maxResults: 5
    });

    if (!chatResponse.data.items || chatResponse.data.items.length === 0) {
      console.log('⚠️ Nenhuma mensagem encontrada no chat');
    } else {
      console.log(`✅ ${chatResponse.data.items.length} mensagem(ns) encontrada(s):`);
      
      chatResponse.data.items.forEach((item, index) => {
        const snippet = item.snippet;
        const author = item.authorDetails;
        
        if (snippet.type === 'textMessageEvent') {
          console.log(`  ${index + 1}. ${author.displayName}: ${snippet.textMessageDetails?.messageText}`);
        } else {
          console.log(`  ${index + 1}. [${snippet.type}] ${author.displayName}`);
        }
      });
    }

    console.log('\n🎯 RESULTADO:');
    console.log(`✅ Canal ID: ${channelId}`);
    console.log(`✅ Live Chat ID: ${liveChatId}`);
    console.log(`✅ Status: Chat ativo e acessível`);

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testYouTubeChatCapture();
```

## 🎯 **9. Configuração de Ambiente**

### **env.local.example:**
```bash
# YouTube Configuration
YOUTUBE_API_KEY=AIzaSyCfWuMIQPN9s413_GRVUB0I4AbM46mZoU4
```

### **env.example:**
```bash
# YouTube Configuration
YOUTUBE_API_KEY=your_youtube_data_api_v3_key_here
```

## 🎯 **10. Como Usar**

### **1. Configurar API Key:**
```bash
cp env.local.example .env.local
# Editar .env.local com sua API Key
```

### **2. Instalar Dependências:**
```bash
npm install googleapis
```

### **3. Testar Integração:**
```bash
node scripts/test-youtube-chat.js
```

### **4. Usar na Interface:**
1. Selecionar "🎬 YouTube" no dropdown
2. Digitar ID do canal: `UCiKtvZFENuKWH7oqB9RoJEQ`
3. Clicar "Criar Nova Sessão"
4. Ver mensagens aparecendo em tempo real

## 🎯 **11. Logs Esperados**

```
🎬 Iniciando captura do chat do YouTube para canal: UCiKtvZFENuKWH7oqB9RoJEQ
🔍 Buscando transmissões ao vivo para canal: UCiKtvZFENuKWH7oqB9RoJEQ
✅ 1 transmissão(ões) ao vivo encontrada(s)
📺 Vídeo: 🟢 AO VIVO - 🎰 BANCA DE 10 MIL...
🔗 Live Chat ID: Cg0KC0QxeldiNG56djdNKicKGFVDaUt0dlpGRU51S1dIN29xQjlSb0pFURILRDF6V2I0bnp2N00
🔄 Iniciando polling das mensagens do chat...
💬 Buscando mensagens do chat...
✅ 5 mensagem(ns) encontrada(s)
📨 [YouTube] JnVClips: MADAME DESTINY
📨 [YouTube] airton2010: Sim
📨 [YouTube] didadl sampaio: pode
```

## 🎯 **12. Troubleshooting**

### **Problemas Comuns:**

1. **"Nenhuma transmissão ao vivo encontrada"**
   - Verificar se o canal está transmitindo ao vivo
   - Verificar se o ID do canal está correto

2. **"Live Chat ID não encontrado"**
   - Chat pode estar desabilitado na transmissão
   - Verificar configurações do YouTube

3. **"Erro de autenticação ou quota excedida"**
   - Verificar se a API Key está válida
   - Verificar quotas no Google Cloud Console

4. **"Mensagens não aparecem"**
   - Verificar se o polling está funcionando
   - Verificar logs do servidor
   - Verificar se o SSE está conectado

### **Debug:**
- Ativar logs detalhados no console
- Verificar se a API Key está no .env
- Testar com o script de teste primeiro
- Verificar se o Redis está funcionando

---

## 📝 **Notas Importantes**

1. **API Key**: Nunca commitar a API Key real no código
2. **Quotas**: YouTube API tem limites de quota diária
3. **Polling**: Recomendado a cada 3 segundos pela API
4. **Tipos de Mensagem**: Suporte completo a todos os tipos do YouTube
5. **Segurança**: API Key configurada apenas no servidor
6. **Performance**: Debounce implementado para otimização

Esta documentação contém toda a lógica necessária para implementar a integração YouTube do zero! 🎬✨
