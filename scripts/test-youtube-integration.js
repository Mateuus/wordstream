// Teste simples do sistema YouTube Chat V2
const { LiveChat } = require('youtube-chat');

async function testYouTubeIntegration() {
  const channelId = 'UCJutCF01uLelBl0IMQGPXZA'; // Canal de teste
  
  try {
    console.log('🎬 Testando sistema YouTube Chat V2...');
    console.log(`📺 Canal: ${channelId}`);
    
    const liveChat = new LiveChat({ channelId });
    
    // Configurar eventos
    liveChat.on('start', (liveId) => {
      console.log(`🚀 Live iniciada: ${liveId}`);
    });
    
    liveChat.on('chat', (chatItem) => {
      // Simular processamento de mensagem
      const author = chatItem.author || {};
      const authorName = author.name || 'Usuário';
      
      // Processar mensagem (array de objetos)
      const messageArray = chatItem.message || [];
      let messageText = '';
      
      if (Array.isArray(messageArray)) {
        messageText = messageArray
          .map(msg => {
            if (typeof msg === 'object' && msg !== null) {
              if (msg.text) return msg.text;
              if (msg.emojiText) return msg.emojiText;
            }
            return '';
          })
          .filter(text => text.length > 0)
          .join(' ');
      }
      
      // Extrair primeira palavra
      const firstWord = messageText.trim().split(/\s+/)[0];
      
      console.log(`💬 ${authorName}: ${messageText}`);
      if (firstWord && firstWord.length >= 2) {
        console.log(`📊 Primeira palavra: "${firstWord}"`);
      }
    });
    
    liveChat.on('error', (error) => {
      console.error('❌ Erro:', error);
    });
    
    liveChat.on('end', () => {
      console.log('🏁 Live encerrada');
    });
    
    // Iniciar captura
    console.log('🔄 Iniciando captura...');
    const started = await liveChat.start();
    
    if (started) {
      console.log('✅ Captura iniciada com sucesso!');
      console.log('⏳ Aguardando mensagens por 20 segundos...');
      
      // Aguardar 20 segundos
      await new Promise(resolve => setTimeout(resolve, 20000));
      
      // Parar captura
      liveChat.stop();
      console.log('🛑 Captura interrompida');
    } else {
      console.log('❌ Falha ao iniciar captura');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testYouTubeIntegration();
