import { supabase } from './supabase.js';
 
export async function checkUserAccess() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
 
  if (userError || !userData?.user) {
    console.error('[Access] user error:', userError);
    return false;
  }
 
  const user = userData.user;
 
  const { data, error } = await supabase
    .from('user_access')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
 
  if (error) {
    console.error('[Access] query error:', error);
    return false;
  }
 
  if (!data) return false;
  if (data.status !== 'active') return false;
 
  if (data.expires_at) {
    const now = new Date();
    const exp = new Date(data.expires_at);
    if (now > exp) return false;
  }
 
  return true;
}
 
export function showBlockedScreen(data = {}) {
   const phone = '5575991714242'; 
  const message = encodeURIComponent(
    `Oi! Acabei de criar minha conta na Fissão de Conhecimento e quero liberar meu acesso.\n\nEmail: ${window._currentUser || ''}`
  );
 
  document.body.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #070b16;
      color: #fff;
      font-family: Outfit, sans-serif;
      padding: 24px;
    ">
      <div style="
        width: 100%;
        max-width: 420px;
        background: #151b31;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 22px;
        padding: 32px 28px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      ">
 
        <div style="font-size: 42px; margin-bottom: 10px;">🔒</div>
 
        <h2 style="margin: 0 0 10px; font-size: 26px;">
          Acesso pendente
        </h2>
 
        <p style="margin: 0 0 18px; color: rgba(255,255,255,0.75); line-height: 1.6;">
          Sua conta foi criada com sucesso, mas o acesso ainda precisa ser liberado.
        </p>
 
        <div style="
          background: rgba(250, 204, 21, 0.08);
          border: 1px solid rgba(250, 204, 21, 0.22);
          color: #fde68a;
          padding: 12px 14px;
          border-radius: 12px;
          margin-bottom: 18px;
          font-size: 14px;
        ">
          Plano: <strong>${data.plan || 'Básico'}</strong>
        </div>
 
        <div style="
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 14px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 18px;
          color: rgba(255,255,255,0.75);
        ">
          💡 O acesso é liberado após confirmação do pagamento via Pix.
        </div>
 
        <button onclick="window.open('https://wa.me/${phone}?text=${message}', '_blank')"
          style="
            width: 100%;
            background: linear-gradient(135deg, #facc15, #eab308);
            color: #171717;
            border: none;
            border-radius: 14px;
            padding: 14px 18px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            margin-bottom: 10px;
          ">
          Liberar meu acesso
        </button>
 
        <button onclick="location.reload()"
          style="
            width: 100%;
            background: transparent;
            color: #cbd5e1;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 14px;
            padding: 12px 16px;
            font-size: 14px;
            cursor: pointer;
          ">
          Já paguei
        </button>
 
        <p style="
          font-size: 12px;
          margin-top: 14px;
          color: rgba(255,255,255,0.4);
        ">
          Atendimento rápido pelo WhatsApp
        </p>
 
      </div>
    </div>
  `;
}