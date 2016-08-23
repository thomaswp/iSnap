// hintDialog.js
// This file serves to test custom dialogue box.
// Specifically, hint dialogue with ScriptMorph
// Reference: BlockEditorMorph in byob.js

function HintDialogBoxMorph() {
    this.init();
}

// HintDialogBox inherits from DialogBoxMorph
HintDialogBoxMorph.prototype = new DialogBoxMorph();
HintDialogBoxMorph.prototype.constructor = HintDialogBoxMorph;
HintDialogBoxMorph.uber = DialogBoxMorph.prototype;

HintDialogBoxMorph.prototype.initButtons = function() {
    this.okButton = this.addButton('accept', localize('OK'));
};

HintDialogBoxMorph.prototype.createThumbButtons = function () {
    var thumbButtons, txt;

    // Vertically aligned container to hold instructions and buttons
    container = new AlignmentMorph('column', this.padding / 2);
    this.thumbContainer = container;
    this.add(container);

    // Instruction text
    txt = new StringMorph(
        localize('Please rate the hint to dismiss.'),
        14,
        this.fontStyle
    );
    txt.drawNew();
    container.add(txt);

    // Button container
    thumbButtons = new AlignmentMorph('row', this.padding);
    container.add(thumbButtons);
    this.thumbButtons = thumbButtons;

    this.addThumbButton('up');
    this.addThumbButton('neutral');
    this.addThumbButton('down');

    // This is in fact required twice. Not sure why...
    thumbButtons.fixLayout();
    thumbButtons.fixLayout();
    container.fixLayout();
    container.fixLayout();

    this.okButton.setEnabled(false);
};

HintDialogBoxMorph.prototype.onThumbsDown = function(handler) {
    this.onThumbsDownHandler = handler;
};

// define popUp function
HintDialogBoxMorph.prototype.popUp = function () {
    var minWidth = 0,
        minHeight = 0,
        world = this.target.world();

    // The minimum width and minimum height when adjusting dialogue scale
    minWidth = this.width();
    minHeight = this.height();

    if (world) {
        HintDialogBoxMorph.uber.popUp.call(this, world);
        this.handle = new HandleMorph(
            this,
            minWidth,
            minHeight,
            this.corner,
            this.corner
        );
    }

    window.hintProvider.setDisplayEnabled(SnapDisplay, false);
};

HintDialogBoxMorph.prototype.addThumbButton = function (thumbType) {
    var selected = false, myself = this;

    var thumbButton = new ThumbMorph(
        thumbType,
        'radiobutton',
        function() {
            myself.okButton.setEnabled(true);
        },
        null,
        null,
        function () {
            return selected;
        }
    );
    thumbButton.action = function() {
        myself.selectThumbButton(thumbButton);
    };
    thumbButton.query = function() {
        return thumbButton.state;
    };
    thumbButton.selected = selected;

    this.thumbButtons.add(thumbButton);
};

HintDialogBoxMorph.prototype.selectThumbButton = function (thumbButton) {
    if (this.thumbButtons) {
        this.thumbButtons.children.forEach(function (child) {
            if (child instanceof ThumbMorph) {
                if (child === thumbButton) {
                    child.state = !child.state;
                } else {
                    child.state = false;
                }
                child.refresh();
            }
        });
    }
};

HintDialogBoxMorph.prototype.logFeedback = function() {
    var feedback = this.getFeedback();
    if (this.onThumbsDownHandler && feedback && feedback.length == 1 &&
            feedback[0] === 'down') {
        this.onThumbsDownHandler();
    }
    Trace.log('HintDialogBox.done', feedback);
};

HintDialogBoxMorph.prototype.getFeedback = function() {
    if (!this.thumbButtons) return null;
    var feedback = [];
    this.thumbButtons.children.forEach(function(child) {
        if (child instanceof ThumbMorph) {
            if (child.state) {
                feedback.push(child.thumbType);
            }
        }
    });
    return feedback;
};

// define close function
HintDialogBoxMorph.prototype.destroy = function() {
    this.logFeedback();
    if (ide.spriteBar.hintButton) {
        window.hintProvider.setDisplayEnabled(SnapDisplay,
                ide.spriteBar.hintButton.active);
    }
    HintDialogBoxMorph.uber.destroy.call(this);
};


// MessageHintDialogMorph ////////////////////////////////////////
function MessageHintDialogBoxMorph(message, title, showRating, target) {
    this.init(message, title, showRating, target);
}

// MessageHintDialogMorph inherits from DialogBoxMorph

MessageHintDialogBoxMorph.prototype = new HintDialogBoxMorph();
MessageHintDialogBoxMorph.prototype.constructor = MessageHintDialogBoxMorph;
MessageHintDialogBoxMorph.uber = HintDialogBoxMorph.prototype;

// Keep track of the currently showing dialogue box
MessageHintDialogBoxMorph.showing = null;

