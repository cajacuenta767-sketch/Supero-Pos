import React, { useState } from 'react';
import { ImageOff, ZoomIn } from 'lucide-react';
import { cn } from './cn';
import { Modal } from './Modal';
import { useStoredImage } from '../store/imageStore';

export interface PhotoThumbProps {
  /** Referencia de la foto (`img_…`), o null si no se adjuntó ninguna. Admite
   *  también un data URI, por los registros anteriores a IndexedDB. */
  src: string | null | undefined;
  /** Qué se está viendo. Se usa como texto alternativo y título de la ampliación. */
  alt: string;
  size?: 'sm' | 'md';
  /** Qué mostrar cuando no hay foto. Por defecto, un hueco marcado. */
  empty?: React.ReactNode;
  className?: string;
}

const BOX = { sm: 'w-9 h-9', md: 'w-14 h-14' };

/**
 * Miniatura de una foto justificante, ampliable.
 *
 * Una foto de 800px dentro de una celda de tabla es ilegible: sirve para saber
 * que existe, no para revisarla. Al pulsarla se abre a tamaño completo, que es
 * cuando de verdad se audita.
 */
export const PhotoThumb: React.FC<PhotoThumbProps> = ({
  src,
  alt,
  size = 'sm',
  empty,
  className,
}) => {
  const [open, setOpen] = useState(false);
  /* La foto vive en IndexedDB: aquí solo llega su referencia. */
  const resolved = useStoredImage(src);

  if (!src) {
    return (
      empty ?? (
        /* El rótulo va en `aria-label`, no en un hijo `sr-only`: ese hijo es
           `position: absolute` y, dentro de una tabla más ancha que su
           contenedor, se posiciona contra el bloque raíz y alarga el scroll
           horizontal de toda la página. */
        <span
          role="img"
          aria-label="Sin foto"
          title="Sin foto"
          className={cn(
            BOX[size],
            'inline-flex items-center justify-center rounded-md border border-dashed border-line text-ink-3',
            className,
          )}
        >
          <ImageOff className="w-3.5 h-3.5" aria-hidden />
        </span>
      )
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ampliar foto: ${alt}`}
        className={cn(
          BOX[size],
          'group relative overflow-hidden rounded-md border border-line bg-surface',
          'transition-colors duration-[--t-fast] hover:border-accent',
          className,
        )}
      >
        <img src={resolved ?? undefined} alt="" className="w-full h-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-[--t-fast]">
          <ZoomIn className="w-4 h-4 text-white" aria-hidden />
        </span>
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={alt} size="lg">
        <img
          src={resolved ?? undefined}
          alt={alt}
          className="w-full max-h-[70vh] object-contain rounded-md bg-sunken"
        />
      </Modal>
    </>
  );
};
