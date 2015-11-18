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
  var isPeticionLlamada=false; 	      //¿Me solicitaron hacer una llamada telefónica?
  var isLlamadaEntrante=false;	      //¿Está entrando una llamada?
  var cantParticipantes=0;		        //¿Cuántos usuarios web están presentes en la sala?


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
  var numTel; 			                   //Número que se va a marcar
  var vozSaliente=null;                //Voz saliente de una llamada telefónica
  var vozEntrante=null; 		           //Voz entrante de una llamada telefónica


  //Variables de WebAudio
  var bufferAudio = null;
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  var context = new AudioContext();

  //************************Flujos multimedia de prueba
  var local_stream;
  var remote_stream;
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


  //Override de la función console.log()
  /**var orig= console.log;
  console.log=function()
  {
  var texto= JSON.stringify({sip:arguments}).toString();
  orig.apply(console,AgregaTextoLog(texto,1));
};**/

/*
* Agrega texto al respectivo cuadro de la página de panel de control
* @param TextoLinea: Texto a mostrar en el log
* @param tipo: Cuadro de log donde se mostrará el texto
* 0: señalizacion, 1: jsSIP, 2: cliente
*/
AgregaTextoLog =
function (TextoLinea,tipo) {
  var nuevoTexto= document.createTextNode(TextoLinea+'\n');
  var saltoLinea= document.createElement("br");
  var saltoLinea2= document.createElement("br");

  var logSenyalizacion = document.getElementById('logServidor');
  var logClientePBX = document.getElementById('logPBX');
  var logJsSIP = document.getElementById('logSIP');

  switch(tipo){

    case 0:
    logSenyalizacion.insertBefore(saltoLinea2,logSenyalizacion.childNodes[0]);
    logSenyalizacion.insertBefore(saltoLinea,logSenyalizacion.childNodes[0]);
    logSenyalizacion.insertBefore(nuevoTexto,logSenyalizacion.childNodes[0]);
    logSenyalizacion.insertBefore(saltoLinea2,logSenyalizacion.childNodes[0]);
    logSenyalizacion.insertBefore(saltoLinea,logSenyalizacion.childNodes[0]);
    logSenyalizacion.insertBefore(saltoLinea2,logSenyalizacion.childNodes[0]);
    logSenyalizacion.insertBefore(saltoLinea,logSenyalizacion.childNodes[0]);
    break;

    case 2:
    logClientePBX.insertBefore(saltoLinea2,logClientePBX.childNodes[0]);
    logClientePBX.insertBefore(saltoLinea,logClientePBX.childNodes[0]);
    logClientePBX.insertBefore(nuevoTexto,logClientePBX.childNodes[0]);
    logClientePBX.insertBefore(saltoLinea2,logClientePBX.childNodes[0]);
    logClientePBX.insertBefore(saltoLinea,logClientePBX.childNodes[0]);
    logClientePBX.insertBefore(saltoLinea2,logClientePBX.childNodes[0]);
    logClientePBX.insertBefore(saltoLinea,logClientePBX.childNodes[0]);
    break;

    case 1:
    logJsSIP.insertBefore(saltoLinea2,logJsSIP.childNodes[0]);
    logJsSIP.insertBefore(saltoLinea,logJsSIP.childNodes[0]);
    logJsSIP.insertBefore(nuevoTexto,logJsSIP.childNodes[0]);
    logJsSIP.insertBefore(saltoLinea2,logJsSIP.childNodes[0]);
    logJsSIP.insertBefore(saltoLinea,logJsSIP.childNodes[0]);
    logJsSIP.insertBefore(saltoLinea2,logJsSIP.childNodes[0]);
    logJsSIP.insertBefore(saltoLinea,logJsSIP.childNodes[0]);
    break;
    default: break;
  }
};


