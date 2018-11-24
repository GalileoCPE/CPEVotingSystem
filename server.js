/*
 * ===== CPEVotingSystem =====
 * | Main
 * | (c) 2018 - Pierre AVINAIN Galileo CPE Lyon
 * ===========================
 */


/* 
 * PARAMETRES GENERAUX
 */
var APP_version = "1.0";  // Version de l'application
var APP_clientFiles = ["script-console.js", "script-display.js", "script-vote.js"]; // Liste des fichiers client
var APP_startingTime = Date.now();     // Timestamp de démarrage de l'application
var APP_readyTime = null;     // Timestamp de l'application prête à décoder les positions entrantes



/* 
 * CHARGEMENT DES LIBRAIRIES
 */
var Config = require('./config.js'); // Chargement de la configuration
var Debug = require('./lib/Debug.js'); // LIB: Affichage console 

Debug.init(APP_version);
Debug.info("Starting application...");
Debug.info("Loading modules...");

var express = require('express');
var app = express();
var app_manager = express();
Debug.success("'express' loaded.");

var http = require('http');
var server = http.Server(app);
var server_manager = http.Server(app_manager);
Debug.success("'http' loaded.");

var socket_io = require('socket.io');
var io = socket_io.listen(server); // Socket Client
Debug.success("'socket.io' loaded.");

var randomstring = require('randomstring');
Debug.success("'randomstring' loaded.");

var fs = require('fs');
Debug.success("'fs' loaded.");

var Router = require('./lib/Router.js');
Router.init(Config.ROUTER_enable, Config.ROUTER_ip, Config.ROUTER_username, Config.ROUTER_password, Config.ROUTER_refresh);
Debug.success("'*Router' loaded.");

var Network = require('./lib/Network.js');
Network.init(io, Router, Config.ROUTER_enable);
Debug.success("'*Network' loaded.");

var VotingSystem = require('./lib/VotingSystem.js');
VotingSystem.init(Network, Router);
Network.setVotingSystem(VotingSystem)
Debug.success("'*VotingSystem' loaded.");

/*
 * ENREGISTREMENT DES ROUTES
 */
Debug.info("Registering routes...");

// Fichiers publics statiques
app.use(express.static('public'));

// Page de vote
app.get('/', function(req, res) {
	res.render('vote.ejs', {'APP_version': APP_version});
});

// Affichage
app.get('/display', function(req, res) {
	res.render('display.ejs', {'APP_version': APP_version, 'dispid': 0, 'domain': Config.APP_domain, 'hostpost': Config.ROUTER_name});
});
app.get('/display/:dispid', function(req, res) {
	if(!(/^\+?(0|[1-9]\d*)$/.test(req.params.dispid)))
		res.send("Invalid display ID.");

	res.render('display.ejs', {'APP_version': APP_version, 'dispid': req.params.dispid, 'domain': Config.APP_domain, 'hostpost': Config.ROUTER_name});
});

// Console de gestion
app.get('/console', function(req, res) {
	res.render('console.ejs', {'APP_version': APP_version});
});

// Envoi des fichiers Client
app.get('/client/dyn-:file', function(req, res) {
	let file = req.params.file; // Nom du fichier demandé

	// Si c'est un fichier Client, on le fournit
	if(APP_clientFiles.includes(file)) {
		res.render('client/' + file + '.ejs', {'APP_socketurl': Config.APP_socketurl});
		return;
	}

	// Sinon, on renvoie une erreur 404
	res.status(404);
	res.end();
});

/*
 * DÉMARRAGE DE L'ÉCOUTE SERVEUR
 */
Debug.info("Listening on " + Config.APP_listenPort + " port for client.");
server.listen(Config.APP_listenPort);


APP_readyTime = Date.now(); // Enregistrement de l'heure
Debug.success("CPEVotingSystem successfully loaded.");
console.log('------------------------------------------------------');

/*
 * ARRÊT DU SERVEUR 
 */
 process.on('SIGINT', function() {
 	console.log('------------------------------------------------------');
	Debug.warn("Stopping server, goodbye!");
	process.exit();
});
