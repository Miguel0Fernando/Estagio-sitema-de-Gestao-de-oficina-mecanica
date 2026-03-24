# 3YC AFRICANAS — Sistema de Gestão de Oficina Mecânica
## Guia de Instalação e Configuração

---

## Pré-requisitos

| Requisito | Versão mínima |
|-----------|---------------|
| PHP       | 8.0+          |
| MySQL     | 5.7+ / MariaDB 10.3+ |
| Apache    | 2.4+ (com mod_rewrite) |
| Navegador | Chrome, Firefox, Edge (moderno) |

> **Recomendado:** XAMPP, WAMP, Laragon ou servidor Linux com Apache + MySQL

---

## Estrutura do Projeto

```
3yc_oficina/
├── api/                    ← Back-end PHP (endpoints REST)
│   ├── auth.php            ← Login, logout, cadastro
│   ├── clientes.php        ← CRUD Clientes
│   ├── veiculos.php        ← CRUD Veículos
│   ├── funcionarios.php    ← CRUD Funcionários
│   ├── produtos.php        ← CRUD Estoque
│   ├── ordens.php          ← CRUD Ordens de Serviço
│   ├── usuarios.php        ← CRUD Usuários (admin)
│   └── dashboard.php       ← Estatísticas e gráficos
│
├── config/
│   ├── database.php        ← Configuração da conexão MySQL ⚠️ EDITE AQUI
│   └── database.sql        ← Script SQL para criar o banco
│
├── includes/
│   └── helpers.php         ← Funções auxiliares da API
│
├── public/ (front-end)
│   ├── index.html          ← Página inicial / login
│   ├── dashboard.html      ← Painel de gestão
│   └── assets/
│       ├── css/            ← Estilos CSS
│       └── js/
│           ├── api.js      ← Cliente HTTP para a API ← NOVO
│           ├── auth.js     ← Autenticação real       ← NOVO
│           └── dashboard.js← Dashboard completo      ← NOVO
│
├── .htaccess               ← Configuração Apache
└── README.md               ← Este arquivo
```

---

## Passo a Passo de Instalação

### 1. Copiar os arquivos

Copie toda a pasta `3yc_oficina` para dentro da pasta do servidor:

- **XAMPP (Windows):** `C:\xampp\htdocs\3yc_oficina\`
- **WAMP (Windows):**  `C:\wamp64\www\3yc_oficina\`
- **Laragon:**         `C:\laragon\www\3yc_oficina\`
- **Linux/Apache:**    `/var/www/html/3yc_oficina/`

---

### 2. Criar o banco de dados

1. Abra o **phpMyAdmin** (geralmente em `http://localhost/phpmyadmin`)
2. Clique em **"Novo"** para criar um banco de dados
3. Nomeie como `oficina_3yc` e selecione `utf8mb4_unicode_ci`
4. Clique em **"Criar"**
5. Clique na aba **"SQL"** e cole o conteúdo do arquivo `config/database.sql`
6. Clique em **"Executar"**

Ou via terminal MySQL:
```sql
mysql -u root -p < config/database.sql
```

---

### 3. Configurar a conexão com o banco

Abra o arquivo `config/database.php` e edite as credenciais:

```php
define('DB_HOST', 'localhost');   // Geralmente "localhost"
define('DB_USER', 'root');        // Seu usuário MySQL
define('DB_PASS', '');            // Sua senha MySQL (vazio se não tiver)
define('DB_NAME', 'oficina_3yc'); // Nome do banco (não altere)
```

---

### 4. Acessar o sistema

Abra o navegador e acesse:

```
http://localhost/3yc_oficina/public/
```

---

## Usuários Padrão (criados pelo seed)

| Tipo          | E-mail               | Senha    |
|---------------|----------------------|----------|
| Administrador | admin@3yc.com        | 123456   |
| Funcionário   | joao@3yc.com         | 123456   |
| Funcionário   | pedro@3yc.com        | 123456   |
| Cliente       | maria@email.com      | 123456   |
| Cliente       | joao.s@email.com     | 123456   |

> ⚠️ **Em produção:** altere as senhas após o primeiro acesso!

---

## Funcionalidades por Perfil

### 👑 Administrador
- Dashboard com gráficos em tempo real
- CRUD completo de Clientes, Veículos, Funcionários
- Criar, editar e cancelar Ordens de Serviço
- Gestão de Estoque com alertas de nível baixo
- Gerenciamento de Usuários do sistema

### 🔧 Funcionário
- Ver suas ordens atribuídas
- Atualizar status das ordens
- Consultar estoque

### 🚗 Cliente
- Visualizar seus veículos
- Acompanhar suas ordens de serviço
- Ver histórico e valores

---

## API REST — Endpoints

| Método | Endpoint                        | Descrição              |
|--------|---------------------------------|------------------------|
| POST   | `/api/auth.php?acao=login`      | Fazer login            |
| POST   | `/api/auth.php?acao=logout`     | Fazer logout           |
| POST   | `/api/auth.php?acao=cadastro`   | Cadastrar usuário      |
| GET    | `/api/dashboard.php?tipo=admin` | Stats do dashboard     |
| GET    | `/api/clientes.php`             | Listar clientes        |
| POST   | `/api/clientes.php`             | Criar cliente          |
| PUT    | `/api/clientes.php?id=1`        | Atualizar cliente      |
| DELETE | `/api/clientes.php?id=1`        | Remover cliente        |
| GET    | `/api/veiculos.php`             | Listar veículos        |
| GET    | `/api/funcionarios.php`         | Listar funcionários    |
| GET    | `/api/ordens.php`               | Listar ordens          |
| POST   | `/api/ordens.php`               | Criar OS               |
| GET    | `/api/produtos.php`             | Listar estoque         |
| PUT    | `/api/produtos.php?id=1`        | Ajustar estoque        |

---

## Solução de Problemas

**"Erro de conexão com o banco de dados"**
→ Verifique `config/database.php` e se o MySQL está rodando.

**"Não autorizado" ao fazer login**
→ Verifique se o banco foi importado corretamente com o `database.sql`.

**Página em branco no dashboard**
→ Abra o Console do navegador (F12) e verifique se a URL da API está correta.

**Erros CORS**
→ Certifique-se que o `.htaccess` está na raiz e que `mod_rewrite` está habilitado no Apache.

---

## Suporte

Sistema desenvolvido para **3YC AFRICANAS**.  
Para suporte, entre em contato com o desenvolvedor.
