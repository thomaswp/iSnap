// hintDialog.js
// This file serves to test custom dialogue box.
// Specifically, hint dialogue with ScriptMorph
// Reference: BlockEditorMorph in byob.js

// Declarations
var HintDialogBoxMorph;
var IntentionDialogMorph;

// HintDialogBox inherits from DialogBoxMorph
HintDialogBoxMorph.prototype = new DialogBoxMorph();
HintDialogBoxMorph.prototype.constructor = HintDialogBoxMorph;
HintDialogBoxMorph.uber = DialogBoxMorph.prototype;

// Keep track of the currently showing hint dialogue box
HintDialogBoxMorph.showing = null;

// HintDialogBoxMorph instance creation
function HintDialogBoxMorph(target) {
	this.init(target);
}

HintDialogBoxMorph.prototype.destroy = function() {
	HintDialogBoxMorph.uber.destroy.apply(this, arguments);
	if (HintDialogBoxMorph.showing != this)
		return;
	HintDialogBoxMorph.showing = null;
}

HintDialogBoxMorph.prototype.init = function(target) {
	var scripts,  
		scriptsFrame;
	
	HintDialogBoxMorph.showing = this;
	
	// additional properties:
	this.handle = null; //doesn't know if useful
	
	// initialize inherited properties: (call parent constructor)
	HintDialogBoxMorph.uber.init.call(
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
	
	// create scripts frame for scripts
	scriptsFrame = new ScrollFrameMorph(scripts);
    scriptsFrame.padding = 10;
    scriptsFrame.growth = 50;
    scriptsFrame.isDraggable = false;
    scriptsFrame.acceptsDrops = false;
    scriptsFrame.contents.acceptsDrops = true;
	scriptsFrame.mouseDownLeft = function(){}; //don't allow scrolling by dragging
	scriptsFrame.mouseScroll = function(){}; // don't allow scroll by mouse
	scriptsFrame.startAutoScrolling = function(){}; //don't allow autoscroll
    scripts.scrollFrame = scriptsFrame;
	scripts.acceptsDrops = false; //does not allow edit
	
	// add elements to dialogue box
	this.addBody(new AlignmentMorph('row', this.padding))
	
	// add 2 scriptFrames to this.body
	this.addScriptsFrame(scriptsFrame);
	this.addScriptsFrame(scriptsFrame.fullCopy());
	
	// add accept and decline button
	this.addButton('rate','Done');
	this.addButton('otherHints','Other Suggestions...');
	
	// set layout
	this.fixLayout();
	Trace.log("HintDialogBox.init");
}

// interface for showing hint for a single block
HintDialogBoxMorph.prototype.showBlockHint = function (parentSelector, from, to) {
	var block1,	//corresponding to arg1
		block2;	//corresponding to arg3
	
	//set HintDialogBox body alignment to vertical alignment
	this.body.orientation = 'col'; //set alignment to vertical
	this.body.padding = 2*this.padding; // change padding to 2 times of original padding
	this.body.drawNew(); //re-draw alignmentMorph
	
	// check if arg1 is valid	
	if (parentSelector === null || typeof parentSelector === 'undefined') {
		console.log('bad parentSelector in HintDialogBoxMorph.prototype.showBlockHint: 1');
		return;
	}
	// check if arg3 is valid
	if (to === null || typeof to === 'undefined') {
		console.log('bad to in HintDialogBoxMorph.prototype.showBlockHint: 1');
		return;
	}
	
	// get blck1, blck2 with arg1, arg3 from blockForSelector
	block1 = this.createBlockWithParams(parentSelector, from);
	block2 = this.createBlockWithParams(parentSelector, to);
	
	// blck1 is null means arg1 is incorrect
	if (block1 === null) {
		console.log('bad parentSelector and from in HintDialogBoxMorph.prototype.showBlockHint: 2');
		return;
	}
	
	// blck2 is null means arg3 is incorrect
	if (block2 === null) {
		console.log('bad parentSelector and to in HintDialogBoxMorph.prototype.showBlockHint: 2');
		return;
	}
	
	//add suggested block to second scriptsFrame
	this.addBlock(block1,0);
	this.addBlock(block2,1);
	
	// refresh layout
	this.fixExtent(); // fix Extent to fit the hints
	this.fixLayout();
	this.adjustScroll(); // adjust v and h scroll bars to original position and hide them
	
	this.popUp();
	Trace.log("HintDialogBox.showBlockHint", {
		"parentSelector": parentSelector,
		"from": from,
		"to": to
	});
}

HintDialogBoxMorph.prototype.createBlockWithParams = function(selector, params) {
	var block = SpriteMorph.prototype.blockForSelector(selector, true);
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
		var param = this.createBlock(params[i]);
		this.clearParameter(param); 
		var input = inputs[i];
		input.parent.silentReplaceInput(input,param);
	}
	return block;
}

