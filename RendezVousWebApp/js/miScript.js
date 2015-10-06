//User Agent de jsSIP
var ua = null;

//Sesión actual
var session = null;
var session_entrante=null;
var session_connection=null;

//Flujos multimedia
var local_stream = null;
var remote_stream = null;

//var servidorweb
var webserver= '127.0.0.1';

/*
*Registra el agente SIP
*/
function registerUA() {

    console.log("Iniciando creación del UA SIP....");

    //Configuración de conexión
    var configuration = {
        uri: "sip:8000@"+webserver,
        password: "rendezvous080193",
        ws_servers: "ws://"+webserver+":8088/ws",
        display_name: "UA WebRTC",
        authorization_user: null,
        register: true,
        register_expires: null,
        no_answer_timeout: null,
        trace_sip: true,
        stun_servers: null,
        turn_servers: null,
        use_preloaded_route: null,
        connection_recovery_min_interval: null,
        connection_recovery_max_interval: null,
        hack_via_tcp: null,
        hack_ip_in_contact: true	
    };

    //Registrar el softphone
    ua = new JsSIP.UA(configuration);

    //Definir acciones para cuando se reciba una llamada
    ua.on('newRTCSession', function(e){   

			console.log("llamada de algún tipo ...."); 
			if(e.originator=="local") console.log("Yo estoy haciendo la llamada");

			if(e.originator=="remote"){
			console.log("La llamada viene de fuera ...");
				session_entrante= e.session;

				//Suscripción a evento de recepción de flujo remoto de la sesión entrante
				session_entrante.on('addstream',function(e){
					console.log("Al parecer recibí un flujo remoto");
					var theirMultimedia = document.getElementById('theirMultimedia');
					remote_stream = e.stream;
            				console.log('FLUJO REMOTO RECIBIDO');
            				theirMultimedia = JsSIP.rtcninja.attachMediaStream(theirMultimedia, remote_stream);
            				console.log(remote_stream);
									}); 

				//Suscripción a evento de recepción de flujo remoto de la sesión entrante
				session_entrante.on('ended',function(e){
					console.log("Terminó la llamada entrante .....");
					
									});

				    //parámetros de la llamada
				    var options = {
					'mediaConstraints': {
					    'audio': true,
					    'video': false
					}
				    };

				//atendiendo la llamada
				session_entrante.answer(options);
			}
		});

    //Registro del agente de usuario
    ua.start();
}


/*
*Realiza una llamada telefónica
*/
function callAsterisk() {
    console.log("Intentando hacer una llamada ....");

    var numTel = document.getElementById('txtNumero').value;
    console.log(numTel);

    //DOM de contenedores de video
    var myMultimedia = document.getElementById('myMultimedia');

    var theirMultimedia = document.getElementById('theirMultimedia');

    // Register callbacks to desired call events
    var eventH = {
        'progress': function (e) {
            console.log('LLAMADA EN PROGRESO ...........');
        },
        'failed': function (e) {
            console.log('LA LLAMADA FALLÓ DEBIDO A: ' + e.data.cause);
        },
        'ended': function (e) {
            console.log('YA TERMINÓ LA LLAMADA: ');
        },
        'confirmed': function (e) {
            local_stream = session.connection.getLocalStreams()[0];
            console.log('LLAMADA CONFIRMADA');
            console.log(local_stream);
            // Attach local stream to selfView
            //myMultimedia = JsSIP.rtcninja.attachMediaStream(myMultimedia, local_stream);
            console.log(local_stream);
        },
        'addstream': function (e) {
            remote_stream = e.stream;
            console.log('FLUJO REMOTO RECIBIDO');
            console.log(remote_stream);
            // Attach remote stream to remoteView
            theirMultimedia = JsSIP.rtcninja.attachMediaStream(theirMultimedia, remote_stream);
            console.log(remote_stream);
        }
    };

    //parámetros de la llamada
    var options = {
        'eventHandlers': eventH,
        'mediaConstraints': {
            'audio': true,
            'video': false
        }
    };

    //Llamando
    session = ua.call('sip:' + numTel + '@'+webserver, options);
    console.log("Marcando ....");
}


/*
*Cuelga la llamada actual
*/
function colgarLlamada(){
console.log("Colgando la llamada actual ......");

	if(session!="null"){
		try{
			session.terminate();
		}catch(err){}
	}	

	if(session_entrante!="null"){
		try{
			session_entrante.terminate();
		}catch(err){}
	}	
}



