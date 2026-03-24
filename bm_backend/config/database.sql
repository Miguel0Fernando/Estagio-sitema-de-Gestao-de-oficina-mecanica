-- ============================================================
-- 3YC AFRICANAS - Sistema de Gestão de Oficina Mecânica
-- Banco de Dados MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS oficina_3yc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE oficina_3yc;

-- ============================================================
-- TABELA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    tipo ENUM('admin','funcionario','cliente') NOT NULL DEFAULT 'cliente',
    avatar VARCHAR(10) DEFAULT NULL,
    ativo TINYINT(1) DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABELA: clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT DEFAULT NULL,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    telefone VARCHAR(30),
    endereco VARCHAR(255),
    nif VARCHAR(30),
    total_gasto DECIMAL(15,2) DEFAULT 0.00,
    data_cadastro DATE DEFAULT (CURRENT_DATE),
    ativo TINYINT(1) DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- TABELA: funcionarios
-- ============================================================
CREATE TABLE IF NOT EXISTS funcionarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT DEFAULT NULL,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    telefone VARCHAR(30),
    especialidade VARCHAR(100),
    salario DECIMAL(15,2) DEFAULT 0.00,
    ativo TINYINT(1) DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- TABELA: veiculos
-- ============================================================
CREATE TABLE IF NOT EXISTS veiculos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    placa VARCHAR(20) NOT NULL,
    cor VARCHAR(50),
    ano INT,
    ultima_visita DATE DEFAULT NULL,
    status ENUM('Normal','Em oficina','Aguardando peças') DEFAULT 'Normal',
    ativo TINYINT(1) DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- TABELA: produtos (estoque)
-- ============================================================
CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    categoria VARCHAR(80),
    quantidade INT DEFAULT 0,
    quantidade_minima INT DEFAULT 5,
    preco DECIMAL(15,2) DEFAULT 0.00,
    ativo TINYINT(1) DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABELA: ordens_servico
-- ============================================================
CREATE TABLE IF NOT EXISTS ordens_servico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    cliente_id INT NOT NULL,
    veiculo_id INT NOT NULL,
    funcionario_id INT DEFAULT NULL,
    status ENUM('pending','progress','completed','cancelled') DEFAULT 'pending',
    valor_total DECIMAL(15,2) DEFAULT 0.00,
    observacoes TEXT,
    data_entrada DATE DEFAULT (CURRENT_DATE),
    data_saida DATE DEFAULT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- TABELA: ordem_servicos (serviços de cada OS)
