<?php
// =====================================================
// config/database.php
// Configuração da conexão com o banco de dados
// =====================================================

define('DB_HOST',     'localhost');
define('DB_USER',     'root');          // Altere para seu usuário MySQL
define('DB_PASS',     '');              // Altere para sua senha MySQL
define('DB_NAME',     'oficina_3yc');
define('DB_CHARSET',  'utf8mb4');

// Configurações da sessão
define('SESSION_NAME',    '3yc_session');
define('SESSION_TIMEOUT', 7200); // 2 horas em segundos

// URL base (sem barra no final)
define('BASE_URL', 'http://localhost/bm_backend/public/');

/**
 * Retorna uma conexão PDO com o banco de dados.
 */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST, DB_NAME, DB_CHARSET
        );
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode([
                'success' => false,
                'message' => 'Erro de conexão com o banco de dados: ' . $e->getMessage()
            ]));
        }
    }
    return $pdo;
}
