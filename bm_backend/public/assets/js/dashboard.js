// dashboard.js — Dashboard moderno conectado à API PHP

let usuarioLogado = null;
let graficos = {};

document.addEventListener('DOMContentLoaded', async function () {
    const raw = sessionStorage.getItem('usuarioLogado');
    if (!raw) { window.location.href = 'index.html'; return; }
    usuarioLogado = JSON.parse(raw);
    atualizarInfoUsuario(usuarioLogado);
    carregarMenu(usuarioLogado.tipo);
    await carregarDashboard();
    carregarNotifCount();
});

// ── INFO USUÁRIO ─────────────────────────────────────────
function atualizarInfoUsuario(u) {
    const el = id => document.getElementById(id);
    if(el('userName')) el('userName').textContent = u.nome;
    if(el('userAvatar')) el('userAvatar').textContent = u.avatar || u.nome?.charAt(0).toUpperCase();
    if(el('userType')) {
        const t = {admin:'Administrador',funcionario:'Funcionário',cliente:'Cliente'};
        el('userType').textContent = t[u.tipo] || u.tipo;
    }
}

// ── MENU ─────────────────────────────────────────────────
function carregarMenu(tipo) {
    const nav = document.getElementById('navMenu');
    if(!nav) return;
    const menus = {
        admin:[
            {icon:'fa-home',text:'Dashboard',action:'dashboard'},
            {icon:'fa-users',text:'Clientes',action:'clientes'},
            {icon:'fa-car',text:'Veículos',action:'veiculos'},
            {icon:'fa-hard-hat',text:'Funcionários',action:'funcionarios'},
            {icon:'fa-clipboard-list',text:'Ordens de Serviço',action:'ordens'},
            {icon:'fa-boxes',text:'Estoque',action:'estoque'},
            {icon:'fa-user-cog',text:'Usuários',action:'usuarios'},
        ],
        funcionario:[
            {icon:'fa-home',text:'Dashboard',action:'dashboard'},
            {icon:'fa-tasks',text:'Minhas Ordens',action:'ordens'},
            {icon:'fa-boxes',text:'Estoque',action:'estoque'},
        ],
        cliente:[
            {icon:'fa-home',text:'Dashboard',action:'dashboard'},
            {icon:'fa-car',text:'Meus Veículos',action:'veiculos'},
            {icon:'fa-file-alt',text:'Minhas Ordens',action:'ordens'},
        ],
    };
    const items = menus[tipo] || menus.cliente;
    nav.innerHTML = items.map((item,i) => `
        <a class="nav-item ${i===0?'active':''}" data-action="${item.action}" onclick="navegar('${item.action}',this)">
            <i class="fas ${item.icon}"></i>
            <span>${item.text}</span>
        </a>`).join('');
}

function navegar(acao, el) {
    document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
    if(el) el.classList.add('active');
    carregarSecao(acao);
}

// ── DASHBOARD PRINCIPAL ───────────────────────────────────
async function carregarDashboard() {
    const page = document.getElementById('pg');
    page.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Carregando dashboard...</p></div>';
    try {
        if(usuarioLogado.tipo === 'admin') {
            const dados = await API.Dashboard.admin();
            page.innerHTML = renderDashboardAdmin(dados);
            setTimeout(() => renderGraficos(dados), 100);
        } else if(usuarioLogado.tipo === 'funcionario') {
            const funcs = await API.Funcionarios.listar().catch(()=>[]);
            const func = (Array.isArray(funcs)?funcs:[]).find(f=>f.email===usuarioLogado.email);
            const dados = func ? await API.Dashboard.funcionario(func.id) : {cards:{},minhas_ordens:[]};
            page.innerHTML = renderDashboardFuncionario(dados);
        } else {
            const clis = await API.Clientes.listar().catch(()=>[]);
            const cli = (Array.isArray(clis)?clis:[]).find(c=>c.email===usuarioLogado.email);
            const dados = cli ? await API.Dashboard.cliente(cli.id) : {cards:{},veiculos:[],ordens:[]};
            page.innerHTML = renderDashboardCliente(dados);
        }
    } catch(err) {
        page.innerHTML = `<div class="alert-custom" style="color:var(--red)"><i class="fas fa-exclamation-circle" style="font-size:32px;display:block;margin-bottom:12px"></i>Erro ao carregar dashboard: ${err.message}</div>`;
    }
}

const fmt = v => new Intl.NumberFormat('pt-AO').format(v||0);

// ── RENDER ADMIN ──────────────────────────────────────────
function renderDashboardAdmin(d) {
    const c = d.cards || {};
    return `
    <div class="page-header">
        <h2>Visão Geral</h2>
        <p>Bem-vindo de volta, ${usuarioLogado.nome}! Aqui está o resumo de hoje.</p>
    </div>

    <div class="stats-grid">
        <div class="stat-card blue">
            <div class="stat-top">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <span class="stat-trend trend-up">↑ Activos</span>
            </div>
            <div class="stat-value">${c.total_clientes||0}</div>
            <div class="stat-label">Total de Clientes</div>
        </div>
        <div class="stat-card cyan">
            <div class="stat-top">
                <div class="stat-icon"><i class="fas fa-car"></i></div>
                <span class="stat-trend trend-neutral">Registados</span>
            </div>
            <div class="stat-value">${c.total_veiculos||0}</div>
            <div class="stat-label">Veículos</div>
        </div>
        <div class="stat-card orange">
            <div class="stat-top">
                <div class="stat-icon"><i class="fas fa-clipboard-list"></i></div>
                <span class="stat-trend trend-up">Abertas</span>
            </div>
            <div class="stat-value">${(c.ordens_pendentes||0)+(c.ordens_andamento||0)}</div>
            <div class="stat-label">Ordens Abertas</div>
        </div>
        <div class="stat-card green">
            <div class="stat-top">
                <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                <span class="stat-trend trend-up">Concluídas</span>
            </div>
            <div class="stat-value">${c.ordens_concluidas||0}</div>
            <div class="stat-label">Ordens Concluídas</div>
        </div>
        <div class="stat-card purple">
            <div class="stat-top">
                <div class="stat-icon"><i class="fas fa-hard-hat"></i></div>
                <span class="stat-trend trend-neutral">Equipa</span>
            </div>
            <div class="stat-value">${c.total_funcionarios||0}</div>
            <div class="stat-label">Funcionários</div>
        </div>
        <div class="stat-card ${(c.estoque_baixo||0)>0?'red':'green'}">
            <div class="stat-top">
                <div class="stat-icon"><i class="fas fa-boxes"></i></div>
                <span class="stat-trend ${(c.estoque_baixo||0)>0?'trend-down':'trend-up'}">${(c.estoque_baixo||0)>0?'Atenção':'OK'}</span>
            </div>
            <div class="stat-value">${c.estoque_baixo||0}</div>
            <div class="stat-label">Produtos em Falta</div>
        </div>
        <div class="stat-card blue" style="grid-column: span 2">
            <div class="stat-top">
                <div class="stat-icon"><i class="fas fa-dollar-sign"></i></div>
                <span class="stat-trend trend-up">↑ Este mês</span>
            </div>
            <div class="stat-value" style="font-size:28px">${fmt(c.faturamento_mes)} Kz</div>
            <div class="stat-label">Faturamento do Mês · Total: ${fmt(c.faturamento_total)} Kz</div>
            <div class="progress-bar-wrap" style="margin-top:12px">
                <div class="progress-bar-fill" style="background:linear-gradient(90deg,var(--accent),var(--accent2));width:${Math.min(100,(c.faturamento_mes||0)/(c.faturamento_total||1)*100).toFixed(0)}%"></div>
            </div>
        </div>
    </div>

    <div class="charts-grid">
        <div class="chart-card">
            <div class="chart-header">
                <div>
                    <div class="chart-title">Ordens por Mês</div>
                    <div class="chart-subtitle">Últimos 6 meses</div>
                </div>
                <span class="chart-badge">Barras</span>
            </div>
            <canvas id="chartMensal" height="200"></canvas>
        </div>
        <div class="chart-card">
            <div class="chart-header">
                <div>
                    <div class="chart-title">Status das Ordens</div>
                    <div class="chart-subtitle">Distribuição atual</div>
                </div>
                <span class="chart-badge">Doughnut</span>
            </div>
            <canvas id="chartStatus" height="200"></canvas>
        </div>
    </div>

    <div class="data-grid">
        <div class="data-card">
            <div class="data-header">
                <div class="data-title"><i class="fas fa-clock"></i> Últimas Ordens</div>
                <button class="btn-sm-custom" onclick="navegar('ordens',null)">Ver todas</button>
            </div>
            <table class="data-table">
                <thead><tr><th>Código</th><th>Cliente</th><th>Status</th><th>Valor</th></tr></thead>
                <tbody>
                    ${(d.ultimas_ordens||[]).map(o=>`
                    <tr>
                        <td><strong style="color:var(--accent)">${o.codigo}</strong></td>
                        <td>${o.cliente_nome}</td>
                        <td>${badgeStatus(o.status)}</td>
                        <td style="font-family:'Syne',sans-serif;font-weight:600">${fmt(o.valor_total)} Kz</td>
                    </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px">Sem ordens</td></tr>'}
                </tbody>
            </table>
        </div>
        <div class="data-card">
            <div class="data-header">
                <div class="data-title"><i class="fas fa-trophy"></i> Top Clientes</div>
            </div>
            ${(d.top_clientes||[]).map((c,i)=>`
            <div class="top-client">
                <div class="rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</div>
                <div class="av" style="background:linear-gradient(135deg,var(--accent),var(--accent3))">${c.nome?.charAt(0)}</div>
                <div class="client-info">
                    <h6>${c.nome}</h6>
                    <span>${c.total_ordens||0} ordens</span>
                </div>
                <div class="client-value">${fmt(c.total_gasto)} Kz</div>
            </div>`).join('') || '<div style="padding:20px;text-align:center;color:var(--text3)">Sem dados</div>'}
        </div>
    </div>

    ${(d.alertas_estoque||[]).length>0?`
    <div class="data-card full">
        <div class="data-header">
            <div class="data-title" style="color:var(--red)"><i class="fas fa-exclamation-triangle"></i> Alertas de Estoque Baixo</div>
            <button class="btn-sm-custom" onclick="navegar('estoque',null)">Gerir Estoque</button>
        </div>
        <table class="data-table">
            <thead><tr><th>Produto</th><th>Categoria</th><th>Quantidade</th><th>Mínimo</th><th>Preço</th></tr></thead>
            <tbody>
                ${d.alertas_estoque.map(p=>`
                <tr>
                    <td><strong>${p.nome}</strong></td>
                    <td>${p.categoria||'-'}</td>
                    <td><span class="badge-status badge-cancelled">${p.quantidade} un.</span></td>
                    <td>${p.quantidade_minima} un.</td>
                    <td>${fmt(p.preco)} Kz</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`:''}
    `;
}

// ── GRÁFICOS ──────────────────────────────────────────────
function renderGraficos(d) {
    Object.values(graficos).forEach(g=>g?.destroy());
    graficos = {};

    const ctx1 = document.getElementById('chartMensal');
    if(ctx1 && d.grafico_mensal?.length) {
        graficos.mensal = new Chart(ctx1, {
            type:'bar',
            data:{
                labels: d.grafico_mensal.map(g=>g.mes),
                datasets:[
                    {label:'Ordens', data:d.grafico_mensal.map(g=>g.total), backgroundColor:'rgba(59,130,246,0.7)', borderRadius:8, borderSkipped:false},
                    {label:'Faturamento (Kz)', data:d.grafico_mensal.map(g=>g.faturamento), type:'line', borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.1)', tension:0.4, yAxisID:'y1', pointBackgroundColor:'#10b981', pointRadius:4}
                ]
            },
            options:{
                responsive:true,
                plugins:{legend:{position:'top',labels:{color:'#94a3b8',font:{family:'DM Sans',size:12}}}},
                scales:{
                    x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#64748b'}},
                    y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#64748b'},beginAtZero:true},
                    y1:{position:'right',grid:{drawOnChartArea:false},ticks:{color:'#64748b'}}
                }
            }
        });
    }

    const ctx2 = document.getElementById('chartStatus');
    if(ctx2 && d.grafico_status?.length) {
        graficos.status = new Chart(ctx2, {
            type:'doughnut',
            data:{
                labels:d.grafico_status.map(s=>s.label),
                datasets:[{data:d.grafico_status.map(s=>s.valor), backgroundColor:['#f59e0b','#3b82f6','#10b981','#ef4444'], borderWidth:0, hoverOffset:8}]
            },
            options:{
                responsive:true, cutout:'70%',
                plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{family:'DM Sans',size:12},padding:16}}}
            }
        });
    }
}

