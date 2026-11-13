import { exportData, dayKey } from './store.js';

/** Save everything (games, cards, settings) as a file the Progress tab can import again. */
export function downloadBackup() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
  a.download = `chess-coach-backup-${dayKey()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
