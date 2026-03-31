// ═══════════════════════════════════════════════════════════
// storage.js — Persistência híbrida: localStorage + Supabase.
// ═══════════════════════════════════════════════════════════
 
import { STORAGE_KEY } from './constants.js';
import { supabase } from './supabase.js';
 
// ─── Chave do usuário ─────────────────────────────────────
let _userKey = STORAGE_KEY;
 
export function setUserKey(username) {
  const safeUser = String(username || 'anon')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, '_');
 
  _userKey = `fissao_v4_${safeUser}`;
}
 
export function getUserKey() {
  return _userKey;
}
 
// ─── localStorage ─────────────────────────────────────────
 
export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(_userKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('[Storage] loadFromStorage:', e);
    return null;
  }
}
 
export function persistState(state) {
  try {
    localStorage.setItem(_userKey, JSON.stringify(state));
    _flashSaveIndicator();
  } catch (e) {
    console.error('[Storage] persistState:', e);
  }
}
 
export function clearStoredState() {
  try {
    localStorage.removeItem(_userKey);
  } catch (e) {
    console.error('[Storage] clearStoredState:', e);
  }
}
 
// ─── Supabase ─────────────────────────────────────────────
//
// Tabela necessária no Supabase (cole no SQL Editor e execute):
//
//   create table public.user_state (
//     id         uuid primary key default gen_random_uuid(),
//     user_id    uuid not null references auth.users(id) on delete cascade,
//     state_json jsonb not null default '{}',
//     updated_at timestamptz not null default now(),
//     unique(user_id)
//   );
//
//   alter table public.user_state enable row level security;
//
//   create policy "usuario acessa proprio estado"
//     on public.user_state for all
//     using  (auth.uid() = user_id)
//     with check (auth.uid() = user_id);
 
export async function loadStateFromSupabase() {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return null;
 
    const userId = authData.user.id;
 
    const { data, error } = await supabase
      .from('user_state')
      .select('state_json')
      .eq('user_id', userId)
      .maybeSingle();
 
    if (error) {
      console.error('[Storage] loadStateFromSupabase:', error);
      return null;
    }
 
    console.log('[Storage] Estado carregado do Supabase.');
    return data?.state_json || null;
 
  } catch (e) {
    console.error('[Storage] loadStateFromSupabase:', e);
    return null;
  }
}
 
// ─── Debounce — evita múltiplos requests seguidos ─────────
// setState() pode disparar várias vezes por segundo.
// O debounce agrupa todas as chamadas e executa só 1 request
// após 1,5s de silêncio. Economiza cota do Supabase.
 
let _debounceTimer = null;
const DEBOUNCE_MS = 1500;
 
export function persistStateToSupabase(state) {
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => _doSave(state), DEBOUNCE_MS);
}
 
async function _doSave(state) {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return;
 
    const userId = authData.user.id;
 
    const { error } = await supabase
      .from('user_state')
      .upsert(
        {
          user_id: userId,
          state_json: state,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );
 
    if (error) {
      console.error('[Storage] persistStateToSupabase:', error);
    } else {
      console.log('[Storage] Estado salvo no Supabase.');
    }
 
  } catch (e) {
    console.error('[Storage] _doSave:', e);
  }
}
 
// ─── Reset completo (localStorage + Supabase) ─────────────
// Substitui a função resetData() global que só limpava o localStorage.
// Exporte e registre no window (em main.js) para o botão do HTML funcionar.
 
export async function resetData() {
  const confirmar = confirm(
    'Isso vai apagar TODOS os seus dados permanentemente.\n\nTem certeza?'
  );
  if (!confirmar) return;
 
  clearStoredState();
 
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const { error } = await supabase
        .from('user_state')
        .delete()
        .eq('user_id', authData.user.id);
 
      if (error) console.error('[Storage] resetData Supabase:', error);
    }
  } catch (e) {
    console.error('[Storage] resetData:', e);
  }
 
  location.reload();
}
 
// ─── Indicador visual "✓ SALVO" ───────────────────────────
 
function _flashSaveIndicator() {
  const el = document.getElementById('saveIndicator');
  if (!el) return;
 
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.style.opacity = '0';
  }, 2200);
}