import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

export class RedisPubSubManager {
  private static instance: RedisPubSubManager;
  private publisher: RedisClient | null = null;
  private subscriber: RedisClient | null = null;
  private isReady = false;
  private messageHandlers = new Map<string, (message: string) => void>();

  private constructor() {
    this.initialize().catch(console.error);
  }

  static getInstance(): RedisPubSubManager {
    if (!RedisPubSubManager.instance) {
      RedisPubSubManager.instance = new RedisPubSubManager();
    }
    return RedisPubSubManager.instance;
  }

  private async initialize(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      // Cliente para publicar mensagens
      this.publisher = createClient({ url: redisUrl });
      this.publisher.on('error', (err) => console.error('❌ Redis Publisher Error:', err));
      await this.publisher.connect();

      // Cliente para assinar canais
      this.subscriber = createClient({ url: redisUrl });
      this.subscriber.on('error', (err) => console.error('❌ Redis Subscriber Error:', err));
      await this.subscriber.connect();

      this.isReady = true;
    } catch (error) {
      console.error('❌ Erro ao inicializar Redis Pub/Sub:', error);
      this.isReady = false;
    }
  }

  /**
   * Publica uma mensagem em um canal
   */
  async publish(channel: string, message: unknown): Promise<void> {
    if (!this.isReady || !this.publisher) {
      return;
    }

    try {
      const messageStr = JSON.stringify(message);
      await this.publisher.publish(`sse:${channel}`, messageStr);
    } catch (error) {
      console.error('❌ Erro ao publicar mensagem:', error);
    }
  }

  /**
   * Assina um canal para receber mensagens (com retry)
   */
  async subscribe(channel: string, handler: (message: unknown) => void): Promise<void> {
    // Se não estiver pronto, aguardar até 5 segundos
    if (!this.isReady) {
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (this.isReady) {
          break;
        }
      }
      
      if (!this.isReady) {
        console.error('❌ Redis Pub/Sub não ficou pronto após 5 segundos');
        return;
      }
    }
    
    if (!this.subscriber) {
      return;
    }

    try {
      const channelName = `sse:${channel}`;
      
      // 🔥 VERIFICAR se já existe assinatura para este canal
      if (this.messageHandlers.has(channelName)) {
        console.log(`⚠️ Canal '${channelName}' já está assinado, ignorando nova assinatura`);
        return;
      }
      
      // Salvar handler
      this.messageHandlers.set(channelName, (messageStr: string) => {
        try {
          const message = JSON.parse(messageStr);
          handler(message);
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error);
        }
      });

      // Assinar canal
      await this.subscriber.subscribe(channelName, this.messageHandlers.get(channelName)!);
      console.log(`✅ Canal '${channelName}' assinado com sucesso`);
    } catch (error) {
      console.error('❌ Erro ao assinar canal:', error);
    }
  }

  /**
   * Cancela assinatura de um canal
   */
  async unsubscribe(channel: string): Promise<void> {
    if (!this.subscriber) return;

    try {
      const channelName = `sse:${channel}`;
      await this.subscriber.unsubscribe(channelName);
      this.messageHandlers.delete(channelName);
    } catch (error) {
      console.error('❌ Erro ao desassinar canal:', error);
    }
  }

  /**
   * Verifica se está pronto
   */
  getIsReady(): boolean {
    return this.isReady;
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.publisher) {
      await this.publisher.disconnect();
    }
    if (this.subscriber) {
      await this.subscriber.disconnect();
    }
  }
}

