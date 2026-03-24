<?php
// =====================================================
// includes/helpers.php
// Funções auxiliares globais
// =====================================================

require_once __DIR__ . '/../config/database.php';

function iniciarSessao(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_name(SESSION_NAME);
        session_set_cookie_params([
            'lifetime' => SESSION_TIMEOUT,
            'path'     => '/',
            'secure'   => false,
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();
    }
}

function getUsuarioLogado(): ?array {
    iniciarSessao();
    return $_SESSION['usuario'] ?? null;
}

function exigirLogin(): void {
    $u = getUsuarioLogado();
    if (!$u) jsonResponse(false, 'Não autenticado.', [], 401);
}

function exigirTipo(string ...$tipos): void {
    exigirLogin();
    $u = getUsuarioLogado();
    if (!in_array($u['tipo'], $tipos, true)) jsonResponse(false, 'Acesso negado.', [], 403);
}

function jsonResponse(bool $success, string $message = '', array $data = [], int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success'=>$success,'message'=>$message,'data'=>$data], JSON_UNESCAPED_UNICODE);
    exit;
}

function sanitize(string $value): string {
    return htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
}

function validarEmail(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function setCorsHeaders(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}

function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    return $raw ? (json_decode($raw, true) ?? []) : [];
}

function getPaginacao(int $total, int $porPagina, int $pagina): array {
    $totalPaginas = max(1, (int)ceil($total / $porPagina));
    $pagina       = max(1, min($pagina, $totalPaginas));
    $offset       = ($pagina - 1) * $porPagina;
    return compact('total','porPagina','pagina','totalPaginas','offset');
}

// Aliases para compatibilidade com dashboard.php, clientes.php, etc.
function resposta(mixed $dados, int $codigo = 200): void {
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => true, 'message' => '', 'data' => $dados], JSON_UNESCAPED_UNICODE);
    exit;
}

function erro(string $mensagem, int $codigo = 400): void {
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => $mensagem, 'data' => []], JSON_UNESCAPED_UNICODE);
    exit;
}

function getBody(): array {
    return getJsonBody();
}

function hashSenha(string $senha): string {
    return $senha; // Sem criptografia conforme solicitado
}

function gerarCodigoOS(): string {
    $db   = getDB();
    $stmt = $db->query("SELECT COUNT(*) as total FROM ordens_servico");
    $total = (int) $stmt->fetch()['total'];
    return 'OS' . str_pad($total + 1, 4, '0', STR_PAD_LEFT);
}
