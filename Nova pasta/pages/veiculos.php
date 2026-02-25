<?php include '../config/database.php'; ?>
<h2>Cadastro de Veículos</h2>
<form method="POST">
Marca: <input type="text" name="marca"><br>
Modelo: <input type="text" name="modelo"><br>
Placa: <input type="text" name="placa"><br>
<input type="submit" value="Salvar">
</form>

<?php
if ($_POST) {
    $marca = $_POST['marca'];
    $modelo = $_POST['modelo'];
    $placa = $_POST['placa'];
    $conn->query("INSERT INTO veiculos (marca, modelo, placa) VALUES ('$marca','$modelo','$placa')");
    echo "Veículo cadastrado!";
}
?>