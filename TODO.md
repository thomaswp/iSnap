Highlight:
* Bugs:
* TODO:
  * Add UI for starting/explaining hints
  * Add UI for move/reorder hints
  * Change hint dialog UI to just have dismiss
  * Add and test logging
  * Test on existing hint requests

UI:
* Fix parent.adjustBounds bug in HintBar
* Clean up breaks the hint margin for custom blocks
* There's some weirdness when switching between sprites (since spriteBar is
actually sprite-specific, go figure)
* Need a way to change assignments w/o losing code

Algorithmic:
* GG1 bad first hints?
* [This doc](https://docs.google.com/document/d/1_t-jeOH34-yaK4aXZpbNDNnAvZt5m4d-1ZY2gTcSQ6o/edit)

Continuing:
* Look through JS errors from prod
* Issues from GitHub

Stretch:
* Merge in Berkeley
* Open custom block editor automatically when refreshing/viewing logs
* Have custom blocks in BlockHints show up as they do on screen (since you
actually know the spec for those)
* Make assignment selection prettier
* Log sprite movements in the stage