// initialize Message Hint Dialogue box
MessageHintDialogBoxMorph.prototype.init =
function (message, title, showRating, target) {
    var txt;

    this.showRating = showRating;
    // Set currently showing dialogue to this;
    MessageHintDialogBoxMorph.showing = this;

    this.handle = null;

    MessageHintDialogBoxMorph.uber.init.call(
        this,
        target,
        null,
        target
        );

    this.key = 'messageHintDialog';
    this.labelString = title;
    this.createLabel();

    txt = new TextMorph(
        localize(message),
        16,
        this.fontStyle,
        true,
        false,
        'center',
        null,
        null,
        new Point(1, 1),
        new Color(255, 255, 255)
    );
    this.addBody(txt);

    this.initButtons();

    if (showRating) {
        this.createThumbButtons();
    }

    this.fixExtent();
    this.fixLayout();
};

MessageHintDialogBoxMorph.prototype.popUp = function() {
    this.fixLayout();
    this.drawNew();
    this.fixLayout();
    MessageHintDialogBoxMorph.uber.popUp.call(this);
};

MessageHintDialogBoxMorph.prototype.fixLayout = function() {
    var th = fontHeight(this.titleFontSize) + this.titlePadding * 2;

    if (this.buttons && (this.buttons.children.length > 0)) {
        this.buttons.fixLayout();
    }

    if (this.body) {
        this.body.setPosition(this.position().add(new Point(
            this.padding,
            th + this.padding
        )));
        this.body.setExtent(new Point(
            this.width() - this.padding * 2,
           this.height() - this.padding * 3 - th - this.buttons.height()
        ));
        this.body.setCenter(this.center());
        this.body.setTop(this.top() + this.padding + th);

    }

    if (this.label) {
        this.label.setCenter(this.center());
        this.label.setTop(this.top() + (th - this.label.height()) / 2);
    }

    if (this.buttons && (this.buttons.children.length > 0)) {
        this.buttons.setCenter(this.center());
        this.buttons.setBottom(this.bottom() - this.padding);
    }

    if (this.thumbContainer) {
        this.thumbContainer.setCenter(this.center());
        this.thumbContainer.setBottom(
            this.bottom() - 2 * this.padding - this.buttons.height());
    }
};

MessageHintDialogBoxMorph.prototype.destroy = function() {
    MessageHintDialogBoxMorph.uber.destroy.apply(this, arguments);
    if (MessageHintDialogBoxMorph.showing != this)
        return;
    MessageHintDialogBoxMorph.showing = null;
};

MessageHintDialogBoxMorph.prototype.fixExtent = function() {
    var th = fontHeight(this.titleFontSize) + this.titlePadding * 2,
        w = 0,
        h = 0;

    this.buttons.fixLayout();
    this.buttons.fixLayout(); //doesn't know why it needs two times but it works

    w = Math.max(this.body.width(), this.buttons.width());
    if (this.thumbContainer) {
        w = Math.max(w, this.thumbContainer.width());
    }
    w += 2 * this.padding;

    h = this.body.height() + th + this.buttons.height() + 4 * this.padding;
    if (this.thumbContainer) {
        h += this.thumbContainer.height();
    }

    this.setExtent(new Point(w, h));
};

// HintDialogBoxMorph instance creation
function CodeHintDialogBoxMorph(target) {
    this.init(target);
}

// HintDialogBox inherits from DialogBoxMorph
CodeHintDialogBoxMorph.prototype = new HintDialogBoxMorph();
CodeHintDialogBoxMorph.prototype.constructor = CodeHintDialogBoxMorph;
CodeHintDialogBoxMorph.uber = HintDialogBoxMorph.prototype;

// Keep track of the currently showing hint dialogue box
CodeHintDialogBoxMorph.showing = null;

CodeHintDialogBoxMorph.prototype.destroy = function() {
    CodeHintDialogBoxMorph.uber.destroy.apply(this, arguments);
    if (CodeHintDialogBoxMorph.showing != this)
        return;
    CodeHintDialogBoxMorph.showing = null;
};

// Initialize Hint Dialogue Box
CodeHintDialogBoxMorph.prototype.init = function (target) {
    var scripts,
        scriptsFrame;

    CodeHintDialogBoxMorph.showing = this;

    // additional properties:
    this.handle = null; //doesn't know if useful

    // initialize inherited properties: (call parent constructor)
    CodeHintDialogBoxMorph.uber.init.call(
        this,
        target,
        null,
        target
        );

    // override inherited properties
    this.key = 'hintDialog';
    this.labelString = 'Suggestion';
    this.createLabel();

    // create labels for scripts frame
    this.createLabels();

    // create scripting area
    scripts = new ScriptsMorph(target);
    scripts.isDraggable = false;
    scripts.color = IDE_Morph.prototype.groupColor;
    scripts.cachedTexture = IDE_Morph.prototype.scriptsPaneTexture;
    scripts.cleanUpMargin = 10; //No idea what this does?
    scripts.userMenu = function() { return null; };

    // create scripts frame for scripts
    scriptsFrame = new ScrollFrameMorph(scripts);
    scriptsFrame.padding = 10;
    scriptsFrame.growth = 50;
    scriptsFrame.isDraggable = false;
    scriptsFrame.acceptsDrops = false;
    scriptsFrame.contents.acceptsDrops = true;
    //don't allow scrolling by dragging
    scriptsFrame.mouseDownLeft = function () { };
     // don't allow scroll by mouse
    scriptsFrame.mouseScroll = function () { };
     //don't allow autoscroll
    scriptsFrame.startAutoScrolling = function () { };
    scripts.scrollFrame = scriptsFrame;
    scripts.acceptsDrops = false; //does not allow edit

    // add elements to dialogue box
    this.addBody(new AlignmentMorph('row', this.padding));

    // add 2 scriptFrames to this.body
    this.addScriptsFrame(scriptsFrame);
    this.addScriptsFrame(scriptsFrame.fullCopy());

    // add buttons to the dialogue
    this.initButtons();

    this.createThumbButtons();

    // set layout
    this.fixLayout();
};

