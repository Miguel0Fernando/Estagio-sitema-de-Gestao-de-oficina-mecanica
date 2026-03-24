<?php
// ============================================================
// api/pagamentos.php — CRUD de Pagamentos
// ============================================================
require_once __DIR__ . '/../includes/helpers.php';
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$db     = getDB();

switch ($method) {

    case 'GET':
        if ($id) {
            $stmt = $db->prepare("
                SELECT p.*, c.nome as cliente_nome, os.codigo as os_codigo
                FROM pagamentos p
                JOIN clientes c ON c.id = p.cliente_id
                JOIN ordens_servico os ON os.id = p.ordem_id
                WHERE p.id = ?
            ");
            $stmt->execute([$id]);
            $pag = $stmt->fetch();
            if (!$pag) jsonResponse(false, 'Pagamento não encontrado.', [], 404);
            jsonResponse(true, '', ['pagamento' => $pag]);
        }

        $ordem_id  = isset($_GET['ordem_id'])  ? (int)$_GET['ordem_id']  : 0;
        $cliente_id= isset($_GET['cliente_id']) ? (int)$_GET['cliente_id']: 0;
        $status    = $_GET['status'] ?? '';

        $where = 'WHERE 1=1'; $params = [];
        if ($ordem_id)   { $where .= ' AND p.ordem_id = ?';   $params[] = $ordem_id; }
        if ($cliente_id) { $where .= ' AND p.cliente_id = ?'; $params[] = $cliente_id; }
        if ($status)     { $where .= ' AND p.status = ?';     $params[] = $status; }

        $stmt = $db->prepare("
            SELECT p.*, c.nome as cliente_nome, os.codigo as os_codigo
            FROM pagamentos p
            JOIN clientes c ON c.id = p.cliente_id
            JOIN ordens_servico os ON os.id = p.ordem_id
            $where ORDER BY p.criado_em DESC
        ");
        $stmt->execute($params);
        jsonResponse(true, '', ['pagamentos' => $stmt->fetchAll()]);
        break;

    case 'POST':
        $b          = getJsonBody();
        $ordemId    = (int)($b['ordem_id']    ?? 0);
        $clienteId  = (int)($b['cliente_id']  ?? 0);
        $valor      = (float)($b['valor']     ?? 0);
        $metodo     = $b['metodo']             ?? 'dinheiro';
        $referencia = $b['referencia']         ?? '';
        $notas      = $b['notas']              ?? '';
        $dataPag    = $b['data_pagamento']     ?? date('Y-m-d');

        if (!$ordemId || !$clienteId || !$valor) jsonResponse(false, 'Ordem, cliente e valor são obrigatórios.');

        $db->beginTransaction();
        try {
            $db->prepare("INSERT INTO pagamentos (ordem_id, cliente_id, valor, metodo, status, referencia, notas, data_pagamento) VALUES (?,?,?,?,'pago',?,?,?)")
               ->execute([$ordemId, $clienteId, $valor, $metodo, $referencia, $notas, $dataPag]);
            $pagId = (int)$db->lastInsertId();

            // Marcar OS como concluída
            $db->prepare("UPDATE ordens_servico SET status='completed', data_saida=CURDATE() WHERE id=?")->execute([$ordemId]);

            // Atualizar total gasto do cliente
            $db->prepare("UPDATE clientes SET total_gasto = total_gasto + ? WHERE id=?")->execute([$valor, $clienteId]);

            // Gerar número de fatura
            $cnt    = $db->query("SELECT COUNT(*) FROM faturas")->fetchColumn();
            $numFat = 'FAT-' . date('Y') . '-' . str_pad($cnt + 1, 5, '0', STR_PAD_LEFT);

            // Buscar valor da OS
            $osStmt = $db->prepare("SELECT valor_total FROM ordens_servico WHERE id=?");
            $osStmt->execute([$ordemId]);
            $os = $osStmt->fetch();
            $subtotal = (float)($os['valor_total'] ?? $valor);
            $iva      = round($subtotal * 0.14, 2); // 14% IVA Angola

            $db->prepare("INSERT INTO faturas (numero, ordem_id, cliente_id, pagamento_id, valor_subtotal, valor_iva, valor_total, status) VALUES (?,?,?,?,?,?,?,'paga')")
               ->execute([$numFat, $ordemId, $clienteId, $pagId, $subtotal, $iva, $subtotal + $iva]);

            $db->commit();
            jsonResponse(true, 'Pagamento registado e fatura gerada!', ['pagamento_id' => $pagId, 'fatura' => $numFat], 201);
        } catch (Exception $e) {
            $db->rollBack();
            jsonResponse(false, 'Erro ao registar pagamento: ' . $e->getMessage(), [], 500);
        }
        break;

    case 'DELETE':
        if (!$id) jsonResponse(false, 'ID não informado.');
        $db->prepare("UPDATE pagamentos SET status='cancelado' WHERE id=?")->execute([$id]);
        jsonResponse(true, 'Pagamento cancelado.');
        break;

    default:
        jsonResponse(false, 'Método não suportado.', [], 405);
}
