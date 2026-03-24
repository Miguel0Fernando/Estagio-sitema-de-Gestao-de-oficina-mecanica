<?php
require_once __DIR__ . '/../includes/helpers.php';
setCorsHeaders();

$method     = $_SERVER['REQUEST_METHOD'];
$id         = isset($_GET['id'])         ? (int)$_GET['id']         : 0;
$cliente_id = isset($_GET['cliente_id']) ? (int)$_GET['cliente_id'] : 0;
$pdo        = getDB();

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $pdo->prepare("SELECT v.*,c.nome AS cliente_nome FROM veiculos v JOIN clientes c ON c.id=v.cliente_id WHERE v.id=? AND v.ativo=1");
            $stmt->execute([$id]);
            $v = $stmt->fetch();
            if (!$v) jsonResponse(false,'Veículo não encontrado.',[], 404);
            jsonResponse(true,'', ['veiculo'=>$v]);
        }
        $busca  = $_GET['busca'] ?? '';
        $where  = 'WHERE v.ativo=1';
        $params = [];
        if ($cliente_id) { $where.=' AND v.cliente_id=?'; $params[]=$cliente_id; }
        if ($busca) { $like="%$busca%"; $where.=' AND (v.modelo LIKE ? OR v.placa LIKE ? OR c.nome LIKE ?)'; $params=array_merge($params,[$like,$like,$like]); }
        $stmt = $pdo->prepare("SELECT v.*,c.nome AS cliente_nome FROM veiculos v JOIN clientes c ON c.id=v.cliente_id $where ORDER BY v.modelo");
        $stmt->execute($params);
        jsonResponse(true,'', ['veiculos'=>$stmt->fetchAll()]);
        break;

    case 'POST':
        $b          = getJsonBody();
        $clienteId  = (int)($b['cliente_id'] ?? 0);
        $modelo     = trim($b['modelo']  ?? '');
        $placa      = trim($b['placa']   ?? '');
        $cor        = trim($b['cor']     ?? '');
        $ano        = (int)($b['ano']    ?? 0);
        if (!$clienteId || !$modelo || !$placa) jsonResponse(false,'Cliente, modelo e placa são obrigatórios.');
        $check = $pdo->prepare('SELECT id FROM veiculos WHERE placa=? AND ativo=1 LIMIT 1');
        $check->execute([$placa]);
        if ($check->fetch()) jsonResponse(false,'Placa já cadastrada.');
        $pdo->prepare('INSERT INTO veiculos (cliente_id,modelo,placa,cor,ano) VALUES (?,?,?,?,?)')
            ->execute([$clienteId,$modelo,$placa,$cor,$ano?:null]);
        $newId = (int)$pdo->lastInsertId();
        $s = $pdo->prepare('SELECT v.*,c.nome AS cliente_nome FROM veiculos v JOIN clientes c ON c.id=v.cliente_id WHERE v.id=?');
        $s->execute([$newId]);
        jsonResponse(true,'Veículo cadastrado!', ['veiculo'=>$s->fetch()], 201);
        break;

    case 'PUT':
        if (!$id) jsonResponse(false,'ID não informado.');
        $b      = getJsonBody();
        $modelo = trim($b['modelo'] ?? '');
        $placa  = trim($b['placa']  ?? '');
        $cor    = trim($b['cor']    ?? '');
        $ano    = (int)($b['ano']   ?? 0);
        $status = trim($b['status'] ?? 'Normal');
        if (!$modelo || !$placa) jsonResponse(false,'Modelo e placa são obrigatórios.');
        $check = $pdo->prepare('SELECT id FROM veiculos WHERE placa=? AND id!=? AND ativo=1 LIMIT 1');
        $check->execute([$placa,$id]);
        if ($check->fetch()) jsonResponse(false,'Placa já em uso.');
        $pdo->prepare('UPDATE veiculos SET modelo=?,placa=?,cor=?,ano=?,status=? WHERE id=? AND ativo=1')
            ->execute([$modelo,$placa,$cor,$ano?:null,$status,$id]);
        $s = $pdo->prepare('SELECT v.*,c.nome AS cliente_nome FROM veiculos v JOIN clientes c ON c.id=v.cliente_id WHERE v.id=?');
        $s->execute([$id]);
        jsonResponse(true,'Veículo atualizado!', ['veiculo'=>$s->fetch()]);
        break;

    case 'DELETE':
        if (!$id) jsonResponse(false,'ID não informado.');
        $pdo->prepare('UPDATE veiculos SET ativo=0 WHERE id=?')->execute([$id]);
        jsonResponse(true,'Veículo removido!');
        break;

    default: jsonResponse(false,'Método não suportado.',[], 405);
}
