require('hint-bar-morph');

extend(SyntaxElementMorph, 'isNonPartMorph', function(base, block) {
    return base.call(this, block) ||
        block instanceof HintBarMorph ||
        block instanceof PushButtonMorph;
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

ArgMorph.prototype.mouseEnter = function() {
    if (this.onClick) {
        this.fullHighlight = this.addFullHighlight(new Color(255, 255, 0, 0.7));
        document.body.style.cursor = 'pointer';
    }
};

ArgMorph.prototype.mouseLeave = function() {
    if (this.fullHighlight) {
        this.fullHighlight.destroy();
        this.fullHighlight = null;
        this.fullChanged();
    }
    document.body.style.cursor = 'inherit';
};

ArgMorph.prototype.mouseClickLeft = function(pos) {
    if (this.onClick) {
        this.onClick.call(this);
    }
};

extend(InputSlotMorph, 'mouseClickLeft', function(base, pos) {
    if (this.onClick) {
        InputSlotMorph.uber.mouseClickLeft.call(this, pos);
    } else {
        base.call(this, pos);
    }
});

extend(InputSlotMorph, 'mouseDownLeft', function(base, pos) {
    if (!this.onClick) {
        base.call(this, pos);
    }
});

ArgMorph.prototype.addFullHighlight = function(color) {
    var highlight = new BlockHighlightMorph(),
        fb = this.fullBounds();
    highlight.setExtent(fb.extent());
    highlight.color = color;
    highlight.image = this.highlightImageFull(color);
    highlight.setPosition(fb.origin);
    this.addBack(highlight);
    this.fullChanged();
    return highlight;
};

ArgMorph.prototype.highlightImageFull = function (color) {
    var fb, img, hi, ctx;
    fb = this.fullBounds().extent();
    img = this.fullImage();

    hi = newCanvas(fb);
    ctx = hi.getContext('2d');
    ctx.fillStyle = color.toString();
    ctx.fillRect(0, 0, fb.x, fb.y);

    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, 0, 0);
    return hi;
};