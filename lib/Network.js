/*
 * ===== CPEVotingSystem =====
 * | Gestionnaire des communications réseau (sockets)
 * | (c) 2018 - Pierre AVINAIN Galileo CPE Lyon
 * ===========================
 */

/*
 * Chargement des librairies.
 */
var Debug = require('./Debug.js');
var io;
var querystring = require('querystring');
var url = require('url');
var randomstring = require('randomstring');
const pm2 = require('@pm2/io');
var VotingSystem;
var Router;
var started = false;
var allowed_ckeys = [];
var allowed_vkeys = {}; // vkey => IP
var ROUTER_enable = false;
var connexionsCount = 0;


/*
 * Initialisation de la librairie, en démarrant la WebSocket de communication.
 */
exports.init = function(io_socket, router, router_enable) {
	io = io_socket;
	Router = router;
	ROUTER_enable = router_enable

	// Lors de la connexion d'un nouveau client, on fait un handshake
	io.sockets.on('connection', handshake);
}

exports.setVotingSystem = function(votingsystem) {
	VotingSystem = votingsystem;
	started = true;
}

pm2.init({
  metrics: {
    network: {
      ports: true
    }
  }
});

// Monitoring du nombre de connexions
const pm2connexionsCount = pm2.metric({
  name: 'Socket connexions',
  type: 'counter',
});



/*
 * Réalisation d'un handshake avec un client
 */
function handshake(socket) {
	if(!started)
		return;

	// Incrément du nombre de sockets
	connexionsCount++;
	pm2connexionsCount.set(connexionsCount);
	socket.on('disconnect', function() { connexionsCount--; pm2connexionsCount.set(connexionsCount); });

	socket.vs = {}; // Stockage de toutes les variables utilisées par CPEVotingSystem
 	// socket.vs.addr = socket.handshake.address; // Adresse IP du client
 	socket.vs.addr =socket.handshake.headers["x-forwarded-for"]; // Adresse IP du client
 	if(socket.vs.addr.includes(':')) {
 		socket.vs.addr = socket.vs.addr.split(':');
 		socket.vs.addr = socket.vs.addr[socket.vs.addr.length - 1];
 	}

 	// On peut passer par un proxy. Dans ce cas, l'adresse source est toujours localhost (::1)
 	// On prend donc l'adresse de Forward si elle existe
	if(socket.vs.addr == "1" && "x-forwarded-for" in socket.handshake.headers)
    	socket.vs.addr = socket.handshake.headers["x-forwarded-for"];

    // Si on a plusieurs IP a la suite, on prend la 1ere
    if(socket.vs.addr.includes(", "))
    	socket.vs.addr = socket.vs.addr.split(", ", 2)[0];

 	socket.vs.mode = querystring.parse(url.parse(socket.handshake.url).query).mode; // Mode d'accès
 	socket.vs.ckey = null;

 	// Si c'est un mode vote, on vérifie l'adresse IP
 	if(socket.vs.mode == "vote") {
 		let ip_ranges = VotingSystem.VW().votes_ip_ranges;
 		for(let i = 0; i < ip_ranges.length; i++) {
 			// Si on a trouvé au moins un groupe d'IP valides...
 			if(ip_in_range(socket.vs.addr, ip_ranges[i])) {
 				// Si on utilise les @MAC...
 				if(VotingSystem.VW().enable_mac_verification && ROUTER_enable) {
	 				let macaddr = Router.arplookup(socket.vs.addr);
	 				// Si aucun résultat dans la table ARP du routeur, on lui dit de réessayer plus tard
	 				if(macaddr == null || !Router.ready()) {
	 					socket.emit("main.noARP", {delay: Router.refresh()});
	 					socket.disconnect(true);
	 					return;
	 				}
	 				socket.vs.addr = macaddr;
	 			}

 				main_welcome(socket);
 				return;
 			}
 		}

 		// Si on a rien trouvé
 		Debug.warn('[' + socket.vs.addr + '] Eject invalid ip.');
 		socket.emit("main.invalid_ip", {});
 		return;
 	}

 	// Si c'est la console on demande une authentification
 	if(socket.vs.mode == "console") {
 		// Génération d'une clé unique de console
 		socket.vs.ckey = randomstring.generate(40);
 		socket.emit("main.auth", {}); // Demande d'authentification
 		socket.on("main.auth", function(e) {
 			if(e.security_key != VotingSystem.security_key()) {
 				socket.emit("main.auth.invalid", {});
 				return;
 			}

 			// Si c'est bon...
 			allowed_ckeys.push(socket.vs.ckey);
 			main_welcome(socket);
 		});
 		return;
 	}

 	main_welcome(socket);
}