/*
* Obtiene la sesión de la llamada entrante y suscribe los eventos para
* para el manejo de los flujos entrantes/salientes
* @param e: Objeto RTCSession de la nueva sesión
*/
CapturarLlamadaEntrante =
function (e) {
  console.log("CPBX ---> La llamada telefónica viene de fuera ...");
  AgregaTextoLog("CPBX ---> La llamada telefónica viene de fuera ...",2);

  sesion_entrante = e.session;
  var id= sesion_entrante.remote_identity.toString();
  console.log(id);

  var sbs1= id.split("@")[0].substring(5);
  console.log(sbs1);

  nombreUsuario=sbs1;
  console.log(sbs1);

  //Suscripción a evento de recepción de flujo remoto de la sesión entrante
  sesion_entrante.on('addstream', function (e) {
    console.log("CPBX ---> Se ha recibido un flujo remoto ...");
    AgregaTextoLog("CPBX ---> Se ha recibido un flujo remoto ...",2);

    remote_stream = e.stream;

    //reemplazo del flujo de audio con la sala de videoconferencia
    var i=0;
    peerConnections.forEach(function(item){
      if(isIniciado[i]){
        console.log("CPBX ---> Reemplazando el flujo de "+i);
        AgregaTextoLog("CPBX ---> Reemplazando el flujo de "+i,2);
        item.addStream(e.stream);

        //Renegociación del nuevo audio
        CrearOfertaSDP(i);
      }
      i++;
    });
  });

  //Suscripción a evento de recepción de flujo remoto de la sesión entrante
  sesion_entrante.on('ended', function (e) {
    console.log("CPBX ---> Terminó la llamada entrante .....");
    AgregaTextoLog("CPBX ---> Terminó la llamada entrante .....",2);

    ColgarLlamada();
  });


  //En cuanto se reciba la notificación de que hay una llamada entrante, se debe
  //iniciar sesión WebRTC con los usuarios web de la sala de videoconferencia,
  //ya que se deben obtener sus flujos multimedia para poder responder la llamada.
  //Para ello, se activa la bandera y se envía un mensaje INVITE
  isLlamadaEntrante=true;
  EnviarMensaje("INVITE", idUsuario, nombreUsuario);
};


/*
* Responde la llamada entrante con los flujos especificados
* @param stream: Flujo de audio entrante de la sala de videoconferencia
*/
ResponderLlamada=
function(){

  //parámetros de la llamada
  //Aquí se agregan los flujos de la videoconferencia
  //Aquí se deberían adjuntar los tracks conforme lleguen...
  var opciones = {
    'mediaConstraints': {
      'audio': true,
      'video': false
    },
    'mediaStream':vozSaliente
  };

  console.log("La voz con la que se responde es: ");
  console.log(vozSaliente);

  //atendiendo la llamada
  sesion_entrante.answer(opciones);
};


/*
* Registra al usuario PBX en el servidor Asterisk
*/
this.RegistrarUA =
function () {
  console.log("CPBX ---> Iniciando creación del UA SIP....");
  AgregaTextoLog("CPBX ---> Iniciando creación del UA SIP....",2);

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
    if (e.originator == "local"){
      console.log("CPBX ---> Sesión RTC en progreso");
      AgregaTextoLog("CPBX ---> Sesión RTC en progreso",2);
    }
    //Si la llamada es foránea, se tiene qué responder de inmediato
    else if (e.originator == "remote") CapturarLlamadaEntrante(e);
  });

  //Registro del agente de usuario
  ua.start();
  console.log("CPBX ---> Usuario asterisk registrado");
  AgregaTextoLog("CPBX ---> Usuario asterisk registrado",2);
};


