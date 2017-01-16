require('hint-display');
require('hint-highlight-morph');
require('code-hint-dialog-box-morph');
require('message-hint-dialog-box-morph');
require('highlight-dialog-box-morph');

function HighlightDisplay() {
}

HighlightDisplay.prototype = Object.create(HintDisplay.prototype);
HighlightDisplay.constructor = HighlightDisplay;
HighlightDisplay.uber = HintDisplay.prototype;

HighlightDisplay.insertColor = new Color(0, 0, 255);
HighlightDisplay.deleteColor = new Color(255, 0, 0);
HighlightDisplay.moveColor = new Color(255, 255, 0);

HighlightDisplay.TOP_LEFT = 'top-left';
HighlightDisplay.BOTTOM_LEFT = 'bottom-left';
HighlightDisplay.ABOVE = 'above';
HighlightDisplay.RIGHT = 'right';

HighlightDisplay.prototype.initDisplay = function() {
    // Start disabled until the highlight dialog box is shown
    this.enabled = false;
    // Show insert hints (next steps)
    this.showInserts = false;
    // Show a dialog, even if no hints were shown
    this.forceShowDialog = false;
    // Auto-clear the highlights after each edit
    this.autoClear = false;

    this.highlights = [];
    this.insertButtons = [];
    this.hoverHints = [];
    // TODO: handle these somehow
    this.hiddenCustomBlockHintRoots = [];
    this.hiddenInsertHints = 0;

    BlockEditorMorph.defaultHatBlockMargin = new Point(35, 20);

    var myself = this;
    extendObject(Trace, 'onCodeChanged', function(base, code) {
        // Don't show hints after next clear (but don't clear them now)
        if (myself.autoClear && myself.enabled) {
            Trace.log('HighlightDisplay.autoClear');
            myself.enabled = false;
        }
        base.call(this, code);
    });
};

HighlightDisplay.prototype.show = function() {
    var myself = this;
    this.enabled = false;
    this.hintButton = this.addHintButton(localize('Check My Work'), function() {
        Trace.log('HighlightDisplay.checkMyWork');
        myself.forceShowDialog = true;
        HighlightDisplay.startHighlight();
    });
};

HighlightDisplay.prototype.hide = function() {
    this.hintButton.destroy();
    if (HighlightDialogBoxMorph.showing) {
        HighlightDialogBoxMorph.showing.destroy();
    }
    if (HintDialogBoxMorph.showing) {
        HintDialogBoxMorph.showing.destroy();
    }
};

HighlightDisplay.startHighlight = function() {
    Trace.log('HighlightDisplay.startHighlight');
    window.hintProvider.setDisplayEnabled(HighlightDisplay, true);
};

HighlightDisplay.stopHighlight = function(clear) {
    Trace.log('HighlightDisplay.stopHighlight');
    window.hintProvider.setDisplayEnabled(HighlightDisplay, false);
};

HighlightDisplay.prototype.finishedHints = function() {
    var dialogShowing = HighlightDialogBoxMorph.showing &&
            !HighlightDialogBoxMorph.showing.destroyed;
    var hintsShown = this.highlights.length + this.insertButtons.length +
            this.hoverHints.length > 0;
    // If the dialog isn't showing...
    if (!dialogShowing) {
        if (hintsShown) {
            // Show it if and we've shown hints
            new HighlightDialogBoxMorph(window.ide, this.showInserts,
                this.autoClear).popUp();
        } else {
            // Or disable highlights if not
            this.enabled = false;
            // If no hints were shown, but the user clicked the hint button...
            if (this.forceShowDialog) {
                if (this.hiddenInsertHints === 0) {
                    // Tell them no hints are available
                    this.informNoHints();
                } else {
                    // Or show a dialog to confirm they want next-step hints
                    this.promptShowInserts();
                }
            }
        }
    }
    this.forceShowDialog = false;
};

