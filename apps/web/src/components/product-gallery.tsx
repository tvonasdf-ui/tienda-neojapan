'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface Media { src: string; alt: string }

export function ProductGallery({ media, fallback, name }: { media: Media[]; fallback: string; name: string }) {
  const images = media.length ? media : [{ src: fallback, alt: name }];
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!zoomed) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setZoomed(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [zoomed]);

  return (
    <div className="product-gallery">
      <button className="product-gallery-main" type="button" onClick={() => setZoomed(true)} aria-label={`Ampliar imagen de ${name}`} aria-haspopup="dialog" aria-expanded={zoomed}>
        <Image src={images[selected]?.src ?? fallback} alt={images[selected]?.alt ?? name} fill sizes="(max-width: 680px) 100vw, 50vw" priority />
        <span className="image-code">AMPLIAR ↗</span>
      </button>
      {images.length > 1 ? <div className="gallery-thumbnails">{images.map((image, index) => <button className="gallery-thumbnail" type="button" key={image.src} onClick={() => setSelected(index)} aria-label={`Ver imagen ${index + 1}`} aria-pressed={selected === index}><Image src={image.src} alt="" fill sizes="70px" /></button>)}</div> : null}
      {zoomed ? <div className="image-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Imagen ampliada de ${name}`} onClick={() => setZoomed(false)}><button type="button" className="image-dialog-close" aria-label="Cerrar imagen" onClick={() => setZoomed(false)}>×</button><Image src={images[selected]?.src ?? fallback} alt={images[selected]?.alt ?? name} fill sizes="100vw" onClick={(event) => event.stopPropagation()} /></div> : null}
    </div>
  );
}