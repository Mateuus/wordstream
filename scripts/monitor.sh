#!/bin/bash

# Script de monitoramento para WordStream PWA
# Este script fornece informações detalhadas sobre o status do aplicativo

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 WordStream PWA - Monitoramento${NC}"
echo "=================================="

# Verificar se o PM2 está rodando
if ! command -v pm2 >/dev/null 2>&1; then
    echo -e "${RED}❌ PM2 não está instalado${NC}"
    exit 1
fi

# Status geral do PM2
echo -e "\n${YELLOW}📊 Status Geral do PM2:${NC}"
pm2 status

# Informações específicas do WordStream
echo -e "\n${YELLOW}📱 Informações do WordStream:${NC}"
pm2 describe wordstream-pwa 2>/dev/null || echo -e "${RED}❌ Aplicativo wordstream-pwa não encontrado${NC}"

# Verificar logs recentes
echo -e "\n${YELLOW}📝 Logs Recentes (últimas 10 linhas):${NC}"
pm2 logs wordstream-pwa --lines 10 --nostream 2>/dev/null || echo -e "${RED}❌ Não foi possível acessar os logs${NC}"

# Verificar uso de recursos
echo -e "\n${YELLOW}💻 Uso de Recursos:${NC}"
pm2 monit --no-interaction 2>/dev/null | head -20 || echo -e "${RED}❌ Não foi possível acessar o monitoramento${NC}"

# Verificar arquivos de log
echo -e "\n${YELLOW}📁 Arquivos de Log:${NC}"
if [ -d "logs" ]; then
    echo "Logs disponíveis:"
    ls -la logs/ 2>/dev/null || echo "Nenhum arquivo de log encontrado"
    
    # Tamanho dos logs
    if [ -f "logs/combined.log" ]; then
        echo -e "Tamanho do log combinado: $(du -h logs/combined.log | cut -f1)"
    fi
    if [ -f "logs/error.log" ]; then
        echo -e "Tamanho do log de erros: $(du -h logs/error.log | cut -f1)"
    fi
else
    echo -e "${RED}❌ Diretório de logs não encontrado${NC}"
fi

# Verificar portas em uso
echo -e "\n${YELLOW}🌐 Portas em Uso:${NC}"
netstat -tlnp 2>/dev/null | grep -E ':(3000|3001|3500)' || echo "Nenhuma porta WordStream encontrada"

# Verificar processos Node.js
echo -e "\n${YELLOW}⚙️  Processos Node.js:${NC}"
ps aux | grep -E 'node|npm' | grep -v grep || echo "Nenhum processo Node.js encontrado"

# Verificar uso de memória
echo -e "\n${YELLOW}🧠 Uso de Memória:${NC}"
free -h

# Verificar espaço em disco
echo -e "\n${YELLOW}💾 Espaço em Disco:${NC}"
df -h . | tail -1

# Verificar conectividade Redis
echo -e "\n${YELLOW}🔴 Status do Redis:${NC}"
if command -v redis-cli >/dev/null 2>&1; then
    redis-cli -h 192.168.5.210 -p 6379 ping 2>/dev/null && echo -e "${GREEN}✅ Redis conectado${NC}" || echo -e "${RED}❌ Redis desconectado${NC}"
else
    echo -e "${YELLOW}⚠️  redis-cli não encontrado${NC}"
fi

# Verificar se o PWA está acessível
echo -e "\n${YELLOW}🌐 Acessibilidade do PWA:${NC}"
if command -v curl >/dev/null 2>&1; then
    # Verificar domínio de produção
    HTTP_STATUS_PROD=$(curl -s -o /dev/null -w "%{http_code}" https://wordstream.bdjcoins.com 2>/dev/null)
    if [ "$HTTP_STATUS_PROD" = "200" ]; then
        echo -e "${GREEN}✅ PWA acessível em produção (HTTP $HTTP_STATUS_PROD) - wordstream.bdjcoins.com${NC}"
    else
        echo -e "${RED}❌ PWA não acessível em produção (HTTP $HTTP_STATUS_PROD) - wordstream.bdjcoins.com${NC}"
    fi
    
    # Verificar porta de desenvolvimento (3000)
    HTTP_STATUS_DEV=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
    if [ "$HTTP_STATUS_DEV" = "200" ]; then
        echo -e "${GREEN}✅ PWA acessível em desenvolvimento (HTTP $HTTP_STATUS_DEV) - Porta 3000${NC}"
    else
        echo -e "${YELLOW}⚠️  PWA não acessível em desenvolvimento (HTTP $HTTP_STATUS_DEV) - Porta 3000${NC}"
    fi
    
    # Verificar porta local de produção (3500)
    HTTP_STATUS_LOCAL=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3500 2>/dev/null)
    if [ "$HTTP_STATUS_LOCAL" = "200" ]; then
        echo -e "${GREEN}✅ PWA acessível localmente (HTTP $HTTP_STATUS_LOCAL) - Porta 3500${NC}"
    else
        echo -e "${YELLOW}⚠️  PWA não acessível localmente (HTTP $HTTP_STATUS_LOCAL) - Porta 3500${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  curl não encontrado${NC}"
fi

echo -e "\n${BLUE}=================================="
echo -e "✅ Monitoramento concluído${NC}"

# Opções de ação
echo -e "\n${YELLOW}🔧 Ações Disponíveis:${NC}"
echo "  npm run pm2:logs     - Ver logs em tempo real"
echo "  npm run pm2:monit    - Monitoramento interativo"
echo "  npm run pm2:restart  - Reiniciar aplicativo"
echo "  npm run pm2:reload   - Recarregar aplicativo"
echo "  npm run pm2:stop     - Parar aplicativo"
