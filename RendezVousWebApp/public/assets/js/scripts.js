
// Función para validar que no se puedan agregar caracteres que no sean numéricos
function validaTeclado(evt) {
	var code = (evt.which) ? evt.which : evt.keyCode;
		if (code ==8) {
			return true;
		}
		else if (code>=48 && code <= 57) {
			return true;
		}
		else if(code == 42 || code == 35) {
			return true;
		}
		else {
			return false;
		}
}
// Función para mostrar numeros presionados en la pantalla del softphone
function agregaTexto(Tecla) {
	document.getElementById("pantalla").value += Tecla;
}
