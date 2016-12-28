require('hint-display');

function HighlightDisplay() {
}

HighlightDisplay.prototype = Object.create(HintDisplay.prototype);

HighlightDisplay.prototype.initDisplay = function() {
    this.highlights = [];
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
};

HighlightDisplay.prototype.addHighlight = function(block, color) {
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

    if (data.candidate) {
        var candidate = this.getCode(data.candidate);
        if (!candidate) {
            Trace.logErrorMessage('Unknown candidate for insert hint');
        }
        this.addHighlight(candidate, new Color(255, 255, 0));
    }

    if (data.replacement) {
        this.addHighlight(parent, new Color(255, 0, 255));
    }
};