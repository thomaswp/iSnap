// hintDialog.js
// This file serves to test custom dialogue box.
// Specifically, hint dialogue with ScriptMorph
// Reference: BlockEditorMorph in byob.js

// Declarations
var HintDialogBoxMorph;

// HintDialogBox inherits from DialogBoxMorph
HintDialogBoxMorph.prototype = new DialogBoxMorph();
HintDialogBoxMorph.prototype.constructor = HintDialogBoxMorph;
HintDialogBoxMorph.uber = DialogBoxMorph.prototype;

// Keep track of the currently showing hint dialogue box
HintDialogBoxMorph.showing = null;

// HintDialogBoxMorph instance creation
function HintDialogBoxMorph(target) {
	this.init(target);
	// this.showScriptHint('doUntil',1,['doSayFor','doAsk','forward','doAsk']);
	// this.loadHint(list);
	// this.test();
}

HintDialogBoxMorph.prototype.destoy = function() {
	HintDialogBoxMorph.uber.destroy.apply(this, arguments);
	if (HintDialogBoxMorph.showing != this)
		return;
	HintDialogBoxMorph.showing = null;
}

HintDialogBoxMorph.prototype.test = function() {
	var list = ['doSayFor',['move','forward']];
	
	console.log(list[0].length);
	console.log(typeof list[0]);
	console.log(list[1].length);
	console.log(typeof list[1]);
	
	console.log(this.body.contents.children[0]);
}

HintDialogBoxMorph.prototype.init = function(target,list) {
	var scripts,  
		scriptsFrame,
		myself = this;
	
	//Trace.log("HintDialogBox.start",null);
	
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
	this.labelString = 'Magical Hint!!!';
	this.createLabel();
		
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
    scripts.scrollFrame = scriptsFrame;
	scripts.acceptsDrops = false; //does not allow edit
	
	// add elements to dialogue box
	this.addBody(scriptsFrame);
	this.addButton('accept','Good one!');
	this.addButton('decline','I don\'t think so...');
	
	// set layout
	this.setExtent(new Point(500,400));
	this.fixLayout();
	//scripts.fixMultiArgs();

}

// interface for showing hint for a single block
// showBlockHint("doUntil", 0, "literal")
HintDialogBoxMorph.prototype.showBlockHint = function (arg1, arg2, arg3) {
	var blck1,	//corresponding to arg1
		blck2;	//corresponding to arg3
	
	// check if arg1 is valid	
	if (arg1 === null || typeof arg1 === 'undefined') {
		console.log('bad arg 1 in HintDialogBoxMorph.prototype.showBlockHint: 1');
		return;
	}
	// check if arg2 is valid
	if (arg2 === null || typeof arg2 === 'undefined') {
		console.log('bad arg 2 in HintDialogBoxMorph.prototype.showBlockHint: 1');
		return;
	}
	// check if arg3 is valid
	if (arg3 === null || typeof arg3 === 'undefined') {
		console.log('bad arg 3 in HintDialogBoxMorph.prototype.showBlockHint: 1');
		return;
	}
	
	// get blck1, blck2 with arg1, arg3 from blockForSelector
	blck1 = SpriteMorph.prototype.blockForSelector(arg1, true);
	blck2 = SpriteMorph.prototype.blockForSelector(arg3, true);
	
	// blck1 is null means arg1 is incorrect
	if (blck1 === null) {
		console.log('bad arg 1 in HintDialogBoxMorph.prototype.showBlockHint: 2');
		return;
	}
	
	// blck2 is null means arg3 is incorrect
	if (blck2 === null) {
		console.log('bad arg 3 in HintDialogBoxMorph.prototype.showBlockHint: 2');
		return;
	}
	
	// means no corresponding input child at arg2
	if (typeof blck1.inputs()[arg2] === 'undefined') {
		console.log('bad arg 2 in HintDialogBoxMorph.prototype.showBlockHint: 2');
		return;
	}
	
	// return if corresponding input is not a InputSlotMorph
	// ??? how to get _proto_ from an object?
	if (blck1.inputs()[arg2] instanceof CSlotMorph) {
		console.log('bad arg 2 in HintDialogBoxMorph.prototype.showBlockHint: 3');
		return;
	}
	
	blck1.inputs()[arg2].parent.silentReplaceInput(blck1.inputs()[arg2],blck2);
	
	// set block position
	blck1.setPosition(new Point(30,60));
		
	this.body.contents.add(blck1);
	this.body.contents.changed();
	
	this.popUp();
}

