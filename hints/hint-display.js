
// HintDisplay: outputs hitns to the console

require('code-hint-dialog-box-morph');

function HintDisplay() { }

HintDisplay.prototype.showHint = function(hint) {
    // eslint-disable-next-line no-console
    console.log(hint.from + ' -> ' + hint.to);
};

HintDisplay.prototype.showError = function(error) {
    // eslint-disable-next-line no-console
    console.error(error);
};

HintDisplay.prototype.clear = function() {
    // eslint-disable-next-line no-console
    console.log('-----------------------------------------');
};

HintDisplay.prototype.finishedHints = function() {

};

HintDisplay.prototype.showLoggedHint = function(data) {

};

HintDisplay.prototype.getHintType = function() {
    return '';
};

HintDisplay.prototype.hasCustomBlock = function(ref) {
    if (!ref) return false;
    return ref.label == 'customBlock' || this.hasCustomBlock(ref.parent);
};

// Gets the showing/editing version of a customBlock, or returns null if
// it is not currently being edited, since we can only generate hints for a
// showing/editing custom block
HintDisplay.prototype.editingCustomBlock = function(storedBlocks, index) {
    var storedBlock = storedBlocks.filter(function(block) {
        return !block.isImported;
    })[index];
    if (!storedBlock) return null;
    var showing = BlockEditorMorph.showing;
    if (storedBlock && showing && showing.definition &&
            showing.definition.guid == storedBlock.guid) {
        var scriptsMorph = BlockEditorMorph.showing.allChildren().filter(
            function (child) {
                return child instanceof ScriptsMorph;
            })[0];
        return scriptsMorph;
    }
    storedBlock._debugType = storedBlock.getDebugType();
    return storedBlock;
};

HintDisplay.prototype.getCode = function(ref) {
    if (ref.parent == null) {
        return window.ide;
    }

    var parent = this.getCode(ref.parent);
    // If this is a non-showing custom block, we should just return it to show
    // a special hint
    if (parent == null || parent instanceof CustomBlockDefinition) {
        return parent;
    }

    var label = ref.label;
    var index = ref.index;

    switch (ref.parent.label) {
    case 'snapshot':
        if (label == 'stage')
            return parent.stage;
        else if (label == 'customBlock')
            return this.editingCustomBlock(parent.stage.globalBlocks,
                index - 1);
        else if (label == 'var')
            return parent.globalVariables.vars;
        break;
    case 'stage':
        if (label == 'sprite') {
            return parent.children.filter(function(child) {
                return child instanceof SpriteMorph;
            })[index];
        }
    case 'sprite':
        var nVars = Object.keys(parent.variables.vars).length;
        var nScripts = parent.scripts.children.length;
        if (label == 'var')
            return parent.variables.vars;
        else if (label == 'script')
            return parent.scripts.children[index - nVars];
        else if (label == 'customBlock')
            return this.editingCustomBlock(parent.customBlocks,
                index - nVars - nScripts);
        break;
    case 'script':
        var block = parent;
        if (block instanceof CSlotMorph) block = block.children[0];
        if (ref.parent.parent && ref.parent.parent.label == 'customBlock') {
            // Scripts in a custom block must skip one extra because the
            // first block is the header CustomHatBlock.
            block = block.nextBlock();
        }
        for (var i = 0; i < index; i++) block = block.nextBlock();
        return block;
    case 'customBlock':
        // We should only generate hints for the primary script in a custom
        // block
        if (ref.index > 0 || label != 'script' || !parent.children.length) {
            return null;
        }
        // If we manage to get a hold of it, we return the first script
        return parent.children[0];
    default:
        return parent.inputs()[index];
    }
};

HintDisplay.prototype.redrawBlock = function(block) {
    if (!block) return;
    if (block.getShadow) {
        if (block.getShadow()) {
            block.removeShadow();
            block.addShadow();
        }
    }
    if (block.cachedFullBounds) {
        block.cachedFullBounds = block.fullBounds();
    }
    if (block.cachedFullImage) {
        block.cachedFullImage = null;
        block.cachedFullImage = block.fullImageClassic();
    }
};

// For a script (top block or CSlot), finds the enclosing block, or null
HintDisplay.prototype.getEnclosingParentBlock = function(block) {
    block = block.parent;
    if (block && block.enclosingBlock) return block.enclosingBlock();
    else return null;
};

// For a script, finds the index of the script in the enclosing block
HintDisplay.prototype.getScriptIndex = function(script, enclosingBlock) {
    var index = -1;
    if (enclosingBlock && enclosingBlock != script && enclosingBlock.inputs) {
        index = enclosingBlock.inputs().indexOf(script);
        if (index == -1) {
            Trace.logErrorMessage('Bad hint index!');
            index = 0;
        }
    }
    return index;
};

