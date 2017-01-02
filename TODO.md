Highlight:
* click-run highlighting doesn't disappear
* highlights can't override each other (they just don't go away)
* sometimes hints still show blurred highlight for unknown reason
* hint dialog doesn't show all existing code?

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
