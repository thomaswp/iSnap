require('hint-bar-morph');

(function() {
    var superIsNonPartMorph = SyntaxElementMorph.prototype.isNonPartMorph;
    SyntaxElementMorph.prototype.isNonPartMorph = function(block) {
        return superIsNonPartMorph(block) ||
                block instanceof HintBarMorph ||
                block instanceof PushButtonMorph;
    };
})();

SyntaxElementMorph.prototype.enclosingBlock = function() {
    var block = this;
    while (block && !(block instanceof BlockMorph)) {
        block = block.parent;
    }
    return block;
};

BlockMorph.prototype.topBlockInScript = function() {
    if (this.parent.nextBlock && this.parent.nextBlock() == this) {
        return this.parent.topBlockInScript();
    }
    return this;
};

BlockMorph.prototype.addActiveHighlightBasic =
    BlockMorph.prototype.addActiveHighlight;
BlockMorph.prototype.addActiveHighlight = function(color) {
    // TODO: remove individual hint buttons as well
    var index = this.children.indexOf(this.hintBar);
    if (index >= 0) {
        this.children.splice(index, 1);
        var highlight = this.addActiveHighlightBasic(color);
        this.children.splice(index, 0, this.hintBar);
        this.fullChanged();
        return highlight;
    } else {
        return this.addActiveHighlightBasic(color);
    }
};

BlockMorph.prototype.addSingleHighlight = function(color) {
    color = color || this.activeHighlight;
    var children = this.children;
    this.children = [];
    var highlight = this.addActiveHighlight(color);
    children.push(highlight);
    this.children = children;
    this.fullChanged();
    return highlight;
};

// We need block highlights not to intercept pointer events
BlockHighlightMorph.prototype.topMorphAt = function(point) {
    return null;
};

ArgMorph.prototype.addActiveHighlight =
    BlockMorph.prototype.addActiveHighlight;
ArgMorph.prototype.addActiveHighlightBasic =
    BlockMorph.prototype.addActiveHighlightBasic;
ArgMorph.prototype.removeHighlight =
    BlockMorph.prototype.removeHighlight;
ArgMorph.prototype.highlight =
    BlockMorph.prototype.highlight;
ArgMorph.prototype.highlightImage =
    BlockMorph.prototype.highlightImage;
ArgMorph.prototype.highlightImageBlurred =
    BlockMorph.prototype.highlightImageBlurred;
ArgMorph.prototype.getHighlight =
    BlockMorph.prototype.getHighlight;
ArgMorph.prototype.addSingleHighlight =
    ArgMorph.prototype.addActiveHighlight;

// ArgMorph.prototype.highlightImageBlurred = function (color, blur) {
//     var fb, img, hi, ctx;
//     fb = this.fullBounds().extent();
//     img = this.fullImage();

//     hi = newCanvas(fb.add(blur * 2));
//     ctx = hi.getContext('2d');
//     ctx.shadowBlur = blur * 2;
//     ctx.shadowColor = color.toString();
//     ctx.translate(blur + fb.x / 2, blur + fb.y / 2);
//     ctx.scale(0.5, 0.5);
//     ctx.drawImage(img, -fb.x / 2, -fb.y / 2);

//     ctx.shadowBlur = 0;
//     ctx.globalCompositeOperation = 'destination-out';
//     ctx.drawImage(img, -fb.x / 2, -fb.y / 2);
//     return hi;
// };