// interface for showing hint for a single block
CodeHintDialogBoxMorph.prototype.showBlockHint =
function (parentSelector, from, to, otherFromBlocks) {
    var block1, block2;

    //set HintDialogBox body alignment to vertical alignment
    this.body.orientation = 'col'; //set alignment to vertical
    // change padding to 2 times of original padding
    this.body.padding = 2 * this.padding;
    this.body.drawNew(); //re-draw alignmentMorph

    if (!parentSelector) {
        Trace.logErrorMessage('bad parentSelector in ' +
            'HintDialogBoxMorph.prototype.showBlockHint: 1');
        return;
    }
    if (!to) {
        Trace.logErrorMessage(
            'bad to in HintDialogBoxMorph.prototype.showBlockHint: 1');
        return;
    }

    // Create parent block with the two sets of parameters
    block1 = this.createBlockWithParams(parentSelector, from);
    block2 = this.createBlockWithParams(parentSelector, to);

    // blck1 is null means arg1 is incorrect
    if (block1 === null) {
        Trace.logErrorMessage('bad parentSelector and from in ' +
            'HintDialogBoxMorph.prototype.showBlockHint: 2');
        return;
    }

    // blck2 is null means arg3 is incorrect
    if (block2 === null) {
        Trace.logErrorMessage('bad parentSelector and to in ' +
            'HintDialogBoxMorph.prototype.showBlockHint: 2');
        return;
    }

    // Add blocks to the scriptsFrame
    this.addBlock(block1, 0);
    this.addBlock(block2, 1);
    otherFromBlocks.forEach(function(block) {
        this.addBlock(this.createBlock(block), 0);
    }, this);

    // refresh layout
    this.fixExtent(); // fix Extent to fit the hints
    this.fixLayout();
    // adjust v and h scroll bars to original position and hide them
    this.adjustScroll();

    this.popUp();
    return this;
};

CodeHintDialogBoxMorph.prototype.createBlockWithParams =
function(selector, params) {
    var block = this.createBlock(selector, null, params.length);
    var inputs = block.inputs();
    if (inputs.length == 1 && inputs[0] instanceof MultiArgMorph) {
        var multiArg = inputs[0];
        while (multiArg.inputs().length > params.length) {
            multiArg.removeInput();
        }
        while (multiArg.inputs().length < params.length) {
            multiArg.addInput();
        }
        inputs = multiArg.inputs();
    }
    this.clearParameter(block);
    for (var i = 0; i < params.length; i++) {
        if (params[i] === 'script' || params[i] === 'literal') continue;
        var param = this.createBlock(params[i], inputs[i]);
        this.clearParameter(param);
        var input = inputs[i];
        input.parent.silentReplaceInput(input, param);
    }
    return block;
};


CodeHintDialogBoxMorph.prototype.fakeCustomBlock =
function (type, category, spec) {
    inputs = new Array((spec.match(/%/g) || []).length);
    var definition = {
        type: type,
        category: category,
        blockSpec: function() { return spec; },
        variableNames: [],
        inputOptionsOfIdx: function() { return inputs; }
    };
    if (type === 'command') {
        return new CustomCommandBlockMorph(definition);
    } else if (type === 'reporter' || type === 'predicate')  {
        return new CustomReporterBlockMorph(definition, type === 'predicate');
    }
};

CodeHintDialogBoxMorph.prototype.createBlock =
function(selector, parent, numArgs) {
    numArgs = numArgs | 0;
    var param;
    if (selector === 'var') {
        param = SpriteMorph.prototype.variableBlock(selector);
        param.isDraggable = false;
    } else if (selector == 'doCustomBlock' ||
               selector == 'evaluateCustomBlock') {
        type = 'command';
        if (parent) {
            type = parent._debugType == 'BooleanSlotMorph' ?
                'predicate' : 'reporter';
        }
        spec = 'Custom Block';
        if (numArgs) {
            spec += ':' ;
            for (var i = 0; i < numArgs; i++) spec += ' %s';
        }
        param = this.fakeCustomBlock(type, 'other', spec);
        param.isDraggable = false;
    } else {
        param = SpriteMorph.prototype.blockForSelector(selector, true);
    }
    if (param == null) {
        Trace.logErrorMessage('Cannot initialize selector: ' + selector);
    }

    // Make sure the block doesn't respond to menus and clicks
    noop = function() { return null; };
    param.userMenu = noop;
    param.allChildren().filter(
        function (child) {
            return child instanceof InputSlotMorph;
        }).forEach(function(child) {
            child.mouseClickLeft = noop;
        });

    return param;
};

