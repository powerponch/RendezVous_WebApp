////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////// INSTITUTO POLITÉCNICO NACIONAL//////////////////////////////
///// UNIDAD PROFESIONAL INTERDISCIPLINARIA EN INGENIERÍA Y TECNOLOGÍAS AVANZADAS //////
///////////////////////////////// ING. TELEMÁTICA //////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////// RENDEZVOUS: CONEXIÓN A PBX ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////

'use strict';

// Crea una nueva instancia de UsuarioPBX 
function ConexionPBX(){

	// Variables de la instancia de UsuarioPBX
	var dirServidor = "127.0.0.1";
	var puerto = "3000";
	var dirAsterisk = "127.0.0.1";
	var usuarioPBX = null;

	// Dependiendo del navegador se consiguen los flujos de cámara y micrófono
	// Opera --> getUserMedia
	// Chrome --> webkitGetUserMedia
	// Firefox --> mozGetUserMedia
	navigator.getUserMedia = navigator.getUserMedia ||
	navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

	// Configuración ICE para conexion p2p
	var pc_config = { 'iceServers': [{ 'url': 'stun:23.21.150.121' }] };            // Firefox

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
	    "video": false
	}

	//Creación de la instancia 
	usuarioPBX= new UsuarioPBX(dirServidor,puerto,dirAsterisk);
	usuarioPBX.RegistrarUA();
	usuarioPBX.SuscribirEventosSocket(pc_config, pc_constraints, sdpConstraints, constraints);
}
