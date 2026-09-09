import React, { useCallback, useEffect, useRef } from 'react';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import { useCameraScanner } from '../hooks/useCameraScanner';
import { cn } from './cn';
import { Input } from './Field';
import type { InputProps } from './Field';

export interface ScanFieldProps extends Omit<InputProps, 'leading' | 'trailing' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  /** Se llama con cada código leído por la cámara, además de `onChange`. */
  onScan?: (code: string) => void;
  /** Cerrar el visor tras la primera lectura. Cierto para un campo único. */
  closeOnScan?: boolean;
}

/**
 * Campo de texto con lectura por cámara.
 *
 * La pistola USB escribe en el campo como cualquier teclado y no necesita nada
 * de esto. La cámara existe para la tablet del almacén, donde no hay pistola:
 * el visor solo se ofrece si el navegador admite `BarcodeDetector`, así que
 * donde no funcione no aparece un botón que no hace nada.
 */
export const ScanField: React.FC<ScanFieldProps> = ({
  value,
  onChange,
  onScan,
  closeOnScan = true,
  className,
  ...rest
}) => {
  const handleScan = useCallback(
    (code: string) => {
      onChange(code);
      onScan?.(code);
    },
    [onChange, onScan],
  );

  /* El cierre tras la lectura pasa por una referencia: el propio `stop` sale de
     la llamada al hook que recibe este callback, así que no se puede nombrar
     dentro de él. */
  const stopRef = useRef<(() => void) | null>(null);

  const handleDetected = useCallback(
    (code: string) => {
      handleScan(code);
      if (closeOnScan) stopRef.current?.();
    },
    [handleScan, closeOnScan],
  );

  const { supported, scanning, error, videoRef, start, stop } = useCameraScanner(handleDetected);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-end gap-2">
        <Input
          {...rest}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          leading={<ScanLine className="w-4 h-4" />}
          className="flex-1"
        />
        {supported && (
          <button
            type="button"
            onClick={() => (scanning ? stop() : void start())}
            aria-label={scanning ? 'Cerrar la cámara' : 'Escanear con la cámara'}
            aria-pressed={scanning}
            className={cn(
              'h-9 px-3 shrink-0 inline-flex items-center gap-2 rounded-md border',
              'text-body font-medium transition-colors duration-[--t-fast]',
              scanning
                ? 'bg-danger-soft border-danger/40 text-danger'
                : 'bg-raised border-line text-ink-2 hover:border-line-strong hover:text-ink',
            )}
          >
            {scanning ? (
              <CameraOff className="w-4 h-4" aria-hidden />
            ) : (
              <Camera className="w-4 h-4" aria-hidden />
            )}
            <span className="hidden sm:inline">{scanning ? 'Cerrar' : 'Cámara'}</span>
          </button>
        )}
      </div>

      {scanning && (
        <div className="relative rounded-md overflow-hidden border border-line bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full max-h-56 object-cover"
            aria-label="Vista de la cámara"
          />
          <span
            aria-hidden
            className="absolute left-6 right-6 top-1/2 h-px bg-danger/80 shadow-[0_0_8px_rgb(var(--danger))]"
          />
          <p className="absolute bottom-0 inset-x-0 px-3 py-1.5 text-body text-white bg-black/60">
            Encuadre el código dentro de la línea.
          </p>
        </div>
      )}

      {error && <p className="text-body text-danger">{error}</p>}
    </div>
  );
};
