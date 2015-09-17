/*
 *Clase InterfazGrafica
 */
function InterfazGrafica() {
    //DOM
    var localVideo = document.querySelector('#localVideo');
    var remoteVideo = document.querySelector('#remoteVideo');
    var remoteVideo2 = document.querySelector('#remoteVideo2');
    var nombreLocal = document.querySelector('#nombreLocal');
    var nombreRemoto1 = document.querySelector('#nombreRemoto1');
    var nombreRemoto2 = document.querySelector('#nombreRemoto2');
    
    //Nombres de los participantes en la sala
    var _participantes = new Array(3);
    _participantes[0] = "";
    _participantes[1] = "";
    _participantes[2] = "";
    _participantes[3] = "";

    console.log("Interfaz gráfica registrada");
    
    
    /*
     * Muestra en la UI un error dependiendo del código recibido
     * @codError: 0 - Sala llena, 1 - Nombre duplicado
     */ 
    this.NotificarError = function (codError) {
        switch (codError) {
            case 0:
                console.log("(UI) ---------> La sala está llena");
                break;
            case 1:
                console.log("(UI) ---------> El nombre está duplicado");
                break;
        }
    };
    
    
    /*
     * Registra el id y nombre de un usuario para que 
     * posteriormente se muestre su audio/video
     * @idUsuario: valor numérico provisto por el servidor
     * @nombre: nombre del usuario
     */ 
    this.NuevoUsuario = function (idUsuario, nombre){
        _participantes[idUsuario] = nombre;
        console.log("(UI) ---------> Se ha registrado en la UI: (" + idUsuario + ") "+_participantes[idUsuario]);
    }
    

    /*
     * Muestra en el mosaico correspondiente el flujo local o remoto
     * @idUsuario: Valor numérico asignado por el servidor
     * @stream: Flujo multimedia
     */ 
    this.MostrarFlujo = function (idUsuario, stream) {
        
        switch (idUsuario) {
            case 0:
                attachMediaStream(localVideo, stream);
                nombreLocal.innerHTML = _participantes[idUsuario];
                localVideo.volume -= 1;
                console.log('(UI) ---------> Te pinté en localVideo');
                break;
            case 1:
                attachMediaStream(remoteVideo, stream);
                nombreRemoto1.innerHTML = _participantes[idUsuario];
                remoteVideo.volume -= 1;
                console.log('(UI) ---------> Te pinté en remoteVideo');
                break;
            case 2:
                attachMediaStream(remoteVideo2, stream);
                nombreRemoto2.innerHTML = _participantes[idUsuario];
                remoteVideo2.volume -= 1;
                console.log('(UI) ---------> Te pinté en remoteVideo2');
                break;
        }
    };
    
    
    /*
     * Borra los flujos externos de un mosaico
     * @idUsuario: Valor numérico asignado por el servidor
     */ 
    this.RemoverFlujo = function (idUsuario) {
        _participantes[idUsuario] = "";

        switch (idUsuario) {
            case 0:
                nombreLocal.innerHTML = '';
                localVideo.pause();
                localVideo.src = '';
                localVideo.load();
                break;
            case 1:
                nombreRemoto1.innerHTML = '';
                remoteVideo.pause();
                remoteVideo.src = '';
                remoteVideo.load();
                break;
            case 2:
                nombreRemoto2.innerHTML = '';
                remoteVideo2.pause();
                remoteVideo2.src = '';
                remoteVideo2.load();
                break;
        }
    };
};


