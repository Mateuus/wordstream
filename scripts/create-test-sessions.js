// Teste simples para criar sessão e testar no navegador
async function createTestSession() {
  try {
    console.log('🎬 Criando sessão de teste para o navegador...');
    
    // Criar sessão YouTube
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
    console.log('✅ Sessão YouTube criada:', sessionData);
    
    // Criar sessão Twitch
    const createResponse2 = await fetch('http://localhost:3500/api/admin/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'admin123'
      },
      body: JSON.stringify({
        channel: 'test-channel',
        platform: 'twitch',
        password: 'test123'
      })
    });
    
    if (!createResponse2.ok) {
      throw new Error(`Erro ao criar sessão: ${createResponse2.status}`);
    }
    
    const sessionData2 = await createResponse2.json();
    console.log('✅ Sessão Twitch criada:', sessionData2);
    
    console.log('\n🌐 URLs para testar no navegador:');
    console.log(`📺 YouTube: ${sessionData.shareUrl}`);
    console.log(`🎮 Twitch: ${sessionData2.shareUrl}`);
    console.log('\n📋 Instruções:');
    console.log('1. Abra uma das URLs no navegador');
    console.log('2. Conecte à sessão');
    console.log('3. Teste o temporizador');
    console.log('4. Verifique se está atualizando em tempo real');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

createTestSession();
