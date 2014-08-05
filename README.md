Pushtape-player.js
===============

A customizable JS audio page player for the [Pushtape](http://www.pushtape.com) project, including global playback controls and various config options. Treats a page as a playlist of audio links. No dependencies other than [Soundmanager2](http://www.schillmania.com/projects/soundmanager2). 

#Demo
Please visit http://zirafa.github.io/pushtape-player.js/demo for several examples of how the player can be customized.

#Installation
- Include soundmanager2.js and make sure the swf file path exists.
- Include pushtape-player.js.
- Initialize and setup your player (see below)
- Note that this needs to run on a web server (or locally) via a LAMP/MAMP stack. You'll probably run into flash permission issues otherwise.
 
#Example setup
    /**
     * Initialize Pushtape Player
     */
    var pushtapePlayer = null; // Instance
    soundManager.setup({
      debugMode: false,   // disable or enable debug output
      url: 'swf/',       // path to directory containing SM2 SWF
      useHighPerformance: true, // keep flash on screen, boost performance
      preferFlash: true, // for visualization effects (smoother scrubber)
      flashVersion: 9,
      wmode: 'transparent', // transparent SWF, if possible
      onready: function() {
        // Initialize pushtape player when SM2 is ready
        pushtapePlayer = new PushtapePlayer();
        pushtapePlayer.init({
          playNext: true, // stop after one sound, or play through list until end
          autoPlay: false,  // start playing the first sound right away
          repeatAll: false, // repeat playlist after last track
          containerClass : '', // If empty, scan entire page for audio links. If set, limits the scope of search inside containerClass
          linkClass : '', // By default, add all links found. If set, will only add links with this class 
          addControlsMarkup: {
            'enabled' : false, 
            'controlsMarkupClass' :'pt-controls-wrapper',
            'position' : 'top'
          } // If enabled =  false (the default) you provide all markup in your HTML, otherwise set this to true and it will be dynamically inserted into controlsContainerClass.
        });
      },
      ontimeout: function() {
        // Could not start. Missing SWF? Flash blocked? Show an error, etc.?
        console.log('Error initializing the Pushtape player.');
      }  
    });


#Config options
Option  | Type | Default | Description
------- | ---- | ------- | -----------
playNext  | boolean | true  | stop after one sound, or play through list until end
autoPlay  | boolean | false | start playing the first sound right away
repeatAll | boolean | false | repeat playlist from beginning after last track
containerClass | string | '' | Empty default scans entire page for links, if set will scan only inside containerClass
linkClass | string | '' | Empty default will add all audio links found. If set to pushtape-player, will only add audio links that have the class, i.e. <a class="pushtape-player" href="file.mp3"></a>
addControlsMarkup.enabled | boolean | false | If true, global controls markup is dynamically inserted inside of containerClass
addControlsMarkup.controlsMarkupClass | string | 'pt-controls-wrapper' | Wrapper class 
addControlsMarkup.position | string | 'top' | Position the controls inside the top or bottom of the document or containerClass
  
#Style options
One of the design goals of this player was to make it extremely flexible to modify the look and feel of the global controls. You can use plain CSS to position and style the global controls however you'd like, and each audio link on the page is given special classes (.pt-link, .pt-playing, etc). I tried not to force or inject styles with javascript as much as possible, however in certain places it does happen (setting % width for .pt-position and .pt-loading, for instance).
You can add markup for the global controls on the page, or choose to use the default markup provided. (see config.addControlsMarkup above). 

## Default global control classes
- .pt-play-pause (this will also get link state classes)
- .pt-next
- .pt-previous
- .pt-current-time
- .pt-duration
- .pt-scrubber
- .pt-statusbar
- .pt-position
- .pt-loading
- .pt-current-track-title

## Default link classes
- .pt-link (default class, link is playable)
- .pt-loading (state: sound is loading)
- .pt-playing (state: sound is playing)
- .pt-buffering (state: sound is buffering)
- .pt-paused (state: sound is paused)

## Default controls markup template
          <div class="pt-controls-markup">
            <div class="pt-controls">
              <a class="pt-play-pause" href="#" title="Play/Pause">
                <span class="play-btn"><span class="pt-play-icon">▶</span></span>
                <span class="pause-btn"><span class="pt-pause-icon">❚❚</span></span>
              </a>
              <a class="pt-next" href="#" title="Next"> <span class="pt-next-icon">&raquo;</span></a>
              <a class="pt-previous" href="#" title="Previous"><span class="pt-previous-icon">&laquo;</span> </a>
              <span class="pt-current-track-title"></span>
          
              <div class="pt-scrubber">
                <div class="pt-statusbar">  
                  <div class="pt-loading"></div>  
                  <div class="pt-position"><div class="pt-handle"></div></div>  
                </div>
              </div>
              <div class="pt-time">
                <span class="pt-current-time">--:--</span> / <span class="pt-duration">--:--</span>
              </div>
            </div>
          </div>

