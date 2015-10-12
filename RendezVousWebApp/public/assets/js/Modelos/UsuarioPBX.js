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
    var peers = new Array(3);           //Arreglo de flujos remotos
    var peerConnections = new Array(3); //Arreglo de usuarios remotos
    var idUsuario;                      //Id del usuario asignado por el servidor
    //var ui = new InterfazGrafica();     //Interfaz gráfica del usuario
    
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


    //Variables de WebAudio
    var bufferAudio = null;
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    var context = new AudioContext();
    
    //************************Flujos multimedia de prueba
    var local_stream = null;
    var remote_stream = null;
    var numTel; 
    
    //Inicialización del socket del usuario web
    try {
        socket = io.connect(dirServidor + ":" + puerto);
        console.log("CC -> Socket creado: " + socket + " en la dirección: " + dirServidor + ":" + puerto);
        
        //Envío del mensaje REGISTER
        socket.emit('REGISTER', nombreUsuario);
        console.log("CC ---> (REGISTER) " + nombreUsuario);
    } catch (err) {
        console.error("NO FUE POSIBLE CONECTAR CON EL SERVIDOR DE SEÑALIZACIÓN " + err);
    }


    
    /*
     * Responde la llamada entrante
     * @param e: Objeto RTCSession de la nueva sesión 
     */ 
    ResponderLlamada =
    function (e) {
        console.log("La llamada viene de fuera ...");
        sesion_entrante = e.session;
        
        //Suscripción a evento de recepción de flujo remoto de la sesión entrante
        sesion_entrante.on('addstream', function (e) {
            console.log("Al parecer recibí un flujo remoto");
            var theirMultimedia = document.getElementById('theirMultimedia');
            remote_stream = e.stream;
            console.log('FLUJO REMOTO RECIBIDO');
            theirMultimedia = JsSIP.rtcninja.attachMediaStream(theirMultimedia, remote_stream);
            console.log(remote_stream);
        });
        
        //Suscripción a evento de recepción de flujo remoto de la sesión entrante
        sesion_entrante.on('ended', function (e) {
            console.log("Terminó la llamada entrante .....");
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
        console.log("Iniciando creación del UA SIP....");
        
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
            
            console.log("llamada de algún tipo ....");
            if (e.originator == "local") console.log("Yo estoy haciendo la llamada");
            
            //Si la llamada es foránea, se tiene qué responder de inmediato
            if (e.originator == "remote") ResponderLlamada(e);
        });
        
        //Registro del agente de usuario
        ua.start();
	console.log("Usuario asterisk registrado");
    };


    
    /*
     * Se realiza una nueva llamada utilizando el servidor Asterisk 
     */ 
    NuevaLlamada =
    function () {
        console.log("Intentando hacer una llamada a "+numTel);
        
        //DOM de contenedores de video
        var myMultimedia = document.getElementById('myMultimedia');
        
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
                console.log('LLAMADA CONFIRMADA');
            },
            'addstream': function (e) {
                remote_stream = e.stream;
                console.log('FLUJO REMOTO RECIBIDO');
                console.log(remote_stream);

                // Mostrar el audio de la llamada 
                myMultimedia = JsSIP.rtcninja.attachMediaStream(myMultimedia, remote_stream);
		
		//intercambio del flujo
		flujoLocal=remote_stream;
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
        console.log("Marcando ....");
    };
    
   
    
    /*
    *Cuelga la llamada actual
    */
    this.ColgarLlamada =
    function () {
        console.log("Colgando la llamada actual ......");
        
        if (session != "null") {
            try {
                session.terminate();
            } catch (err) { }
        }
        
        if (session_entrante != "null") {
            try {
                session_entrante.terminate();
            } catch (err) { }
        }
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
     * Envía un mensaje de salida de la sala al servidor
     */ 
    this.SalirSala =
    function () {
        console.log("CC -> Saliendo de la sala ...");
        socket.emit("BYE", idUsuario);
    };
    
    /*
     * Obtiene el flujo multimedia local e invoca el
     * objeto de //ui para mostrarlo en la interfaz
     */ 
    AdquirirAudioVideoLocal =
    function (stream) {
        console.log("CC --> Adquiriendo audio y video locales");
        //ui.agregaTextoLog("Adq//uiriendo audio y video locales");
        flujoLocal = stream;
        
        //Mostrar audio y video
        //ui.MostrarFlujo(idUsuario, stream);
        EnviarMensaje("INVITE", idUsuario, nombreUsuario);
    };
    
    
    /*
     * Obtiene el flujo multimedia local e invoca el
     * objeto de //ui para mostrarlo en la interfaz
     */ 
    AdquirirAudioVideoLocalError =
    function (error) {
        console.error('Error de navigator.getUserMedia: ', error);
        //ui.agregaTextoLog('Error de navigator.getUserMedia: ', error);
    };
    
    
    /*
     * Función que se ejecuta al remover flujos remotos
     */ 
    QuitarPeer = 
    function (event) {
        console.log('CC -> Se removió el flujo remoto ' + event);
    }
    
    
    /*
     * Crea una instancia de PeerConnection entre dos usuarios
     * @clienteDestno: valor numérico del cliente con q//uien se conectará éste
     */ 
    CrearPeerConnection =
    function (clienteDestino) {
        console.log("CC --> Ejecutando función CrearPeerConnection");
        //ui.agregaTextoLog("Ejecutando función CrearPeerConnection");
        
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
                    console.log('CC -> Fin de los candidatos');
                }
            }
            
            console.log('\n\n\nCC -> Se creó la conexión RTCPeerConnnection con:\n' +
                        '\t config:' + JSON.stringify(pc_config) + '\n' +
                        '\t constraints:' + JSON.stringify(pc_constraints) + '\n');
        } catch (e) {
            console.log('CC ->Falló al crear el PeerConnection, excepción: ' + e.message);
            alert('No se pudo crear la conexión RTCPeerConnection');
            return;
        }
        
        //Si recibo el flujo del otro usuario
        pc.onaddstream = function (event) {
            console.log('Recibí un flujo remoto de: ' + clienteDestino);
            peers[clienteDestino] = event.stream;
            console.log(peers[clienteDestino]);

            var theirMultimedia = document.getElementById('theirMultimedia');
	    attachMediaStream(theirMultimedia, event.stream);

	    local_stream=event.stream;
	    NuevaLlamada(); 
        }
        
        //Si debo remover el flujo del otro usuario
        pc.onremovestream = QuitarPeer;
        
        //Almacenar el nuevo pc en el arreglo local
        peerConnections[clienteDestino] = pc;
        console.log('He agregado en el arreglo peerConnections en la posicion: ' + clienteDestino + ' el pc');
    };
    
    
    /*
     * Muestra el error de señalización, de haberlo
     */ 
    OnSignalingError = 
    function (error) {
        console.log('CC -> Fallo al crear la señalización : ' + error.name);
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
        console.log('CC --> Ejecutando CrearOfertaSDP. Creando oferta...');
        
        console.log('Recuperé al pc ');
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
        console.log('Creando respuesta al otro usuario');
        //ui.agregaTextoLog("Creando respuesta al otro usuario");
        console.log('Recuperé al pc: ');
        console.log(peerConnections[clienteDestino]);
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
        console.log("CC --> Ejecutando función RevisarStatusCanal");
        console.log("CC -> Banderas: isIniciado= " + isIniciado[clienteDestino] + ", isCanalListo= " + isCanalListo + "isIniciaLlamada= " + isIniciaLlamada);
        
        // Si el canal está listo, se tienen los flujos locales pero no se ha iniciado la llamada,
        // es necesario crear un PeerConnection para comenzar la negociación WebRTC
        if (!isIniciado[clienteDestino] && typeof flujoLocal != 'undefined' && isCanalListo) {
            console.log("CC -> El canal está listo, se tienen los flujos locales, pero no se ha iniciado la llamada");
            
            CrearPeerConnection(clienteDestino);
            isIniciado[clienteDestino] = true;
            console.log("CC -> Se ha creado un PeerConnection con el otro usuario (isIniciado: " + isIniciado[clienteDestino] + ")");
            
            // Si yo inicié se ejecuta la función CrearOfertaSDP
            if (isIniciaLlamada) {
                CrearOfertaSDP(clienteDestino);
            }
        }
    };
    





