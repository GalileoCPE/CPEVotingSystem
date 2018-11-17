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