const { google } = require('googleapis');

async function testYouTubeChatCapture() {
  const channelId = 'UCiKtvZFENuKWH7oqB9RoJEQ'; // Canal de teste
  const apiKey = process.env.YOUTUBE_API_KEY || 'AIzaSyCfWuMIQPN9s413_GRVUB0I4AbM46mZoU4';

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