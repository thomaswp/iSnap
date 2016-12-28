// hintDialog.js
// This file serves to test custom dialogue box.
// Specifically, hint dialogue with ScriptMorph
// Reference: BlockEditorMorph in byob.js

/********************************
 * Hint Button
 ********************************/
// Hint Button Action
IDE_Morph.prototype.getHint = function() {
    // if (IntentionDialogMorph.showing) {
    //     return;
    // }

    if (!this.spriteBar || !this.spriteBar.hintButton) return;
    var hintButton = this.spriteBar.hintButton;

    window.hintProvider.clearDisplays();
    var active = !hintButton.active;
    setHintsActive(active);
    window.hintProvider.setDisplayEnabled(SnapDisplay, active);

    // Currently we don't show the intent dialog, but this is how it's been
    // calculated in the past'
    // var elapseThreshold = 60 * 1000,
    //     currentTime = hintButton.lastTime;

    // var showIntentionDialog = false;

    // if (hintButton.firstClick) {
    //     hintButton.firstClick = false;
    // } else if (currentTime - hintButton.lastClickTime >=
    //         elapseThreshold) {
    //     showIntentionDialog = true;
    // }
    // hintButton.lastClickTime = currentTime;
};

function setHintsActive(active) {
    if (!ide.spriteBar || !ide.spriteBar.hintButton) return;
    var hintButton = ide.spriteBar.hintButton;
    if (hintButton.active === active) return;
    Trace.log('HelpButton.toggled', active);
    hintButton.active = active;
    hintButton.labelString =
        ' ' + localize(active ? 'Hide Help' : 'Get Help') + ' ';
    hintButton.drawNew();
    hintButton.fixLayout();
    ide.fixLayout();
}