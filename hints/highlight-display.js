require('hint-display');
require('hint-highlight-morph');
require('code-hint-dialog-box-morph');
require('message-hint-dialog-box-morph');

function HighlightDisplay() {
}

HighlightDisplay.prototype = Object.create(HintDisplay.prototype);

HighlightDisplay.prototype.initDisplay = function() {
    this.highlights = [];
    this.insertButtons = [];
    this.hoverHints = [];
    BlockEditorMorph.defaultHatBlockMargin = new Point(35, 20);
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
        block.removeHintHighlight();
        redraw(block);
    });
    this.highlights = [];

    this.insertButtons.forEach(function(button) {
        button.destroy();
        redraw(button.parent);
    });
    this.insertButtons = [];

    toRedraw.forEach(function(block) {
        block.removeHighlight();
        this.redrawBlock(block);
    }, this);

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
    if (!(block instanceof SyntaxElementMorph)) {
        Trace.logErrorMessage('Non-highlightable: ' +
            (block ? block.getDebugType() : null));
        return;
    }
    // First come, first highlight
    if (block.getHintHighlight()) {
        // console.log(block, block.getHighlight());
        return;
    }
    // TODO: For scripts, not just a single highlight
    block.addSingleHintHighlight(color);
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
    if (data.candidate && data.candidate.label != 'literal') {
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

    if (data.parent.label === 'script' &&
            !(parent instanceof CustomBlockDefinition)) {
        var enclosingBlock = this.getEnclosingBlock(parent);
        selector = enclosingBlock ? enclosingBlock.selector : null;
        var parentIndex = this.getScriptIndex(parent, enclosingBlock);
        var fromList = [data.from];
        if (data.candidate) fromList.push([data.candidate.label]);
        var to = data.to;
        // Add a dummy hat block for custom block script hints
        if (parent instanceof PrototypeHatBlockMorph) {
            fromList[0].unshift('prototypeHatBlock');
            to.unshift('prototypeHatBlock');
        }
        var callback = function() {
            new CodeHintDialogBoxMorph(window.ide)
                .showScriptHint(selector, parentIndex, fromList, to);
        };

        var index = data.index;
        // Increase the hint index by 1 if there's a PrototypeHatBlock
        if (parent instanceof PrototypeHatBlockMorph) index++;

        if (index === 0) {
            this.addInsertButton(parent, before, callback);
        } else {
            if (parent instanceof CSlotMorph) parent = parent.children[0];
            var precedingBlock = parent;
            for (var i = 0; i < index - 1 && precedingBlock != null; i++) {
                precedingBlock = precedingBlock.nextBlock();
            }
            this.addInsertButton(precedingBlock, false, callback);
        }
    } else {
        // console.log(data.parent.label);
        // TODO: handle list inserts, which won't be in scripts
        // along with structure hints like snapshot parents and hidden
        // custom block hints
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
        Trace.logErrorMessage('Non-insertable morph: ' +
            (block ? block.getDebugType() : null));
        return;
    }

    // We use CSlotMorphs for positioning, but for consistency, we only use
    // blocks as parents
    var positionMorph = block;
    if (block instanceof CSlotMorph) block = block.parent;

    // Don't allow duplicate insert buttons in the same position
    if (this.insertButtons.some(function(button) {
        return button.positionMorph == positionMorph && button.before == before;
    })) {
        return;
    }

    var button = new PushButtonMorph(block, callback,
        new SymbolMorph('plus', 10));
    button.labelColor = new Color(0, 0, 255);
    button.positionMorph = positionMorph;
    button.before = before;
    button.float = true;
    this.insertButtons.push(button);

    layout = function(button) {
        var block = button.positionMorph;
        button.setRight(block.left() - 3);
        button.setTop((button.before ? block.top() : block.bottom()) -
                button.height() / 2);
        button.fixLayout();
    };

    var oldFixLayout = block.fixLayout;
    block.fixLayout = function() {
        oldFixLayout.apply(this, arguments);
        layout(button);
    };

    block.add(button);
    block.fixLayout();
};