// ── DASHBOARD FUNCIONÁRIO ─────────────────────────────────
function renderDashboardFuncionario(d) {
    const c = d.cards||{};
    return `
    <div class="page-header"><h2>Meu Painel</h2><p>Olá ${usuarioLogado.nome}!</p></div>
    <div class="stats-grid">
        <div class="stat-card blue"><div class="stat-top"><div class="stat-icon"><i class="fas fa-tasks"></i></div></div><div class="stat-value">${c.total||0}</div><div class="stat-label">Total de Ordens</div></div>
        <div class="stat-card orange"><div class="stat-top"><div class="stat-icon"><i class="fas fa-spinner"></i></div></div><div class="stat-value">${c.ativas||0}</div><div class="stat-label">Em Andamento</div></div>
        <div class="stat-card green"><div class="stat-top"><div class="stat-icon"><i class="fas fa-check"></i></div></div><div class="stat-value">${c.concluidas||0}</div><div class="stat-label">Concluídas</div></div>
        <div class="stat-card purple"><div class="stat-top"><div class="stat-icon"><i class="fas fa-dollar-sign"></i></div></div><div class="stat-value" style="font-size:20px">${fmt(c.valor_total)} Kz</div><div class="stat-label">Valor Total</div></div>
    </div>
    <div class="data-card full">
        <div class="data-header"><div class="data-title"><i class="fas fa-tasks"></i> Minhas Ordens</div></div>
        <table class="data-table">
            <thead><tr><th>Código</th><th>Cliente</th><th>Veículo</th><th>Status</th><th>Valor</th><th>Ações</th></tr></thead>
            <tbody>
                ${(d.minhas_ordens||[]).map(o=>`
                <tr>
                    <td><strong style="color:var(--accent)">${o.codigo}</strong></td>
                    <td>${o.cliente_nome}</td>
                    <td>${o.veiculo||o.veiculo_modelo||'-'}</td>
                    <td>${badgeStatus(o.status)}</td>
                    <td>${fmt(o.valor_total)} Kz</td>
                    <td><div class="action-btns"><button class="abtn view" onclick="verOrdem(${o.id})" title="Ver"><i class="fas fa-eye"></i></button></div></td>
                </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:20px">Sem ordens atribuídas</td></tr>'}
            </tbody>
        </table>
    </div>`;
}

// ── DASHBOARD CLIENTE ─────────────────────────────────────
function renderDashboardCliente(d) {
    const c = d.cards||{};
    return `
    <div class="page-header"><h2>Meu Painel</h2><p>Olá ${usuarioLogado.nome}!</p></div>
    <div class="stats-grid">
        <div class="stat-card blue"><div class="stat-top"><div class="stat-icon"><i class="fas fa-car"></i></div></div><div class="stat-value">${c.total_veiculos||0}</div><div class="stat-label">Meus Veículos</div></div>
        <div class="stat-card orange"><div class="stat-top"><div class="stat-icon"><i class="fas fa-file-alt"></i></div></div><div class="stat-value">${c.total_ordens||0}</div><div class="stat-label">Total de Ordens</div></div>
        <div class="stat-card green"><div class="stat-top"><div class="stat-icon"><i class="fas fa-spinner"></i></div></div><div class="stat-value">${c.ordens_ativas||0}</div><div class="stat-label">Em Andamento</div></div>
        <div class="stat-card purple"><div class="stat-top"><div class="stat-icon"><i class="fas fa-dollar-sign"></i></div></div><div class="stat-value" style="font-size:20px">${fmt(c.total_gasto)} Kz</div><div class="stat-label">Total Gasto</div></div>
    </div>
    <div class="data-grid">
        <div class="data-card">
            <div class="data-header"><div class="data-title"><i class="fas fa-car"></i> Meus Veículos</div></div>
            <table class="data-table">
                <thead><tr><th>Placa</th><th>Modelo</th><th>Status</th></tr></thead>
                <tbody>${(d.veiculos||[]).map(v=>`<tr><td><strong>${v.placa}</strong></td><td>${v.modelo}</td><td><span class="badge-status ${v.status==='Em oficina'?'badge-progress':'badge-ok'}">${v.status}</span></td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;color:var(--text3);padding:20px">Sem veículos</td></tr>'}</tbody>
            </table>
        </div>
        <div class="data-card">
            <div class="data-header"><div class="data-title"><i class="fas fa-file-alt"></i> Minhas Ordens</div></div>
            <table class="data-table">
                <thead><tr><th>OS</th><th>Status</th><th>Valor</th></tr></thead>
                <tbody>${(d.ordens||[]).map(o=>`<tr><td><strong style="color:var(--accent)">${o.codigo}</strong></td><td>${badgeStatus(o.status)}</td><td>${fmt(o.valor_total)} Kz</td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;color:var(--text3);padding:20px">Sem ordens</td></tr>'}</tbody>
            </table>
        </div>
    </div>`;
}

// ── CARREGAR SECÇÃO ───────────────────────────────────────
async function carregarSecao(acao) {
    if(acao==='dashboard'){await carregarDashboard();return;}
    const page = document.getElementById('pg');
    page.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Carregando...</p></div>';
    try {
        switch(acao) {
            case 'clientes':      page.innerHTML = await secaoClientes(); break;
            case 'veiculos':      page.innerHTML = await secaoVeiculos(); break;
            case 'funcionarios':  page.innerHTML = await secaoFuncionarios(); break;
            case 'ordens':        page.innerHTML = await secaoOrdens(); break;
            case 'estoque':       page.innerHTML = await secaoEstoque(); break;
            case 'usuarios':      page.innerHTML = await secaoUsuarios(); break;
            case 'pagamentos':    page.innerHTML = await secaoPagamentos(); break;
            case 'faturas':       page.innerHTML = await secaoFaturas(); break;
            case 'relatorios':    await secaoRelatorios(); break;
            default: page.innerHTML = '<div class="alert-custom">Secção em desenvolvimento.</div>';
        }
    } catch(err) {
        page.innerHTML = `<div class="alert-custom" style="color:var(--red)">Erro: ${err.message}</div>`;
    }
}

// ── CLIENTES ──────────────────────────────────────────────
async function secaoClientes() {
    const lista = await API.Clientes.listar().catch(()=>[]);
    const cl = Array.isArray(lista)?lista:[];
    return `
    <div class="page-header">
        <h2>Clientes</h2>
        <p>${cl.length} cliente(s) registado(s)</p>
    </div>
    <div class="data-card full">
        <div class="data-header">
            <div class="data-title"><i class="fas fa-users"></i> Lista de Clientes</div>
            <button class="btn-primary-custom" onclick="abrirModalCliente()"><i class="fas fa-plus"></i> Novo Cliente</button>
        </div>
        <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
            <input type="text" class="form-control" placeholder="Pesquisar clientes..." style="max-width:400px" oninput="filtrarClientes(this.value)">
        </div>
        <table class="data-table" id="tabelaClientes">
            <thead><tr><th>Cliente</th><th>Email</th><th>Telefone</th><th>NIF</th><th>Veículos</th><th>Total Gasto</th><th>Ações</th></tr></thead>
            <tbody>${cl.map(c=>linhaCliente(c)).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:20px">Sem clientes</td></tr>'}</tbody>
        </table>
    </div>`;
}

function linhaCliente(c) {
    return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px">
            <div class="av" style="background:linear-gradient(135deg,var(--accent),var(--accent2))">${c.nome?.charAt(0)}</div>
            <div><div style="font-weight:500">${c.nome}</div></div>
        </div></td>
        <td style="color:var(--text2)">${c.email}</td>
        <td>${c.telefone||'-'}</td>
        <td>${c.nif||c.bi||'-'}</td>
        <td><span class="badge-status badge-progress">${c.total_veiculos||0}</span></td>
        <td style="font-family:'Syne',sans-serif;font-weight:600;color:var(--accent)">${fmt(c.total_gasto)} Kz</td>
        <td><div class="action-btns">
            <button class="abtn edit" onclick='abrirModalCliente(${JSON.stringify(c)})' title="Editar"><i class="fas fa-edit"></i></button>
            <button class="abtn del" onclick="removerCliente(${c.id})" title="Remover"><i class="fas fa-trash"></i></button>
        </div></td>
    </tr>`;
}

async function filtrarClientes(busca) {
    const lista = await API.Clientes.listar(busca).catch(()=>[]);
    const cl = Array.isArray(lista)?lista:[];
    const tbody = document.querySelector('#tabelaClientes tbody');
    if(tbody) tbody.innerHTML = cl.map(c=>linhaCliente(c)).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:20px">Sem resultados</td></tr>';
}

function abrirModalCliente(c=null) {
    document.getElementById('clienteId').value = c?.id||'';
    document.getElementById('clienteNome').value = c?.nome||'';
    document.getElementById('clienteEmail').value = c?.email||'';
    document.getElementById('clienteTelefone').value = c?.telefone||'';
    document.getElementById('clienteNif').value = c?.nif||c?.bi||'';
    document.getElementById('clienteEndereco').value = c?.endereco||'';
    document.getElementById('modalClienteTitle').textContent = c?'Editar Cliente':'Novo Cliente';
    new bootstrap.Modal(document.getElementById('modalCliente')).show();
}

async function salvarCliente() {
    const id = document.getElementById('clienteId').value;
    const dados = {
        nome:document.getElementById('clienteNome').value.trim(),
        email:document.getElementById('clienteEmail').value.trim(),
        telefone:document.getElementById('clienteTelefone').value.trim(),
        nif:document.getElementById('clienteNif').value.trim(),
        bi:document.getElementById('clienteNif').value.trim(),
        endereco:document.getElementById('clienteEndereco').value.trim(),
    };
    try {
        if(id){await API.Clientes.atualizar(id,dados);}else{await API.Clientes.criar(dados);}
        bootstrap.Modal.getInstance(document.getElementById('modalCliente'))?.hide();
        mostrarToast(id?'Cliente actualizado!':'Cliente criado!','success');
        carregarSecao('clientes');
    } catch(err){mostrarToast(err.message,'error');}
}

async function removerCliente(id) {
    if(!confirm('Remover este cliente?')) return;
    try{await API.Clientes.remover(id);mostrarToast('Cliente removido!','success');carregarSecao('clientes');}
    catch(err){mostrarToast(err.message,'error');}
}

// ── VEÍCULOS ──────────────────────────────────────────────
async function secaoVeiculos() {
    const [lista, clientes] = await Promise.all([API.Veiculos.listar().catch(()=>[]), API.Clientes.listar().catch(()=>[])]);
    const ve = Array.isArray(lista)?lista:[];
    const cl = Array.isArray(clientes)?clientes:[];
    return `
    <div class="page-header"><h2>Veículos</h2><p>${ve.length} veículo(s) registado(s)</p></div>
    <div class="data-card full">
        <div class="data-header">
            <div class="data-title"><i class="fas fa-car"></i> Lista de Veículos</div>
            ${usuarioLogado.tipo==='admin'?`<button class="btn-primary-custom" onclick='abrirModalVeiculo(null,${JSON.stringify(cl)})'><i class="fas fa-plus"></i> Novo Veículo</button>`:''}
        </div>
        <table class="data-table">
            <thead><tr><th>Placa</th><th>Modelo</th><th>Marca</th><th>Ano</th><th>Cor</th><th>Cliente</th><th>Status</th>${usuarioLogado.tipo==='admin'?'<th>Ações</th>':''}</tr></thead>
            <tbody>${ve.map(v=>`<tr>
                <td><strong style="color:var(--accent)">${v.placa}</strong></td>
                <td>${v.modelo}</td>
                <td>${v.marca||'-'}</td>
                <td>${v.ano||'-'}</td>
                <td>${v.cor||'-'}</td>
                <td>${v.cliente_nome||'-'}</td>
                <td><span class="badge-status ${v.status==='Em oficina'?'badge-progress':'badge-ok'}">${v.status||'Normal'}</span></td>
                ${usuarioLogado.tipo==='admin'?`<td><div class="action-btns">
                    <button class="abtn edit" onclick='abrirModalVeiculo(${JSON.stringify(v)},${JSON.stringify(cl)})' title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="abtn del" onclick="removerVeiculo(${v.id})" title="Remover"><i class="fas fa-trash"></i></button>
                </div></td>`:''}
            </tr>`).join('')||'<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:20px">Sem veículos</td></tr>'}</tbody>
        </table>
    </div>`;
}

function abrirModalVeiculo(v,clientes) {
    document.getElementById('veiculoId').value = v?.id||'';
    document.getElementById('veiculoPlaca').value = v?.placa||'';
    document.getElementById('veiculoModelo').value = v?.modelo||'';
    document.getElementById('veiculoMarca').value = v?.marca||'';
    document.getElementById('veiculoAno').value = v?.ano||'';
    document.getElementById('veiculoCor').value = v?.cor||'';
    document.getElementById('veiculoCombustivel').value = v?.combustivel||'Gasolina';
    const sel = document.getElementById('veiculoClienteId');
    sel.innerHTML = '<option value="">Selecione o cliente...</option>'+(clientes||[]).map(c=>`<option value="${c.id}" ${v?.cliente_id==c.id?'selected':''}>${c.nome}</option>`).join('');
    document.getElementById('modalVeiculoTitle').textContent = v?'Editar Veículo':'Novo Veículo';
    new bootstrap.Modal(document.getElementById('modalVeiculo')).show();
}

async function salvarVeiculo() {
    const id = document.getElementById('veiculoId').value;
    const dados = {
        cliente_id:document.getElementById('veiculoClienteId').value,
        placa:document.getElementById('veiculoPlaca').value.trim(),
        modelo:document.getElementById('veiculoModelo').value.trim(),
        marca:document.getElementById('veiculoMarca').value.trim(),
        ano:document.getElementById('veiculoAno').value,
        cor:document.getElementById('veiculoCor').value.trim(),
        combustivel:document.getElementById('veiculoCombustivel').value,
    };
    try {
        if(id){await API.Veiculos.atualizar(id,dados);}else{await API.Veiculos.criar(dados);}
        bootstrap.Modal.getInstance(document.getElementById('modalVeiculo'))?.hide();
        mostrarToast(id?'Veículo actualizado!':'Veículo criado!','success');
        carregarSecao('veiculos');
    } catch(err){mostrarToast(err.message,'error');}
}

async function removerVeiculo(id) {
    if(!confirm('Remover este veículo?')) return;
    try{await API.Veiculos.remover(id);mostrarToast('Veículo removido!','success');carregarSecao('veiculos');}
    catch(err){mostrarToast(err.message,'error');}
}

// ── FUNCIONÁRIOS ──────────────────────────────────────────
async function secaoFuncionarios() {
    const lista = await API.Funcionarios.listar().catch(()=>[]);
    const fu = Array.isArray(lista)?lista:[];
    return `
    <div class="page-header"><h2>Funcionários</h2><p>${fu.length} funcionário(s)</p></div>
    <div class="data-card full">
        <div class="data-header">
            <div class="data-title"><i class="fas fa-hard-hat"></i> Equipa</div>
            <button class="btn-primary-custom" onclick="abrirModalFuncionario()"><i class="fas fa-plus"></i> Novo Funcionário</button>
        </div>
        <table class="data-table">
            <thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Especialidade</th><th>Ordens</th><th>Salário (Kz)</th><th>Ações</th></tr></thead>
            <tbody>${fu.map(f=>`<tr>
                <td><div style="display:flex;align-items:center;gap:10px">
                    <div class="av" style="background:linear-gradient(135deg,var(--orange),#f59e0b)">${f.nome?.charAt(0)}</div>
                    <strong>${f.nome}</strong>
                </div></td>
                <td style="color:var(--text2)">${f.email}</td>
                <td>${f.telefone||'-'}</td>
                <td><span class="badge-status badge-func">${f.especialidade||f.cargo||'-'}</span></td>
                <td>${f.total_ordens||f.ordens_mes||0}</td>
                <td style="font-family:'Syne',sans-serif;font-weight:600;color:var(--green)">${fmt(f.salario)}</td>
                <td><div class="action-btns">
                    <button class="abtn edit" onclick='abrirModalFuncionario(${JSON.stringify(f)})' title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="abtn del" onclick="removerFuncionario(${f.id})" title="Remover"><i class="fas fa-trash"></i></button>
                </div></td>
            </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:20px">Sem funcionários</td></tr>'}</tbody>
        </table>
    </div>`;
}

function abrirModalFuncionario(f=null) {
    document.getElementById('funcionarioId').value = f?.id||'';
    document.getElementById('funcionarioNome').value = f?.nome||'';
    document.getElementById('funcionarioEmail').value = f?.email||'';
    document.getElementById('funcionarioTelefone').value = f?.telefone||'';
    document.getElementById('funcionarioEspecialidade').value = f?.especialidade||f?.cargo||'';
    document.getElementById('funcionarioSalario').value = f?.salario||'';
    document.getElementById('modalFuncionarioTitle').textContent = f?'Editar Funcionário':'Novo Funcionário';
    new bootstrap.Modal(document.getElementById('modalFuncionario')).show();
}

async function salvarFuncionario() {
    const id = document.getElementById('funcionarioId').value;
    const dados = {
        nome:document.getElementById('funcionarioNome').value.trim(),
        email:document.getElementById('funcionarioEmail').value.trim(),
        telefone:document.getElementById('funcionarioTelefone').value.trim(),
        especialidade:document.getElementById('funcionarioEspecialidade').value.trim(),
        cargo:document.getElementById('funcionarioEspecialidade').value.trim(),
        salario:document.getElementById('funcionarioSalario').value,
    };
    try {
        if(id){await API.Funcionarios.atualizar(id,dados);}else{await API.Funcionarios.criar(dados);}
        bootstrap.Modal.getInstance(document.getElementById('modalFuncionario'))?.hide();
        mostrarToast(id?'Funcionário actualizado!':'Funcionário criado!','success');
        carregarSecao('funcionarios');
    } catch(err){mostrarToast(err.message,'error');}
}

async function removerFuncionario(id) {
    if(!confirm('Remover este funcionário?')) return;
    try{await API.Funcionarios.remover(id);mostrarToast('Funcionário removido!','success');carregarSecao('funcionarios');}
    catch(err){mostrarToast(err.message,'error');}
}

// ── ORDENS ────────────────────────────────────────────────
async function secaoOrdens(filtros={}) {
    const [lista, clientes, funcionarios] = await Promise.all([
        API.Ordens.listar(filtros).catch(()=>[]),
        API.Clientes.listar().catch(()=>[]),
        API.Funcionarios.listar().catch(()=>[])
    ]);
    const or = Array.isArray(lista)?lista:[];
    const cl = Array.isArray(clientes)?clientes:[];
    const fu = Array.isArray(funcionarios)?funcionarios:[];
    return `
    <div class="page-header"><h2>Ordens de Serviço</h2><p>${or.length} ordem(ns)</p></div>
    <div class="data-card full">
        <div class="data-header">
            <div class="data-title"><i class="fas fa-clipboard-list"></i> Lista de Ordens</div>
            ${usuarioLogado.tipo==='admin'?`<button class="btn-primary-custom" onclick='abrirModalOrdem(null,${JSON.stringify(cl)},${JSON.stringify(fu)})'><i class="fas fa-plus"></i> Nova OS</button>`:''}
        </div>
        <div style="padding:12px 20px;border-bottom:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap">
            ${['','pending','progress','completed','cancelled'].map(s=>`<button class="btn-sm-custom ${filtros.status===s&&s?'active':''}" onclick="secaoOrdens({status:'${s}'}).then(h=>{document.getElementById('pg').innerHTML=h})">${{'':"Todos",'pending':'Pendentes','progress':'Em Andamento','completed':'Concluídas','cancelled':'Canceladas'}[s]}</button>`).join('')}
        </div>
        <table class="data-table">
            <thead><tr><th>Código</th><th>Cliente</th><th>Veículo</th><th>Funcionário</th><th>Status</th><th>Valor</th><th>Data</th><th>Ações</th></tr></thead>
            <tbody>${or.map(o=>`<tr>
                <td><strong style="color:var(--accent)">${o.codigo||o.id}</strong></td>
                <td>${o.cliente_nome||'-'}</td>
                <td>${o.veiculo_modelo||o.veiculo||'-'} <span style="color:var(--text3);font-size:11px">${o.placa||''}</span></td>
                <td>${o.funcionario_nome||'<span style="color:var(--text3)">—</span>'}</td>
                <td>${badgeStatus(o.status)}</td>
                <td style="font-family:'Syne',sans-serif;font-weight:600;color:var(--accent)">${fmt(o.valor_total)} Kz</td>
                <td style="color:var(--text3)">${o.data_entrada||o.data||'-'}</td>
                <td><div class="action-btns">
                    <button class="abtn view" onclick="verOrdem(${o.id})" title="Ver detalhes"><i class="fas fa-eye"></i></button>
                    ${usuarioLogado.tipo==='admin'?`
                    <button class="abtn edit" onclick='abrirModalOrdem(${JSON.stringify(o)},${JSON.stringify(cl)},${JSON.stringify(fu)})' title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="abtn del" onclick="cancelarOrdem(${o.id})" title="Cancelar"><i class="fas fa-times"></i></button>`:''}
                </div></td>
            </tr>`).join('')||'<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:20px">Sem ordens</td></tr>'}</tbody>
        </table>
    </div>`;
}

async function verOrdem(id) {
    try {
        const os = await API.Ordens.buscar(id);
        const o = os?.ordem||os;
        document.getElementById('modalVerOSBody').innerHTML = `
        <div style="padding:8px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
                <div>
                    <p style="font-size:12px;color:var(--text3);margin-bottom:4px">CÓDIGO</p>
                    <p style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--accent)">${o.codigo}</p>
                </div>
                <div>
                    <p style="font-size:12px;color:var(--text3);margin-bottom:4px">STATUS</p>
                    <p>${badgeStatus(o.status)}</p>
                </div>
                <div><p style="font-size:12px;color:var(--text3);margin-bottom:2px">CLIENTE</p><p style="font-weight:500">${o.cliente_nome||'-'}</p></div>
                <div><p style="font-size:12px;color:var(--text3);margin-bottom:2px">VEÍCULO</p><p style="font-weight:500">${o.veiculo_modelo||'-'} — ${o.placa||''}</p></div>
                <div><p style="font-size:12px;color:var(--text3);margin-bottom:2px">FUNCIONÁRIO</p><p>${o.funcionario_nome||'—'}</p></div>
                <div><p style="font-size:12px;color:var(--text3);margin-bottom:2px">DATA</p><p>${o.data_entrada||'-'}</p></div>
            </div>
            ${o.observacoes?`<div style="background:var(--bg3);padding:12px;border-radius:10px;margin-bottom:16px;font-size:13px;color:var(--text2)">${o.observacoes}</div>`:''}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
                <div>
                    <p style="font-size:13px;font-weight:600;margin-bottom:8px">Serviços</p>
                    ${(o.servicos||[]).map(s=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px"><span>${s.nome}</span><span style="color:var(--accent);font-weight:600">${fmt(s.valor)} Kz</span></div>`).join('')||'<p style="color:var(--text3);font-size:13px">Nenhum</p>'}
                </div>
                <div>
                    <p style="font-size:13px;font-weight:600;margin-bottom:8px">Peças</p>
                    ${(o.pecas||[]).map(p=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px"><span>${p.nome} (${p.quantidade}x)</span><span style="color:var(--accent);font-weight:600">${fmt(p.valor_total)} Kz</span></div>`).join('')||'<p style="color:var(--text3);font-size:13px">Nenhuma</p>'}
                </div>
            </div>
            <div style="text-align:right;padding-top:12px;border-top:1px solid var(--border)">
                <p style="font-size:12px;color:var(--text3)">TOTAL</p>
                <p style="font-family:'Syne',sans-serif;font-size:24px;font-weight:700;color:var(--accent)">${fmt(o.valor_total)} Kz</p>
            </div>
            ${usuarioLogado.tipo==='admin'?`<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
                <button class="btn-sm-custom" onclick="updateStatus(${o.id},'progress')">Em Andamento</button>
                <button class="btn-sm-custom" style="color:var(--green);border-color:rgba(16,185,129,0.3)" onclick="updateStatus(${o.id},'completed')">Concluir</button>
                <button class="btn-sm-custom" style="color:var(--red);border-color:rgba(239,68,68,0.3)" onclick="updateStatus(${o.id},'cancelled')">Cancelar</button>
            </div>`:''}
        </div>`;
        new bootstrap.Modal(document.getElementById('modalVerOS')).show();
    } catch(err){mostrarToast(err.message,'error');}
}

async function updateStatus(id,status) {
    try{
        await API.Ordens.atualizar(id,{status});
        bootstrap.Modal.getInstance(document.getElementById('modalVerOS'))?.hide();
        mostrarToast('Status actualizado!','success');
        carregarSecao('ordens');
    }catch(err){mostrarToast(err.message,'error');}
}

function abrirModalOrdem(os,clientes,funcionarios) {
    document.getElementById('modalOrdemTitle').textContent = os?'Editar OS':'Nova Ordem de Serviço';
    document.getElementById('modalOrdemBody').innerHTML = `
    <input type="hidden" id="osId" value="${os?.id||''}">
    <div class="row g-3">
        <div class="col-md-6">
            <label class="form-label">Cliente *</label>
            <select id="osClienteId" class="form-select" onchange="carregarVeiculosOS(this.value)">
                <option value="">Selecione...</option>
                ${(clientes||[]).map(c=>`<option value="${c.id}" ${os?.cliente_id==c.id?'selected':''}>${c.nome}</option>`).join('')}
            </select>
        </div>
        <div class="col-md-6">
            <label class="form-label">Veículo *</label>
            <select id="osVeiculoId" class="form-select">
                <option value="">Selecione o cliente primeiro</option>
                ${os?`<option value="${os.veiculo_id}" selected>${os.veiculo_modelo} — ${os.placa}</option>`:''}
            </select>
        </div>
        <div class="col-md-6">
            <label class="form-label">Funcionário</label>
            <select id="osFuncionarioId" class="form-select">
                <option value="">Nenhum</option>
                ${(funcionarios||[]).map(f=>`<option value="${f.id}" ${os?.funcionario_id==f.id?'selected':''}>${f.nome}</option>`).join('')}
            </select>
        </div>
        <div class="col-md-6">
            <label class="form-label">Status</label>
            <select id="osStatus" class="form-select">
                <option value="pending" ${os?.status==='pending'?'selected':''}>Pendente</option>
                <option value="progress" ${os?.status==='progress'?'selected':''}>Em Andamento</option>
                <option value="completed" ${os?.status==='completed'?'selected':''}>Concluída</option>
            </select>
        </div>
        <div class="col-12">
            <label class="form-label">Observações</label>
            <textarea id="osObservacoes" class="form-control" rows="2">${os?.observacoes||''}</textarea>
        </div>
    </div>
    <hr style="border-color:var(--border);margin:20px 0">
    <div class="row g-3">
        <div class="col-md-6">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <label class="form-label" style="margin:0">Serviços</label>
                <button class="btn-sm-custom" onclick="addServico()"><i class="fas fa-plus"></i> Adicionar</button>
            </div>
            <div id="servicosOS"></div>
        </div>
        <div class="col-md-6">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <label class="form-label" style="margin:0">Peças</label>
                <button class="btn-sm-custom" onclick="addPeca()"><i class="fas fa-plus"></i> Adicionar</button>
            </div>
            <div id="pecasOS"></div>
        </div>
    </div>
    <div style="text-align:right;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
        <span style="color:var(--text3);font-size:13px">Total estimado: </span>
        <span style="font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:var(--accent)" id="totalOS">0 Kz</span>
    </div>`;
    addServico(); addPeca();
    new bootstrap.Modal(document.getElementById('modalOrdem')).show();
}

async function carregarVeiculosOS(cliId) {
    const sel = document.getElementById('osVeiculoId');
    if(!cliId){sel.innerHTML='<option value="">Selecione o cliente primeiro</option>';return;}
    try {
        const lista = await API.Veiculos.porCliente(cliId).catch(()=>[]);
        const ve = Array.isArray(lista)?lista:[];
        sel.innerHTML = '<option value="">Selecione...</option>'+ve.map(v=>`<option value="${v.id}">${v.modelo} — ${v.placa}</option>`).join('');
    }catch(_){}
}

function addServico(nome='',valor='') {
    const div = document.createElement('div');
    div.className='row g-1 mb-2 srv-row';
    div.innerHTML=`<div class="col-7"><input type="text" class="form-control form-control-sm srv-nome" placeholder="Serviço" value="${nome}" oninput="calcTotal()"></div><div class="col-4"><input type="number" class="form-control form-control-sm srv-val" placeholder="Kz" value="${valor}" oninput="calcTotal()"></div><div class="col-1"><button class="abtn del" onclick="this.closest('.srv-row').remove();calcTotal()" style="width:100%;height:32px;border-radius:6px"><i class="fas fa-times"></i></button></div>`;
    document.getElementById('servicosOS').appendChild(div);
}

function addPeca(nome='',qtd='',val='') {
    const div = document.createElement('div');
    div.className='row g-1 mb-2 pec-row';
    div.innerHTML=`<div class="col-5"><input type="text" class="form-control form-control-sm pec-nome" placeholder="Peça" value="${nome}" oninput="calcTotal()"></div><div class="col-3"><input type="number" class="form-control form-control-sm pec-qtd" placeholder="Qtd" value="${qtd||1}" oninput="calcTotal()"></div><div class="col-3"><input type="number" class="form-control form-control-sm pec-val" placeholder="Kz" value="${val}" oninput="calcTotal()"></div><div class="col-1"><button class="abtn del" onclick="this.closest('.pec-row').remove();calcTotal()" style="width:100%;height:32px;border-radius:6px"><i class="fas fa-times"></i></button></div>`;
    document.getElementById('pecasOS').appendChild(div);
}

function calcTotal() {
    let t=0;
    document.querySelectorAll('.srv-val').forEach(i=>t+=parseFloat(i.value)||0);
    document.querySelectorAll('.pec-row').forEach(r=>{const q=parseFloat(r.querySelector('.pec-qtd')?.value)||0;const v=parseFloat(r.querySelector('.pec-val')?.value)||0;t+=q*v;});
    const el=document.getElementById('totalOS');
    if(el) el.textContent=fmt(t)+' Kz';
}

async function salvarOrdem() {
    const id=document.getElementById('osId')?.value;
    const dados={
        cliente_id:document.getElementById('osClienteId')?.value,
        veiculo_id:document.getElementById('osVeiculoId')?.value,
        funcionario_id:document.getElementById('osFuncionarioId')?.value||null,
        status:document.getElementById('osStatus')?.value||'pending',
        observacoes:document.getElementById('osObservacoes')?.value||'',
        servicos:[...document.querySelectorAll('.srv-row')].map(r=>({nome:r.querySelector('.srv-nome')?.value?.trim(),valor:parseFloat(r.querySelector('.srv-val')?.value)||0})).filter(s=>s.nome),
        pecas:[...document.querySelectorAll('.pec-row')].map(r=>({nome:r.querySelector('.pec-nome')?.value?.trim(),quantidade:parseInt(r.querySelector('.pec-qtd')?.value)||1,valor_unitario:parseFloat(r.querySelector('.pec-val')?.value)||0})).filter(p=>p.nome),
    };
    try{
        if(id){await API.Ordens.atualizar(id,dados);}else{await API.Ordens.criar(dados);}
        bootstrap.Modal.getInstance(document.getElementById('modalOrdem'))?.hide();
        mostrarToast(id?'OS actualizada!':'OS criada!','success');
        carregarSecao('ordens');
    }catch(err){mostrarToast(err.message,'error');}
}

async function cancelarOrdem(id) {
    if(!confirm('Cancelar esta OS?')) return;
    try{await API.Ordens.cancelar(id);mostrarToast('OS cancelada!','success');carregarSecao('ordens');}
    catch(err){mostrarToast(err.message,'error');}
}

// ── ESTOQUE ───────────────────────────────────────────────
async function secaoEstoque() {
    const lista = await API.Produtos.listar().catch(()=>[]);
    const pr = Array.isArray(lista)?lista:[];
    const low = pr.filter(p=>p.quantidade<=p.quantidade_minima).length;
    return `
    <div class="page-header"><h2>Estoque</h2><p>${pr.length} produto(s) · ${low} com estoque baixo</p></div>
    <div class="data-card full">
        <div class="data-header">
            <div class="data-title"><i class="fas fa-boxes"></i> Produtos em Stock</div>
            <button class="btn-primary-custom" onclick="abrirModalProduto()"><i class="fas fa-plus"></i> Novo Produto</button>
        </div>
        <table class="data-table">
            <thead><tr><th>Produto</th><th>Categoria</th><th>Stock</th><th>Mínimo</th><th>Preço (Kz)</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>${pr.map(p=>{
                const pct=Math.min(100,(p.quantidade/(p.quantidade_minima*2||1))*100);
                const low=p.quantidade<=p.quantidade_minima;
                return `<tr>
                    <td><strong>${p.nome}</strong></td>
                    <td><span class="badge-status badge-func">${p.categoria||'-'}</span></td>
                    <td>
                        <div class="stock-indicator">
                            <strong style="color:${low?'var(--red)':'var(--text)'}">${p.quantidade}</strong>
                            <div class="stock-bar"><div class="stock-fill" style="width:${pct}%;background:${low?'var(--red)':'var(--green)'}"></div></div>
                        </div>
                    </td>
                    <td style="color:var(--text3)">${p.quantidade_minima}</td>
                    <td style="font-family:'Syne',sans-serif;font-weight:600">${fmt(p.preco)}</td>
                    <td><span class="badge-status ${low?'badge-cancelled':'badge-ok'}">${low?'Estoque Baixo':'OK'}</span></td>
                    <td><div class="action-btns">
                        <button class="abtn plus" onclick='abrirAjusteEstoque(${JSON.stringify(p)})' title="Ajustar stock"><i class="fas fa-plus-minus"></i></button>
                        <button class="abtn edit" onclick='abrirModalProduto(${JSON.stringify(p)})' title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="abtn del" onclick="removerProduto(${p.id})" title="Remover"><i class="fas fa-trash"></i></button>
                    </div></td>
                </tr>`;
            }).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:20px">Sem produtos</td></tr>'}</tbody>
        </table>
    </div>
    <!-- Modal Ajuste -->
    <div class="modal fade" id="modalAjuste" tabindex="-1">
        <div class="modal-dialog"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Ajustar Estoque — <span id="ajusteNome"></span></h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <input type="hidden" id="ajusteId">
                <div class="mb-3"><label class="form-label">Quantidade (positivo=entrada, negativo=saída)</label><input type="number" id="ajusteQtd" class="form-control" placeholder="Ex: 10 ou -5"></div>
                <div class="mb-3"><label class="form-label">Motivo</label><input type="text" id="ajusteMotivo" class="form-control" placeholder="Ex: Compra de fornecedor"></div>
            </div>
            <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button class="btn-primary-custom" onclick="confirmarAjuste()"><i class="fas fa-check"></i> Confirmar</button></div>
        </div></div>
    </div>`;
}

function abrirModalProduto(p=null) {
    document.getElementById('produtoId').value=p?.id||'';
    document.getElementById('produtoNome').value=p?.nome||'';
    document.getElementById('produtoCategoria').value=p?.categoria||'';
    document.getElementById('produtoQuantidade').value=p?.quantidade||0;
    document.getElementById('produtoMinimo').value=p?.quantidade_minima||5;
    document.getElementById('produtoPreco').value=p?.preco||0;
    document.getElementById('modalProdutoTitle').textContent=p?'Editar Produto':'Novo Produto';
    new bootstrap.Modal(document.getElementById('modalProduto')).show();
}

async function salvarProduto() {
    const id=document.getElementById('produtoId').value;
    const dados={nome:document.getElementById('produtoNome').value.trim(),categoria:document.getElementById('produtoCategoria').value,quantidade:document.getElementById('produtoQuantidade').value,quantidade_minima:document.getElementById('produtoMinimo').value,preco:document.getElementById('produtoPreco').value};
    try{
        if(id){await API.Produtos.atualizar(id,dados);}else{await API.Produtos.criar(dados);}
        bootstrap.Modal.getInstance(document.getElementById('modalProduto'))?.hide();
        mostrarToast(id?'Produto actualizado!':'Produto criado!','success');
        carregarSecao('estoque');
    }catch(err){mostrarToast(err.message,'error');}
}

function abrirAjusteEstoque(p) {
    document.getElementById('ajusteId').value=p.id;
    document.getElementById('ajusteNome').textContent=p.nome;
    document.getElementById('ajusteQtd').value='';
    document.getElementById('ajusteMotivo').value='';
    new bootstrap.Modal(document.getElementById('modalAjuste')).show();
}

async function confirmarAjuste() {
    const id=document.getElementById('ajusteId').value;
    const qtd=parseInt(document.getElementById('ajusteQtd').value);
    const motivo=document.getElementById('ajusteMotivo').value.trim();
    if(isNaN(qtd)||qtd===0){mostrarToast('Informe uma quantidade válida!','error');return;}
    try{
        await API.Produtos.ajustar(id,qtd,motivo);
        bootstrap.Modal.getInstance(document.getElementById('modalAjuste'))?.hide();
        mostrarToast('Estoque ajustado!','success');
        carregarSecao('estoque');
    }catch(err){mostrarToast(err.message,'error');}
}

async function removerProduto(id) {
    if(!confirm('Remover este produto?')) return;
    try{await API.Produtos.remover(id);mostrarToast('Produto removido!','success');carregarSecao('estoque');}
    catch(err){mostrarToast(err.message,'error');}
}

// ── USUÁRIOS ──────────────────────────────────────────────
async function secaoUsuarios() {
    const lista = await API.Usuarios.listar().catch(()=>[]);
    const us = Array.isArray(lista)?lista:[];
    const colors=['linear-gradient(135deg,var(--accent),var(--accent2))','linear-gradient(135deg,var(--orange),#fbbf24)','linear-gradient(135deg,var(--green),#34d399)','linear-gradient(135deg,var(--accent3),#a78bfa)'];
    return `
    <div class="page-header"><h2>Usuários</h2><p>${us.length} utilizador(es)</p></div>
    <div class="data-card full">
        <div class="data-header">
            <div class="data-title"><i class="fas fa-user-cog"></i> Gestão de Utilizadores</div>
            <button class="btn-primary-custom" onclick="abrirModalUsuario()"><i class="fas fa-plus"></i> Novo Usuário</button>
        </div>
        <table class="data-table">
            <thead><tr><th>Utilizador</th><th>Email</th><th>Tipo</th><th>Estado</th><th>Criado em</th><th>Ações</th></tr></thead>
            <tbody>${us.map((u,i)=>`<tr>
                <td><div style="display:flex;align-items:center;gap:10px">
                    <div class="av" style="background:${colors[i%4]}">${u.avatar||u.nome?.charAt(0)}</div>
                    <strong>${u.nome}</strong>
                </div></td>
                <td style="color:var(--text2)">${u.email}</td>
                <td><span class="badge-status ${u.tipo==='admin'?'badge-admin':u.tipo==='funcionario'?'badge-func':'badge-cli'}">${u.tipo}</span></td>
                <td><span class="badge-status ${u.ativo?'badge-ok':'badge-cancelled'}">${u.ativo?'Activo':'Inactivo'}</span></td>
                <td style="color:var(--text3)">${u.criado_em?.substring(0,10)||'-'}</td>
                <td><div class="action-btns">
                    <button class="abtn edit" onclick='abrirModalUsuario(${JSON.stringify(u)})' title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="abtn del" onclick="removerUsuario(${u.id})" title="Desactivar"><i class="fas fa-ban"></i></button>
                </div></td>
            </tr>`).join('')}</tbody>
        </table>
    </div>
    <!-- Modal Usuário -->
    <div class="modal fade" id="modalUsuario" tabindex="-1">
        <div class="modal-dialog"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title" id="modalUsuarioTitle">Novo Usuário</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <input type="hidden" id="usuarioId">
                <div class="row g-3">
                    <div class="col-md-6"><label class="form-label">Nome *</label><input type="text" id="usuarioNome" class="form-control"></div>
                    <div class="col-md-6"><label class="form-label">Email *</label><input type="email" id="usuarioEmail" class="form-control"></div>
                    <div class="col-md-6"><label class="form-label">Senha</label><input type="password" id="usuarioSenha" class="form-control" placeholder="Deixe vazio para não alterar"></div>
                    <div class="col-md-6"><label class="form-label">Tipo</label><select id="usuarioTipo" class="form-select"><option value="cliente">Cliente</option><option value="funcionario">Funcionário</option><option value="admin">Admin</option></select></div>
                </div>
            </div>
            <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button class="btn-primary-custom" onclick="salvarUsuario()"><i class="fas fa-save"></i> Salvar</button></div>
        </div></div>
    </div>`;
}

function abrirModalUsuario(u=null) {
    document.getElementById('usuarioId').value=u?.id||'';
    document.getElementById('usuarioNome').value=u?.nome||'';
    document.getElementById('usuarioEmail').value=u?.email||'';
    document.getElementById('usuarioSenha').value='';
    document.getElementById('usuarioTipo').value=u?.tipo||'cliente';
    document.getElementById('modalUsuarioTitle').textContent=u?'Editar Usuário':'Novo Usuário';
    new bootstrap.Modal(document.getElementById('modalUsuario')).show();
}

async function salvarUsuario() {
    const id=document.getElementById('usuarioId').value;
    const dados={nome:document.getElementById('usuarioNome').value.trim(),email:document.getElementById('usuarioEmail').value.trim(),senha:document.getElementById('usuarioSenha').value.trim(),tipo:document.getElementById('usuarioTipo').value};
    try{
        if(id){await API.Usuarios.atualizar(id,dados);}else{await API.Usuarios.criar(dados);}
        bootstrap.Modal.getInstance(document.getElementById('modalUsuario'))?.hide();
        mostrarToast(id?'Usuário actualizado!':'Usuário criado!','success');
        carregarSecao('usuarios');
    }catch(err){mostrarToast(err.message,'error');}
}

async function removerUsuario(id) {
    if(!confirm('Desactivar este usuário?')) return;
    try{await API.Usuarios.remover(id);mostrarToast('Usuário desactivado!','success');carregarSecao('usuarios');}
    catch(err){mostrarToast(err.message,'error');}
}

// ── NOTIF COUNT ───────────────────────────────────────────
async function carregarNotifCount() {
    try {
        const alertas = await API.Produtos.alertas().catch(()=>[]);
        const total = Array.isArray(alertas)?alertas.length:0;
        const dot = document.getElementById('notifDot');
        if(dot) dot.style.display = total>0?'block':'none';
    }catch(_){}
}

// ── EXPORTS ───────────────────────────────────────────────
window.navegar=navegar;
window.carregarSecao=carregarSecao;
window.abrirModalCliente=abrirModalCliente;
window.salvarCliente=salvarCliente;
window.removerCliente=removerCliente;
window.filtrarClientes=filtrarClientes;
window.abrirModalVeiculo=abrirModalVeiculo;
window.salvarVeiculo=salvarVeiculo;
window.removerVeiculo=removerVeiculo;
window.carregarVeiculosOS=carregarVeiculosOS;
window.abrirModalFuncionario=abrirModalFuncionario;
window.salvarFuncionario=salvarFuncionario;
window.removerFuncionario=removerFuncionario;
window.verOrdem=verOrdem;
window.updateStatus=updateStatus;
window.abrirModalOrdem=abrirModalOrdem;
window.salvarOrdem=salvarOrdem;
window.cancelarOrdem=cancelarOrdem;
window.addServico=addServico;
window.addPeca=addPeca;
window.calcTotal=calcTotal;
window.abrirModalProduto=abrirModalProduto;
window.salvarProduto=salvarProduto;
window.removerProduto=removerProduto;
window.abrirAjusteEstoque=abrirAjusteEstoque;
window.confirmarAjuste=confirmarAjuste;
window.abrirModalUsuario=abrirModalUsuario;
window.salvarUsuario=salvarUsuario;
window.removerUsuario=removerUsuario;
window.secaoOrdens=secaoOrdens;

// ══════════════════════════════════════════════════════════════
// PAGAMENTOS
// ══════════════════════════════════════════════════════════════
async function secaoPagamentos() {
    const [pags, ordens] = await Promise.all([
        API.Pagamentos.listar().catch(() => []),
        API.Ordens.listar({status:'progress'}).catch(() => [])
    ]);
    const lista = Array.isArray(pags) ? pags : [];
    const ordensAbertas = Array.isArray(ordens) ? ordens : [];

    const totalPago   = lista.filter(p=>p.status==='pago').reduce((s,p)=>s+(parseFloat(p.valor)||0),0);
    const totalPend   = lista.filter(p=>p.status==='pendente').length;

    return `
    <div class="fade-in">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
            <div><h4 style="font-family:'Syne',sans-serif;font-weight:800">Pagamentos</h4><p style="color:var(--text-muted);font-size:13px">Registe e gira pagamentos das ordens</p></div>
            <button class="btn-p" onclick="abrirModalPagamento()"><i class="fas fa-plus"></i> Novo Pagamento</button>
        </div>

        <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
            <div class="kpi" style="--c:var(--success)"><div class="kpi-ico" style="background:rgba(16,185,129,.1);color:var(--success)"><i class="fas fa-check-circle"></i></div><div class="kpi-val">${fmt(totalPago)} Kz</div><div class="kpi-lbl">Total Recebido</div></div>
            <div class="kpi"><div class="kpi-ico"><i class="fas fa-clock"></i></div><div class="kpi-val">${totalPend}</div><div class="kpi-lbl">Pagamentos Pendentes</div></div>
            <div class="kpi"><div class="kpi-ico"><i class="fas fa-file-invoice"></i></div><div class="kpi-val">${lista.length}</div><div class="kpi-lbl">Total de Transacções</div></div>
        </div>

        <div class="tcard">
            <div class="card-hdr"><span class="card-ttl"><i class="fas fa-history" style="color:var(--accent);margin-right:8px"></i>Histórico de Pagamentos</span></div>
            <table class="dtable">
                <thead><tr><th>#</th><th>OS</th><th>Cliente</th><th>Valor</th><th>Método</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                    ${lista.length ? lista.map(p => `<tr>
                        <td style="color:var(--text-muted);font-size:11px">#${p.id}</td>
                        <td><strong style="color:var(--accent)">${p.os_codigo||'-'}</strong></td>
                        <td>${p.cliente_nome||'-'}</td>
                        <td><strong>${fmt(p.valor)} Kz</strong></td>
                        <td><span style="background:rgba(99,102,241,.08);color:var(--accent);padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;text-transform:capitalize">${p.metodo}</span></td>
                        <td style="color:var(--text-muted)">${p.data_pagamento||'-'}</td>
                        <td>${p.status==='pago'?'<span class="bs bs-c">Pago</span>':'<span class="bs bs-p">Pendente</span>'}</td>
                        <td>
                            <button class="bi-btn bi-v" onclick="verFaturaPorOS(${p.ordem_id})" title="Ver Fatura"><i class="fas fa-file-invoice"></i></button>
                        </td>
                    </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">Nenhum pagamento registado</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>

    <!-- Modal Pagamento -->
    <div class="modal fade" id="modalPagamento" tabindex="-1">
        <div class="modal-dialog"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title"><i class="fas fa-credit-card" style="color:var(--success);margin-right:8px"></i>Registar Pagamento</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <div class="mb-3"><label class="form-label">Ordem de Serviço *</label>
                    <select class="form-select" id="pagOrdemId" onchange="carregarValorOS(this.value)">
                        <option value="">Selecione a OS...</option>
                        ${ordensAbertas.map(o=>`<option value="${o.id}" data-valor="${o.valor_total}" data-cliente="${o.cliente_id}">${o.codigo} — ${o.cliente_nome} (${fmt(o.valor_total)} Kz)</option>`).join('')}
                    </select>
                </div>
                <div class="mb-3"><label class="form-label">Valor (Kz) *</label>
                    <input type="number" class="form-control" id="pagValor" placeholder="0.00" min="0" step="0.01"></div>
                <div class="mb-3"><label class="form-label">Método de Pagamento</label>
                    <select class="form-select" id="pagMetodo">
                        <option value="dinheiro">💵 Dinheiro</option>
                        <option value="transferencia">🏦 Transferência Bancária</option>
                        <option value="cartao">💳 Cartão</option>
                        <option value="mpesa">📱 M-Pesa</option>
                        <option value="cheque">📝 Cheque</option>
                    </select>
                </div>
                <div class="mb-3"><label class="form-label">Referência / Comprovativo</label>
                    <input type="text" class="form-control" id="pagReferencia" placeholder="Nº de referência ou comprovativo"></div>
                <div class="mb-3"><label class="form-label">Notas</label>
                    <textarea class="form-control" id="pagNotas" rows="2" placeholder="Observações..."></textarea></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
                <button class="btn-p" onclick="salvarPagamento()"><i class="fas fa-check"></i> Confirmar Pagamento</button>
            </div>
        </div></div>
    </div>`;
}

function abrirModalPagamento() { new bootstrap.Modal(document.getElementById('modalPagamento')).show(); }
window.abrirModalPagamento = abrirModalPagamento;

function carregarValorOS(ordemId) {
    const sel = document.getElementById('pagOrdemId');
    const opt = sel.options[sel.selectedIndex];
    const valor = opt.getAttribute('data-valor');
    if (valor) document.getElementById('pagValor').value = valor;
}
window.carregarValorOS = carregarValorOS;

async function salvarPagamento() {
    const ordemId = document.getElementById('pagOrdemId').value;
    const valor   = parseFloat(document.getElementById('pagValor').value);
    if (!ordemId || !valor) { toast('Selecione a OS e informe o valor!', 'error'); return; }

    const sel = document.getElementById('pagOrdemId');
    const opt = sel.options[sel.selectedIndex];
    const clienteId = opt.getAttribute('data-cliente');

    try {
        const resp = await API.Pagamentos.criar({
            ordem_id:       parseInt(ordemId),
            cliente_id:     parseInt(clienteId),
            valor,
            metodo:         document.getElementById('pagMetodo').value,
            referencia:     document.getElementById('pagReferencia').value,
            notas:          document.getElementById('pagNotas').value,
            data_pagamento: new Date().toISOString().split('T')[0]
        });
        bootstrap.Modal.getInstance(document.getElementById('modalPagamento'))?.hide();
        toast(`✅ Pagamento registado! Fatura: ${resp.fatura}`, 'success');
        setTimeout(() => ir('faturas', null), 1200);
    } catch (e) { toast(e.message, 'error'); }
}
window.salvarPagamento = salvarPagamento;

async function verFaturaPorOS(ordemId) {
    try {
        const fats = await API.Faturas.listar();
        const lista = Array.isArray(fats) ? fats : [];
        const fat   = lista.find(f => f.ordem_id == ordemId);
        if (fat) mostrarModalFatura(fat.id);
        else toast('Fatura não encontrada para esta OS', 'warning');
    } catch (e) { toast(e.message, 'error'); }
}
window.verFaturaPorOS = verFaturaPorOS;

// ══════════════════════════════════════════════════════════════
// FATURAS
// ══════════════════════════════════════════════════════════════
async function secaoFaturas() {
    const fats = await API.Faturas.listar().catch(() => []);
    const lista = Array.isArray(fats) ? fats : [];
    const totalFaturado = lista.filter(f=>f.status==='paga').reduce((s,f)=>s+(parseFloat(f.valor_total)||0),0);

    return `
    <div class="fade-in">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
            <div><h4 style="font-family:'Syne',sans-serif;font-weight:800">Faturas</h4><p style="color:var(--text-muted);font-size:13px">Visualize e imprima faturas das ordens</p></div>
        </div>

        <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
            <div class="kpi"><div class="kpi-ico"><i class="fas fa-file-invoice-dollar"></i></div><div class="kpi-val">${lista.length}</div><div class="kpi-lbl">Total de Faturas</div></div>
            <div class="kpi"><div class="kpi-ico" style="background:rgba(16,185,129,.1);color:var(--success)"><i class="fas fa-check-double"></i></div><div class="kpi-val">${lista.filter(f=>f.status==='paga').length}</div><div class="kpi-lbl">Faturas Pagas</div></div>
            <div class="kpi"><div class="kpi-ico" style="background:rgba(99,102,241,.1);color:var(--accent)"><i class="fas fa-coins"></i></div><div class="kpi-val" style="font-size:18px">${fmt(totalFaturado)} Kz</div><div class="kpi-lbl">Total Faturado</div></div>
        </div>

        <div class="tcard">
            <div class="card-hdr"><span class="card-ttl"><i class="fas fa-file-invoice" style="color:var(--accent);margin-right:8px"></i>Lista de Faturas</span></div>
            <table class="dtable">
                <thead><tr><th>Número</th><th>OS</th><th>Cliente</th><th>Subtotal</th><th>IVA (14%)</th><th>Total</th><th>Status</th><th>Data</th><th>Ações</th></tr></thead>
                <tbody>
                    ${lista.length ? lista.map(f => `<tr>
                        <td><strong style="color:var(--accent)">${f.numero}</strong></td>
                        <td>${f.os_codigo}</td>
                        <td>${f.cliente_nome}</td>
                        <td>${fmt(f.valor_subtotal)} Kz</td>
                        <td>${fmt(f.valor_iva)} Kz</td>
                        <td><strong>${fmt(f.valor_total)} Kz</strong></td>
                        <td>${f.status==='paga'?'<span class="bs bs-c">Paga</span>':f.status==='emitida'?'<span class="bs bs-r">Emitida</span>':'<span class="bs bs-x">Cancelada</span>'}</td>
                        <td style="color:var(--text-muted)">${f.criado_em?.substring(0,10)||'-'}</td>
                        <td>
                            <button class="bi-btn bi-v" onclick="mostrarModalFatura(${f.id})" title="Ver Fatura"><i class="fas fa-eye"></i></button>
                            <button class="bi-btn bi-a" onclick="imprimirFatura(${f.id})" title="Imprimir/PDF"><i class="fas fa-print"></i></button>
                        </td>
                    </tr>`).join('') : '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted)">Nenhuma fatura emitida</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>
    <div class="modal fade" id="modalFatura" tabindex="-1">
        <div class="modal-dialog modal-lg"><div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-file-invoice" style="color:var(--accent);margin-right:8px"></i>Fatura</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="faturaConteudo"></div>
            <div class="modal-footer">
                <button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Fechar</button>
                <button class="btn-p" onclick="window.print()"><i class="fas fa-print"></i> Imprimir / PDF</button>
            </div>
        </div></div>
    </div>`;
}

async function mostrarModalFatura(id) {
    try {
        const data = await API.Faturas.buscar(id);
        const f    = data.fatura || data;
        const el   = document.getElementById('faturaConteudo');
        if (!el) return;

        const totalServicos = (f.servicos||[]).reduce((s,sv)=>s+(parseFloat(sv.valor)||0),0);
        const totalPecas    = (f.pecas||[]).reduce((s,p)=>s+(parseFloat(p.valor_total)||0),0);

        el.innerHTML = `
        <div style="font-family:'Plus Jakarta Sans',sans-serif;padding:10px" id="faturaImprimir">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">
                <div>
                    <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--accent)">3YC AFRICANAS</div>
                    <div style="color:var(--text-muted);font-size:13px;margin-top:4px">Sistema de Gestão de Oficina</div>
                    <div style="color:var(--text-muted);font-size:13px">Luanda, Angola</div>
                </div>
                <div style="text-align:right">
                    <div style="background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:700;margin-bottom:8px">FATURA</div>
                    <div style="font-size:18px;font-weight:800;color:var(--accent)">${f.numero}</div>
                    <div style="color:var(--text-muted);font-size:12px">Data: ${f.criado_em?.substring(0,10)||'-'}</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
                <div style="background:var(--bg);border-radius:10px;padding:14px">
                    <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Faturado a</div>
                    <div style="font-weight:700;font-size:15px">${f.cliente_nome}</div>
                    <div style="color:var(--text-muted);font-size:13px">${f.cliente_email||''}</div>
                    <div style="color:var(--text-muted);font-size:13px">${f.cliente_telefone||''}</div>
                    <div style="color:var(--text-muted);font-size:13px">${f.cliente_endereco||''}</div>
                </div>
                <div style="background:var(--bg);border-radius:10px;padding:14px">
                    <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Detalhes</div>
                    <div style="font-size:13px"><strong>OS:</strong> ${f.os_codigo}</div>
                    <div style="font-size:13px"><strong>Entrada:</strong> ${f.data_entrada||'-'}</div>
                    <div style="font-size:13px"><strong>Status:</strong> ${f.status==='paga'?'<span style="color:var(--success);font-weight:700">✓ Paga</span>':'<span style="color:var(--accent3);font-weight:700">Pendente</span>'}</div>
                </div>
            </div>

            ${(f.servicos||[]).length > 0 ? `
            <div style="margin-bottom:16px">
                <div style="font-weight:700;margin-bottom:10px;font-size:14px;border-bottom:2px solid var(--accent);padding-bottom:6px">Serviços</div>
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead><tr style="background:var(--bg)"><th style="padding:8px 10px;text-align:left">Descrição</th><th style="padding:8px 10px;text-align:right">Valor</th></tr></thead>
                    <tbody>${f.servicos.map(s=>`<tr style="border-bottom:1px solid var(--border)"><td style="padding:9px 10px">${s.nome}</td><td style="padding:9px 10px;text-align:right;font-weight:600">${fmt(s.valor)} Kz</td></tr>`).join('')}</tbody>
                </table>
            </div>` : ''}

            ${(f.pecas||[]).length > 0 ? `
            <div style="margin-bottom:20px">
                <div style="font-weight:700;margin-bottom:10px;font-size:14px;border-bottom:2px solid var(--accent2);padding-bottom:6px">Peças</div>
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead><tr style="background:var(--bg)"><th style="padding:8px 10px;text-align:left">Peça</th><th style="padding:8px 10px;text-align:center">Qtd</th><th style="padding:8px 10px;text-align:right">Unit.</th><th style="padding:8px 10px;text-align:right">Total</th></tr></thead>
                    <tbody>${f.pecas.map(p=>`<tr style="border-bottom:1px solid var(--border)"><td style="padding:9px 10px">${p.nome}</td><td style="padding:9px 10px;text-align:center">${p.quantidade}</td><td style="padding:9px 10px;text-align:right">${fmt(p.valor_unitario)} Kz</td><td style="padding:9px 10px;text-align:right;font-weight:600">${fmt(p.valor_total)} Kz</td></tr>`).join('')}</tbody>
                </table>
            </div>` : ''}

            <div style="display:flex;justify-content:flex-end;margin-top:16px">
                <div style="background:var(--bg);border-radius:12px;padding:16px 24px;min-width:260px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px"><span style="color:var(--text-muted)">Subtotal</span><span>${fmt(f.valor_subtotal)} Kz</span></div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:13px"><span style="color:var(--text-muted)">IVA (14%)</span><span>${fmt(f.valor_iva)} Kz</span></div>
                    <div style="border-top:2px solid var(--border);padding-top:12px;display:flex;justify-content:space-between;font-size:18px;font-weight:800"><span>Total</span><span style="color:var(--accent)">${fmt(f.valor_total)} Kz</span></div>
                </div>
            </div>
            <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid var(--border);color:var(--text-muted);font-size:12px">
                Obrigado pela preferência! • 3YC AFRICANAS • Luanda, Angola
            </div>
        </div>`;
        new bootstrap.Modal(document.getElementById('modalFatura')).show();
    } catch(e) { toast(e.message, 'error'); }
}
window.mostrarModalFatura = mostrarModalFatura;

async function imprimirFatura(id) {
    await mostrarModalFatura(id);
    setTimeout(() => window.print(), 800);
}
window.imprimirFatura = imprimirFatura;

// ══════════════════════════════════════════════════════════════
// RELATÓRIOS
// ══════════════════════════════════════════════════════════════
async function secaoRelatorios() {
    const page = document.getElementById('pg') || document.getElementById('pg');
    const hoje = new Date().toISOString().split('T')[0];
    const inicioMes = hoje.substring(0,7) + '-01';

    page.innerHTML = `
    <div class="fade-in">
        <div style="margin-bottom:24px">
            <h4 style="font-family:'Syne',sans-serif;font-weight:800">Relatórios</h4>
            <p style="color:var(--text-muted);font-size:13px">Gere relatórios detalhados e exporte em PDF</p>
        </div>

        <div class="tcard" style="margin-bottom:20px">
            <div class="card-hdr"><span class="card-ttl"><i class="fas fa-filter" style="color:var(--accent);margin-right:8px"></i>Filtros do Relatório</span></div>
            <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:16px;align-items:end">
                <div><label class="form-label">Data Início</label>
                    <input type="date" class="form-control" id="relInicio" value="${inicioMes}"></div>
                <div><label class="form-label">Data Fim</label>
                    <input type="date" class="form-control" id="relFim" value="${hoje}"></div>
                <button class="btn-p" onclick="gerarRelatorio()">
                    <i class="fas fa-chart-bar"></i> Gerar Relatório
                </button>
            </div>
        </div>

        <div id="relatorioConteudo">
            <div style="text-align:center;padding:60px;color:var(--text-muted)">
                <i class="fas fa-chart-bar" style="font-size:48px;opacity:.2;display:block;margin-bottom:16px"></i>
                <p>Selecione o período e clique em "Gerar Relatório"</p>
            </div>
        </div>
    </div>`;
}
window.secaoRelatorios = secaoRelatorios;

async function gerarRelatorio() {
    const inicio = document.getElementById('relInicio').value;
    const fim    = document.getElementById('relFim').value;
    const cont   = document.getElementById('relatorioConteudo');
    if (!inicio || !fim) { toast('Selecione as datas!', 'error'); return; }

    cont.innerHTML = '<div class="spin-w"><div class="spinner"></div><p style="color:var(--text-muted)">A gerar relatório...</p></div>';

    try {
        const data = await API.Faturas.relatorio(inicio, fim);
        const r    = data.resumo || {};
        const ordens = Array.isArray(data.ordens) ? data.ordens : [];
        const topCli = Array.isArray(data.top_clientes) ? data.top_clientes : [];
        const estBaixo = Array.isArray(data.estoque_baixo) ? data.estoque_baixo : [];

        cont.innerHTML = `
        <div id="relatorioImprimivel">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                <div>
                    <h5 style="font-family:'Syne',sans-serif;font-weight:800;font-size:18px">Relatório de Gestão</h5>
                    <p style="color:var(--text-muted);font-size:13px">Período: ${inicio} a ${fim} • Gerado em: ${data.gerado_em}</p>
                </div>
                <button class="btn-p" onclick="window.print()"><i class="fas fa-file-pdf"></i> Exportar PDF</button>
            </div>

            <div class="kpi-grid" style="margin-bottom:20px">
                <div class="kpi"><div class="kpi-ico"><i class="fas fa-clipboard-list"></i></div><div class="kpi-val">${r.total_ordens||0}</div><div class="kpi-lbl">Total de Ordens</div></div>
                <div class="kpi"><div class="kpi-ico" style="background:rgba(16,185,129,.1);color:var(--success)"><i class="fas fa-check"></i></div><div class="kpi-val">${r.ordens_concluidas||0}</div><div class="kpi-lbl">Concluídas</div></div>
                <div class="kpi"><div class="kpi-ico" style="background:rgba(245,158,11,.1);color:var(--accent3)"><i class="fas fa-spinner"></i></div><div class="kpi-val">${r.ordens_andamento||0}</div><div class="kpi-lbl">Em Andamento</div></div>
                <div class="kpi"><div class="kpi-ico" style="background:rgba(99,102,241,.1);color:var(--accent)"><i class="fas fa-coins"></i></div><div class="kpi-val" style="font-size:18px">${fmt(r.receita_total)} Kz</div><div class="kpi-lbl">Receita Total</div></div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
                <div class="tcard">
                    <div class="card-hdr"><span class="card-ttl"><i class="fas fa-trophy" style="color:var(--accent3);margin-right:8px"></i>Top Clientes</span></div>
                    ${topCli.length ? topCli.map((c,i) => `
                    <div class="rank-item">
                        <div class="rn ${i===0?'g':i===1?'s':'b'}">${i+1}</div>
                        <div style="flex:1"><div style="font-size:13px;font-weight:600">${c.nome}</div><div style="font-size:11px;color:var(--text-muted)">${c.total_ordens} ordens</div></div>
                        <div style="font-size:13px;font-weight:700;color:var(--accent)">${fmt(c.valor_total)} Kz</div>
                    </div>`).join('') : '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px">Sem dados</p>'}
                </div>
                <div class="tcard">
                    <div class="card-hdr"><span class="card-ttl"><i class="fas fa-exclamation-triangle" style="color:var(--danger);margin-right:8px"></i>Estoque Crítico</span></div>
                    ${estBaixo.length ? estBaixo.map(p => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
                        <div><div style="font-size:13px;font-weight:500">${p.nome}</div><div style="font-size:11px;color:var(--text-muted)">${p.categoria}</div></div>
                        <span class="b-low">${p.quantidade} un.</span>
                    </div>`).join('') : '<p style="color:var(--success);font-size:13px;text-align:center;padding:16px">✓ Estoque OK</p>'}
                </div>
            </div>

            <div class="tcard">
                <div class="card-hdr"><span class="card-ttl"><i class="fas fa-list" style="color:var(--accent);margin-right:8px"></i>Ordens do Período (${ordens.length})</span></div>
                <table class="dtable">
                    <thead><tr><th>Código</th><th>Cliente</th><th>Veículo</th><th>Funcionário</th><th>Status</th><th>Entrada</th><th>Valor</th></tr></thead>
                    <tbody>
                        ${ordens.length ? ordens.map(o=>`<tr>
                            <td><strong style="color:var(--accent)">${o.codigo}</strong></td>
                            <td>${o.cliente_nome}</td>
                            <td>${o.veiculo} <span style="color:var(--text-muted)">${o.placa}</span></td>
                            <td>${o.funcionario||'-'}</td>
                            <td>${bs(o.status)}</td>
                            <td style="color:var(--text-muted)">${o.data_entrada}</td>
                            <td><strong>${fmt(o.valor_total)} Kz</strong></td>
                        </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma ordem no período</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>`;
        toast('✅ Relatório gerado! Use "Exportar PDF" para imprimir.', 'success');
    } catch(e) { toast(e.message, 'error'); cont.innerHTML = `<div style="color:var(--danger);padding:20px">Erro: ${e.message}</div>`; }
}
window.gerarRelatorio = gerarRelatorio;
