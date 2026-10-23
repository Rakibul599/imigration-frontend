'use client';

import { useEffect } from 'react';

export default function ChunkErrorReloader() {
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      const msg = e.message || '';
      if (
        msg.includes('Loading chunk') ||
        msg.includes('ChunkLoadError') ||
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('missing in assets')
      ) {
        console.warn('Chunk mismatch detected after deployment. Reloading page...');
        window.location.reload();
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return null;
}