/*
* Se realiza una nueva llamada utilizando el servidor Asterisk
*/
NuevaLlamada =
function () {
  console.log("CPBX ---> Intentando hacer una llamada a "+numTel);
  AgregaTextoLog("CPBX ---> Intentando hacer una llamada a "+numTel,2);

  // Register callbacks to desired call events
  var eventH = {
    'progress': function (e) {
      console.log('CPBX ---> LLAMADA EN PROGRESO ...........');
      AgregaTextoLog("CPBX ---> LLAMADA EN PROGRESO ...........",2);
    },
    'failed': function (e) {
      console.log('CPBX ---> LA LLAMADA FALLÓ');
      AgregaTextoLog("CPBX ---> LA LLAMADA FALLÓ",2);
      ColgarLlamada();
    },
    'ended': function (e) {
      console.log('CPBX ---> YA TERMINÓ LA LLAMADA: ');
      AgregaTextoLog("CPBX ---> YA TERMINÓ LA LLAMADA",2);
      ColgarLlamada();
    },
    'confirmed': function (e) {
      console.log('CPBX ---> LLAMADA CONFIRMADA');
      AgregaTextoLog("CPBX ---> LLAMADA CONFIRMADA",2);
    },
    'addstream': function (e) {
      remote_stream = e.stream;
      console.log('CPBX ---> FLUJO REMOTO RECIBIDO');
      AgregaTextoLog("CPBX ---> FLUJO REMOTO RECIBIDO",2);

      console.log("CPBX ---> Renegociando .....");
      AgregaTextoLog("CPBX ---> Renegociando .....",2);

      //reemplazo del flujo de audio con la sala de videoconferencia
      var i=0;
      peerConnections.forEach(function(item){
        if(isIniciado[i]){
          console.log("CPBX ---> Reemplazando el flujo de "+i);
          AgregaTextoLog("CPBX ---> Reemplazando el flujo de "+i,2);
          item.addStream(remote_stream);

          //renegociación
          CrearOfertaSDP(i);
        }
        i++;
      });
    }
  };

  //parámetros de la llamada
  //Aquí se agregan los flujos de la videoconferencia
  //Aquí se deberían adjuntar los tracks conforme lleguen...
  var options = {
    'eventHandlers': eventH,
    'mediaConstraints': {
      'audio': true,
      'video': false
    },
    'mediaStream':vozSaliente
  };

  //Llamando
  sesion_saliente = ua.call('sip:' + numTel + '@' + dirAsterisk, options);
  console.log("CPBX ---> Marcando (sip:" + numTel + '@' + dirAsterisk+")");
  AgregaTextoLog("CPBX ---> Marcando (sip:" + numTel + "@" + dirAsterisk+")",2);
};


/*
*Cuelga la llamada actual
*/
ColgarLlamada =
function () {
  console.log("CPBX ---> Colgando la llamada actual ......");
  AgregaTextoLog("CPBX ---> Colgando la llamada actual ......",2);

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
  vozSaliente=null;
  remote_stream=undefined;

  //Reset de las banderas
  isPeticionLlamada=false;
  isLlamadaEntrante=false;

  //Reset de los flujos y peerConnections foráneos
  peerConnections= new Array(2);
  peers= new Array(2);

  isIniciaLlamada = false;
  isIniciado[0] = false;
  isIniciado[1] = false;
  isIniciado[2] = false;

  nombreUsuario="pbx";

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
  AgregaTextoLog("CPBX ---> Se removió el flujo remoto ",2);
}


/*
* Crea una instancia de PeerConnection entre dos usuarios
* @clienteDestno: valor numérico del cliente con q//uien se conectará éste
*/
CrearPeerConnection =
function (clienteDestino) {
  console.log("CPBX ---> Ejecutando función CrearPeerConnection");
  AgregaTextoLog("CPBX ---> Ejecutando función CrearPeerConnection",2);

  // Inicializa la variable pc, que será el PeerConnection con el otro usuario
  // 1.- Añade la configuración y las características
  // 2.- Agrega el flujo multimedia local
  // 3.- Asigna el listener de eventos para cuando se tenga un candidato ICE
  // 4.- Asigna el listener de eventos para cuando se agregue un flujo externo
  // 5.- Asigna el listener de eventos para cuando se q//uite un flujo externo

  var pc;
  try {
    pc = new RTCPeerConnection(pc_config, null);

    if(typeof remote_stream != 'undefined'){
      console.log('CPBX ---> Añadiendo la voz de la llamada al pc');
      AgregaTextoLog("CPBX ---> Añadiendo la voz de la llamada al pc",2);

      pc.addStream(remote_stream);
    }
    else{
      console.log('CPBX ---> Añadiendo el tono sordo al pc');
      AgregaTextoLog("CPBX ---> Añadiendo el tono sordo al pc",2);

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
        console.log('CPBX ---> Fin de los candidatos');
        AgregaTextoLog("CPBX ---> Fin de los candidatos",2);
      }
    }
  } catch (e) {
    console.log('CPBX ---> Falló al crear el PeerConnection, excepción: ' + e.message);
    AgregaTextoLog("CPBX ---> Falló al crear el PeerConnection",2);
    return;
  }

  //Si recibo el flujo del otro usuario
  pc.onaddstream = function (event) {
    console.log('CPBX ---> Recibí un flujo remoto de: ' + clienteDestino);
    AgregaTextoLog("CPBX ---> Recibí un flujo remoto de: " + clienteDestino,2);

    peers[clienteDestino] = event.stream;

    //Cada que se recibe el flujo de un usuario, se verifica si se tienen
    //los flujos de todos los participantes en la sala de videoconferencia
    //Si hay una llamada en progreso, no se puede iniciar/responder otra
    if(typeof remote_stream == 'undefined')
    RevisarVozParticipantes();
  }

  //Si debo remover el flujo del otro usuario
  pc.onremovestream = QuitarPeer;

  //Almacenar el nuevo pc en el arreglo local
  peerConnections[clienteDestino] = pc;
  console.log('CPBX ---> He agregado en el arreglo peerConnections en la posicion: ' + clienteDestino + ' el pc');
  AgregaTextoLog('CPBX ---> He agregado en el arreglo peerConnections en la posicion: ' + clienteDestino + ' el pc',2);
};


