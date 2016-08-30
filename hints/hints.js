// hints.js
// Contacts the a server for Hint and provides them to the user
// Configure in hints/config.js

// Helper Functions

// credit: http://www.html5rocks.com/en/tutorials/cors/
function createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest();
    if ('withCredentials' in xhr) {
        // Check if the XMLHttpRequest object has a "withCredentials" property.
        // "withCredentials" only exists on XMLHTTPRequest2 objects.
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != 'undefined') {
        // Otherwise, check if XDomainRequest.
        // XDomainRequest only exists in IE, and is IE's way of making CORS
        // requests
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
                ? args[number] : match;
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
    this.requestNumber = 0;
    this.reloadCode = reloadCode;

    if (!displays) displays = [];
    if (!displays.length) displays = [displays];
    this.displays = displays;

    var myself = this;

    if (reloadCode) {
        window.onunload = function() {
            myself.saveCode();
        };

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
    };

    window.onWorldLoaded = function() {
        myself.displays.forEach(function(display) {
            if (display.initDisplay) display.initDisplay();
        });
    };
};

HintProvider.prototype.clearDisplays = function() {
    this.displays.forEach(function(display) {
        display.clear();
    });
};

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

    var xhr = createCORSRequest('POST',
        this.url + '?assignmentID=' + window.assignmentID);
    if (!xhr) {
        myself.showError('CORS not supported on this browser.');
        return;
    }
    this.lastXHR = xhr;

    // Response handlers.
    var requestNumber = ++this.requestNumber;
    xhr.onload = function() {
        myself.processHints(xhr.responseText, requestNumber);
    };

    xhr.onerror = function(e) {
        myself.showError('Error contacting hint server!');
    };

    xhr.send(this.code);
};

HintProvider.prototype.showError = function(error) {
    Trace.logErrorMessage(error);
    this.displays.forEach(function(display) {
        if (display.enabled) {
            display.showError(error);
        }
    });
};

HintProvider.prototype.processHints = function(json, requestNumber) {
    try {
        var hints = JSON.parse(json);
        Trace.log('HintProvider.processHints', hints);
        // If a more recent request has been fired, wait on that one
        // This is below the log statement because if we have pending code
        // changes to log, they'll flush and call a new request, and this one
        // should then be ignored.
        if (this.requestNumber != requestNumber) return;
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
        this.displays.forEach(function(display) {
            if (display.enabled) {
                try {
                    display.finishedHints();
                } catch (e2) {
                    Trace.logError(e2);
                }
            }
        });
        this.lastHints = hints;
    } catch (e) {
        Trace.logError(e);
    }
};

HintProvider.prototype.saveCode = function() {
    if (typeof(Storage) !== 'undefined' && localStorage && this.code) {
        localStorage.setItem('lastCode-' + window.assignmentID, this.code);
    }
};

HintProvider.prototype.loadCode = function() {
    if (typeof(Storage) !== 'undefined' && localStorage) {
        var code = localStorage.getItem('lastCode-' + window.assignmentID);
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
};

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
};

// HintDisplay: outputs hitns to the console

function HintDisplay() { }

HintDisplay.prototype.showHint = function(hint) {
    // eslint-disable-next-line no-console
    console.log(hint.from + ' -> ' + hint.to);
};

HintDisplay.prototype.showError = function(error) {
    // eslint-disable-next-line no-console
    console.error(error);
};

HintDisplay.prototype.clear = function() {
    // eslint-disable-next-line no-console
    console.log('-----------------------------------------');
};

HintDisplay.prototype.finishedHints = function() {

};

// DebugDisplay: outputs hints to a div

function DebugDisplay() {
    this.savedHints = {};

    var outer = document.createElement('div');
    outer.classList.add('debug');
    this.outer = outer;

    var button = document.createElement('button');
    button.classList.add('debugToggle');
    button.innerHTML = 'Hide';
    var hidden = false;
    button.onclick = outer.ondblclick = function() {
        hidden = !hidden;
        if (hidden) {
            outer.classList.add('hidden');
        } else {
            outer.classList.remove('hidden');
        }
        button.innerHTML = hidden ? 'Show' : 'Hide';
    };
    outer.appendChild(button);

    this.div = document.createElement('div');
    outer.appendChild(this.div);

    // Add simplediff
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'hints/simplediff/simplediff.min.js';
    head.appendChild(script);
}

DebugDisplay.prototype = Object.create(HintDisplay.prototype);

