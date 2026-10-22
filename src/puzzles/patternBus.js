// Lets any screen open the pattern-practice drawer ("practise forks now").
const listeners = new Set();
export function requestPattern(theme) { listeners.forEach((l) => l({ theme })); }
export function onPatternRequest(fn) { listeners.add(fn); return () => listeners.delete(fn); }