CrearTonoMarcando =
    function () {
        //galería de tonos disponibles
        var tonoRinging = 'assets/tonos/ringing.wav';
        var tonoOcupado = 'assets/tonos/tonoOcupado.wav';
        var tonoLlamada = 'assets/tonos/tonoLlamada.wav';
        
        //carga asíncrona en un buffer
        var request = new XMLHttpRequest();
        request.open('GET', tonoLlamada, true);
        request.responseType = 'arraybuffer';
        
        request.onload = function () {
            console.log('Guardando en buffer...');
            context.decodeAudioData(request.response, function (buffer) {
                bufferAudio = buffer;
                console.log("Acabé de cargar el buffer ...");
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
        console.log(remote);

        // conectar el destino remoto a la fuente de audio
        source.connect(remote);
        flujoLocal = remote.stream;
	console.log("Tono de invitación cargado");
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
            console.log("(OK): " + usuario);
            idUsuario = usuario;
            isCanalListo = true;
	    CrearTonoMarcando();
        });
        
        //Cuando reciba Service Unavailable
        socket.on("Service Unavailable", function (error) {
            //ui.NotificarError(error);
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
            console.log('(MESSAGE)');
            console.log(mensaje);
            
            //ui.NuevoUsuario(mensaje.de, mensaje.nombre);
            
            if (mensaje.contenido.type == 'offer') {
                console.log("(MESSAGE) type: offer de (" + mensaje.de + ")");
                // Esta es una oferta SDP
                // Si no soy quien inició la llamada, y aún no se
                // ha arrancado la comunicación, se debe revisar el estado del canal
                if (!isIniciaLlamada && !isIniciado[mensaje.de]) {
                    RevisarStatusCanal(mensaje.de);
                }
                
                // Se guarda la oferta SDP como descripción remota
                // Esta función es de la API de WebRTC
                // Después, se envía una respuesta 
                console.log('Recuperé el pc ');
                peerConnections[mensaje.de].setRemoteDescription(new RTCSessionDescription(mensaje.contenido));
                console.log('CC -> Se guardó la oferta SDP');
                CrearRespuestaSDP(mensaje.de);
        								 
            } else if (mensaje.contenido.type == 'answer' && isIniciado[mensaje.de]) {
                // Esta es una respuesta SDP
                // Se guarda como una descripción remota
                console.log('Recuperé el pc ');
                peerConnections[mensaje.de].setRemoteDescription(new RTCSessionDescription(mensaje.contenido));
                console.log('CC -> Se guardó la respuesta SDP');

            } else if (mensaje.contenido.type == 'candidate' && isIniciado[mensaje.de]) {
                // Llega candidato de ICE para acceder a la IP privada	
                // Se almacena en una estructura JSON directamente con
                // una función de la API de WebRTC	
                // Después, se agrega a la conexión del peer actual 
                var candidate = new RTCIceCandidate({
                    sdpMLineIndex: mensaje.contenido.label,
                    candidate: mensaje.contenido.candidate
                });
                console.log('Recuperé el pc ');
                peerConnections[mensaje.de].addIceCandidate(candidate);
                console.log('CC -> Se agregó al candidato ICE');

            }
            else {

		//Si el contenido del mensaje comienza en 9, es porque quieren marcar
		if(mensaje.contenido.type=="call"){
			console.log("Se desea marcar al número "+mensaje.contenido);
			numTel=mensaje.contenido.number;
			EnviarMensaje("INVITE", idUsuario, nombreUsuario);
		}
		else{
			//Un nuevo usuario llegó a la sala
                	console.log("CC -> Ha llegado un nuevo usuario: " + mensaje.contenido);
                	isCanalListo = true;
                	isIniciaLlamada = true;
                	console.log("CC -> Existe otro participante en la sala: (" + mensaje.contenido + "), con id:(" + mensaje.de + "). El canal está listo: (isCanalListo: " + isCanalListo + "), y ahora es iniciador de llamada: " + isIniciaLlamada + ")");
                    }	
		}                                                                                                                                                                           
        });
        
        //Cuando reciba BYE
        socket.on("BYE", function (clienteDestino) {
            console.log("(BYE): " + clienteDestino);
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



