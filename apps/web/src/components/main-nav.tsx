'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const mainLinks = [
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/garage', label: 'Console garage' },
  { href: '/builder', label: 'Kit builder' },
];

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav className="main-nav" aria-label="Navegación principal">
      {mainLinks.map((link) => (
        <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}