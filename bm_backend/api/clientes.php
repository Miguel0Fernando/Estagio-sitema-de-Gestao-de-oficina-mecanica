<?php
require_once __DIR__ . '/../includes/helpers.php';
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$pdo    = getDB();

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $pdo->prepare("SELECT c.*, COUNT(v.id) AS total_veiculos FROM clientes c LEFT JOIN veiculos v ON v.cliente_id=c.id AND v.ativo=1 WHERE c.id=? AND c.ativo=1 GROUP BY c.id");
            $stmt->execute([$id]);
            $cliente = $stmt->fetch();
            if (!$cliente) jsonResponse(false,'Cliente não encontrado.',[], 404);
            $sv = $pdo->prepare('SELECT * FROM veiculos WHERE cliente_id=? AND ativo=1');
            $sv->execute([$id]);
            $cliente['veiculos'] = $sv->fetchAll();
            jsonResponse(true,'', ['cliente'=>$cliente]);
        }
        $busca  = $_GET['busca'] ?? '';
        $where  = 'WHERE c.ativo=1';
        $params = [];
        if ($busca) { $like="%$busca%"; $where.=' AND (c.nome LIKE ? OR c.email LIKE ? OR c.telefone LIKE ? OR c.nif LIKE ?)'; $params=[$like,$like,$like,$like]; }
        $stmt = $pdo->prepare("SELECT c.*, COUNT(v.id) AS total_veiculos FROM clientes c LEFT JOIN veiculos v ON v.cliente_id=c.id AND v.ativo=1 $where GROUP BY c.id ORDER BY c.nome");
        $stmt->execute($params);
        jsonResponse(true,'', ['clientes'=>$stmt->fetchAll()]);
        break;

    case 'POST':
        $b        = getJsonBody();
        $nome     = trim($b['nome']     ?? '');
        $email    = trim($b['email']    ?? '');
        $telefone = trim($b['telefone'] ?? '');
        $endereco = trim($b['endereco'] ?? '');
        $nif      = trim($b['nif']      ?? '');
        if (!$nome || !$email) jsonResponse(false,'Nome e email são obrigatórios.');
        if (!validarEmail($email)) jsonResponse(false,'Email inválido.');
        $check = $pdo->prepare('SELECT id FROM clientes WHERE email=? AND ativo=1 LIMIT 1');
        $check->execute([$email]);
        if ($check->fetch()) jsonResponse(false,'Email já cadastrado.');
        $pdo->prepare('INSERT INTO clientes (nome,email,telefone,endereco,nif,data_cadastro) VALUES (?,?,?,?,?,CURDATE())')
            ->execute([$nome,$email,$telefone,$endereco,$nif]);
        $newId = (int)$pdo->lastInsertId();
        $s = $pdo->prepare('SELECT * FROM clientes WHERE id=?'); $s->execute([$newId]);
        jsonResponse(true,'Cliente cadastrado!', ['cliente'=>$s->fetch()], 201);
        break;

    case 'PUT':
        if (!$id) jsonResponse(false,'ID não informado.');
        $b        = getJsonBody();
        $nome     = trim($b['nome']     ?? '');
        $email    = trim($b['email']    ?? '');
        $telefone = trim($b['telefone'] ?? '');
        $endereco = trim($b['endereco'] ?? '');
        $nif      = trim($b['nif']      ?? '');
        if (!$nome || !$email) jsonResponse(false,'Nome e email são obrigatórios.');
        $check = $pdo->prepare('SELECT id FROM clientes WHERE email=? AND id!=? AND ativo=1 LIMIT 1');
        $check->execute([$email,$id]);
        if ($check->fetch()) jsonResponse(false,'Email já em uso.');
        $pdo->prepare('UPDATE clientes SET nome=?,email=?,telefone=?,endereco=?,nif=? WHERE id=? AND ativo=1')
            ->execute([$nome,$email,$telefone,$endereco,$nif,$id]);
        $s = $pdo->prepare('SELECT * FROM clientes WHERE id=?'); $s->execute([$id]);
        jsonResponse(true,'Cliente atualizado!', ['cliente'=>$s->fetch()]);
        break;

    case 'DELETE':
        if (!$id) jsonResponse(false,'ID não informado.');
        $pdo->prepare('UPDATE clientes SET ativo=0 WHERE id=?')->execute([$id]);
        jsonResponse(true,'Cliente removido!');
        break;

    default: jsonResponse(false,'Método não suportado.',[], 405);
}
