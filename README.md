pushtape-player
===============

A javascript music player for the Pushtape.com project, including global controls and various config options. It will scan an entire page for links to play. No dependencies other than Soundmanager2.

#Installation
- Make sure Soundmanager2 is installed. Typically this means including the soundmanager2 script and making sure the swf file is on your server.
- Add soundmanager2.js to your HTML file, before adding pushtape-player.js. The pushtape player is constructed inside Soundmanager2's "onready" event. 
- Note that this needs to run on a web server (or locally) via a LAMP/MAMP stack. You'll probably run into flash permission issues otherwise.
 
#Config options
        pushtapePlayer.config = {
          playNext: true, // stop after one sound, or play through list until end
          autoPlay: false,  // start playing the first sound right away
          repeatAll: false, // repeat playlist after last track
          containerClass : '', // Default is to scan entire page for links, if set will scan only inside containerClass
          addControlsMarkup: { 
            'enabled' : false, // Default is false. If true, global controls markup is inserted inside of containerClass
            'controlsMarkupClass' :'pt-controls-markup', // wrapper class
            'position' : 'top' // Control where controls markup is inserted
          }
        }
  
  
#Style options
One of the design goals of this player was to make it extremely flexible to modify the look and feel of the global controls. The markup for the global controls can be dynamically inserted or manually inserted (see config.addControlsMarkup above). You can use plain CSS to position and style the global controls however you'd like, and each audio link on the page is given special classes (.pt-link, .pt-playing, etc). I tried not to force or inject styles with javascript as much as possible, however in certain places it does happen (setting % width for .pt-position and .pt-loading, for instance).


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

## Default controls markup
          <div class="pt-controls-markup">
            <div class="pt-controls">
              <a class="pt-play-pause" href="#" title="Play/Pause">
                <span class="play-btn">▶</span>
                <span class="pause-btn">❚❚</span>
              </a>
              <a class="pt-next" href="#" title="Next"> &raquo;</a>
              <a class="pt-previous" href="#" title="Previous">&laquo; </a>
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

