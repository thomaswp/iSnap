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
	Trace.storeMessages = function(logs) {
		var code = null;
		logs.forEach(function(log) {
			if (log.code) {
				code = log.code;
			}
		});
		myself.getHintsFromServer(code);
	}
}

HintProvider.prototype.getHintsFromServer = function(code) {
	if (!code) return;
	
	var myself = this;
	
	myself.displays.forEach(function(display) {
		display.clear();
	});
	
	var xhr = createCORSRequest('POST', this.url);
	if (!xhr) {
		myself.displays.forEach(function(display) {
			display.showError("CORS not supported on this browser.");
		});
		return;
	}
	
	// Response handlers.
	xhr.onload = function() {
		myself.processHints(xhr.responseText);
	};
	
	xhr.onerror = function(e) {
		myself.displays.forEach(function(display) {
			display.showError(e);
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
	//	display.showError(e);
	//}
}

HintProvider.prototype.getCode = function(ref) {
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

// HintDisplay: outputs hitns to the console

function HintDisplay() { }

HintDisplay.prototype.showHint = function(hint) {
	console.log(hint.from + " -> " + hint.to);
}

HintDisplay.prototype.showError = function(error) {
	console.error("Error contacting Hint Server!");
	if (error) console.error(error);
}

HintDisplay.prototype.clear = function() {
	console.log("Receiving Hints:");
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
	
}

SnapDisplay.prototype = Object.create(HintDisplay.prototype);



if (window.getHintProvider) {
	window.hintProvider = window.getHintProvider();
}