// interface for showing hint for a script(sequence of blocks)
// showScriptHint("doUntil", 1, ["doMove"])
HintDialogBoxMorph.prototype.showScriptHint = function (arg1, arg2, arg3) {
	var blck1, // correspond to arg1
		blck2; // correspond to arg3
	
	// if arg1 is null, it means no nesting, e.g. doUntil
	if (arg1 === null) {
		// get corresponding blck2 from arg3
		blck2 = this.readBlocks(arg3); //readBlocks can read a sequence of block and return the top one.
		
		// check if get blck2 correctly
		if (blck2 === null) {
			console.log('bad arg3 in HintDialogBoxMorph.prototype.loadScriptHint: 1');
			return;
		}		
		
		//set block position
		blck2.setPosition(new Point(30,60));
			
		this.body.contents.add(blck2);
		this.body.contents.changed();
	// if arg1 is not null, there is nesting
	} else {
		// get corresponding blck1 from arg1
		blck1 = SpriteMorph.prototype.blockForSelector(arg1, true);
		
		// get corresponding blck2 from arg3
		blck2 = this.readBlocks(arg3);
		
		// check if get blck1 correctly
		if (blck1 === null) {
			console.log('bad arg1 in HintDialogBoxMorph.prototype.loadScriptHint: 1');
			return;
		}
		
		//check if get blck2 correctly
		if (blck2 === null) {
			console.log('bad arg2 in HintDialogBoxMorph.prototype.loadScriptHint: 2');
			return;
		}
		
		// if the number arg2 child is a CSlotMorph, then it is a nested structure
		if (blck1.inputs()[arg2] instanceof CSlotMorph) {
			blck1.inputs()[arg2].nestedBlock(blck2);
		// else, it is parameter input
		} else {
			blck1.inputs()[arg2].parent.silentReplaceInput(blck1.inputs()[arg2],blck2);
		}
		
		// set block position
		blck1.setPosition(new Point(30,60));
		
		this.body.contents.add(blck1);
		this.body.contents.changed();
	}
	this.popUp();
}


// load hint to nested Morph (for testing purpose)
// referencing this.body.contents.children
HintDialogBoxMorph.prototype.loadHint = function (list) {
	list = ['doUntil','reportTrue','forward'];
	
	var holderBlock = SpriteMorph.prototype.blockForSelector(list[0],true);
	var reporter = SpriteMorph.prototype.blockForSelector(list[1],true);
	var csBlocks = SpriteMorph.prototype.blockForSelector(list[2],true);
	
	holderBlock.children[2].parent.silentReplaceInput(holderBlock.children[2],reporter);
	
	holderBlock.children[3].nestedBlock(csBlocks);
	
	holderBlock.setPosition(new Point(40,80));
	
	this.body.contents.add(holderBlock);
	this.body.contents.changed();
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
				blck = SpriteMorph.prototype.blockForSelector(list[i],true);
				this.clearParameter(blck);
			} else {
				var secondBlock = blck;
				blck = SpriteMorph.prototype.blockForSelector(list[i],true);
				this.clearParameter(blck);
				blck.nextBlock(secondBlock);
			}
		}

		return blck;
	}
}

// clear specific/all parameter input in a blck
// num is the 
HintDialogBoxMorph.prototype.clearParameter = function (blck,num) {
	// if num is left empty,or input other than number, clear all parameters
	if (num === null || typeof num === 'undefined' || typeof num === 'string' || typeof num === 'boolean') {
		blck.inputs().forEach(function (input) {
			input.setContents(null);
		});
	// else clear the slot at specific position
	} else {
		// check if the InputSlot specified by num actually exists/defined
		if (blck.inputs()[num] instanceof InputSlotMorph) {
			blck.inputs()[num].setContents(null);
		}
	}
}


// define function when accept button is clicked
HintDialogBoxMorph.prototype.accept = function () {
	Trace.log("HintDialog.accept");
	
	//TODO log accept
	
	this.close();
}

// define function when decline button is clicked
HintDialogBoxMorph.prototype.decline = function () {
	Trace.log("HintDialog.decline");
	
	//TODO log decline;
	
	this.close();
}

// define popUp function
HintDialogBoxMorph.prototype.popUp = function () {
    var world = this.target.world();

    if (world) {
        HintDialogBoxMorph.uber.popUp.call(this, world);
        this.handle = new HandleMorph(
            this,
            280,
            220,
            this.corner,
            this.corner
        );
    }
};

// define close function
HintDialogBoxMorph.prototype.close = function() {
	// set showing to null, indicating not showing
	HintDialogBoxMorph.showing = null;
	this.destroy();
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
    }

    if (this.label) {
        this.label.setCenter(this.center());
        this.label.setTop(this.top() + (th - this.label.height()) / 2);
    }

    if (this.buttons && (this.buttons.children.length > 0)) {
        this.buttons.setCenter(this.center());
        this.buttons.setBottom(this.bottom() - this.padding);
    }
}