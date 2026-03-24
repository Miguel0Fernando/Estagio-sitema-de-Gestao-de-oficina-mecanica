<?php
// ============================================================
// api/produtos.php — CRUD de Produtos / Estoque
// ============================================================

require_once __DIR__ . '/../includes/helpers.php';
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id'])   ? (int)$_GET['id']   : null;
$acao   = $_GET['acao'] ?? '';
$db     = getDB();

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {

    // Alertas de estoque baixo
    if ($acao === 'alertas') {
        $stmt = $db->prepare("
            SELECT * FROM produtos WHERE ativo = 1 AND quantidade <= quantidade_minima
            ORDER BY quantidade ASC
        ");
        $stmt->execute();
        resposta($stmt->fetchAll());
    }

    if ($id) {
        $stmt = $db->prepare("SELECT * FROM produtos WHERE id = ? AND ativo = 1");
        $stmt->execute([$id]);
        $produto = $stmt->fetch();
        if (!$produto) erro('Produto não encontrado.', 404);

        // Histórico de movimentos
        $stmtM = $db->prepare("
            SELECT m.*, os.codigo as os_codigo
            FROM movimentos_estoque m
            LEFT JOIN ordens_servico os ON os.id = m.ordem_id
            WHERE m.produto_id = ?
            ORDER BY m.criado_em DESC LIMIT 30
        ");
        $stmtM->execute([$id]);
        $produto['movimentos'] = $stmtM->fetchAll();

        resposta($produto);
    }

    $busca = $_GET['busca'] ?? '';
    if ($busca) {
        $like = "%$busca%";
        $stmt = $db->prepare("
            SELECT * FROM produtos WHERE ativo = 1
            AND (nome LIKE ? OR categoria LIKE ?)
            ORDER BY nome ASC
        ");
        $stmt->execute([$like, $like]);
    } else {
        $stmt = $db->prepare("SELECT * FROM produtos WHERE ativo = 1 ORDER BY nome ASC");
        $stmt->execute();
    }
    resposta($stmt->fetchAll());
}

// ── POST — Criar produto ─────────────────────────────────────
if ($method === 'POST') {
    $body      = getBody();
    $nome      = trim($body['nome']               ?? '');
    $categoria = trim($body['categoria']          ?? '');
    $qtd       = (int)($body['quantidade']        ?? 0);
    $qtdMin    = (int)($body['quantidade_minima'] ?? 5);
    $preco     = (float)($body['preco']           ?? 0);

    if (!$nome) erro('Nome do produto é obrigatório.');

    $stmt = $db->prepare("
        INSERT INTO produtos (nome, categoria, quantidade, quantidade_minima, preco)
        VALUES (?,?,?,?,?)
    ");
    $stmt->execute([$nome, $categoria, $qtd, $qtdMin, $preco]);
    $novoId = (int) $db->lastInsertId();

    // Registrar movimento inicial se quantidade > 0
    if ($qtd > 0) {
        $stmtM = $db->prepare("
            INSERT INTO movimentos_estoque (produto_id, tipo, quantidade, motivo)
            VALUES (?, 'entrada', ?, 'Cadastro inicial')
        ");
        $stmtM->execute([$novoId, $qtd]);
    }

    $stmtGet = $db->prepare("SELECT * FROM produtos WHERE id = ?");
    $stmtGet->execute([$novoId]);
    resposta($stmtGet->fetch(), 201);
}

// ── PUT — Atualizar produto ───────────────────────────────────
if ($method === 'PUT') {
    if (!$id) erro('ID do produto não informado.');
    $body      = getBody();
    $nome      = trim($body['nome']               ?? '');
    $categoria = trim($body['categoria']          ?? '');
    $qtdMin    = (int)($body['quantidade_minima'] ?? 5);
    $preco     = (float)($body['preco']           ?? 0);

    // Ajuste manual de estoque
    if (isset($body['ajuste_quantidade'])) {
        $ajuste = (int)$body['ajuste_quantidade'];
        $motivo = trim($body['motivo'] ?? 'Ajuste manual');
        $tipo   = $ajuste >= 0 ? 'entrada' : 'saida';

        $stmt = $db->prepare("UPDATE produtos SET quantidade = quantidade + ? WHERE id = ? AND ativo = 1");
        $stmt->execute([$ajuste, $id]);

        $stmtM = $db->prepare("
            INSERT INTO movimentos_estoque (produto_id, tipo, quantidade, motivo)
            VALUES (?, ?, ?, ?)
        ");
        $stmtM->execute([$id, $tipo, abs($ajuste), $motivo]);

        $stmtGet = $db->prepare("SELECT * FROM produtos WHERE id = ?");
        $stmtGet->execute([$id]);
        resposta($stmtGet->fetch());
    }

    if (!$nome) erro('Nome do produto é obrigatório.');

    $stmt = $db->prepare("
        UPDATE produtos SET nome=?, categoria=?, quantidade_minima=?, preco=?
        WHERE id=? AND ativo=1
    ");
    $stmt->execute([$nome, $categoria, $qtdMin, $preco, $id]);
    if ($stmt->rowCount() === 0) erro('Produto não encontrado.', 404);

    $stmtGet = $db->prepare("SELECT * FROM produtos WHERE id = ?");
    $stmtGet->execute([$id]);
    resposta($stmtGet->fetch());
}

// ── DELETE ───────────────────────────────────────────────────
if ($method === 'DELETE') {
    if (!$id) erro('ID do produto não informado.');
    $stmt = $db->prepare("UPDATE produtos SET ativo=0 WHERE id=?");
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) erro('Produto não encontrado.', 404);
    resposta(['mensagem' => 'Produto removido com sucesso.']);
}

erro('Método não permitido.', 405);
