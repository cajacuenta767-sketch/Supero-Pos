import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { cn } from './cn';
import { deleteImage, getImage, putImage } from '../store/imageStore';

export interface ImageUploadProps {
  /**
   * Referencia de la imagen actual (`img_…`), o null si no hay.
   *
   * Admite también un data URI: los registros guardados antes de que las
   * imágenes se movieran a IndexedDB llevan la foto incrustada y tienen que
   * seguir viéndose.
   */
  value: string | null;
  /** Recibe la referencia con la que guardar, no los bytes de la imagen. */
  onChange: (ref: string | null) => void;
  label: string;
  hint?: string;
  /** Lado mayor al que se reduce antes de guardar. */
  maxSize?: number;
  /** Tamaño del recuadro de vista previa. */
  preview?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BOX = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' };
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Subida de imagen por clic, arrastre o pegado.
 *
 * Reduce en el navegador antes de guardar: una foto de móvil son 4 MB, y la
 * terminal guarda esto en SQLite local y lo sincroniza por una red que puede
 * caerse. Lo que se almacena nunca supera `maxSize` en su lado mayor.
 *
 * La imagen va a IndexedDB y al registro solo llega una referencia corta. Antes
 * el data URI viajaba dentro del propio registro, y los registros van a
 * `localStorage`: con unos cincuenta comprobantes se agotaba la cuota de 5 MB y
 * dejaba de guardarse todo lo de esa clave, no solo la foto.
 */
export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label,
  hint,
  maxSize = 800,
  preview = 'md',
  className,
}) => {
  const inputId = useId();
  /* La vista previa necesita los bytes; el componente solo tiene la
     referencia. Se resuelven al montar y cada vez que cambia. */
  const [preview_, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void getImage(value).then((src) => {
      if (vigente) setPreview(src);
    });
    return () => {
      vigente = false;
    };
  }, [value]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        setError('Formato no admitido. Use PNG, JPG o WebP.');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError('La imagen supera los 5 MB.');
        return;
      }
      setError(null);

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            void putImage(String(reader.result)).then(onChange);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          /* La imagen se guarda aparte; al registro va la referencia. */
          void putImage(canvas.toDataURL('image/webp', 0.82)).then(onChange);
        };
        img.onerror = () => setError('No se pudo leer la imagen.');
        img.src = String(reader.result);
      };
      reader.onerror = () => setError('No se pudo leer el archivo.');
      reader.readAsDataURL(file);
    },
    [maxSize, onChange],
  );

  return (
    <div className={cn('space-y-1.5', className)}>
      <span className="block text-micro uppercase text-ink-2">{label}</span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) process(file);
        }}
        /* Pegar desde el portapapeles: lo natural tras una captura. */
        onPaste={(e) => {
          const file = Array.from(e.clipboardData.files)[0];
          if (file) process(file);
        }}
        className={cn(
          'flex flex-wrap items-center gap-4 p-3 rounded-md border border-dashed',
          'transition-colors duration-fast ease-ease',
          dragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-sunken',
        )}
      >
        <div
          className={cn(
            BOX[preview],
            'shrink-0 rounded-md border border-line bg-raised overflow-hidden flex items-center justify-center text-ink-3',
          )}
        >
          {value ? (
            <img src={preview_ ?? undefined} alt={label} className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="w-6 h-6" />
          )}
        </div>

        <div className="flex-1 min-w-[180px] space-y-2">
          {hint && <p className="text-body text-ink-2 leading-snug">{hint}</p>}
          <p className="text-body text-ink-3">Arrastre una imagen, péguela o elija un archivo.</p>

          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={inputId}
              className={cn(
                'inline-flex items-center gap-2 h-9 px-4 rounded-md cursor-pointer',
                'bg-raised border border-line-strong text-body font-semibold text-ink',
                'hover:bg-sunken transition-colors duration-fast ease-ease',
              )}
            >
              <Upload className="w-4 h-4" />
              {value ? 'Cambiar' : 'Elegir archivo'}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(',')}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) process(file);
                e.target.value = '';
              }}
            />

            {value && (
              <button
                type="button"
                onClick={() => {
                  /* Se libera de IndexedDB: si no, la foto queda ocupando
                     sitio sin ningún registro que la nombre. */
                  void deleteImage(value);
                  onChange(null);
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-body font-semibold text-danger hover:bg-danger-soft transition-colors duration-fast ease-ease"
              >
                <Trash2 className="w-4 h-4" />
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-body text-danger">{error}</p>
      ) : (
        <p className="text-body text-ink-3">
          PNG, JPG o WebP · máximo 5 MB · se reduce a {maxSize}px antes de guardar
        </p>
      )}
    </div>
  );
};
