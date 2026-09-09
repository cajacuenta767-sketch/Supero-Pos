import { useCallback, useEffect, useRef, useState } from 'react';

/* La API BarcodeDetector es nativa en Chromium y Android; no está en todos los
   navegadores, así que se detecta antes de ofrecer la opción. */
interface DetectedBarcode {
  rawValue: string;
  format: string;
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

const getDetector = (): BarcodeDetectorCtor | undefined =>
  (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

export const isCameraScanSupported = (): boolean =>
  typeof window !== 'undefined' && !!getDetector() && !!navigator.mediaDevices?.getUserMedia;

export interface CameraScannerState {
  supported: boolean;
  scanning: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Escaneo por cámara como alternativa a la pistola USB.
 *
 * En una tablet de mostrador no hay lector HID, y obligar a teclear un EAN de
 * 13 dígitos es justo lo que el escaneo evita. El lector HID sigue siendo el
 * camino principal en la terminal fija: esto lo complementa, no lo sustituye.
 */
export const useCameraScanner = (onScan: (code: string) => void): CameraScannerState => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = isCameraScanSupported();

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const start = useCallback(async () => {
    const Detector = getDetector();
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no admite escaneo por cámara.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setError(null);
      setScanning(true);

      const detector = new Detector({
        formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e', 'qr_code'],
      });

      const tick = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        try {
          const found = await detector.detect(videoRef.current);
          const code = found[0]?.rawValue;
          /* Una cámara lee el mismo código 30 veces por segundo: se ignora
             una repetición dentro de 1,5 s para no añadirlo en bucle. */
          if (
            code &&
            (code !== lastCodeRef.current.code || Date.now() - lastCodeRef.current.at > 1500)
          ) {
            lastCodeRef.current = { code, at: Date.now() };
            onScan(code);
          }
        } catch {
          /* Un fotograma ilegible no interrumpe el escaneo. */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      setError(
        reason.includes('Permission') || reason.includes('NotAllowed')
          ? 'Permiso de cámara denegado.'
          : 'No se pudo abrir la cámara.',
      );
      setScanning(false);
    }
  }, [onScan]);

  useEffect(() => stop, [stop]);

  return { supported, scanning, error, videoRef, start, stop };
};
