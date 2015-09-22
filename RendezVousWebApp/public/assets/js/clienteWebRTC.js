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

//Configuraciones temporales
var puerto = "3000";
var ip = "192.168.0.4";
var usuarioWeb = null;
var usuarioWeb2 = null;
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

function salirSala(){
    usuarioWeb.SalirSala();
    //cargar el html de inicio de sesión ...
}