DebugDisplay.prototype.initDisplay = function() {
    document.body.appendChild(this.outer);
};

DebugDisplay.prototype.showHint = function(hint) {
    var myself = this;
    var code = Trace.lastCode;

    var hintDiv = document.createElement('div');
    if (hint.data.caution) {
        hintDiv.innerHTML += '*';
    }
    hintDiv.innerHTML += this.createDiff(hint.from, hint.to) + ' ';

    var hintSaved = this.savedHints[this.savedHintKey(hint, code)];

    var link = document.createElement('a');
    link.innerHTML = '<small>' + (hintSaved ? '[' + hintSaved + ']' : 'Save') +
        '</small>';
    link.href = '#';
    hintDiv.appendChild(link);
    this.div.appendChild(hintDiv);
    if (!hintSaved) {
        link.onclick = function(e) {
            myself.saveHint(hint, code, link);
            e.preventDefault();
        };
    }
};

DebugDisplay.prototype.savedHintKey = function(hint, code) {
    return JSON.stringify(hint);
};

DebugDisplay.prototype.saveHint = function(hint, code, link) {
    var myself = this;

    var xhr = createCORSRequest('POST',
        window.hintProvider.url + '?assignmentID=' + window.assignmentID +
        '&hint=' + encodeURIComponent(JSON.stringify(hint, null, '\t')));

    if (!xhr) {
        myself.showError('CORS not supported on this browser.');
        return;
    }

    xhr.onload = function() {
        var id = xhr.responseText;
        link.onclick = null;
        link.innerHTML = '<small>[' + id + ']</small>';
        myself.savedHints[myself.savedHintKey(hint, code)] = id;
    };

    xhr.onerror = function(e) {
        myself.showError('Error contacting hint server!');
    };

    xhr.send(code);
};

DebugDisplay.prototype.showError = function(error) {
    if (error.message) error = error.message;
    this.div.innerHTML = error;
};

DebugDisplay.prototype.clear = function() {
    this.div.innerHTML = '';
};

DebugDisplay.prototype.createDiff = function(from, to) {
    var cssMap = {
        '+': 'plus',
        '=': 'equals',
        '-': 'minus',
    };
    var matchRegex = /:|\[|\]|,|\s|\w*/g;
    var code0 = from.match(matchRegex);
    var code1 = to.match(matchRegex);
    var codeDiff = window.diff(code0, code1);
    var html = '<span class="hint">';
    for (var j = 0; j < codeDiff.length; j++) {
        var block = cssMap[codeDiff[j][0]];
        var code = codeDiff[j][1].join('');
        html += '<code class={0}>{1}</code>'.format(block, code);
    }
    html += '</span>';
    return html;
};

function SnapDisplay() {
    this.hintBars = [];
}

SnapDisplay.prototype = Object.create(HintDisplay.prototype);

SnapDisplay.prototype.hintColorBlock = new Color(34, 174, 76);
SnapDisplay.prototype.hintColorScript = new Color(255, 127, 29);
SnapDisplay.prototype.hintColorStructure = new Color(163, 73, 164);
SnapDisplay.prototype.hintColorCustomBlock = new Color(0, 162, 232);

SnapDisplay.prototype.initDisplay = function() {
    this.enabled = false;
    this.hintsShown = 0;
    this.hiddenHints = [];

    var createButton = function(ide) {
        var hintButton = new PushButtonMorph(
            ide,
            'getHint',
            '  ' + localize('Help') + '  '
        );
        ide.spriteBar.hintButton = hintButton;
        hintButton.firstClick = true;
        hintButton.lastClickTime = 0;
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
    };

    var oldFixLayout = IDE_Morph.prototype.fixLayout;
    IDE_Morph.prototype.fixLayout = function() {
        oldFixLayout.call(this, arguments);
        if (!this.spriteBar.hintButton) {
            createButton(this);
        }
        this.spriteBar.hintButton.setPosition(new Point(
            this.stage.left() - this.spriteBar.hintButton.width() / 2 - 60,
            this.spriteBar.hintButton.top()));
    };

    window.ide.fixLayout();
    BlockEditorMorph.defaultHatBlockMargin = new Point(75, 20);

    var assignment = window.assignments[window.assignmentID];
    if (assignment.promptHints && !window.hintProvider.reloadCode) {
        Trace.log('SnapDisplay.promptHints');
        var message = localize('Welcome to ') + assignment.name + '.';
        message += ' ' + localize('Remember, if you get stuck, you can use ' +
            'the "Help" button in the top-right corner to get suggestions.');
        new DialogBoxMorph().inform(localize('Help Available'), message,
            ide.world());
    }
};

