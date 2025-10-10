# PWA - Progressive Web App

Este aplicativo WordStream foi configurado como um Progressive Web App (PWA), permitindo que os usuários instalem o aplicativo diretamente em seus dispositivos móveis e desktop.

## Funcionalidades PWA Implementadas

### 1. Manifest.json
- Configuração completa do manifesto do aplicativo
- Ícones em múltiplos tamanhos (72x72 até 512x512)
- Modo standalone para experiência de app nativo
- Shortcuts para acesso rápido ao chat e admin
- Suporte a temas claro/escuro

### 2. Service Worker
- Cache offline inteligente
- Estratégias de cache diferentes para diferentes tipos de conteúdo:
  - **CacheFirst**: Para imagens e fontes
  - **StaleWhileRevalidate**: Para recursos estáticos
  - **NetworkFirst**: Para APIs e conteúdo dinâmico

### 3. Prompt de Instalação
- Componente automático que detecta quando o app pode ser instalado
- Interface amigável para o usuário
- Suporte para iOS e Android

### 4. Meta Tags Otimizadas
- Viewport responsivo
- Theme color personalizado
- Apple Web App meta tags
- Ícones para diferentes dispositivos

## Como Usar

### Para Desenvolvedores

1. **Gerar ícones**: Execute `npm run generate-icons` para gerar todos os ícones necessários
2. **Build**: Execute `npm run build` para gerar a versão PWA
3. **Teste**: Use o Chrome DevTools > Application > Manifest para testar

### Para Usuários

1. **Instalação no Desktop**: 
   - Acesse o site no Chrome/Edge
   - Clique no ícone de instalação na barra de endereços
   - Ou use o prompt automático que aparece

2. **Instalação no Mobile**:
   - **Android**: Use o prompt automático ou menu "Adicionar à tela inicial"
   - **iOS**: Use o menu Safari "Compartilhar" > "Adicionar à Tela Inicial"

## Benefícios do PWA

- ✅ **Instalação nativa** sem loja de aplicativos
- ✅ **Funcionamento offline** com cache inteligente
- ✅ **Performance melhorada** com recursos em cache
- ✅ **Notificações push** (preparado para implementação futura)
- ✅ **Acesso rápido** através de shortcuts
- ✅ **Atualizações automáticas** via service worker

## Estrutura de Arquivos

```
public/
├── manifest.json          # Manifesto do PWA
├── sw.js                  # Service Worker personalizado
├── workbox-config.js      # Configuração do Workbox
└── icons/                 # Ícones do PWA
    ├── icon.svg           # Ícone fonte SVG
    ├── icon-72x72.png     # Ícones em diferentes tamanhos
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png

src/
└── components/
    └── PWAInstallPrompt.tsx  # Componente de prompt de instalação
```

## Configurações Avançadas

### Personalização do Cache
Edite `public/workbox-config.js` para ajustar estratégias de cache específicas para seu uso.

### Notificações Push
O service worker já está preparado para notificações push. Para implementar:
1. Configure um servidor de push
2. Registre o usuário para notificações
3. Envie notificações do servidor

### Atualizações Automáticas
O service worker está configurado com `skipWaiting: true` para atualizações automáticas.

## Troubleshooting

### PWA não aparece para instalação
- Verifique se está usando HTTPS (exceto em localhost)
- Confirme se o manifest.json está acessível
- Teste no Chrome DevTools > Application > Manifest

### Cache não funciona
- Verifique se o service worker está registrado
- Limpe o cache do navegador
- Verifique a configuração do Workbox

### Ícones não aparecem
- Execute `npm run generate-icons` para gerar os ícones
- Verifique se os arquivos estão na pasta `public/icons/`
- Confirme as URLs no manifest.json
