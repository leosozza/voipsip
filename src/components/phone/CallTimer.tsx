import { useEffect, useState } from 'react';
import { formatClock } from '@/lib/format';

/** Live mm:ss counter since `since` (epoch ms). */
export function CallTimer({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <time className="font-mono tabular-nums" aria-label="Duração da chamada">
      {formatClock((now - since) / 1000)}
    </time>
  );
}
