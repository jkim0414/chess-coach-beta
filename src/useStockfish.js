import { useEffect, useRef, useCallback } from 'react';

export function useStockfish() {
  const workerRef = useRef(null);
  const listenersRef = useRef([]);
  const readyRef = useRef(false);
  const queueRef = useRef([]);

  useEffect(() => {
    // stockfish.js self-detects the worker context; no hash needed
    const worker = new Worker('/stockfish.js');
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const msg = typeof e.data === 'string' ? e.data : e;
      if (msg === 'uciok') {
        readyRef.current = true;
        queueRef.current.forEach(m => worker.postMessage(m));
        queueRef.current = [];
      }
      listenersRef.current.forEach(fn => fn(msg));
    };

    // Init UCI
    worker.postMessage('uci');

    return () => {
      worker.postMessage('quit');
      worker.terminate();
    };
  }, []);

  const send = useCallback((msg) => {
    if (readyRef.current && workerRef.current) {
      workerRef.current.postMessage(msg);
    } else {
      queueRef.current.push(msg);
    }
  }, []);

  const addListener = useCallback((fn) => {
    listenersRef.current.push(fn);
    return () => {
      listenersRef.current = listenersRef.current.filter(f => f !== fn);
    };
  }, []);

  return { send, addListener };
}