/*
* Muestra el error de señalización, de haberlo
*/
OnSignalingError =
function (error) {
  console.log('CPBX ---> Fallo al crear la señalización : ');
  console.log(error);
  AgregaTextoLog("CPBX ---> Fallo al crear la señalización ",2);
};


/*
* Crea un sistema de procesamiento de muestras PCM empleando Web Audio
* para mezclar las voces disponibles antes de realizar/responder una llamada
*/
ProcesarAudio =
function (cantVoces) {
  console.log("Procesando el audio recibido...");

  //Creación del contexto
  var contexto;
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    contexto = new AudioContext();
  } catch (e) {
    alert('Este navegador no soporta Web Audio API');
  }

  //creación de las fuentes de audio
  var fuente0=null;
  var fuente1=null;
  var fuente2=null;

  //selección del sistema a implementar
  switch(cantVoces){
    //Cuando se tiene una sola voz
    case 1:
    console.log("Solo hay una voz. Se va a transmitir tal cual ...");

    for(var i=0; i<=2; i++){
      if(isIniciado[i]){
        console.log("La voz que tengo es: "+i);
        vozSaliente=peers[i];
      }
    }
    break;

    //Cuando se tienen dos voces
    case 2:
    console.log("Hay dos voces. Procediendo a crear el sistema con Web Audio ....");

    //Selección de las voces a mezclar
    var j=0;
    for(var i=0; i<=2; i++){
      if(isIniciado[i]){
        console.log("Una de las voces es: "+i);

        if(j==0){
          console.log("La primera voz es: "+i);
          fuente0=contexto.createMediaStreamSource(peers[i]);
          console.log(peers[i]);
          j++;

        }else if(j==1){
          console.log("La segunda voz es: "+i);
          fuente1=contexto.createMediaStreamSource(peers[i]);
          console.log(peers[i]);
          j++;
        }
      }
    }

    //fuente->splitter
    var splitter0 = contexto.createChannelSplitter(2);
    var splitter1 = contexto.createChannelSplitter(2);

    fuente0.connect(splitter0);
    fuente1.connect(splitter1);

    //splitter->ganancia
    var ganancia0 = contexto.createGain();
    ganancia0.gain.value = 0.33;
    var ganancia1 = contexto.createGain();
    ganancia1.gain.value = 0.33;

    splitter0.connect(ganancia0, 0);
    splitter1.connect(ganancia1, 0);

    //ganancia->merger
    var merger = contexto.createChannelMerger(2);

    ganancia0.connect(merger,0, 0);
    ganancia1.connect(merger,0, 1);

    //definición del script
    var tamanoBuffer = 4096;
    var nodoProcesamienoPCM = contexto.createScriptProcessor(tamanoBuffer, 2, 1);

    nodoProcesamienoPCM.onaudioprocess = function (event) {
      var input = event.inputBuffer;
      var output = event.outputBuffer;

      var inputA = input.getChannelData(0);
      var inputB = input.getChannelData(1);
      var outputA = output.getChannelData(0);

      for (var i = 0; i < tamanoBuffer; i++) {
        outputA[i] = inputA[i] + inputB[i];
      }
    }

    //merger->script
    merger.connect(nodoProcesamienoPCM);

    //creación de un destino MediaStream
    var nodoFlujoFinal = contexto.createMediaStreamDestination();

    //script->destino
    nodoProcesamienoPCM.connect(nodoFlujoFinal);

    //escuchar el flujo final como MediaStream
    vozSaliente=nodoFlujoFinal.stream;
    console.log("El MediaStream resultante es: ");
    console.log(vozSaliente);
    break;

    //Cuando se tienen tres voces
    case 3:
    console.log("Hay tres voces. Procediendo a crear el sistema con Web Audio ....");
    fuente0=contexto.createMediaStreamSource(peers[0]);
    fuente1=contexto.createMediaStreamSource(peers[1]);
    fuente2=contexto.createMediaStreamSource(peers[2]);

    //creación de los splitters
    var splitter0 = contexto.createChannelSplitter(2);
    var splitter1 = contexto.createChannelSplitter(2);
    var splitter2 = contexto.createChannelSplitter(2);

    //fuente->splitter
    fuente0.connect(splitter0);
    fuente1.connect(splitter1);
    fuente2.connect(splitter2);

    //creación de las ganancias
    var ganancia0 = contexto.createGain();
    ganancia0.gain.value = 0.33;
    var ganancia1 = contexto.createGain();
    ganancia1.gain.value = 0.33;
    var ganancia2 = contexto.createGain();
    ganancia2.gain.value = 0.33;

    //splitter->ganancia
    splitter0.connect(ganancia0, 0);
    splitter1.connect(ganancia1, 0);
    splitter2.connect(ganancia2, 0);

    //definición de los bloques merge
    var merger0 = contexto.createChannelMerger(2);
    var merger1 = contexto.createChannelMerger(2);

    //definición de los bloques mezcladores
    var tamanoBuffer = 4096;
    var nodoProcesamienoPCM0 = contexto.createScriptProcessor(tamanoBuffer, 2, 1);
    nodoProcesamienoPCM0.onaudioprocess = function (event) {
      var input = event.inputBuffer;
      var output = event.outputBuffer;

      var inputA = input.getChannelData(0);
      var inputB = input.getChannelData(1);
      var outputA = output.getChannelData(0);

      for (var i = 0; i < tamanoBuffer; i++) {
        outputA[i] = inputA[i] + inputB[i];
      }
    }

    var nodoProcesamienoPCM1 = contexto.createScriptProcessor(tamanoBuffer, 2, 1);
    nodoProcesamienoPCM1.onaudioprocess = function (event) {
      var input = event.inputBuffer;
      var output = event.outputBuffer;

      var inputA = input.getChannelData(0);
      var inputB = input.getChannelData(1);
      var outputA = output.getChannelData(0);

      for (var i = 0; i < tamanoBuffer; i++) {
        outputA[i] = inputA[i] + inputB[i];
      }
    }

    //ganancia0,ganancia1 -> merge0
    ganancia0.connect(merger0, 0, 0);
    ganancia1.connect(merger0, 0, 1);

    //merger0-> script0
    merger0.connect(nodoProcesamienoPCM0);

    //ganancia2,script0 -> merger1
    ganancia2.connect(merger1, 0, 0);
    nodoProcesamienoPCM0.connect(merger1, 0, 1);

    //merger1 -> script1
    merger1.connect(nodoProcesamienoPCM1);

    //creación de un nodo de destino
    var nodoFlujoFinal = contexto.createMediaStreamDestination();

    //script1 -> destino
    nodoProcesamienoPCM1.connect(nodoFlujoFinal);

    //escuchar el flujo final como MediaStream
    vozSaliente = nodoFlujoFinal.stream;
    break;

    default:break;
  }

  var audioMezcla = document.getElementById('audioMezcla');
  audioMezcla = JsSIP.rtcninja.attachMediaStream(audioMezcla, vozSaliente);
};


