////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////// INSTITUTO POLITÉCNICO NACIONAL//////////////////////////////
///// UNIDAD PROFESIONAL INTERDISCIPLINARIA EN INGENIERÍA Y TECNOLOGÍAS AVANZADAS //////
///////////////////////////////// ING. TELEMÁTICA //////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////// RENDEZVOUS: APLICACIÓN WEB ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////

'use strict';

// Dependiendo del navegador se consiguen los flujos de cámara y micrófono
// Opera --> getUserMedia
// Chrome --> webkitGetUserMedia
// Firefox --> mozGetUserMedia
navigator.getUserMedia = navigator.getUserMedia ||
navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// Configuración ICE para conexion p2p
var pc_config = webrtcDetectedBrowser == 'firefox' ?  
{ 'iceServers': [{ 'url': 'stun:23.21.150.121' }] } :            // Firefox
{ 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }] };   // Chrome

// Habilitar la negociación de seguridad
var pc_constraints = {
    'optional': [
        { 'DtlsSrtpKeyAgreement': true }
    ]
};

// Características de la oferta SDP
//(REVISAR)
var sdpConstraints = {};

// Establecer características de getUserMedia 
var constraints = {
    "audio": true,
    "video": {
        "mandatory": {
            "minWidth": 320,
            "maxWidth": 320,
            "minHeight": 180,
            "maxHeight": 180
        },
        "optional": []
    }
}

//Variables de configuración de la instancia
var puerto = "3000";
var ip = "10.100.0.5";
var usuarioWeb = null;

/*
 * Crea una instancia de un usuario web y valida sus propiedades
 * De ser válido, redirecciona a la página de la sala de videoconferencia 
 */ 
function redireccionar() {
    
    // Inicio de operación con el usuario, ingresar nombre de la sala
    var nombre = document.getElementById('texto').value;
    console.log("Invocando la funciónd redireccionar: " + nombre);
    
    if (nombre.length > 0) {
        
        if (usuarioWeb == null) {
            console.log("Primera vez que se crea el usuario ...");
            usuarioWeb = new UsuarioWeb(nombre, ip, puerto);
            usuarioWeb.SuscribirEventosSocket(pc_config, pc_constraints, sdpConstraints, constraints);
        }
        else {
            console.log("Segunda vez que se crea el usuario ...");
            usuarioWeb.VolverARegistrar(nombre);
        }
        
        //Al salir de la sala, deben enviar un mensaje de bye
        window.onbeforeunload = function () {
            usuarioWeb.SalirSala();
        }
    }
    else {
        document.getElementById('mensajeError').innerHTML = "El campo no puede estar vacío";
        document.getElementById('oculto').style.display = 'block';
    }
}

/*
*Al presionar el botón, se sale de la página enviando mensaje de BYE 
*Se renderiza el login
*/
function salirSala() {
    //Envío del mensaje de BYE	
    usuarioWeb.SalirSala();

    //cargar el html de inicio de sesión ...
    console.log("Saliendo de la sala .....");
    var html = [
        '<!DOCTYPE html>',
        '<html lang="es">',
        '<head>',
        '    <link rel="stylesheet" type="text/css" href="assets/css/style.css"> ',
        '	<link href="http://fonts.googleapis.com/css?family=Raleway:500,600,700,100,800" rel="stylesheet" type="text/css">',
        '    <title>Rendez Vous</title>',
        '    <script type="text/javascript" src="s.js"></script>',
        '</head>',
        '<body>',
        '	<div id="logo">',
        '		<img src="assets/images/logo.png">',
        '	</div>',
        '	<div id="txWelcome">',
        '		</br>',
        '		<p style="font-size:20px;font-weight:bold;font-family: "Raleway";">Bienvenido(a)</p>',
        '		<p style="font-size:14px;font-family: "Raleway";">Ingresa tu nombre de usuario</p>',
        '		 <input type="text" id="texto"name="texto" value="" />',
        '		 </br>',
        '		 </br>',
        '        <input type="submit" id="btnEntrar" value="Entrar a la sala" onClick="reload()"/>',
        '		<p id="mensajeError" style="font-size:14px;font-weight:bold;color:#FF4000;font-family: "Raleway";"></p>',
        '	</div>',
        '</body>',
        '</html>',
        ''
    ].join('');

    document.body.innerHTML = html;
}


/*
*Al presionar el botón de SEND del softphone, se envía un mensaje al servidor para 
*llamar por medio del UsuarioPBX. Se bloquean los softphones de los demás.
*/
function llamarTel(){
	console.log("Se está haciendo una llamada telefónica ......");
	usuarioWeb.RealizarLlamadaTelefonica();
}







