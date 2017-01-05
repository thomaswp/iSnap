
require('hint-display');
require('hint-bar-morph');
require('code-hint-dialog-box-morph');
require('message-hint-dialog-box-morph');

// Helper function for setting whether or not hints display
function setHintsActive(active) {
    if (!ide.spriteBar || !ide.spriteBar.hintButton) return;
    var hintButton = ide.spriteBar.hintButton;
    if (hintButton.active === active) return;
    Trace.log('HelpButton.toggled', active);
    hintButton.active = active;
    hintButton.labelString =
        ' ' + localize(active ? 'Hide Help' : 'Get Help') + ' ';
    hintButton.drawNew();
    hintButton.fixLayout();
    ide.fixLayout();
}

// TODO: Rename to VectorHintDispplay or something
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
    this.customBlocksWithHints = [];

    var createButton = function(ide) {
        var getHint = function() {
            if (!this.spriteBar || !this.spriteBar.hintButton) return;
            var hintButton = this.spriteBar.hintButton;

            window.hintProvider.clearDisplays();
            var active = !hintButton.active;
            setHintsActive(active);
            window.hintProvider.setDisplayEnabled(SnapDisplay, active);
        };

        var hintButton = new PushButtonMorph(
            ide,
            getHint,
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

SnapDisplay.prototype.getHintType = function() {
    return 'bubble';
};

SnapDisplay.prototype.logHints = function() {
    return this.enabled;
};

SnapDisplay.prototype.clear = function() {
    this.hintsShown = 0;
    this.customBlocksWithHints = [];

    this.hintBars.forEach(function(bar) {
        var parent = bar.parent;
        parent.hintBar = null;
        bar.destroy();
        this.redrawBlock(parent);
    }, this);

    this.hintBars = [];
    window.ide.changed();
};

function Hint(root, from, to, hasCustom) {
    this.root = root;
    this.from = from;
    this.to = to;
    this.hasCustom = hasCustom;

    this.hidden = function() {
        // Hidden custom block hints will have roots that are
        // CustomBlockDefinitions, while non-hidden ones will have
        // ScriptsMorphs as roots
        return this.hasCustom && this.root instanceof CustomBlockDefinition;
    };
}

SnapDisplay.prototype.showHint = function(hint) {
    if (hint.type && hint.type !== 'vector') return;
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

    // If this is a hint for a custom block that isn't showing, display
    // a special hint to indicate that
    if (displayHint.hidden()) {
        this.customBlocksWithHints.push(root);
        return;
    }
    if (oldHint && oldHint.hidden()) {
        this.customBlocksWithHints.push(oldHint.root);
        return;
    }

    f.call(this, displayHint, oldHint);
};

SnapDisplay.prototype.finishedHints = function() {
    this.showNotEditingCustomBlockHint(this.customBlocksWithHints);
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

SnapDisplay.prototype.showNotEditingCustomBlockHint = function(roots) {
    if (roots.length === 0) return;

    var guids = [];
    var names = [];
    roots.forEach(function(root) {
        if (guids.includes(root.guid)) return;
        guids.push(root.guid);
        names.push(root.spec.replace(/%'([^']*)'/g, '[$1]'));
    });

    var myself = this;
    this.createHintButton(window.ide.currentSprite.scripts,
        this.hintColorCustomBlock, false, function() {
            Trace.log('SnapDisplay.showNotEditingCustomBlockHint', {
                'blockGUIDs': guids,
            });
            var msg;
            if (names.length === 1) {
                msg = 'Edit the custom block ' +
                    '"' + names[0] + '" for more suggestions.';
            } else {
                msg = 'Edit one of the following custom blocks for more ' +
                    'suggestions: "' + names.join('", "') + '".';
            }

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
        var diff = toItems - fromItems;

        var message = null;
        if (toItems === 0) {
            message = "You probably don't need any " + map[key] + 's';
        } else if (diff < 0) {
            message = 'You probably only need ' + toItems + ' ' + map[key];
            if (toItems > 1) message += 's';
        } else {
            message = 'You probably need to create ' + diff + ' more ' +
                    map[key];
            if (diff > 1) message += 's';
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
        } else if (root instanceof ScriptsMorph) {
            // ScriptsMorphs should only be the root for custom block hints
            rootType = 'customBlock';
            rootID = root.children[0].definition.guid;
        } else {
            // eslint-disable-next-line no-console
            console.warn('Unknown root type', root);
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

    var fromList = oldHint ? [from, oldHint.from] : [from];

    var extraRoot = oldHint ? oldHint.root : null;
    var myself = this;
    var showHint = this.createScriptHintCallback(false, root, extraRoot,
        fromList, to, function() {
            myself.hideHint(root, to, 'script');
        });

    // Custom blocks have a header block on top, which we may want to skip for
    // displaying hints if there's another block underneath. But right now we're
    // not.
    // if (root._debugType == 'PrototypeHatBlockMorph' && root.nextBlock()) {
    //     root = root.nextBlock();
    // }


    var displayRoot = oldHint ? oldHint.root : root;
    this.createHintButton(displayRoot, this.hintColorScript, true, showHint,
        hint.hasCustom);
};

SnapDisplay.prototype.showBlockHint = function(hint, oldHint) {
    var root = hint.root, from = hint.from, to = hint.to;

    var myself = this;
    var otherBlocks = oldHint ? oldHint.from : [];
    var extraRoot = oldHint ? oldHint.root : null;
    var showHint = this.createBlockHintCallback(false, root, extraRoot, from,
        to, otherBlocks, function() {
            myself.hideHint(root, to, 'block');
        });

    var displayRoot = oldHint ? oldHint.root : root;
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
    if (!root || !to || !to.join) return;
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

SnapDisplay.prototype.showLoggedHint = function(data) {
    var type = data.type;
    var fromList;
    if (type === 'StructureHint') {
        this.showMessageDialog(data.message, 'Suggestion', false, null, null,
            null);
    } else if (type === 'ScriptHint') {
        fromList = data.fromList || [data.from];
        var parent = null;
        if (data.parentID) {
            parent = ide.allChildren().filter(function(x) {
                return x instanceof BlockMorph && x.id === data.parentID;
            })[0] || null;
            if (parent != null) {
                parent = parent.selector;
            }
        }
        new CodeHintDialogBoxMorph(window.ide)
            .showScriptHint(parent, data.index, fromList, data.to);
    } else if (type === 'BlockHint') {
        fromList = data.fromList || [data.from, []];
        new CodeHintDialogBoxMorph(window.ide)
            .showBlockHint(data.parentSelector, fromList[0], data.to,
                fromList[1]);
    } else {
        Trace.logErrorMessage('Unknown logged hint type: ' + type);
    }
};