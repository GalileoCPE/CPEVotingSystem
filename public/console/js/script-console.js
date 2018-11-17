function callOnLoad() {
	updateHour();
	setInterval(function(){updateHour()}, 100); // Mise à jour toutes les 0.1 sec

	// Lors de l'appui sur Enter, on envoie le mot de passe
    $('#key').on('keypress', function (e) {
        if(e.which === 13){
            main_auth();
        }
    });
}

function formatNumber(nb) {
	if(nb < 10)
		return "0" + nb;
	return nb;
};

function updateHour() {
	let weekday = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
	let months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

	let current = new Date(); // Décallage horaire
	let delayed = new Date(); // Décallage horaire différé
	delayed.setTime(delayed.getTime() - 40*60*1000);
	document.getElementById('timestamp').innerHTML = weekday[current.getDay()] + " " + current.getDate() + " " + months[current.getMonth() - 1] + " - " + formatNumber(current.getHours()) + ":" + formatNumber(current.getMinutes()) + ":" + formatNumber(current.getSeconds());
}

function next_candidate_change(select) {
	if(select.selectedIndex == -1)
		return;
	
	let next_candidate_name = select.options[select.selectedIndex].innerHTML;
	document.getElementById("nc").innerHTML = next_candidate_name;
}