// interface for showing hint for a script(sequence of blocks)
CodeHintDialogBoxMorph.prototype.showScriptHint =
function (parentSelector, index, from, to) {
    //set HintDialogBox body alignment to horizontal alignment
    this.body.orientation = 'row'; //set alignment to horizontal
    this.body.drawNew(); //re-draw alignmentMorph

    // Create the from and to blocks and put them in the ScriptMorphs
    var fromBlock = this.createBlockFromList(from[0], parentSelector, index);
    if (fromBlock) {
        // Only the fromBlock can be null (for custom blocks with no body)
        this.addBlock(fromBlock, 0);
    }
    var toBlock = this.createBlockFromList(to, parentSelector, index);
    this.addBlock(toBlock, 1);

    // Add any additional from blocks (which won't have the same parent)
    for (var i = 1; i < from.length; i++) {
        this.addBlock(this.createBlockFromList(from[i]), 0);
    }

    // refresh layout
    this.fixExtent(); // fix Extent to fit the hints
    this.fixLayout();
    // adjust v and h scroll bars to original position and hide them
    this.adjustScroll();

    this.popUp();
    return this;
};

CodeHintDialogBoxMorph.prototype.createBlockFromList =
function(list, parentSelector, index) {
    var block = this.readBlocks(list);
    if (parentSelector != null) {
        var parent = this.createBlock(parentSelector);
        var input = parent.inputs()[index];
        if (input instanceof CSlotMorph) {
            // If the input is a CSlotMorph, then it is a nested structure
            input.nestedBlock(block);
        } else {
            // Else, it is parameter input
            // eslint-disable-next-line no-console
            console.log('DOES THIS EVER HAPPEN?');
            input.parent.silentReplaceInput(input, block);
        }
        return parent;
    }
    return block;
};

// add scriptsFrame to AlignmentMorph in body
CodeHintDialogBoxMorph.prototype.addScriptsFrame = function (scriptsFrame) {
    if (this.body) {
        this.body.add(scriptsFrame);
    }
};

// add block to a scriptsFrame specified by num
CodeHintDialogBoxMorph.prototype.addBlock = function(blck, num) {
    // check if blck exists
    if (blck === null) {
        Trace.logErrorMessage(
            'blck is null in HintDialogBoxMorph.prototype.addBlock: 1');
        return;
    }
    // check if specified scriptsFrame exists
    if (typeof this.body.children[num] === 'undefined') {
        Trace.logErrorMessage(
            'bad num in HintDialogBoxMorph.prototype.addBlock: 1');
        return;
    }

    this.body.children[num].contents.add(blck);
    this.body.children[num].contents.cleanUp();
    this.body.children[num].contents.changed();
};

// customized fixExtend function
// first resize two scriptFrame to fit the hint blocks
// then resize this.extent to fit the scriptFrames and buttons
CodeHintDialogBoxMorph.prototype.fixExtent = function() {
    var th = fontHeight(this.titleFontSize) + this.titlePadding * 2,
        w = 0,
        h = 0;

    this.buttons.fixLayout();

    // calculate the size of scriptsFrame
    this.body.children.forEach(function(child) {
        if (!child.contents) return;
        var fullBounds = child.contents.children.reduce(function(a, b) {
            return a ? a.merge(b.fullBounds()) : b.fullBounds();
        }, null) || new Rectangle();
        w = Math.max(w, fullBounds.width());
        h = Math.max(h, fullBounds.height());
    });

    w = w + 2 * this.padding; // final width of a single scriptFrame
    h = h + 2 * this.padding; // final height of a single scriptFrame

    this.body.children.forEach(function(child) {
        child.setExtent(new Point(w, h));
    });

    var thumbSize = this.thumbContainer ?
            new Point(this.thumbContainer.width(),
                    this.thumbContainer.height()) :
            new Point(0, 0);

    // decide the extent of HintDialogBox based on body orientation
    if (this.body.orientation === 'row') {
        this.buttons.fixLayout();

        w = Math.max(2 * w + this.padding,
                    thumbSize.x,
                    this.buttons.width(),
                    this.label.width(),
                    this.labels[0].width() + this.labels[1].width() +
                        5 * this.padding
        );

        this.setExtent(new Point(w + 2 * this.padding,
            th + this.buttons.height() + h + 4 * this.padding +
            this.labels[0].height() + thumbSize.y));
    } else {
        this.buttons.fixLayout(); //fix button layout before calculating width

        w = Math.max(w,
                    this.label.width(),
                    this.buttons.width(),
                    thumbSize.x
        );

        this.setExtent(new Point(w + 2 * this.padding,
            th + this.buttons.height() + 2 * h + 5 * this.padding +
            2 * this.labels[0].height() + thumbSize.y));
    }
};


