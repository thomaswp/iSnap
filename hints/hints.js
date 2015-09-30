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
		var cssMap = {
			"+": "plus",
			"=": "equals",
			"-": "minus",
		}
		for (var i = 0; i < hints.length; i++) {
			if (html.length > 0) html += "<div/>";
			var hint = hints[i];
			var matchRegex = /:|\[|\]|,|\s|\w*/g
			var code0 = hint.from.match(matchRegex);
			var code1 = hint.to.match(matchRegex);
			var codeDiff = diff(code0, code1);
			html += "<span class='hint'>";
			html += "[{0},{1}]: ".format(hint.context, hint.quality);
			for (var j = 0; j < codeDiff.length; j++) {
				var block = cssMap[codeDiff[j][0]];
				var code = codeDiff[j][1].join("");
				html += "<code class={0}>{1}</code>".format(block, code);
			}
			html += "</span>";
		}
		return html;
	} catch (e) {
		return "Error parsing hints: " + e;
	}
}

function getHint(code) {
	if (!code) return;
	
	// All HTML5 Rocks properties support CORS.
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