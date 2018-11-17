function singer_out() {
   setTimeout(function() {
      $("#singers").removeClass( "infos-in" );
      $("#singers").addClass( "infos-out" );
   }, 2500);

   setTimeout(function() {
      $("#names_logo").addClass( "names-logo-up" );
      $("#names_logo").removeClass( "names-logo-down" );
   }, 3500);

   $.each($(".particletext.bubbles"), function(){
      let bubblecount = ($(this).width()/50)*20;
      for(let i = 0; i <= bubblecount; i++) {
         let size = (3*$.rnd(800,1000)/100);
         let delay = ($.rnd(500, 2000)/1000);
         let speed = ($.rnd(400, 600)/100);
         let particle_style = `
            background-color: rgba(243, 68, `+$.rnd(0,150)+`, 0.9);
            top: `+$.rnd(2000,8000)/100+`%;
            left: `+$.rnd(0,100000)/1000+`%;
            width: `+size+`px;
            height: `+size+`px;
            animation-delay: `+($.rnd(0,10000)/100000)+`s;
            -webkit-animation: bubbles `+speed+`s ease-in `+delay+`s;
                    animation: bubbles `+speed+`s ease-in `+delay+`s;
         `;
         $(this).append('<span class="particle" style="' + particle_style + '"></span>');
      }
   });
}

function singer_in(name, song) {
   $("#singers-name").text(name);
   $("#singers-song").text(song);

   
   $("#singers").addClass( "infos-in" );
   $("#singers").removeClass( "infos-out" );

   $("#names_logo").addClass( "names-logo-down" );
   $("#names_logo").removeClass( "names-logo-up" );
}

jQuery.rnd = function(m,n) {
   m = parseInt(m);
   n = parseInt(n);
   return Math.floor( Math.random() * (n - m + 1) ) + m;
}

document.getElementById("bgvid").play();