HintDialogBoxMorph.prototype.createBlock = function(selector) {
	var param;
	if (selector === 'var') {
		param = SpriteMorph.prototype.variableBlock(selector, true);
		param.isDraggable = false;
	} else {
		param = SpriteMorph.prototype.blockForSelector(selector, true);
	}
	return param;
}

// interface for showing hint for a script(sequence of blocks)
HintDialogBoxMorph.prototype.showScriptHint = function (parentSelector, index, from, to) {
	//set HintDialogBox body alignment to horizontal alignment
	this.body.orientation = 'row'; //set alignment to horizontal
	this.body.drawNew(); //re-draw alignmentMorph
	
	// if arg1 is null, it means no nesting, e.g. doUntil
	if (parentSelector === null) {
		// get corresponding blck2 from arg3
		var block1 = this.readBlocks(from);
		var block2 = this.readBlocks(to); //readBlocks can read a sequence of block and return the top one.
		
		// check if get blck2 correctly
		if (block2 === null) {
			console.log('bad arg3 in HintDialogBoxMorph.prototype.loadScriptHint: 1');
			return;
		}		
		
		this.addBlock(block1,0);
		this.addBlock(block2,1);
	// if arg1 is not null, there is nesting
	} else {
		// get corresponding blck1 from arg1
		var block1 = SpriteMorph.prototype.blockForSelector(parentSelector, true);
		var block2 = SpriteMorph.prototype.blockForSelector(parentSelector, true);
		
		// get corresponding blck2 from arg3
		var block1Body = this.readBlocks(from);
		var block2Body = this.readBlocks(to);
		
		// check if get blck1 correctly
		if (block1 === null) {
			console.log('bad arg1 in HintDialogBoxMorph.prototype.loadScriptHint: 1');
			return;
		}
		
		//check if get blck2 correctly
		if (block2 === null) {
			console.log('bad arg2 in HintDialogBoxMorph.prototype.loadScriptHint: 2');
			return;
		}
		
		var input1 = block1.inputs()[index];
		var input2 = block2.inputs()[index];
		
		// if the number arg2 child is a CSlotMorph, then it is a nested structure
		if (input1 instanceof CSlotMorph) {
			input1.nestedBlock(block1Body);
			input2.nestedBlock(block2Body);
			
		// else, it is parameter input
		} else {
			input1.parent.silentReplaceInput(input1,block1Body);
			input2.parent.silentReplaceInput(input2,block2Body);
		}

		this.addBlock(block1,0);
		this.addBlock(block2,1);
	}
	
	// refresh layout
	this.fixExtent(); // fix Extent to fit the hints
	this.fixLayout();
	this.adjustScroll(); // adjust v and h scroll bars to original position and hide them
	
	this.popUp();
	
	Trace.log("HintDialogBox.showScriptHint",{
		"parentSelector": parentSelector,
		"index": index,
		"from": from,
		"to": to
	});
}

// add scriptsFrame to AlignmentMorph in body
HintDialogBoxMorph.prototype.addScriptsFrame = function (scriptsFrame) {
	if (this.body) {
		this.body.add(scriptsFrame);
	}
}

// add block to a scriptsFrame specified by num
HintDialogBoxMorph.prototype.addBlock = function(blck, num) {
	// check if blck exists
	if (blck === null) {
		console.log('blck is null in HintDialogBoxMorph.prototype.addBlock: 1');
		return;
	}
	// check if specified scriptsFrame exists
	if (typeof this.body.children[num] === 'undefined') {
		console.log('bad num in HintDialogBoxMorph.prototype.addBlock: 1');
		return;
	}
	
	this.body.children[num].contents.add(blck);
	this.body.children[num].contents.changed();
}