HighlightDisplay.prototype.promptShowInserts = function() {
    var myself = this;
    new DialogBoxMorph(this, function() {
        // If they say yes, show inserts and reshow this
        myself.showInserts = true;
        myself.forceShowDialog = true;
        window.hintProvider.setDisplayEnabled(HighlightDisplay, true);
    }).askYesNo(
        localize('Check Passed'),
        localize (
            'Everything looks good so far. Would you like me to ' +
            'suggest some next steps?'
        ),
        window.world
    );
};

HighlightDisplay.prototype.informNoHints = function() {
    new DialogBoxMorph(this).inform(
        localize('Check Passed'),
        localize('Everything on the screen looks good so far, but remember ' +
            "it's\nup to you to make sure everything works before you submit."),
        window.world
    );
};

HighlightDisplay.prototype.showHint = function(hint) {
    if (!hint.data) return;

    var action = hint.data.action;

    var parent = this.getCode(hint.data.parent);
    if (parent instanceof CustomBlockDefinition) {
        // For hints that are in hiddent custom blocks, we save the
        // parents, but don't show it immediately
        this.hiddenCustomBlockHintRoots.push(parent);
        // Allow insert hints, since the candidate could be outside the block
        this.addCustomBlockHint(parent);
        if (action !== 'insert') return;
    }

    switch (action) {
    case 'delete' : this.showDeleteHint(hint.data); break;
    case 'reorder': this.showReorderHint(hint.data); break;
    case 'insert': this.showInsertHint(hint.data); break;
    }
};

HighlightDisplay.prototype.showError = function(error) {
    if (this.forceShowDialog) {
        new DialogBoxMorph(this).inform(
            localize('Error'),
            localize("We've run into an error checking your work. " +
                'Please let you TA know.'),
            window.world
        );
        this.forceShowDialog = false;
    }
};

HighlightDisplay.prototype.getHintType = function() {
    return 'highlight';
};

HighlightDisplay.prototype.clear = function() {
    var dialogShowing = HighlightDialogBoxMorph.showing &&
            !HighlightDialogBoxMorph.showing.destroyed;
    if (!this.enabled && dialogShowing) {
        HighlightDialogBoxMorph.showing.destroy();
    }

    var toRedraw = [];
    function redraw(block) {
        var parentBlock = block.parentThatIsA(BlockMorph);
        if (block.topBlock) {
            block = block.topBlock();
        } else if (parentBlock && parentBlock.topBlock) {
            block = parentBlock.topBlock();
        }
        if (!toRedraw.includes(block)) toRedraw.push(block);
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
        this.redrawBlock(block);
    }, this);

    this.hoverHints.forEach(function(argMorph) {
        if (argMorph.contents) {
            var contents = argMorph.contents();
            if (contents instanceof StringMorph) {
                contents.isEditable = true;
            }
        }
        argMorph.onClick = null;
    });
    this.hoverHints = [];

    this.hiddenCustomBlockHintRoots = [];
    this.hiddenInsertHints = 0;
};

HighlightDisplay.prototype.addHighlight = function(block, color, single) {
    if (color == HighlightDisplay.insertColor && !this.showInserts) return;
    // It's possible a candidate will be inside a hidden custom block, so just
    // suppress the highlight
    if (block instanceof CustomBlockDefinition) return;
    if (block instanceof MultiArgMorph) {
        block = block.parent;
    }
    if (!(block instanceof SyntaxElementMorph)) {
        Trace.logErrorMessage('Non-highlightable: ' +
            (block ? block.getDebugType() : null));
        return;
    }
    // First come, first highlight
    // TODO: Instead, have highlight priorities, since inserts may add delete
    if (block.getHintHighlight()) {
        // console.log(block, block.getHintHighlight());
        return;
        // block.removeHintHighlight();
    }
    if (single) {
        block.addSingleHintHighlight(color);
    } else {
        block.addHintHighlight(color);
    }
    this.highlights.push(block);
};

