require('gui-extensions');

function HighlightDialogBoxMorph(target, showInserts) {
    this.init(target, showInserts);
}

HighlightDialogBoxMorph.prototype = Object.create(DialogBoxMorph.prototype);
HighlightDialogBoxMorph.constructor = HighlightDialogBoxMorph;
HighlightDialogBoxMorph.uber = DialogBoxMorph.prototype;

HighlightDialogBoxMorph.showOnRun = true;

HighlightDialogBoxMorph.prototype.init = function(target, showInserts) {
    HighlightDialogBoxMorph.uber.init.call(this, target, null, target);

    this.key = 'highlightDialog';
    this.insertButton =
        this.addButton('toggleInsert', this.nextButtonText(showInserts));
    this.addButton('ok', localize('Done'));

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
        "I'm checking your work using previous students' solutions...",
        true
    );

    var mainFrame = new AlignmentMorph('column', this.padding);
    mainFrame.alignment = 'left';

    addText(
        "RED highlighted blocks probably doesn't belong in the solution:",
        null, mainFrame
    );
    addBlock('doSayFor', HighlightDisplay.deleteColor, mainFrame);

    addText(
        '\nYELLOW highlighted blocks are probably part of ' +
        'the soltion, but need to be moved or reordered:',
        null, mainFrame
    );
    var moveBlocks = new AlignmentMorph('row', this.padding);
    addBlock('forward', HighlightDisplay.moveColor, moveBlocks);
    addBlockWithInput('doSayFor', 'getLastAnswer', 0,
        HighlightDisplay.moveColor, moveBlocks);
    moveBlocks.fixLayout();
    mainFrame.add(moveBlocks);

    addText(
        "For a hint on what to do next, click the 'Show Next Steps' button " +
        'below.',
        null, mainFrame
    );

    mainFrame.fixLayout();
    if (showInserts) mainFrame.hide();
    body.add(mainFrame);
    this.mainFrame = mainFrame;

    var insertFrame = new AlignmentMorph('column', this.padding);
    insertFrame.alignment = 'left';

    addText(
        'BLUE highlighted inputs probably need a new block added to them. ' +
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
    if (!showInserts) insertFrame.hide();
    this.insertFrame = insertFrame;
    hatBlock.setLeft(hatBlock.left() + 30);
    body.add(insertFrame);

    var check = new ToggleMorph('checkbox', this, 'toggleShowOnRun',
        'Always check my work when I run scripts', function() {
            return HighlightDialogBoxMorph.showOnRun;
        });
    body.add(check);

    body.fixLayout();
    this.addBody(body);
    body.drawNew();
};

HighlightDialogBoxMorph.prototype.destroy = function() {
    HighlightDialogBoxMorph.uber.destroy.call(this);
    if (!this.destroyed) {
        this.destroyed = true;
        window.hintProvider.setDisplayEnabled(HighlightDisplay, false);
        this.setShowInserts(false);
    }
};

HighlightDialogBoxMorph.prototype.setShowInserts = function(show) {
    window.hintProvider.displays.forEach(function(display) {
        if (!display instanceof HighlightDisplay) return;
        display.showInserts = show;
    });
    window.hintProvider.getHintsFromServer();
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

    // Set the top-left corner to that of the previous dialog or the corralBar
    var origin = null;
    if (showing) {
        origin = showing.bounds.origin;
    } else if (window.ide && window.ide.corralBar) {
        var ide = window.ide;
        origin = ide.corralBar.bounds.origin;
        // Make sure it doesn't pop up partially offscreen
        origin.x = Math.min(origin.x, ide.width() - this.width());
        origin.y = Math.min(origin.y, ide.height() - this.height());
    }

    HighlightDialogBoxMorph.showing = this;
    HighlightDialogBoxMorph.uber.popUp.call(this, world);

    // Wait to set the origin until after popping up
    if (origin) {
        this.setLeft(origin.x);
        this.setTop(origin.y);
    }
};

HighlightDialogBoxMorph.prototype.fixLayout = function() {


    HighlightDialogBoxMorph.uber.fixLayout.call(this);
};

HighlightDialogBoxMorph.prototype.nextButtonText = function(showInserts) {
    return showInserts ? localize('Hide Next Steps') :
        localize('Show Next Steps');
};

HighlightDialogBoxMorph.prototype.toggleInsert = function() {
    var showInserts = !this.insertFrame.isVisible;
    if (showInserts) {
        this.insertFrame.show();
        this.mainFrame.hide();
    } else {
        this.insertFrame.hide();
        this.mainFrame.show();
    }
    this.insertButton.labelString = this.nextButtonText(showInserts);
    this.setShowInserts(showInserts);
    this.insertButton.createLabel();
    this.insertButton.fixLayout();
    this.body.fixLayout();
    this.body.drawNew();
    this.fixLayout();
    this.drawNew();
};

HighlightDialogBoxMorph.prototype.toggleShowOnRun = function() {
    HighlightDialogBoxMorph.showOnRun = !HighlightDialogBoxMorph.showOnRun;
};

HighlightDialogBoxMorph.showHighlights = function() {
    if (window.hintProvider) {
        window.hintProvider.setDisplayEnabled(HighlightDisplay, true);
    }
};

extend(StageMorph, 'fireGreenFlagEvent', function(base) {
    if (HighlightDialogBoxMorph.showOnRun) {
        HighlightDialogBoxMorph.showHighlights();
    }
});

extend(BlockMorph, 'mouseClickLeft', function(base) {
    base.call(this);
    var top = this.topBlock(),
        receiver = top.receiver();
    if (!receiver) return;

    var children = top.allChildren().filter(function(child) {
        return child instanceof BlockMorph;
    }).length;

    // Limit click-run checking to 3-block scripts
    if (children < 3) return;

    var stage = top.receiver().parentThatIsA(StageMorph);
    if (stage && HighlightDialogBoxMorph.showOnRun) {
        var process = stage.threads.findProcess(top);
        if (process && !process.readyToTerminate) {
            HighlightDialogBoxMorph.showHighlights();
        }
    }
});