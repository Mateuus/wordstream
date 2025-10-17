// Teste de criação de sessão YouTube usando o sistema completo

async function testYouTubeSessionCreation() {
  try {
    console.log('🎬 Testando criação de sessão YouTube...');
    
    // Criar nova sessão
    const createResponse = await fetch('http://localhost:3500/api/admin/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'admin123'
      },
      body: JSON.stringify({
        channel: 'UCJutCF01uLelBl0IMQGPXZA',
        platform: 'youtube',
        password: 'test123'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Erro ao criar sessão: ${createResponse.status}`);
    }
    
    const sessionData = await createResponse.json();
    console.log('✅ Sessão criada:', sessionData);
    
    // Conectar à sessão
    const connectResponse = await fetch('http://localhost:3500/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: sessionData.sessionId,
        channel: 'UCJutCF01uLelBl0IMQGPXZA',
        platform: 'youtube',
        password: 'test123'
      })
    });
    
    if (!connectResponse.ok) {
      throw new Error(`Erro ao conectar: ${connectResponse.status}`);
    }
    
    const connectData = await connectResponse.json();
    console.log('✅ Conectado à sessão:', connectData);
    
    console.log('🎉 Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testYouTubeSessionCreation();
