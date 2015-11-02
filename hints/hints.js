function onSnapLoaded() {
	var snap = document.getElementById("snap");
	snap.contentWindow.Trace.storeMessages = function(logs) {
		var code = null;
		logs.forEach(function(log) {
			if (log.code) {
				code = log.code;
			}
		});
		getHint(code);
	}
}

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

function getHintHtml(json) {
	try {
		var hints = JSON.parse(json);
		var html = "";
		for (var i = 0; i < hints.length; i++) {
			if (html.length > 0) html += "<div/>";
			var hint = hints[i];
			html += createDiff(hint.from, hint.to, hint.context, hint.quality);
			
		}
		return html;
	} catch (e) {
		return "Error parsing hints: " + e;
	}
}

function createDiff(from, to, context, quality) {
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
	html += "[{0},{1}]: ".format(context, quality);
	for (var j = 0; j < codeDiff.length; j++) {
		var block = cssMap[codeDiff[j][0]];
		var code = codeDiff[j][1].join("");
		html += "<code class={0}>{1}</code>".format(block, code);
	}
	html += "</span>";
	return html;
}

function getHint(code) {
	if (!code) return;
	
	var url = 'http://{0}:8080/HintServer/hints'.format(location.hostname);
	
	var hintDiv = document.getElementById("hint");
	
	var xhr = createCORSRequest('POST', url);
	if (!xhr) {
		hintDiv.innerHTML = "CORS not supported on this browser.";
		return;
	}
	
	// Response handlers.
	xhr.onload = function() {
		hintDiv.innerHTML = getHintHtml(xhr.responseText);
	};
	
	xhr.onerror = function(e) {
		console.log(e);
		hintDiv.innerHTML = "Error contacting hint server.";
	};
	
	xhr.send(code);
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

function getCode(ref) {
	if (ref.parent == null) {
		return window.ide;
	}
	
	var parent = getCode(ref.parent);
	var label = ref.label;
	
	switch (label) {
		case "stage": return parent.stage;
		case "sprite": return parent.children[ref.index];
		case "script":
			if (ref.parent.label == "sprite") 
				return parent.scripts.children[ref.index];
			return parent.getInputs()[ref.index].children[0];
		case "var":
			if (ref.parent.label == "snapshot")
				return "?";
			return parent.variables.vars;
	}
}