<?php
// ============================================================
// api/dashboard.php — Estatísticas e gráficos do Dashboard
// ============================================================

require_once __DIR__ . '/../includes/helpers.php';
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$tipo   = $_GET['tipo'] ?? 'admin';
$ref_id = isset($_GET['ref_id']) ? (int)$_GET['ref_id'] : null;
$db     = getDB();

if ($method !== 'GET') erro('Método não permitido.', 405);

// ============================================================
// DASHBOARD ADMIN
// ============================================================
if ($tipo === 'admin') {
    $totalClientes     = $db->query("SELECT COUNT(*) FROM clientes    WHERE ativo=1")->fetchColumn();
    $totalVeiculos     = $db->query("SELECT COUNT(*) FROM veiculos    WHERE ativo=1")->fetchColumn();
    $totalFuncionarios = $db->query("SELECT COUNT(*) FROM funcionarios WHERE ativo=1")->fetchColumn();

    $ordens = $db->query("
        SELECT COUNT(*) as total,
            SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END) as pendentes,
            SUM(CASE WHEN status='progress'  THEN 1 ELSE 0 END) as em_andamento,
            SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as concluidas,
            SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as canceladas
        FROM ordens_servico
    ")->fetch();

    $faturamentoTotal = $db->query("SELECT COALESCE(SUM(valor_total),0) FROM ordens_servico WHERE status='completed'")->fetchColumn();
    $faturamentoMes   = $db->query("SELECT COALESCE(SUM(valor_total),0) FROM ordens_servico WHERE status='completed' AND MONTH(data_saida)=MONTH(CURDATE()) AND YEAR(data_saida)=YEAR(CURDATE())")->fetchColumn();
    $estoqueBaixo     = $db->query("SELECT COUNT(*) FROM produtos WHERE ativo=1 AND quantidade <= quantidade_minima")->fetchColumn();

    // Gráfico mensal (últimos 6 meses)
    $graficoMensal = $db->query("
        SELECT DATE_FORMAT(data_entrada,'%Y-%m') as mes,
               COUNT(*) as total,
               SUM(CASE WHEN status='completed' THEN valor_total ELSE 0 END) as faturamento
        FROM ordens_servico
        WHERE data_entrada >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY mes ORDER BY mes ASC
    ")->fetchAll();

    // Gráfico status (doughnut)
    $graficoStatus = [
        ['label'=>'Pendentes',    'valor'=>(int)$ordens['pendentes'],    'cor'=>'#ffb703'],
        ['label'=>'Em Andamento', 'valor'=>(int)$ordens['em_andamento'], 'cor'=>'#4361ee'],
        ['label'=>'Concluídas',   'valor'=>(int)$ordens['concluidas'],   'cor'=>'#06d6a0'],
        ['label'=>'Canceladas',   'valor'=>(int)$ordens['canceladas'],   'cor'=>'#ef476f'],
    ];

    // Gráfico estoque por categoria
    $graficoEstoque = $db->query("
        SELECT categoria, SUM(quantidade) as total, COUNT(*) as produtos
        FROM produtos WHERE ativo=1 GROUP BY categoria ORDER BY total DESC
    ")->fetchAll();

    // Últimas 5 ordens
    $ultimasOrdens = $db->query("
        SELECT os.*, c.nome as cliente_nome, v.modelo as veiculo, v.placa
        FROM ordens_servico os
        JOIN clientes c ON c.id=os.cliente_id
        JOIN veiculos v ON v.id=os.veiculo_id
        ORDER BY os.criado_em DESC LIMIT 5
    ")->fetchAll();

    // Top 5 clientes
    $topClientes = $db->query("
        SELECT c.nome, c.total_gasto, COUNT(os.id) as total_ordens
        FROM clientes c LEFT JOIN ordens_servico os ON os.cliente_id=c.id
        WHERE c.ativo=1 GROUP BY c.id ORDER BY c.total_gasto DESC LIMIT 5
    ")->fetchAll();

    // Produtos com estoque baixo
    $alertasEstoque = $db->query("
        SELECT * FROM produtos WHERE ativo=1 AND quantidade <= quantidade_minima
        ORDER BY quantidade ASC LIMIT 5
    ")->fetchAll();

    resposta([
        'cards' => [
            'total_clientes'     => (int)$totalClientes,
            'total_veiculos'     => (int)$totalVeiculos,
            'total_funcionarios' => (int)$totalFuncionarios,
            'total_ordens'       => (int)$ordens['total'],
            'ordens_pendentes'   => (int)$ordens['pendentes'],
            'ordens_andamento'   => (int)$ordens['em_andamento'],
            'ordens_concluidas'  => (int)$ordens['concluidas'],
            'faturamento_total'  => (float)$faturamentoTotal,
            'faturamento_mes'    => (float)$faturamentoMes,
            'estoque_baixo'      => (int)$estoqueBaixo,
        ],
        'grafico_mensal'  => $graficoMensal,
        'grafico_status'  => $graficoStatus,
        'grafico_estoque' => $graficoEstoque,
        'ultimas_ordens'  => $ultimasOrdens,
        'top_clientes'    => $topClientes,
        'alertas_estoque' => $alertasEstoque,
    ]);
}

// ============================================================
// DASHBOARD FUNCIONÁRIO
// ============================================================
if ($tipo === 'funcionario') {
    if (!$ref_id) erro('ref_id do funcionário é obrigatório.');

    $minhasOrdens = $db->prepare("
        SELECT os.*, c.nome as cliente_nome, v.modelo as veiculo, v.placa
        FROM ordens_servico os
        JOIN clientes c ON c.id=os.cliente_id
        JOIN veiculos v ON v.id=os.veiculo_id
        WHERE os.funcionario_id=? ORDER BY os.criado_em DESC LIMIT 10
    ");
    $minhasOrdens->execute([$ref_id]);

    $stats = $db->prepare("
        SELECT COUNT(*) as total,
            SUM(CASE WHEN status IN ('pending','progress') THEN 1 ELSE 0 END) as ativas,
            SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as concluidas,
            COALESCE(SUM(CASE WHEN status='completed' THEN valor_total ELSE 0 END),0) as valor_total
        FROM ordens_servico WHERE funcionario_id=?
    ");
    $stats->execute([$ref_id]);

    resposta([
        'cards'         => $stats->fetch(),
        'minhas_ordens' => $minhasOrdens->fetchAll(),
    ]);
}

// ============================================================
// DASHBOARD CLIENTE
// ============================================================
if ($tipo === 'cliente') {
    if (!$ref_id) erro('ref_id do cliente é obrigatório.');

    $veiculos = $db->prepare("SELECT * FROM veiculos WHERE cliente_id=? AND ativo=1");
    $veiculos->execute([$ref_id]);

    $ordens = $db->prepare("
        SELECT os.*, v.modelo as veiculo, v.placa
        FROM ordens_servico os JOIN veiculos v ON v.id=os.veiculo_id
        WHERE os.cliente_id=? ORDER BY os.criado_em DESC LIMIT 10
    ");
    $ordens->execute([$ref_id]);

    $stats = $db->prepare("
        SELECT COUNT(DISTINCT v.id) as total_veiculos,
               COUNT(os.id) as total_ordens,
               COALESCE(SUM(CASE WHEN os.status='completed' THEN os.valor_total ELSE 0 END),0) as total_gasto,
               SUM(CASE WHEN os.status IN ('pending','progress') THEN 1 ELSE 0 END) as ordens_ativas
        FROM clientes c
        LEFT JOIN veiculos v ON v.cliente_id=c.id AND v.ativo=1
        LEFT JOIN ordens_servico os ON os.cliente_id=c.id
        WHERE c.id=?
    ");
    $stats->execute([$ref_id]);

    resposta([
        'cards'   => $stats->fetch(),
        'veiculos'=> $veiculos->fetchAll(),
        'ordens'  => $ordens->fetchAll(),
    ]);
}

erro('Tipo de dashboard inválido.', 400);
