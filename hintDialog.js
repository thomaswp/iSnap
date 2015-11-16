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
function HintDialogBoxMorph(target,list) {
	this.init(target,list);
	this.loadHint(list);
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

// load hint to scripts Morph
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

// read a sequence of block morph
// pure sequence block without parameter
HintDialogBoxMorph.prototype.readBlocks = function (list) {
	var blck = null, //store the first hint block, init with null 
	list = ['forward','turn','turnLeft'];
	//read blocks and add to scripts
	if (list !== null) {
		for (var i = list.length; i >= 0; i -= 1) {
			if (blck === null) {
				blck = SpriteMorph.prototype.blockForSelector(list[i],true);
			} else {
				var secondBlock = blck;
				blck = SpriteMorph.prototype.blockForSelector(list[i],true);
				blck.nextBlock(secondBlock);
			}
		}
		
		//set block position
		blck.setPosition(new Point(20,20));
		scripts.add(blck);
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