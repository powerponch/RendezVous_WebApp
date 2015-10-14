/**
 * Clase UsuarioPBX
 * @param dirServidor: Dirección del servidor http de Asterisk
 * @param puerto: Puerto del servidor http de Asterisk
 **/ 
function UsuarioPBX(dirServidor, puerto, dirAsterisk) {
    var nombreUsuario = "pbx";
    var dirServidor = dirServidor;
    var puerto = puerto;
    var dirAsterisk= dirAsterisk; 
    
    //Banderas
    var isCanalListo = false;           //¿El canal esta listo?
    var isIniciaLlamada = false;        //¿Soy yo q//uien inicia la llamada?
    var isIniciado = [];                //¿La llamada ya se inició?
    var isPeticionLlamada=false; 	//¿Me solicitaron hacer una llamada telefónica?
    
    //Variables de sesión WebRTC
    var peers = new Array(2);           //Arreglo de flujos remotos
    var peerConnections = new Array(2); //Arreglo de usuarios remotos
    var idUsuario;                      //Id del usuario asignado por el servidor
    
    var flujoLocal;                     //Flujo multimedia de este eq//uipo de cómputo
    var socket;                         //Socket del usuario para comunicarse
    var constraints;                    //Objeto JSON para definir si se usará audio y/o video
    var pc_config;                      //Configuración ICE para conexion p2p
    var pc_constraints;                 //Habilitar la negociación de seguridad
    var sdpConstraints;
    
    //Variables de comunicación con Asterisk
    var ua = null;                       //User Agent de jsSIP
    var sesion_saliente = null;          //Sesión de una llamada saliente
    var sesion_entrante = null;          //Sesión de una llamada entrante
    var numTel; 			 //Número que se va a marcar
    var vozEntrante=null; 		 //Voz entrante de una llamada telefónica
  	


    //Variables de WebAudio
    var bufferAudio = null;
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    var context = new AudioContext();
    
    //************************Flujos multimedia de prueba
    var local_stream = null;
    var remote_stream = null;
    //***************************************************    

    //Inicialización del socket del usuario web
    try {
        socket = io.connect(dirServidor + ":" + puerto);
        console.log("CPBX ---> Socket creado y escuchando en la dirección: " + dirServidor + ":" + puerto);
        
        //Envío del mensaje REGISTER
        socket.emit('REGISTER', nombreUsuario);
        console.log("CPBX ---> (REGISTER) " + nombreUsuario);
    } catch (err) {
        console.error("(ERROR) NO FUE POSIBLE CONECTAR CON EL SERVIDOR DE SEÑALIZACIÓN " + err);
    }





    
    /*
     * Responde la llamada entrante
     * @param e: Objeto RTCSession de la nueva sesión 
     */ 
    ResponderLlamada =
    function (e) {
        console.log("CPBX ---> La llamada telefónica viene de fuera ...");
        sesion_entrante = e.session;
        
        //Suscripción a evento de recepción de flujo remoto de la sesión entrante
        sesion_entrante.on('addstream', function (e) {
            console.log("CPBX ---> Se ha recibido un flujo remoto ...");
            remote_stream = e.stream;

	    //(DE PRUEBA) mostrar el flujo entrante en la página web
            var theirMultimedia = document.getElementById('theirMultimedia');
            theirMultimedia = JsSIP.rtcninja.attachMediaStream(theirMultimedia, remote_stream);
        });
        
        //Suscripción a evento de recepción de flujo remoto de la sesión entrante
        sesion_entrante.on('ended', function (e) {
            console.log("CPBX ---> Terminó la llamada entrante .....");
        });
        
        //parámetros de la llamada
        var options = { 'mediaConstraints': { 'audio': true, 'video': false } };
        
        //atendiendo la llamada
        sesion_entrante.answer(options);
    };



    


    /*
     * Registra al usuario PBX en el servidor Asterisk
     */ 
    this.RegistrarUA =
    function () {
        console.log("CPBX ---> Iniciando creación del UA SIP....");
        
        //Configuración de conexión
        var configuration = {
            uri: "sip:8000@" + dirAsterisk,
            password: "rendezvous080193",
            ws_servers: "ws://" + dirAsterisk + ":8088/ws",
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
        ua.on('newRTCSession', function (e) {
            if (e.originator == "local") console.log("CPBX ---> Sesión RTC en progreso");
            
            //Si la llamada es foránea, se tiene qué responder de inmediato
            if (e.originator == "remote") ResponderLlamada(e);
        });
        
        //Registro del agente de usuario
        ua.start();
	console.log("CPBX ---> Usuario asterisk registrado");
    };




    
    /*
     * Se realiza una nueva llamada utilizando el servidor Asterisk 
     */ 
    NuevaLlamada =
    function () {
        console.log("CPBX ---> Intentando hacer una llamada a "+numTel);
        
        //DOM de contenedores de video
        var myMultimedia = document.getElementById('myMultimedia');
        
        // Register callbacks to desired call events
        var eventH = {
            'progress': function (e) {
                console.log('CPBX ---> LLAMADA EN PROGRESO ...........');
            },
            'failed': function (e) {
                console.log('CPBX ---> LA LLAMADA FALLÓ DEBIDO A: ' + e.data.cause);
		ColgarLlamada();
            },
            'ended': function (e) {
                console.log('CPBX ---> YA TERMINÓ LA LLAMADA: ');
		ColgarLlamada();
            },
            'confirmed': function (e) {
                console.log('CPBX ---> LLAMADA CONFIRMADA');
            },
            'addstream': function (e) {
                remote_stream = e.stream;
                console.log('CPBX ---> FLUJO REMOTO RECIBIDO');

                // Mostrar el audio de la llamada 
                myMultimedia = JsSIP.rtcninja.attachMediaStream(myMultimedia, remote_stream);
		
		//intercambio del flujo
		vozEntrante=remote_stream;

		//reemplazo del flujo de audio con la sala de videoconferencia
		var i=0;
		peerConnections.forEach(function(item){
			if(isIniciado[i]){
				console.log("CPBX ---> Reemplazando el flujo de "+i);
				item.addStream(vozEntrante);
				CrearOfertaSDP(i);
			}
			i++;
		});
            }
        };
        
        //parámetros de la llamada
        var options = {
            'eventHandlers': eventH,
            'mediaConstraints': {
                'audio': true,
                'video': false
            },
	    'mediaStream':local_stream
        };
        
        //Llamando
        sesion_saliente = ua.call('sip:' + numTel + '@' + dirAsterisk, options);
        console.log("CPBX ---> Marcando (sip:" + numTel + '@' + dirAsterisk)+")";
    };
    
   
    
    /*
    *Cuelga la llamada actual
    */
    ColgarLlamada =
    function () {
        console.log("CPBX ---> Colgando la llamada actual ......");
        
        if (sesion_saliente != null) {
            try {
                sesion_saliente.terminate();
            } catch (err) { }
        }
        
        if (sesion_entrante != null) {
            try {
                sesion_entrante.terminate();
            } catch (err) { }
        }

	//Reset de los flujos propios
	vozEntrante=null;
	remote_stream=null;

	//Reset de los flujos y peerConnections foráneos
	peerConnections[0]=null;
	peerConnections[1]=null;
	peerConnections[2]=null;
	peers[0]=null;
	peers[1]=null;
	peers[2]=null;

	isIniciaLlamada = false;
        isIniciado[0] = false;
	isIniciado[1] = false;
	isIniciado[2] = false;

	socket.emit("BYE", idUsuario);
    };
    
    


    
    /*
     *Envía un mensaje con el formato [cabecera][contenido {de:,para:,mensaje:}]
     */
    EnviarMensaje =
    function (cabecera, destino, contenido) {
        //console.log("CC ---> Enviando el mensaje: (" + cabecera + ") " + contenido);
        socket.emit(cabecera, { de: idUsuario, nombre: nombreUsuario, para: destino, contenido: contenido });
    };

    
 
    
    /*
     * Función que se ejecuta al remover flujos remotos
     */ 
    QuitarPeer = 
    function (event) {
        console.log('CPBX ---> Se removió el flujo remoto ' + event);
    }
    
    
    /*
     * Crea una instancia de PeerConnection entre dos usuarios
     * @clienteDestno: valor numérico del cliente con q//uien se conectará éste
     */ 
    CrearPeerConnection =
    function (clienteDestino) {
        console.log("CPBX ---> Ejecutando función CrearPeerConnection");
        
        // Inicializa la variable pc, que será el PeerConnection con el otro usuario
        // 1.- Añade la configuración y las características
        // 2.- Agrega el flujo multimedia local
        // 3.- Asigna el listener de eventos para cuando se tenga un candidato ICE
        // 4.- Asigna el listener de eventos para cuando se agregue un flujo externo
        // 5.- Asigna el listener de eventos para cuando se q//uite un flujo externo
        
        var pc;
        try {
            pc = new RTCPeerConnection(pc_config, pc_constraints);
            pc.addStream(flujoLocal);
            
            //Si recibo un candidato ICE del otro usuario
            pc.onicecandidate = function (event) {
                
                if (event.candidate) {
                    EnviarMensaje("MESSAGE",
                        clienteDestino,
                        {
                        type: 'candidate',
                        label: event.candidate.sdpMLineIndex,
                        id: event.candidate.sdpMid,
                        candidate: event.candidate.candidate
                    });
                } else {
                    console.log('CPBX ---> Fin de los candidatos');
                }
            }
        } catch (e) {
            console.log('CPBX ---> Falló al crear el PeerConnection, excepción: ' + e.message);
            return;
        }
        
        //Si recibo el flujo del otro usuario
        pc.onaddstream = function (event) {
            console.log('CPBX ---> Recibí un flujo remoto de: ' + clienteDestino);
            peers[clienteDestino] = event.stream;

            var theirMultimedia = document.getElementById('theirMultimedia');
	    //attachMediaStream(theirMultimedia, event.stream);

	    local_stream=event.stream;
	    NuevaLlamada(); 
        }
        
        //Si debo remover el flujo del otro usuario
        pc.onremovestream = QuitarPeer;
        
        //Almacenar el nuevo pc en el arreglo local
        peerConnections[clienteDestino] = pc;
        console.log('CPBX ---> He agregado en el arreglo peerConnections en la posicion: ' + clienteDestino + ' el pc');
    };
    
    
    /*
     * Muestra el error de señalización, de haberlo
     */ 
    OnSignalingError = 
    function (error) {
        console.log('CPBX ---> Fallo al crear la señalización : ' + error.name);
    };
    
    
    /*
     * Creación de la oferta SDP a enviar con una función de la API de WebRTC 
     * @clienteDestno: valor numérico del cliente con q//uien se conectará éste
     */ 
    CrearOfertaSDP = 
    function (clienteDestino) {
        // Se pueden invocar las sig//uientes funciones después de crearse:
        // 1.- AgregarDescripcionLocal si fue exitosa la creación
        // 2.- onSignalingError si no fue exitosa
        console.log('CPBX ---> Ejecutando CrearOfertaSDP. Creando oferta...');
        var pc = peerConnections[clienteDestino];
        
        //Se crea la ofertaSDP y se envía
        pc.createOffer(function (sdp) {
            //Se se tiene éxito, se asocia al pc y se envía
            //Esperaríamos que tuviera el tipo "offer"
            pc.setLocalDescription(sdp),
            EnviarMensaje("MESSAGE", clienteDestino, sdp)
        },
         function (e) {
            //Si se tiene un error, se manda al log
            OnSignalingError(e);
        },
            {
            //Los parámetros que se le pasan son los constraints
            mandatory: sdpConstraints
        });
    };
    
    
    /*
     * Creación de una respuesta SDP
     * @clienteDestno: valor numérico del cliente con q//uien se conectará éste
     */ 
    CrearRespuestaSDP =
    function (clienteDestino) {
        console.log('CPBX ---> Creando respuesta al otro usuario');
        var pc = peerConnections[clienteDestino];
        
        //Se crea la ofertaSDP y se envía
        pc.createAnswer(function (sdp) {
            //Se se tiene éxito, se asocia al pc y se envía
            //Esperaríamos que tuviera el tipo "offer"
            pc.setLocalDescription(sdp),
            EnviarMensaje("MESSAGE", clienteDestino, sdp)
        },
     function (e) {
            //Si se tiene un error, se manda al log
            OnSignalingError(e);
        },
        {
            //Los parámetros que se le pasan son los constraints
            mandatory: sdpConstraints
        });
    };
    
    
    /*
     * Activa la negociación en el canal con otro usuario 
     * @clienteDestino: id del usuario con q//uien se negociará
     */ 
    RevisarStatusCanal = 
    function (clienteDestino) {
        console.log("CPBX ---> Ejecutando función RevisarStatusCanal");
        console.log("CPBX ---> Banderas: isIniciado= " + isIniciado[clienteDestino] + ", isCanalListo= " + isCanalListo + "isIniciaLlamada= " + isIniciaLlamada);
        
        // Si el canal está listo, se tienen los flujos locales pero no se ha iniciado la llamada,
        // es necesario crear un PeerConnection para comenzar la negociación WebRTC
        if (!isIniciado[clienteDestino] && typeof flujoLocal != 'undefined' && isCanalListo) {
            
            CrearPeerConnection(clienteDestino);
            isIniciado[clienteDestino] = true;
            console.log("CPBX ---> Se ha creado un PeerConnection con el otro usuario (isIniciado: " + isIniciado[clienteDestino] + ")");
            
            // Si yo inicié se ejecuta la función CrearOfertaSDP
            if (isIniciaLlamada) {
                CrearOfertaSDP(clienteDestino);
            }
        }
    };
    





CrearTonoMarcando =
    function () {
        //galería de tonos disponibles
        var tonoLlamada = 'assets/tonos/tonoLlamada.wav';
        
        //carga asíncrona en un buffer
        var request = new XMLHttpRequest();
        request.open('GET', tonoLlamada, true);
        request.responseType = 'arraybuffer';
        
        request.onload = function () {
            console.log('CPBX ---> Guardando en buffer...');
            context.decodeAudioData(request.response, function (buffer) {
                bufferAudio = buffer;
                console.log("CPBX ---> Buffer listo");
                EnviarTono();
            });
        }
        request.send();
    };
    
    EnviarTono =
    function () {
       //Establecer como flujo local
       var source = context.createBufferSource();
        source.buffer = bufferAudio;
        source.loop = true;
        source.connect(context.destination);
        
        // crear un destino para el navegador web remoto
        var remote = context.createMediaStreamDestination();

        // conectar el destino remoto a la fuente de audio
        source.connect(remote);
        flujoLocal = remote.stream;
	console.log("CPBX ---> Tono de invitación cargado");
    };
    






    /*
     * Suscribe el socket de este usuario web a eventos para
     * gestionar la conexión
     */ 
    this.SuscribirEventosSocket =
    function (_pc_config, _pc_constraints, _sdpConstraints, _constraints) {
        
        //Registro de las configuraciones
        pc_config = _pc_config;
        pc_constraints = _pc_constraints;
        sdpConstraints = _sdpConstraints;
        constraints = _constraints;
        
        //Cuando reciba OK
        socket.on("OK", function (usuario) {
            console.log("CPBX ---> (OK): " + usuario);
            idUsuario = usuario;
            isCanalListo = true;
	    CrearTonoMarcando();
        });
        
        //Cuando reciba Service Unavailable
        socket.on("Service Unavailable", function (error) {
        });
        
        //Cuando reciba INVITE
        /**socket.on("INVITE", function (mensaje) {
            console.log("(INVITE)");
            //ui.agregaTextoLog("(INVITE)");
            console.log(mensaje);
            RevisarStatusCanal(mensaje.de);
        });**/
        
        //Cuando reciba MESSAGE
        socket.on("MESSAGE", function (mensaje) {
            
            //ui.NuevoUsuario(mensaje.de, mensaje.nombre);
            
            if (mensaje.contenido.type == 'offer') {
                console.log("CPBX ---> (MESSAGE) type: offer de (" + mensaje.de + ")");
                // Esta es una oferta SDP
                // Si no soy quien inició la llamada, y aún no se
                // ha arrancado la comunicación, se debe revisar el estado del canal
                if (!isIniciaLlamada && !isIniciado[mensaje.de]) {
                    RevisarStatusCanal(mensaje.de);
                }
                
                // Se guarda la oferta SDP como descripción remota
                // Esta función es de la API de WebRTC
                // Después, se envía una respuesta 
                peerConnections[mensaje.de].setRemoteDescription(new RTCSessionDescription(mensaje.contenido));
                console.log('CPBX ---> Se guardó la oferta SDP');
                CrearRespuestaSDP(mensaje.de);
        								 
            } else if (mensaje.contenido.type == 'answer' && isIniciado[mensaje.de]) {
                // Esta es una respuesta SDP
                // Se guarda como una descripción remota
                peerConnections[mensaje.de].setRemoteDescription(new RTCSessionDescription(mensaje.contenido));
                console.log('CPBX ---> Se guardó la respuesta SDP');

            } else if (mensaje.contenido.type == 'candidate' && isIniciado[mensaje.de]) {
                // Llega candidato de ICE para acceder a la IP privada	
                // Se almacena en una estructura JSON directamente con
                // una función de la API de WebRTC	
                // Después, se agrega a la conexión del peer actual 
                var candidate = new RTCIceCandidate({
                    sdpMLineIndex: mensaje.contenido.label,
                    candidate: mensaje.contenido.candidate
                });
                peerConnections[mensaje.de].addIceCandidate(candidate);
                console.log('CPBX ---> Se agregó al candidato ICE');

            }else if(mensaje.contenido.type == 'hangup'){
		// Petición para colgar la llamada actual
		console.log("CPBX ---> Colgando la llamada actual ....");
		ColgarLlamada();
		
            }
            else if(mensaje.contenido.type=="call"){
		// Petición de marcación para el PBX
		console.log("CPBX ---> Se desea marcar al número "+mensaje.contenido);
		numTel="9"+mensaje.contenido.number;
		EnviarMensaje("INVITE", idUsuario, nombreUsuario);

	    }else{
		// Un nuevo usuario llegó a la sala
                console.log("CPBX ---> Ha llegado un nuevo usuario: " + mensaje.contenido);
                isCanalListo = true;
                isIniciaLlamada = true;
                 }                                                                                                                                                                          
        });
        
        //Cuando reciba BYE
        socket.on("BYE", function (clienteDestino) {
            console.log("CPBX ---> (BYE): " + clienteDestino);
            if (isIniciado[clienteDestino]) {
                //// Si el mensaje recibido es bye y ya se inició la llamada, el otro usuario colgó
                isIniciaLlamada = false;
                isIniciado[clienteDestino] = false;
                var pc = peerConnections[clienteDestino];
                if (pc) pc.close();
                pc = null;
            }
        });
    }
};