// adjust v and h scroll bars to original position and hide them
CodeHintDialogBoxMorph.prototype.adjustScroll = function() {
    this.body.children.forEach(function(child) {
        if (!child.contents) return;
        child.scrollX(child.contents.width());
        child.scrollY(child.contents.height());
        child.hBar.destroy(); // hide horizontal scroll bar
        child.vBar.destroy(); // hide vertical scroll bar
    });
};


// read a sequence of block morph, concat them and return the one on top
// pure sequence block without parameter
CodeHintDialogBoxMorph.prototype.readBlocks = function (list) {
    var blck = null; //store the first hint block, init with null

    // used for testing
    // list = ['forward','turn','turnLeft'];

    //read blocks and add to scripts
    if (list !== null) {
        for (var i = list.length - 1; i >= 0; i -= 1) {
            if (blck === null) {
                blck = this.createBlock(list[i]);
                this.clearParameter(blck);
            } else {
                var secondBlock = blck;
                blck = this.createBlock(list[i]);
                this.clearParameter(blck);
                blck.nextBlock(secondBlock);
            }
        }

        return blck;
    }
};

// clear specific/all parameter input in a blck
// num is optional
CodeHintDialogBoxMorph.prototype.clearParameter = function (blck, num) {
    var inputs = blck.inputs();
    if (inputs.length == 1 && inputs[0] instanceof MultiArgMorph) {
        inputs = inputs[0].inputs();
    }

    // if num is left empty,or input other than number, clear all parameters
    if (num === null || typeof num === 'undefined' || typeof num === 'string' ||
            typeof num === 'boolean') {
        inputs.forEach(function (input) {
            if (input instanceof InputSlotMorph) {
                input.setContents(null);
                // disable editing of input slots
                if (input.children[0] instanceof StringMorph) {
                    input.children[0].isEditable = false;
                }
                // disable this function to avoid error
                input.getVarNamesDict = function() {};
            }
        });
    // else clear the slot at specific position
    } else {
        // check if the InputSlot specified by num actually exists/defined
        if (inputs[num] instanceof InputSlotMorph) {
            inputs[num].setContents(null);
        }
    }
};

// create labels for scripts frame
CodeHintDialogBoxMorph.prototype.createLabels = function() {
    var myself = this;
    if (this.labels) {
        this.labels.destroy();
    }
    // create a alignmentMorph to
    this.labels = [new StringMorph(
            localize('Your Code'),
            this.titleFontSize,
            this.fontStyle,
            true,
            false,
            false,
            null,
            this.titleBarColor.darker(this.contrast)
        ),
        new StringMorph(
            localize('Suggested Code'),
            this.titleFontSize,
            this.fontStyle,
            true,
            false,
            false,
            null,
            this.titleBarColor.darker(this.contrast)
        )];

    this.labels.forEach(function(label) {
        label.color = new Color(0, 0, 0);
        label.drawNew();
        myself.add(label);
    });
};

// define HintDialogBoxMorph layout
CodeHintDialogBoxMorph.prototype.fixLayout = function() {
    var th = fontHeight(this.titleFontSize) + this.titlePadding * 2;

    if (this.buttons && (this.buttons.children.length > 0)) {
        this.buttons.fixLayout();
    }

    if (this.body) {
        this.body.setPosition(this.position().add(new Point(
            this.padding,
            th + this.padding
        )));
        this.body.setExtent(new Point(
            this.width() - this.padding * 2,
           this.height() - this.padding * 3 - th - this.buttons.height()
        ));
        this.body.setCenter(this.center());
        this.body.setTop(this.top() + this.padding + th +
            this.labels[0].height());

    }

    if (this.label) {
        this.label.setCenter(this.center());
        this.label.setTop(this.top() + (th - this.label.height()) / 2);
    }

    if (this.buttons && (this.buttons.children.length > 0)) {
        this.buttons.setCenter(this.center());
        this.buttons.setBottom(this.bottom() - this.padding);
    }

    if (this.labels) {
        this.labels[0].setTop(this.body.children[0].top() -
            this.labels[0].height() - 4);
        this.labels[0].setLeft(this.body.children[0].left());
        this.labels[1].setTop(this.body.children[1].top() -
            this.labels[0].height() - 4);
        this.labels[1].setLeft(this.body.children[1].left());
    }

    if (this.thumbContainer) {
        this.thumbContainer.setCenter(this.center());
        this.thumbContainer.setBottom(this.bottom() -
            2 * this.padding - this.buttons.height());
    }
};


// IntentionDialogMorph ////////////////////////////////////////

// IntentionDialogMorph initialization

function IntentionDialogMorph(target) {
    this.init(target);
}

// IntentionDialogMorph inherits from DialogBoxMorph

IntentionDialogMorph.prototype = new DialogBoxMorph();
IntentionDialogMorph.prototype.constructor = IntentionDialogMorph;
IntentionDialogMorph.uber = DialogBoxMorph.prototype;

// Keep track of currently showing Intention Dialog
IntentionDialogMorph.showing = null;

