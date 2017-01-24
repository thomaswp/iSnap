Highlight:
* Bugs:
  * Duplicating a single block with a full-script highlight has a graphical bug
  * Duplicating a full script with a plus button creates graphical lag
  * Some artifacts show up when dragging highlighted blocks
  * Something is trying to highlight ScriptsMorphs and SpriteMorphs
  * Maybe hide highlights on other sprites so it doesn't show the dialog
  * Check my work prompt shouldn't happen on run if already showing
* TODO:
  * Test on existing hint requests
  * Limit plus buttons
  * Reorder/move reporter blocks need hover indicators
  * Possibly a different color for replacements?
* Reach:
  * Save preferences
  * Show list insert hints as a dialog
  * Find a better way of doing structure hints
  * Make a more uniform way of logging node IDs

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
