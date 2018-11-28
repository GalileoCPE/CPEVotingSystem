var VID = 0; // ID du compteur actuel

function countdown_value(id, value) {
	$("#countdown-value-" + id).text(value);
}

function countdown_value_in(id) {
	$("#countdown-value-" + id).addClass("countdown-slide-in");
	$("#countdown-value-" + id).removeClass("countdown-slide-out");
}

function countdown_value_out(id) {
	$("#countdown-value-" + id).addClass("countdown-slide-out");
	$("#countdown-value-" + id).removeClass("countdown-slide-in");
}

function countdown_end() {
	$("#countdown-end").addClass("countdown-end-in");
	$("#countdown-end").removeClass("countdown-end-out");
	setTimeout(function() {
		$("#countdown-end").addClass("countdown-end-out");
		$("#countdown-end").removeClass("countdown-end-in");

		// Réaffichage du logo
		$("#none_section").show();
	}, 5000);
}

function countdown(seconds) {
	VID = 0;
	for (let i = seconds; i >= 0; i--) {
		setTimeout(function() {
			countdown_value(VID, i);
			countdown_value_out(1 - VID);
			if(i > 0)
				setTimeout(countdown_value_in, 200, VID);
			else
				setTimeout(countdown_end, 200);
			VID = 1 - VID;
		}, (seconds - i)*1000);
	}
}