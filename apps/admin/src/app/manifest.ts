import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Neojapan Panel',
    short_name: 'Neojapan',
    description: 'Panel de gestión de Neojapan — inventario, POS, pedidos y reportes.',
    start_url: '/',
    display: 'standalone',
    background_color: '#030712', // gray-950 (oscuro por defecto)
    theme_color: '#22d3ee', // cyan-400 (acento)
    orientation: 'portrait',
    icons: [],
  };
}