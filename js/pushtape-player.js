/**
 * Pushtape Player: Global Controls
 * --------------------
 * This player was created as part of the Pushtape (pushtape.com) project to support more flexible music player options.
 *
 * Notes:
 * - This player only binds its behavior to CSS classes. You can provide all the necessary markup, or optionally let the player generate it.
 * - There are individual play/pause controls per link, as well as global playback controls  - pause/play, scrubber, previous/next, and time.
 * - By default, it will grabs all links on a page. You can optionally set a pushtapePlayer.config.containerClass to limit the scope.
 * - Track index for links on a page are marked with a data-pushtape-index attribute.
 * - 
 *
 * Requires SoundManager 2 Javascript API.
 * http://schillmania.com/projects/soundmanager2/
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
      cleanup;

  this.config = {
    playNext: true, // stop after one sound, or play through list until end
    autoPlay: false,  // start playing the first sound right away
    repeatAll: false, // repeat playlist after last track
    containerClass : '', // By default, we scan *all* links on the page. If set, limits the scope of search inside containerClass
    addControlsMarkup: {
      'enabled' : false, 
      'controlsMarkupClass' :'pt-controls-markup', // wrapper class
      'position' : 'top' // top or bottom
    } // if enabled =  false (you manually provide controls markup in HTML doc), otherwise set to true and it will be dynamically inserted into controlsContainerClass.
  }

  this.controls = {
    // CSS selectors for control elements
    playButtonClass: 'pt-play-pause',
    nextButtonClass: 'pt-next',
    previousButtonClass: 'pt-previous',
    currentTimeClass: 'pt-current-time',
    durationClass: 'pt-duration',
    scrubberClass: 'pt-scrubber',
    statusBarClass: 'pt-statusbar',
    positionClass: 'pt-position',
    loadingClass: 'pt-loading',
    trackTitleClass: 'pt-current-track-title', // current track
    // DOM elements for controls. These are assigned values in this.init method
    playButton: null, 
    nextButton: null,
    previousButton: null,
    currentTime: null,
    totalTime: null,
    trackTitle: null
  };

  this.playableClass = 'pt-playable'; // CSS class for forcing a link to be playable (eg. doesn't have .MP3 in it)
  this.excludeClass = 'pt-exclude'; // CSS class for ignoring MP3 links
  this.cueClass = 'pt-cue'; // CSS class for adding track to end of playlist

  this.playSymbol = '▶', // Used in document.title when sound is playing
  this.pauseSymbol = '❚❚',
  
  this.links = []; // keep track of links on page
  this.playlist = []; // index of SM2 sounds..TODO: support multiple playlists.
  this.lastSound = null; // keep track of last sound played
  this.soundCount = 0; // Used to create a unique sound ID

  this.css = {
    // CSS class names appended to each link during various states
    sDefault: 'pt-link', // default state
    sLoading: 'pt-loading',
    sPlaying: 'pt-playing',
    sBuffering: 'pt-buffering',
    sPaused: 'pt-paused'
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
    o.className = (o.className?o.className+' ':'')+cStr;
  };

  this.removeClass = function(o, cStr) {
    if (!o || !cStr || !self.hasClass(o,cStr)) {
      return false;
    }
    o.className = o.className.replace(new RegExp('( '+cStr+')|('+cStr+')','g'),'');
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

  this.getTime = function(nMSec, bAsString) {
    // convert milliseconds to mm:ss, return as object literal or string
    var nSec = Math.floor(nMSec/1000),
        min = Math.floor(nSec/60),
        sec = nSec-(min*60);
    // if (min === 0 && sec === 0) return null; // return 0:00 as null
    return (bAsString?(min+':'+(sec<10?'0'+sec:sec)):{'min':min,'sec':sec});
  };
  
  this.getSoundByIndex = function(sIndex) {
    return (typeof self.playlist[sIndex] != 'undefined' ? self.playlist[sIndex]:null);
  }

  /**
   *  Handlers for individual sound events as they're started/stopped/played
   */
  this.events = {
    play: function() {
      // Show play symbol in <title>
      document.title = self.playSymbol + ' ' + docTitle;

      // Remove/add class to individual sound link
      pl.removeClass(this._data.oLink, this._data.className);
      this._data.className = pl.css.sPlaying;
      pl.addClass(this._data.oLink,this._data.className);

      // Remove/add class to global controls
      pl.removeClass(self.controls.playButton, self.css.sPaused);
      pl.addClass(self.controls.playButton, self.css.sPlaying);
        
      // If trackTitle DOM element exists, populate it with current track
      if (self.controls.trackTitle != null) {
        self.controls.trackTitle.innerHTML = this._data.oTitle;
      }
    },

    stop: function() {
      // Remove play symbol from the HTML <title>
      document.title = docTitle;

      // Remove any CSS classes applied to individual links as well as global controls
      pl.removeClass(this._data.oLink,this._data.className);
      this._data.className = '';      
      pl.removeClass(self.controls.playButton, self.css.sPlaying);
     
      // If controls DOM element exists, reset it
      if (self.controls.position != null) { self.controls.position.style.width = '0px';}
    },

    pause: function() {
      // If moving scrubber position...
      if (pl.dragActive) {
        return false;
      }

      // Remove play symbol from HTML <title> 
      document.title = docTitle;

      // Add/remove individual link CSS classes
      pl.removeClass(this._data.oLink,this._data.className);
      this._data.className = pl.css.sPaused;
      pl.addClass(this._data.oLink,this._data.className);

      // Add/Remove global controls CSS classes
      pl.removeClass(self.controls.playButton, self.css.sPlaying);
      pl.addClass(self.controls.playButton, self.css.sPaused);
      
    
    },
    resume: function() {
      // If moving scrubber position...
      if (pl.dragActive) {
        return false;
      }
      // Add play symbol to HTML <title>
      document.title = self.playSymbol + ' ' + docTitle;

      // Add/remove link specific CSS classes
      pl.removeClass(this._data.oLink,this._data.className);
      this._data.className = pl.css.sPlaying;
      pl.addClass(this._data.oLink,this._data.className);
      
      // Add/remove global control CSS
      pl.removeClass(self.controls.playButton, self.css.sPaused);
      pl.addClass(self.controls.playButton, self.css.sPlaying);

    },

    finish: function() {
      // Restore original HTML <title>
      document.title = docTitle;

      // Remove individual link CSS classes
      pl.removeClass(this._data.oLink,this._data.className);
      this._data.className = '';

      // Remove all global CSS state classes
      pl.removeClass(self.controls.playButton, self.css.sPlaying);
      pl.removeClass(self.controls.playButton, self.css.sPaused);

      // If position DOM element exists, reset it
      if (self.controls.position != null) { self.controls.position.style.width = '0px';}
      
      // After sound finishes, play next sound if playNext is true
      if (pl.config.playNext) {
        var nextLink = (this._data.index + 1);
        if (nextLink < pl.links.length) {
          pl.handleClick({'target':pl.links[nextLink]});
        }
        else if(pl.config.repeatAll) {
          // We are at the end, start from the beginning
          pl.handleClick({'target':pl.links[0]});  
        }
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
      if (this.isBuffering) {
        pl.addClass(this._data.oLink, pl.css.sBuffering); // Individual link
        pl.addClass(self.controls.playButton, self.css.sBuffering); // Global button
        sm._writeDebug('Buffering...');
      } else {
        pl.removeClass(this._data.oLink, pl.css.sBuffering); //Individual link
        pl.removeClass(self.controls.playButton, self.css.sBuffering); //Global button

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
      if (!pl.hasClass(self.controls.playButton, self.css.sPaused)) {
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
    } else if (typeof event != 'undefined' && typeof event.returnValue != 'undefined') {
      event.returnValue = false;
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
        soundIndex;
    if (o.getAttribute('data-pushtape-index') != null) {
      soundIndex = Number(o.getAttribute('data-pushtape-index'));
    }
    else if (self.hasClass(o, self.cueClass)) {
      soundIndex = self.links.length; // add to end of the playlist
      o.setAttribute('data-pushtape-index', soundIndex); // give it a real index
      self.links[soundIndex] = o; //add to "found" links
      self.addClass(o, self.css.sDefault); // add pt-link class
    }
    thisSound = sm.createSound({
      id:'sound_id_' + (self.soundCount++),
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
      index: soundIndex, // use HTML data-attribute to reference track index
      oTitle: o.title ? o.title: o.innerHTML
    };
    self.playlist[soundIndex] = thisSound;
    return thisSound;
  }

  this.handleClick = function(e) {
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
    var soundURL = o.href;
    var soundIndex = Number(o.getAttribute('data-pushtape-index'));
    var thisSound = self.getSoundByIndex(soundIndex);
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
    
    self.lastSound = thisSound; // reference for next call

    if (typeof e != 'undefined' && typeof e.preventDefault != 'undefined') {
      e.preventDefault();
    } else {
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
  };

  /**
   * Global Control methods
   */
  this.globalTogglePlay = function(e) {
    if (self.lastSound) {
      // Toggle active sound
      self.lastSound.togglePause();
    }
    else {
      // Otherwise start playing first track
      self.handleClick({'target':self.links[0]}); 
    }

    if (typeof e != 'undefined' && typeof e.preventDefault != 'undefined') {
      e.preventDefault();
    } else {
      e.returnValue = false;
    }
    return false;
  }  
  this.globalNext = function(e) {
    sm._writeDebug('Play next track...');    
    if (self.lastSound) {
      var nextLink = (self.lastSound._data.index + 1);
      if (nextLink < self.links.length) {
        self.handleClick({'target':self.links[nextLink]});
      }
      else if (pl.config.repeatAll) {
        self.handleClick({'target':self.links[0]});
      }
    } else {
      // nothing playing yet, so start first sound
      self.handleClick({'target':self.links[0]});
    }

    if (typeof e != 'undefined' && typeof e.preventDefault != 'undefined') {
      e.preventDefault();
    } else {
      e.returnValue = false;
    }
    return false;

  }
  this.globalPrevious = function(e) {
    sm._writeDebug('Play previous track...');    
    if (self.lastSound) {
      var prevLink = (self.lastSound._data.index - 1);
      if (prevLink >= 0) {
        self.handleClick({'target':self.links[prevLink]});
      }
      else if (pl.config.repeatAll) {
        self.handleClick({'target':self.links[self.links.length - 1]});
      }
    } else {
      // nothing playing yet, so start first sound
      self.handleClick({'target':self.links[0]});
    }
    if (typeof e != 'undefined' && typeof e.preventDefault != 'undefined') {
      e.preventDefault();
    } else {
      e.returnValue = false;
    }
    return false;
  }
  
  // Initialize the player. 
  this.init = function() {
    
    sm._writeDebug('pushtapePlayer.init()');
    

    // Default behavior is to scan the entire HTML document for playable links   
    var container = document; 

    // If a containerClass class is set, limit the playlist scope to that class. 
    if (self.config.containerClass.length > 0) {
      container = document.getElementsByClassName(self.config.containerClass)[0];
    }
    // Find relevant links
    var oLinks = container.getElementsByTagName('a');

    // Build playlist
    var foundItems = 0;
    for (var i = 0; i < oLinks.length; i++) {
      if ((sm.canPlayLink(oLinks[i]) || self.hasClass(oLinks[i],self.playableClass)) && !self.hasClass(oLinks[i],self.excludeClass) && !self.hasClass(oLinks[i], self.cueClass)) {
        self.addClass(oLinks[i], self.css.sDefault); // add default CSS decoration
        self.links[foundItems] = oLinks[i];
        /**
          * Use a unique HTML data-attribute to relate each link to appropriate sound index.
          * When link is clicked, we use this to play the right sound - without it, we'd have 
          * to rely on something less reliable like the URL (which fails if there are duplicates).
          */
        oLinks[i].setAttribute('data-pushtape-index', foundItems); 
        foundItems++;
      }
    }
    
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

    doEvents('add');

    var scope = self.config.containerClass ? 'containerClass: ' + self.config.containerClass : 'entire document (no containerClass set)';
    sm._writeDebug('pushtapePlayer.init(): Found ' + foundItems + ' relevant items in ' + scope);


    /** If addControlsMarkup is false (default), you are expected to add all the
     *  control markup in HTML yourself (i.e. allowing you to radically alter positioning of things)
     *  If addControlsMarkup = true, it will insert HTML into the top/bottom (addControlsMarkup.position) of the playlist scope
     */
    if (self.config.addControlsMarkup.enabled) {
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
          var bodyEl = document.getElementsByTagName('body')[0];
          if (self.config.addControlsMarkup.position == 'top')  {
            bodyEl.insertBefore(controlsMarkup, bodyEl.firstChild);  
          }
          else {
            bodyEl.appendChild(controlsMarkup);
          }
        }     
        sm._writeDebug('Creating a new DOM element for control markup');
      }

      if (controlsMarkup != null) {
        // If you really need to manipulate this, just disable addControlsMarkup and manually add the markup in your HTML.
        controlsMarkup.innerHTML = [
          '<div class="pt-controls">',
            '<a class="pt-play-pause" href="#" title="Play/Pause"><span class="play-btn">▶</span><span class="pause-btn">❚❚</span></a>',
            '<a class="pt-next" href="#" title="Next"> &raquo;</a>',
            '<a class="pt-previous" href="#" title="Previous">&laquo; </a>',
            '<span class="pt-current-track-title"></span>',
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
      }
    }

    // Initialize the global controls...this can probably be optimized, but it's intentionally verbose.
    self.controls.playButton = document.getElementsByClassName(self.controls.playButtonClass)[0];
    self.controls.nextButton = document.getElementsByClassName(self.controls.nextButtonClass)[0];
    self.controls.previousButton = document.getElementsByClassName(self.controls.previousButtonClass)[0];  
    self.controls.currentTime = document.getElementsByClassName(self.controls.currentTimeClass)[0];  
    self.controls.duration = document.getElementsByClassName(self.controls.durationClass)[0];  
    self.controls.statusbar = document.getElementsByClassName(self.controls.stausBarClass)[0];  
    self.controls.loading = document.getElementsByClassName(self.controls.loadingClass)[0];  
    self.controls.position = document.getElementsByClassName(self.controls.positionClass)[0];  
    self.controls.scrubber = document.getElementsByClassName(self.controls.scrubberClass)[0];  
    self.controls.trackTitle = document.getElementsByClassName(self.controls.trackTitleClass)[0];  
    
    // Global control bindings...check for nulls in case these elements don't exist.
    if (self.controls.playButton != null) { _event['add'](self.controls.playButton,'click',self.globalTogglePlay);}
    if (self.controls.nextButton != null) { _event['add'](self.controls.nextButton,'click',self.globalNext);}
    if (self.controls.previousButton != null) { _event['add'](self.controls.previousButton,'click',self.globalPrevious);}

    if (foundItems > 0) {
      // Add click listener
      _event['add'](document,'click',self.handleClick);

      // Play first track if autoPlay set
      if (self.config.autoPlay) {
        self.handleClick({target:self.links[0],preventDefault:function(){}});
      }
    }
  }
};
