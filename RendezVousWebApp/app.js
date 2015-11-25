///////////////////////////////////////////////////////////////////////
/////////////////// INSTITUTO POLITÉCNICO NACIONAL ////////////////////
////////UNIDAD PROFESIONAL INTERDISCIPLINARIA EN INGENIERÍA Y//////////
/////////////////////////TECNOLOGÍAS AVANZADAS/////////////////////////
/////////////////////////INGENIERÍA TELEMÁTICA/////////////////////////
///////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////
/////////////////////////PROYECTO TERMINAL II//////////////////////////
//////////////////// RENDEZ-VOUS - SERVIDOR WEB ///////////////////////
///////////////////////////////////////////////////////////////////////
//////////////////////ALEJOS MARTÍNEZ JOSÉ LUIS////////////////////////
///////////////////////SANDOVAL ROSAS ALFONSO//////////////////////////
///////////////////////////////////////////////////////////////////////

/***EL SCRIPT CORRESPONDE A UN SERVIDOR WEB, EL CUAL SERÁ EL ENCARGADO
 * DE GESTIONAR LA SALA DE VIDEOCONFERENCIA (PETICIONES, ENTRADA,
 * LLAMADAS DE LOS USUARIOS, SALIDA) ASÍ COMO LA CONEXIÓN CON EL SERVIDOR
 * PBX ASTERISK
***/

//Importar el servidor web express
var express = require('express');

//Importar el midleware serve-static. Este permite proveer páginas que no cambian
var serveStatic = require('serve-static');

//Importar socket.io
var io = require('socket.io');

//Invocar el servidor y enviar en la petición las páginas de la carpeta public
//se envía por default la página index.html
var app = express().use(serveStatic(__dirname + '/public')).listen(3000, "0.0.0.0");

//Uso del modelo ServidorSenalizacion
var Servidor = require('./Modelos/ServidorSenalizacion.js');
var serv = new Servidor(app);

//Creación de la instancia
serv.InicializarSala();
serv.Iniciar();

//apertura del panel de control del sistema
//junto con el panel se creará una nueva instancia de UsuarioPBX
//la cual se conectará automáticamente a Asterisk
var open = require('open');
open("10.100.0.3:3000/assets/panelControl.html","/home/labmovil-1/Descargas/firefox/firefox");
//open("10.100.0.3:3000/assets/panelControl.html","google-chrome");
//open("10.100.0.3:3000/assets/panelControl.html","firefox");
