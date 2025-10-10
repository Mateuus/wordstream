# Arquitetura SSE - Sistema de Broadcast sem Duplicação

## 🎯 Problema Resolvido

### Problema Original
Quando múltiplas conexões SSE eram abertas para a mesma sessão, as mensagens eram duplicadas:
- 1 conexão = 1 mensagem
- 2 conexões = 2 mensagens duplicadas
- 3 conexões = 3 mensagens duplicadas

### Causa Raiz
O Redis Pub/Sub envia mensagens de volta para **TODOS os subscribers**, incluindo o processo que publicou a mensagem. Isso causava um loop:

```
Processo A publica → Redis → Redis envia para Processo A (duplicação!)
```

## ✅ Solução Implementada

### 1. Identificador de Processo
Cada processo Node.js recebe um ID único ao iniciar:
```typescript
const PROCESS_ID = randomBytes(8).toString('hex');
```

### 2. Broadcast Local + Redis
Quando uma mensagem é publicada:

```typescript
export function broadcastToSharedSession(publicId: string, data: unknown): void {
  // 1. Enviar LOCALMENTE primeiro (para SSE deste processo)
  broadcastToSession(publicId, data);
  
  // 2. Adicionar ID do processo
  const messageWithProcessId = {
    ...data,
    _processId: PROCESS_ID
  };
  
  // 3. Publicar no Redis (para outros processos)
  redisPubSub.publish(publicId, messageWithProcessId);
}
```

### 3. Filtro no Redis Handler
Quando uma mensagem chega do Redis:

```typescript
redisPubSub.subscribe(publicId, (data) => {
  const messageData = data as { _processId?: string };
  
  // Só processar se veio de OUTRO processo
  if (messageData._processId && messageData._processId !== PROCESS_ID) {
    broadcastToSession(publicId, data);
  }
  // Se _processId === PROCESS_ID, IGNORAR (já enviamos localmente)
});
```

### 4. Limpeza de Dados
Antes de enviar aos clientes SSE, removemos o `_processId`:

```typescript
const cleanData = { ...data };
delete cleanData._processId;

const message = `data: ${JSON.stringify(cleanData)}\n\n`;
```

## 📊 Fluxo Completo

### Cenário: 3 Conexões SSE na Mesma Sessão

