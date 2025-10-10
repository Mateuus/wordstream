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
          await connectToChannel(data.channel, data.platform, data.sessionId, true);
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

const TimerOverlayComponent: React.FC<TimerOverlayComponentProps> = () => {
  const { timer, winner, isConnected } = useSimpleSSE();
  const [showResult, setShowResult] = useState(false);
  const [resultTimeout, setResultTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasShownResult, setHasShownResult] = useState(false);

  // Debug: Log do estado do timer (apenas em desenvolvimento)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Timer Overlay Debug:', {
        timer,
        winner,
        showResult,
        hasShownResult,
        isConnected
      });
    }
  }, [timer, winner, showResult, hasShownResult, isConnected]);

  // Formatar tempo para exibição
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Mostrar resultado quando timer finalizar e há um vencedor
  useEffect(() => {
    if (winner && !hasShownResult) {
      setShowResult(true);
      setHasShownResult(true);
      
      // Esconder resultado após 3 segundos
      const timeout = setTimeout(() => {
        setShowResult(false);
      }, 8000);
      setResultTimeout(timeout);
    }
  }, [winner, hasShownResult]);

  // Reset do resultado quando timer reinicia
  useEffect(() => {
    if (timer?.isActive) {
      setHasShownResult(false);
      setShowResult(false);
      if (resultTimeout) {
        clearTimeout(resultTimeout);
        setResultTimeout(null);
      }
    }
  }, [timer?.isActive, resultTimeout]);

  // Cleanup do timeout
  useEffect(() => {
    return () => {
      if (resultTimeout) {
        clearTimeout(resultTimeout);
      }
    };
  }, [resultTimeout]);


  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        @keyframes slideInFromRight {
          from { 
            opacity: 0; 
            transform: translateX(100vw); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }

        @keyframes slideOutToLeft {
          from { 
            opacity: 1; 
            transform: translateX(0); 
          }
          to { 
            opacity: 0; 
            transform: translateX(-100vw); 
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }

        .timer-display {
          animation: pulse 2s infinite;
        }

        .timer-display.warning {
          animation: pulse 1s infinite;
        }

        .result-card {
          animation: slideInFromRight 0.8s ease-out forwards;
        }

        .result-card.hiding {
          animation: slideOutToLeft 0.5s ease-in forwards;
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
        padding: '15px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        position: 'relative',
        width: '100vw',
        height: '100vh'
      }}>
        
        {/* Debug Info - apenas em desenvolvimento
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 1000
          }}>
            Timer: {timer ? `${timer.isActive ? 'ATIVO' : 'INATIVO'} - ${timer.remainingTime}s` : 'NULL'}
            <br />
            Connected: {isConnected ? 'SIM' : 'NÃO'}
            <br />
            Winner: {winner ? winner.word : 'NENHUM'}
          </div>
        )} */}

        {/* Timer Display - só aparece quando timer está ativo */}
        {timer?.isActive && (
          <div 
            className={`timer-display ${timer.remainingTime <= 10 ? 'warning' : ''}`}
            style={{
              position: 'absolute',
              top: '50%',
              left: '70%',
              transform: 'translate(-50%, -50%)',
              fontSize: '48px',
              fontWeight: 'bold',
              color: timer.remainingTime <= 10 ? '#ff4444' : '#0066cc',
              textShadow: 'none',
              background: 'transparent',
              padding: '20px 30px',
              borderRadius: '10px',
              border: `3px solid ${timer.remainingTime <= 10 ? '#ff4444' : '#0066cc'}`,
              textAlign: 'center',
              minWidth: '200px',
              minHeight: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {formatTime(timer.remainingTime)}
          </div>
        )}

        {/* Resultado Final */}
        {showResult && (
          <div 
            className="result-card"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '20px',
              borderRadius: '15px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              maxWidth: '400px'
            }}
          >
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#FFD700',
              marginBottom: '15px',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
              textAlign: 'center'
            }}>
              🏆 RESULTADO FINAL 🏆
            </div>

            {winner ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div
                  className="word-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: '10px 15px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(2px)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#FFD700',
                      minWidth: '25px',
                      textAlign: 'center'
                    }}>
                      <span className="winner-crown">👑</span>
                      #1
                    </div>
                    
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: 'white',
                      maxWidth: '150px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {winner.word}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#00ff00',
                      boxShadow: '0 0 8px rgba(0, 255, 0, 0.6)'
                    }}></div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#00ff00',
                      background: 'rgba(0, 255, 0, 0.2)',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0, 255, 0, 0.3)',
                      minWidth: '40px',
                      textAlign: 'center'
                    }}>
                      {winner.count}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                fontSize: '16px',
                color: 'white',
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '10px'
              }}>
                Nenhuma palavra foi contada!
              </div>
            )}
          </div>
        )}

        {/* Estado inicial - manter em branco para live quando timer não está ativo */}
        {!timer?.isActive && !showResult && (
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
