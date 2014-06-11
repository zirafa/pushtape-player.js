pushtape-player
===============

A javascript music player for the Pushtape.com project, including global controls and various config options. It will scan an entire page for links to play.

#Basic Usage
- Make sure Soundmanager2 is installed. Typically this means including the soundmanager2 script and making sure the swf file is on your server.
- Add soundmanager2.js to your HTML file, before pushtape-player.js. The pushtape player is constructed inside Soundmanager2's "onready" event. 

#Config options
        pushtapePlayer.config = {
          playNext: true, // stop after one sound, or play through list until end
          autoPlay: false,  // start playing the first sound right away
          repeatAll: false, // repeat playlist after last track
          containerClass : '', 
          addControlsMarkup: {
            'enabled' : false, 
            'controlsMarkupClass' :'pt-controls-markup', 
            'position' : 'top'
          }
        }
  
  
