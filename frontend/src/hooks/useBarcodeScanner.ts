import { useEffect, useRef } from 'react';

export const useBarcodeScanner = (onScan: (barcode: string) => void) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();

      // Clear buffer if time between keystrokes exceeds 50ms
      if (currentTime - lastKeyTimeRef.current > 50) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 3) {
          onScan(bufferRef.current);
          bufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);
};