// customized fixExtend function
// first resize two scriptFrame to fit the hint blocks
// then resize this.extent to fit the scriptFrames and buttons
HintDialogBoxMorph.prototype.fixExtent = function() {
	var th = fontHeight(this.titleFontSize) + this.titlePadding * 2,
		w = 0,
		h = 0;
		
	// calculate the size of scriptsFrame
	this.body.children.forEach(function(child) {
		//child.children[0].setExtent(new Point(250,h));
		if (child.contents.children[0]) {
			w = Math.max(child.contents.children[0].fullImage().width,w);
			h = Math.max(child.contents.children[0].fullImage().height,h);
		}
	});
	
	w = w + 2*this.padding; // final width of a single scriptFrame
	h = h + 2*this.padding; // final height of a single scriptFrame
	
	this.body.children.forEach(function(child) {
		child.setExtent(new Point(w, h));
	});
	
	// decide the extent of HintDialogBox based on body orientation
	if (this.body.orientation === 'row') {
		this.setExtent(new Point(2*w+3*this.padding,th+this.buttons.height()+h+3*this.padding+this.labels[0].height()));
	} else {
		this.buttons.fixLayout(); //fix button layout before calculating width
		w = Math.max(w,this.label.width(),this.buttons.width());
		this.setExtent(new Point(w+2*this.padding,th+this.buttons.height()+2*h+4*this.padding+2*this.labels[0].height()));
	}
}


// adjust v and h scroll bars to original position and hide them
HintDialogBoxMorph.prototype.adjustScroll = function() {
	this.body.children.forEach(function(child) {
		child.scrollX(child.contents.width());
		child.scrollY(child.contents.height());
		child.hBar.destroy(); // hide horizontal scroll bar
		child.vBar.destroy(); // hide vertical scroll bar
	});	
}


// read a sequence of block morph, concat them and return the one on top
// pure sequence block without parameter
HintDialogBoxMorph.prototype.readBlocks = function (list) {
	var blck = null; //store the first hint block, init with null 
	
	// used for testing
	// list = ['forward','turn','turnLeft'];
	
	//read blocks and add to scripts
	if (list !== null) {
		for (var i = list.length-1; i >= 0; i -= 1) {
			if (blck === null) {
				blck = this.createBlock(list[i]);
				this.clearParameter(blck);
			} else {
				var secondBlock = blck;
				blck = this.createBlock(list[i]);;
				this.clearParameter(blck);
				blck.nextBlock(secondBlock);
			}
		}

		return blck;
	}
}

// clear specific/all parameter input in a blck
// num is optional 
HintDialogBoxMorph.prototype.clearParameter = function (blck,num) {
	var inputs = blck.inputs();
	if (inputs.length == 1 && inputs[0] instanceof MultiArgMorph) {
		inputs = inputs[0].inputs();
	}
	
	// if num is left empty,or input other than number, clear all parameters
	if (num === null || typeof num === 'undefined' || typeof num === 'string' || typeof num === 'boolean') {
		inputs.forEach(function (input) {
			if (input instanceof InputSlotMorph) {
				input.setContents(null);
				// disable editing of input slots
				if (input.children[0] instanceof StringMorph) {
					input.children[0].isEditable = false;
				}
				input.getVarNamesDict = function(){}; // disable this function to avoid error
			}			
		});
	// else clear the slot at specific position
	} else {
		// check if the InputSlot specified by num actually exists/defined
		if (inputs[num] instanceof InputSlotMorph) {
			inputs[num].setContents(null);
		}
	}
}

// define function when accept button is clicked
HintDialogBoxMorph.prototype.rate = function () {
	Trace.log("HintDialogBox.rateClicked");
	
	//TODO log accept

	this.close();
}

// define function when decline button is clicked
HintDialogBoxMorph.prototype.otherHints = function () {
	Trace.log("HintDialogBox.otherHintsClicked");
	
	window.hintProvider.setDisplayEnabled(SnapDisplay, true);
	this.close();
}

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

// define close function
HintDialogBoxMorph.prototype.close = function() {
	Trace.log("HintDialogBox.closed");

	this.destroy();
}

// create labels for scripts frame
HintDialogBoxMorph.prototype.createLabels = function() {
	var shading = !MorphicPreferences.isFlat || this.is3D,
		myself = this,
		th = fontHeight(this.titleFontSize) + this.titlePadding * 2;
	
	if (this.labels) {
		this.labels.destroy();
	}
	// create a alignmentMorph to 
	this.labels = [new StringMorph(
            localize("Your Code"),
            this.titleFontSize,
            this.fontStyle,
            true,
            false,
            false,
            null,
            this.titleBarColor.darker(this.contrast)
        ),
		new StringMorph(
            localize("Suggested Code"),
            this.titleFontSize,
            this.fontStyle,
            true,
            false,
            false,
            null,
            this.titleBarColor.darker(this.contrast)
        )];
	
	this.labels.forEach(function(label) {
		label.color = new Color(0,0,0);
		label.drawNew();
		myself.add(label);
	});
}

