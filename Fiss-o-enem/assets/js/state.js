// ═══════════════════════════════════════════════════════════
// state.js — Fonte de verdade do estado da aplicação.
// ═══════════════════════════════════════════════════════════

import { DEFAULT_STATE } from './constants.js';
import {
  loadFromStorage,
  persistState,
  loadStateFromSupabase,
  persistStateToSupabase
} from './storage.js';

let _state = null;

export function initState() {
  const saved = loadFromStorage();
  _state = saved
    ? { ...structuredClone(DEFAULT_STATE), ...saved }
    : structuredClone(DEFAULT_STATE);

  _state.errosDiag ??= [];
  _state.caderno ??= [];
  _state.anki ??= [];
  _state.repertorios ??= [];
  _state.ideias ??= [];
}

export async function syncStateFromSupabase() {
  const remote = await loadStateFromSupabase();
  if (!remote) return;

  _state = {
    ...structuredClone(DEFAULT_STATE),
    ...remote
  };

  persistState(_state);
}

export function getState() {
  if (!_state) initState();
  return _state;
}

export function setState(updater) {
  if (!_state) initState();

  if (typeof updater === 'function') {
    _state = updater({ ..._state });
  } else {
    _state = { ..._state, ...updater };
  }

  persistState(_state);
  persistStateToSupabase(_state);
}