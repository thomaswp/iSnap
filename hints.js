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

function HintProvider(url, displays) {
	this.init(url, displays);
}

HintProvider.prototype.init = function(url, displays) {
	this.url = url;
	
	if (!displays) displays = [];
	if (!displays.length) displays = [displays];
	this.displays = displays;
	
	var myself = this;
	Trace.onCodeChanged = function(code) {
		myself.getHintsFromServer(code);
	}
}

HintProvider.prototype.getHintsFromServer = function(code) {
	if (!code) return;
	
	var myself = this;
	
	if (this.lastXHR) {
		// cancel the last hit request's callbacks
		this.lastXHR.onload = null;
		this.lastXHR.onerror = null;
	}
	
	myself.displays.forEach(function(display) {
		display.clear();
	});
	
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
	
	xhr.send(code);
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
	this.buttons.forEach(function(b) {
		// b.hide();
	});
	// this.buttons = [];
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
	
	// this.createHintButton(root, function() {
	// 	console.log("Clicked script hint: " + from + " -> " + to);
	// });
}

SnapDisplay.prototype.showBlockHint = function(root, from , to) {
	root.blockHintCallback = function() {
		console.log("Clicked block hint: " + from + " -> " + to);
	}
}

SnapDisplay.prototype.createHintButton = function(parent, callback) {
	for (var i = 0; i < this.buttons.length; i++) {
		if (this.buttons[i].parent == parent) {
			this.buttons[i].callback = callback;
			return;
		}
	}
	
	var button = new PushButtonMorph(null, callback, new SymbolMorph("speechBubble", 20));
	parent.add(button);
	
	button.labelColor = new Color(200, 170, 11);
	button.setLeft(parent.left() - 40);
	button.setTop(parent.top() + 5);
	button.fixLayout();
	
	this.buttons.push(button);
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

BlockMorph.prototype.mouseEnter = function() {
	if (this.blockHintCallback != null) {
		this.blockHintCallback();
	}
}

BlockMorph.prototype.mouseLeave = function() {
	if (0) {
		
	}
}

function HintButtonMorph() {
	
}

HintButtonMorph.prototype = Object.create(PushButtonMorph.prototype);