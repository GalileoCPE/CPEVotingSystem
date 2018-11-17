function getdelayBeforeStart() {
	let nowAt = (new Date()).getSeconds() % 30;
	let shouldStartAt = (2 - DispID) * 10;

	if(shouldStartAt >= nowAt)
		return (shouldStartAt - nowAt)*1000;
	return (30 - nowAt + shouldStartAt)*1000;
}

$(function(){
  $('.marquee').marquee({
  // Pour synchroniser les 3 écrans, on définit la règle suivante :
  //   À chaque seconde = 00 ou 30 --> Démarrage écran 2
  //   À chaque seconde = 10 ou 40 --> Démarrage écran 1
  //   À chaque seconde = 20 ou 50 --> Démarrage écran 0

  delayBeforeStart: getdelayBeforeStart(), // Délai de démarrage en ms.
  duration: 10000, // Vitesse en ms. pour traverser l'écran
  });
});