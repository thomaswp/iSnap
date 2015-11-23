// hints.js
// Contacts the a server for Hint and provides them to the user
// Configure in hints/config.js

// Helper Functions

// credit: http://www.html5rocks.com/en/tutorials/cors/
function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {

    // Check if the XMLHttpRequest object has a "withCredentials" property.
    // "withCredentials" only exists on XMLHTTPRequest2 objects.
    xhr.open(method, url, true);

  } else if (typeof XDomainRequest != "undefined") {

    // Otherwise, check if XDomainRequest.
    // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
    xhr = new XDomainRequest();
    xhr.open(method, url);

  } else {

    // Otherwise, CORS is not supported by the browser.
    xhr = null;

  }
  return xhr;
}

// credit: http://stackoverflow.com/a/4673436
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

// HintProvider

function HintProvider(url, displays, reloadCode) {
	this.init(url, displays, reloadCode);
}

HintProvider.prototype.init = function(url, displays, reloadCode) {
	this.url = url;
	
	if (!displays) displays = [];
	if (!displays.length) displays = [displays];
	this.displays = displays;
	
	var myself = this;
	Trace.onCodeChanged = function(code) {
		myself.clearDisplays();
		myself.code = code;
		myself.getHintsFromServer(code);
	}
	
	if (reloadCode) {
		window.onunload = function() {
			myself.saveCode();
		}
		
		myself.loadCode();
	}
}

HintProvider.prototype.clearDisplays = function() {
	this.displays.forEach(function(display) {
		display.clear();
	});
}

HintProvider.prototype.getHintsFromServer = function() {
	if (!this.code) return;
	
	var myself = this;
	
	if (this.lastXHR) {
		// cancel the last hit request's callbacks
		this.lastXHR.onload = null;
		this.lastXHR.onerror = null;
	}
	
	this.clearDisplays();
	
	var xhr = createCORSRequest('POST', this.url + "?assignmentID=" + window.assignmentID);
	if (!xhr) {
		myself.displays.forEach(function(display) {
			display.showError("CORS not supported on this browser.");
		});
		return;
	}
	this.lastXHR = xhr;
	
	// Response handlers.
	xhr.onload = function() {
		myself.processHints(xhr.responseText);
	};
	
	xhr.onerror = function(e) {
		myself.displays.forEach(function(display) {
			display.showError("Error contacting hint server!");
		});
	};
	
	xhr.send(this.code);
}

HintProvider.prototype.processHints = function(json) {
	//try {
		var hints = JSON.parse(json);
		for (var i = 0; i < hints.length; i++) {
			var hint = hints[i];
			// console.log(hint.from);
			// console.log(this.getCode(hint.data));
			this.displays.forEach(function(display) {
				display.showHint(hint);
			});
		}
	//} catch (e) {
	//  display.showError("Error parsing hint!");
	//	display.showError(e);
	//}
}

HintProvider.prototype.saveCode = function() {
	if (typeof(Storage) !== "undefined" && localStorage) {
		localStorage.setItem("lastCode", this.code);
    }
}

HintProvider.prototype.loadCode = function() {
	if (typeof(Storage) !== "undefined" && localStorage) {
		var code = localStorage.getItem("lastCode");
		if (code) {
			if (window.ide) {
				window.ide.droppedText(code);
			} else {
				var myself = this;
				setTimeout(function() {
					myself.loadCode();
				}, 100);
			}
		}
	}
}

// HintDisplay: outputs hitns to the console

function HintDisplay() { }

HintDisplay.prototype.showHint = function(hint) {
	console.log(hint.from + " -> " + hint.to);
}

HintDisplay.prototype.showError = function(error) {
	console.error(error);
}

HintDisplay.prototype.clear = function() {
	console.log("-----------------------------------------");
}

// DebugDisplay: outputs hints to a div

function DebugDisplay() { 
	var div = document.createElement("div");
	div.classList.add("debug");
	this.div = div;
	
	// Add simplediff
	var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = "hints/simplediff/simplediff.min.js";
    head.appendChild(script);
	
	setTimeout(function() {
		document.body.appendChild(div);
	}, 1);
}

DebugDisplay.prototype = Object.create(HintDisplay.prototype);

DebugDisplay.prototype.showHint = function(hint) {
	this.div.innerHTML += this.createDiff(hint.from, hint.to) + "<br />";
}

DebugDisplay.prototype.showError = function(error) {
	if (error.message) error = error.message
	this.div.innerHTML = error;
}

