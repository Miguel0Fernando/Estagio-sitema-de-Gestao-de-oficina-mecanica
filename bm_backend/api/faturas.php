<?php
// ============================================================
// api/faturas.php — Faturas e dados para PDF
// ============================================================
require_once __DIR__ . '/../includes/helpers.php';
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id'])  ? (int)$_GET['id']  : 0;
$acao   = $_GET['acao'] ?? '';
$db     = getDB();

// ── GET /faturas.php?acao=relatorio ─────────────────────────
if ($method === 'GET' && $acao === 'relatorio') {
    $inicio = $_GET['inicio'] ?? date('Y-m-01');
    $fim    = $_GET['fim']    ?? date('Y-m-d');

    // Resumo financeiro
    $resumo = $db->prepare("
        SELECT
            COUNT(DISTINCT os.id) as total_ordens,
            SUM(CASE WHEN os.status='completed' THEN os.valor_total ELSE 0 END) as receita_total,
            COUNT(CASE WHEN os.status='completed' THEN 1 END) as ordens_concluidas,
            COUNT(CASE WHEN os.status='pending' THEN 1 END) as ordens_pendentes,
            COUNT(CASE WHEN os.status='progress' THEN 1 END) as ordens_andamento
        FROM ordens_servico os
        WHERE os.data_entrada BETWEEN ? AND ?
    ");
    $resumo->execute([$inicio, $fim]);
    $resumoData = $resumo->fetch();

    // Ordens do período
    $ordens = $db->prepare("
        SELECT os.codigo, os.status, os.valor_total, os.data_entrada, os.data_saida,
               c.nome as cliente_nome, v.modelo as veiculo, v.placa,
               f.nome as funcionario
        FROM ordens_servico os
        JOIN clientes c ON c.id = os.cliente_id
        JOIN veiculos v ON v.id = os.veiculo_id
        LEFT JOIN funcionarios f ON f.id = os.funcionario_id
        WHERE os.data_entrada BETWEEN ? AND ?
        ORDER BY os.data_entrada DESC
    ");
    $ordens->execute([$inicio, $fim]);

    // Top clientes
    $topCli = $db->prepare("
        SELECT c.nome, COUNT(os.id) as total_ordens, SUM(os.valor_total) as valor_total
        FROM clientes c
        JOIN ordens_servico os ON os.cliente_id = c.id
        WHERE os.data_entrada BETWEEN ? AND ?
        GROUP BY c.id ORDER BY valor_total DESC LIMIT 5
    ");
    $topCli->execute([$inicio, $fim]);

    // Estoque baixo
    $estoque = $db->query("SELECT nome, categoria, quantidade, quantidade_minima, preco FROM produtos WHERE ativo=1 AND quantidade <= quantidade_minima ORDER BY quantidade ASC");

    jsonResponse(true, '', [
        'periodo'  => ['inicio' => $inicio, 'fim' => $fim],
        'resumo'   => $resumoData,
        'ordens'   => $ordens->fetchAll(),
        'top_clientes' => $topCli->fetchAll(),
        'estoque_baixo' => $estoque->fetchAll(),
        'gerado_em' => date('d/m/Y H:i'),
    ]);
}

if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare("
            SELECT f.*, c.nome as cliente_nome, c.email as cliente_email,
                   c.telefone as cliente_telefone, c.endereco as cliente_endereco,
                   os.codigo as os_codigo, os.data_entrada, os.observacoes
            FROM faturas f
            JOIN clientes c ON c.id = f.cliente_id
            JOIN ordens_servico os ON os.id = f.ordem_id
            WHERE f.id = ?
        ");
        $stmt->execute([$id]);
        $fat = $stmt->fetch();
        if (!$fat) jsonResponse(false, 'Fatura não encontrada.', [], 404);

        // Serviços
        $ss = $db->prepare("SELECT * FROM ordem_servicos WHERE ordem_id = ?");
        $ss->execute([$fat['ordem_id']]);
        $fat['servicos'] = $ss->fetchAll();

        // Peças
        $sp = $db->prepare("SELECT * FROM ordem_pecas WHERE ordem_id = ?");
        $sp->execute([$fat['ordem_id']]);
        $fat['pecas'] = $sp->fetchAll();

        jsonResponse(true, '', ['fatura' => $fat]);
    }

    $stmt = $db->prepare("
        SELECT f.*, c.nome as cliente_nome, os.codigo as os_codigo
        FROM faturas f
        JOIN clientes c ON c.id = f.cliente_id
        JOIN ordens_servico os ON os.id = f.ordem_id
        ORDER BY f.criado_em DESC
    ");
    $stmt->execute();
    jsonResponse(true, '', ['faturas' => $stmt->fetchAll()]);
}

jsonResponse(false, 'Método não suportado.', [], 405);
