/*
 * ===== CPEVotingSystem =====
 * | Gestionnaire du routeur
 * | (c) 2018 - Pierre AVINAIN Galileo CPE Lyon
 * ===========================
 */

/*
 * Chargement des librairies.
 */
var Debug = require('./Debug.js');
var request = require("request");
var Router_enable = false;
var Leases = null;
var Router_IP = null;
var Basic_auth = null;
var Router_refresh = null;

/*
 * Initialisation de la librairie
 */
exports.init = function(enable, ip, username, password, refresh) {
	Router_enable = enable;
	Router_IP = ip;
	Router_refresh = refresh;
	Basic_auth = Buffer.from(username + ":" + password).toString('base64');
}

// Lance les vérifications régulières
exports.start = function() {
	if(!Router_enable) // On ne fait rien si c'est désactivé
		return;

	setInterval(function(){refresh_leases()}, Router_refresh); // Mise à jour toutes les 2 sec
}

// Indique si le routeur est prêt
exports.ready = function() {
	return (Leases != null && Leases != []);
}

// Envoie l'adresse MAC en fonction de l'adresse IP
exports.arplookup = function(ip) {
	if(!Router_enable || Leases == null)
		return ip;

	if(!(ip in Leases))
		return null;

	return Leases[ip];
}

// Retourne le délai de refresh du routeur
exports.refresh = function() {
	return Router_refresh;
}

function refresh_leases() {
	let options = { method: 'GET',
	  url: 'http://' + Router_IP + '/userRpm/AssignedIpAddrListRpm.htm',
	  timeout: Router_refresh,
	  qs: { Refresh: 'Refresh' },
	  headers: 
	   { 'Cache-Control': 'no-cache',
	     Authorization: 'Basic ' + Basic_auth } };

	request(options, function (error, response, body) {
		if (Leases == null && error) {
			Debug.error("Une erreur est survenue lors de l'accès à la table ARP du routeur !");
			Debug.error(error);
			Debug.error("Vérifiez la connectivité puis redémarrez le serveur de votes.");
			Debug.error("Si le problème persiste, supprimez les votes et désactivez la vérification MAC.");
			process.exit();
			return;
		} else if(error) {
			Debug.warn("Une erreur est survenue lors de l'accès à la table ARP du routeur !");
			Debug.warn(error);
			return;
		}

		try {
			let right = body.split("var DHCPDynList = new Array(\n", 2)[1];
			if (right == undefined || right.length < 2) {
				Debug.error("Failed to fetch DHCP leases !");
				return;
			}

			let middle = right.split("\n0,0 );\n", 2)[0];
			if (middle == undefined || middle.length < 2) {
				Debug.error("Failed to fetch DHCP leases !");
				return;
			}

			// Chaque entrée
			let leases = middle.split("\n");

			let output = [];
			for(let i = 0; i < leases.length; i++) {
				let cols = leases[i].split(", "); // Découpage de chaque colonne
				let lease_mac = cols[1].substr(1, cols[1].length - 2);
				let lease_ip = cols[2].substr(1, cols[2].length - 2);
				output[lease_ip] = lease_mac;
			}

			if(Leases == null)
				Debug.success("Routeur connecté avec succès!");

			Leases = output;
		} catch(error) {
			Debug.warn("Impossible de décoder la table ARP du routeur !");
			Debug.warn(error);
		}
	});
}
