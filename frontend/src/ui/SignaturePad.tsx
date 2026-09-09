import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';
import { cn } from './cn';

export interface SignaturePadProps {
  /** data: URI PNG de la firma, o null si el lienzo está en blanco. */
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label: string;
  hint?: string;
  height?: number;
  className?: string;
}

/**
 * Lienzo de firma para pantalla táctil, ratón o lápiz.
 *
 * Usa eventos de puntero, que unifican los tres sin ramas por dispositivo, y
 * dibuja a la densidad real de la pantalla: una firma capturada a 1x sobre un
 * panel retina sale dentada al ampliarla, y una firma dentada no vale como
 * prueba de nada.
 *
 * Se exporta en PNG sobre fondo transparente: el color de la tinta es el del
 * tema en el momento de firmar, y el crédito puede revisarse en el tema
 * contrario meses después.
 */
export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  label,
  hint,
  height = 160,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [hasInk, setHasInk] = useState(Boolean(value));

  // El lienzo se dimensiona al ancho real del contenedor por el ratio de
  // píxel del dispositivo. Redimensionar lo vacía: no hay forma honesta de
  // reescalar un trazo a mano alzada sin deformarlo.
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    if (width === 0) return;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(canvas).color;
  }, [height]);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (!dirty.current) return;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    setHasInk(false);
    onChange(null);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-micro uppercase tracking-wide text-ink-3">{label}</span>
        {hasInk && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 text-body text-ink-3 hover:text-danger transition-colors duration-[--t-fast]"
          >
            <Eraser className="w-3.5 h-3.5" aria-hidden />
            Borrar
          </button>
        )}
      </div>
      <div className="relative rounded-md border border-line bg-surface overflow-hidden">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          style={{ height }}
          className="w-full block touch-none cursor-crosshair text-ink"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
        {!hasInk && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none text-ink-3">
            <PenLine className="w-5 h-5" aria-hidden />
            <span className="text-body">Firme aquí</span>
          </span>
        )}
        <span
          aria-hidden
          className="absolute left-6 right-6 bottom-7 border-b border-dashed border-line pointer-events-none"
        />
      </div>
      {hint && <p className="text-body text-ink-3">{hint}</p>}
    </div>
  );
};
