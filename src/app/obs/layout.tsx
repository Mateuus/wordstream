'use client';

export default function ObsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning={true}>
        <style jsx global>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            background: transparent !important;
            font-family: 'Arial', sans-serif !important;
            overflow: hidden;
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
          }
          
          #__next {
            background: transparent !important;
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
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
        {children}
      </body>
    </html>
  )
}
