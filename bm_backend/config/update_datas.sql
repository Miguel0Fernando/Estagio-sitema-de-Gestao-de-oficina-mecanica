-- ============================================================
-- Execute este ficheiro no phpMyAdmin (aba SQL)
-- para actualizar a base de dados
-- ============================================================
USE oficina_3yc;

-- Actualizar datas das ordens para aparecer nos gráficos
UPDATE ordens_servico SET data_entrada = CURDATE() WHERE id = 1;
UPDATE ordens_servico SET data_entrada = DATE_SUB(CURDATE(), INTERVAL 1 MONTH), data_saida = DATE_SUB(CURDATE(), INTERVAL 25 DAY) WHERE id = 2;
UPDATE ordens_servico SET data_entrada = DATE_SUB(CURDATE(), INTERVAL 2 MONTH) WHERE id = 3;
UPDATE ordens_servico SET data_entrada = DATE_SUB(CURDATE(), INTERVAL 1 WEEK) WHERE id = 4;

-- Criar tabela pagamentos (se não existir)
CREATE TABLE IF NOT EXISTS pagamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ordem_id INT NOT NULL,
    cliente_id INT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    metodo ENUM('dinheiro','transferencia','cartao','cheque','mpesa') DEFAULT 'dinheiro',
    status ENUM('pendente','pago','cancelado') DEFAULT 'pago',
    referencia VARCHAR(100),
    notas TEXT,
    data_pagamento DATE DEFAULT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ordem_id) REFERENCES ordens_servico(id) ON DELETE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Criar tabela faturas (se não existir)
CREATE TABLE IF NOT EXISTS faturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(20) NOT NULL UNIQUE,
    ordem_id INT NOT NULL,
    cliente_id INT NOT NULL,
    pagamento_id INT DEFAULT NULL,
    valor_subtotal DECIMAL(15,2) DEFAULT 0.00,
    valor_desconto DECIMAL(15,2) DEFAULT 0.00,
    valor_iva DECIMAL(15,2) DEFAULT 0.00,
    valor_total DECIMAL(15,2) NOT NULL,
    status ENUM('rascunho','emitida','paga','cancelada') DEFAULT 'emitida',
    notas TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ordem_id) REFERENCES ordens_servico(id) ON DELETE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SELECT 'Base de dados actualizada com sucesso!' AS resultado;
