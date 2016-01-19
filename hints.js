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
	this.lastHints = [];
	
	if (!displays) displays = [];
	if (!displays.length) displays = [displays];
	this.displays = displays;
	
	var myself = this;
	
	if (reloadCode) {
		window.onunload = function() {
			myself.saveCode();
		}
		
		myself.loadCode();
	}
	
	if (displays.length == 0 || !window.assignments) return;
	var assignment = window.assignments[window.assignmentID];
	if (!assignment || !assignment.hints) return;
	
	displays.forEach(function(display) {
		display.enabled = true;
	});
	
	Trace.onCodeChanged = function(code) {
		myself.clearDisplays();
		myself.code = code;
		myself.getHintsFromServer(code);
	}
	
	window.onWorldLoaded = function() {
		myself.displays.forEach(function(display) {
			if (display.initDisplay) display.initDisplay();
		});
	};
}

HintProvider.prototype.clearDisplays = function() {
	this.displays.forEach(function(display) {
		display.clear();
	});
}

HintProvider.prototype.getHintsFromServer = function() {
	if (!this.code) return;
	
    if (!this.displays.some(function(display) {
        return display.enabled;
    })) return;
    
	var myself = this;
	
	if (this.lastXHR) {
		// cancel the last hit request's callbacks
		this.lastXHR.onload = null;
		this.lastXHR.onerror = null;
	}
	
	this.clearDisplays();
	
	var xhr = createCORSRequest('POST', this.url + "?assignmentID=" + window.assignmentID);
	if (!xhr) {
        myself.showError("CORS not supported on this browser.");
		return;
	}
	this.lastXHR = xhr;
	
	// Response handlers.
	xhr.onload = function() {
		myself.processHints(xhr.responseText);
	};
	
	xhr.onerror = function(e) {
		myself.showError("Error contacting hint server!");
	};
	
	xhr.send(this.code);
}

HintProvider.prototype.showError = function(error) {
    Trace.log("Error", error)
    this.displays.forEach(function(display) {
        if (display.enabled) {
            display.showError(error);
        }
    });
}

