'use client';

import React, { useCallback } from 'react';

interface ChatMessageProps {
  message: {
    id: string;
    username: string;
    message: string;
    timestamp: Date;
    platform: 'twitch' | 'kick';
    color?: string;
    badges?: Array<{
      name: string;
      title?: string;
      imageUrl?: string;
      icon?: string;
      color?: string;
    }>;
    parsedContent?: Array<{
      type: 'text' | 'emote';
      content: string;
      emoteUrl?: string;
      emoteName?: string;
      emoteId?: string;
    }>;
  };
}

const ChatMessageComponent: React.FC<ChatMessageProps> = React.memo(({ message }) => {
  // Memoizar funções para evitar recriação a cada render
  const formatTime = useCallback((timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const getPlatformColor = useCallback((platform: 'twitch' | 'kick') => {
    return platform === 'twitch' ? 'text-purple-400' : 'text-green-400';
  }, []);

  // Renderiza badges como ícones/imagens antes do nome
  const renderBadges = (): React.ReactNode => {
    if (!message.badges || message.badges.length === 0) {
      return null;
    }

    return (
      <div className="flex items-center space-x-1 mr-2">
        {message.badges.slice(0, 3).map((badge, index) => {
          if (badge.imageUrl) {
            // Renderiza imagem (Twitch)
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${badge.name}-${index}`}
                src={badge.imageUrl}
                alt={badge.title || badge.name}
                title={badge.title || badge.name}
                className="w-4 h-4 inline-block rounded-sm"
                onError={(e) => {
                  // Fallback para emoji em caso de erro
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallbackSpan = document.createElement('span');
                  fallbackSpan.textContent = getEmojiForBadge(badge.name);
                  fallbackSpan.className = 'text-sm';
                  fallbackSpan.title = badge.title || badge.name;
                  target.parentNode?.insertBefore(fallbackSpan, target);
                }}
              />
            );
          } else if (badge.icon) {
            // Renderiza emoji (fallback)
            return (
              <span
                key={`${badge.name}-${index}`}
                className="text-sm"
                style={{ color: badge.color }}
                title={badge.title || badge.name}
              >
                {badge.icon}
              </span>
            );
          }
          return null;
        })}
      </div>
    );
  };

  // Função auxiliar para fallback de emojis
  const getEmojiForBadge = (badgeName: string): string => {
    const emojiMap: { [key: string]: string } = {
      'broadcaster': '📺',
      'moderator': '🛡️',
      'vip': '💎',
      'subscriber': '⭐',
      'premium': '👑',
      'turbo': '⚡',
      'partner': '✅',
      'staff': '🔧',
      'admin': '⚙️',
      'global_mod': '🌍',
      'founder': '🏆',
      'artist-badge': '🎨',
    };
    return emojiMap[badgeName] || '🏷️';
  };

  // Renderiza o conteúdo da mensagem com emotes
  const renderMessageContent = () => {
    // Se temos conteúdo parseado (com emotes), use-o
    if (message.parsedContent && message.parsedContent.length > 0) {
      return (
        <span className="inline-flex flex-wrap items-center gap-1 max-w-full">
          {message.parsedContent.map((segment, index) => {
            if (segment.type === 'emote' && segment.emoteUrl) {
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${segment.emoteId}-${index}`}
                  src={segment.emoteUrl}
                  alt={segment.emoteName || segment.content}
                  title={segment.emoteName || segment.content}
                  className="inline-block h-6 w-auto align-middle mx-1 flex-shrink-0"
                  onError={(e) => {
                    // Fallback para texto se a imagem falhar
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const textNode = document.createTextNode(segment.content);
                    target.parentNode?.insertBefore(textNode, target);
                  }}
                />
              );
            }
            
            return (
              <span key={index} className="inline-block">
                {segment.content}
              </span>
            );
          })}
        </span>
      );
    }

    // Fallback para texto simples
    return <span className="inline-block">{message.message}</span>;
  };

  return (
    <div className="mb-3 p-3 hover:bg-white hover:bg-opacity-5 rounded-xl transition-all duration-200 group">
      <div className="flex items-center space-x-2 mb-2">
        {renderBadges()}
        
        <span 
          className={`font-bold text-sm ${getPlatformColor(message.platform)}`}
          style={{ color: message.color }}
          title={message.username}
        >
          {message.username}
        </span>
        
        <span className="text-xs text-gray-500">
          {formatTime(message.timestamp)}
        </span>
        
        {/* Indicador de plataforma */}
        <span className="text-xs bg-white bg-opacity-10 px-2 py-1 rounded-full">
          {message.platform === 'twitch' ? '🎮' : '⚡'}
        </span>
      </div>
      
      <div className="text-sm text-gray-100 break-words leading-relaxed">
        {renderMessageContent()}
      </div>
    </div>
  );
}, (prevProps: ChatMessageProps, nextProps: ChatMessageProps) => {
  // Comparação customizada para evitar re-renderizações desnecessárias
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.message === nextProps.message.message &&
    prevProps.message.username === nextProps.message.username &&
    prevProps.message.timestamp.getTime() === nextProps.message.timestamp.getTime()
  );
});

ChatMessageComponent.displayName = 'ChatMessage';

export const ChatMessage = ChatMessageComponent;
