Highlight:
* Bugs:
  * Duplicating a single block with a full-script highlight has a graphical bug
  * Duplicating a full script with a plus button creates graphical lag
  * Some artifacts show up when dragging highlighted blocks
  * Something is trying to highlight ScriptsMorphs and SpriteMorphs
  * Maybe hide highlights on other sprites so it doesn't show the dialog
  * Hint buttons can overlap too much
  * reifyScript block isn't handled by getCode
  * Hover feedback still shows when a dialog is in between mouse and block
  * require() statements shouldn't be needed in the config, since this isn't VCd
* TODO:
* Reach:
  * Save preferences
  * Show list insert hints as a dialog
  * Possibly a different color for replacements?
  * On insert hints, show deleted code highlights or faded, etc.
  * Make a more uniform way of logging node IDs
  * [Server] Custom block side scripts should be able to be candidates
  * Speed up more on Firefox

Logging:
* (!) Change the way custom block definitions are logged (see TODO in store.js)

UI:
* Fix parent.adjustBounds bug in HintBar
* Clean up breaks the hint margin for custom blocks

Continuing:
* Look through JS errors from prod
* Issues from GitHub

Stretch:
* Merge in Berkeley
* Have custom blocks in BlockHints show up as they do on screen (since you
actually know the spec for those)
* Log sprite movements in the stage
