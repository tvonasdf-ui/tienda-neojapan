import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MainNav } from '@/components/main-nav';
import { OrderLookup } from '@/components/order-lookup';
import { StoreHeaderActions } from '@/components/store-header-actions';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Neojapan — Repuestos y juegos retro',
    template: '%s | Neojapan',
  },
  description:
    'La pieza exacta para tu consola, con compatibilidad garantizada y grado de condición transparente.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={[
          inter.variable,
          spaceGrotesk.variable,
          jetBrainsMono.variable,
          'min-h-screen bg-gray-950 font-sans text-gray-100 antialiased',
        ].join(' ')}
      >
        <Providers>
        <a className="skip-link" href="#main">Saltar al contenido</a>
        <header className="site-header">
          <div className="site-header-inner">
            <Link className="brand" href="/" aria-label="Neojapan, inicio">
              <span className="brand-mark" aria-hidden="true">N</span>
              <span>NEOJAPAN<span className="brand-period">.</span></span>
            </Link>
            <MainNav />
            <StoreHeaderActions />
          </div>
        </header>
        <div id="main" tabIndex={-1}>{children}</div>
        <footer className="site-footer">
          <div className="footer-inner">
            <Link className="brand" href="/">
              <span className="brand-mark" aria-hidden="true">N</span>
              <span>NEOJAPAN<span className="brand-period">.</span></span>
            </Link>
            <p>Piezas correctas. Consolas funcionando.</p>
            <div className="footer-links">
              <Link href="/catalogo">Catálogo</Link>
              <Link href="/garage">Garage</Link>
              <Link href="/cuenta">Mis pedidos</Link>
            </div>
            <span className="mono footer-code">SANTIAGO · CL</span>
          </div>
          <div className="footer-utility page-shell">
            <span className="mono-label">¿PERDISTE TU CÓDIGO DE PEDIDO?</span>
            <OrderLookup compact />
          </div>
        </footer>
        </Providers>
      </body>
    </html>
  );
}