IntentionDialogMorph.prototype.destroy = function() {
    IntentionDialogMorph.uber.destroy.apply(this, arguments);
    if (IntentionDialogMorph.showing != this) {
        return;
    }
    IntentionDialogMorph.showing = null;
};

IntentionDialogMorph.prototype.init = function (target) {
    // declare local variables
    var options;

    IntentionDialogMorph.showing = this;

    this.handle = null;

    // initialize inherited properties: (call parent constructor)
    IntentionDialogMorph.uber.init.call(
        this,
        target,
        null,
        target
    );

    this.createLabels();

    // override inherited properties
    this.key = 'intentionDialog';
    this.labelString = 'Help';
    this.createLabel();

    options = new AlignmentMorph('col', this.padding);
    options.alignment = 'left';
    this.addBody(options);

    this.addOptions();

    // add accept and decline button
    this.addButton('showHintBubbles', 'Show Suggestions');
    this.addButton('cancel', 'Cancel');

    // set layout
    this.fixExtent();
    this.fixLayout();
    // Trace.log('IntentionDialog.init');
};

IntentionDialogMorph.prototype.addOptions = function() {
    this.addOption("I don't know what to do next.");
    this.addOption("There's an error in my code.");
    this.addOtherOption();
};

IntentionDialogMorph.prototype.addOption = function(text) {
    var option, myself = this;

    // var selected = this.body.children.length == 0;
    var selected = false;
    option = new ToggleMorph(
        'checkbox',
        null,
        null,
        localize(text),
        function () {
            return selected;
        }
    );
    option.query = function() {
        return option.selected;
    };
    option.action = function () {
        myself.selectOption(option);
    };
    option.selected = selected;

    option.drawNew();
    option.fixLayout();

    this.body.add(option);

    return option;
};


IntentionDialogMorph.prototype.addOtherOption = function() {
    var option = this.addOption('Other...');
    var myself = this;

    var txt = new InputFieldMorph(
            '',
            false, // numeric?
            null, // drop-down dict, optional
            false
        );
    txt.setWidth(200);

    var text = txt.children[0];
    setTimeout(function() {
        if (window.world.cursor) {
            window.world.cursor.destroy();
        }
    }, 1);
    var oldClick = text.mouseClickLeft;
    text.mouseClickLeft = function(pos) {
        oldClick.call(text, pos);
        myself.selectOption(option);
    };

    this.textBox = txt;
    this.add(txt);
};


IntentionDialogMorph.prototype.selectOption = function(selected) {
    if (this.body) {
        this.body.children.forEach(function (child) {
            if (child instanceof ToggleMorph) {
                if (child == selected) child.selected = !child.selected;
                child.refresh();
            } else {
                child.children[0].selected = (child.children[0] == selected);
                child.children[0].refresh();
            }
        });
    }
};

IntentionDialogMorph.prototype.fixExtent = function() {
    var minWidth = 0,
        minHeight = 0,
        th = fontHeight(this.titleFontSize) + this.titlePadding * 2;

    this.buttons.fixLayout();
    this.buttons.fixLayout();
    this.body.fixLayout();
    this.body.fixLayout();

    minHeight = th + this.body.height() + 3 * this.padding +
        this.buttons.height() + this.labels.height();
    minWidth = Math.max(minWidth, this.body.width(), this.buttons.width(),
        this.body.children[this.body.children.length - 1].width() +
        3 * this.padding + this.textBox.width()) + 2 * this.padding;

    this.setExtent(new Point(minWidth, minHeight));
};

// create label for input field
IntentionDialogMorph.prototype.createLabels = function() {
    if (this.labels) {
        this.labels.destroy();
    }

    this.labels = new StringMorph(
            localize('What do you need help with?'),
            this.titleFontSize,
            this.fontStyle,
            true,
            false,
            false,
            null,
            this.titleBarColor.darker(this.contrast)
        );
    this.labels.color = new Color(0, 0, 0);
    this.labels.drawNew();
    this.add(this.labels);
};

// define function when Show Available Hints button is clicked
IntentionDialogMorph.prototype.showHintBubbles = function() {
    var options = [], otherText = null, myself = this;
    this.body.children.forEach(function(child) {
        if (child.selected) {
            options.push(child.captionString);
        }
    });
    otherText = myself.textBox.getValue();
    Trace.log('IntentionDialog.showAvailableHint', {
        'options': options,
        'otherText': otherText,
    });

    window.hintProvider.clearDisplays();
    window.hintProvider.setDisplayEnabled(SnapDisplay, true);

    this.close();
};

// define function when cancel button is clicked
IntentionDialogMorph.prototype.cancel = function() {
    Trace.log('IntentionDialog.cancel');
    this.close();
    ide.spriteBar.hintButton.show();
};

IntentionDialogMorph.prototype.close = function() {
    // Trace.log('IntentionDialog.closed');
    this.destroy();
};

