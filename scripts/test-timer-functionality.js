// Teste específico do temporizador
async function testTimerFunctionality() {
  try {
    console.log('⏰ Testando funcionalidade do temporizador...');
    
    // Criar sessão de teste
    const createResponse = await fetch('http://localhost:3500/api/admin/sessions', {
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
    
    if (!createResponse.ok) {
      throw new Error(`Erro ao criar sessão: ${createResponse.status}`);
    }
    
    const sessionData = await createResponse.json();
    console.log('✅ Sessão criada:', sessionData.sessionId);
    
    // Conectar à sessão
    const connectResponse = await fetch('http://localhost:3500/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: sessionData.sessionId,
        channel: 'test-channel',
        platform: 'twitch',
        password: 'test123'
      })
    });
    
    if (!connectResponse.ok) {
      throw new Error(`Erro ao conectar: ${connectResponse.status}`);
    }
    
    console.log('✅ Conectado à sessão');
    
    // Iniciar temporizador de 10 segundos
    console.log('🔄 Iniciando temporizador de 10 segundos...');
    const timerResponse = await fetch(`http://localhost:3500/api/sessions/${sessionData.sessionId}/timer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        duration: 10
      })
    });
    
    if (!timerResponse.ok) {
      throw new Error(`Erro ao iniciar temporizador: ${timerResponse.status}`);
    }
    
    const timerData = await timerResponse.json();
    console.log('✅ Temporizador iniciado:', timerData);
    
    // Verificar status do temporizador a cada segundo
    for (let i = 0; i < 12; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`http://localhost:3500/api/sessions/${sessionData.sessionId}/timer`);
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log(`⏰ Status ${i+1}s:`, status);
      }
    }
    
    // Parar temporizador
    console.log('🛑 Parando temporizador...');
    const stopResponse = await fetch(`http://localhost:3500/api/sessions/${sessionData.sessionId}/timer`, {
      method: 'DELETE'
    });
    
    if (stopResponse.ok) {
      console.log('✅ Temporizador parado');
    }
    
    console.log('🎉 Teste do temporizador concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testTimerFunctionality();
