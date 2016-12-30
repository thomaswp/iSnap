
// HintDisplay: outputs hitns to the console

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
    if (parent == null || parent._debugType == 'CustomBlockDefinition') {
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

// For a script (top block of CSlot), finds the enclosing block, or null
HintDisplay.prototype.getEnclosingBlock = function(block) {
    block = block.parent;
    if (block && block.enclosingBlock) return block.enclosingBlock();
    else return null;
};

// For a script, finds the index of the script in the enclosing block
HintDisplay.prototype.getScriptIndex = function(script, enclosingBlock) {
    var index = 0;
    if (enclosingBlock && enclosingBlock != script && enclosingBlock.inputs) {
        index = enclosingBlock.inputs().indexOf(script);
        if (index == -1) {
            Trace.logErrorMessage('Bad hint index!');
            index = 0;
        }
    }
    return index;
};