IntentionDialogMorph.prototype.popUp = function() {
    var minWidth = 0,
        minHeight = 0,
        th = fontHeight(this.titleFontSize) + this.titlePadding * 2,
        world = this.target.world();

    minHeight = th + this.body.height() + 3 * this.padding +
        this.buttons.height() + this.labels.height();
    minWidth = Math.max(minWidth, this.body.width(), this.buttons.width(),
        this.body.children[this.body.children.length - 1].width() +
        3 * this.padding + this.textBox.width()) + 2 * this.padding;

    if (world) {
        CodeHintDialogBoxMorph.uber.popUp.call(this, world);
        this.handle = new HandleMorph(
            this,
            minWidth,
            minHeight,
            this.corner,
            this.corner
        );
    }

    Trace.log('IntentionDialog.popUp');
};

IntentionDialogMorph.prototype.fixLayout = function() {
    var th = fontHeight(this.titleFontSize) + this.titlePadding * 2;

    if (this.buttons && (this.buttons.children.length > 0)) {
        this.buttons.fixLayout();
    }

    if (this.body) {
        this.body.setPosition(this.position().add(new Point(
            this.padding,
            th + this.padding
        )));
        this.body.setExtent(new Point(
            this.width() - this.padding * 2,
           this.height() - this.padding * 3 - th - this.buttons.height()
        ));
        this.body.setLeft(this.left() + this.padding);
        this.body.setTop(this.top() + this.padding + th + this.labels.height());

    }

    if (this.label) {
        this.label.setCenter(this.center());
        this.label.setTop(this.top() + (th - this.label.height()) / 2);
    }

    if (this.buttons && (this.buttons.children.length > 0)) {
        this.buttons.setCenter(this.center());
        this.buttons.setBottom(this.bottom() - this.padding);
    }

    if (this.labels) {
        this.labels.setTop(this.body.top() - this.labels.height() - 4);
        this.labels.setLeft(this.body.left());
    }

    if (this.textBox) {
        this.textBox.setLeft(
                this.body.children[this.body.children.length - 1].right() +
                3 * this.padding);
        this.textBox.setTop(
            this.body.children[this.body.children.length - 1].top());
    }
};

/********************************
 * Hint Button
 ********************************/
// Hint Button Action
IDE_Morph.prototype.getHint = function() {
    if (IntentionDialogMorph.showing) {
        return;
    }

    if (!this.spriteBar || !this.spriteBar.hintButton) return;
    var hintButton = this.spriteBar.hintButton;

    window.hintProvider.clearDisplays();
    var active = !hintButton.active;

    Trace.log('HelpButton.toggled', active);

    window.hintProvider.setDisplayEnabled(SnapDisplay, active);
    hintButton.active = active;
    hintButton.labelString = active ? 'Hide Help' : 'Help';
    hintButton.drawNew();
    hintButton.fixLayout();
    ide.fixLayout();

    // Currently we don't show the intent dialog, but this is how it's been
    // calculated in the past'
    // var elapseThreshold = 60 * 1000,
    //     currentTime = hintButton.lastTime;

    // var showIntentionDialog = false;

    // if (hintButton.firstClick) {
    //     hintButton.firstClick = false;
    // } else if (currentTime - hintButton.lastClickTime >=
    //         elapseThreshold) {
    //     showIntentionDialog = true;
    // }
    // hintButton.lastClickTime = currentTime;
};


/*******************************************
 * ThumbMorph
 ******************************************/

function ThumbMorph(
    thumbType, //'up' or 'down' or 'neutral'
    style, // 'checkbox' or 'radiobutton'
    target,
    action, // a toggle function
    labelString,
    query, // predicate/selector
    environment,
    hint,
    template,
    element, // optional Morph or Canvas to display
    builder // method which constructs the element (only for Morphs)
) {
    this.init(
        thumbType,
        style,
        target,
        action,
        labelString,
        query,
        environment,
        hint,
        template,
        element,
        builder
    );
}

ThumbMorph.prototype = new PushButtonMorph();
ThumbMorph.prototype.constructor = ThumbMorph;
ThumbMorph.uber = PushButtonMorph.prototype;

ThumbMorph.prototype.init = function (
    thumbType,
    style,
    target,
    action,
    labelString,
    query,
    environment,
    hint,
    template,
    element,
    builder
) {
    this.thumbType = thumbType;
    this.thumbSize = new Point(25, 25);
    this.padding = 1;
    style = style || 'checkbox';
    this.corner = (style === 'checkbox' ?
            0 : fontHeight(this.fontSize) / 2 + this.outline + this.padding);
    this.state = false;
    this.query = query || function () {return true; };
    this.tick = null;
    this.captionString = labelString || null;
    this.labelAlignment = 'right';
    this.element = element || null;
    this.builder = builder || null;
    this.toggleElement = null;

    // initialize inherited properties:
    ToggleMorph.uber.init.call(
        this,
        target,
        action,
        (style === 'checkbox' ? '\u2713' : '\u25CF'),
        environment,
        hint,
        template
    );
    this.refresh();

    this.drawNew();
    this.fixLayout();
    this.drawNew();
};

