require('hint-display');

function HighlightDisplay() {
}

HighlightDisplay.prototype = Object.create(HintDisplay.prototype);

HighlightDisplay.prototype.initDisplay = function() {
    this.highlights = [];
    this.insertButtons = [];
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
    this.highlights.forEach(function(block) {
        block.removeHighlight();
    });
    this.highlights = [];
    this.insertButtons.forEach(function(button) {
        button.destroy();
        button.parent.insertButtonBefore = null;
        button.parent.insertButtonAfter = null;
    });
    this.insertButtons = [];
};

HighlightDisplay.prototype.addHighlight = function(block, color) {
    if (block instanceof MultiArgMorph) {
        block = block.parent;
    }
    if (!(block.removeHighlight && block.addSingleHighlight)) {
        console.log('Non-highlightable: ', block);
        console.trace();
        return;
    }
    block.removeHighlight();
    block.addSingleHighlight(color);
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

    if (data.replacement) {
        // TODO: Highlight input slot, not whole parent block
        this.addHighlight(parent, new Color(0, 0, 255));
        return;
    }

    // console.log(data);
    if (data.candidate) {
        var candidate = this.getCode(data.candidate);
        if (!candidate) {
            Trace.logErrorMessage('Unknown candidate for insert hint');
            return;
        }
        this.addHighlight(candidate, new Color(255, 255, 0));
    }

    if (data.parent.label === 'script') {
        if (data.index === 0) {
            this.addInsertButton(parent, true);
        } else {
            var precedingBlock = parent;
            for (var i = 0; i < data.index - 1; i++) {
                precedingBlock = precedingBlock.nextBlock();
            }
            this.addInsertButton(precedingBlock);
        }
    } else {
        // console.log(data.parent.label);
        // TODO: handle list inserts, which won't be in scripts
        // along with structure hints like snapshot parents
    }
};

HighlightDisplay.prototype.addInsertButton = function(block, before) {

    var buttonVar = 'insertButton' + (before ? 'Before' : 'After');
    console.log(buttonVar);
    if (block[buttonVar]) return;

    console.log('insert', block);

    var button = block[buttonVar] = new PushButtonMorph(block, null,
        new SymbolMorph('speechBubble', 11));
    button.labelColor = new Color(0, 0, 255);
    this.insertButtons.push(button);

    block.add(button);
    button.setRight(block.left() - 5);
    button.setTop((before ? block.top() : block.bottom()) -
            button.height() / 2);
    button.fixLayout();

    // TODO: fix dragging blur and layout issues
};