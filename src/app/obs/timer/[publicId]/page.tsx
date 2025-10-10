'use client';

import React, { useState, useEffect } from 'react';
import { useSimpleSSE, SimpleSSEProvider } from '@/src/contexts/SimpleSSEContext';

interface TimerOverlayPageProps {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function TimerOverlayPage({ params, searchParams }: TimerOverlayPageProps) {
  return (
    <SimpleSSEProvider>
      <TimerOverlayPageContent params={params} searchParams={searchParams} />
    </SimpleSSEProvider>
  );
}

function TimerOverlayPageContent({ params, searchParams }: TimerOverlayPageProps) {
  const [publicId, setPublicId] = React.useState<string>('');
  const [duration, setDuration] = React.useState<number>(60); // 1 minuto padrão
  const [, setSessionData] = React.useState<{
    channel: string;
    platform: 'twitch' | 'kick';
    sessionId: string;
    publicId: string;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const { connectToChannel } = useSimpleSSE();
  
  React.useEffect(() => {
    params.then(({ publicId }) => setPublicId(publicId));
  }, [params]);

  React.useEffect(() => {
    searchParams.then((params) => {
      const dur = params?.duration as string;
      if (dur) {
        setDuration(parseInt(dur) || 60);
      }
    });
  }, [searchParams]);

  // Carregar dados da sessão e conectar
  React.useEffect(() => {
    if (!publicId) return;

    const loadSession = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/session/${publicId}`);
        
        if (response.ok) {
          const data = await response.json();
          setSessionData(data);
          
          // Conectar ao chat automaticamente
          await connectToChannel(data.channel, data.platform, data.sessionId);
        }
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [publicId, connectToChannel]);

  // Loading state - manter em branco para live
  if (isLoading || !publicId) {
    return (
      <div style={{ 
        background: 'transparent', 
        width: '100vw',
        height: '100vh'
      }}>
      </div>
    );
  }

  return <TimerOverlayComponent publicId={publicId} duration={duration} />;
}

interface TimerOverlayComponentProps {
  publicId: string;
  duration: number;
}

const TimerOverlayComponent: React.FC<TimerOverlayComponentProps> = ({ duration }) => {
  const { sessionStats } = useSimpleSSE();
  const [showResult, setShowResult] = useState(false);
  const [resultTimeout, setResultTimeout] = useState<NodeJS.Timeout | null>(null);
  const [timerState, setTimerState] = useState({
    isStarted: false,
    isFinished: false,
    remainingTime: duration,
    hasShownResult: false
  });

  // Formatar tempo para exibição
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Auto-start do timer (para demonstração - em produção seria controlado externamente)
  useEffect(() => {
    if (!timerState.isStarted && !timerState.isFinished) {
      // Aguarda 2 segundos antes de iniciar automaticamente
      const autoStartTimeout = setTimeout(() => {
        setTimerState(prev => ({ ...prev, isStarted: true }));
        
        // Iniciar contagem regressiva
        const timerInterval = setInterval(() => {
          setTimerState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timerInterval);
              return {
                ...prev,
                isFinished: true,
                remainingTime: 0
              };
            }
            return {
              ...prev,
              remainingTime: prev.remainingTime - 1
            };
          });
        }, 1000);

        // Cleanup
        return () => clearInterval(timerInterval);
      }, 2000);

      return () => clearTimeout(autoStartTimeout);
    }
  }, [timerState.isStarted, timerState.isFinished]);

  // Mostrar resultado quando timer finalizar
  useEffect(() => {
    if (timerState.isFinished && !timerState.hasShownResult) {
      setShowResult(true);
      setTimerState(prev => ({ ...prev, hasShownResult: true }));
      
      // Esconder resultado após 5 segundos
      const timeout = setTimeout(() => {
        setShowResult(false);
      }, 5000);
      setResultTimeout(timeout);
    }
  }, [timerState.isFinished, timerState.hasShownResult]);

  // Cleanup do timeout
  useEffect(() => {
    return () => {
      if (resultTimeout) {
        clearTimeout(resultTimeout);
      }
    };
  }, [resultTimeout]);

  const topWords = sessionStats?.topWords?.slice(0, 3) || [];

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          background: transparent !important;
          font-family: 'Arial', sans-serif;
          overflow: hidden;
        }
        
        /* Remove scrollbars */
        ::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }

        .timer-display {
          animation: pulse 2s infinite;
        }

        .result-display {
          animation: fadeIn 0.5s ease-out;
        }

        .word-item {
          animation: slideIn 0.3s ease-out;
        }

        .winner-crown {
          animation: bounce 1s infinite;
        }
      `}</style>
      
      <div style={{
        background: 'transparent',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
      }}>
        
        {/* Timer Display - só aparece quando iniciado */}
        {timerState.isStarted && !timerState.isFinished && (
          <div 
            className="timer-display"
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: timerState.remainingTime <= 10 ? '#ff4444' : '#00ff00',
              textShadow: '3px 3px 6px rgba(0, 0, 0, 0.8)',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '20px 30px',
              borderRadius: '15px',
              border: `3px solid ${timerState.remainingTime <= 10 ? '#ff4444' : '#00ff00'}`,
              backdropFilter: 'blur(10px)',
              marginBottom: '20px',
              textAlign: 'center',
              minWidth: '200px'
            }}
          >
            {formatTime(timerState.remainingTime)}
          </div>
        )}

        {/* Resultado Final */}
        {showResult && (
          <div 
            className="result-display"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.9), rgba(255, 140, 0, 0.9))',
              padding: '30px 40px',
              borderRadius: '20px',
              border: '4px solid #FFD700',
              backdropFilter: 'blur(15px)',
              textAlign: 'center',
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
              zIndex: 1000
            }}
          >
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#8B4513',
              marginBottom: '20px',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
            }}>
              🏆 RESULTADO FINAL 🏆
            </div>

            {topWords.length > 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: '300px'
              }}>
                {topWords.map((wordCount, index) => (
                  <div
                    key={wordCount.word}
                    className="word-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: index === 0 ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                      padding: '12px 20px',
                      borderRadius: '10px',
                      border: index === 0 ? '2px solid #FFD700' : '1px solid rgba(255, 255, 255, 0.3)',
                      backdropFilter: 'blur(5px)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px'
                    }}>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: index === 0 ? '#FFD700' : '#ffffff',
                        minWidth: '30px',
                        textAlign: 'center'
                      }}>
                        {index === 0 && <span className="winner-crown">👑</span>}
                        #{index + 1}
                      </div>
                      
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#8B4513',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {wordCount.word}
                      </div>
                    </div>
                    
                    <div style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: '#8B4513',
                      background: 'rgba(255, 255, 255, 0.3)',
                      padding: '5px 15px',
                      borderRadius: '15px',
                      minWidth: '50px',
                      textAlign: 'center'
                    }}>
                      {wordCount.count}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                fontSize: '18px',
                color: '#8B4513',
                fontStyle: 'italic'
              }}>
                Nenhuma palavra foi contada!
              </div>
            )}
          </div>
        )}

        {/* Estado inicial - manter em branco para live */}
        {!timerState.isStarted && !timerState.isFinished && (
          <div style={{
            background: 'transparent',
            width: '100vw',
            height: '100vh'
          }}>
          </div>
        )}

        {/* Estado finalizado sem resultado - manter em branco para live */}
        {timerState.isFinished && !showResult && (
          <div style={{
            background: 'transparent',
            width: '100vw',
            height: '100vh'
          }}>
          </div>
        )}
      </div>
    </>
  );
};
