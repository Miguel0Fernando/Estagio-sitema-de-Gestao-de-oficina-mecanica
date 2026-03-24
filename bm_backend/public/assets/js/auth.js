// auth.js — Autenticação real via API PHP

document.addEventListener('DOMContentLoaded', function () {

    // ── LOGIN ────────────────────────────────────────────────
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', async function (e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const senha = document.getElementById('loginSenha').value.trim();
            const btn   = formLogin.querySelector('button[type="submit"]');

            if (!email || !senha) { mostrarToast('Preencha todos os campos!', 'error'); return; }

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando...';

            try {
                const resp    = await API.Auth.login(email, senha);
                const usuario = resp.usuario || resp;
                sessionStorage.setItem('usuarioLogado', JSON.stringify(usuario));
                mostrarToast('Login realizado com sucesso!', 'success');

                // Fechar modal se existir
                const modalEl = document.getElementById('modalLogin');
                if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

                setTimeout(() => window.location.href = 'dashboard.html', 600);
            } catch (err) {
                mostrarToast(err.message || 'Email ou senha inválidos!', 'error');
                btn.disabled = false;
                btn.innerHTML = 'Entrar';
            }
        });
    }

    // ── CADASTRO ─────────────────────────────────────────────
    const formCadastro = document.getElementById('formCadastro');
    if (formCadastro) {
        formCadastro.addEventListener('submit', async function (e) {
            e.preventDefault();
            const nome  = document.getElementById('cadastroNome').value.trim();
            const email = document.getElementById('cadastroEmail').value.trim();
            const senha = document.getElementById('cadastroSenha').value.trim();
            const tipo  = document.getElementById('cadastroTipo')?.value || 'cliente';
            const btn   = formCadastro.querySelector('button[type="submit"]');

            if (!nome || !email || !senha) { mostrarToast('Preencha todos os campos!', 'error'); return; }
            if (senha.length < 6) { mostrarToast('Senha deve ter mínimo 6 caracteres!', 'error'); return; }

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Cadastrando...';

            try {
                await API.Auth.cadastro({ nome, email, senha, tipo });
                mostrarToast('Cadastro realizado! Faça login.', 'success');

                // Fechar modal cadastro
                const modalCad = document.getElementById('modalCadastro');
                if (modalCad) bootstrap.Modal.getInstance(modalCad)?.hide();

                // Abrir modal login após fechar cadastro
                setTimeout(() => {
                    const modalLogin = document.getElementById('modalLogin');
                    if (modalLogin) new bootstrap.Modal(modalLogin).show();
                }, 600);

            } catch (err) {
                mostrarToast(err.message || 'Erro ao cadastrar!', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Cadastrar';
            }
        });
    }

    // ── VERIFICAR SESSÃO NO DASHBOARD ────────────────────────
    if (window.location.pathname.includes('dashboard.html')) {
        const raw = sessionStorage.getItem('usuarioLogado');
        if (!raw) {
            window.location.href = 'index.html';
            return;
        }
        atualizarInfoUsuario(JSON.parse(raw));
    }
});

// ── LOGOUT ───────────────────────────────────────────────────
async function handleLogout() {
    try { await API.Auth.logout(); } catch (_) {}
    sessionStorage.removeItem('usuarioLogado');
    window.location.href = 'index.html';
}

// ── ATUALIZAR UI ─────────────────────────────────────────────
function atualizarInfoUsuario(usuario) {
    const el = (id) => document.getElementById(id);
    if (el('userName'))   el('userName').textContent   = usuario.nome;
    if (el('userAvatar')) el('userAvatar').textContent = usuario.avatar || usuario.nome?.charAt(0).toUpperCase();
    if (el('userType')) {
        const tipos = { admin: 'Administrador', funcionario: 'Funcionário', cliente: 'Cliente' };
        el('userType').textContent = tipos[usuario.tipo] || usuario.tipo;
    }
}

// ── TOAST ─────────────────────────────────────────────────────
function mostrarToast(msg, tipo = 'info') {
    document.querySelector('.toast-flutuante')?.remove();
    const cores  = { success:'#06d6a0', error:'#ef476f', warning:'#ffb703', info:'#4361ee' };
    const icones = { success:'fa-check-circle', error:'fa-times-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
    const t = document.createElement('div');
    t.className = 'toast-flutuante';
    t.innerHTML = `<i class="fas ${icones[tipo]||icones.info}"></i> ${msg}`;
    t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:${cores[tipo]||cores.info};color:#fff;padding:12px 20px;border-radius:12px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.2);font-size:14px;display:flex;align-items:center;gap:8px;`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

window.handleLogout          = handleLogout;
window.mostrarToast           = mostrarToast;
window.atualizarInfoUsuario   = atualizarInfoUsuario;
