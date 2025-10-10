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
      
      // Esconder resultado após 5 segundos
      const timeout = setTimeout(() => {
        setShowResult(false);
      }, 5000);
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
        
        {/* Debug Info - apenas em desenvolvimento */}
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
        )}

        {/* Timer Display - só aparece quando timer está ativo */}
        {timer?.isActive && (
          <div 
            className="timer-display"
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: timer.remainingTime <= 10 ? '#ff4444' : '#00ff00',
              textShadow: '3px 3px 6px rgba(0, 0, 0, 0.8)',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '20px 30px',
              borderRadius: '15px',
              border: `3px solid ${timer.remainingTime <= 10 ? '#ff4444' : '#00ff00'}`,
              backdropFilter: 'blur(10px)',
              marginBottom: '20px',
              textAlign: 'center',
              minWidth: '200px'
            }}
          >
            {formatTime(timer.remainingTime)}
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

            {winner ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: '300px'
              }}>
                <div
                  className="word-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 215, 0, 0.3)',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    border: '2px solid #FFD700',
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
                      color: '#FFD700',
                      minWidth: '30px',
                      textAlign: 'center'
                    }}>
                      <span className="winner-crown">👑</span>
                      #1
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
                      {winner.word}
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
                    {winner.count}
                  </div>
                </div>
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