SnapDisplay.prototype.logHints = function() {
    return this.enabled;
};

SnapDisplay.prototype.hasCustomBlock = function(ref) {
    if (!ref) return false;
    return ref.label == 'customBlock' || this.hasCustomBlock(ref.parent);
};

// Gets the showing/editing version of a customBlock, or returns null if
// it is not currently being edited, since we can only generate hints for a
// showing/editing custom block
SnapDisplay.prototype.editingCustomBlock = function(storedBlocks, index) {
    var storedBlock = storedBlocks.filter(function(block) {
        return !block.isImported;
    })[index];
    if (!storedBlock) return null;
    var showing = BlockEditorMorph.showing;
    if (storedBlock && showing && showing.definition &&
            showing.definition.guid == storedBlock.guid) {
        var scriptsMorph = BlockEditorMorph.showing.allChildren().filter(
            function (child) {
                return child instanceof ScriptsMorph;
            })[0];
        return scriptsMorph;
    }
    storedBlock._debugType = storedBlock.getDebugType();
    return storedBlock;
};

SnapDisplay.prototype.getCode = function(ref) {
    if (ref.parent == null) {
        return window.ide;
    }

    var parent = this.getCode(ref.parent);
    // If this is a non-showing custom block, we should just return it to show
    // a special hint
    if (parent == null || parent._debugType == 'CustomBlockDefinition') {
        return parent;
    }

    var label = ref.label;
    var index = ref.index;

    switch (ref.parent.label) {
    case 'snapshot':
        if (label == 'stage')
            return parent.stage;
        else if (label == 'customBlock')
            return this.editingCustomBlock(parent.stage.globalBlocks,
                index - 1);
        else if (label == 'var')
            return parent.globalVariables.vars;
        break;
    case 'stage':
        if (label == 'sprite') {
            return parent.children.filter(function(child) {
                return child instanceof SpriteMorph;
            })[index];
        }
    case 'sprite':
        var nVars = Object.keys(parent.variables.vars).length;
        var nScripts = parent.scripts.children.length;
        if (label == 'var')
            return parent.variables.vars;
        else if (label == 'script')
            return parent.scripts.children[index - nVars];
        else if (label == 'customBlock')
            return this.editingCustomBlock(parent.customBlocks,
                index - nVars - nScripts);
        break;
    case 'script':
        var block = parent;
        if (block._debugType == 'CSlotMorph') block = block.children[0];
        if (ref.parent.parent && ref.parent.parent.label == 'customBlock') {
            // Scripts in a custom block must skip one extra because the
            // first block is the header CustomHatBlock.
            block = block.nextBlock();
        }
        for (var i = 0; i < index; i++) block = block.nextBlock();
        return block;
    case 'customBlock':
        // We should only generate hints for the primary script in a custom
        // block
        if (ref.index > 0 || label != 'script' || !parent.children.length) {
            return null;
        }
        // If we manage to get a hold of it, we return the first script
        return parent.children[0];
    default:
        return parent.inputs()[index];
    }
};

SnapDisplay.prototype.clear = function() {
    this.hintsShown = 0;
    this.customBlockHints = [];

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
};

function Hint(root, from, to, hasCustom) {
    this.root = root;
    this.from = from;
    this.to = to;
    this.hasCustom = hasCustom;
}

SnapDisplay.prototype.showHint = function(hint) {
    if (hint.data.caution) return;

    var hasCustom = this.hasCustomBlock(hint.data.root);
    var root = this.getCode(hint.data.root);
    if (!root) {
        // Null roots should be ok and indicate that this is a hints for a
        // non-primary custom block hint, which we can ignore.
        return;
    }
    this.hintsShown++;
    var label = hint.data.root.label;

    // If this is a hint for a custom block that isn't showing, display
    // a special hint to indicate that
    if (hasCustom && root._debugType == 'CustomBlockDefinition') {
        this.showNotEditingCustomBlockHint(root);
        return;
    }

    var functionName = 'show' + label.charAt(0).toUpperCase() +
            label.slice(1) + 'Hint';
    var f = this[functionName];
    if (!f) {
        // Block hint roots will be individual block names
        label = 'block';
        f = this.showBlockHint;
    }

    // Ignore hints that have been thumbs'd down
    if (this.shouldHideHint(root, hint.data.to, label)) return;

    var displayHint = new Hint(root, hint.data.from, hint.data.to, hasCustom);
    var oldHint = null;
    if (hint.data.oldRoot) {
        var oldHasCustom = this.hasCustomBlock(hint.data.oldRoot);
        var oldRoot = this.getCode(hint.data.oldRoot);
        oldHint = new Hint(oldRoot, hint.data.oldFrom, hint.data.oldTo,
                oldHasCustom);
    }

    f.call(this, displayHint, oldHint);
};

