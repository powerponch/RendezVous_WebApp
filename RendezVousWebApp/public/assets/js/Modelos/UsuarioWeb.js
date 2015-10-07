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
    
    var flujoLocal;                     //Flujo multimedia de este equipo de cómputo
    var audioLocal;			//Audio de este equipo de cómputo para comunicarse con el usuario PBX
    var socket;                         //Socket del usuario para comunicarse
    var constraints;                    //Objeto JSON para definir si se usará audio y/o video
    var pc_config;                      //Configuración ICE para conexion p2p
    var pc_constraints;                 //Habilitar la negociación de seguridad
    var sdpConstraints;
    
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
        console.log("CC -> Saliendo de la sala ...");
        socket.emit("BYE", idUsuario);
    };
    
    /*
     * Obtiene el flujo multimedia local e invoca el
     * objeto de UI para mostrarlo en la interfaz
     */ 
    AdquirirAudioVideoLocal =
    function (stream) {
        console.log("CC --> Adquiriendo audio y video locales");
        ui.agregaTextoLog("Adquiriendo audio y video locales");
	//Audio + video para transmitir con otros usuarios Web
        flujoLocal = stream;
	console.log("El flujo local audio+ video es: ");
	console.log(flujoLocal);

	//Remover el track de video para almacenar solo el audio
	audioLocal=stream;
	var videoTrack = audioLocal.getVideoTracks();
	if (videoTrack.length > 0) audioLocal.removeTrack(videoTrack[0]);
	console.log("El flujo local audio solamente es: ");
	console.log(audioLocal);
        
        //Mostrar audio y video
        ui.MostrarFlujo(idUsuario, stream);
        EnviarMensaje("INVITE", idUsuario, nombreUsuario);
    };
    
    
    /*
     * Obtiene el flujo multimedia local e invoca el
     * objeto de UI para mostrarlo en la interfaz
     */ 
    AdquirirAudioVideoLocalError =
    function (error) {
        console.error('Error de navigator.getUserMedia: ', error);
       ui.agregaTextoLog('Error de navigator.getUserMedia: ', error);
    };
    
    
    /*
     * Función que se ejecuta al remover flujos remotos
     */ 
    QuitarPeer = 
    function (event) {
        console.log('CC -> Se removió el flujo remoto ' + event);
    }
    

    /*
     *Realiza una llamada telefónica enviando un mensaje al servidor de señalización
     *Mediante la UI obtiene el número a marcar y lo envía en el mensaje
     */
     this.RealizarLlamadaTelefonica(){
	console.log("Realizando llamada telefónica ....");
	var numTel= ui.LlamarTelefono();
	console.log("El número a marcar es: "+numTel);
	isCanalListo=true;
	isIniciaLlamada=true;
	//El mensaje se envía al UsuarioPBX por medio del servidor de señalizacion
	EnviarMensaje("MESSAGE",3,numTel);
     };
    
    /*
     * Crea una instancia de PeerConnection entre dos usuarios
     * @clienteDestno: valor numérico del cliente con quien se conectará éste
     */ 
    CrearPeerConnection =
    function (clienteDestino) {
        console.log("CC --> Ejecutando función CrearPeerConnection");
        ui.agregaTextoLog("Ejecutando función CrearPeerConnection");
        
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
		console.log("Agregando al peer connection solo audio ...");
		pc.addStream(audioLocal);
	    }
	    else{
	        console.log("Agregando flujo completo: ");
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
                    console.log('CC -> Fin de los candidatos');
                }
            }
            
            console.log('\n\n\nCC -> Se creó la conexión RTCPeerConnnection con:\n' +
                        '\t config:' + JSON.stringify(pc_config) + '\n' +
                        '\t constraints:' + JSON.stringify(pc_constraints) + '\n');
        } catch (e) {
            console.log('Lo CC ->Falló al crear el PeerConnection, excepción: ' + e.message);
            alert('No se pudo crear la conexión RTCPeerConnection');
            return;
        }
        
        //Si recibo el flujo del otro usuario
        pc.onaddstream = function (event) {
            console.log('Recibí un flujo remoto de: ' + clienteDestino);
            ui.MostrarFlujo(clienteDestino, event.stream);
            peers[clienteDestino] = event.stream;
            console.log(peers[clienteDestino]);
        }
        
        //Si debo remover el flujo del otro usuario
        pc.onremovestream = QuitarPeer;
        
        //Almacenar el nuevo pc en el arreglo local
        peerConnections[clienteDestino] = pc;
        console.log('He agregado en el arreglo peerConnections en la posicion: ' + clienteDestino + ' el pc:');
        console.log(peerConnections[clienteDestino]);
    };
    
    
    /*
     * Muestra el error de señalización, de haberlo
     */ 
    OnSignalingError = 
    function (error) {
        console.log('CC -> Fallo al crear la señalización : ' + error.name);
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
        console.log('CC --> Ejecutando CrearOfertaSDP. Creando oferta...');
        ui.agregaTextoLog("Ejecutando CrearOfertaSDP. Creando oferta...");
        
        console.log('Recuperé al pc: ');
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
        console.log('Creando respuesta al otro usuario');
        ui.agregaTextoLog("Creando respuesta al otro usuario");
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
     * @clienteDestino: id del usuario con quien se negociará
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
            
            /**if (usuario == 0) {
                isIniciaLlamada = true;
                console.log("Primer usuario en la sala ....");
            }
            else**/
                isCanalListo = true;
            
            ui.NuevoUsuario(idUsuario, nombreUsuario);
            ui.RedireccionarSala();
            ui.EstablecerMiNombre(nombreUsuario);
            
            // Llama al método getUserMedia()
            navigator.getUserMedia(constraints, AdquirirAudioVideoLocal, AdquirirAudioVideoLocalError);
            console.log('CC -> Obteniendo flujos de usuario con las características: ', constraints)
        });
        
        //Cuando reciba Service Unavailable
        socket.on("Service Unavailable", function (error) {
            ui.NotificarError(error);
        });
        
        //Cuando reciba INVITE
        socket.on("INVITE", function (mensaje) {
            console.log("(INVITE)");
            ui.agregaTextoLog("(INVITE)");
            console.log(mensaje);
            RevisarStatusCanal(mensaje.de);
        });
        
        //Cuando reciba MESSAGE
        socket.on("MESSAGE", function (mensaje) {
            console.log('(MESSAGE)');
            console.log(mensaje);
            
            ui.NuevoUsuario(mensaje.de, mensaje.nombre);

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
                console.log('Recuperé el pc: ');
                console.log(peerConnections[mensaje.de]);
                peerConnections[mensaje.de].setRemoteDescription(new RTCSessionDescription(mensaje.contenido));
                console.log('CC -> Se guardó la oferta SDP');
                CrearRespuestaSDP(mensaje.de);
        								 
            } else if (mensaje.contenido.type == 'answer' && isIniciado[mensaje.de]) {
                // Esta es una respuesta SDP
                // Se guarda como una descripción remota
                console.log('Recuperé el pc: ');
                console.log(peerConnections[mensaje.de]);
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
                console.log('Recuperé el pc: ');
                console.log(peerConnections[mensaje.de]);
                
                peerConnections[mensaje.de].addIceCandidate(candidate);
                console.log('CC -> Se agregó al candidato ICE');

            }
            else {
		//Si el contenido del mensaje comienza en 9, es porque quieren marcar
		if(mensaje.contenido.charAt(0)=="9"){
			console.log("Llamada en progreso a: "+mensaje.contenido);
			ui.agregaTextoLog("Llamada en progreso del número: "+mensaje.contenido.substring(1,mensaje.contenido.length));

			//bloquear mi softphone para que no haga llamadas
			ui.BloquearSoftphone();	
			isCanalListo = true;
                	isIniciaLlamada = true;		
		}else{
			//Un nuevo usuario llegó a la sala. Se registra su id y su nombre en la UI
                	console.log("CC -> Ha llegado un nuevo usuario: " + mensaje.contenido);
                	ui.NuevoUsuario(mensaje.de, mensaje.contenido);
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
                ui.RemoverFlujo(clienteDestino);
            }
        });
    }
};




