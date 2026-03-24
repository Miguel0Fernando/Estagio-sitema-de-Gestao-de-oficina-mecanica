<?php
require_once __DIR__ . '/../includes/helpers.php';
setCorsHeaders();
iniciarSessao();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {

    case 'login':
        if ($method !== 'POST') jsonResponse(false, 'Método não permitido.', [], 405);
        $body  = getJsonBody();
        $email = trim($body['email'] ?? '');
        $senha = trim($body['senha'] ?? '');

        if (!$email || !$senha) jsonResponse(false, 'Preencha email e senha.');

        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1 LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) jsonResponse(false, 'Email ou senha incorretos.');

        // Aceitar senha em texto simples OU com hash
        $senhaValida = ($senha === $user['senha']) || password_verify($senha, $user['senha']);
        if (!$senhaValida) jsonResponse(false, 'Email ou senha incorretos.');

        unset($user['senha']);
        $_SESSION['usuario'] = $user;
        jsonResponse(true, 'Login realizado!', ['usuario' => $user]);
        break;

    case 'cadastro':
        if ($method !== 'POST') jsonResponse(false, 'Método não permitido.', [], 405);
        $body  = getJsonBody();
        $nome  = trim($body['nome']  ?? '');
        $email = trim($body['email'] ?? '');
        $senha = trim($body['senha'] ?? '');
        $tipo  = $body['tipo']       ?? 'cliente';

        if (!$nome || !$email || !$senha) jsonResponse(false, 'Preencha todos os campos.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonResponse(false, 'Email inválido.');
        if (strlen($senha) < 6) jsonResponse(false, 'Senha deve ter mínimo 6 caracteres.');
        if (!in_array($tipo, ['admin','funcionario','cliente'])) $tipo = 'cliente';

        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        if ($stmt->fetch()) jsonResponse(false, 'Este email já está cadastrado.');

        // Sem criptografia — senha em texto simples
        $avatar = strtoupper(substr($nome, 0, 1)) . strtoupper(substr(explode(' ', $nome)[1] ?? 'X', 0, 1));
        $pdo->prepare('INSERT INTO usuarios (nome, email, senha, tipo, avatar) VALUES (?,?,?,?,?)')
            ->execute([$nome, $email, $senha, $tipo, $avatar]);
        $userId = (int)$pdo->lastInsertId();

        if ($tipo === 'cliente') {
            $pdo->prepare('INSERT INTO clientes (usuario_id, nome, email) VALUES (?,?,?)')
                ->execute([$userId, $nome, $email]);
        }
        if ($tipo === 'funcionario') {
            $pdo->prepare('INSERT INTO funcionarios (usuario_id, nome, email) VALUES (?,?,?)')
                ->execute([$userId, $nome, $email]);
        }

        jsonResponse(true, 'Cadastro realizado! Faça login.');
        break;

    case 'logout':
        $_SESSION = [];
        session_destroy();
        jsonResponse(true, 'Logout realizado.');
        break;

    case 'sessao':
        $u = getUsuarioLogado();
        if ($u) jsonResponse(true, 'Autenticado.', ['usuario' => $u]);
        else    jsonResponse(false, 'Não autenticado.', [], 401);
        break;

    default:
        jsonResponse(false, 'Ação inválida.', [], 404);
}