/*
* Verificación de la cantidad de flujos remotos que se tienen
* Si se tienen ya todas las voces de los participantes, se procede a
* realizar o responder una llamada telefónica
*/
RevisarVozParticipantes=
function(){

  var cantVoces=0;
  peers.forEach(function(item){
    if(typeof item != 'undefined'){
      cantVoces++;
      console.log('CPBX ---> Hay '+cantVoces+' flujos');
      AgregaTextoLog('CPBX ---> Hay '+cantVoces+' flujos',2);
    }
  });

  if(cantVoces==cantParticipantes){
    console.log('CPBX ---> Ya tengo todas las voces. Procediendo a manejar la llamada ...');
    AgregaTextoLog('CPBX ---> Ya tengo todas las voces. Procediendo a manejar la llamada ...',2);

    //Si las voces son válidas, se procesan
    ProcesarAudio(cantVoces);

    //Habiendo comenzado a procesar con Web Audio, se realiza/responde una llamada
    if(isPeticionLlamada){
      console.log('CPBX ---> Se realizará una llamada ...');
      AgregaTextoLog('CPBX ---> Se realizará una llamada ...',2);
      NuevaLlamada();
    }

    else if(isLlamadaEntrante){
      console.log('CPBX ---> Se responderá una llamada ...');
      AgregaTextoLog('CPBX ---> Se responderá una llamada ...',2);
      ResponderLlamada();
    }

  }else{
    console.log('CPBX ---> Aún no tengo todas las voces .... (Voces: '+cantVoces+') (Personas: '+cantParticipantes+')');
    AgregaTextoLog('CPBX ---> Aún no tengo todas las voces ....',2);
  }
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
  AgregaTextoLog('CPBX ---> Ejecutando CrearOfertaSDP. Creando oferta...',2);

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
  AgregaTextoLog('CPBX ---> Creando respuesta al otro usuario',2);

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
  AgregaTextoLog("CPBX ---> Ejecutando función RevisarStatusCanal",2);

  console.log("CPBX ---> Banderas: isIniciado= " + isIniciado[clienteDestino] + ", isCanalListo= " + isCanalListo + "isIniciaLlamada= " + isIniciaLlamada);
  AgregaTextoLog("CPBX ---> Banderas: isIniciado= " + isIniciado[clienteDestino] + ", isCanalListo= " + isCanalListo + "isIniciaLlamada= " + isIniciaLlamada,2);

  // Si el canal está listo, se tienen los flujos locales pero no se ha iniciado la llamada,
  // es necesario crear un PeerConnection para comenzar la negociación WebRTC
  if (!isIniciado[clienteDestino] && isCanalListo) {

    CrearPeerConnection(clienteDestino);
    isIniciado[clienteDestino] = true;
    console.log("CPBX ---> Se ha creado un PeerConnection con el otro usuario (isIniciado: " + isIniciado[clienteDestino] + ")");
    AgregaTextoLog("CPBX ---> Se ha creado un PeerConnection con el otro usuario (isIniciado: " + isIniciado[clienteDestino] + ")",2);

    // Si yo inicié se ejecuta la función CrearOfertaSDP
    if (isIniciaLlamada) {
      CrearOfertaSDP(clienteDestino);
    }
  }
};


