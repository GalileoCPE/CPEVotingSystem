/*
 * ===== CPEVotingSystem =====
 * | Configuration
 * | (c) 2018 - Pierre AVINAIN Galileo CPE Lyon
 * ===========================
 */

/*
 * APPLICATION
 */

// Général
exports.APP_domain = "www.cpevs.ml"; // Nom de domaine d'accès aux votes

// Socket
exports.APP_listenPort = 8000;  // Port d'écoute
exports.APP_socketurl = "http://10.42.0.1:" + exports.APP_listenPort; // URL de la socket

// Routeur
exports.ROUTER_enable = true;
exports.ROUTER_name = "CPEVotingSystem";
exports.ROUTER_ip = "10.42.255.254"; // IP de gestion du routeur TP-LINK TL-WR541G
exports.ROUTER_username = "some-username-here";
exports.ROUTER_password = "some-password-here";
exports.ROUTER_refresh = 5000; // Délai de refresh des baux DHCP (en ms.)