function main_welcome(socket) {
	if(socket.vs.mode != "display" && socket.vs.mode != "vote" && socket.vs.mode != "console")
		return;

	Debug.success('[' + socket.vs.addr + '] Connected.');

	socket.join(socket.vs.mode);
	socket.emit("main.welcome", {ckey: socket.vs.ckey});

	// Si c'est un votant, on enregistre l'IP et on génère une vkey
	if(socket.vs.mode == "vote") {
		socket.vs.vkey = randomstring.generate(40);
		allowed_vkeys[socket.vs.vkey] = socket.id;

		// Evenements
		socket.on("vote.vote", vote);
		socket.on("comments.new", comments_new);

		// Rooms
		socket.join("vote-" + socket.vs.vkey);
		emit_VDATAS(socket.vs.vkey);
	}

	// Envoi du VW
	else if(socket.vs.mode == "console") {
		// Evenements
		socket.on("cloturer", cloturer);
		socket.on("candidate.end", candidate_end);
		socket.on("candidate.start", candidate_start);
		socket.on("candidate.rename", candidate_rename);
		socket.on("candidate.new", candidate_new);
		socket.on("candidate.delete", candidate_delete);
		socket.on("comments.new", comments_new);
		socket.on("comments.toggle", comments_toggle);
		socket.on("comments.delete", comments_delete);
		socket.on("screens.update", screens_update);
		socket.on("main.update_security_key", update_security_key);
		socket.on("screens.generique", screens_generique);

		// Rooms
		socket.join("mgmt");
		emit_VW(socket); // Envoi du VW
	}

	else if(socket.vs.mode == "display") {
		socket.on("screens.generique.ended", screens_generique_ended);

		socket.join("mgmt");
		emit_VW(socket); // Envoi du VW
	}
}




/******************
 ***** SOCKET *****
 ******************/

 /*
 * Emets un message dans une room particulière
 */
exports.emit = function(room, stream = "main", e = {}) {
	io.to(room).emit(stream, e);
}

/*
 * Déconnecte toutes les sockets dans une même room
 */
exports.disconnectRoom = function(roomID) {
	// Récupération de la room
	let room = io.sockets.adapter.rooms[roomID];
	if(room == undefined)
		return;

	// Liste des ID de socket présentes dans la room
	let socketsID = Object.keys(room.sockets);
	for(let i = 0; i < socketsID.length; i++) {
		// Pour chaque socket, on la déconnecte
		io.sockets.connected[socketsID[i]].disconnect();
	}
}

// Indique si une @IP est dans un range ou non
function ip_in_range(ip, range) {
	if(range == '*' || ip == range) // Si toutes les IP sont autorisées
		return true;

	// Si ce n'est pas un tableau à 2 entrées
	if(range.length != 2)
		return false;

	client = ip.split(".");
	range0 = range[0].split(".");
	range1 = range[1].split(".");

	// On vérifie la structure des IP
	if(client.length != 4 || range0.length != 4 || range1.length != 4)
		return false;

	// On vérifie pour chaque groupe qu'on est dans la tranche
	for (let i = 0; i < 4; i++) {
		if(!(parseInt(client[i]) >= parseInt(range0[i]) && parseInt(client[i]) <= parseInt(range1[i])))
			return false;
	}
	return true;
}

// Emmet le VW à la socket concernée
function emit_VW(socket) {
	socket.emit("main.vw", VotingSystem.VW());
}

// Emmet les VDATAS à la clé concernée
function emit_VDATAS(vkey) {
	if(!(vkey in allowed_vkeys))
		return false;

	// Récupération des données
	let ip = allowed_vkeys[vkey];
	let vote_datas = VotingSystem.vote_datas(ip);
	vote_datas.vkey = vkey;

	// Envoi
	io.to("vote-" + vkey).emit('vote.datas', vote_datas);
}