```
┌─────────────────────────────────────────────────────────┐
│ Processo Node.js (PROCESS_ID: abc123)                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Twitch Message Received                                │
│         ↓                                                │
│  broadcastToSharedSession(sessionId, data)              │
│         ↓                                                │
│  ┌──────────────────────────────────────┐               │
│  │ 1. broadcastToSession() LOCAL        │               │
│  │    → Envia para 3 conexões SSE       │               │
│  │    → Cliente 1 recebe ✓              │               │
│  │    → Cliente 2 recebe ✓              │               │
│  │    → Cliente 3 recebe ✓              │               │
│  └──────────────────────────────────────┘               │
│         ↓                                                │
│  ┌──────────────────────────────────────┐               │
│  │ 2. Redis.publish()                   │               │
│  │    data + _processId: "abc123"       │               │
│  └──────────────────────────────────────┘               │
│         ↓                                                │
└─────────┼────────────────────────────────────────────────┘
          ↓
    ┌─────────┐
    │  Redis  │
    └─────────┘
          ↓
    Broadcast para todos
          ↓
┌─────────┴────────────────────────────────────────────────┐
│ Processo Node.js (PROCESS_ID: abc123) - MESMO PROCESSO  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Redis Handler recebe mensagem                          │
│         ↓                                                │
│  Verifica: _processId === "abc123" ?                    │
│         ↓                                                │
│  SIM! → IGNORA (já enviamos localmente)                 │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Processo Node.js (PROCESS_ID: xyz789) - OUTRO PROCESSO │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Redis Handler recebe mensagem                          │
│         ↓                                                │
│  Verifica: _processId === "abc123" ?                    │
│         ↓                                                │
│  NÃO! → Processa e envia para conexões SSE locais       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🎨 Filtro de Overlays

Overlays (Top5, Timer) não precisam receber mensagens de chat:

```typescript
const shouldSendToClient = (clientType: 'session' | 'overlay', messageType: string): boolean => {
  if (clientType === 'overlay' && messageType === 'chatMessage') {
    return false; // Overlays não recebem chat
  }
  return true; // Todos recebem wordUpdate, timerUpdate, etc.
};
```

### URLs de Overlay
```
/obs/top5/YSRW8BOJ?overlay=true
/obs/timer/YSRW8BOJ?overlay=true
```

## 🔧 Componentes

### 1. sharedSSEManager.ts
- Gerencia sessões SSE compartilhadas
- Implementa broadcast local + Redis
- Filtra mensagens por tipo de cliente
- Previne duplicação com PROCESS_ID

### 2. redisPubSubManager.ts
- Singleton para Redis Pub/Sub
- Previne múltiplas assinaturas do mesmo canal
- Gerencia conexões publisher/subscriber

### 3. simpleChatConnector.ts
- Conecta ao Twitch IRC
- Processa mensagens do chat
- Chama broadcastToSharedSession()

## 📈 Escalabilidade

### Single Process (Dev)
- 1 processo Node.js
- N conexões SSE
- Broadcast local direto
- Redis usado apenas para persistência

### Multi Process (Prod)
- N processos Node.js (PM2, Kubernetes, etc.)
- Cada processo tem suas próprias conexões SSE
- Redis sincroniza entre processos
- Sem duplicação graças ao PROCESS_ID

## ✨ Benefícios

1. **Zero Duplicação**: Cada cliente recebe cada mensagem exatamente 1 vez
2. **Escalável**: Funciona com qualquer número de processos
3. **Eficiente**: Broadcast local primeiro, Redis apenas para cross-process
4. **Filtrado**: Overlays não recebem mensagens desnecessárias
5. **Resiliente**: Fallback local se Redis falhar

## 🧪 Como Testar

### Teste 1: Múltiplas Conexões
1. Abra `/session/YSRW8BOJ`
2. Abra `/obs/top5/YSRW8BOJ?overlay=true`
3. Abra `/obs/timer/YSRW8BOJ?overlay=true`
4. Envie mensagens no chat
5. Verifique: cada mensagem aparece **apenas 1 vez** na sessão

### Teste 2: Filtro de Overlay
1. Abra `/session/YSRW8BOJ` (deve receber chatMessage)
2. Abra `/obs/top5/YSRW8BOJ?overlay=true` (NÃO deve receber chatMessage)
3. Envie mensagens no chat
4. Verifique: overlay recebe wordUpdate, mas não chatMessage

### Teste 3: Multi-Process
1. Inicie 2 instâncias do servidor (portas diferentes)
2. Conecte clientes SSE em cada instância
3. Envie mensagens no chat
4. Verifique: sem duplicação em nenhuma instância

## 🔍 Debug

Para verificar se está funcionando:

```typescript
// Em sharedSSEManager.ts, adicione logs temporários:

export function broadcastToSharedSession(publicId: string, data: unknown): void {
  console.log(`[${PROCESS_ID}] Broadcasting locally to ${session?.connections.size} connections`);
  broadcastToSession(publicId, data);
  
  console.log(`[${PROCESS_ID}] Publishing to Redis`);
  redisPubSub.publish(publicId, messageWithProcessId);
}

// No Redis handler:
redisPubSub.subscribe(publicId, (data) => {
  const messageData = data as { _processId?: string };
  console.log(`[${PROCESS_ID}] Received from Redis: ${messageData._processId}`);
  
  if (messageData._processId && messageData._processId !== PROCESS_ID) {
    console.log(`[${PROCESS_ID}] Processing (different process)`);
    broadcastToSession(publicId, data);
  } else {
    console.log(`[${PROCESS_ID}] Ignoring (same process)`);
  }
});
```

## 📝 Notas Importantes

1. **PROCESS_ID é gerado ao iniciar**: Cada restart cria um novo ID
2. **_processId é interno**: Nunca chega aos clientes SSE
3. **Broadcast local primeiro**: Garante baixa latência
4. **Redis é assíncrono**: Não bloqueante
5. **Cleanup automático**: Sessões inativas são removidas após 5 minutos

