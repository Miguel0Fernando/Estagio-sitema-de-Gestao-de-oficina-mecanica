<?php
// ============================================================
// api/usuarios.php — Gestão de Usuários (admin)
// ============================================================

require_once __DIR__ . '/../includes/helpers.php';
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;
$db     = getDB();

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare("SELECT id, nome, email, tipo, avatar, ativo, criado_em FROM usuarios WHERE id=?");
        $stmt->execute([$id]);
        $u = $stmt->fetch();
        if (!$u) erro('Usuário não encontrado.', 404);
        resposta($u);
    }

    $stmt = $db->query("
        SELECT id, nome, email, tipo, avatar, ativo, criado_em
        FROM usuarios ORDER BY nome ASC
    ");
    resposta($stmt->fetchAll());
}

// ── POST — Criar usuário ─────────────────────────────────────
if ($method === 'POST') {
    $body  = getBody();
    $nome  = trim($body['nome']  ?? '');
    $email = trim($body['email'] ?? '');
    $senha = trim($body['senha'] ?? '');
    $tipo  = trim($body['tipo']  ?? 'cliente');

    if (!$nome || !$email || !$senha) erro('Nome, e-mail e senha são obrigatórios.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) erro('E-mail inválido.');
    if (strlen($senha) < 6) erro('Senha deve ter mínimo 6 caracteres.');

    $stmt = $db->prepare("SELECT id FROM usuarios WHERE email=? LIMIT 1");
    $stmt->execute([$email]);
    if ($stmt->fetch()) erro('E-mail já cadastrado.');

    $hash   = hashSenha($senha);
    $avatar = strtoupper(substr($nome, 0, 1)) . strtoupper(substr(explode(' ', $nome)[1] ?? 'X', 0, 1));

    $stmt = $db->prepare("INSERT INTO usuarios (nome, email, senha, tipo, avatar) VALUES (?,?,?,?,?)");
    $stmt->execute([$nome, $email, $hash, $tipo, $avatar]);
    $novoId = (int) $db->lastInsertId();

    // Criar registro vinculado
    if ($tipo === 'cliente') {
        $db->prepare("INSERT INTO clientes (usuario_id, nome, email) VALUES (?,?,?)")->execute([$novoId, $nome, $email]);
    } elseif ($tipo === 'funcionario') {
        $db->prepare("INSERT INTO funcionarios (usuario_id, nome, email) VALUES (?,?,?)")->execute([$novoId, $nome, $email]);
    }

    $stmtGet = $db->prepare("SELECT id, nome, email, tipo, avatar, ativo, criado_em FROM usuarios WHERE id=?");
    $stmtGet->execute([$novoId]);
    resposta($stmtGet->fetch(), 201);
}

// ── PUT — Atualizar usuário ──────────────────────────────────
if ($method === 'PUT') {
    if (!$id) erro('ID do usuário não informado.');
    $body  = getBody();
    $nome  = trim($body['nome']  ?? '');
    $email = trim($body['email'] ?? '');
    $senha = trim($body['senha'] ?? '');
    $ativo = isset($body['ativo']) ? (int)$body['ativo'] : null;

    if (!$nome || !$email) erro('Nome e e-mail são obrigatórios.');

    // Verificar duplicidade
    $stmt = $db->prepare("SELECT id FROM usuarios WHERE email=? AND id!=? LIMIT 1");
    $stmt->execute([$email, $id]);
    if ($stmt->fetch()) erro('E-mail já utilizado.');

    if ($senha && strlen($senha) >= 6) {
        $hash = hashSenha($senha);
        $stmt = $db->prepare("UPDATE usuarios SET nome=?, email=?, senha=? WHERE id=?");
        $stmt->execute([$nome, $email, $hash, $id]);
    } else {
        $stmt = $db->prepare("UPDATE usuarios SET nome=?, email=? WHERE id=?");
        $stmt->execute([$nome, $email, $id]);
    }

    if ($ativo !== null) {
        $db->prepare("UPDATE usuarios SET ativo=? WHERE id=?")->execute([$ativo, $id]);
    }

    $stmtGet = $db->prepare("SELECT id, nome, email, tipo, avatar, ativo, criado_em FROM usuarios WHERE id=?");
    $stmtGet->execute([$id]);
    resposta($stmtGet->fetch());
}

// ── DELETE — Desativar usuário ───────────────────────────────
if ($method === 'DELETE') {
    if (!$id) erro('ID do usuário não informado.');
    $db->prepare("UPDATE usuarios SET ativo=0 WHERE id=?")->execute([$id]);
    resposta(['mensagem' => 'Usuário desativado com sucesso.']);
}

erro('Método não permitido.', 405);