// Mise à jour des datas Vote pour tout le monde
function broadcast_VDATAS() {
	let vkeys = Object.keys(allowed_vkeys);
	for (let i = 0; i < vkeys.length; i++) {
		emit_VDATAS(vkeys[i]);
	}
}




/*******************
 ***** GENERAL *****
 *******************/

function update_security_key(e) {
	if(!allowed_ckeys.includes(e.ckey))
		return;

	if(VotingSystem.update_security_key(e.new_security_key))
		io.to("mgmt").emit('main.update_security_key', VotingSystem.VW());
}

function vote(e) {
	if(!(e.vkey in allowed_vkeys))
		return;

	let ip = allowed_vkeys[e.vkey];
	if(VotingSystem.vote(ip, e.candidate)) { // Si le vote a fonctionné
		emit_VDATAS(e.vkey);
		io.to("vote-" + e.vkey).emit('vote.vote', true);
		io.to("mgmt").emit('main.vw', VotingSystem.VW());
	}
}

function cloturer(e) {
	if(!allowed_ckeys.includes(e.ckey))
		return;

	let delay = e.delay;
	if(!Number.isInteger(delay) || delay > 600)
		return;

	Debug.important("Cloture des votes dans " + delay + "s.");
	let votes_closed = new Date();
	votes_closed.setSeconds(votes_closed.getSeconds() + delay);

	if(VotingSystem.close_votes(votes_closed)) {
		io.to("mgmt").emit('cloture', VotingSystem.VW());
		broadcast_VDATAS();
	}
}




/*********************
 ***** CANDIDATS *****
 *********************/

function candidate_new(e) {
	if(!allowed_ckeys.includes(e.ckey))
		return;

	if(VotingSystem.candidate_new(e.name, e.attr)) {
		io.to("mgmt").emit('candidate.new', VotingSystem.VW());
		broadcast_VDATAS();
	}
}

function candidate_rename(e) {
	if(!allowed_ckeys.includes(e.ckey))
		return;

	if(VotingSystem.candidate_rename(e.id, e.new_name)) {
		io.to("mgmt").emit('candidate.rename', VotingSystem.VW());
		broadcast_VDATAS();
	}
}

function candidate_delete(e) {
	if(!allowed_ckeys.includes(e.ckey))
		return;

	if(VotingSystem.candidate_delete(e.id)) {
		io.to("mgmt").emit('candidate.delete', VotingSystem.VW());
		broadcast_VDATAS();
	}
}

function candidate_start(e) {
	if(!allowed_ckeys.includes(e.ckey))
		return;

	if(VotingSystem.candidate_start(e.candidate)) {
		io.to("mgmt").emit('candidate.start', VotingSystem.VW());
		broadcast_VDATAS();
	}
}

function candidate_end(e) {
	if(!allowed_ckeys.includes(e.ckey))
		return;

	if(VotingSystem.candidate_end())
		io.to("mgmt").emit('candidate.end', VotingSystem.VW());
}




/*********************
 ****** MESSAGES *****
 *********************/

function comments_toggle(e) {
	if(!allowed_ckeys.includes(e.ckey))
		return;

	if(VotingSystem.comments_toggle()) {
		io.to("mgmt").emit('comments.update', VotingSystem.VW());
		broadcast_VDATAS();
	}
}

function comments_new(e) {
	if(!(e.vkey in allowed_vkeys))
		return;

	if(VotingSystem.comments_new(e.message)) {
		io.to("vote-" + e.vkey).emit('comments.new', true);
		io.to("mgmt").emit('comments.update', VotingSystem.VW());
	}
}

function comments_delete(e) {
	if(!allowed_ckeys.includes(e.ckey))
		return;

	if(VotingSystem.comments_delete(e.id))
		io.to("mgmt").emit('comments.update', VotingSystem.VW());
}




/**********************
 ***** AFFICHAGES *****
 **********************/

function screens_update(e) {
	if(!allowed_ckeys.includes(e.ckey))
		return;

	if(VotingSystem.screens_update(e.sid, e.stype))
		io.to("mgmt").emit('screens.update', VotingSystem.VW());
}

// lance le générique
function screens_generique(e) {
	io.to("display").emit('screens.generique', {});
}

// générique terminé
function screens_generique_ended(e) {
	io.to("display").emit('screens.generique.ended', {});
}