// define HintDialogBoxMorph layout
HintDialogBoxMorph.prototype.fixLayout = function() {
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
		this.body.setTop(this.top()+this.padding+th+this.labels[0].height());
		
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
		this.labels[0].setTop(this.body.children[0].top() - this.labels[0].height()-4);
		this.labels[0].setLeft(this.body.children[0].left());
		this.labels[1].setTop(this.body.children[1].top() - this.labels[0].height()-4);
		this.labels[1].setLeft(this.body.children[1].left());
	}
}



// IntentionDialogMorph ////////////////////////////////////////

// IntentionDialogMorph inherits from DialogBoxMorph

IntentionDialogMorph.prototype = new DialogBoxMorph();
IntentionDialogMorph.prototype.constructor = IntentionDialogMorph;
IntentionDialogMorph.uber = DialogBoxMorph.prototype;

// Keep track of currently showing Intention Dialog
IntentionDialogMorph.showing = null;

// IntentionDialogMorph initialization

function IntentionDialogMorph(target) {
	this.init(target);
}

IntentionDialogMorph.prototype.destroy = function() {
	IntentionDialogMorph.uber.destroy.apply(this, arguments);
	if (IntentionDialogMorph.showing != this) {
		return;
	}
	IntentionDialogMorph.showing = null;
}

IntentionDialogMorph.prototype.init = function (target) {
	// declare local variables
	var txt;
	
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
	
	// add text field to body of dialog box
	txt = new InputFieldMorph(
            '',
            false, // numeric?
            null, // drop-down dict, optional
            false
        );
    txt.setWidth(250);
	this.addBody(txt);
	
	// add accept and decline button
	this.addButton('showHintBubbles','Show Suggestions');
	this.addButton('cancel','Cancel');
	
	// set layout
	this.fixExtent();
	this.fixLayout();
	Trace.log('IntentionDialog.init');
}

IntentionDialogMorph.prototype.fixExtent = function() {
	var minWidth = 0,
		minHeight = 0,
		th = fontHeight(this.titleFontSize) + this.titlePadding * 2;
	
	minHeight = th + this.body.height() + 3*this.padding + this.buttons.height() + this.labels.height();
	minWidth = Math.max(minWidth,this.body.width(),this.buttons.width())+2*this.padding;
	
	this.setExtent(new Point(minWidth,minHeight));
}

// create label for input field
IntentionDialogMorph.prototype.createLabels = function() {
	if (this.labels) {
		this.labels.destroy();
	}
	
	this.labels = new StringMorph(
            localize("What do you need help with?"),
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
}

// define function when Show Available Hints button is clicked
IntentionDialogMorph.prototype.showHintBubbles = function() {
	Trace.log("IntentionDialog.showAvailableHintsClicked",this.body.contents().text.text);
	
	window.hintProvider.clearDisplays();
	window.hintProvider.setDisplayEnabled(SnapDisplay, true);
	
	this.close();
}

// define function when cancel button is clicked
IntentionDialogMorph.prototype.cancel = function() {
	Trace.log("IntentionDialog.cancelClicked");
	
	//TODO: 
	
	this.close();
}

IntentionDialogMorph.prototype.close = function() {
	Trace.log("IntentionDialog.closed");

	this.destroy();
}

IntentionDialogMorph.prototype.popUp = function() {
	var minWidth = 0,
		minHeight = 0,
		th = fontHeight(this.titleFontSize) + this.titlePadding * 2,
		world = this.target.world();
	
	minHeight = th + this.body.height() + 3*this.padding + this.buttons.height() + this.labels.height();
	minWidth = Math.max(minWidth,this.body.width(),this.buttons.width())+2*this.padding;
	
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
	
	Trace.log("IntentionDialog.popUp");
}

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
		this.body.setCenter(this.center());
		this.body.setTop(this.top()+this.padding+th+this.labels.height());
		
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
		this.labels.setTop(this.body.top() - this.labels.height()-4);
		this.labels.setLeft(this.body.left());
	}
}

// Hint Button Action
IDE_Morph.prototype.getHint = function() {
	if (IntentionDialogMorph.showing) {
		return;
	}
	new IntentionDialogMorph(this).popUp();
}
