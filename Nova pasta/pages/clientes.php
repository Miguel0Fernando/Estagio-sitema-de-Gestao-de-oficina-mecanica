<?php include '../config/database.php'; ?>
<h2>Cadastro de Clientes</h2>
<form method="POST">
Nome: <input type="text" name="nome"><br>
Telefone: <input type="text" name="telefone"><br>
<input type="submit" value="Salvar">
</form>

<?php
if ($_POST) {
    $nome = $_POST['nome'];
    $telefone = $_POST['telefone'];
    $conn->query("INSERT INTO clientes (nome, telefone) VALUES ('$nome','$telefone')");
    echo "Cliente cadastrado!";
}
?>