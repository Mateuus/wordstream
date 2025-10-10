#!/bin/bash

# Script de configuração do PM2 para WordStream PWA
# Este script prepara o ambiente para rodar o aplicativo com PM2

echo "🚀 Configurando PM2 para WordStream PWA..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se o comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar se o PM2 está instalado
if ! command_exists pm2; then
    echo -e "${RED}❌ PM2 não está instalado. Instalando...${NC}"
    npm install -g pm2
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PM2 instalado com sucesso!${NC}"
    else
        echo -e "${RED}❌ Falha ao instalar PM2${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ PM2 já está instalado${NC}"
fi

# Verificar se o Node.js está instalado
if ! command_exists node; then
    echo -e "${RED}❌ Node.js não está instalado${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Node.js encontrado: $(node --version)${NC}"
fi

# Verificar se o npm está instalado
if ! command_exists npm; then
    echo -e "${RED}❌ npm não está instalado${NC}"
    exit 1
else
    echo -e "${GREEN}✅ npm encontrado: $(npm --version)${NC}"
fi

# Criar diretório de logs se não existir
if [ ! -d "logs" ]; then
    mkdir -p logs
    echo -e "${GREEN}✅ Diretório de logs criado${NC}"
else
    echo -e "${GREEN}✅ Diretório de logs já existe${NC}"
fi

# Instalar dependências
echo -e "${YELLOW}📦 Instalando dependências...${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependências instaladas com sucesso!${NC}"
else
    echo -e "${RED}❌ Falha ao instalar dependências${NC}"
    exit 1
fi

# Gerar ícones do PWA
echo -e "${YELLOW}🎨 Gerando ícones do PWA...${NC}"
npm run generate-icons

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Ícones gerados com sucesso!${NC}"
else
    echo -e "${YELLOW}⚠️  Aviso: Falha ao gerar ícones (pode não ser crítico)${NC}"
fi

# Build do aplicativo
echo -e "${YELLOW}🔨 Fazendo build do aplicativo...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build concluído com sucesso!${NC}"
else
    echo -e "${RED}❌ Falha no build${NC}"
    exit 1
fi

# Verificar se o arquivo ecosystem.config.js existe
if [ ! -f "ecosystem.config.js" ]; then
    echo -e "${RED}❌ Arquivo ecosystem.config.js não encontrado${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Arquivo ecosystem.config.js encontrado${NC}"
fi

# Configurar PM2 para iniciar com o sistema
echo -e "${YELLOW}⚙️  Configurando PM2 para iniciar com o sistema...${NC}"
pm2 startup

echo -e "${GREEN}🎉 Configuração do PM2 concluída!${NC}"
echo ""
echo -e "${YELLOW}📋 Comandos úteis:${NC}"
echo "  npm run pm2:start        - Iniciar aplicativo"
echo "  npm run pm2:stop         - Parar aplicativo"
echo "  npm run pm2:restart      - Reiniciar aplicativo"
echo "  npm run pm2:reload       - Recarregar aplicativo (zero-downtime)"
echo "  npm run pm2:logs         - Ver logs"
echo "  npm run pm2:monit        - Monitoramento em tempo real"
echo "  npm run pm2:status       - Status dos processos"
echo ""
echo -e "${YELLOW}🚀 Para iniciar o aplicativo, execute:${NC}"
echo "  npm run pm2:start:prod"
echo ""
echo -e "${YELLOW}📊 Para monitorar, execute:${NC}"
echo "  npm run pm2:monit"
