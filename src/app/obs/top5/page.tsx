'use client';

import React from 'react';
import { useSimpleSSE } from '@/src/contexts/SimpleSSEContext';

interface Top5OverlayPageProps {
  params: Promise<{ publicId: string }>;
}

export default function Top5OverlayPage({ params }: Top5OverlayPageProps) {
  const [publicId, setPublicId] = React.useState<string>('');
  
  React.useEffect(() => {
    params.then(({ publicId }) => setPublicId(publicId));
  }, [params]);

  // Loading state
  if (!publicId) {
    return (
      <div style={{ 
        background: 'transparent', 
        color: 'white', 
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div>Carregando...</div>
      </div>
    );
  }

  return <Top5OverlayComponent publicId={publicId} />;
}

interface Top5OverlayComponentProps {
  publicId: string;
}

const Top5OverlayComponent: React.FC<Top5OverlayComponentProps> = () => {
  const { sessionStats } = useSimpleSSE();
  
  const topWords = sessionStats?.topWords?.slice(0, 5) || [];

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
        alignItems: 'flex-start'
      }}>
        {/* Título */}
        <div style={{
          fontSize: '20px',
          fontWeight: 'bold',
          marginBottom: '15px',
          color: '#9146FF',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '8px 15px',
          borderRadius: '8px',
          backdropFilter: 'blur(5px)',
          border: '1px solid rgba(145, 70, 255, 0.3)'
        }}>
          TOP 5 PALAVRAS
        </div>

        {/* Lista do ranking */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          width: '100%',
          maxWidth: '350px'
        }}>
          {topWords.length === 0 ? (
            <div style={{
              textAlign: 'center',
              fontSize: '14px',
              color: '#888',
              padding: '20px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              Aguardando palavras...
            </div>
          ) : (
            topWords.map((wordCount, index) => (
              <div
                key={wordCount.word}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(5px)'
                }}
              >
                {/* Posição e palavra */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: getRankColor(index + 1),
                    minWidth: '25px',
                    textAlign: 'center'
                  }}>
                    #{index + 1}
                  </div>
                  
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: 'white',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {wordCount.word}
                  </div>
                </div>
                
                {/* Contador */}
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#00ff00',
                  background: 'rgba(0, 255, 0, 0.2)',
                  padding: '4px 10px',
                  borderRadius: '15px',
                  border: '1px solid rgba(0, 255, 0, 0.3)',
                  backdropFilter: 'blur(3px)',
                  minWidth: '40px',
                  textAlign: 'center'
                }}>
                  {wordCount.count}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

// Função para definir cores do ranking
const getRankColor = (position: number): string => {
  switch (position) {
    case 1: return '#FFD700'; // Ouro
    case 2: return '#C0C0C0'; // Prata
    case 3: return '#CD7F32'; // Bronze
    case 4: return '#00ff00'; // Verde
    case 5: return '#00bfff'; // Azul
    default: return '#ffffff';
  }
};
