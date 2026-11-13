import { useEffect, useState } from 'react';

const decode = (x) => { try { return decodeURIComponent(x); } catch { return x; } };
const parse = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decode);

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const f = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return route;
}

export const go = (...parts) => { window.location.hash = '#/' + parts.map(encodeURIComponent).join('/'); };
export const href = (...parts) => '#/' + parts.map(encodeURIComponent).join('/');
