import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WordStream',
  description: 'Contador de palavras com processamento centralizado no servidor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}
