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

function getHint(code) {
	if (!code) return;
	
	// All HTML5 Rocks properties support CORS.
	var url = 'http://localhost:8080/HintServer/hints';
	
	var hintDiv = document.getElementById("hint");
	
	var xhr = createCORSRequest('POST', url);
	if (!xhr) {
		hintDiv.innerHTML = "CORS not supported on this browser.";
		return;
	}
	
	// Response handlers.
	xhr.onload = function() {
		hintDiv.innerHTML = xhr.responseText;
	};
	
	xhr.onerror = function(e) {
		console.log(e);
		hintDiv.innerHTML = "Error contacting hint server.";
	};
	
	xhr.send(code);
}