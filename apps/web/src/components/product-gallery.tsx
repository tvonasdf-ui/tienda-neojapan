'use client';

import Image from 'next/image';
import { useState } from 'react';

interface Media { src: string; alt: string }

export function ProductGallery({ media, fallback, name }: { media: Media[]; fallback: string; name: string }) {
  const images = media.length ? media : [{ src: fallback, alt: name }];
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className="product-gallery">
      <button className="product-gallery-main" type="button" onClick={() => setZoomed(true)} aria-label={`Ampliar imagen de ${name}`}>
        <Image src={images[selected]?.src ?? fallback} alt={images[selected]?.alt ?? name} fill sizes="(max-width: 680px) 100vw, 50vw" priority />
        <span className="image-code">AMPLIAR ↗</span>
      </button>
      {images.length > 1 ? <div className="gallery-thumbnails">{images.map((image, index) => <button className="gallery-thumbnail" type="button" key={image.src} onClick={() => setSelected(index)} aria-label={`Ver imagen ${index + 1}`} aria-pressed={selected === index}><Image src={image.src} alt="" fill sizes="70px" /></button>)}</div> : null}
      {zoomed ? <div className="image-dialog" role="dialog" aria-modal="true" aria-label={`Imagen ampliada de ${name}`} onClick={() => setZoomed(false)}><button type="button" className="image-dialog-close" aria-label="Cerrar imagen" onClick={() => setZoomed(false)}>×</button><Image src={images[selected]?.src ?? fallback} alt={images[selected]?.alt ?? name} fill sizes="100vw" onClick={(event) => event.stopPropagation()} /></div> : null}
    </div>
  );
}