/**
 * Creates a function for logging and showing a script hint.
 *
 * @this HintDisplay
 * @param {bool} simple Whether or not the CodeHintDialogBoxMorph should display
 * simple UI, or display the full rating UI.
 * @param {SyntaxElementMorph} root The node whose children are being edited
 * @param {BlockMorph} extraRoot Another block or script which is also being
 * displayed as part of the hint.
 * @param {string[][]} fromList An array of string arrays, each of which are
 * displayed as scripts on the from side of the script hint. The first is
 * the script to be edited, and an additional array is optional.
 * @param {string[]} to An array of selectors which are displayed as a script
 * on the to side of the script hint.
 * @param {function} onThumbsDown Optional callback to be called if the hint is
 * rated with a thumbs down.
 */
HintDisplay.prototype.createScriptHintCallback = function(simple, root,
        extraRoot, fromList, to, onThumbsDown) {

    if (root instanceof PrototypeHatBlockMorph) {
        fromList[0].unshift('prototypeHatBlock');
        to.unshift('prototypeHatBlock');
    }

    // For logging, we find the parent block this script is inside of, or null
    var enclosingBlock = this.getEnclosingParentBlock(root);

    // If applicable, find the index of this script in it's parent (e.g. IfElse)
    var index = this.getScriptIndex(root, enclosingBlock);

    var rootID = root ? root.id : null;
    var extraRootID = extraRoot ? extraRoot.id : null;
    var parentSelector = enclosingBlock ? enclosingBlock.selector : null;
    var parentID = enclosingBlock ? enclosingBlock.id : null;

    var data = {
        // For unnested scripts, the ID of the first block in the edited script
        'rootID': rootID,
        // The ID of the block or script also being shown with this hint.
        // In the case of LinkHints, this is the block on which the hint was
        // displayed.
        'extraRootID': extraRootID,
        // For nested scripts, the selector of the parent holding the script
        'parentSelector': parentSelector,
        // For nested scripts, the ID of the parent block holding the script
        'parentID': parentID,
        // For nested scripts, the index of the root script inside the parent
        'index': index,
        // An array containing first an array of selectors for the from side
        // and second an array of selectors from the extraRoot, if any
        'fromList': fromList,
        // An array containing the selectors on the to side of the hint
        'to': to,
    };

    return function() {
        Trace.log('SnapDisplay.showScriptHint', data);
        new CodeHintDialogBoxMorph(window.ide, simple)
            .showScriptHint(parentSelector, index, fromList, to)
            .onThumbsDown(onThumbsDown);
    };
};

/**
 * Creates a function for logging and showing a block hint.
 *
 * @this HintDisplay
 * @param {bool} simple Whether or not the CodeHintDialogBoxMorph should display
 * simple UI, or display the full rating UI.
 * @param {SyntaxElementMorph} root The node whose children are being edited
 * @param {BlockMorph} extraRoot Another block or script which is also being
 * displayed as part of the hint.
 * @param {string[]} from An array of selectors which are displayed as arguments
 * on the from side of the block hint.
 * @param {string[]} to An array of selectors which are displayed as arguments
 * on the to side of the script hint.
 * @param {string[]} otherBlocks An array of selectors which are also displayed
 * as a script on the from side of the script.
 * @param {function} onThumbsDown Optional callback to be called if the hint is
 * rated with a thumbs down.
 */
HintDisplay.prototype.createBlockHintCallback = function(simple, root,
        extraRoot, from, to, otherBlocks, onThumbsDown) {

    var enclosingBlock = root.enclosingBlock();
    var selector = enclosingBlock ? enclosingBlock.selector : null;
    var parentID = enclosingBlock ? enclosingBlock.id : null;
    var extraRootID = extraRoot ? extraRoot.id : null;
    var data = {
        // The selector of the block whose arguments are being edited
        'parentSelector': selector,
        // The ID of the block whose arguments are being edited
        'parentID': parentID,
        // The ID of any additional script being displayed on the from side.
        // In the case of LinkHints, this is the block on which the hint was
        // displayed.
        'extraRootID': extraRootID,
        // An array of selectors being shown as arguments on the from side
        'from': from,
        // An array of selectors being shown as arguments on the to side
        'to': to,
        // An array of selectors from the extraRoot, if any, shown on the from
        // side as a script
        'otherBlocks': otherBlocks,
    };

    return function() {
        Trace.log('SnapDisplay.showBlockHint', data);
        new CodeHintDialogBoxMorph(window.ide, simple)
            .showBlockHint(selector, from, to, otherBlocks)
            .onThumbsDown(onThumbsDown);
    };
};