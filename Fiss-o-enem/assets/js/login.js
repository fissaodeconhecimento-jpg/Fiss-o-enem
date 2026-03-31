// ═══════════════════════════════════════════════════════════
// login.js — com disparo do tour na conta demo
// ═══════════════════════════════════════════════════════════

import { supabase } from './supabase.js';
import { setUserKey } from './storage.js';
import { initState, syncStateFromSupabase } from './state.js';
import { loadTheme } from './theme.js';
import { renderAll } from './dom.js';
import { checkUserAccess, showBlockedScreen } from './access.js';
import { startCountdown } from './dashboard.js';
import { activateDemoMode, clearDemoMode, DEMO_USER } from './demo.js';
import { startTourIfDemo } from './tour.js';

function setLoginError(message = '', isSuccess = false) {
  const err = document.getElementById('loginErr');
  if (!err) return;
  err.style.display = message ? 'block' : 'none';
  err.textContent = message;
  err.classList.toggle('success', !!isSuccess);
}

function prepararUIUsuario(username, isDemo = false) {
  document.getElementById('loginScreen')?.classList.add('hidden');
  window._currentUser = username;
  setUserKey(username);

  const pill = document.getElementById('userPill');
  const letter = document.getElementById('userAvatarLetter');
  const label = document.getElementById('userNameLabel');

  if (letter) letter.textContent = (isDemo ? 'D' : (username?.[0] || 'U')).toUpperCase();
  if (label) label.textContent = isDemo ? 'Modo Demo' : String(username || 'Usuário').split('@')[0];
  if (pill) pill.style.display = 'flex';

  loadTheme();
}

function pintarTopoDemo() {
  const topbar = document.querySelector('.topbar-right');
  if (!topbar || document.getElementById('demoModeBadge')) return;

  const badge = document.createElement('div');
  badge.id = 'demoModeBadge';
  badge.style.cssText = `
    display:flex;align-items:center;gap:6px;
    padding:7px 10px;border-radius:999px;
    background:rgba(124,92,252,.14);
    border:1px solid rgba(124,92,252,.28);
    color:#cfc5ff;font-size:11px;font-weight:800;
    letter-spacing:.04em;
  `;
  badge.textContent = '✨ DEMO';
  topbar.insertBefore(badge, topbar.firstChild);
}

function removerBadgeDemo() {
  document.getElementById('demoModeBadge')?.remove();
}

function enterDemoApp(username) {
  prepararUIUsuario(username, true);
  initState();
  renderAll();
  startCountdown();
  pintarTopoDemo();

  setTimeout(() => {
    startTourIfDemo();
  }, 700);
}

export function enterApp(username) {
  prepararUIUsuario(username, false);
  removerBadgeDemo();

  checkUserAccess()
    .then(hasAccess => {
      if (!hasAccess) {
        showBlockedScreen({ plan: 'Básico' });
        return;
      }

      initState();

      return syncStateFromSupabase()
        .catch(err => {
          console.error('[Login] syncStateFromSupabase:', err);
        })
        .finally(() => {
          renderAll();
          startCountdown();
        });
    })
    .catch(err => {
      console.error('[Login] checkUserAccess:', err);
      initState();
      renderAll();
      startCountdown();
    });
}

export async function doLogin() {
  clearDemoMode();

  const user = document.getElementById('loginUser')?.value.trim().toLowerCase();
  const pass = document.getElementById('loginPass')?.value;

  if (!user || !pass) {
    setLoginError('Preencha email e senha.');
    return;
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user);
  if (!emailValido) {
    setLoginError('Digite um email válido.');
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: user,
    password: pass
  });

  if (error) {
    console.error('[Login] signIn error:', error);
    setLoginError('Email ou senha incorretos.');
    return;
  }

  setLoginError('');
  const email = data?.user?.email || user;
  enterApp(email);
}

export async function doSignup() {
  clearDemoMode();

  const user = document.getElementById('loginUser')?.value.trim().toLowerCase();
  const pass = document.getElementById('loginPass')?.value;

  if (!user || !pass) {
    setLoginError('Preencha email e senha para criar conta.');
    return;
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user);
  if (!emailValido) {
    setLoginError('Digite um email válido.');
    return;
  }

  if (pass.length < 6) {
    setLoginError('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  const { error } = await supabase.auth.signUp({
    email: user,
    password: pass
  });

  if (error) {
    console.error('[Signup] erro:', error);
    setLoginError(error.message || 'Erro ao criar conta.');
    return;
  }

  setLoginError('Conta criada com sucesso! Aguarde a liberação do acesso.', true);
}

export function demoLogin() {
  try {
    setLoginError('');
    activateDemoMode();
    enterDemoApp(DEMO_USER);
  } catch (e) {
    console.error('[Demo] erro:', e);
    setLoginError('Não foi possível abrir a conta demo agora.');
  }
}

export async function showLogoutMenu() {
  const ok = confirm(`Deseja sair da conta ${window._currentUser || ''}?`);
  if (!ok) return;

  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('[Logout] erro:', error);
  }

  clearDemoMode();
  location.reload();
}

export async function checkAutoLogin() {
  try {
    if (localStorage.getItem('fissao_demo_mode') === 'true') {
      enterDemoApp(DEMO_USER);
      return;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Login] getSession error:', error);
      return;
    }

    const sess = data?.session;
    if (sess?.user?.email) {
      enterApp(sess.user.email);
    }
  } catch (e) {
    console.error('[Login] checkAutoLogin:', e);
  }
}

function injetarBotaoDemo() {
  const area =
    document.getElementById('loginFormArea') ||
    document.querySelector('.login-card') ||
    document.querySelector('.login-box') ||
    document.querySelector('#loginScreen form') ||
    document.querySelector('#loginScreen');

  if (!area || document.getElementById('demoLoginBtn')) return;

  const wrap = document.createElement('div');
  wrap.style.marginTop = '12px';
  wrap.innerHTML = `
    <button id="demoLoginBtn" type="button" style="
      width:100%;
      background:rgba(124,92,252,.14);
      border:1px solid rgba(124,92,252,.30);
      color:#d7cbff;
      border-radius:10px;
      padding:12px;
      font-weight:700;
      cursor:pointer;
    ">
      ✨ Explorar conta demo
    </button>
    <div style="
      font-size:11px;
      color:var(--muted);
      margin-top:8px;
      text-align:center;
      line-height:1.45;
    ">
      Veja o sistema funcionando antes de criar conta.
    </div>
  `;

  wrap.querySelector('#demoLoginBtn')?.addEventListener('click', demoLogin);
  area.appendChild(wrap);
}

export function inicializarLoginKeys() {
  document.getElementById('loginUser')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginPass')?.focus();
  });

  document.getElementById('loginPass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  setTimeout(injetarBotaoDemo, 250);

  window.doLogin = doLogin;
  window.doSignup = doSignup;
  window.demoLogin = demoLogin;
}
