/*
 *Clase InterfazGrafica
 */
function InterfazGrafica() {
    //Nombres de los participantes en la sala
    var _participantes = new Array(3);
    _participantes[0] = "";
    _participantes[1] = "";
    _participantes[2] = "";
    _participantes[3] = "";
    
    var mosaicoNombre1;
    var mosaicoNombre2;
    var mosaicoNombre3;
    var mosaicoVideo1;
    var mosaicoVideo2;
    var mosaicoVideo3;
    var mosaicoLlamada;
    var logTexto;
    
    console.log("Interfaz gráfica registrada");
    
    
    /*
     * Muestra en la UI un error dependiendo del código recibido
     * @codError: 0 - Sala llena, 1 - Nombre duplicado
     */ 
    this.NotificarError = 
    function (codError) {
        switch (codError) {
            case 0:
                console.log("(UI) ---------> La sala está llena");
                document.getElementById('mensajeError').innerHTML = "La sala está llena. Intentalo más tarde";
                break;
            case 1:
                console.log("(UI) ---------> El nombre está duplicado");
                document.getElementById('mensajeError').innerHTML = "El nombre ya existe en la sala. Prueba con uno diferente";
                break;
        }
    };
    
    /*
     * Establece en el banner de la página el nombre de este usuario
     */ 
    this.EstablecerMiNombre = 
    function (nombre) {
        document.getElementById("nombreLocal").innerHTML = "¡ Bienvenido " + nombre + " !";
    };
    
    /*
     * Registra el id y nombre de un usuario para que 
     * posteriormente se muestre su audio/video
     * @idUsuario: valor numérico provisto por el servidor
     * @nombre: nombre del usuario
     */ 
    this.NuevoUsuario = 
    function (idUsuario, nombre) {
        _participantes[idUsuario] = nombre;
        console.log("(UI) ---------> Se ha registrado en la UI: (" + idUsuario + ") " + _participantes[idUsuario]);
    };
    
    /*
     * Carga el html de la sala de videoconferencia
     * Invoca el método de la interfaz gráfica que reconoce el DOM de los elementos
     */ 
    this.RedireccionarSala = 
    function () {
        console.log("Me estoy redireccionando ...");
        var html = [
            '<!DOCTYPE html>',
            '<html lang="es">',
            '<head>',
            '    <link rel="stylesheet" type="text/css" href="assets/css/style.css">',
            '	<link href="http://fonts.googleapis.com/css?family=Raleway:500,600,700,100,800" rel="stylesheet" type="text/css">',
            '    <title>Rendez Vouz</title>',
            '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>',
            '    <script src="assets/js/adapter.js"></script>',
            '    <script src="assets/js/scripts.js"></script>',
            '    <script src="socket.io-client/socket.io.js"></script>',
            '    <script src="assets/js/Modelos/InterfazGrafica.js"></script>',
            '    <script src="assets/js/Modelos/UsuarioWeb.js"></script>',
            '    <script src="assets/js/clienteWebRTC.js"></script>',
            '</head>',
            '<body onload=cargarSoftphone()>',
            '<div id="container">',
            '	<div id="header">',
            '		<div id="headerMargen">',
            '		</div>',
            '		<img src="assets/images/logoSi.png" style="width:20%; z-index:2;margin-left: -87%;margin-top: -30px;">',
            '		<div id="headerNombre">',
            '			<p id="nombreLocal" style="font-size:18px;color:#FFF;font-family:"Raleway";text-align:right;"></p>',
            '		</div>',
            '		<div id="headerSalir" onClick="salirSala()">',
            '		    <img src="assets/images/btnSalir.png" onmouseover="javascript:this.src="assets/images/btnSalirHover.png";" ',
            'onmouseout="javascript:this.src="assets/images/btnSalir.png";">',
            '			<p id="btnSalir" style="float:left;font-size:18px;font-family:"Raleway"; text-align:center;">Salir</p>',
            '		</div>',
            '	</div>',
            '	<div id="margenMosaicos">',
            '	</div>',
            '	<div id="mosaicos">',
            '		<div class="mosaico" style="background-color:#2E2EFE; margin-right:2%;">',
            '			<div class="nombreMosaico" style="background-color:#2E2EFE;">',
            '				<img src="assets/images/btnUno.png">',
            '				<p id="mosaicoNombre1" style="font-size:18px;font-family:"Raleway"; margin-left:20px;"></p>',
            '			</div>',
            '			<div class="videoMosaico" style="background-color:#2E2EFE;">',
            '				<video id="mosaicoVideo1" style="background-color:#2E2EFE; width:320px;" autoplay></video>',
            '			</div>',
            '		</div>',
            '		<div class="mosaico" style="background-color:#B40404; margin-right:2%;">',
            '			<div class="nombreMosaico" style="background-color:#B40404;">',
            '				<img src="assets/images/btnDos.png">',
            '                <p id="mosaicoNombre2" style="font-size:18px;font-family:"Raleway"; margin-left:20px;"></p>',
            '			</div>',
            '			<div class="videoMosaico" style="background-color:#B40404">',
            '                <video id="mosaicoVideo2" style="background-color:#B40404;width 100%; width:320px;" autoplay></video>',
            '			</div>',
            '		</div>',
            '		<div class="mosaico" style="background-color:#2E2E2E;"> ',
            '			<div class="nombreMosaico" style="background-color:#2E2E2E;">',
            '				<img src="assets/images/btnTres.png">',
            '                <p id="mosaicoNombre3" style="font-size:18px;font-family:"Raleway"; margin-left:20px;"></p>',
            '			</div>',
            '			<div class="videoMosaico" style="background-color:#2E2E2E;">',
            '				<video id="mosaicoVideo3" style="background-color:#2E2E2E; width:320px;" autoplay></video>',
            '			</div>',
            '		</div>',
            '	</div>',
            '	<div id="pie">',
            '		<div id="log">',
            '			<div id="logNombre">',
            '			<p style="font-size:18px;font-family:"Raleway"; margin-left:50px;">Log</p>',
            '			</div>',
            '			<div id="logTexto" style="font-size:18px;overflow:scroll;">',
            '			</div>',
            '		</div>',
            '		<div id="icono">',
            '			<img id="iconLlamada" src="assets/images/phoneResting.png" style="width:35%;margin-left:-8%;margin-top: -30px;">',
	    '			<audio id="mosaicoLlamada" style="background-color:#A4A4A4; width:10px; height:10px" autoplay></audio>',
            '		</div>',
            '		<div id="telefono" class="softphone">',
            '			<div id="phone">',
            '                <img src="assets/images/Softphone.PNG">',
            '			</div>',
            '			<div id="soft">',
            '				<div id="screen">',
            '					<input id="pantalla" style="width:100%; height:50px;font-size:18px;font-family:"Raleway";border-radius: 10px;"type="text" value="" onkeypress="return validaTeclado(event);"/>',
            '					</br>',
            '				</div>',
            '				<div id="numbers">',
            '					<div id="number1" class="number" onclick="agregaTexto(1)">',
            '						<p>1</p>',
            '					</div>',
            '					<div class="number" onclick="agregaTexto(2)">',
            '						<p>2</p>',
            '					</div>',
            '					<div class="number" onclick="agregaTexto(3)">',
            '						<p>3</p>',
            '					</div>',
            '					<div class="number" onclick="agregaTexto(4)">',
            '						<p>4</p>',
            '					</div>',
            '					<div class="number" onclick="agregaTexto(5)">',
            '						<p>5</p>',
            '					</div>',
            '					<div class="number" onclick="agregaTexto(6)">',
            '						<p>6</p>',
            '					</div>',
            '					<div class="number" onclick="agregaTexto(7)">',
            '						<p>7</p>',
            '					</div>',
            '					<div class="number" onclick="agregaTexto(8)">',
            '						<p>8</p>',
            '					</div>',
            '					<div class="number" onclick="agregaTexto(9)">',
            '						<p>9</p>',
            '					</div>',
            '					<div class="number" onclick="agregaTexto("*")">',
            '						<p>*</p>',
            '					</div>',
            '					<div class="number" onclick="agregaTexto(0)">',
            '						<p>0</p>',
            '					</div>',
            '					<div class="number" onclick="agregaTexto("#")">',
            '						<p>#</p>',
            '					</div>',
            '				</div>',
            '				<div id="buttons">',
            '                    <img id="btnSend" src="assets/images/btnSend2.png" style="width:30%"; onmouseover="hoverVerde(this);" onmouseout="unhoverVerde(this);" onclick="llamarTel();"/>',
            '                    <img id="btnEnd" src="assets/images/btnEnd2.png" style="width:30%"; onmouseover="hoverRojo(this);" onmouseout="unhoverRojo(this);"/>',
            '				</div>',
            '			</div>',
            '		</div>',
            '	</div>',
            '	<div id="line">',
            '	</div>',
            '	<div id="footer">',
            '		<div id="logosFooter">',
            '			<img src="assets/images/iconIPN.png">',
            '			<img src="assets/images/iconUPIITA.png">',
            '			<img src="assets/images/iconTele.png">',
            '		</div>',
            '		<div id="logosNombres">',
            '			<div class="lg">',
            '			<p style="margin-left:20%;">Instituto Polit&eacute;cnico Nacional</p>',
            '			</div>',
            '			<div class="lg">',
            '			<p>UPIITA</p>',
            '			</div>',
            '			<div class="lg">',
            '			<p style="margin-left:-17%;">Ingenier&iacute;a Telem&aacute;tica</p>',
            '			</div>',
            '		</div>',
            '		<hr width="75%" color="#FFF" float="left"/>',
            '		<div id="nombresFooter">',
            '		<p>"Sistema de videoconferencia basado en WebRTC con acceso a la PSTN"</p>',
            '		<p>Alejos Mart&iacute;nez Jos&eacute; Luis</p>',
            '		<p>Sandoval Rosas Alfonso</p>',
            '		</div>',
            '	</div>',
            '</div>',
            '</body>',
            '</html>',
            ''
        ].join('');

        document.body.innerHTML = html;
        mosaicoNombre1 = document.getElementById('mosaicoNombre1');
        mosaicoNombre2 = document.getElementById('mosaicoNombre2');
        mosaicoNombre3 = document.getElementById('mosaicoNombre3');
        mosaicoVideo1 = document.getElementById('mosaicoVideo1');
        mosaicoVideo2 = document.getElementById('mosaicoVideo2');
        mosaicoVideo3 = document.getElementById('mosaicoVideo3');
	mosaicoLlamada= document.getElementById('mosaicoLlamada');
        logTexto = document.getElementById('logTexto');
    };
    



    /*
     * Muestra en el mosaico correspondiente el flujo local o remoto
     * @idUsuario: Valor numérico asignado por el servidor
     * @stream: Flujo multimedia
     */ 
    this.MostrarFlujo = 
    function (idUsuario, stream, propio) {
        
        switch (idUsuario) {
            case 0:
                attachMediaStream(mosaicoVideo1, stream);
                mosaicoNombre1.innerHTML = _participantes[idUsuario];
		if(propio)
                	mosaicoVideo1.volume -= 1;
		else
			mosaicoVideo1.volume = 1;
                console.log('(UI) ---------> Usuario 0 asignado en el mosaico 1');
                break;

            case 1:
                attachMediaStream(mosaicoVideo2, stream);
                mosaicoNombre2.innerHTML = _participantes[idUsuario];
		if(propio)
                	mosaicoVideo2.volume -= 1;
		else
			mosaicoVideo2.volume = 1;
                console.log('(UI) ---------> Usuario 1 asignado en el mosaico 2');
                break;

            case 2:
                attachMediaStream(mosaicoVideo3, stream);
                mosaicoNombre3.innerHTML = _participantes[idUsuario];
		if(propio)
                	mosaicoVideo3.volume -= 1;
		else
			mosaicoVideo3.volume = 1;
                console.log('(UI) ---------> Te pinté en remoteVideo2');
                break;

	    case 3:
		console.log("El audio recibido del usuario pbx es:");
                console.log(stream);
                attachMediaStream(mosaicoLlamada, stream);
                if (propio)
                    mosaicoLlamada.volume -= 1;
                else {
                    console.log("Volumen de pbx activado");
                    mosaicoLlamada.volume = 1;
                }
                document.getElementById("iconLlamada").src = "assets/images/phoneCalling.png";
		break;
        }
    };
    



    /*
     *Agrega texto al cuadro de log de la página
     */
    this.agregaTextoLog = 
    function (TextoLinea) {
        logTexto.innerHTML += "<p>" + TextoLinea + "</p>";
    };
    
    /*
     * Borra los flujos externos de un mosaico
     * @idUsuario: Valor numérico asignado por el servidor
     */ 
    this.RemoverFlujo = 
    function (idUsuario) {
        _participantes[idUsuario] = "";
        
        switch (idUsuario) {
            case 0:
                mosaicoNombre1.innerHTML = '';
                mosaicoVideo1.pause();
                mosaicoVideo1.src = '';
                mosaicoVideo1.load();
                break;
            case 1:
                mosaicoNombre2.innerHTML = '';
                mosaicoVideo2.pause();
                mosaicoVideo2.src = '';
                mosaicoVideo2.load();
                break;
            case 2:
                mosaicoNombre3.innerHTML = '';
                mosaicoVideo3.pause();
                mosaicoVideo3.src = '';
                mosaicoVideo3.load();
                break;
	    case 3:
                mosaicoLlamada.innerHTML = '';
                mosaicoLlamada.pause();
                mosaicoLlamada.src = '';
                mosaicoLlamada.load();
		document.getElementById("iconLlamada").src="assets/images/phoneResting.png";
                break;
        }
    };


   /*
    * Obtiene el número ingresado en el softphone
    * @return numTel: Número telefónico ingresado en el softphone
    */
    this.LlamarTelefono=
	function(){
	console.log("Obteniendo el número del softphone ...");
	var numTel = document.getElementById('pantalla');
	console.log(numTel.value);
	return numTel.value;
    };


    /*
     *Bloquea el softphone
     */
     this.BloquearSoftphone=
	function(){
	console.log("Bloqueando teléfono ...");
	document.getElementById('telefono').className='softphone2';
	
     };


    /*
     *Desbloquea el softphone
     */
     this.BloquearSoftphone=
	function(){
	console.log("Desbloqueando teléfono ...");
	document.getElementById('telefono').className='softphone';
	
     };
};


