CREATE DATABASE oficina;
USE oficina;

CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    telefone VARCHAR(20)
);

CREATE TABLE veiculos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    placa VARCHAR(20)
);

CREATE TABLE ordens_servico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao TEXT,
    valor_total DECIMAL(10,2)
);

CREATE TABLE estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_peca VARCHAR(100),
    quantidade INT
);