SnapDisplay.prototype.finishedHints = function() {
    if (this.hintsShown == 0) {
        var myself = this;
        this.createHintButton(window.ide.currentSprite.scripts,
            this.hintColorStructure, false, function() {
                Trace.log('SnapDisplay.showNoHints');
                myself.showMessageDialog(
                    'Everything looks good. No suggestions to report.',
                    'No Suggestions', false);
            });
    }
    this.hintsShown = 0;
};

SnapDisplay.prototype.showNotEditingCustomBlockHint = function(root) {
    if (this.customBlockHints.includes(root.guid)) return;

    var myself = this;
    this.customBlockHints.push(root.guid);
    this.createHintButton(window.ide.currentSprite.scripts,
        this.hintColorCustomBlock, false, function() {
            Trace.log('SnapDisplay.showNotEditingCustomBlockHint', {
                'blockGUID': root.guid,
            });
            var name = root.spec.replace(/%'([^']*)'/g, '[$1]');
            var msg = 'Open the custom block ' +
                '"' + name + '" for more suggestions.';
            myself.showMessageDialog(msg, 'Check Custom Block', false);
        });
};

SnapDisplay.prototype.showStructureHint =
function(hint, scripts, map, postfix, color) {
    var root = hint.root, from = hint.from, to = hint.to;
    var myself = this;
    if (!postfix) postfix = '';
    for (var key in map) {
        if (!map.hasOwnProperty(key)) continue;

        var fromItems = this.countWhere(from, key);
        var toItems = this.countWhere(to, key);
        if (fromItems == toItems) continue;

        var message = null;
        if (toItems === 0) {
            message = "You probably don't need any " + map[key] + 's';
        } else {
            message = fromItems > toItems ? 'You probably only need ' :
                'You probably need ';
            message += toItems > 1 ?
                toItems + ' ' + map[key] + 's' :
                'one ' + map[key];
        }
        message += postfix + '.';
        message = localize(message);

        var rootType = null;
        var rootID = null;
        if (root instanceof SpriteMorph) {
            rootType = 'sprite';
            rootID = root.name;
        } else if (root instanceof IDE_Morph) {
            rootType = 'snapshot';
        } else if (root instanceof StageMorph) {
            rootType = 'stage';
        }

        color = color || this.hintColorStructure;
        (function(message) {
            myself.createHintButton(scripts, color, false,
                function() {
                    Trace.log('SnapDisplay.showStructureHint', {
                        'rootType': rootType,
                        'rootID': rootID,
                        'message': message,
                        'from': from,
                        'to': to
                    });
                    myself.showMessageDialog(message, 'Suggestion', false, root,
                        to, null);
                });
        })(message);
    }
};

SnapDisplay.prototype.showSnapshotHint = function(hint) {
    this.showStructureHint(hint, window.ide.currentSprite.scripts, {
        'var': 'variable',
        'customBlock': 'custom block'
    }, ' (for all sprites)');
};

SnapDisplay.prototype.showStageHint = function(hint) {
    this.showStructureHint(hint, window.ide.currentSprite.scripts, {
        'sprite': 'sprite'
    });
};

SnapDisplay.prototype.showSpriteHint = function(hint) {
    this.showStructureHint(hint, hint.root.scripts, {
        'var': 'variable',
        // 'script': 'script',
        'customBlock': 'custom block'
    }, ' (in this sprite)');
};

SnapDisplay.prototype.showCustomBlockHint = function(hint) {
    var root = hint.root; //, from = hint.from, to = hint.to;
    var realRoot = root.children[0];
    if (!realRoot) {
        Trace.logErrorMessage('Custom block ScriptsMorph with no scripts!');
        return;
    }
    this.showStructureHint(hint, realRoot, {
        'var': 'input'
    }, ' in this block', this.hintColorCustomBlock);
};