CrearTonoMarcando =
function () {
  console.log("estoy creando el tono sordo ....");
  //galería de tonos disponibles
  var tonoLlamada = 'tonos/tonoLlamada.wav';

  //carga asíncrona en un buffer
  var request = new XMLHttpRequest();
  request.open('GET', tonoLlamada, true);
  request.responseType = 'arraybuffer';

  request.onload = function () {
    console.log('CPBX ---> Guardando en buffer...');
    AgregaTextoLog('CPBX ---> Guardando en buffer...',2);

    context.decodeAudioData(request.response,function (buffer) {
      bufferAudio = buffer;
      console.log("CPBX ---> Buffer listo");
      AgregaTextoLog('CPBX ---> Buffer listo',2);
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
  console.log("El flujo local es:");
  console.log(flujoLocal);
  console.log("CPBX ---> Tono de invitación cargado");
  AgregaTextoLog('CPBX ---> Tono de invitación cargado',2);
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
    AgregaTextoLog("CPBX ---> (OK): " + usuario,2);

    idUsuario = usuario;
    isCanalListo = true;
    CrearTonoMarcando();
  });

  //Cuando reciba Service Unavailable
  socket.on("Service Unavailable", function (error) {
  });

  //Cuando reciba INVITE
  socket.on("INVITE", function (mensaje) {
    if(isPeticionLlamada || isLlamadaEntrante){
      //solo cuando está una llamada activa recibo peticiones de invitación
      console.log("CPBX ---> (INVITE)");
      AgregaTextoLog("CPBX ---> (INVITE)",2);
      console.log(mensaje);

      //RevisarStatusCanal(mensaje.de);
      EnviarMensaje("INVITE", idUsuario, nombreUsuario);
    }
  });

  //Cuando reciba MESSAGE
  socket.on("MESSAGE", function (mensaje) {

    if (mensaje.contenido.type == 'offer') {
      console.log("CPBX ---> (MESSAGE) type: offer de (" + mensaje.de + ")");
      AgregaTextoLog("CPBX ---> (MESSAGE) type: offer de (" + mensaje.de + ")",2);

      // Esta es una oferta SDP
      // Si no soy quien inició la llamada, y aún no se
      // ha arrancado la comunicación, se debe revisar el estado del canal
      console.log("isIniciaLlamada: "+isIniciaLlamada+" isIniciado: "+isIniciado[mensaje.de]);
      if (!isIniciaLlamada && !isIniciado[mensaje.de]) {
        RevisarStatusCanal(mensaje.de);
      }

      // Se guarda la oferta SDP como descripción remota
      // Esta función es de la API de WebRTC
      // Después, se envía una respuesta
      peerConnections[mensaje.de].setRemoteDescription(new RTCSessionDescription(mensaje.contenido));
      console.log('CPBX ---> Se guardó la oferta SDP');
      AgregaTextoLog('CPBX ---> Se guardó la oferta SDP',2);
      CrearRespuestaSDP(mensaje.de);

    } else if (mensaje.contenido.type == 'answer' && isIniciado[mensaje.de]) {
      // Esta es una respuesta SDP
      // Se guarda como una descripción remota
      peerConnections[mensaje.de].setRemoteDescription(new RTCSessionDescription(mensaje.contenido));
      console.log('CPBX ---> Se guardó la respuesta SDP');
      AgregaTextoLog('CPBX ---> Se guardó la respuesta SDP',2);

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
      AgregaTextoLog('CPBX ---> Se agregó al candidato ICE',2);

    }else if(mensaje.contenido.type == 'hangup'){
      // Petición para colgar la llamada actual
      console.log("CPBX ---> Colgando la llamada actual ....");
      AgregaTextoLog("CPBX ---> Colgando la llamada actual ....",2);
      ColgarLlamada();

    }
    else if(mensaje.contenido.type=="call"){
      // Petición de marcación para el PBX
      numTel="9"+mensaje.contenido.number;
      console.log("CPBX ---> Se desea marcar al número "+numTel);
      AgregaTextoLog("CPBX ---> Se desea marcar al número "+numTel,2);

      isPeticionLlamada=true;
      EnviarMensaje("INVITE", idUsuario, nombreUsuario);

    }else if(mensaje.contenido.type == 'log'){
      // Mensaje de log del servidor de señalización
      console.log("CPBX ---> Mensaje de log del servidor de señalización ....");
      AgregaTextoLog(mensaje.contenido.mensaje,0);

    }else{
      // Un nuevo usuario llegó a la sala
      console.log("CPBX ---> Ha llegado un nuevo usuario: " + mensaje.contenido);
      AgregaTextoLog("CPBX ---> Ha llegado un nuevo usuario: " + mensaje.contenido,2);

      isCanalListo = true;
      //isIniciaLlamada = true;
      //debo esperar a que me lleguen todos los audios para poder marcar!
      //aquí es donde sé quiénes están en la sala para poder hablar por teléfono ....
      cantParticipantes++;
      console.log("CPBX ---> Hay "+cantParticipantes+" participantes en este momento ...");
      AgregaTextoLog("CPBX ---> Hay "+cantParticipantes+" participantes en este momento ...",2);
    }
  });

  //Cuando reciba BYE
  socket.on("BYE", function (clienteDestino) {
    console.log("CPBX ---> (BYE) de : " + clienteDestino);
    AgregaTextoLog("CPBX ---> (BYE) de: " + clienteDestino,2);
    cantParticipantes--;
    console.log("Los participantes que quedan en la sala son: "+cantParticipantes);
    AgregaTextoLog("Los participantes que quedan en la sala son: "+cantParticipantes,2);

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
