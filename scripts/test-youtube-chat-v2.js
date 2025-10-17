// Teste da nova implementação YouTube usando youtube-chat
const { LiveChat } = require('youtube-chat');

async function testYouTubeChatV2() {
  const channelId = 'UCJutCF01uLelBl0IMQGPXZA'; // Canal de teste
  
  try {
    console.log('🎬 Testando YouTube Chat V2 (youtube-chat)...');
    console.log(`📺 Canal: ${channelId}`);
    
    const liveChat = new LiveChat({ channelId });
    
    // Configurar eventos
    liveChat.on('start', (liveId) => {
      console.log(`🚀 Live iniciada: ${liveId}`);
    });
    
    liveChat.on('chat', (chatItem) => {
      console.log(`💬 Mensagem: ${chatItem.authorName || 'Usuário'}: ${JSON.stringify(chatItem.message)}`);
      console.log(`📊 Dados completos:`, JSON.stringify(chatItem, null, 2));
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
      console.log('⏳ Aguardando mensagens por 30 segundos...');
      
      // Aguardar 30 segundos
      await new Promise(resolve => setTimeout(resolve, 30000));
      
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

testYouTubeChatV2();
