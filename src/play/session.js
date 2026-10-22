import { useSyncExternalStore } from 'react';
import { GameController } from './controller.js';
import { getEngine } from '../lib/engine.js';

let ctrl = null;
let subscribe = null;

/** One live game for the whole app, so it survives navigating between tabs. */
export function getController() {
  if (!ctrl) {
    ctrl = new GameController({ engine: getEngine() });
    subscribe = (fn) => ctrl.subscribe(fn);
  }
  return ctrl;
}

export function useGame() {
  const c = getController();
  const state = useSyncExternalStore(subscribe, c.getState, c.getState);
  return [state, c];
}