SnapDisplay.prototype.showScriptHint = function(hint, oldHint) {
    var root = hint.root, from = hint.from, to = hint.to;

    // For logging, we find the parent block this script is inside of, or null
    var block = root.parent;
    if (block.enclosingBlock) block = block.enclosingBlock();
    else block = null;

    // If applicable, find the index of this script in it's parent (e.g. IfElse)
    var index = 0;
    if (block && block != root && block.inputs) {
        index = block.inputs().indexOf(root);
        if (index == -1) {
            Trace.logErrorMessage('Bad hint index!');
        }
    }

    if (root instanceof PrototypeHatBlockMorph) {
        from.unshift('prototypeHatBlock');
        to.unshift('prototypeHatBlock');
    }

    var displayRoot = oldHint ? oldHint.root : root;
    var fromList = oldHint ? [from, oldHint.from] : [from];

    var myself = this;
    var showHint = function() {
        var rootID = root ? root.id : null;
        var displayRootID = displayRoot ? displayRoot.id : null;
        var selector = block ? block.selector : null;
        var blockID = block ? block.id : null;
        Trace.log('SnapDisplay.showScriptHint', {
            'rootID': rootID,
            'displayRootID': displayRootID,
            'parentSelector': selector,
            'parentID': blockID,
            'index': index,
            'fromList': fromList,
            'to': to
        });
        new CodeHintDialogBoxMorph(window.ide)
            .showScriptHint(selector, index, fromList, to)
            .onThumbsDown(function() {
                myself.hideHint(root, to, 'script');
            });
    };

    // Custom blocks have a header block on top, which we may want to skip for
    // displaying hints if there's another block underneath. But right now we're
    // not.
    // if (root._debugType == 'PrototypeHatBlockMorph' && root.nextBlock()) {
    //     root = root.nextBlock();
    // }


    this.createHintButton(displayRoot, this.hintColorScript, true, showHint,
        hint.hasCustom);
};

SnapDisplay.prototype.showBlockHint = function(hint, oldHint) {
    var root = hint.root, from = hint.from, to = hint.to;
    var block = root.enclosingBlock();

    var displayRoot = oldHint ? oldHint.root : root;
    var otherBlocks = oldHint ? oldHint.from : [];

    var myself = this;
    var showHint = function() {
        var selector = block ? block.selector : null;
        var blockID = block ? block.id : null;
        var displayRootID = displayRoot ? displayRoot.id : null;
        Trace.log('SnapDisplay.showBlockHint', {
            'parentSelector': selector,
            'parentID': blockID,
            'displayRootID': displayRootID,
            'from': from,
            'to': to,
            'otherBlocks': otherBlocks,
        });
        new CodeHintDialogBoxMorph(window.ide)
            .showBlockHint(selector, from, to, otherBlocks)
            .onThumbsDown(function() {
                myself.hideHint(root, to, 'block');
            });
    };

    this.createHintButton(displayRoot, this.hintColorBlock, false, showHint,
        hint.hasCustom);
};

SnapDisplay.prototype.countWhere = function(array, item) {
    var count = 0;
    for (var i = 0; i < array.length; i++) {
        if (array[i] == item) count++;
    }
    return count;
};

SnapDisplay.prototype.showMessageDialog =
function(message, title, showRating, root, to, type) {
    var myself = this;
    var dialog = new MessageHintDialogBoxMorph(message, title, showRating,
        window.ide);
    dialog.onThumbsDown(function() {
        myself.hideHint(root, to, type);
    });
    dialog.popUp();
};

SnapDisplay.prototype.hideHint = function(root, to, type) {
    if (!to || !to.join) return;
    Trace.log('SnapDisplay.hideHint', {
        'to': to,
        'type': type,
    });
    to = to.join(',');
    this.hiddenHints.push({
        'root': root,
        'to': to,
        'type': type,
    });
};

SnapDisplay.prototype.shouldHideHint = function(root, to, type) {
    to = to.join(',');
    for (var i = 0; i < this.hiddenHints.length; i++) {
        hint = this.hiddenHints[i];
        if (hint.root == root && hint.to === to &&
                (hint.type || type) === type) {
            return true;
        }
    }
    return false;
};

