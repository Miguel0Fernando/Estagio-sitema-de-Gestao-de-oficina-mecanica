<?php
// ============================================================
// api/ordens.php — CRUD Ordens de Serviço
// ============================================================
require_once __DIR__ . '/../includes/helpers.php';
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$db     = getDB();

switch ($method) {

    // ── GET — Listar ou buscar por ID ────────────────────────
    case 'GET':
        if ($id) {
            $stmt = $db->prepare("
                SELECT os.*,
                    c.nome AS cliente_nome, c.telefone AS cliente_telefone,
                    v.placa, v.modelo AS veiculo_modelo,
                    f.nome AS funcionario_nome
                FROM ordens_servico os
                JOIN clientes c ON c.id = os.cliente_id
                JOIN veiculos v ON v.id = os.veiculo_id
                LEFT JOIN funcionarios f ON f.id = os.funcionario_id
                WHERE os.id = ?
            ");
            $stmt->execute([$id]);
            $os = $stmt->fetch();
            if (!$os) jsonResponse(false, 'OS não encontrada.', [], 404);

            $ss = $db->prepare('SELECT * FROM ordem_servicos WHERE ordem_id = ?');
            $ss->execute([$id]);
            $os['servicos'] = $ss->fetchAll();

            $sp = $db->prepare('SELECT * FROM ordem_pecas WHERE ordem_id = ?');
            $sp->execute([$id]);
            $os['pecas'] = $sp->fetchAll();

            jsonResponse(true, '', ['ordem' => $os]);
        }

        $status = $_GET['status'] ?? '';
        $busca  = $_GET['busca']  ?? '';

        $where  = 'WHERE 1=1';
        $params = [];

        if ($status) { $where .= ' AND os.status = ?'; $params[] = $status; }
        if ($busca) {
            $like    = "%$busca%";
            $where  .= ' AND (c.nome LIKE ? OR v.placa LIKE ? OR os.codigo LIKE ?)';
            $params  = array_merge($params, [$like, $like, $like]);
        }

        $stmt = $db->prepare("
            SELECT os.id, os.codigo, os.status, os.valor_total, os.data_entrada, os.data_saida,
                c.nome AS cliente_nome, v.placa, v.modelo AS veiculo_modelo,
                f.nome AS funcionario_nome
            FROM ordens_servico os
            JOIN clientes c ON c.id = os.cliente_id
            JOIN veiculos v ON v.id = os.veiculo_id
            LEFT JOIN funcionarios f ON f.id = os.funcionario_id
            $where ORDER BY os.criado_em DESC
        ");
        $stmt->execute($params);
        jsonResponse(true, '', ['ordens' => $stmt->fetchAll()]);
        break;

    // ── POST — Criar OS ──────────────────────────────────────
    case 'POST':
        $b          = getJsonBody();
        $clienteId  = (int)($b['cliente_id']    ?? 0);
        $veiculoId  = (int)($b['veiculo_id']     ?? 0);
        $funcId     = isset($b['funcionario_id']) ? (int)$b['funcionario_id'] : null;
        $status     = $b['status']               ?? 'pending';
        $obs        = $b['observacoes']           ?? '';
        $servicos   = $b['servicos']              ?? [];
        $pecas      = $b['pecas']                 ?? [];

        if (!$clienteId || !$veiculoId) jsonResponse(false, 'Cliente e veículo são obrigatórios.');

        // Calcular total
        $totalS = array_sum(array_column($servicos, 'valor'));
        $totalP = array_reduce($pecas, fn($c, $p) => $c + ((float)($p['quantidade'] ?? 1) * (float)($p['valor_unitario'] ?? 0)), 0);
        $total  = $totalS + $totalP;

        // Gerar código
        $cnt    = $db->query("SELECT COUNT(*) FROM ordens_servico")->fetchColumn();
        $codigo = 'OS' . str_pad($cnt + 1, 4, '0', STR_PAD_LEFT);

        $db->beginTransaction();
        try {
            $db->prepare("INSERT INTO ordens_servico (codigo, cliente_id, veiculo_id, funcionario_id, status, valor_total, observacoes, data_entrada)
                VALUES (?,?,?,?,?,?,?,CURDATE())")
                ->execute([$codigo, $clienteId, $veiculoId, $funcId, $status, $total, $obs]);
            $osId = (int)$db->lastInsertId();

            foreach ($servicos as $s) {
                if (empty($s['nome'])) continue;
                $db->prepare("INSERT INTO ordem_servicos (ordem_id, nome, valor) VALUES (?,?,?)")
                   ->execute([$osId, $s['nome'], (float)($s['valor'] ?? 0)]);
            }

            foreach ($pecas as $p) {
                if (empty($p['nome'])) continue;
                $qtd   = max(1, (int)($p['quantidade'] ?? 1));
                $vUnit = (float)($p['valor_unitario'] ?? 0);
                $prodId = isset($p['produto_id']) ? (int)$p['produto_id'] : null;
                $db->prepare("INSERT INTO ordem_pecas (ordem_id, produto_id, nome, quantidade, valor_unitario) VALUES (?,?,?,?,?)")
                   ->execute([$osId, $prodId, $p['nome'], $qtd, $vUnit]);

                if ($prodId) {
                    $db->prepare("UPDATE produtos SET quantidade = quantidade - ? WHERE id = ? AND quantidade >= ?")
                       ->execute([$qtd, $prodId, $qtd]);
                }
            }

            // Atualizar status do veículo
            $db->prepare("UPDATE veiculos SET ultima_visita = CURDATE(), status = 'Em oficina' WHERE id = ?")
               ->execute([$veiculoId]);

            $db->commit();
            jsonResponse(true, 'OS criada com sucesso!', ['id' => $osId, 'codigo' => $codigo]);
        } catch (Exception $e) {
            $db->rollBack();
            jsonResponse(false, 'Erro ao criar OS: ' . $e->getMessage(), [], 500);
        }
        break;

    // ── PUT — Actualizar OS ──────────────────────────────────
    case 'PUT':
        if (!$id) jsonResponse(false, 'ID não informado.');
        $b      = getJsonBody();
        $status = $b['status'] ?? null;
        $funcId = isset($b['funcionario_id']) ? (int)$b['funcionario_id'] : null;
        $obs    = $b['observacoes'] ?? null;

        $sets = []; $params = [];
        if ($status) { $sets[] = 'status = ?';         $params[] = $status; }
        if ($funcId) { $sets[] = 'funcionario_id = ?'; $params[] = $funcId; }
        if ($obs !== null) { $sets[] = 'observacoes = ?'; $params[] = $obs; }
        if ($status === 'completed') { $sets[] = 'data_saida = CURDATE()'; }

        if (empty($sets)) jsonResponse(false, 'Nada para actualizar.');
        $params[] = $id;
        $db->prepare('UPDATE ordens_servico SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);

        // Restaurar status do veículo se concluído/cancelado
        if (in_array($status, ['completed', 'cancelled'])) {
            $v = $db->prepare('SELECT veiculo_id FROM ordens_servico WHERE id = ?');
            $v->execute([$id]);
            $os = $v->fetch();
            if ($os) $db->prepare("UPDATE veiculos SET status = 'Normal' WHERE id = ?")->execute([$os['veiculo_id']]);
        }

        jsonResponse(true, 'OS actualizada!');
        break;

    // ── DELETE — Cancelar OS ─────────────────────────────────
    case 'DELETE':
        if (!$id) jsonResponse(false, 'ID não informado.');
        $db->prepare("UPDATE ordens_servico SET status = 'cancelled' WHERE id = ?")->execute([$id]);
        jsonResponse(true, 'OS cancelada.');
        break;

    default:
        jsonResponse(false, 'Método não suportado.', [], 405);
}
