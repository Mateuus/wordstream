# WordStream PWA

WordStream é um aplicativo de streaming de palavras em tempo real construído com Next.js e configurado como Progressive Web App (PWA).

🌐 **Site em Produção**: [https://wordstream.bdjcoins.com/](https://wordstream.bdjcoins.com/)

## 🚀 Funcionalidades

- **PWA Completo**: Instalável em dispositivos móveis e desktop
- **Cache Offline**: Funciona sem conexão com internet
- **Tempo Real**: Streaming de palavras via WebSocket
- **Interface Responsiva**: Otimizado para todos os dispositivos
- **Clustering**: Suporte a múltiplas instâncias com PM2

## 🛠️ Tecnologias

- **Next.js 15**: Framework React com App Router
- **TypeScript**: Tipagem estática
- **Tailwind CSS**: Estilização utilitária
- **PWA**: Service Worker e Manifest
- **PM2**: Gerenciador de processos
- **Redis**: Cache e sessões
- **WebSocket**: Comunicação em tempo real

## 📦 Instalação

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Gerar ícones do PWA
npm run generate-icons

# Iniciar servidor de desenvolvimento
npm run dev
```

### Produção com PM2

```bash
# Configurar ambiente de produção (primeira vez)
npm run setup:production

# Reiniciar aplicativo em produção (recomendado)
npm run restart:production

# Ou iniciar diretamente
npm run pm2:start:prod

# Monitorar aplicativo
npm run pm2:monit
```

### Configuração Manual de Produção

```bash
# Copiar configurações de produção
cp env.production .env.production

# Editar variáveis de ambiente
nano .env.production

# Build para produção
npm run build:production

# Iniciar com PM2
npm run pm2:start:prod
```

## 🎯 Comandos PM2

```bash
# Gerenciamento básico
npm run pm2:start          # Iniciar aplicativo
npm run pm2:stop           # Parar aplicativo
npm run pm2:restart        # Reiniciar aplicativo
npm run pm2:reload         # Recarregar (zero-downtime)

# Monitoramento
npm run pm2:logs           # Ver logs
npm run pm2:monit          # Monitoramento em tempo real
npm run pm2:status         # Status dos processos

# Ambientes
npm run pm2:start:dev      # Desenvolvimento
npm run pm2:start:staging  # Staging
npm run pm2:start:prod     # Produção

# Deploy
npm run pm2:deploy:staging # Deploy para staging
npm run pm2:deploy:prod    # Deploy para produção
```

## 📱 PWA

O aplicativo está configurado como PWA com:

- **Manifest**: Configuração completa do app
- **Service Worker**: Cache offline inteligente
- **Ícones**: Múltiplos tamanhos para diferentes dispositivos
- **Instalação**: Prompt automático para instalação
- **Offline**: Funciona sem conexão com internet

### Instalação do PWA

- **Desktop**: Chrome/Edge → Ícone de instalação na barra de endereços
- **Android**: Prompt automático ou "Adicionar à tela inicial"
- **iOS**: Safari → Compartilhar → "Adicionar à Tela Inicial"

## ⚙️ Configuração

### Variáveis de Ambiente

Copie `env.example` para `.env.local` e configure:

```bash
cp env.example .env.local
```

Principais configurações:

```env
NODE_ENV=production
PORT=3500
REDIS_URL=redis://192.168.5.210:6379
NEXT_PUBLIC_APP_URL=https://wordstream.bdjcoins.com
NEXT_PUBLIC_BASE_URL=https://wordstream.bdjcoins.com
```

**URLs por Ambiente:**
- **Desenvolvimento**: `http://localhost:3000`
- **Produção**: `https://wordstream.bdjcoins.com` (porta 3500)
- **Staging**: `http://localhost:3001`

### PM2 Ecosystem

O arquivo `ecosystem.config.js` contém:

- **Clustering**: Múltiplas instâncias para alta disponibilidade
- **Auto-restart**: Reinicialização automática em caso de falha
- **Logs**: Rotação e armazenamento de logs
- **Monitoramento**: Métricas de performance
- **Deploy**: Configuração para deploy automático

## 📊 Monitoramento

### PM2 Monit

```bash
npm run pm2:monit
```

Mostra:
- Uso de CPU e memória
- Logs em tempo real
- Status dos processos
- Métricas de performance

### Logs

```bash
# Ver logs em tempo real
npm run pm2:logs

# Logs são salvos em:
./logs/combined.log  # Logs combinados
./logs/out.log       # Output
./logs/error.log     # Erros
```

## 🚀 Deploy

### Deploy Manual

```bash
# Build do aplicativo
npm run build

# Iniciar com PM2
npm run pm2:start:prod
```

### Deploy Automático

```bash
# Configurar SSH (primeira vez)
pm2 deploy ecosystem.config.js production setup

# Deploy
npm run pm2:deploy:prod
```

## 🔧 Desenvolvimento

### Estrutura do Projeto

```
src/
├── app/                 # App Router do Next.js
├── components/          # Componentes React
├── contexts/           # Contextos React
├── hooks/              # Hooks customizados
├── lib/                # Utilitários
└── types/              # Tipos TypeScript

public/
├── icons/              # Ícones do PWA
├── manifest.json       # Manifesto PWA
├── sw.js              # Service Worker
└── workbox-config.js  # Configuração Workbox
```

### Scripts Úteis

```bash
# Desenvolvimento
npm run dev              # Servidor de desenvolvimento
npm run lint             # Linting

# Produção
npm run setup:production # Configurar ambiente de produção
npm run build:production # Build otimizado para produção
npm run start:production # Iniciar servidor de produção

# PWA
npm run generate-icons   # Gerar ícones PWA

# PM2
npm run pm2:start:prod   # Iniciar com PM2 em produção
npm run pm2:monit        # Monitoramento em tempo real
npm run pm2:logs         # Ver logs
```

## 📚 Documentação Adicional

- [PWA.md](./PWA.md) - Documentação completa do PWA
- [PROBLEMA_SESSAO_RESOLVIDO.md](./PROBLEMA_SESSAO_RESOLVIDO.md) - Resolução de problemas de sessão
- [OBS_OVERLAYS.md](./OBS_OVERLAYS.md) - Configuração de overlays OBS

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
