import { Component } from 'react';
import { downloadBackup } from '../lib/backup.js';

/** Last line of defence: if a screen crashes, say so and offer a way out instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h1>Something went wrong</h1>
        <p>Chess Coach hit an error it couldn’t recover from. Your games and review cards are still on this device.</p>
        <div className="callout-actions">
          {/* Back to the start screen, in case the page that crashed would crash again. */}
          <button type="button" className="btn btn-primary" onClick={() => { window.location.hash = '#/play'; window.location.reload(); }}>Restart the app</button>
          <button type="button" className="btn btn-ghost" onClick={downloadBackup}>Download a backup</button>
        </div>
        <details>
          <summary>Details</summary>
          <pre>{String(error?.stack || error)}</pre>
        </details>
      </div>
    );
  }
}
