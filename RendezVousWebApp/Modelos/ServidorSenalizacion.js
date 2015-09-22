/**
 * Clase ServidorSenalizacion
 * @param app: Instancia de Express para vincular con un socket de este servidor
 **/ 
function ServidorSenalizacion(app) {
    var _app = app;                        //Servidor web
    var _room = 'default';                 //Sala de videoconferencia
    var _participantes = new Array(3);     //Participantes en la sala
    var _numClientes = 0;                  //Cantidad actual de participantes
    
    // Se conecta un socket al servidor para atender mensajes de señalización
    var _io = null;
    
    /**
    * Reset de la sala de videoconferencia
    **/ 
    this.InicializarSala =
    function () {
        console.log("Inicializando sala de videoconferencia ... " + _numClientes);
        _participantes [0] = { "nombreUsuario": "", "socket": null };
        _participantes [1] = { "nombreUsuario": "", "socket": null };
        _participantes [2] = { "nombreUsuario": "", "socket": null };
        _participantes [3] = { "nombreUsuario": "", "socket": null };
        
        _io = require('socket.io').listen(_app);
        console.log("************** SERVIDOR ESCUCHANDO **************");
    };
    
    /**
     * Subscripción de métodos de gestión del socket de servidor
     * y arranque del mismo
     **/ 
    this.Iniciar =
    function () {
        //Detección de conexión remota
        _io.sockets.on('connection', function (socket) {
            console.log('SS --> (Conexión detectada)');
            
            // 1.- Mensajes solicitando registro
            socket.on('REGISTER', function (nombreUsuario) {
                console.log("SS --> (REGISTER): " + nombreUsuario);
                
                //Si la sala tiene cupo, se valida que el nombre no esté duplicado
                if (_numClientes <= 3) {
                    
                    console.log("Hay actualmente (" + _numClientes + ") clientes en la sala");
                    
                    //Se recorre el arreglo de participantes para verificar 
                    //que el nombre del nuevo participante no esté ya duplicado
                    var nombreValido = true;
                    
                    //Revisar que el nombre no exista aún en la sala
                    _participantes.forEach(function (item) {
                        if (item.nombreUsuario == nombreUsuario) {
                            console.log("Este nombre ya existe ...");
                            nombreValido = false;
                        }
                    });
                    
                    //El nombre ya está duplicado
                    if (!nombreValido) {
                        console.log("El nombre ya está duplicado")
                        socket.emit('Service Unavailable', 1);
                    }

                    //El nombre está disponible, se busca ahora la posición en la sala
                    else {
                        var nuevoId;
                        var i = 0;
                        
                        for (i = 0; i <= 3; i++) {
                            if (_participantes[i].nombreUsuario == "") {
                                nuevoId = i;
                                //Agregación al arreglo de sockets
                                _participantes[nuevoId].nombreUsuario = nombreUsuario;
                                _participantes[nuevoId].socket = socket;
                                console.log('La posicion del usuario en la sala es: ' + nuevoId);
                                break;
                            }
                        }
                        
                        try {
                            console.log("SS --> (Crear sala o unirse a sala) Usuario " + nombreUsuario);
                            console.log('SS --> La sala tiene ' + _numClientes + ' clientes');
                            
                            //El primer cliente en unirse
                            if (_numClientes == 0) {
                                socket.join(_room);                                    //Se le agrega a la sala
                                socket.emit('OK', 0);                                       //Mensaje de que se creó la sala
                                console.log('SS --> Primer cliente en la sala: ' + nuevoId);
                                _numClientes++;
                            } 

                            //Otros clientes en llegar a la sala
                            else {
                                //A todos quienes estén en la sala, se les envía un mensaje para notificar la llegada de un nuevo usuario
                                _io.sockets.in(_room).emit('MESSAGE', { de: nuevoId, para: '', contenido: nombreUsuario });
                                //Agregación del nuevo cliente         
                                socket.join(_room);
                                socket.emit('OK', nuevoId);
                                console.log('SS --> Nuevo cliente en la sala: ' + nuevoId);
                                _numClientes++;
                            }
                        } catch (e) {
                            console.log('Error en el mensaje conectar: ' + e.message);
                            return;
                        }
                    }
                    //La sala ya está llena
                } else {
                    console.log("La sala ya está llena")
                    socket.emit('Service Unavailable', 0);
                }
            });//Fin de register
            
            
            
            //2.- Mensajería instantánea
            socket.on('MESSAGE', function (mensaje) {
                console.log('SS -----> (MESSAGE): ', mensaje);
                //El mensaje va dirigido a un usuario en específico de la sala
                console.log('Mensaje de: ' + mensaje.de + ' para: ' + mensaje.para);
                _participantes[mensaje.para].socket.emit('MESSAGE', mensaje);
            });
            
            
            
            //3.- Notificación de que el usuario está listo para llamar a quien esté en la sala
            socket.on('INVITE', function (mensaje) {
                console.log('SS -----> (INVITE): ', mensaje);
                socket.broadcast.emit('INVITE', mensaje);
            });
            
            
            
            //4.- Salida del usuario de la sala
            socket.on('BYE', function (mensaje) {
                _participantes[mensaje].nombreUsuario = "";
                _participantes[mensaje].socket = null;
                socket.leave(_room);
                _numClientes--;
                console.log("Se la eliminado al cliente " + mensaje + " de la sala");
                _io.sockets.in(_room).emit('BYE', mensaje);
            });
        });
    };
};

//Creación del módulo para uso en app.js
module.exports = ServidorSenalizacion;