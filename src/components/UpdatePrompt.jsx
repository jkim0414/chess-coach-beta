import { useRegisterSW } from 'virtual:pwa-register/react';

const CHECK_EVERY_MS = 30 * 60 * 1000;

/** Registers the service worker and offers new versions as soon as they're deployed. */
export default function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update(), CHECK_EVERY_MS);
    },
  });
  if (!needRefresh) return null;
  return (
    <div className="toast" role="status">
      <span>A new version of Chess Coach is ready.</span>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => updateServiceWorker(true)}>Update</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNeedRefresh(false)}>Later</button>
    </div>
  );
}
