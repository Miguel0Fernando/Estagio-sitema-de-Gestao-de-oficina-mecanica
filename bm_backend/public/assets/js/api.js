// api.js — Cliente de API para o Back-end PHP

const API_BASE = '../api';

async function apiFetch(endpoint, method = 'GET', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    };
    if (body) opts.body = JSON.stringify(body);

    try {
        const res  = await fetch(`${API_BASE}/${endpoint}`, opts);
        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message || 'Erro desconhecido na API');
        }

        // Extrair dados correctamente independente do formato
        const d = data.data;
        if (Array.isArray(d)) return d;
        // Se for objecto com uma chave que é array, retornar esse array
        if (d && typeof d === 'object') {
            const keys = Object.keys(d);
            // Chaves conhecidas de listas
            const listKeys = ['clientes','veiculos','funcionarios','ordens','produtos','usuarios'];
            for (const k of listKeys) {
                if (Array.isArray(d[k])) return d[k];
            }
            // Retornar o objecto completo para respostas únicas
            return d;
        }
        return d;
    } catch (err) {
        console.error(`[API] Erro em ${endpoint}:`, err.message);
        throw err;
    }
}

// AUTH
const Auth = {
    login:   (email, senha) => apiFetch('auth.php?action=login',    'POST', { email, senha }),
    logout:  ()             => apiFetch('auth.php?action=logout',   'POST'),
    cadastro:(dados)        => apiFetch('auth.php?action=cadastro', 'POST', dados),
    sessao:  ()             => apiFetch('auth.php?action=sessao',   'GET'),
};

// DASHBOARD
const Dashboard = {
    admin:       ()       => apiFetch('dashboard.php?tipo=admin'),
    funcionario: (ref_id) => apiFetch(`dashboard.php?tipo=funcionario&ref_id=${ref_id}`),
    cliente:     (ref_id) => apiFetch(`dashboard.php?tipo=cliente&ref_id=${ref_id}`),
};

// CLIENTES
const Clientes = {
    listar:   (busca = '') => apiFetch(`clientes.php${busca ? '?busca='+encodeURIComponent(busca) : ''}`),
    buscar:   (id)         => apiFetch(`clientes.php?id=${id}`),
    criar:    (dados)      => apiFetch('clientes.php', 'POST', dados),
    atualizar:(id, dados)  => apiFetch(`clientes.php?id=${id}`, 'PUT', dados),
    remover:  (id)         => apiFetch(`clientes.php?id=${id}`, 'DELETE'),
};

// VEÍCULOS
const Veiculos = {
    listar:     (busca = '') => apiFetch(`veiculos.php${busca ? '?busca='+encodeURIComponent(busca) : ''}`),
    porCliente: (cliente_id) => apiFetch(`veiculos.php?cliente_id=${cliente_id}`),
    buscar:     (id)         => apiFetch(`veiculos.php?id=${id}`),
    criar:      (dados)      => apiFetch('veiculos.php', 'POST', dados),
    atualizar:  (id, dados)  => apiFetch(`veiculos.php?id=${id}`, 'PUT', dados),
    remover:    (id)         => apiFetch(`veiculos.php?id=${id}`, 'DELETE'),
};

// FUNCIONÁRIOS
const Funcionarios = {
    listar:   ()           => apiFetch('funcionarios.php'),
    buscar:   (id)         => apiFetch(`funcionarios.php?id=${id}`),
    criar:    (dados)      => apiFetch('funcionarios.php', 'POST', dados),
    atualizar:(id, dados)  => apiFetch(`funcionarios.php?id=${id}`, 'PUT', dados),
    remover:  (id)         => apiFetch(`funcionarios.php?id=${id}`, 'DELETE'),
};

// PRODUTOS
const Produtos = {
    listar:   (busca = '') => apiFetch(`produtos.php${busca ? '?busca='+encodeURIComponent(busca) : ''}`),
    buscar:   (id)         => apiFetch(`produtos.php?id=${id}`),
    alertas:  ()           => apiFetch('produtos.php?acao=alertas'),
    criar:    (dados)      => apiFetch('produtos.php', 'POST', dados),
    atualizar:(id, dados)  => apiFetch(`produtos.php?id=${id}`, 'PUT', dados),
    ajustar:  (id, ajuste, motivo) => apiFetch(`produtos.php?id=${id}`, 'PUT', { ajuste_quantidade: ajuste, motivo }),
    remover:  (id)         => apiFetch(`produtos.php?id=${id}`, 'DELETE'),
};

// ORDENS
const Ordens = {
    listar:   (filtros = {}) => {
        const params = new URLSearchParams(filtros).toString();
        return apiFetch(`ordens.php${params ? '?'+params : ''}`);
    },
    buscar:   (id)         => apiFetch(`ordens.php?id=${id}`),
    criar:    (dados)      => apiFetch('ordens.php', 'POST', dados),
    atualizar:(id, dados)  => apiFetch(`ordens.php?id=${id}`, 'PUT', dados),
    cancelar: (id)         => apiFetch(`ordens.php?id=${id}`, 'DELETE'),
};

// USUÁRIOS
const Usuarios = {
    listar:   ()           => apiFetch('usuarios.php'),
    buscar:   (id)         => apiFetch(`usuarios.php?id=${id}`),
    criar:    (dados)      => apiFetch('usuarios.php', 'POST', dados),
    atualizar:(id, dados)  => apiFetch(`usuarios.php?id=${id}`, 'PUT', dados),
    remover:  (id)         => apiFetch(`usuarios.php?id=${id}`, 'DELETE'),
};


// PAGAMENTOS
const Pagamentos = {
    listar:  (filtros = {}) => {
        const p = new URLSearchParams(filtros).toString();
        return apiFetch(`pagamentos.php${p ? '?'+p : ''}`);
    },
    criar:   (dados) => apiFetch('pagamentos.php', 'POST', dados),
    cancelar:(id)    => apiFetch(`pagamentos.php?id=${id}`, 'DELETE'),
};

// FATURAS
const Faturas = {
    listar:    ()    => apiFetch('faturas.php'),
    buscar:    (id)  => apiFetch(`faturas.php?id=${id}`),
    relatorio: (inicio, fim) => apiFetch(`faturas.php?acao=relatorio&inicio=${inicio}&fim=${fim}`),
};

window.API = { Auth, Dashboard, Clientes, Veiculos, Funcionarios, Produtos, Ordens, Usuarios, Pagamentos, Faturas };

window.apiFetch = apiFetch;
