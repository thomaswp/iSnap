require('hint-bar-morph');

(function() {
    var superIsNonPartMorph = SyntaxElementMorph.prototype.isNonPartMorph;
    SyntaxElementMorph.prototype.isNonPartMorph = function(block) {
        return superIsNonPartMorph(block) ||
                block instanceof HintBarMorph;
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

BlockMorph.prototype.addSingleHighlight = function() {
    var children = this.children;
    this.children = [];
    var highlight = this.addHighlight();
    children.push(highlight);
    this.children = children;
    this.fullChanged();
    return highlight;
};

// We need block highlights not to intercept pointer events
BlockHighlightMorph.prototype.topMorphAt = function(point) {
    return null;
};