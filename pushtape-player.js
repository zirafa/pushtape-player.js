/**
 * Pushtape-Player.js
 * https://github.com/zirafa/pushtape-player.js
 * -------------------------
 * This player was created as part of the Pushtape (pushtape.com) project to support more flexible music player options.
 *
 * Notes:
 * - This player only binds its behavior to CSS classes. You can provide all the necessary controls markup, or optionally let the player generate it.
 * - There are individual play/pause controls per link, as well as global playback controls  - pause/play, scrubber, previous/next, and time.
 * - By default, it grabs all links in document.body. You can optionally set a pushtapePlayer.config.containerClass to limit the scope, and
 *   set pushtapePlayer.config.linkClass to only add links with a given class.
 * - Playlist index is automatically set via the data-pushtape-index attribute, based on the order links are found.
 * - Sounds are uniquely identified in each link via the data-pushtape-sound-id attribute. If not specified, an automatic ID will be generated per link. 
 * - The main playButton has global context. The playAll button has playlist context.
 * 
 * Requires SoundManager 2 Javascript API: http://schillmania.com/projects/soundmanager2/
 */

/**
 * Implement PushtapePlayer() constructor
 */
function PushtapePlayer () {
  /**
   * Variable declarations
   */
  var self = this,
      _event = null,
      pl = this,
      sm = soundManager, // soundManager instance
      isIE = (navigator.userAgent.match(/msie/i)),
      docTitle = document.title,
      ua = navigator.userAgent,
      isTouchDevice = (ua.match(/ipad|ipod|iphone/i)),
      observer = {},
      bodyEl = null,
      cleanup;

  // Controls Template. You can override this before init() if you need to, or just set
  // config.addControlsMarkup.enabled = false and add this manually as HTML.
  this.defaultControlsMarkup = [
          '<div class="pt-controls pt-hide">',
            '<a class="pt-play-pause" href="#" title="Play/Pause"><span class="play-btn"><span class="pt-play-icon">▶</span></span><span class="pause-btn"><span class="pt-pause-icon">❚❚</span></span></a>',
            '<a class="pt-next" href="#" title="Next"> <span class="pt-next-icon">&raquo;</span></a>',
            '<a class="pt-previous" href="#" title="Previous"><span class="pt-previous-icon">&laquo;</span> </a>',
            '<a class="pt-permalink" href=""><span class="pt-current-track-title"></span></a>',
            '<div class="pt-scrubber">',
              '<div class="pt-statusbar">', 
                '<div class="pt-loading"></div>',  
                '<div class="pt-position"><div class="pt-handle"></div></div>',  
              '</div>',
            '</div>',
            '<div class="pt-time">',
              '<span class="pt-current-time">--:--</span> / <span class="pt-duration">--:--</span>',
            '</div>',
          '</div>'
        ].join('\n');

  // This gets setup below in init()...remove this?
  this.config = {
    playNext: true, // stop after one sound, or play through list until end
    autoPlay: false,  // start playing the first sound right away
    repeatAll: false, // repeat playlist after last track
    containerClass : '', // Default is to scan entire page for links, if set will scan only inside containerClass
    autoScan : true, // Automatically observe changes to container and scan for new links to add to playlist
    linkClass : '', // Default will add all audio links found. If set (i.e. pushtape-player), will only add audio links that have the class: <a class="pushtape-player" href="file.mp3"></a>
    addControlsMarkup: { 
      'enabled' : false, // Default is false. If true, global controls markup is inserted inside of containerClass
      'controlsMarkupClass' :'pt-controls-wrapper', // Wrapper class
      'position' : 'top' // Position the controls inside the top or bottom of the document or containerClass
    }
  }

  this.controls = {
    // CSS selectors for control elements
    playButtonClass: 'pt-play-pause',
    playAllButtonClass: 'pt-play-all', // Similar to playButton behavior, useful for some UX designs 
    nextButtonClass: 'pt-next',
    previousButtonClass: 'pt-previous',
    currentTimeClass: 'pt-current-time',
    durationClass: 'pt-duration',
    scrubberClass: 'pt-scrubber',
    statusBarClass: 'pt-statusbar',
    positionClass: 'pt-position',
    loadingClass: 'pt-loading',
    trackTitleClass: 'pt-current-track-title', // current track
    permaLinkClass: 'pt-permalink', // permalink for additional info
    // DOM elements for controls. These are assigned values in this.init method
    playButton: null, 
    playAllButton: null, 
    nextButton: null,
    previousButton: null,
    currentTime: null,
    duration: null,
    statusBar: null,
    loading: null,
    position: null,
    scrubber: null,
    trackTitle: null,
    permaLink: null
  };
  
  this.playableClass = 'pt-playable'; // CSS class for forcing a link to be playable (eg. doesn't have .MP3 in it)
  this.excludeClass = 'pt-exclude'; // CSS class for ignoring MP3 links
  this.cueClass = 'pt-cue'; // CSS class for adding track to end of playlist

  this.playSymbol = '▶', // Used in document.title when sound is playing
  this.pauseSymbol = '❚❚',
  
  this.links = []; // keep track of current links on page
  this.prevLinks = []; // keep track of previous links on page, useful for mutation observer
  this.lastSound = null; // keep track of last sound played
  this.playStatus = 'stopped'; // keep track of status of playback: stopped, paused, playing
  this.soundCount = 0; // Used to create a unique sound ID

  this.css = {
    // CSS class names appended to each link during various states
    sDefault: 'pt-link', // default state
    sLoading: 'pt-loading',
    sPlaying: 'pt-playing',
    sBuffering: 'pt-buffering',
    sError: 'pt-error',
    sPaused: 'pt-paused',
    sContainer: 'pt-container'
  }

  /**
   * DOM helper functions (replace with jQuery?)
   */
  _event = (function() {
    var old = (window.attachEvent && !window.addEventListener),
    _slice = Array.prototype.slice,
    evt = {
      add: (old?'attachEvent':'addEventListener'),
      remove: (old?'detachEvent':'removeEventListener')
    };

    function getArgs(oArgs) {
      var args = _slice.call(oArgs), len = args.length;
      if (old) {
        args[1] = 'on' + args[1]; // prefix
        if (len > 3) {
          args.pop(); // no capture
        }
      } else if (len === 3) {
        args.push(false);
      }
      return args;
    }

    function apply(args, sType) {
      var element = args.shift(),
          method = [evt[sType]];
      if (old) {
        element[method](args[0], args[1]);
      } else {
        element[method].apply(element, args);
      }
    }

    function add() {
      apply(getArgs(arguments), 'add');
    }

    function remove() {
      apply(getArgs(arguments), 'remove');
    }

    return {
      'add': add,
      'remove': remove
    };

  }());

  this.hasClass = function(o, cStr) {
    if (!o || !cStr) {
      return false;
    }
    return (typeof(o.className)!=='undefined'?new RegExp('(^|\\s)'+cStr+'(\\s|$)').test(o.className):false);
  };

  this.addClass = function(o, cStr) {
    if (!o || !cStr || self.hasClass(o,cStr)) {
      return false; // safety net
    }
    if (o.constructor === Array) {
      for (i = 0; i < o.length; i++ ) {
        o[i].className = (o[i].className?o[i].className+' ':'')+cStr;
      }
    }
    else {
      o.className = (o.className?o.className+' ':'')+cStr;
    }
  };

  this.removeClass = function(o, cStr) {
    if (!o || !cStr || !self.hasClass(o,cStr)) {
      return false;
    }
    if (o.constructor === Array) {
      for (i = 0; i < o.length; i++ ) {
        o[i].className = o[i].className.replace(new RegExp('( '+cStr+')|('+cStr+')','g'),'');
      }  
    }
    else {
      o.className = o.className.replace(new RegExp('( '+cStr+')|('+cStr+')','g'),'');
    }
  };
  
  this.isChildOfClass = function(oChild, oClass) {
    if (!oChild || !oClass) {
      return false;
    }
    while (oChild.parentNode && !self.hasClass(oChild,oClass)) {
      oChild = oChild.parentNode;
    }
    return (self.hasClass(oChild,oClass));
  };

  this.getElementsByAttribute = function(attribute) {
    return document.querySelectorAll('[' + attribute + ']');
  }  
  
  this.getParentByNodeName = function(oChild, sParentNodeName) {
    if (!oChild || !sParentNodeName) {
      return false;
    }
    sParentNodeName = sParentNodeName.toLowerCase();
    while (oChild.parentNode && sParentNodeName !== oChild.parentNode.nodeName.toLowerCase()) {
      oChild = oChild.parentNode;
    }
    return (oChild.parentNode && sParentNodeName === oChild.parentNode.nodeName.toLowerCase()?oChild.parentNode:null);
  };

  this.getOffX = function(o) {
    // http://www.xs4all.nl/~ppk/js/findpos.html
    var curleft = 0;
    if (o.offsetParent) {
      while (o.offsetParent) {
        curleft += o.offsetLeft;
        o = o.offsetParent;
      }
    }
    else if (o.x) {
      curleft += o.x;
    }
    return curleft;
  };

  this.isChildOfNode = function(o,sNodeName) {
    if (!o || !o.parentNode) {
      return false;
    }
    sNodeName = sNodeName.toLowerCase();
    do {
      o = o.parentNode;
    } while (o && o.parentNode && o.nodeName.toLowerCase() != sNodeName);
    return (o.nodeName.toLowerCase() == sNodeName?o:null);
  }
  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  this.debounce = function(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  };  

  this.getTime = function(nMSec, bAsString) {
    // convert milliseconds to mm:ss, return as object literal or string
    var nSec = Math.floor(nMSec/1000),
        min = Math.floor(nSec/60),
        sec = nSec-(min*60);
    // if (min === 0 && sec === 0) return null; // return 0:00 as null
    return (bAsString?(min+':'+(sec<10?'0'+sec:sec)):{'min':min,'sec':sec});
  };

  this.addStyleBySoundID = function(oLink, cssClass) {
    if (!oLink || !cssClass) {
      return false;
    }
    var elements = pl.getElementsByAttribute('data-pushtape-sound-id');
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].getAttribute('data-pushtape-sound-id') === oLink.id) {
        pl.removeClass(elements[i], oLink._data.className);
        oLink._data.className = cssClass;
        pl.addClass(elements[i], oLink._data.className);
      }  
    }
  }
  
  this.removeStyleBySoundID = function(oLink) {
    if (!oLink) {
      return false;
    }    
    var elements = pl.getElementsByAttribute('data-pushtape-sound-id');
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].getAttribute('data-pushtape-sound-id') === oLink.id) {
        pl.removeClass(elements[i], oLink._data.className);
        oLink._data.className = '';
      }  
    }      
  }
  
  /**
   *  Handlers for individual sound events as they're started/stopped/played
   */
  this.events = {
    play: function() {
      self.playStatus = 'playing';
      
      // Show play symbol in <title>
      document.title = self.playSymbol + ' ' + docTitle;

      // Remove/add class to individual sound link
      // Finding elements by attribute allows for continuity in ajax-y situations
      // where this._data.oLink is unreliable.
      pl.addStyleBySoundID(this, pl.css.sPlaying);

      // Remove/add class to global elements
      pl.removeClass(self.controls.playButton, self.css.sPaused);
      pl.addClass(self.controls.playButton, self.css.sPlaying);
      // Play All       
      pl.removeClass(self.controls.playAllButton, self.css.sPaused);
      if (self.lastSound != null && self.lastSound._data.orphanedIndex != true) {
        pl.addClass(self.controls.playAllButton, self.css.sPlaying);      
      }
      // Body 
      pl.removeClass(bodyEl, self.css.sPaused);
      pl.addClass(bodyEl, self.css.sPlaying);   
       
      // Add some data attributes to global play controls
      if (self.controls.playButton != null) {
        self.controls.playButton.setAttribute('data-pushtape-current-sound-id', this.id);
        self.controls.playButton.setAttribute('data-pushtape-current-index', this._data.index);
      }
      if (self.controls.playAllButton != null) {
        self.controls.playAllButton.setAttribute('data-pushtape-current-sound-id', this.id);
        self.controls.playAllButton.setAttribute('data-pushtape-current-index', this._data.index);
      }        
            
      // If trackTitle DOM element exists, populate it with current track
      if (self.controls.trackTitle != null) {
        self.controls.trackTitle.innerHTML = this._data.oTitle;
      }
      if (self.controls.permaLink != null) {
        self.controls.permaLink.href = this._data.permaLink;
      }      
    },

    stop: function() {
      self.playStatus = 'stopped';
      
      // Remove play symbol from the HTML <title>
      document.title = docTitle;

      // Remove any CSS classes applied to individual links as well as global elements
      pl.removeStyleBySoundID(this);    
      pl.removeClass(self.controls.playButton, self.css.sPlaying);
      pl.removeClass(self.controls.playAllButton, self.css.sPlaying);
      pl.removeClass(bodyEl, self.css.sPlaying);
     
      // If controls DOM element exists, reset it
      if (self.controls.position != null) {
        self.controls.position.style.width = '0px';
      }
    },

    pause: function() {
      self.playStatus = 'paused';
      
      // If moving scrubber position...
      if (pl.dragActive) {
        return false;
      }

      // Remove play symbol from HTML <title> 
      document.title = docTitle;

      // Add/remove individual link CSS classes
      pl.addStyleBySoundID(this, pl.css.sPaused);
      
      // Add/Remove global element CSS classes
      pl.removeClass(self.controls.playButton, self.css.sPlaying);
      pl.addClass(self.controls.playButton, self.css.sPaused);
      // Play All
      pl.removeClass(self.controls.playAllButton, self.css.sPlaying);
      pl.addClass(self.controls.playAllButton, self.css.sPaused);
      // Body
      pl.removeClass(bodyEl, self.css.sPlaying);
      pl.addClass(bodyEl, self.css.sPaused);          
      
    },
    resume: function() {
      self.playStatus = 'playing';
      
      // If moving scrubber position...
      if (pl.dragActive) {
        return false;
      }
      // Add play symbol to HTML <title>
      document.title = self.playSymbol + ' ' + docTitle;

      // Add/remove link specific CSS classes
      pl.addStyleBySoundID(this, pl.css.sPlaying);
      
      // Add/remove global elements CSS
      pl.removeClass(self.controls.playButton, self.css.sPaused);
      pl.addClass(self.controls.playButton, self.css.sPlaying);
      // Play All
      pl.removeClass(self.controls.playAllButton, self.css.sPaused);
      pl.addClass(self.controls.playAllButton, self.css.sPlaying);
      // Body
      pl.removeClass(bodyEl, self.css.sPaused);
      pl.addClass(bodyEl, self.css.sPlaying);      
      

    },

    finish: function() {
      self.playStatus = 'stopped';
      
      // Restore original HTML <title>
      document.title = docTitle;

      // Remove individual link CSS classes
      pl.removeStyleBySoundID(this);

      // Remove global CSS state classes
      pl.removeClass(self.controls.playButton, self.css.sPlaying);
      pl.removeClass(self.controls.playButton, self.css.sPaused);
      // Play All
      pl.removeClass(self.controls.playAllButton, self.css.sPlaying);
      pl.removeClass(self.controls.playAllButton, self.css.sPaused);
      // Body
      pl.removeClass(bodyEl, self.css.sPlaying);
      pl.removeClass(bodyEl, self.css.sPaused); 

      // If position DOM element exists, reset it
      if (self.controls.position != null) { self.controls.position.style.width = '0px';}
  
      // After sound finishes, play next sound if playNext is true
      if (pl.config.playNext && self.lastSound._data.orphanedIndex != true) {
        self.globalNext();
      }
    },
        
    whileplaying: function() {
      
      var currentTime = pl.getTime(this.position, true);
      var duration = pl.getTime(this.durationEstimate, true);
      
      // Populate current time and duration elements if they exist
      if (self.controls.currentTime != null) { self.controls.currentTime.innerHTML = currentTime; }
      if (self.controls.duration != null) { self.controls.duration.innerHTML = duration; }
      
       // If we are dragging...
      if (pl.dragActive) {
        if ( self.controls.position != null) {
          self.controls.position.style.width = (Math.floor((this.position/self.getDurationEstimate(this))*10000)/100+'%');
        }
      }
      // This technique of flooring and (10000/100) allows for more granular control over the num. of significant figures
      if (self.controls.position != null) {
        self.controls.position.style.width = (Math.floor((this.position/self.getDurationEstimate(this))*10000)/100+'%');
      }

    },
    whileloading: function() {
      if (self.controls.loading != null) {
        self.controls.loading.style.width = (((this.bytesLoaded/this.bytesTotal)*100)+'%');
      }
    },
    bufferchange: function() {
      // If we encounter an error state, 404, etc just try and skip to the next track
      if (this.readyState == '2') {
        sm._writeDebug('Error loading file. Attempting to play the next track...');       
        var currentSound = this;
        setTimeout(function(){
          var bufferSound = currentSound;
          pl.removeClass(bufferSound._data.oLink, self.css.sBuffering); //Individual link
          pl.removeClass(self.controls.playButton, self.css.sBuffering); //Global button
          pl.removeClass(self.controls.playAllButton, self.css.sBuffering); // Play All
          pl.removeClass(bodyEl, self.css.sBuffering); // Body 
          pl.addClass(bufferSound._data.oLink, self.css.sError);           
          self.globalNext();
        }, 250);
        return;
      }
      
      // If we are buffering and don't have an error state, add buffering classes
      if (this.isBuffering) {
        pl.addClass(this._data.oLink, self.css.sBuffering); // Individual link
        pl.addClass(self.controls.playButton, self.css.sBuffering); // Global button
        pl.addClass(self.controls.playAllButton, self.css.sBuffering); // Play All
        pl.addClass(bodyEl, self.css.sBuffering); // Body
        sm._writeDebug('Buffering...');      
      }
      else {
        pl.removeClass(this._data.oLink, self.css.sBuffering); //Individual link
        pl.removeClass(self.controls.playButton, self.css.sBuffering); //Global button
        pl.removeClass(self.controls.playAllButton, self.css.sBuffering); // Play All
        pl.removeClass(bodyEl, self.css.sBuffering); // Body  
      }
    }
  }

  /**
   * handleMouseDown, handleMouseMove, stopDrag, and setPosition are used to make the scrubber work.
   */
  this.handleMouseDown = function(e) {
    // a sound link was clicked
    if (isTouchDevice && e.touches) {
      e = e.touches[0];
    }
    if (e.button === 2) {
      if (!pl.config.allowRightClick) {
        pl.stopEvent(e);
      }
      return pl.config.allowRightClick; // ignore right-clicks
    }
    var o = self.getTheDamnTarget(e);
    if (!o) {
      return true;
    }
    if (!self.withinStatusBar(o)) {
      return true;
    }
    self.dragActive = true;
    self.lastSound.pause();
    self.setPosition(e);
    if (!isTouchDevice) {
      _event.add(document,'mousemove',self.handleMouseMove);
    } else {
      _event.add(document,'touchmove',self.handleMouseMove);
    }
    if (self.controls.scrubber != null) {
      self.addClass(self.controls.scrubber,'dragging');
    }
    return self.stopEvent(e);
  };
  
  this.handleMouseMove = function(e) {
    if (isTouchDevice && e.touches) {
      e = e.touches[0];
    }
    // set position accordingly
    if (self.dragActive) {
      if (self.config.useThrottling) {
        // be nice to CPU/externalInterface
        var d = new Date();
        if (d-self.dragExec>20) {
          self.setPosition(e);
        } else {
          window.clearTimeout(self.dragTimer);
          self.dragTimer = window.setTimeout(function(){self.setPosition(e);},20);
        }
        self.dragExec = d;
      } else {
        // oh the hell with it
        self.setPosition(e);
      }
    } else {
      self.stopDrag();
    }
    e.stopPropagation = true;
    return false;
  };
  
  this.stopDrag = function(e) {
    if (self.dragActive) {
      self.removeClass(self.controls.scrubber,'dragging');
      if (!isTouchDevice) {
        _event.remove(document,'mousemove',self.handleMouseMove);
      } else {
        _event.remove(document,'touchmove',self.handleMouseMove);
      }
      if (!pl.hasClass(bodyEl, self.css.sPaused)) {
        self.lastSound.resume();
      }
      self.dragActive = false;
      return self.stopEvent(e);
    }
  };
   
  this.setPosition = function(e) {
    // called from slider control
    var oThis = self.getTheDamnTarget(e),
        x, oControl, oSound, nMsecOffset;
    if (!oThis) {
      return true;
    }
    oControl = oThis;
    while (!self.hasClass(oControl, self.controls.scrubberClass) && oControl.parentNode) {
      oControl = oControl.parentNode;
    }
    oSound = self.lastSound;
    x = parseInt(e.clientX,10);
    // play sound at this position
    nMsecOffset = Math.floor((x-self.getOffX(oControl)-4)/(oControl.offsetWidth)*self.getDurationEstimate(oSound));
    if (!isNaN(nMsecOffset)) {
      nMsecOffset = Math.min(nMsecOffset,oSound.duration);
    }
    if (!isNaN(nMsecOffset)) {
      oSound.setPosition(nMsecOffset);
    }
  };  
  

  this.stopEvent = function(e) {
   if (typeof e != 'undefined' && typeof e.preventDefault != 'undefined') {
      e.preventDefault();
    } else if (typeof e != 'undefined' && typeof e.returnValue != 'undefined') {
      e.returnValue = false;
    }
    return false;
  }
  
  this.getTheDamnTarget = function(e) {
    return (e.target||(window.event?window.event.srcElement:null));
  };

  this.withinStatusBar = function(o) {
    return (self.isChildOfClass(o,self.controls.scrubberClass));
  };

  this.addSound = function(o) {
    var soundURL = o.href,
        soundIndex,
        soundID,
        pLink;
    if (o.getAttribute('data-pushtape-index') != null) {
      soundIndex = Number(o.getAttribute('data-pushtape-index'));
    }
    else if (self.hasClass(o, self.cueClass)) {
      soundIndex = self.links.length; // add to end of the playlist
      o.setAttribute('data-pushtape-index', soundIndex); // give it a real index
      self.links[soundIndex] = o; //add to "found" links
      self.addClass(o, self.css.sDefault); // add pt-link class
    }
    if (o.getAttribute('data-pushtape-sound-id') != null) {
      soundID = o.getAttribute('data-pushtape-sound-id');
    }
    else {
      // Assign unique id internally
      soundID = '_soundID_' + self.soundCount++;
      o.setAttribute('data-pushtape-sound-id', soundID);
    }
    if (o.getAttribute('data-pushtape-permalink') != null) {
      pLink = o.getAttribute('data-pushtape-permalink');
    }    
    thisSound = sm.createSound({
      id: soundID,
      url:o.href,
      autoPlay: false,
      onplay:self.events.play,
      onstop:self.events.stop,
      onpause:self.events.pause,
      onresume:self.events.resume,
      onfinish:self.events.finish,
      type:(o.type||null),
      whileloading:self.events.whileloading,
      whileplaying:self.events.whileplaying,
      onbufferchange:self.events.bufferchange
    });
    // tack on some custom data
    thisSound._data = {
      oLink: o, // DOM node for reference within SM2 object event handlers
      className: self.css.sPlaying,
      permaLink: pLink,
      index: soundIndex, // use HTML data-attribute to reference track index
      orphanedIndex: false, // used to flag bad indexes
      oTitle: o.title ? o.title: o.innerHTML
    };
    return thisSound;
  }

  this.handleClick = function(e) {
    self.scanPage();        
    // a sound link was clicked
    if (typeof e.button != 'undefined' && e.button > 1) {
      // ignore right-click
      return true;
    }
    var o = self.getTheDamnTarget(e);
    if (o.nodeName.toLowerCase() != 'a') {
      o = self.isChildOfNode(o,'a');
      if (!o) return true;
    }
    var sURL = o.getAttribute('href');
    if (!o.href || (!sm.canPlayLink(o) && !self.hasClass(o,self.playableClass)) || self.hasClass(o,self.excludeClass)) {
      return true; // pass-thru for non-MP3/non-links
    }
    // Prevent duplicate links of same link but outside of scope from firing
    if (!o.getAttribute('data-pushtape-index')) {
      return true;
    }
    var thisSound, soundIndex, soundID;
    if (o.getAttribute('data-pushtape-sound-id') != null) {
      soundID = o.getAttribute('data-pushtape-sound-id');
      thisSound = sm.getSoundById(String(soundID));
    }
    //var addCue = (!self.hasClass(o, self.css.sDefault) && self.hasClass(o, self.cueClass));
    if (thisSound) {
      // already exists
      if (thisSound === self.lastSound) {
        // and was playing (or paused)
        thisSound.togglePause();
      } else {
        // different sound
        if (self.lastSound) {
          sm._writeDebug('sound different than last sound: ' + self.lastSound.id);
          self.stopSound(self.lastSound);
        }
        thisSound.togglePause(); // start playing current
      }
    } else {
      // stop last sound
      if (self.lastSound) {
        self.stopSound(self.lastSound);
      }
      // Add a new sound
      thisSound = self.addSound(o);
      // Play the sound
      thisSound.play();
    }
    // Store current state of links in case they change during playback
    self.prevLinks = self.links;
    self.linksChanged = false;
    self.lastSound = thisSound; // reference for next call
    
    if (typeof e != 'undefined' && typeof e.preventDefault != 'undefined') {
      e.preventDefault();
    } else if (typeof e != 'undefined' && typeof e.returnValue != 'undefined') {
      e.returnValue = false;
    }

    return false;
  }

  this.stopSound = function(oSound) {
    soundManager.stop(oSound.id);
    soundManager.unload(oSound.id);
  }

  this.getDurationEstimate = function(oSound) {
    if (oSound.instanceOptions.isMovieStar) {
      return (oSound.duration);
    } else {
      return (!oSound._data.metadata || !oSound._data.metadata.data.givenDuration ? (oSound.durationEstimate||0) : oSound._data.metadata.data.givenDuration);
    }
  }

  /**
   * Global Control methods
   */
  this.globalTogglePlay = function(e) {
    if (self.lastSound != null) {
      // Toggle active sound
      self.lastSound.togglePause();
    }
    else {
      // Otherwise start playing first track
      self.handleClick({target:self.links[0], preventDefault:function(){}});
    }

    if (typeof e != 'undefined' && typeof e.preventDefault != 'undefined') {
      e.preventDefault();
    } else if (typeof e != 'undefined' && typeof e.returnValue != 'undefined') {
      e.returnValue = false;
    }
    return false;
  }
  this.globalTogglePlayAll = function(e) {
    var lastIndex = self.links.length - 1;
    if (self.lastSound != null && self.lastSound._data.index == lastIndex && self.playStatus == 'finished') {
      // The playlist has ended, start over
      self.handleClick({target:self.links[0], preventDefault:function(){}});  
    }
    else if (self.lastSound != null && self.lastSound._data.orphanedIndex != true) {
      // We are currently in the middle of a playlist, act like the globalTogglePlay button
      self.globalTogglePlay(e);
    }    
    else {
      // self.lastSound == null || self.lastSound._data.orphanedIndex == true
      // Playlist context doesn't exist, start from the first track
      self.handleClick({target:self.links[0], preventDefault:function(){}});
    }

    if (typeof e != 'undefined' && typeof e.preventDefault != 'undefined') {
      e.preventDefault();
    } else if (typeof e != 'undefined' && typeof e.returnValue != 'undefined') {
      e.returnValue = false;
    }
    return false;
  } 
  this.globalNext = function(e) {
    sm._writeDebug('Play next track...');
    if (self.lastSound && self.lastSound._data.orphanedIndex != true) {
      var nextLink = self.lastSound._data.index + 1;
      if (nextLink < self.links.length) {
        self.stopSound(self.lastSound);
        self.handleClick({'target':self.links[nextLink]});
      }
      else if (pl.config.repeatAll) {
        self.stopSound(self.lastSound);
        self.handleClick({target:self.links[0], preventDefault:function(){}});
      }
    } else {
      // nothing playing yet, so start first sound
      self.handleClick({target:self.links[0], preventDefault:function(){}});
    }

    if (typeof e != 'undefined' && typeof e.preventDefault != 'undefined') {
      e.preventDefault();
    } else if (typeof e != 'undefined' && typeof e.returnValue != 'undefined') {
      e.returnValue = false;
    }
    return false;

  }
  this.globalPrevious = function(e) {
    sm._writeDebug('Play previous track...');
    if (self.lastSound && self.lastSound._data.orphanedIndex != true) {
      var prevLink = self.lastSound._data.index - 1;
      if (prevLink >= 0) {
        self.stopSound(self.lastSound);
        self.handleClick({'target':self.links[prevLink]});
      }
      else if (pl.config.repeatAll) {
        self.stopSound(self.lastSound);
        self.handleClick({'target':self.links[self.links.length - 1]});
      }
    } else {
      // nothing playing yet, so start first sound
      self.handleClick({target:self.links[0], preventDefault:function(){}});
    }
    if (typeof e != 'undefined' && typeof e.preventDefault != 'undefined') {
      e.preventDefault();
    } else if (typeof e != 'undefined' && typeof e.returnValue != 'undefined') {
      e.returnValue = false;
    }
    return false;
  }

  // Initialize the player and create self.scanPage based on init values
  this.init = function(options) {

    // Allow options arguments to override config defaults
    if (options) {
      self.config = {
        playNext: options.playNext === false ? false : true, // stop after one sound, or play through list until end
        autoPlay: options.autoPlay === true ? true : false,  // start playing the first sound right away
        repeatAll: options.repeatAll === true ? true : false, // repeat playlist after last track
        containerClass : options.containerClass || '', // Default is to scan entire page for links, if set will scan only inside containerClass
        autoScan : options.autoScan === true ? true : false, // Automatically observe changes to container and scan for new links to add to playlist
        linkClass : options.linkClass || '', // Default will add all audio links found. If set (i.e. pushtape-player), will only add audio links that have the class: <a class="pushtape-player" href="file.mp3"></a>
        addControlsMarkup: { 
          'enabled' : options.addControlsMarkup && options.addControlsMarkup.enabled === true ? true : false, // Default is false. If true, global controls markup is inserted inside of containerClass
          'controlsMarkupClass' : options.addControlsMarkup && options.addControlsMarkup.controlsMarkupClass || 'pt-controls-wrapper', // Wrapper class
          'position' : options.addControlsMarkup && options.addControlsMarkup.position || 'top' // Position the controls inside the top or bottom of the document or containerClass
        }
      }
    }
    
    sm._writeDebug('pushtapePlayer.init()');
    
    // Default behavior is to scan the entire HTML document for playable links   
    var container = document.body; 
    // If a containerClass class is set, limit the playlist scope to that class. 
    if (self.config.containerClass.length > 0) {
      container = document.getElementsByClassName(self.config.containerClass)[0];
    }
    self.addClass(container, self.css.sContainer);
    
    /* Bind events (clicks, drags, mouseDown)*/
    function doEvents(action) { // action: add / remove

      _event[action](document,'click',self.handleClick);

      if (!isTouchDevice) {
        _event[action](document,'mousedown',self.handleMouseDown);
        _event[action](document,'mouseup',self.stopDrag);
      } else {
        _event[action](document,'touchstart',self.handleMouseDown);
        _event[action](document,'touchend',self.stopDrag);
      }

      _event[action](window, 'unload', cleanup);

    }

    cleanup = function() {
      doEvents('remove');
    };
    
    var countScan = 0;
    // Function that scans for links on the page
    self.scanPage = function() {
        cleanup();
        bodyEl = document.getElementsByTagName('body')[0];

        if (self.dragActive) {
          return;
        }
        self.config.playNext = (options.playNext === false) ? false : true;

        // Find relevant links
        var oLinks = container.getElementsByTagName('a');

        // Build playlist
        self.links = [];
        var foundItems = 0;
        var currentItem = null;
        for (var i = 0; i < oLinks.length; i++) {
          if ((sm.canPlayLink(oLinks[i]) || self.hasClass(oLinks[i], self.playableClass)) && !self.hasClass(oLinks[i],self.excludeClass) && !self.hasClass(oLinks[i], self.cueClass)) {
            // If linkClass is not set, add all links found, otherwise only add links with the linkClass
            if (self.config.linkClass.length <= 0 || self.hasClass(oLinks[i], self.config.linkClass)) {
              self.addClass(oLinks[i], self.css.sDefault); // add default CSS decoration
              self.links[foundItems] = oLinks[i];
              /**
                * We use a unique HTML data-attribute to relate each link to appropriate sound index.
                * When link is clicked, we use this to play the right sound on the page - without it, we'd have 
                * to rely on something less reliable like the URL (which fails if there are duplicates).
                * For greater control over how this works, on your link you can use the data-pushtape-sound-id
                * attribute, which will allow you to uniquely declare and reference sounds that are loaded.
                */
              oLinks[i].setAttribute('data-pushtape-index', foundItems);
              // Set a flag if we find the current playing sound
              if (self.lastSound != null && self.lastSound.hasOwnProperty('id') && oLinks[i].getAttribute('data-pushtape-sound-id') != null) {
                if (oLinks[i].getAttribute('data-pushtape-sound-id') == self.lastSound.id) {
                  currentItem = foundItems;
                }
              }
              foundItems++;
            }
          }
        }
                
        // If current playing item found, update the object
        if (currentItem !== null) {
          self.lastSound._data.oLink = oLinks[currentItem];
          self.lastSound._data.index = currentItem;
          self.lastSound._data.orphanedIndex = false;
        }
        else if (self.lastSound != null) {
          // The playing sound was not found in current page playlist, flag it as orphaned
          self.lastSound._data.orphanedIndex = true;
        }
          
        // Expose the number of items found (same as self.links.length);
        self.foundItems = foundItems;

        var scope = self.config.containerClass ? 'containerClass: ' + self.config.containerClass : 'entire document (no containerClass set)';
        sm._writeDebug('scanPage(): Found ' + foundItems + ' relevant items in ' + scope);
        
        /**
         *  If addControlsMarkup is false (default), you are expected to add all the
         *  control markup in HTML yourself (i.e. allowing you to radically alter positioning of things)
         *  If addControlsMarkup = true, it will insert HTML into the top/bottom (addControlsMarkup.position) of the playlist scope
         */
        if (self.config.addControlsMarkup.enabled && foundItems > 0) {
          sm._writeDebug('Attempting to add controls markup using class: ' + self.config.addControlsMarkup.controlsMarkupClass);
          var controlsMarkup = null;
          var controlsEl = document.getElementsByClassName(self.config.addControlsMarkup.controlsMarkupClass)[0];
          // If a controls element already exists, use that, otherwise we'll dynamically create one
          if (controlsEl != null) {
            controlsMarkup = controlsEl;
            sm._writeDebug('Control markup DOM element already exists, adding markup via innerHTML.');
          }
          else {
            controlsMarkup = document.createElement('div');
            controlsMarkup.setAttribute('class', self.config.addControlsMarkup.controlsMarkupClass);
            // Insert markup inside containerClass div if exists, otherwise insert in the body
            if (self.config.containerClass.length > 0) {
              var containerEl = document.getElementsByClassName(self.config.containerClass)[0];
              if (self.config.addControlsMarkup.position == 'top')  {
                containerEl.insertBefore(controlsMarkup, containerEl.firstChild);  
              }
              else {
                containerEl.appendChild(controlsMarkup);
              }
            }
            else {
              if (self.config.addControlsMarkup.position == 'top')  {
                bodyEl.insertBefore(controlsMarkup, bodyEl.firstChild);  
              }
              else {
                bodyEl.appendChild(controlsMarkup);
              }
            }     
            sm._writeDebug('Creating a new DOM element for control markup');
          }
    
          if (controlsMarkup != null && controlsMarkup.innerHTML.length <= 0) {
            // If you really need to manipulate the markup, just disable addControlsMarkup and manually add the markup in your HTML.
            // You could also override self.defaultControlsMarkup before init(); if you want to keep everything in JS
            controlsMarkup.innerHTML = self.defaultControlsMarkup;
          }
        }
        // Find the global controls...this can probably be optimized, but it's also supposed to be kinda granular.
        self.controls.playButton = document.getElementsByClassName(self.controls.playButtonClass)[0];
        self.controls.playAllButton = document.getElementsByClassName(self.controls.playAllButtonClass)[0];
        self.controls.nextButton = document.getElementsByClassName(self.controls.nextButtonClass)[0];
        self.controls.previousButton = document.getElementsByClassName(self.controls.previousButtonClass)[0];  
        self.controls.currentTime = document.getElementsByClassName(self.controls.currentTimeClass)[0];  
        self.controls.duration = document.getElementsByClassName(self.controls.durationClass)[0];  
        self.controls.statusBar = document.getElementsByClassName(self.controls.statusBarClass)[0];  
        self.controls.loading = document.getElementsByClassName(self.controls.loadingClass)[0];  
        self.controls.position = document.getElementsByClassName(self.controls.positionClass)[0];  
        self.controls.scrubber = document.getElementsByClassName(self.controls.scrubberClass)[0];  
        self.controls.trackTitle = document.getElementsByClassName(self.controls.trackTitleClass)[0];  
        self.controls.permaLink = document.getElementsByClassName(self.controls.permaLinkClass)[0];  
    
        // Global control bindings...check for nulls in case these elements don't exist.
        if (self.controls.playButton != null && foundItems > 0) { _event['add'](self.controls.playButton,'click',self.globalTogglePlay);}
        if (self.controls.playAllButton != null && foundItems > 0) { _event['add'](self.controls.playAllButton,'click',self.globalTogglePlayAll);}
        if (self.controls.nextButton != null && foundItems > 0) { _event['add'](self.controls.nextButton,'click',self.globalNext);}
        if (self.controls.previousButton != null && foundItems > 0) { _event['add'](self.controls.previousButton,'click',self.globalPrevious);}
      
        if (foundItems > 0) {
          // Toggle the .pt-hide visibility class if we find items. Depends on .pt-hide { display:none; } in your CSS file.
          var ptControls = document.getElementsByClassName('pt-hide');
          if (ptControls != null && ptControls.length >= 1) {
            for(var i = 0; i < ptControls.length; i++) {
              self.removeClass(ptControls[i], 'pt-hide');
            }
          }
          
        }    
        
        // Call the appropriate sound methods based on current state
        if (self.lastSound != null && self.lastSound.readyState == 3) {
          if (self.lastSound.paused == 1 ) {
            self.events.pause.call(self.lastSound);
          }
          else if (self.lastSound.playState == 1) {
            self.events.play.call(self.lastSound); 
            self.events.whileplaying.call(self.lastSound); 
          }
        }      
        
        doEvents('add');
        countScan++;
    }

    
    // Observe any changes to container and scan the container for new links
    if (self.config.autoScan) {
      observer = new MutationObserver(self.debounce(function(mutations) {
        self.scanPage();      
      }), 100);
      observer.observe(container, {childList: true, subtree:true});
    }
    self.scanPage();
    
    // Play first track if autoPlay set
    if (self.config.autoPlay) {
      self.handleClick({target:self.links[0], preventDefault:function(){}});
    }
    
  }
  
  // Destroy/reset the player
  this.destroy = function(options) {
    sm._writeDebug('Destroy pushtapePlayer and reboot soundmanager2');
    observer.disconnect();
    var oLinks = document.getElementsByTagName('a');
    
    // Remove link bindings
    var foundItems = 0;
    for (var i = 0; i < oLinks.length; i++) {
      if ((sm.canPlayLink(oLinks[i]) || self.hasClass(oLinks[i], self.playableClass)) && !self.hasClass(oLinks[i],self.excludeClass) && !self.hasClass(oLinks[i], self.cueClass)) {
        if (self.config.linkClass.length <= 0 || self.hasClass(oLinks[i], self.config.linkClass)) {
          self.removeClass(oLinks[i], self.css.sDefault); // remove default CSS decoration
          oLinks[i].removeAttribute('data-pushtape-index', foundItems); 
          foundItems++;
        }
      }
    }
    // Reset variables
    self.links = []; 
    self.lastSound = null; 
    self.soundCount = 0;

    _event['remove'](document,'mousedown',self.handleMouseDown);
    _event['remove'](document,'mouseup',self.stopDrag);
    _event['remove'](document,'touchstart',self.handleMouseDown);
    _event['remove'](document,'touchend',self.stopDrag);

    // Global control bindings...check for nulls in case these elements don't exist.
    _event['remove'](self.controls.playButton,'click', self.globalTogglePlay);
    _event['remove'](self.controls.playAllButton,'click', self.globalTogglePlayAll);
    _event['remove'](self.controls.nextButton,'click', self.globalNext);
    _event['remove'](self.controls.previousButton,'click', self.globalPrevious);
    _event['remove'](document, 'click', self.handleClick);    
    
    sm.reset();
  }
};
