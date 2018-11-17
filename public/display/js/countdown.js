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

function countdown(seconds) {
	VID = 0;
	for (let i = seconds; i >= 0; i--) {
		setTimeout(function() {
			countdown_value(VID, i);
			countdown_value_out(1 - VID);
			if(i > 0)
				setTimeout(countdown_value_in, 200, VID);
			VID = 1 - VID;
		}, (seconds - i)*1000);
	}
}