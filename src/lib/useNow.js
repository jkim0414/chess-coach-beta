import { useEffect, useState } from 'react';

/** Current time, refreshed every `ms` — keeps "due in 3h" labels honest without impure renders. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