DebugDisplay.prototype.clear = function() {
	this.div.innerHTML = "";
}

DebugDisplay.prototype.createDiff = function(from, to) {
	var cssMap = {
		"+": "plus",
		"=": "equals",
		"-": "minus",
	};
	var matchRegex = /:|\[|\]|,|\s|\w*/g;
	var code0 = from.match(matchRegex);
	var code1 = to.match(matchRegex);
	var codeDiff = window.diff(code0, code1);
	var html = "<span class='hint'>";
	for (var j = 0; j < codeDiff.length; j++) {
		var block = cssMap[codeDiff[j][0]];
		var code = codeDiff[j][1].join("");
		html += "<code class={0}>{1}</code>".format(block, code);
	}
	html += "</span>";
	return html;
}

function SnapDisplay() {
	this.buttons = [];
	this.hintBars = [];
}

SnapDisplay.prototype = Object.create(HintDisplay.prototype);

SnapDisplay.prototype.getCode = function(ref) {
	if (ref.parent == null) {
		return window.ide;
	}
	
	var parent = this.getCode(ref.parent);
		
	var label = ref.label;
	var index = ref.index;
	
	switch (ref.parent.label) {
		case "snapshot":
			if (label == "stage")
				return parent.stage;
			else if (label == "customBlock")
				return parent.stage.globalBlocks[index - 1];
			else if (label == "var") 
				return parent.globalVariables.vars;
			break;
		case "stage":
			if (label == "sprite") return parent.children[index];
		case "sprite":
			var nVars = Object.keys(parent.variables.vars).length;
			var nScripts = parent.scripts.children.length;
			if (label == "var")
				return parent.variables.vars;
			else if (label == "script")
				return parent.scripts.children[index - nVars];
			else if (label == "customBlock")
				return parent.customBlocks[index - nVars - nScripts];
			break;
		case "script":
			var block = parent;
			if (block._debugType == "CSlotMorph") block = block.children[0];
			for (var i = 0; i < index; i++) block = block.nextBlock();
			return block;
		case "customBlock":
			return parent.scripts[index];
		default:
			return parent.inputs()[index];
	}
}

SnapDisplay.prototype.clear = function() { 
	// this.buttons.forEach(function(b) {
	// 	b.hide();
	// 	b.fullChanged();
	// });
	// this.buttons = [];
	
	this.hintBars.forEach(function(bar) {
		var parent = bar.parent;
		parent.hintBar = null;
		bar.destroy();
		if (parent && parent.getShadow) {
			if (parent.getShadow()) {
				parent.removeShadow();
				parent.addShadow();
			}
		}
	});
	
	this.hintBars = [];
	window.ide.changed();
}

SnapDisplay.prototype.showHint = function(hint) {
	// console.log(hint);
	var root = this.getCode(hint.data.root);
	if (!root) return;
	var label = hint.data.root.label;
	var f = this["show" + label.charAt(0).toUpperCase() + label.slice(1) + "Hint"];
	if (!f) f = this.showBlockHint;
	f.call(this, root, hint.data.from, hint.data.to);
}

SnapDisplay.prototype.showSnapshotHint = function(root, from , to) {
	
}

SnapDisplay.prototype.showCustomBlockHint = function(root, from , to) {
	
}

SnapDisplay.prototype.showStageHint = function(root, from , to) {
	
}

SnapDisplay.prototype.showSpriteHint = function(root, from , to) {
	
}

SnapDisplay.prototype.showScriptHint = function(root, from , to) {
	root.scriptHintCallback = function() {
		console.log("Clicked script hint: " + from + " -> " + to);
	}
	
	this.createHintButton(root, new Color(255, 127, 29), function() {
		console.log("Clicked script hint: " + from + " -> " + to);
	});
}

SnapDisplay.prototype.showBlockHint = function(root, from , to) {
	root.blockHintCallback = function() {
		console.log("Clicked block hint: " + from + " -> " + to);
	}
	
	this.createHintButton(root, new Color(34, 174, 76), function() {
		console.log("Clicked script hint: " + from + " -> " + to);
	});
}

