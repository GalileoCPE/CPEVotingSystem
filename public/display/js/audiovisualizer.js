var audiovisualizer_started = false;
function audiovisualizer_start() {
    "use strict";

    if(audiovisualizer_started)
        return;
    audiovisualizer_started = true;
    
    var paths = document.getElementsByTagName('path');
    var visualizer = document.getElementById('visualizer');
    var mask = visualizer.getElementById('mask');
    var h = document.getElementById('mic_request');
    var path;
    var report = 0;
    
    // Si l'accès est accordé
    var soundAllowed = function (stream) {
        window.persistAudioStream = stream;
        h.innerHTML = "Démarrage...";
        h.setAttribute('style', 'opacity: 0;');

        // Connexion au Micro
        var audioContent = new AudioContext();
        var audioStream = audioContent.createMediaStreamSource( stream );
        var analyser = audioContent.createAnalyser();
        audioStream.connect(analyser);

        // FFT 1024 points
        analyser.fftSize = 1024;
        var frequencyArray = new Uint8Array(analyser.frequencyBinCount);
        visualizer.setAttribute('viewBox', '0 0 255 255');
      
		// Affichage du résultat de la FFT
        for (var i = 0 ; i < 255; i++) {
            path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke-dasharray', '4,1');
            mask.appendChild(path);
        }
        var doDraw = function () {
            // On rafraichit l'animation toutes les 60ms
            //requestAnimationFrame(doDraw);
            setTimeout(doDraw, 60);

            analyser.getByteFrequencyData(frequencyArray);
          	var adjustedLength;
            for (var i = 0 ; i < 255; i++) {
              	adjustedLength = Math.floor(frequencyArray[i]) - (Math.floor(frequencyArray[i]) % 5);
                paths[i].setAttribute('d', 'M '+ (i) +',255 l 0,-' + adjustedLength);
            }

        }
        doDraw();
    }

    // Si l'accès est refusé
    var soundNotAllowed = function (error) {
        h.innerHTML = "<strong>Accès au microphone bloqué.</strong> Autorisez pour continuer...";
        console.log(error);
    }

    // Demande l'accès au Micro
    navigator.getUserMedia({audio: true}, soundAllowed, soundNotAllowed);
}