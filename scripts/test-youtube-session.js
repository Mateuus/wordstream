// Usar fetch nativo do Node.js 18+
async function testYouTubeSessionCreation() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🎬 Testando criação de sessão YouTube...');
    
    // 1. Criar sessão YouTube
    const createResponse = await fetch(`${baseUrl}/api/admin/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'UCiKtvZFENuKWH7oqB9RoJEQ',
        platform: 'youtube',
        createdBy: 'test',
        password: 'test123'
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.log('❌ Erro ao criar sessão:', error);
      return;
    }

    const sessionData = await createResponse.json();
    console.log('✅ Sessão criada:', sessionData);

    // 2. Conectar ao canal
    console.log('🔌 Conectando ao canal...');
    const connectResponse = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'UCiKtvZFENuKWH7oqB9RoJEQ',
        platform: 'youtube',
        sessionId: sessionData.publicId
      })
    });

    if (!connectResponse.ok) {
      const error = await connectResponse.json();
      console.log('❌ Erro ao conectar:', error);
      return;
    }

    const connectData = await connectResponse.json();
    console.log('✅ Conectado:', connectData);

    // 3. Aguardar algumas mensagens
    console.log('⏳ Aguardando mensagens por 30 segundos...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log('🎯 Teste concluído!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testYouTubeSessionCreation();