-- ============================================================
CREATE TABLE IF NOT EXISTS ordem_servicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ordem_id INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    valor DECIMAL(15,2) DEFAULT 0.00,
    FOREIGN KEY (ordem_id) REFERENCES ordens_servico(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- TABELA: ordem_pecas (peças usadas em cada OS)
-- ============================================================
CREATE TABLE IF NOT EXISTS ordem_pecas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ordem_id INT NOT NULL,
    produto_id INT DEFAULT NULL,
    nome VARCHAR(150) NOT NULL,
    quantidade INT DEFAULT 1,
    valor_unitario DECIMAL(15,2) DEFAULT 0.00,
    valor_total DECIMAL(15,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    FOREIGN KEY (ordem_id) REFERENCES ordens_servico(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- TABELA: movimentos_estoque
-- ============================================================
CREATE TABLE IF NOT EXISTS movimentos_estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    tipo ENUM('entrada','saida') NOT NULL,
    quantidade INT NOT NULL,
    motivo VARCHAR(200),
    ordem_id INT DEFAULT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    FOREIGN KEY (ordem_id) REFERENCES ordens_servico(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Admin
INSERT INTO usuarios (nome, email, senha, tipo, avatar) VALUES
('Admin Master', 'admin@3yc.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'AD'),
('João Mecânico', 'joao@3yc.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'funcionario', 'JM'),
('Pedro Sousa', 'pedro@3yc.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'funcionario', 'PS'),
('Maria Silva', 'maria@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'cliente', 'MS'),
('João Santos', 'joao.s@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'cliente', 'JS'),
('Ana Oliveira', 'ana@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'cliente', 'AO'),
('Carlos Lima', 'carlos@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'cliente', 'CL');
-- Nota: senha padrão é "password" (hash bcrypt do Laravel, compatível com PHP password_verify)

-- Clientes
INSERT INTO clientes (usuario_id, nome, email, telefone, endereco, nif, total_gasto, data_cadastro) VALUES
(4, 'Maria Silva', 'maria@email.com', '+244 923 456 789', 'Luanda', '123456789', 345000, '2023-01-15'),
(5, 'João Santos', 'joao.s@email.com', '+244 924 567 890', 'Luanda', '234567890', 125000, '2023-02-20'),
(6, 'Ana Oliveira', 'ana@email.com', '+244 925 678 901', 'Luanda', '345678901', 292000, '2023-03-10'),
(7, 'Carlos Lima', 'carlos@email.com', '+244 926 789 012', 'Luanda', '456789012', 230000, '2023-04-05');

-- Funcionários
INSERT INTO funcionarios (usuario_id, nome, email, telefone, especialidade, salario) VALUES
(2, 'João Mecânico', 'joao@3yc.com', '+244 927 123 456', 'Mecânico Geral', 250000),
(3, 'Pedro Sousa', 'pedro@3yc.com', '+244 928 234 567', 'Eletricista', 280000);

-- Veículos
INSERT INTO veiculos (cliente_id, modelo, placa, cor, ano, ultima_visita, status) VALUES
(1, 'Gol 2018', 'ABC-12-34', 'Branco', 2018, '2024-01-15', 'Em oficina'),
(1, 'Civic 2020', 'DEF-56-78', 'Preto', 2020, '2024-01-10', 'Normal'),
(2, 'Corolla 2019', 'GHI-90-12', 'Prata', 2019, '2024-01-05', 'Normal'),
(3, 'HB20 2021', 'JKL-34-56', 'Vermelho', 2021, '2024-01-18', 'Em oficina'),
(3, 'Onix 2020', 'MNO-78-90', 'Azul', 2020, '2024-01-12', 'Normal'),
(4, 'Tucson 2022', 'PQR-11-22', 'Branco', 2022, '2024-01-08', 'Normal');

-- Produtos / Estoque
INSERT INTO produtos (nome, categoria, quantidade, quantidade_minima, preco) VALUES
('Óleo 5W30', 'Óleo', 5, 15, 2500),
('Filtro de Óleo', 'Filtro', 4, 12, 1500),
('Pastilha de Freio', 'Freio', 3, 10, 3500),
('Vela de Ignição', 'Ignição', 8, 15, 800),
('Amortecedor', 'Suspensão', 15, 8, 15000),
('Filtro de Ar', 'Filtro', 20, 10, 1200),
('Correia Dentada', 'Motor', 6, 5, 4500),
('Rolamento de Roda', 'Suspensão', 10, 6, 6000);

-- Ordens de Serviço
INSERT INTO ordens_servico (codigo, cliente_id, veiculo_id, funcionario_id, status, valor_total, data_entrada) VALUES
('OS001', 1, 1, 1, 'progress', 85000, CURDATE()),
('OS002', 2, 3, 1, 'completed', 125000, DATE_SUB(CURDATE(), INTERVAL 1 MONTH)),
('OS003', 3, 4, 2, 'pending', 45000, DATE_SUB(CURDATE(), INTERVAL 2 MONTH)),
('OS004', 4, 6, 1, 'progress', 230000, DATE_SUB(CURDATE(), INTERVAL 1 WEEK));

-- Serviços das Ordens
INSERT INTO ordem_servicos (ordem_id, nome, valor) VALUES
(1, 'Troca de Óleo', 35000),
(1, 'Alinhamento', 25000),
(2, 'Manutenção Preventiva', 85000),
(3, 'Diagnóstico', 20000),
(4, 'Revisão de Freios', 80000),
(4, 'Alinhamento e Balanceamento', 35000);

-- Peças das Ordens
INSERT INTO ordem_pecas (ordem_id, produto_id, nome, quantidade, valor_unitario) VALUES
(1, 1, 'Óleo 5W30', 4, 2500),
(1, 2, 'Filtro de Óleo', 1, 1500),
(2, 1, 'Óleo 5W30', 4, 2500),
(2, 6, 'Filtro de Ar', 1, 1200),
(4, 3, 'Pastilha de Freio', 2, 3500);

-- ============================================================
-- TABELA: pagamentos
-- ============================================================
CREATE TABLE IF NOT EXISTS pagamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ordem_id INT NOT NULL,
    cliente_id INT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    metodo ENUM('dinheiro','transferencia','cartao','cheque','mpesa') DEFAULT 'dinheiro',
    status ENUM('pendente','pago','cancelado') DEFAULT 'pendente',
    referencia VARCHAR(100),
    notas TEXT,
    data_pagamento DATE DEFAULT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ordem_id) REFERENCES ordens_servico(id) ON DELETE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- TABELA: faturas
-- ============================================================
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
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (pagamento_id) REFERENCES pagamentos(id) ON DELETE SET NULL
) ENGINE=InnoDB;
