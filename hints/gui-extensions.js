require('hint-bar-morph');
require('hint-highlight-morph');

extend(SyntaxElementMorph, 'isNonPartMorph', function(base, block) {
    return base.call(this, block) ||
        block instanceof HintBarMorph ||
        block instanceof HintHighlightMorph ||
        block instanceof PushButtonMorph;
});

extend(Morph, 'fullBounds', function(base) {
    var result;
    result = this.bounds;
    this.children.forEach(function (child) {
        // Don't use "floating" children in fullBounds calculation
        if (child.isVisible && !child.float) {
            result = result.merge(child.fullBounds());
        }
    });
    return result;
});

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

// We need block highlights not to intercept pointer events
BlockHighlightMorph.prototype.topMorphAt = function(point) {
    return null;
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

BlockMorph.prototype.disable = function() {
    noop = function() { return null; };
    this.userMenu = noop;
    this.allChildren().filter(
        function (child) {
            return child instanceof InputSlotMorph ||
                child instanceof StringMorph;
        }).forEach(function(child) {
            child.mouseClickLeft = noop;
            child.mouseDownLeft = noop;
        });
};

extend(IDE_Morph, 'createControlBar', function(baseCreate) {
    baseCreate.call(this);
    var myself = this;
    extendObject(this.controlBar, 'updateLabel', function(base) {
        base.call(this);
        if (myself.isAppMode) return;
        if (!window.assignmentID || !window.assignments) return;
        var assignment = window.assignments[window.assignmentID];
        var text = assignment.name;

        this.label.text += ' - ' + text;
        this.label.parent = null;
        this.label.drawNew();
        this.label.parent = this;

        this.label.mouseEnter = function() {
            document.body.style.cursor = 'pointer';
        };

        this.label.mouseLeave = function() {
            document.body.style.cursor = 'inherit';
        };
    });
});