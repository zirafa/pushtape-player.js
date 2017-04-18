# Change Log
[Keep a changelog](http://keepachangelog.com/).

## [2.0.6] - 2017-4-18
### Added
- keyboardControl option - adds keyboard shortcuts to player. Spacebar toggles play-pause, right and left arrow seeks +/- 5 seconds

## [2.0.5] - 2016-8-5
### Fixed
- playAllButton bug - when playlist ends, playAll should restart the playlist, not replay the last track

## [2.0.4] - 2016-8-4
### Fixed
- playAllButton bug - playAll button lacking playlist context. Fix alters playAll button's state & behavior if the lastSound is orphaned.

## [2.0.3] - 2016-7-11
### Added
- playAllButton - Clones playButton behavior (pt-play-all), useful for some UX designs that need two playbuttons 
- permalink: - Attach URL stored in data-pushtape-permalink to a global link matching class "pt-permalink"
- pt-error class added when an audio link fails to load
- CSS state classes are now additionally applied as body classes to allow full document styling based on player state (paused, playing, etc)
- preventDefault for play/pause event handlers
### Fixed
- playNext bug not advancing when there is a load error. Fix will now skip bad links after 250ms and apply pt-error class to the link.

## [2.0.2] - 2016-3-3
### Fixed
- Bug where global control markup context was lost
### Changed
- Increased autoscan debounce to 100ms
- Use .call() to simplify self.lastSound state management in scanPage()

## [2.0.1] - 2016-3-1
### Fixed
- Infinite loop bug with autoStart = true
- repeatAll causing orphanedIndex to be true
- Bad currentItem bug for globalPlay, globalNext, globalPrevious

## [2.0.0] - 2016-2-24
### Added
- This CHANGELOG file
- Autoscan function and mutation observer feature that automatically detects new audio links in the container.
- Destroy() method for shutting down the player

## [1.0.0] - 2014-8-12
### Added
- Initial release
