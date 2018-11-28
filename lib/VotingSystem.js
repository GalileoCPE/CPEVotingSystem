/*
 * ===== CPEVotingSystem =====
 * | Gestionnaire des votes
 * | (c) 2018 - Pierre AVINAIN Galileo CPE Lyon
 * ===========================
 */

/*
 * Chargement des librairies.
 */
var Debug = require('./Debug.js');
var fs = require('fs');
var Network;
var Router;

const DONE = 1;
const CURRENT = 2;
const PENDING = 3;

const SCR_NAMES = "names";
const SCR_COMMENTS = "comments";
const SCR_AUDIO = "audio";
const SCR_NONE = "none";
const ALL_SCR_TYPES = [SCR_NAMES, SCR_COMMENTS, SCR_AUDIO, SCR_NONE];
const NB_SCR = 3; // Nombre d'écrans

// VotingView
VW_FILE = "./vw.json";
var VW = {
	// FIX
	name: "CPEVotingSystem",
	enable_mac_verification: true,
	votes_ip_ranges: [
		// CPE
		['10.170.0.0', '10.170.255.255'],
		['134.214.0.0', '134.214.255.255']
	],

	// UPDATABLE
	security_key: "vs",
	enable_comments: false,
	screens: {
		s0: SCR_NAMES,
		s1: SCR_NONE,
		s2: SCR_COMMENTS
	},
	current_candidate: null, // Numéro du candidat en cours
	votes_closed: null,   // Timestamp de la cloture des votes
	candidates: {},
	next_id: 1,
	votes: {},
	comments: []
}

var VW_test = {
	// GENERAL
	name: "CPEVoice",
	enable_comments: false,
	screens: {
		s0: SCR_NAMES,
		s1: SCR_NONE,
		s2: SCR_COMMENTS
	},

	// SECURITY
	enable_mac_verification: true,
	security_key:  "",
	votes_ip_ranges: [
		'*',
		['192.168.0.1', '192.168.0.20']
	],

	// DEFAULT
	current_candidate: null, // Numéro du candidat en cours
	votes_closed: null,   // Timestamp de la cloture des votes
	candidates: {   // Liste des candidats
		1: {
			name: "Cand A",
			attr: "Song of Monday",
			state: PENDING,
			voting_time: null
		},
		2: {
			name: "Cand B",
			attr: "Song of Tuesday",
			state: PENDING,
			voting_time: null
		},
		3: {
			name: "Cand C",
			attr: "Song of Wednesday",
			state: PENDING,
			voting_time: null
		}
	},
	next_id: 4,
	votes: { // Liste des votes
		'::1': {
			date: new Date(),
			candidate: 1
		}
	},
	comments: [
		'CHou fleur !',
		'Sympa !!!'
	]
}

/*
 * Initialisation de la librairie
 */
exports.init = function(network, router) {
	Network = network;
	Router = router;

	// On démarre la verif routeur
	if(VW.enable_mac_verification)
		Router.start();

	return restore(); // Restauration du VW
}



/*******************
 ***** GENERAL *****
 *******************/

// Mise à jour de la clé de sécurité
exports.update_security_key = function(new_security_key) {
	VW.security_key = new_security_key;
	save();
	return true;
}

// Cloture des votes
exports.close_votes = function(votes_closed) {
	exports.candidate_end();
	VW.votes_closed = votes_closed;
	save();
	return true;
}

// Enregistre un vote
exports.vote = function(IP, candidate) {
	candidate = parseInt(candidate); // Str --> Int

	// On vérifie que les votes ne sont pas terminés
	if(VW.votes_closed != null && new Date() >= VW.votes_closed)
		return false;

	// On vérifie que le candidat existe
	if(!(candidate in VW.candidates))
		return false;

	// On vérifie que le candidat est passé ou en cours
	if(VW.candidates[candidate].state == PENDING)
		return false;

	Debug.info("Nouveau vote !");

	VW.votes[IP] = {
		date: new Date(),
		candidate: candidate
	}

	save();
	return true;
}




/*********************
 ***** CANDIDATS *****
 *********************/

// Ajout d'un nouveau candidat
exports.candidate_new = function(name, attr = "") {
	VW.candidates[VW.next_id] = {
		name: name,
		attr: attr,
		state: PENDING,
		voting_time: null
	};
	VW.next_id++;
	save();
	return true;
}

// Renommage d'un candidat
exports.candidate_rename = function(candidate, new_name) {
	if(!(candidate in VW.candidates))
		return false;

	Debug.warn("Renommage du candidat : '" + new_name + "'.");

	VW.candidates[candidate].name = new_name;
	save();
	return true;
}

