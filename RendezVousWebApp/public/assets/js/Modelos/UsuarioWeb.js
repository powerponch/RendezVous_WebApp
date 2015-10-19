/**
 * Clase UsuarioWeb
 * @param nombreUsuario: Nombre del usuario
 * @param dirServidor: Dirección del servidor
 * @param puerto: Puerto del servidor
 **/ 
function UsuarioWeb(nombreUsuario, dirServidor, puerto) {
    var nombreUsuario = nombreUsuario;
    var dirServidor = dirServidor;
    var puerto = puerto;
    
    //Banderas
    var isCanalListo = false;           //¿El canal esta listo?
    var isIniciaLlamada = false;        //¿Soy yo quien inicia la llamada?
    var isIniciado = [];                //¿La llamada ya se inició?
    
    var peers = new Array(3);           //Arreglo de flujos remotos
    var peerConnections = new Array(3); //Arreglo de usuarios remotos
    var idUsuario;                      //Id del usuario asignado por el servidor
    var ui = new InterfazGrafica();     //Interfaz gráfica del usuario
    
    var flujoLocal;                //Flujo multimedia de este equipo de cómputo
    var audioLocal;		//Audio de este equipo de cómputo para comunicarse con el usuario PBX
    var socket;                         //Socket del usuario para comunicarse
    var constraints;                    //Objeto JSON para definir si se usará audio y/o video
    var pc_config;                      //Configuración ICE para conexion p2p
    var pc_constraints;                 //Habilitar la negociación de seguridad
    var sdpConstraints;
    
    //Inicialización del socket del usuario web
    try {
        socket = io.connect(dirServidor + ":" + puerto);
        console.log("CC ---> Socket creado y escuchando en la dirección: " + dirServidor + ":" + puerto);
        
        //Envío del mensaje REGISTER
        socket.emit('REGISTER', nombreUsuario);
        console.log("CC ---> (REGISTER) " + nombreUsuario);
    } catch (err) {
        console.error("CC ---> NO FUE POSIBLE CONECTAR CON EL SERVIDOR DE SEÑALIZACIÓN " + err);
    }
    


    /*
     *Vuelve a intentar el registro del usuario web con un nuevo nombre
     */
    this.VolverARegistrar =
    function (nombre) {
        nombreUsuario = nombre;

        //Envío del mensaje REGISTER
        socket.emit('REGISTER', nombreUsuario);
        console.log("CC ---> (REGISTER) " + nombreUsuario);
    };
    
    


    /*
     *Envía un mensaje con el formato [cabecera][contenido {de:,para:,mensaje:}]
     */
    EnviarMensaje =
    function (cabecera, destino, contenido) {
        console.log("CC ---> Enviando el mensaje: (" + cabecera + ") " + contenido);
        socket.emit(cabecera, { de: idUsuario, nombre: nombreUsuario, para: destino, contenido: contenido });
    };
    
    


    /*
     * Envía un mensaje de salida de la sala al servidor
     */ 
    this.SalirSala =
    function () {
        console.log("CC ---> Saliendo de la sala ...");
        socket.emit("BYE", idUsuario);
    };
    



    /*
     * Obtiene el flujo multimedia local e invoca el
     * objeto de UI para mostrarlo en la interfaz
     */ 
    AdquirirAudioVideoLocal =
    function (stream) {
        console.log("CC ---> Adquiriendo audio local");
        ui.agregaTextoLog("Obteniendo acceso a tu cámara y micrófono ...");

	//Audio + video para transmitir con otros usuarios Web
        flujoLocal = stream;
        
        //Mostrar audio y video
        ui.MostrarFlujo(idUsuario,flujoLocal,true);
        EnviarMensaje("INVITE", idUsuario, nombreUsuario);
    };
    



    /*
     * Obtiene el flujo multimedia de solo voz
     */ 
    AdquirirAudioLocal =
    function (stream) {
        console.log("CC ---> Adquiriendo audio local");
        ui.agregaTextoLog("Obteniendo acceso a tu micrófono ...");

	//Audio para transmitir con el usuario pbx
        audioLocal = stream;

	var numTel= ui.LlamarTelefono();
	isCanalListo=true;
	isIniciaLlamada=true;

	//El mensaje se envía al UsuarioPBX por medio del servidor de señalizacion
	var contenido= {type:"call", number:numTel};
	EnviarMensaje("MESSAGE",3,contenido);
    };



    /*
     * Obtiene el flujo multimedia de solo voz
     */ 
    AdquirirAudioRespuesta =
    function (stream) {
        console.log("CC ---> Adquiriendo audio local para responder");
        ui.agregaTextoLog("Obteniendo acceso a tu micrófono ...");

	//Audio para transmitir con el usuario pbx
        audioLocal = stream;
	console.log(audioLocal);

	isCanalListo=true;
	isIniciaLlamada=true;

	//Teniendo el flujo local, se procede a revisar el status del canal
	RevisarStatusCanal(3); 
    };
    



    /*
     * Obtiene el flujo multimedia local e invoca el
     * objeto de UI para mostrarlo en la interfaz
     */ 
    AdquirirAudioVideoLocalError =
    function (error) {
        console.error('CC ---> Error de navigator.getUserMedia: ', error);
       ui.agregaTextoLog('(ERROR) Al parecer no concediste permisos a tu micrófono y/o cámara web', error);
    };
    
   
 

    /*
     * Función que se ejecuta al remover flujos remotos
     */ 
    QuitarPeer = 
    function (event) {
        console.log('CC ---> Se removió el flujo remoto');
    }
    


    /*
     *Realiza una llamada telefónica enviando un mensaje al servidor de señalización
     *Mediante la UI obtiene el número a marcar y lo envía en el mensaje
     */
     this.RealizarLlamadaTelefonica=
	function(){
	console.log("CC ---> Realizando llamada telefónica ....");
	ui.agregaTextoLog("Realizando llamada telefónica ....");

	var constraintsAudio = {
	    "audio": true,
	    "video": false
	}

	var numTel= ui.LlamarTelefono();
	if(numTel==null)
		alert("(ERROR) Ingrese un número telefónico válido");
	// Llama al método getUserMedia()
	else
        	navigator.getUserMedia(constraintsAudio, AdquirirAudioLocal, AdquirirAudioVideoLocalError);
     };


	
     /*
      *Función que envía un mensaje al UsuarioPBX para finalizar la llamada actual
      */
     this.ColgarLlamadaTelefonica=
	function(){
	if(isIniciado[3]==true){
		console.log("CC ---> Colgando llamada telefónica .....");
		ui.agregaTextoLog("Colgando la llamada telefónica actual ...");
		var contenido={type:"hangup"};
	
		EnviarMensaje("MESSAGE", 3, contenido);
	}
     };


    
    /*
     * Crea una instancia de PeerConnection entre dos usuarios
     * @clienteDestno: valor numérico del cliente con quien se conectará éste
     */ 
    CrearPeerConnection =
    function (clienteDestino) {
        console.log("CC ---> Ejecutando función CrearPeerConnection");
        ui.agregaTextoLog("Creando una conexión con el otro usuario ....");
        
        // Inicializa la variable pc, que será el PeerConnection con el otro usuario
        // 1.- Añade la configuración y las características
        // 2.- Agrega el flujo multimedia local
        // 3.- Asigna el listener de eventos para cuando se tenga un candidato ICE
        // 4.- Asigna el listener de eventos para cuando se agregue un flujo externo
        // 5.- Asigna el listener de eventos para cuando se quite un flujo externo
        
        var pc;
        try {
            pc = new RTCPeerConnection(pc_config, pc_constraints);
	
	    if(clienteDestino==3){
		
		console.log("CC ---> Agregando al peer connection solamente audio ...");
		pc.addStream(audioLocal);
	    }
	    else{
	        console.log("CC ---> Agregando al peer connection audio y video ...");
		pc.addStream(flujoLocal);            
	    }
            
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
                    console.log('CC ---> Fin de los candidatos');
                }
            }
            
            console.log("CC ---> Se ha creado una conexión exitosamente");
            ui.agregaTextoLog("Se ha creado una conexión exitosamente");

        } catch (e) {
            console.log('CC ---> Falló al crear el PeerConnection, excepción: ' + e.message);
            ui.agregaTextoLog('(ERROR) No se pudo crear la conexión con el otro usuario ... ');
            return;
        }
        
        //Si recibo el flujo del otro usuario
        pc.onaddstream = function (event) {
            console.log('CC ---> Se ha recibido un flujo remoto de: ' + clienteDestino);
            ui.MostrarFlujo(clienteDestino, event.stream, false);
            peers[clienteDestino] = event.stream;
            ui.agregaTextoLog("¡Hola!");
        }
        
        //Si debo remover el flujo del otro usuario
        pc.onremovestream = QuitarPeer;
        
        //Almacenar el nuevo pc en el arreglo local
        peerConnections[clienteDestino] = pc;
        console.log('CC ---> Se ha agregado el pc en el arreglo en la posicion: ' + clienteDestino);
    };
    
    
    /*
     * Muestra el error de señalización, de haberlo
     */ 
    OnSignalingError = 
    function (error) {
        console.log('CC ---> Fallo al crear la señalización : ' + error.name);
       ui.agregaTextoLog('Fallo al crear la señalización : ' + error.name);
    };
    
    
    /*
     * Creación de la oferta SDP a enviar con una función de la API de WebRTC 
     * @clienteDestno: valor numérico del cliente con quien se conectará éste
     */ 
    CrearOfertaSDP = 
    function (clienteDestino) {
        // Se pueden invocar las siguientes funciones después de crearse:
        // 1.- AgregarDescripcionLocal si fue exitosa la creación
        // 2.- onSignalingError si no fue exitosa
        console.log('CC ---> Creando oferta SDP...');
        ui.agregaTextoLog("Creando oferta SDP ....");

        console.log(peerConnections[clienteDestino]);
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
     * @clienteDestno: valor numérico del cliente con quien se conectará éste
     */ 
    CrearRespuestaSDP =
    function (clienteDestino) {
        console.log('CC ---> Creando respuesta al otro usuario');
        ui.agregaTextoLog("Creando respuesta para el usuario remoto");
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
     * @clienteDestino: id del usuario con quien se negociará
     */ 
    RevisarStatusCanal = 
    function (clienteDestino) {
        console.log("CC ---> Ejecutando función RevisarStatusCanal");
        console.log("CC ---> Banderas: isIniciado= " + isIniciado[clienteDestino] + ", isCanalListo= " + isCanalListo + "isIniciaLlamada= " + isIniciaLlamada);
        
        // Si el canal está listo, se tienen los flujos locales pero no se ha iniciado la llamada,
        // es necesario crear un PeerConnection para comenzar la negociación WebRTC
        if (!isIniciado[clienteDestino] && typeof flujoLocal != 'undefined' && isCanalListo) {
            console.log("CC ---> Procediendo a crear un PeerConnection por primera vez ....");
            
            CrearPeerConnection(clienteDestino);
            isIniciado[clienteDestino] = true;
            console.log("CC ---> Se ha creado un PeerConnection con el otro usuario (isIniciado: " + isIniciado[clienteDestino] + ")");
            
            // Si yo inicié se ejecuta la función CrearO fertaSDP
            if (isIniciaLlamada) {
                CrearOfertaSDP(clienteDestino);
            }
        }
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
            
            ui.NuevoUsuario(idUsuario, nombreUsuario);
            ui.RedireccionarSala();
            ui.EstablecerMiNombre(nombreUsuario);
            ui.agregaTextoLog("Bienvenido(a) a la sala");

            // Llama al método getUserMedia()
            navigator.getUserMedia(constraints, AdquirirAudioVideoLocal, AdquirirAudioVideoLocalError);
        });
        
        //Cuando reciba Service Unavailable
        socket.on("Service Unavailable", function (error) {
            ui.NotificarError(error);
        });
        
        //Cuando reciba INVITE
        socket.on("INVITE", function (mensaje) {
            console.log("CC ---> (INVITE)");
            ui.agregaTextoLog("(INVITE)");
            console.log(mensaje);

	    //Si el INVITE viene del usuario pbx, y yo no inicié la llamada,
	    //debo obtener mi flujo de audio primero
	    if(mensaje.de==3 && typeof audioLocal == 'undefined'){
		console.log("CC ---> El mensaje (INVITE) viene del usuario pbx y se debe obtener el audio local");

		var constraintsAudio = {
		    "audio": true,
		    "video": false
		}
		navigator.getUserMedia(constraintsAudio, AdquirirAudioRespuesta, AdquirirAudioVideoLocalError);
	    }
	    //usuario pbx no puede iniciar una llamada
            else if(mensaje.de==3){
		isIniciaLlamada=true;
		RevisarStatusCanal(mensaje.de);
		}
		else
	    //Si el INVITE es de cualquier otro usuario, se procede a revisar el status del canal
            RevisarStatusCanal(mensaje.de);
        });
        
        //Cuando reciba MESSAGE
        socket.on("MESSAGE", function (mensaje) {
            console.log('CC ---> (MESSAGE)');
            console.log(mensaje);
            
            ui.NuevoUsuario(mensaje.de, mensaje.nombre);

            if (mensaje.contenido.type == 'offer') {
                console.log("CC ---> (MESSAGE) type: offer de (" + mensaje.de + ")");
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
                console.log('CC ---> Se guardó la oferta SDP');
                CrearRespuestaSDP(mensaje.de);
        								 
            } else if (mensaje.contenido.type == 'answer' && isIniciado[mensaje.de]) {
                // Esta es una respuesta SDP
                // Se guarda como una descripción remota
                peerConnections[mensaje.de].setRemoteDescription(new RTCSessionDescription(mensaje.contenido));
                console.log('CC ---> Se guardó la respuesta SDP');

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
                console.log('CC ---> Se agregó al candidato ICE');

            }
            else {
		//Si el contenido del mensaje comienza en 9, es porque quieren marcar
		if(mensaje.contenido.type=="call"){
			console.log("CC ---> Llamada en progreso a: "+mensaje.contenido);
			ui.agregaTextoLog("Llamada en progreso al número: "+mensaje.contenido.number);

			//bloquear mi softphone para que no haga llamadas
			ui.BloquearSoftphone();	
			isCanalListo = true;
                	isIniciaLlamada = true;		
		}else{
			//Un nuevo usuario llegó a la sala. Se registra su id y su nombre en la UI
                	console.log("CC ---> Ha llegado un nuevo usuario a la sala: " + mensaje.contenido);
                	ui.NuevoUsuario(mensaje.de, mensaje.contenido);
                	isCanalListo = true;
                	isIniciaLlamada = true;
		}
            }
        });
        
        //Cuando reciba BYE
        socket.on("BYE", function (clienteDestino) {
            console.log("CC ---> (BYE): " + clienteDestino);
            if (isIniciado[clienteDestino]) {
                //// Si el mensaje recibido es bye y ya se inició la llamada, el otro usuario colgó
                isIniciaLlamada = false;
                isIniciado[clienteDestino] = false;
                var pc = peerConnections[clienteDestino];
                if (pc) pc.close();
                pc = null;
                ui.RemoverFlujo(clienteDestino);
            }
        });
    }
};




