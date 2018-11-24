/*****************
 ** BLACKSCREEN **
 *****************/

function blackscreen() {
	console.log("Blackscreen IN");
	$("#blackscreen").removeClass("bs-out");
	$("#blackscreen").addClass("bs-in");
}

function whitescreen() {
	console.log("Blackscreen OUT");
	$("#blackscreen").removeClass("bs-in");
	$("#blackscreen").addClass("bs-out");
}

function promoscreen(delay) {
	console.log("Promoscreen IN");
	$("#promoscreen").removeClass("bs-out");
	$("#promoscreen").addClass("bs-in");

	setTimeout(function() {
		console.log("Promoscreen OUT");
		$("#promoscreen").removeClass("bs-in");
		$("#promoscreen").addClass("bs-out");
	}, delay);
}