// Suppression d'un candidat
exports.candidate_delete = function(candidate) {
	if(!(candidate in VW.candidates) || candidate == VW.current_candidate)
		return false;

	// On retire tous les votes pour ce candidat
	let IPs = Object.keys(VW.votes);
	for(let i = 0; i < IPs.length; i++) {
		let vote = VW.votes[IPs[i]];
		if(vote.candidate == candidate)
			delete VW.votes[IPs[i]];
	}

	Debug.warn("Suppression du candidat : '"+VW.candidates[candidate].name+"'.");

	// On supprime le candidat lui-même
	delete VW.candidates[candidate];

	save();
	return true;
}

// Débute le passage d'un candidat
exports.candidate_start = function(candidate) {
	if(!(candidate in VW.candidates) || candidate == VW.current_candidate)
		return false;

	Debug.info("Début de passage du candidat '"+VW.candidates[candidate].name+"'.");

	exports.candidate_end();
	VW.candidates[candidate].state = CURRENT;
	VW.candidates[candidate].voting_time = new Date();
	VW.current_candidate = candidate;
	save();
	return true;
}

// Termine le passage d'un candidat
exports.candidate_end = function() {
	if(VW.current_candidate == null)
		return false;

	Debug.info("Fin de passage du candidat '"+VW.candidates[VW.current_candidate].name+"'.");

	VW.candidates[VW.current_candidate].state = DONE;
	VW.current_candidate = null;
	save();
	return true;
}




/*********************
 ****** MESSAGES *****
 *********************/

// Active/Désactive les messages
exports.comments_toggle = function() {
	VW.enable_comments = !(VW.enable_comments);

	if(VW.enable_comments)
		Debug.important("Activation des messages.");
	else
		Debug.important("Désactivation des messages.");
	save();
	return true;
}

// Ajout d'un nouveau message
exports.comments_new = function(message) {
	VW.comments.unshift(message); // insère le commentaire en haut

	Debug.info("Nouveau message : '" + message + "'.")
	save();
	return true;
}

// Supprime un message
exports.comments_delete = function(ID) {
	if(ID > VW.comments.length - 1)
		return false;

	Debug.warn("Suppression du message '"+VW.comments[ID]+"'.");

	VW.comments.splice(ID, 1); // Suppression du commentaire
	save();
	return true;
}




/**********************
 ***** AFFICHAGES *****
 **********************/

// Modification de l'affichage d'un écran
exports.screens_update = function(sID, sType) {
	if(sID < 0 || sID >= NB_SCR || ALL_SCR_TYPES.indexOf(sType) < 0)
		return;

	Debug.important("Modification de l'écran " + sID + " : "+sType+".");

	VW.screens["s" + sID] = sType;
	save();
	return true;
}




/**********************
 ***** SAUVEGARDE *****
 **********************/

// Enregistre la configuration dans un fichier
function save() {
	fs.writeFile(VW_FILE, JSON.stringify(VW), function(err) {
	    if(err)
	    	Debug.error(err);
	});
}

// Restaure la configuration à partir d'un fichier
function restore() {
	// Si on a pas déjà fait un fichier de configuration, on le crée
	if(!fs.existsSync(VW_FILE)) {
		save();
		return false;
	}

	// Restauration du VW
	VW = JSON.parse(fs.readFileSync(VW_FILE, 'utf8'));

	// Reconversion Timestamp --> Date
	VW.votes_closed = (VW.votes_closed != null) ? new Date(VW.votes_closed) : null;

	return true;
}




/*********************
 ******** GET ********
 *********************/

// Retourne la configuration actuelle
exports.VW = function() {
	let vw = JSON.parse(JSON.stringify(VW)); // Copie locale

	// On crée un champ "votes" pour chaque candidat
	let cIDs = Object.keys(vw.candidates);
	for (let i = 0; i < cIDs.length; i++) {
		vw.candidates[cIDs[i]].votes = 0;
	}

	// Pour chaque vote...
	let vIDs = Object.keys(vw.votes);
	for (let i = 0; i < vIDs.length; i++) {
		let cID = vw.votes[vIDs[i]].candidate;
		// Si le candidat existe
		if(cID in vw.candidates)
			vw.candidates[cID].votes++; // On incrémente le nombre de votes
	}

	return vw;
}

// Retourne la clé de sécurité
exports.security_key = function() { return VW.security_key; }

// Retourne les données pour l'envoyer au client de vote
exports.vote_datas = function(IP) {
	return {
		name: VW.name,
		ip: IP,
		voted_candidate: (IP in VW.votes) ? VW.votes[IP].candidate : null,
		votes_closed: (VW.votes_closed != null) ? VW.votes_closed.getTime() : null,
		candidates: VW.candidates,
		enable_comments: VW.enable_comments,
		comments: VW.comments
	};
}