HighlightDisplay.prototype.addCustomBlockHint = function(definition) {
    var index = SpriteMorph.prototype.categories.indexOf(definition.category);
    if (index === -1) {
        Trace.logErrorMessage('Unknown custom block category: ' +
            definition.category);
        return;
    }

    // 'other' and 'lists' show up under variables, the last category
    index = Math.min(index, window.ide.categories.children.length - 1);
    var button = window.ide.categories.children[index];
    if (!button) {
        Trace.logErrorMessage('Missing button index: ' + index);
        return;
    }

    if (button.state) {
        // TODO: Add button to custom block
        return;
    }

    this.addInsertButton(button, HighlightDisplay.RIGHT, function() {
        Trace.log('HighlightDisplay.showCustomBlockHintUnderCategory');
        new DialogBoxMorph(this).inform(
            localize('Suggestions for Custom Block'),
            localize(
                'Click the "' + definition.category + '" category to see '
            ),
            window.world
        );
    }, 7);
};

HighlightDisplay.prototype.showDeleteHint = function(data) {
    var node = this.getCode(data.node);
    if (node == null) {
        Trace.logErrorMessage('Unknown node in delete hint');
        return;
    }
    // Ignore variable and literal deletion
    if (data.node.label === 'var' || data.node.label === 'literal') return;
    this.addHighlight(node, HighlightDisplay.deleteColor,
        data.node.label !== 'script');
};

HighlightDisplay.prototype.showReorderHint = function(data) {
    var node = this.getCode(data.node);
    if (node == null) {
        Trace.logErrorMessage('Unknown node in reorder hint');
        return;
    }
    // Don't worry about reordering scripts or literals
    if (data.node.label === 'script' || data.node.label === 'literal') return;
    this.addHighlight(node, HighlightDisplay.moveColor, true);
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
    if (data.candidate && data.candidate.label !== 'literal' &&
            data.candidate.label !== 'var') {
        candidate = this.getCode(data.candidate);
        if (!candidate) {
            Trace.logErrorMessage('Unknown candidate for insert hint');
            return;
        }
        console.log(candidate, data.candidate);
        this.addHighlight(candidate, HighlightDisplay.moveColor, true);
    }

    // We can still highlight candidates for hidden custom blocks, but
    // nothing else
    if (parent instanceof CustomBlockDefinition) return;

    if (data.replacement) {
        var replacement = this.getCode(data.replacement);
        if (replacement) {
            var isSlot = replacement instanceof ArgMorph;
            var color = isSlot ? HighlightDisplay.insertColor :
                    HighlightDisplay.deleteColor;
            this.addHighlight(replacement, color, true);

            if (isSlot) {
                var otherBlocks = [];
                if (candidate) otherBlocks.push(candidate.selector);
                var onClick = this.createBlockHintCallback(true,
                    parent.enclosingBlock(), candidate, data.from, data.to,
                    otherBlocks);
                this.addHoverHint(replacement, onClick);
            }
        } else {
            Trace.logErrorMessage('Unknown replacement in insert hint: ' +
                data.replacement.label);
        }
        return;
    }

    var callback;
    if (data.parent.label === 'script' &&
            !(parent instanceof CustomBlockDefinition)) {
        var fromList = [data.from];
        if (data.candidate) fromList.push([data.candidate.label]);
        callback = this.createScriptHintCallback(true, parent, candidate,
            fromList, data.to);

        var index = data.index;
        // Increase the hint index by 1 if there's a PrototypeHatBlock
        if (parent instanceof PrototypeHatBlockMorph) index++;

        if (index === 0) {
            this.addInsertButton(parent, HighlightDisplay.TOP_LEFT, callback);
        } else {
            if (parent instanceof CSlotMorph) parent = parent.children[0];
            var precedingBlock = parent;
            for (var i = 0; i < index - 1 && precedingBlock != null; i++) {
                precedingBlock = precedingBlock.nextBlock();
            }
            this.addInsertButton(precedingBlock, HighlightDisplay.BOTTOM_LEFT,
                callback);
        }
    } else if (data.parent.label === 'customBlock' &&
            parent instanceof ScriptsMorph) {
        var message = localize(
            'You probably need another input for this block. ' +
            'Add one with the plus button below.'
        );
        callback = this.createStructureHintCallback(true, parent, message,
            data.from, data.to);
        this.addPlusHintButton(parent, callback);
    } else {
        // console.log(data.parent.label);
        // TODO: handle list inserts, which won't be in scripts
        // along with structure hints like snapshot parents and hidden
        // custom block hints
    }
};

