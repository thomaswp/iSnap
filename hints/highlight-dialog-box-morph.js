
function HighlightDialogBoxMorph(target) {
    this.init(target);
}

HighlightDialogBoxMorph.prototype = Object.create(DialogBoxMorph.prototype);
HighlightDialogBoxMorph.constructor = HighlightDialogBoxMorph;
HighlightDialogBoxMorph.uber = DialogBoxMorph.prototype;

HighlightDialogBoxMorph.prototype.init = function(target) {
    HighlightDialogBoxMorph.uber.init.call(this, target, null, target);

    this.key = 'highlightDialog';
    this.addButton('ok', localize('Ok'));
};


HighlightDialogBoxMorph.prototype.ok = function() {
    this.destroy();
};

HighlightDialogBoxMorph.prototype.popUp = function() {
    var world = this.target.world();
    if (!world) return;

    // Defer to an existing dialog if one exists
    var showing = HighlightDialogBoxMorph.showing;
    if (showing && !showing.destroyed) {
        return;
    }

    HighlightDialogBoxMorph.showing = this;
    HighlightDialogBoxMorph.uber.popUp.call(this, world);
};

HighlightDialogBoxMorph.prototype.destroy = function() {
    HighlightDialogBoxMorph.uber.destroy.call(this);
    this.destroyed = true;
};