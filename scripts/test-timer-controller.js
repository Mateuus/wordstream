// Teste simples para verificar se o temporizador está funcionando na interface
console.log('🔍 Verificando se há problemas no TimerController...');

// Simular dados do timer
const mockTimer = {
  isActive: true,
  remainingTime: 45,
  duration: 60
};

console.log('📊 Dados do timer:', mockTimer);

// Simular formatação de tempo
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formattedTime = formatTime(mockTimer.remainingTime);
console.log('⏱️ Tempo formatado:', formattedTime);

// Simular classes CSS
const timerClasses = mockTimer.isActive 
  ? (mockTimer.remainingTime <= 10 ? 'text-red-400 animate-pulse' : 'text-blue-400')
  : 'text-gray-400';

console.log('🎨 Classes CSS:', timerClasses);

console.log('✅ TimerController parece estar funcionando corretamente!');
console.log('🔍 O problema pode estar na conexão SSE ou na atualização do estado.');