HighlightDisplay.prototype.addHoverHint = function(argMorph, onClick) {
    if (!(argMorph instanceof ArgMorph)) return;
    if (!this.showInserts) {
        this.hiddenInsertHints++;
    }

    if (argMorph.contents) {
        var contents = argMorph.contents();
        if (contents instanceof StringMorph) {
            contents.isEditable = false;
        }
    }
    argMorph.onClick = onClick;

    this.hoverHints.push(argMorph);
};

HighlightDisplay.prototype.addInsertButton =
function(block, attachPoint, callback, size) {
    if (!instanceOfAny(block, [BlockMorph, CSlotMorph,
            BlockLabelPlaceHolderMorph, PushButtonMorph]))  {
        Trace.logErrorMessage('Non-insertable morph: ' +
            (block ? block.getDebugType() : null));
        return;
    }
    if (!this.showInserts) {
        this.hiddenInsertHints++;
        return;
    }

    // We use CSlotMorphs for positioning, but for consistency, we only use
    // blocks as parents
    var positionMorph = block;
    if (block instanceof CSlotMorph) block = block.parent;

    // Don't allow duplicate insert buttons in the same position
    if (this.insertButtons.some(function(button) {
        return button.positionMorph == positionMorph &&
            button.attachPoint == attachPoint;
    })) {
        return;
    }

    var button = this.createInsertButton(
            block, positionMorph, callback, attachPoint, size);
    this.insertButtons.push(button);
};

HighlightDisplay.prototype.createInsertButton =
function(parent, positionMorph, callback, attachPoint, size) {
    size = size || 10;
    var button = new PushButtonMorph(parent, callback,
        new SymbolMorph('plus', size));
    button.labelColor = HighlightDisplay.insertColor;
    button.positionMorph = positionMorph;
    button.attachPoint = attachPoint;
    button.float = true;

    layout = function(button) {
        var pMorph = button.positionMorph;
        var padding = 3;
        if (button.attachPoint === HighlightDisplay.TOP_LEFT) {
            button.setRight(pMorph.left() - padding);
            button.setTop(pMorph.top() - button.height() / 2);
        } else if (button.attachPoint === HighlightDisplay.BOTTOM_LEFT) {
            button.setRight(pMorph.left() - padding);
            button.setTop(pMorph.bottom() - button.height() / 2);
        } else if (button.attachPoint === HighlightDisplay.ABOVE) {
            button.setCenter(pMorph.center());
            button.setBottom(pMorph.top() - padding);
        } else if (button.attachPoint === HighlightDisplay.RIGHT) {
            button.setCenter(pMorph.center());
            // HACK: the RIGHT position is only used by category blocks, and
            // they cutoff the button if it's set full to the right
            button.setLeft(pMorph.right() - 3 * padding);
        }
        else {
            Trace.logErrorMessage('Unknown insert button attachPoint: ' +
                button.attachPoint);
        }
        button.fixLayout();
    };

    var layoutBlock = parent;
    while (!layoutBlock.fixLayout) layoutBlock = layoutBlock.parent;
    var oldFixLayout = layoutBlock.fixLayout;
    layoutBlock.fixLayout = function() {
        oldFixLayout.apply(this, arguments);
        layout(button);
    };

    parent.add(button);
    layoutBlock.fixLayout();
    return button;
};

HighlightDisplay.prototype.addPlusHintButton = function(parent, callback) {
    var prototypeHBM = parent.children[0];
    if (!(prototypeHBM instanceof PrototypeHatBlockMorph)) return;
    var customCBM = prototypeHBM.children[0];
    if (!(customCBM instanceof CustomCommandBlockMorph)) return;
    var pluses = customCBM.children.filter(function (child) {
        return child instanceof BlockLabelPlaceHolderMorph;
    });
    var lastPlus = pluses[pluses.length - 1];
    if (!lastPlus) return;
    this.addInsertButton(lastPlus, HighlightDisplay.ABOVE, callback);
};