SnapDisplay.prototype.createHintButton = function(parent, color, callback) {
	// for (var i = 0; i < this.buttons.length; i++) {
	// 	if (this.buttons[i].parent == parent) {
	// 		this.buttons[i].callback = callback;
	// 		this.buttons[i].show();
	// 		return;
	// 	}
	// }
	
	var topBlock = parent.topBlock();
	if (!topBlock) return;
	
	var hintBar = topBlock.hintBar;
	if (hintBar == null) {
		hintBar = new HintBarMorph(topBlock);
		topBlock.hintBar = hintBar;
	}
	hintBar.setRight(topBlock.left() - 5);
	hintBar.setTop(topBlock.top());
	this.hintBars.push(hintBar);
	
	var button = new PushButtonMorph(hintBar, callback, new SymbolMorph("speechBubble", 14));
	button.labelColor = color;
	button.idealY = parent.top() - topBlock.top();
	button.fixLayout();
	hintBar.add(button);
	hintBar.layout();
	
	// this.buttons.push(button);
}

if (window.getHintProvider && window.assignmentID) {
	window.hintProvider = window.getHintProvider();
}

BlockMorph.prototype.basicUserMenu = BlockMorph.prototype.userMenu;
BlockMorph.prototype.userMenu = function() {
	var menu = this.basicUserMenu();
	var callback = this.topBlockInScript().scriptHintCallback; 
	if (callback) {
		menu.addItem(
			"Get Script Hint!",
			callback
		);
	}
	var inputs = this.inputs();
	for (var i = 0; i < inputs.length; i++) {
		callback = inputs[i].scriptHintCallback;
		if (callback) {
			menu.addItem(
				"Get Body Hint! (" + i + ")",
				callback
			);
		}
	}
	callback = this.blockHintCallback;
	if (callback) {
		menu.addItem(
			"Get Argument Hint!",
			callback
		);
	}
	return menu;
}

BlockMorph.prototype.topBlockInScript = function() {
	if (this.parent.nextBlock && this.parent.nextBlock() == this) {
		return this.parent.topBlockInScript();
	}
	return this;
}

// BlockMorph.prototype.mouseEnter = function() {
// 	if (this.blockHintCallback != null) {
// 		if (this.hintHighlight == null) {
// 			this.hintHighlight = this.addHighlight();
// 			this.fullChanged();
// 			console.log("Added highlight");
// 		}
// 	}
// }

// BlockMorph.prototype.mouseLeave = function() {
// 	if (this.hintHighlight) {
// 		this.removeChild(this.hintHighlight);
// 		this.hintHighlight.fullChanged();
// 		this.hintHighlight = null;
// 		this.fullChanged();
// 		console.log("Removed highlight");
// 	}
// }

function HintButtonMorph() {
	this.idealY = 0;
}

HintButtonMorph.prototype = Object.create(PushButtonMorph.prototype);

function HintBarMorph(parent) {
	this.init(parent);
}

HintBarMorph.prototype = Object.create(Morph.prototype);
HintBarMorph.prototype.constructor = HintBarMorph;
HintBarMorph.uber = Morph.prototype;

HintBarMorph.prototype.init = function(parent) {
	HintBarMorph.uber.init.call(this);
	this.color = new Color(0, 0, 0, 0);
	if (parent) parent.add(this);
}

HintBarMorph.prototype.drawNew = function() {
	this.image = newCanvas(this.extent());
}

HintBarMorph.prototype.layout = function(now) {
	if (!now) {
		if (!this.scheduledLayout) {
			this.scheduledLayout = true;
			var myself = this;
			setTimeout(function() {
				myself.scheduledLayout = false;
				myself.layout(true);
			}, 0);
		}
		return;
	}
	
	// console.log("layout");
	
	this.children.sort(function(a, b) {
		return (a.idealY || 0) - (b.idealY || 0);
	});
	var bottom = 0, left = this.right();
	for (var i = 0; i < this.children.length; i++) {
		var child = this.children[i];
		var idealY = this.top() + (child.idealY || 0);
		child.setRight(this.right());
		child.setTop(idealY);
		for (var j = i - 1; j >= 0; j--) {
			var lastChild = this.children[i - 1];
			var minY = lastChild.bottom() + 5;
			var minX = lastChild.left() - 5;
			if (Math.abs(child.idealY - lastChild.idealY) < 15) {
				child.setRight(minX);
				child.setTop(lastChild.top());
				// console.log(i + " right: " + minX);
			} else if (idealY < minY) {
				child.setTop(minY);
				// console.log(i + " top: " + minY);
			}
			break;
		}
		bottom = Math.max(bottom, child.bottom());
		left = Math.min(left, child.left());
	}
	// this.setLeft(left);
	// var right = this.right();
	// this.setExtent(new Point(right - left, bottom - this.top()));
	// this.setRight(right);
	// this.fullChanged();
}