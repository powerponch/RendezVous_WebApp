function cargarSoftphone(){
    document.getElementById("btnSend").onmouseover.src = 'assets/images/btnSend1';
    document.getElementById("btnSend").onmouseout.src = 'assets/images/btnSend2';
    document.getElementById("btnEend").onmouseover.src = 'assets/images/btnEnd1';
    document.getElementById("btnEend").onmouseout.src = 'assets/images/btnEnd2';
}

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

function hoverRojo(element) {
    element.setAttribute('src', 'assets/images/btnEnd1.png');
}
function unhoverRojo(element) {
    element.setAttribute('src', 'assets/images/btnEnd2.png');
}

function hoverVerde(element) {
    element.setAttribute('src', 'assets/images/btnSend1.png');
}
function unhoverVerde(element) {
    element.setAttribute('src', 'assets/images/btnSend2.png');
}

