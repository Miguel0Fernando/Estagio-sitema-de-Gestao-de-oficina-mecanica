<?php include '../config/database.php'; ?>
<h2>Estoque</h2>
<form method="POST">
Peça: <input type="text" name="peca"><br>
Quantidade: <input type="number" name="quantidade"><br>
<input type="submit" value="Salvar">
</form>

<?php
if ($_POST) {
    $peca = $_POST['peca'];
    $quantidade = $_POST['quantidade'];
    $conn->query("INSERT INTO estoque (nome_peca, quantidade) VALUES ('$peca','$quantidade')");
    echo "Peça adicionada!";
}
?>