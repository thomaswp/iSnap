
function HintHighlightMorph() {
    this.init();
}

HintHighlightMorph.prototype = new Morph();
HintHighlightMorph.prototype.constructor = HintHighlightMorph;
HintHighlightMorph.uber = Morph.prototype;

HintHighlightMorph.prototype.topMorphAt = function(point) {
    return null;
};

SyntaxElementMorph.prototype.highlightImage =
    BlockMorph.prototype.highlightImage;

SyntaxElementMorph.prototype.addHintHighlight = function(color) {
    var isHidden = !this.isVisible,
        highlight;

    if (isHidden) {this.show(); }
    // Before adding, remove any normal block highlights
    var children = this.children;
    this.children = this.children.filter(function(child) {
        return !(child instanceof BlockHighlightMorph);
    });
    highlight = this.hintHighlight(color, 2);
    // After highlighting, manually add the morph and reset the children
    children.push(highlight);
    this.children = children;
    this.fullChanged();
    if (isHidden) {this.hide(); }
    return highlight;
};

SyntaxElementMorph.prototype.addSingleHintHighlight = function(color) {
    color = color || this.activeHighlight;
    var children = this.children;
    this.children = [];
    var highlight = this.addHintHighlight(color);
    children.push(highlight);
    this.children = children;
    this.fullChanged();
    return highlight;
};

SyntaxElementMorph.prototype.removeHintHighlight = function () {
    var highlight = this.getHintHighlight();
    if (highlight !== null) {
        this.fullChanged();
        this.removeChild(highlight);
    }
    return highlight;
};

SyntaxElementMorph.prototype.hintHighlight = function (color, border) {
    var highlight = new HintHighlightMorph(),
        fb = this.fullBounds();
    highlight.setExtent(fb.extent().add(border * 2));
    highlight.color = color;
    highlight.image = this.highlightImage(color, border);
    highlight.setPosition(fb.origin.subtract(new Point(border, border)));
    highlight.parent = this;
    return highlight;
};

SyntaxElementMorph.prototype.getHintHighlight = function () {
    var highlights;
    highlights = this.children.slice(0).reverse().filter(
        function (child) {
            return child instanceof HintHighlightMorph;
        }
    );
    if (highlights.length !== 0) {
        return highlights[0];
    }
    return null;
};

extend(SyntaxElementMorph, 'fixHighlight', function(base) {
    base.call(this);
    var oldHighlight = this.removeHintHighlight();
    if (oldHighlight) this.addHintHighlight(oldHighlight.color);
});

extend(SyntaxElementMorph, 'copy', function(base) {
    var copy = base.call(this);
    setTimeout(function() {
        copy.removeHintHighlight();
        copy.cachedFullImage = null;
        copy.cachedFullBounds = null;
    });
    return copy;
});

ArgMorph.prototype.addFullHintHighlight = function(color) {
    var highlight = new HintHighlightMorph(),
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

ArgMorph.prototype.mouseEnter = function() {
    if (this.onClick) {
        this.fullHighlight =
			this.addFullHintHighlight(new Color(255, 255, 0, 0.7));
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

extend(InputSlotMorph, 'fixLayout', function(base) {
    base.call(this);
    var contents = this.contents();
    if (contents) {
        contents.isEditable = contents.isEditable && this.onClick == null;
    }
});

extend(BooleanSlotMorph, 'mouseEnter', function(base) {
    BooleanSlotMorph.uber.mouseEnter.call(this);
    if (!this.onClick) base.call(this);
});

extend(BooleanSlotMorph, 'mouseLeave', function(base) {
    BooleanSlotMorph.uber.mouseLeave.call(this);
    // Call the base either way, since we may need to remove the toggle
    base.call(this);
});

extend(BooleanSlotMorph, 'mouseClickLeft', function(base) {
    BooleanSlotMorph.uber.mouseClickLeft.call(this);
    if (!this.onClick) base.call(this);
});
