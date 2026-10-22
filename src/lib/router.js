import { useEffect, useState } from 'react';

const parse = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);

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
