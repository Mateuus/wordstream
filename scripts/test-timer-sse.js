// Teste específico para verificar SSE do temporizador
async function testTimerSSE() {
  const baseUrl = 'http://localhost:3500';
  
  try {
    console.log('🔍 Testando SSE do temporizador...');
    
    // 1. Criar sessão
    const createResponse = await fetch(`${baseUrl}/api/admin/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'test-sse-timer',
        platform: 'youtube',
        createdBy: 'sse-test',
        password: 'test123'
      })
    });

    const sessionData = await createResponse.json();
    console.log('✅ Sessão criada:', sessionData.publicId);

    // 2. Conectar ao SSE
    console.log('📡 Conectando ao SSE...');
    const eventSource = new EventSource(`${baseUrl}/api/sessions/${sessionData.publicId}/sse`);
    
    let timerUpdates = 0;
    let lastTimerData = null;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Evento SSE recebido:', data.type);
        
        if (data.type === 'timerUpdate') {
          timerUpdates++;
          lastTimerData = data.timer;
          console.log(`⏱️ Timer Update #${timerUpdates}:`, {
            isActive: data.timer?.isActive,
            remainingTime: data.timer?.remainingTime,
            duration: data.timer?.duration
          });
        } else if (data.type === 'timerFinished') {
          console.log('🏁 Timer Finalizado:', data.winner);
        }
      } catch (error) {
        console.error('❌ Erro ao processar evento SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Erro SSE:', error);
    };

    // 3. Aguardar conexão
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Iniciar temporizador
    console.log('⏱️ Iniciando temporizador...');
    const timerResponse = await fetch(`${baseUrl}/api/sessions/${sessionData.publicId}/timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: 15 })
    });

    if (!timerResponse.ok) {
      const error = await timerResponse.json();
      console.log('❌ Erro ao iniciar temporizador:', error);
      return;
    }

    console.log('✅ Temporizador iniciado');

    // 5. Aguardar atualizações
    console.log('⏳ Aguardando atualizações do temporizador via SSE...');
    await new Promise(resolve => setTimeout(resolve, 20000)); // 20 segundos

    // 6. Resultados
    console.log('📊 Resultados:');
    console.log(`- Total de atualizações recebidas: ${timerUpdates}`);
    console.log(`- Último estado do timer:`, lastTimerData);

    // 7. Fechar conexão
    eventSource.close();
    console.log('🔌 Conexão SSE fechada');

  } catch (error) {
    console.error('❌ Erro no teste SSE:', error.message);
  }
}

testTimerSSE();