HintProvider.prototype.processHints = function(json) {
	try {
        var hints = JSON.parse(json);
        Trace.log("HintProvider.processHints", hints);
        if (hints.length == 0) {
            this.displays.forEach(function(display) {
                if (display.enabled) {
                    try {
                        display.showNoHints();
                    } catch (e2) {
                        Trace.logError(e2);
                    }
                }
            });
        }
        for (var i = 0; i < hints.length; i++) {
            var hint = hints[i];
            this.displays.forEach(function(display) {
                if (display.enabled) {
                    try {
                        display.showHint(hint);
                    } catch (e2) {
                        Trace.logError(e2);
                    }
                }
            });
        }
        this.lastHints = hints;
	} catch (e) {
	   Trace.logError(e);
       return;
	}
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

HintProvider.prototype.setDisplayEnabled = function(displayType, enabled) {
	this.displays.forEach(function(display) {
		if (display instanceof displayType) {
			display.enabled = enabled;
			if (!enabled) {
				display.clear();
			}
		}
	});
    if (enabled) this.getHintsFromServer();
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

HintDisplay.prototype.showNoHints = function() {
    
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
}

DebugDisplay.prototype = Object.create(HintDisplay.prototype);

DebugDisplay.prototype.initDisplay = function() {
	document.body.appendChild(this.div);
}

DebugDisplay.prototype.showHint = function(hint) {
    if (hint.data.caution) {
        this.div.innerHTML += "*";
    }
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
	this.hintBars = [];
}

SnapDisplay.prototype = Object.create(HintDisplay.prototype);

SnapDisplay.prototype.initDisplay = function() {
	this.enabled = false;
	
	var createButton = function(ide) {
		var hintButton = new PushButtonMorph(
			ide,
			'getHint',
			'  ' + localize('Help') + '  '
		);
		ide.spriteBar.hintButton = hintButton;
		hintButton.fontSize = DialogBoxMorph.prototype.buttonFontSize;
		hintButton.corner = DialogBoxMorph.prototype.buttonCorner;
		hintButton.edge = DialogBoxMorph.prototype.buttonEdge;
		hintButton.outline = DialogBoxMorph.prototype.buttonOutline;
		hintButton.outlineColor = ide.spriteBar.color;
		hintButton.outlineGradient = false;
		hintButton.padding = DialogBoxMorph.prototype.buttonPadding;
		hintButton.contrast = DialogBoxMorph.prototype.buttonContrast;
		hintButton.drawNew();
		hintButton.fixLayout();
		hintButton.setPosition(new Point(
			ide.stage.left() - hintButton.width() - 20, 
			ide.spriteBar.hintButton.top() + 50));
	
		ide.spriteBar.hintButton = hintButton;
		ide.spriteBar.add(ide.spriteBar.hintButton);
	}   
	
	var oldFixLayout = IDE_Morph.prototype.fixLayout;
	IDE_Morph.prototype.fixLayout = function() {
		oldFixLayout.call(this, arguments);
		if (!this.spriteBar.hintButton) {
			createButton(this);
		};
        this.spriteBar.hintButton.setPosition(new Point(
			this.stage.left() - this.spriteBar.hintButton.width() - 20,
			this.spriteBar.hintButton.top()));
	}
	
	window.ide.fixLayout();
}

SnapDisplay.prototype.logHints = function() {
    return this.enabled;
}

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
    
	this.hintBars.forEach(function(bar) {
		var parent = bar.parent;
		parent.hintBar = null;
		bar.destroy();
        if (!parent) return;
		if (parent.getShadow) {
			if (parent.getShadow()) {
				parent.removeShadow();
				parent.addShadow();
			}
		}
        if (parent.cachedFullBounds) {
            parent.cachedFullBounds = parent.fullBounds();
        }
        if (parent.cachedFullImage) {
            parent.cachedFullImage = null;
            parent.cachedFullImage = parent.fullImageClassic();
        }
	});
	
	this.hintBars = [];
	window.ide.changed();
}

SnapDisplay.prototype.showHint = function(hint) {
	// console.log(hint);
    if (hint.data.caution) return;
	var root = this.getCode(hint.data.root);
	if (!root) return;
	var label = hint.data.root.label;
	var f = this["show" + label.charAt(0).toUpperCase() + label.slice(1) + "Hint"];
	if (!f) f = this.showBlockHint;
	f.call(this, root, hint.data.from, hint.data.to);
}

SnapDisplay.prototype.showNoHints = function() {
    var myself = this;
    this.createHintButton(window.ide.currentSprite.scripts, new Color(163, 73, 164), false, function() {
        Trace.log("SnapDisplay.showNoHints");
        myself.showMessageDialog("Everything looks good. No suggestions to report.", "No Suggestions");
    });
}

SnapDisplay.prototype.showStructureHint = function(root, from, to, scripts, map, postfix) {
	var myself = this;
	if (!postfix) postfix = "";
	for (var key in map) {
		if (!map.hasOwnProperty(key)) continue;
		
		var fromItems = this.countWhere(from, key);
		var toItems = this.countWhere(to, key);
		
		var message = null;
		if (fromItems > toItems) {
			message = "You may have too many " + map[key] + "s" + postfix + ".";
		} else if (fromItems < toItems) {
			message = "You may need another " + map[key] + postfix + ".";
		}
		
		if (message == null) continue;
		
        var rootType = null;
        var rootID = null;
        if (root instanceof SpriteMorph) {
            rootType = "sprite";
            rootID = root.name;
        } else if (root instanceof IDE_Morph) {
            rootType = "snapshot";
        } else if (root instanceof StageMorph) {
            rootType = "stage";
        }
        
		(function(message) {	
			myself.createHintButton(scripts, new Color(163, 73, 164), false, function() {
                Trace.log("SnapDisplay.showStructureHint", {
                    "rootType": rootType,
                    "rootID": rootID,
                    "message": message,
                    "from": from,
                    "to": to
                });
				myself.showMessageDialog(message, "Suggestion");
			});
		})(message);
	}
}

SnapDisplay.prototype.showSnapshotHint = function(root, from , to) {
	this.showStructureHint(root, from, to, window.ide.currentSprite.scripts, {
		"var": "global variable",
		"customBlock": "custom block"
	});
}

SnapDisplay.prototype.showCustomBlockHint = function(root, from , to) {
	
}

SnapDisplay.prototype.showStageHint = function(root, from , to) {
	this.showStructureHint(root, from, to, window.ide.currentSprite.scripts, {
		"sprite": "sprite"
	});
}

SnapDisplay.prototype.showSpriteHint = function(root, from , to) {
	this.showStructureHint(root, from, to, root.scripts, {
		"var": "variable",
		"script": "script",
		"customBlock": "custom block"
	}, " in this sprite");
}

SnapDisplay.prototype.countWhere = function(array, item) {
	var count = 0;
	for (var i = 0; i < array.length; i++) {
		if (array[i] == item) count++;
	}
	return count;
}

SnapDisplay.prototype.showScriptHint = function(root, from, to) {
	var block = root.parent;
	if (block.enclosingBlock) block = block.enclosingBlock();
	else block = null;
	
	var index = 0;
	if (block && block != root && block.inputs) {
		index = block.inputs().indexOf(root);
		if (index == -1) console.writeln("Bad index!");
	}
	
	var showHint = function() {
        var rootID = root ? root.id : null;
		var selector = block ? block.selector : null;
        var blockID = block ? block.id : null;
        Trace.log("SnapDisplay.showScriptHint", {
            "rootID": rootID,
            "parentSelector": selector,
            "parentID": blockID,
            "index": index,
            "from": from,
            "to": to
        });
		new HintDialogBoxMorph(window.ide).showScriptHint(selector, index, from, to);
	};
	
	// root.scriptHintCallback = function() {
	// 	showHint();
	// }
	
	this.createHintButton(root, new Color(255, 127, 29), true, showHint);
}

SnapDisplay.prototype.showBlockHint = function(root, from, to) {
	var block = root.enclosingBlock();
	var showHint = function() {
		var selector = block ? block.selector : null;
        var blockID = block ? block.id : null;
        Trace.log("SnapDisplay.showBlockHint", {
            "parentSelector": selector,
            "parentID": blockID,
            "from": from,
            "to": to
        });
		new HintDialogBoxMorph(window.ide).showBlockHint(selector, from, to);
	};
	
	this.createHintButton(root, new Color(34, 174, 76), false, showHint);
}

SnapDisplay.prototype.showMessageDialog = function(message, title) {
    new MessageHintDialogMorph(message, title, window.ide).popUp();
}

SnapDisplay.prototype.createHintButton = function(parent, color, script, callback) {
	if (parent == null) return;
	
	var hintBar;
	if (parent instanceof SyntaxElementMorph) {
		var topBlock = parent.topBlock();
		if (!topBlock) return;
		
		hintBar = topBlock.hintBar;
		if (hintBar == null) {
			hintBar = new HintBarMorph(topBlock);
			topBlock.hintBar = hintBar;
			this.hintBars.push(hintBar);
		}
		hintBar.setRight(topBlock.left() - 5);
		hintBar.setTop(topBlock.top());
	} else {
		var scripts = parent;
		hintBar = scripts.hintBar;
		if (hintBar == null) {
			hintBar = new HintBarMorph(scripts);
			scripts.hintBar = hintBar;
			this.hintBars.push(hintBar);
		}
		hintBar.setLeft(scripts.left() + 10);
		hintBar.setTop(scripts.top() + 20);
	}
	
	var button = new PushButtonMorph(hintBar, callback, new SymbolMorph("speechBubble", 14));
	button.labelColor = color;
	button.fixLayout();
	hintBar.addButton(button, parent, script);
}

if (window.getHintProvider && window.assignmentID) {
	window.hintProvider = window.getHintProvider();
}

SyntaxElementMorph.prototype.enclosingBlock = function() {
	var block = this;
	while (block && !(block instanceof BlockMorph)) {
		block = block.parent;
	}
	return block;
}

// BlockMorph.prototype.basicUserMenu = BlockMorph.prototype.userMenu;
// BlockMorph.prototype.userMenu = function() {
// 	var menu = this.basicUserMenu();
// 	var callback = this.topBlockInScript().scriptHintCallback; 
// 	if (callback) {
// 		menu.addItem(
// 			"Get Script Hint!",
// 			callback
// 		);
// 	}
// 	var inputs = this.inputs();
// 	for (var i = 0; i < inputs.length; i++) {
// 		callback = inputs[i].scriptHintCallback;
// 		if (callback) {
// 			menu.addItem(
// 				"Get Body Hint! (" + i + ")",
// 				callback
// 			);
// 		}
// 	}
// 	callback = this.blockHintCallback;
// 	if (callback) {
// 		menu.addItem(
// 			"Get Argument Hint!",
// 			callback
// 		);
// 	}
// 	return menu;
// }

BlockMorph.prototype.topBlockInScript = function() {
	if (this.parent.nextBlock && this.parent.nextBlock() == this) {
		return this.parent.topBlockInScript();
	}
	return this;
}

BlockMorph.prototype.addHighlightBasic = BlockMorph.prototype.addHighlight; 
BlockMorph.prototype.addHighlight = function() {
	var index = this.children.indexOf(this.hintBar);
	if (index >= 0) {
		this.children.splice(index, 1);
		var highlight = this.addHighlightBasic();
		this.children.splice(index, 0, this.hintBar);
		this.fullChanged();
		return highlight;
	} else {
		return this.addHighlightBasic();	
	}
}

BlockMorph.prototype.addSingleHighlight = function() {
	var children = this.children;
	this.children = [];
	var highlight = this.addHighlight(); 
	children.push(highlight);
	this.children = children;
	this.fullChanged();
	return highlight;
}

// We need block highlights not to intercept pointer events
BlockHighlightMorph.prototype.topMorphAt = function(point) {
	return null;
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

HintBarMorph.prototype.destroy = function() {
	HintBarMorph.uber.destroy.call(this);
	if (this.highlightBlock) {
		this.highlightBlock.removeHighlight();
	}
}

HintBarMorph.prototype.copy = function() {
    var copy = HintBarMorph.uber.copy.call(this);
    if (window.hintProvider) {
        window.hintProvider.displays.forEach(function(display) {
          if (display instanceof SnapDisplay) {
              display.hintBars.push(copy);
          }  
        });
    }
    return copy;
}

HintBarMorph.prototype.addButton = function(button, parent, script) {
	this.add(button);
	
	if (!(parent instanceof SyntaxElementMorph)) {
		// button.idealY = this.children.length * 20;
		this.layout();
		return;
	}
	
	while (parent instanceof ArgMorph) {
		parent = parent.parent;
	}
	button.idealY = parent.top() - parent.topBlock().top();
	
	this.layout();
	
	if (!parent.addHighlight) {
		console.log(parent);
		return;
	}
	
	var myself = this;
	var oldMouseEnter = button.mouseEnter;
	button.mouseEnter = function() {
		oldMouseEnter.call(button);
		myself.updateHighlight(parent, script, true);
	}
	
	var oldMouseLeave = button.mouseLeave;
	button.mouseLeave = function() {
		oldMouseLeave.call(button);
		myself.updateHighlight(parent, script, false);
	}
}

HintBarMorph.prototype.updateHighlight = function(block, script, hovering) {
	if (!hovering && this.highlightBlock == block) {
		block.removeHighlight();
		this.highlightBlock = null;
	}
	
	if (hovering) {
		if (this.highlightBlock) {
			if (this.highlightBlock == block) {
				return;
			} else {
				this.highlightBlock.removeHighlight();
			}
		}
		this.highlightBlock = block;
		if (script) {
			block.addHighlight();
		} else {
			block.addSingleHighlight();
		}
	}
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
			var minY = lastChild.bottom() + 3;
			var minX = lastChild.left() - 3;
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