ThumbMorph.prototype.fixLayout = function () {
    var padding = this.padding * 2 + this.outline * 2,
        y;
    if (this.tick !== null) {
        this.setExtent(this.thumbSize);
        this.tick.setCenter(this.center());
    }
    if (this.toggleElement && (this.labelAlignment === 'right')) {
        y = this.top() + (this.height() - this.toggleElement.height()) / 2;
        this.toggleElement.setPosition(new Point(
            this.right() + padding,
            y
        ));
    }
    if (this.label !== null) {
        y = this.top() + (this.height() - this.label.height()) / 2;
        if (this.labelAlignment === 'right') {
            this.label.setPosition(new Point(
                this.toggleElement ?
                        this.toggleElement instanceof ToggleElementMorph ?
                                this.toggleElement.right()
                                : this.toggleElement.right() + padding
                        : this.right() + padding,
                y
            ));
        } else {
            this.label.setPosition(new Point(
                this.left() - this.label.width() - padding,
                y
            ));
        }
    }
};

ThumbMorph.prototype.createLabel = function () {
    if (this.label === null) {
        if (this.captionString) {
            this.label = new TextMorph(
                localize(this.captionString),
                this.fontSize,
                this.fontStyle,
                true
            );
            this.add(this.label);
        }
    }
    if (this.tick === null) {
        this.createTick();
    }
    if (this.toggleElement === null) {
        if (this.element) {
            if (this.element instanceof Morph) {
                this.toggleElement = new ToggleElementMorph(
                    this.target,
                    this.action,
                    this.element,
                    this.query,
                    this.environment,
                    this.hint,
                    this.builder
                );
            } else if (this.element instanceof HTMLCanvasElement) {
                this.toggleElement = new Morph();
                this.toggleElement.silentSetExtent(new Point(
                    this.element.width,
                    this.element.height
                ));
                this.toggleElement.image = this.element;
            }
            this.add(this.toggleElement);
        }
    }
};

ThumbMorph.prototype.createTick = function () {
    var myself = this;

    this.tick = new Morph();

    this.tick.setTexture = function (state) {
        var dir = 'hints/img/';
        if (myself.thumbType === 'up')
        {
            if (state) {
                this.texture = dir + 'thumb_up_selected.png';
            } else {
                this.texture = dir + 'thumb_up_unselected.png';
            }
        } else if (myself.thumbType === 'neutral') {
            if (state) {
                this.texture = dir + 'thumb_neutral_selected.png';
            } else {
                this.texture = dir + 'thumb_neutral_unselected.png';
            }
        } else {
            if (state) {
                this.texture = dir + 'thumb_down_selected.png';
            } else {
                this.texture = dir + 'thumb_down_unselected.png';
            }
        }
    };

    this.tick.drawNew = function () {
        this.image = newCanvas(this.extent());
        var context = this.image.getContext('2d'),
            isFlat = MorphicPreferences.isFlat && !this.is3D;

        context.fillStyle = myself.color.toString();
        context.beginPath();
        BoxMorph.prototype.outlinePath.call(
            this,
            context,
            isFlat ? 0 : Math.max(this.corner - this.outline, 0),
            this.outline
            );
        context.closePath();
        context.fill();
        context.lineWidth = this.outline;
        if (this.texture) {
            this.drawTexture(this.texture);
        }
    };

    this.tick.setTexture(this.state);
    this.tick.drawNew();
    this.tick.setExtent(new Point(18, 18));
    this.tick.setCenter(this.center());

    this.add(this.tick);
};

// ToggleMorph action:

ThumbMorph.prototype.trigger = function () {
    // Don't toggle, just stay pressed
    if (this.state) return;
    ToggleMorph.uber.trigger.call(this);
    this.refresh();
};

ThumbMorph.prototype.refresh = function () {
    /*
    if query is a function:
    execute the query with target as environment (can be null)
    for lambdafied (inline) actions

    else if query is a String:
    treat it as function property of target and execute it
    for selector-like queries
    */
    if (typeof this.query === 'function') {
        this.state = this.query.call(this.target);
    } else { // assume it's a String
        this.state = this.target[this.query]();
    }

    this.tick.setTexture(this.state);
    this.tick.drawNew();

    if (this.toggleElement && this.toggleElement.refresh) {
        this.toggleElement.refresh();
    }
};

// ToggleMorph events

ThumbMorph.prototype.mouseDownLeft = function () {
    PushButtonMorph.uber.mouseDownLeft.call(this);
    if (this.tick) {
        this.tick.setCenter(this.center().add(1));
    }
};

ThumbMorph.prototype.mouseClickLeft = function () {
    PushButtonMorph.uber.mouseClickLeft.call(this);
    if (this.tick) {
        this.tick.setCenter(this.center());
    }
};

ThumbMorph.prototype.mouseLeave = function () {
    PushButtonMorph.uber.mouseLeave.call(this);
    if (this.tick) {
        this.tick.setCenter(this.center());
    }
};

// ThumbMorph hiding and showing:

/*
    override the inherited behavior to recursively hide/show all
    children, so that my instances get restored correctly when
    hiding/showing my parent.
*/

ThumbMorph.prototype.hide = ToggleButtonMorph.prototype.hide;

ThumbMorph.prototype.show = ToggleButtonMorph.prototype.show;