SnapDisplay.prototype.createHintButton =
function(parent, color, scriptHighlight, callback, hasCustom) {
    if (parent == null) return;

    var hintBar;
    if (parent instanceof SyntaxElementMorph) {
        var topBlock = parent.topBlock();
        if (!topBlock) return;

        hintBar = topBlock.hintBar;
        if (hintBar == null) {
            hintBar = new HintBarMorph(topBlock, hasCustom ? 2 : 3);
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

    var button = new PushButtonMorph(hintBar, callback,
        new SymbolMorph('speechBubble', 14));
    button.labelColor = color;
    button.fixLayout();
    hintBar.addButton(button, parent, scriptHighlight);
};

if (window.getHintProvider && window.assignmentID) {
    window.hintProvider = window.getHintProvider();
}

SyntaxElementMorph.prototype.enclosingBlock = function() {
    var block = this;
    while (block && !(block instanceof BlockMorph)) {
        block = block.parent;
    }
    return block;
};

BlockMorph.prototype.topBlockInScript = function() {
    if (this.parent.nextBlock && this.parent.nextBlock() == this) {
        return this.parent.topBlockInScript();
    }
    return this;
};

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
};

BlockMorph.prototype.addSingleHighlight = function() {
    var children = this.children;
    this.children = [];
    var highlight = this.addHighlight();
    children.push(highlight);
    this.children = children;
    this.fullChanged();
    return highlight;
};

// We need block highlights not to intercept pointer events
BlockHighlightMorph.prototype.topMorphAt = function(point) {
    return null;
};

function HintBarMorph(parent, maxAdjacent) {
    this.init(parent, maxAdjacent | 3);
}

HintBarMorph.prototype = Object.create(Morph.prototype);
HintBarMorph.prototype.constructor = HintBarMorph;
HintBarMorph.uber = Morph.prototype;

HintBarMorph.prototype.init = function(parent, maxAdjacent) {
    HintBarMorph.uber.init.call(this);
    this.color = new Color(0, 0, 0, 0);
    this.maxAdjacent = maxAdjacent;
    if (parent) parent.add(this);
};

HintBarMorph.prototype.drawNew = function() {
    this.image = newCanvas(this.extent());
};

HintBarMorph.prototype.destroy = function() {
    HintBarMorph.uber.destroy.call(this);
    if (this.highlightBlock) {
        this.highlightBlock.removeHighlight();
    }
};

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
};

HintBarMorph.prototype.addButton = function(button, parent, script) {
    this.add(button);

    if (!(parent instanceof SyntaxElementMorph)) {
        this.layout();
        return;
    }

    while (parent instanceof ArgMorph) {
        parent = parent.parent;
    }
    button.idealY = parent.top() - parent.topBlock().top();

    this.layout();

    if (!parent.addHighlight) {
        return;
    }

    var myself = this;
    var oldMouseEnter = button.mouseEnter;
    button.mouseEnter = function() {
        oldMouseEnter.call(button);
        myself.updateHighlight(parent, script, true);
    };

    var oldMouseLeave = button.mouseLeave;
    button.mouseLeave = function() {
        oldMouseLeave.call(button);
        myself.updateHighlight(parent, script, false);
    };
};

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
};

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

    this.children.sort(function(a, b) {
        return (a.idealY || 0) - (b.idealY || 0);
    });
    var bottom = 0, left = this.right(), right = this.right(), adjacent = 1;
    for (var i = 0; i < this.children.length; i++) {
        var child = this.children[i];
        var idealY = this.top() + (child.idealY || 0);
        child.setRight(this.right());
        child.setTop(idealY);
        // loop currenty executes only once, but we keep it in case we want a
        // more comprehensive layout algorithm (note break at the bottom)
        for (var j = i - 1; j >= 0; j--) {
            var lastChild = this.children[i - 1];
            var minY = lastChild.bottom() + 3;
            var minX = lastChild.left() - 3;
            if (Math.abs(child.idealY - lastChild.idealY) < 15 &&
                (!this.maxAdjacent || adjacent < this.maxAdjacent)) {
                child.setRight(minX);
                child.setTop(lastChild.top());
                adjacent++;
            } else {
                if (idealY < minY) {
                    child.setTop(minY);
                }
                adjacent = 1;
            }
            break;
        }
        bottom = Math.max(bottom, child.bottom());
        left = Math.min(left, child.left());
    }
    var deltaX = this.left() - left;
    this.setLeft(left);
    this.children.forEach(function(child) {
        child.setRight(child.right() + deltaX);
    });
    this.setExtent(new Point(right - left, bottom - this.top()));
    // TODO: if (this.parent.adjustBounds) this.parent.adjustBounds();
};