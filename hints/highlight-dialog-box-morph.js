require('gui-extensions');

function HighlightDialogBoxMorph(target) {
    this.init(target);
}

HighlightDialogBoxMorph.prototype = Object.create(DialogBoxMorph.prototype);
HighlightDialogBoxMorph.constructor = HighlightDialogBoxMorph;
HighlightDialogBoxMorph.uber = DialogBoxMorph.prototype;

HighlightDialogBoxMorph.prototype.init = function(target) {
    HighlightDialogBoxMorph.uber.init.call(this, target, null, target);

    this.key = 'highlightDialog';
    this.addButton('ok', localize('OK'));

    this.labelString = 'Checking your Work';
    this.createLabel();

    var body = new AlignmentMorph('column', this.padding);
    body.alignment = 'left';

    var fontSize = 14;
    var width = 420;
    function addText(text, bold, parent) {
        var textMorph = new TextMorph(localize(text), fontSize,
            null, bold, null, null, width);
        textMorph.drawNew();
        (parent || body).add(textMorph);
        return textMorph;
    }

    function createBlock(selector, highlightColor) {
        var block = SpriteMorph.prototype.blockForSelector(selector, true);
        if (highlightColor) block.addSingleHintHighlight(highlightColor);
        block.disable();
        return block;
    }

    function addBlock(selector, highlightColor, parent) {
        var block = createBlock(selector, highlightColor);
        (parent || body).add(block);
        return block;
    }

    function addBlockWithInput(parentSelector, childSelector, childIndex,
        childHighlightColor, parent) {
        var parentBlock = addBlock(parentSelector, null, parent || body);
        var childBlock = createBlock(childSelector, childHighlightColor);
        parentBlock.silentReplaceInput(parentBlock.inputs()[childIndex],
            childBlock);
    }

    addText(
        "I'm checking your work against previous students' solutions...",
        true
    );

    addText(
        "\nRED highlighted blocks probably doesn't belong in the solution:"
    );
    addBlock('doSayFor', HighlightDisplay.deleteColor);

    addText(
        '\nYELLOW highlighted blocks are probably part of ' +
        'the soltion, but need to be moved or reordered:'
    );
    var moveBlocks = new AlignmentMorph('row', this.padding);
    addBlock('forward', HighlightDisplay.moveColor, moveBlocks);
    addBlockWithInput('doSayFor', 'getLastAnswer', 0,
        HighlightDisplay.moveColor, moveBlocks);
    moveBlocks.fixLayout();
    body.add(moveBlocks);

    var insertFrame = new AlignmentMorph('column', this.padding);
    insertFrame.alignment = 'left';

    addText(
        '\nBLUE highlighted inputs probably need a new block added to them. ' +
        'Click on the input to get a suggestion.',
        null, insertFrame
    );
    var parentBlock = addBlock('reportEquals', null, insertFrame);
    parentBlock.inputs()[0].addSingleHintHighlight(
        HighlightDisplay.insertColor);

    addText(
        'BLUE [+] buttons will appear where you probably need to add a new ' +
        'block to a script. Click on the button for a suggestion.',
        null, insertFrame
    );
    var hatBlock = addBlock('receiveGo', null, insertFrame);
    hatBlock.nextBlock(createBlock('doSayFor'));
    HighlightDisplay.prototype.createInsertButton(
        hatBlock, hatBlock, function() { }, false);

    insertFrame.fixLayout();
    hatBlock.setLeft(hatBlock.left() + 30);
    body.add(insertFrame);


    body.fixLayout();
    this.addBody(body);
    body.drawNew();
};

HighlightDialogBoxMorph.prototype.destroy = function() {
    HighlightDialogBoxMorph.uber.destroy.call(this);
    this.destroyed = true;
};

HighlightDialogBoxMorph.prototype.popUp = function() {
    var world = this.target.world();
    if (!world) return;

    // Defer to an existing dialog if one exists
    var showing = HighlightDialogBoxMorph.showing;
    if (showing && !showing.destroyed) {
        return;
    }

    this.fixLayout();
    this.drawNew();
    HighlightDialogBoxMorph.showing = this;
    HighlightDialogBoxMorph.uber.popUp.call(this, world);
};

HighlightDialogBoxMorph.prototype.fixLayout = function() {


    HighlightDialogBoxMorph.uber.fixLayout.call(this);
};