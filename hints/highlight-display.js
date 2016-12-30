require('hint-display');
require('code-hint-dialog-box-morph');
require('message-hint-dialog-box-morph');

function HighlightDisplay() {
}

HighlightDisplay.prototype = Object.create(HintDisplay.prototype);

HighlightDisplay.prototype.initDisplay = function() {
    this.highlights = [];
    this.insertButtons = [];
    this.hoverHints = [];
};

HighlightDisplay.prototype.showHint = function(hint) {
    if (!hint.data) return;
    var action = hint.data.action;
    switch (action) {
    case 'delete' : this.showDeleteHint(hint.data); break;
    case 'reorder': this.showReorderHint(hint.data); break;
    case 'insert': this.showInsertHint(hint.data); break;
    }
};

HighlightDisplay.prototype.showError = function(error) {

};

HighlightDisplay.prototype.clear = function() {
    var toRedraw = [];
    function redraw(block) {
        var topBlock = block.topBlock();
        if (!toRedraw.includes(topBlock)) toRedraw.push(topBlock);
    }
    this.highlights.forEach(function(block) {
        block.removeHighlight();
        redraw(block);
    });
    this.highlights = [];

    this.insertButtons.forEach(function(button) {
        button.destroy();
        button.parent.insertButtonBefore = null;
        button.parent.insertButtonAfter = null;
        redraw(button.parent);
    });
    toRedraw.forEach(function(block) {
        this.redrawBlock(block);
    }, this);
    this.insertButtons = [];

    this.hoverHints.forEach(function(argMorph) {
        if (argMorph.contents) {
            var contents = argMorph.contents();
            if (contents instanceof StringMorph) {
                contents.isEditable = false;
            }
        }
        argMorph.onClick = null;
    });
    this.hoverHints = [];
};

HighlightDisplay.prototype.addHighlight = function(block, color) {
    if (block instanceof MultiArgMorph) {
        block = block.parent;
    }
    if (!(block.removeHighlight && block.addSingleHighlight)) {
        Trace.logErrorMessage('Non-highlightable: ' + block);
        return;
    }
    if (block.getHighlight()) {
        // console.log(block, block.getHighlight());
        return;
    }
    useBlurredShadows = false;
    var border = block.activeBorder;
    block.activeBorder = 2;
    block.addSingleHighlight(color);
    block.activeBorder = border;
    useBlurredShadows = true;
    this.highlights.push(block);
};

HighlightDisplay.prototype.showDeleteHint = function(data) {
    var node = this.getCode(data.node);
    if (node == null) {
        Trace.logErrorMessage('Unknown node in delete hint');
        return;
    }
    this.addHighlight(node, new Color(255, 0, 0));
};

HighlightDisplay.prototype.showReorderHint = function(data) {
    var node = this.getCode(data.node);
    if (node == null) {
        Trace.logErrorMessage('Unknown node in reorder hint');
        return;
    }
    // Don't worry about reordering scripts;
    if (data.node.label === 'script') return;
    this.addHighlight(node, new Color(255, 255, 0));
};

HighlightDisplay.prototype.showInsertHint = function(data) {
    var parent = this.getCode(data.parent);
    if (parent == null) {
        Trace.logErrorMessage('Unknown parent in insert hint');
        return;
    }
    // Don't worry about inserting scripts;
    if (data.type === 'script') return;

    var candidate = null;
    if (data.candidate) {
        candidate = this.getCode(data.candidate);
        if (!candidate) {
            Trace.logErrorMessage('Unknown candidate for insert hint');
            return;
        }
        this.addHighlight(candidate, new Color(255, 255, 0));
    }

    var selector;
    if (data.replacement) {
        var replacement = this.getCode(data.replacement);
        if (replacement) {
            var color = replacement instanceof BlockMorph ?
                    new Color(255, 0, 0) : new Color(0, 0, 255);
            this.addHighlight(replacement, color);
            selector = parent.enclosingBlock().selector;
            var otherBlocks = [];
            if (candidate) otherBlocks.push(candidate.selector);
            var onClick = function() {
                new CodeHintDialogBoxMorph(window.ide)
                    .showBlockHint(selector, data.from, data.to, otherBlocks);
            };

            this.addHoverHint(replacement, onClick);
        } else {
            Trace.logErrorMessage('Unknown replacement in insert hint');
        }
        return;
    }

    if (data.parent.label === 'script') {
        var enclosingBlock = this.getEnclosingBlock(parent);
        selector = enclosingBlock ? enclosingBlock.selector : null;
        var index = this.getScriptIndex(parent, enclosingBlock);
        var fromList = [data.from];
        if (data.candidate) fromList.push([data.candidate.label]);
        var to = data.to;
        var callback = function() {
            new CodeHintDialogBoxMorph(window.ide)
                .showScriptHint(selector, index, fromList, to);
        };

        if (data.index === 0) {
            this.addInsertButton(parent, true, callback);
        } else {
            if (parent instanceof CSlotMorph) parent = parent.children[0];
            var precedingBlock = parent;
            for (var i = 0; i < data.index - 1 && precedingBlock != null; i++) {
                precedingBlock = precedingBlock.nextBlock();
            }
            this.addInsertButton(precedingBlock, false, callback);
        }
    } else {
        // console.log(data.parent.label);
        // TODO: handle list inserts, which won't be in scripts
        // along with structure hints like snapshot parents
    }
};

HighlightDisplay.prototype.addHoverHint = function(argMorph, onClick) {
    if (!(argMorph instanceof ArgMorph)) return;

    if (argMorph.contents) {
        var contents = argMorph.contents();
        if (contents instanceof StringMorph) {
            contents.isEditable = false;
        }
    }
    argMorph.onClick = onClick;

    this.hoverHints.push(argMorph);
};

HighlightDisplay.prototype.addInsertButton = function(block, before, callback) {
    if (!(block instanceof BlockMorph || block instanceof CSlotMorph)) {
        Trace.logErrorMessage('Non-insertable morph: ' + block);
        return;
    }

    var buttonVar = 'insertButton' + (before ? 'Before' : 'After');
    if (block[buttonVar]) return;

    var button = block[buttonVar] = new PushButtonMorph(block, callback,
        new SymbolMorph('plus', 10));
    button.labelColor = new Color(0, 0, 255);
    this.insertButtons.push(button);

    layout = function(block, button, before) {
        button.setRight(block.left() - 3);
        button.setTop((before ? block.top() : block.bottom()) -
                button.height() / 2);
        button.fixLayout();
    };

    var oldFixLayout = block.fixLayout;
    block.fixLayout = function() {
        oldFixLayout.apply(this, arguments);
        if (this.insertButtonBefore) {
            layout(this, this.insertButtonBefore, true);
        }
        if (this.insertButtonAfter) {
            layout(this, this.insertButtonAfter, false);
        }
    };

    block.add(button);

    // Delay the layout to prevent it from behaving improperly
    // for reasons I don't fully understand
    setTimeout(function() {
        block.fixLayout();
    });
};