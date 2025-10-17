// Teste específico do SSE do temporizador
async function testTimerSSE() {
  try {
    console.log('🔌 Testando SSE do temporizador...');
    
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
    
    // Conectar ao SSE
    const sseUrl = `http://localhost:3500/api/sse/${sessionData.sessionId}`;
    console.log('🔌 Conectando ao SSE:', sseUrl);
    
    const eventSource = new EventSource(sseUrl);
    
    let timerEvents = 0;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 Evento SSE recebido:', data.type, data);
        
        if (data.type === 'timerUpdate') {
          timerEvents++;
          console.log(`⏰ Evento de timer #${timerEvents}:`, data.timer);
        }
      } catch (error) {
        console.error('❌ Erro ao processar evento SSE:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('❌ Erro no SSE:', error);
    };
    
    eventSource.onopen = () => {
      console.log('✅ SSE conectado');
    };
    
    // Aguardar conexão SSE
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Iniciar temporizador de 5 segundos
    console.log('🔄 Iniciando temporizador de 5 segundos...');
    const timerResponse = await fetch(`http://localhost:3500/api/sessions/${sessionData.sessionId}/timer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        duration: 5
      })
    });
    
    if (!timerResponse.ok) {
      throw new Error(`Erro ao iniciar temporizador: ${timerResponse.status}`);
    }
    
    const timerData = await timerResponse.json();
    console.log('✅ Temporizador iniciado:', timerData);
    
    // Aguardar eventos SSE por 7 segundos
    console.log('⏳ Aguardando eventos SSE por 7 segundos...');
    await new Promise(resolve => setTimeout(resolve, 7000));
    
    // Fechar SSE
    eventSource.close();
    console.log('🔌 SSE desconectado');
    
    console.log(`📊 Total de eventos de timer recebidos: ${timerEvents}`);
    
    if (timerEvents === 0) {
      console.log('❌ PROBLEMA: Nenhum evento de timer foi recebido via SSE!');
    } else {
      console.log('✅ SSE funcionando corretamente!');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testTimerSSE();
