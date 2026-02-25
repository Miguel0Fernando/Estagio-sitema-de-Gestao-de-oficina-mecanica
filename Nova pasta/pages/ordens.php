<?php include '../config/database.php'; ?>
<h2>Ordem de Serviço</h2>
<form method="POST">
Descrição: <textarea name="descricao"></textarea><br>
Valor: <input type="number" name="valor"><br>
<input type="submit" value="Salvar">
</form>

<?php
if ($_POST) {
    $descricao = $_POST['descricao'];
    $valor = $_POST['valor'];
    $conn->query("INSERT INTO ordens_servico (descricao, valor_total) VALUES ('$descricao','$valor')");
    echo "Ordem registrada!";
}
?>