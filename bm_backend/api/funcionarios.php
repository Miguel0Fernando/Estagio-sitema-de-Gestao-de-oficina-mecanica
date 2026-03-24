<?php
require_once __DIR__ . '/../includes/helpers.php';
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$pdo    = getDB();

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $pdo->prepare('SELECT f.*,COUNT(os.id) AS total_ordens FROM funcionarios f LEFT JOIN ordens_servico os ON os.funcionario_id=f.id WHERE f.id=? AND f.ativo=1 GROUP BY f.id');
            $stmt->execute([$id]);
            $f = $stmt->fetch();
            if (!$f) jsonResponse(false,'Funcionário não encontrado.',[], 404);
            jsonResponse(true,'', ['funcionario'=>$f]);
        }
        $stmt = $pdo->prepare('SELECT f.*,COUNT(os.id) AS total_ordens FROM funcionarios f LEFT JOIN ordens_servico os ON os.funcionario_id=f.id WHERE f.ativo=1 GROUP BY f.id ORDER BY f.nome');
        $stmt->execute();
        jsonResponse(true,'', ['funcionarios'=>$stmt->fetchAll()]);
        break;

    case 'POST':
        $b             = getJsonBody();
        $nome          = trim($b['nome']          ?? '');
        $email         = trim($b['email']         ?? '');
        $telefone      = trim($b['telefone']      ?? '');
        $especialidade = trim($b['especialidade'] ?? '');
        $salario       = (float)($b['salario']    ?? 0);
        $senha         = trim($b['senha']         ?? '123456');
        if (!$nome || !$email) jsonResponse(false,'Nome e email são obrigatórios.');
        if (!validarEmail($email)) jsonResponse(false,'Email inválido.');
        $check = $pdo->prepare('SELECT id FROM usuarios WHERE email=? LIMIT 1');
        $check->execute([$email]);
        if ($check->fetch()) jsonResponse(false,'Email já cadastrado.');
        $avatar = strtoupper(substr($nome,0,1)).strtoupper(substr(explode(' ',$nome)[1]??'X',0,1));
        $pdo->prepare('INSERT INTO usuarios (nome,email,senha,tipo,avatar) VALUES (?,?,?,?,?)')->execute([$nome,$email,$senha,'funcionario',$avatar]);
        $userId = (int)$pdo->lastInsertId();
        $pdo->prepare('INSERT INTO funcionarios (usuario_id,nome,email,telefone,especialidade,salario) VALUES (?,?,?,?,?,?)')->execute([$userId,$nome,$email,$telefone,$especialidade,$salario]);
        $newId = (int)$pdo->lastInsertId();
        $s = $pdo->prepare('SELECT * FROM funcionarios WHERE id=?'); $s->execute([$newId]);
        jsonResponse(true,'Funcionário cadastrado!', ['funcionario'=>$s->fetch()], 201);
        break;

    case 'PUT':
        if (!$id) jsonResponse(false,'ID não informado.');
        $b             = getJsonBody();
        $nome          = trim($b['nome']          ?? '');
        $email         = trim($b['email']         ?? '');
        $telefone      = trim($b['telefone']      ?? '');
        $especialidade = trim($b['especialidade'] ?? '');
        $salario       = (float)($b['salario']    ?? 0);
        if (!$nome || !$email) jsonResponse(false,'Nome e email são obrigatórios.');
        $pdo->prepare('UPDATE funcionarios SET nome=?,email=?,telefone=?,especialidade=?,salario=? WHERE id=? AND ativo=1')
            ->execute([$nome,$email,$telefone,$especialidade,$salario,$id]);
        $s = $pdo->prepare('SELECT * FROM funcionarios WHERE id=?'); $s->execute([$id]);
        jsonResponse(true,'Funcionário atualizado!', ['funcionario'=>$s->fetch()]);
        break;

    case 'DELETE':
        if (!$id) jsonResponse(false,'ID não informado.');
        $pdo->prepare('UPDATE funcionarios SET ativo=0 WHERE id=?')->execute([$id]);
        jsonResponse(true,'Funcionário removido!');
        break;

    default: jsonResponse(false,'Método não suportado.',[], 405);
}
