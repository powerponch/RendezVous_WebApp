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
var constraints = { video: true, audio: true };

// Inicio de operación con el usuario, ingresar nombre de la sala
var nombreUsuario;
nombreUsuario = prompt('Bienvenido! Por favor ingresa un nombre de usuario');
console.log("CC -> Mi nombre es: " + nombreUsuario);

// Creación de las instancias necesarias
var usuarioWeb = new UsuarioWeb(nombreUsuario, "192.168.0.4", "3000");
usuarioWeb.SuscribirEventosSocket(pc_config, pc_constraints, sdpConstraints,constraints);

// Cuando el cliente salga de la sala, se colgará su sesión
window.onbeforeunload = function (e) {
    usuarioWeb.SalirSala();
}

