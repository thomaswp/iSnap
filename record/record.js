require('isnap/util.js')
require('record/record-audio.js')

extend(ScriptsMorph, 'recordDrop', function(base, lastGrabOrigin) {
    base.call(this, lastGrabOrigin);
    // Record the situation now instead of waiting to undo
    if (this.dropRecord.lastDroppedBlock) {
        this.dropRecord.situation =
                this.dropRecord.lastDroppedBlock.situation();
    }
    window.recorder.addDropRecord(this.dropRecord);
});

extend(BlockMorph, 'init', function(base) {
    base.call(this);
    Recorder.registerBlock(this);
});

extend(BlockMorph, 'userMenu', function(base) {
    let menu = base.call(this);
    menu.addItem(
        "copy script pic",
        () => {
            let canvas = this.topBlock().scriptPic();
            canvas.toBlob(blob => {
                try {
                    navigator.clipboard.write([
                        new ClipboardItem({
                            'image/png': blob,
                        })
                    ]);
                } catch (error) {
                    console.error(error);
                }
            });
        },
        'copy a picture\nof this script to the clipboard'
    );
    return menu;
});

extend(SnapSerializer, 'setBlockId', function(base, model, block) {
    base.call(this, model, block);
    Recorder.registerBlock(block);
});


extend(IDE_Morph, 'createProjectMenu', function(base) {
    var menu = base.call(this);
    menu.addLine();
    if (!recorder.isRecording) {
        menu.addItem(
            localize('Start recording'),
            () => {
                recorder.start();
            },
            'Start recording Snap actions and audio.'
        );
    } else {
        menu.addItem(
            localize('Stop recording'),
            () => {
                recorder.stop();
            },
            'Stop recording Snap and save.'
        );
    }
    return menu;
});

(function() {
    var menuLogging = function(base) {
        let menu = base.call(this);
        // console.log('menu', this);
        if (!menu) return menu;
        if (window.recorder) {
            window.recorder.recordMenu(this, menu, true);
        }
        return menu;
    };

    [BlockMorph, ScriptsMorph, InputSlotMorph].forEach(cls => {
        extend(cls, 'userMenu', menuLogging);
    });
})();


extend(MenuItemMorph, 'mouseEnter', function (base) {
    // console.log('enter', this);
    if (window.recorder) {
        window.recorder.recordMenuItem(this, true);
    }
    base.call(this);
});

extend(MenuItemMorph, 'mouseLeave', function (base) {
    // console.log('leave', this);
    if (window.recorder) {
        window.recorder.recordMenuItem(this, false);
    }
    base.call(this);
});


extend(MenuMorph, 'destroy', function (base) {
    // console.log('destroy', this);
    if (window.recorder) {
        window.recorder.recordMenu(null, this, false);
    }
    base.call(this);
});

(function() {
    function recordInput(type) {
        extend(type, 'popUp', function(base) {
            base.apply(this, [].slice.call(arguments, 1));
            const body = this.body;
            if (!body) return;
            action = () => {
                if (window.recorder) {
                    window.recorder.recordInputTyped(
                        type.name, body.getValue());
                }
            }
            if (body.reactToInput) {
                extendObject(body, 'reactToInput', function(base) {
                    base.call(this);
                    action();
                });
            } else {
                body.reactToInput = action;
            }
        }, true);
    }

    recordInput(BlockDialogMorph);
    recordInput(VariableDialogMorph);
    recordInput(InputSlotDialogMorph);
})();


extend(StagePrompterMorph, 'init', function(base, question) {
    base.call(this, question);
    this.inputField.reactToInput = function() {
        this.escalateEvent('reactToInput');
        window.recorder.recordEvent('inputPromptEdited', {
            value: this.getValue(),
        });
    }
});

extend(StagePrompterMorph, 'accept', function(base) {
    base.call(this);
    window.recorder.recordEvent('inputPromptAccept', {
        value: this.inputField.getValue(),
    });
});

extend(SpriteMorph, 'makeBlock', function(base) {
    if (window.recorder) {
        window.recorder.recordNewBlock();
    }
    base.call(this);
});

extend(SpriteMorph, 'justDropped', function(base) {
    base.call(this);
    if (window.recorder) {
        window.recorder.recordEvent('spriteDropped', {
            sprite: this,
            x: this.xPosition(),
            y: this.yPosition(),
        });
    }
});

extend(IDE_Morph, 'addNewSprite', function(base) {
    base.call(this);
    if (!window.recorder) return;
    let sprite = ide.currentSprite;
    let data = {
        name: sprite.name,
        x: sprite.xPosition(),
        y: sprite.yPosition(),
        hue: sprite.getColorComponentHSLA(0),
        lightness: sprite.getColorComponentHSLA(2),
    };
    window.recorder.addRecord(new Record('IDE_addSprite', data));
});

class Record {

    static fromInputSlotEdit(data) {
        return new Record('inputSlotEdit', data);
    }

    static fromDropRecord(dropRecord) {
        return new Record('blockDrop', dropRecord);
    }

    constructor(type, data) {
        this.type = type;
        this.data = Recorder.serialize(data);
    }

    replay(callback, fast) {
        let method = 'replay_' + this.type;
        if (!this[method]) {
            console.warn('Unknown record type: ' + this.type);
            return;
        }
        console.log('Playing:', this.type, this.data);
        let data = Recorder.deserialize(this.data);
        this[method].call(this, data, callback, fast);
    }

    replacePHBM(dropRecord, parent, key) {
        // Hack to recover the PHBM, which has no spec and is created
        // automatically console.log('attempting to replace: ', key);
        if (!parent) return;
        if (parent[key] === undefined) {
            // console.log('Undefined key');
            if (dropRecord.situation && dropRecord.situation.origin) {
                // console.log('Custom origin');
                let origin = dropRecord.situation.origin;
                let editor = null;
                if (origin instanceof ScriptsMorph) {
                    editor = origin.parentThatIsA(BlockEditorMorph);
                } else if (origin.guid) {
                    editor = Recorder.findShowingBlockEditor(origin.guid);
                } else {
                    console.warn('Unknown origin for BEM: ', origin);
                }
                if (editor) {
                    // console.log('Editor');
                    let blocks = editor.body.children[0].children;
                    blocks = blocks.filter(b =>
                        b instanceof PrototypeHatBlockMorph);
                    let hat = blocks[0];
                    if (hat) {
                        // console.log("Replaced hat block!", key);
                        parent[key] = hat;
                    }
                }
            }
        }
    }

    replay_blockDrop(dropRecord, callback, fast) {
        let sprite = window.ide.currentSprite;
        let scripts = sprite.scripts;
        this.replacePHBM(dropRecord, dropRecord, 'lastDroppedBlock');
        this.replacePHBM(dropRecord, dropRecord.lastDropTarget, 'element');
        // console.log('Dropping deserialized', dropRecord);
        scripts.playDropRecord(dropRecord, callback, fast ? 1 : null);
    }

    replay_inputSlotEdit(data, callback, fast) {
        let block = Recorder.getOrCreateBlock(data.id);
        let input = block.inputs()[data.id.argIndex];
        if (input instanceof ColorSlotMorph) {
            input.setColor(data.value);
        } else if (input instanceof InputSlotMorph ||
                input instanceof BooleanSlotMorph) {
            input.setContents(data.value);
        }
        Recorder.registerClick(input.center(), fast);
        setTimeout(callback, 1);
    }

    replay_run(data, callback, fast) {
        let threads = ide.stage.threads;
        var stopCondition;
        let stepping = Process.prototype.enableSingleStepping;
        let prepareToRun = () => {
            if (!fast) return;
            // console.log("Preparing to run", stepping);
            if (stepping) {
                threads.toggleSingleStepping();
            }
            window.ide.startFastTracking();
        }
        // Step threads to make sure dead processes are cleaned up
        threads.step();
        if (data && data.id) {
            let isFinished = () => {
                let proc = threads.findProcess(block, receiver);
                return !proc;
            }
            // Click run or stop run
            let block = Recorder.getOrCreateBlock(data);
            let receiver = block.scriptTarget();
            let procFinished = isFinished();
            if (procFinished == (data.message === 'Block.clickStopRun')) {
                // If we're starting or stopping and the script is already
                // running/not-running just return
                // console.log("already there; running=" + !procFinished);
                setTimeout(callback, 1);
                return;
            }
            prepareToRun();
            // console.log('Toggle', fast, procFinished, block);
            threads.toggleProcess(block, receiver);
            let click = block.center().add(block.position()).divideBy(2);
            Recorder.registerClick(click, fast);
            stopCondition = () => {
                // Stop when the thread has stopped running
                return !receiver || isFinished();
            };
        } else {
            // Green flag
            let click = ide.controlBar.startButton.center();
            Recorder.registerClick(click, fast);
            prepareToRun();
            ide.runScripts();
            stopCondition = () => {
                // Stop when all threads have finished
                return !threads.processes.length == 0;
            };
        }
        if (!fast) {
            // If playing at normal time, we just trust that the recorder
            // isn't messing with the running script, and allow actions
            // to progress.
            setTimeout(callback, 1);
            return;
        }

        let startTime = new Date().getTime();
        let MAX_RUN = 300; // TODO: make configurable!
        let interval = setInterval(() => {
            let passed = new Date().getTime() - startTime;
            if (passed < MAX_RUN && !stopCondition()) return;
            if (passed >= MAX_RUN) console.warn("TIMEOUT",
                Process.prototype.enableSingleStepping);
            // console.log("stopping", data);
            if (Process.prototype.enableSingleStepping != stepping) {
                threads.toggleSingleStepping();
            }
            window.ide.stopFastTracking();
            clearInterval(interval);
            callback();
        }, 1);
    }

    replay_stop(data, callback, fast) {
        let click = ide.controlBar.stopButton.center();
        Recorder.registerClick(click, fast);
        window.ide.stopAllScripts();
        setTimeout(callback, 1);
    }

    replay_changeCategory(data, callback, fast) {
        let categoryIndex = SpriteMorph.prototype.categories
            .indexOf(data.value.toLocaleLowerCase());
        if (categoryIndex >= 0) {
            let click = ide.categories.children[categoryIndex].center();
            Recorder.registerClick(click, fast);
        }

        window.ide.changeCategory(data.value);
        setTimeout(callback, 1);
    }

    replay_menu(data, callback, fast) {
        let parent = data.parent;
        let open = data.open;
        if (fast) {
            setTimeout(callback, 1);
            return;
        }
        if (open && parent) {
            Recorder.registerClick(data.position, fast);
            parent.contextMenu().popup(world, data.position);
        } else if (!open && Recorder.openMenu) {
            Recorder.openMenu.destroy();
        }
        setTimeout(callback, 1);
    }

    replay_menuItemSelect(data, callback, fast) {
        if (fast || !Recorder.openMenu) {
            setTimeout(callback, 1);
            return;
        }
        let index = data.index;
        let selected = data.highlight;
        let item = Recorder.openMenu.children[index];
        if (item && item.mouseEnter) {
            if (selected) {
                item.mouseEnter();
            } else {
                item.mouseLeave();
            }
        }
        setTimeout(callback, 1);
    }

    replay_blockType_newBlock(data, callback, fast) {
        ide.currentSprite.makeBlock();
        let button = ide.palette.toolBar.children[1];
        if (button) {
            Recorder.registerClick(button.center(), fast);
        }
        setTimeout(callback, 1);
    }

    replay_dialog_setValue(dialog, func, data, callback, fast, shower) {
        if (dialog) {
            dialog[func](data.value);
            if (shower) {
                let widget = shower(dialog);
                if (widget) {
                    Recorder.registerClick(widget.center(), fast);
                }
            }
        }
        setTimeout(callback, 1);
    }

    replay_blockType_setValue(func, data, callback, fast, shower) {
        let dialog = Recorder.getBlockDialog();
        this.replay_dialog_setValue(dialog, func, data, callback, fast, shower);
    }

    replay_blockType_changeCategory(data, callback, fast) {
        this.replay_blockType_setValue('changeCategory', data, callback, fast,
        dialog => {
            return dialog.categories.children.filter(child => child.query())[0];
        });
    }

    replay_blockType_setScope(data, callback, fast) {
        this.replay_blockType_setValue('setScope', data, callback, fast,
        dialog => {
            return dialog.scopes.children.filter(scope => scope.query())[0];
        });
    }

    replay_blockType_setType(data, callback, fast) {
        this.replay_blockType_setValue('setType', data, callback, fast,
        dialog => {
            return dialog.types.children.filter(type => type.query())[0];
        });
    }

    replay_blockType_ok(data, callback, fast) {
        let dialog = Recorder.getBlockDialog();
        if (dialog) {
            Recorder.registerClick(dialog.buttons.children[0].center());
            dialog.ok();
        }
        setTimeout(callback, 1);
    }

    replay_blockType_cancel(data, callback, fast) {
        let dialog = Recorder.getBlockDialog();
        if (dialog) {
            Recorder.registerClick(dialog.buttons.children[1].center());
            dialog.cancel();
        }
        setTimeout(callback, 1);
    }

    replay_varDialog_prompt(data, callback, fast) {
        let varBlocks = ide.currentSprite.blocksCache['variables'];
        if (varBlocks) {
            let button = varBlocks[0];
            if (button instanceof PushButtonMorph) {
                Recorder.registerClick(button.center(), fast);
                button.action();
            }
        }
        setTimeout(callback, 1);
    }

    replay_varDialog_setType(data, callback, fast) {
        this.replay_dialog_setValue(Recorder.getNewVarDialog(), 'setType',
                data, callback, fast, dialog => {
            return dialog.types.children.filter(type => type.query())[0];
        });
    }

    replay_varDialog_accept(data, callback, fast) {
        let dialog = Recorder.getNewVarDialog();
        if (dialog) {
            Recorder.registerClick(dialog.buttons.children[0].center());
            dialog.accept();
        }
        setTimeout(callback, 1);
    }

    replay_varDialog_cancel(data, callback, fast) {
        let dialog = Recorder.getNewVarDialog();
        if (dialog) {
            Recorder.registerClick(dialog.buttons.children[1].center());
            dialog.cancel();
        }
        setTimeout(callback, 1);
    }

    replay_inputTyped(data, callback, fast) {
        let dialog = null;
        if (data.input === BlockDialogMorph.name) {
            dialog = Recorder.getBlockDialog();
        } else if (data.input === VariableDialogMorph.name) {
            dialog = Recorder.getNewVarDialog();
        } else if (data.input === InputSlotDialogMorph.name) {
            dialog = Recorder.getDialog('blockInput');
        } else {
            console.warn('Unknown input type', data.input);
        }
        if (dialog) {
            dialog.body.setContents(data.value);
        }
        setTimeout(callback, 1);
    }

    replay_blockEditor_start(data, callback, fast) {
        setTimeout(callback, 1);
        let blockDef = Recorder.getCustomBlock(data);
        if (!blockDef) {
            let editor = BlockEditorMorph.showing
                .filter(editor => editor.definition.spec === data.spec)[0];
            if (!editor) {
                console.warn('Missing block editor for spec: ', data.spec);
                return;
            }
            // If this block was just created, update its guid
            editor.definition.guid = data.guid;
            return;
        }

        // Otherwise just edit the Sprite
        new BlockEditorMorph(blockDef, window.ide.currentSprite).popUp();
    }

    replay_blockEditor_ok(data, callback, fast) {
        setTimeout(callback, 1);
        let editor = Recorder.findShowingBlockEditor(data.guid);
        editor.ok();
    }

    replay_blockEditor_apply(data, callback, fast) {
        setTimeout(callback, 1);
        let editor = Recorder.findShowingBlockEditor(data.guid);
        // There may not be an editor if they hit ok instead of apply
        if (!editor) return;
        editor.updateDefinition();
    }

    replay_blockEditor_cancel(data, callback, fast) {
        setTimeout(callback, 1);
        let editor = Recorder.findShowingBlockEditor(data.guid);
        editor.cancel();
    }

    replay_blockEditor_startUpdateBlockLabel(data, callback, fast) {
        setTimeout(callback, 1);
        const editor = Recorder.findShowingBlockEditor(data.definition.guid);
        const index = data.index;
        if (index < 0) return;
        try {
            // TODO: Could probably use a more robust system, but this seems
            // likely to work until code changes...
            const cbMorph = editor.body.children[0].children[0].children[0];
            const target = cbMorph.children[index];
            Recorder.registerClick(target.center(), fast);
            target.mouseClickLeft();
        } catch (e) {
            console.error('Block editor has no labels: ', editor, index, e);
        }
    }

    replayDialogAction(callback, fast, dialogKey, action, args, buttonFinder) {
        setTimeout(callback, 1);
        const dialog = Recorder.getDialog(dialogKey);
        if (!dialog) {
            console.warn('Missing dialog for key', dialogKey);
            return;
        }
        dialog[action](...args);
        if (buttonFinder) {
            const button = buttonFinder(dialog);
            if (button) {
                Recorder.registerClick(button.center(), fast);
            }
        }
    }

    replay_blockInput_setType(data, callback, fast) {
        this.replayDialogAction(
            callback, fast, 'blockInput', 'setType', [data.value], dialog => {
                return dialog.types[data.value ? 1 : 0];
            }
        );
    }

    replay_blockInput_accept(data, callback, fast) {
        this.replayDialogAction(
            callback, fast, 'blockInput', 'accept', [], dialog => {
                return dialog.buttons.children[0];
            }
        );
    }

    replay_blockInput_cancel(data, callback, fast) {
        this.replayDialogAction(
            callback, fast, 'blockInput', 'cancel', [], dialog => {
                const children = dialog.buttons.children;
                return children[children.length - 1];
            }
        );
    }

    replay_blockInput_deleteFragment(data, callback, fast) {
        this.replayDialogAction(
            callback, fast, 'blockInput', 'deleteFragment', [], dialog => {
                return dialog.buttons.children[1];
            }
        );
    }

    replay_IDE_toggleSingleStepping(data, callback, fast) {
        setTimeout(callback, 1);
        // Ignore this if the value is already correct
        if (data.value == Process.prototype.enableSingleStepping) return;
        Recorder.registerClick(
            window.ide.controlBar.steppingButton.center(), fast);
        window.ide.toggleSingleStepping();
    }

    replay_IDE_updateSteppingSlider(data, callback, fast) {
        setTimeout(callback, 1);
        Process.prototype.flashTime = data.value;
        window.ide.controlBar.steppingSlider.value =
            Process.prototype.flashTime * 100 + 1
        window.ide.controlBar.steppingSlider.fixLayout();
        Recorder.registerClick(
            window.ide.controlBar.steppingSlider.button.center(), fast);
    }

    replay_IDE_pause(data, callback, fast) {
        setTimeout(callback, 1);
        if (window.ide.stage.threads.isPaused()) return;
        Recorder.registerClick(
            window.ide.controlBar.pauseButton.center(), fast);
        window.ide.togglePauseResume();
    }

    replay_IDE_unpause(data, callback, fast) {
        setTimeout(callback, 1);
        if (!window.ide.stage.threads.isPaused()) return;
        Recorder.registerClick(
            window.ide.controlBar.pauseButton.center(), fast);
        window.ide.togglePauseResume();
    }

    replay_IDE_addSprite(data, callback, fast) {
        setTimeout(callback, 1);
        Recorder.registerClick(window.ide.corralBar.children[0].center(), fast);
        window.ide.addNewSprite();
        let sprite = window.ide.currentSprite;
        sprite.silentGotoXY(data.x, data.y);
        sprite.setColorComponentHSVA(0, data.hue);
        sprite.setColorComponentHSVA(1, 100);
        sprite.setColorComponentHSVA(2, data.lightness);
    }

    replay_IDE_selectSprite(data, callback, fast) {
        setTimeout(callback, 1);
        let icons = window.ide.corral.allChildren()
            .filter(c => c instanceof SpriteIconMorph);
        let icon = icons.filter(c => c.labelString === data.value)[0];
        if (!icon) return;
        Recorder.registerClick(icon.center(), fast);
        icon.action();
    }

    replay_spriteDropped(data, callback, fast) {
        setTimeout(callback, 1);
        let sprite = data.sprite;
        if (!sprite) return;
        sprite.silentGotoXY(data.x, data.y);
    }

    getActivePrompter() {
        return detect(
            window.ide.stage.children,
            morph => morph instanceof StagePrompterMorph
        );
    }

    replay_inputPromptEdited(data, callback, fast) {
        setTimeout(callback, 1);
        let prompter = this.getActivePrompter();
        if (!prompter) return;
        let stringMorph = prompter.inputField.contents().text;
        stringMorph.text = data.value;
        stringMorph.changed();
        stringMorph.fixLayout();
        stringMorph.rerender();
    }

    replay_inputPromptAccept(data, callback, fast) {
        setTimeout(callback, 1);
        let prompter = this.getActivePrompter();
        if (!prompter) return;
        Recorder.registerClick(prompter.button.center(), fast);
        prompter.accept();
    }

    findWatcherToggle(selectorOrSpec, isVar) {
        if (!ide.palette || !ide.palette.children[0]) return null;
        const paletteItems = ide.palette.children[0].children;
        for (let i = 0; i < paletteItems.length - 1; i++) {
            const item = paletteItems[i];
            const nextItem = paletteItems[i + 1];
            if (!(item instanceof ToggleMorph)) continue;
            if (!(nextItem instanceof BlockMorph)) continue;
            if (!isVar && nextItem.selector !== selectorOrSpec) continue;
            if (isVar && nextItem.blockSpec !== selectorOrSpec) continue;
            return item;
        }
        console.warn('Could not find toggle for:', selectorOrSpec);
        return null;
    }

    replay_sprite_toggleWatcher(data, callback, fast) {
        setTimeout(callback, 1);
        const sprite = ide.currentSprite, stage = ide.stage;
        const selector = data.selector;
        if (!sprite || !stage) return;
        // Don't toggle if already showing correctly. This can happen, e.g.
        // when the watcher is first created, which triggers a toggle
        if (sprite.showingWatcher(selector) == data.visible) return;
        const toggle = this.findWatcherToggle(selector, false);
        if (toggle == null) return;
        toggle.trigger();
        Recorder.registerClick(toggle.center(), fast);
        // sprite.toggleWatcher(
        //     selector, localize(info.spec), sprite.blockColor[info.category]);
        // const watcher = sprite.watcherFor(stage, selector);
        // if (watcher) {
        //     Recorder.registerClick(watcher.center(), fast);
        // }
    }

    replay_sprite_toggleVariableWatcher(data, callback, fast) {
        setTimeout(callback, 1);
        const sprite = ide.currentSprite, stage = ide.stage;
        const varName = data.varName;
        if (!sprite || !stage) return;
        // Don't toggle if already showing correctly. This can happen, e.g.
        // when the watcher is first created, which triggers a toggle
        if (sprite.showingVariableWatcher(varName) == data.visible) return;
        const toggle = this.findWatcherToggle(varName, true);
        if (toggle == null) return;
        toggle.trigger();
        Recorder.registerClick(toggle.center(), fast);
        // sprite.toggleVariableWatcher(varName);
        // const watcher = sprite.findVariableWatcher(varName);
        // if (watcher) {
        //     Recorder.registerClick(watcher.center(), fast);
        // }
    }
}

class Recorder {

    static blockMap = new Map();
    static recordScale = 1;
    // Offset to ensure all blockIDs not from logs are unique
    static ID_OFFSET = 10000;
    static onClickCallback = null;
    static openMenu = null;

    static resetSnap(startXML) {
        if (!window.world) return;
        // Important: close all dialog boxes *first*; otherwise Snap won't
        // successfully create a new project.
        window.world.children
            .filter(c => c instanceof DialogBoxMorph)
            .forEach(d => d.destroy());
        this.resetBlockMap();
        BlockMorph.nextId = Recorder.ID_OFFSET;
        if (!startXML) {
            window.ide.newProject();
            window.ide.changeCategory('motion');
        } else {
            // TODO: Is this async? Do I need to worry about it not being
            // finished?
            window.ide.rawOpenProjectString(startXML);
        }
    }

    static registerBlock(block) {
        this.blockMap.set(block.id, block);
    }

    static getBlock(id, isTemplate) {
        let block = this.blockMap.get(id);
        return block;
    }

    static getOrCreateBlock(blockDef) {
        let block = Recorder.getBlock(blockDef.id, blockDef.template);
        if (block) return block;
        let id = blockDef.id;
        let sprite = window.ide.currentSprite;
        if (blockDef.selector === 'reportGetVar') {
            // Not confident this is the best method for determining locality,
            // but should work
            let isLocal = !!sprite.variables.vars[blockDef.spec];
            block = sprite.variableBlock(blockDef.spec, isLocal);
        } else if (
            blockDef.selector === 'evaluateCustomBlock' && blockDef.guid
        ) {
            let customBlock = Recorder.getCustomBlock(blockDef.guid);
            if (!customBlock) {
                console.error('No custom block def for ', blockDef.guid);
                return null;
            }
            block = customBlock.blockInstance();
        } else {
            block = sprite.blockForSelector(
                blockDef.selector, true);
        }
        if (!block) return undefined;
        // console.log('Creating', blockDef, block);
        block.id = id;
        block.parent = this.getFrameMorph();
        block.isDraggable = true;
        // We actually shouldn't update this, so the offset continues to work
        // BlockMorph.nextId = Math.max(BlockMorph.nextId, blockDef.id + 1);
        this.blockMap.set(id, block);
        return block;
    }

    static getCustomBlock(guid) {
        let blocks = [];
        blocks = blocks.concat(ide.stage.globalBlocks);
        let sprites = ide.sprites.contents.concat([ide.stage]);
        sprites.forEach(sprite => {
            blocks = blocks.concat(sprite.customBlocks);
        });
        return blocks.filter(b => b.guid == guid)[0];
    }

    static findShowingBlockEditor(guid) {
        return BlockEditorMorph.showing
            .filter(editor => editor.definition.guid == guid)[0];
    }

    static getFrameMorph() {
        return ide.palette.children[0];
    }

    static setOnClickCallback(callback) {
        this.onClickCallback = callback;
    }

    static registerClick(point, fast) {
        if (fast) return;
        if (this.onClickCallback) {
            this.onClickCallback(point.x, point.y);
        }
    }

    static resetBlockMap() {
        Recorder.blockMap.clear();
    }

    static setRecordScale(scale) {
        ide.setBlocksScale(scale);
        Recorder.recordScale = scale;
    }

    static getDialog(key) {
        var instances = DialogBoxMorph.prototype.instances[window.world.stamp];
        if (!instances) return null;
        return instances[key];
    }

    static getBlockDialog() {
        return this.getDialog('makeABlock');
    }

    static getNewVarDialog() {
        return this.getDialog('newVar');
    }

    constructor() {
        this.records = [];
        this.index = 0;
        this.lastTime = new Date().getTime();
        this.isRecording = false;

        let blockChangedHandler = (m, data) => {
            data = Object.assign({}, data);
            if (m === 'InputSlot.edited') data.value = data.text;
            if (m === 'InputSlot.menuItemSelected') data.value = data.item;
            if (m === 'ColorArg.changeColor') data.value = data.color;
            this.addRecord(Record.fromInputSlotEdit(data));
        };
        Trace.addLoggingHandler('InputSlot.edited',
            blockChangedHandler);
        Trace.addLoggingHandler('InputSlot.menuItemSelected',
            blockChangedHandler);
        Trace.addLoggingHandler('ColorArg.changeColor',
            blockChangedHandler);
        Trace.addLoggingHandler('InputSlot.sliderInputEdited',
            blockChangedHandler);
        Trace.addLoggingHandler('BooleanSlotMorph.toggleValue',
            blockChangedHandler);

        let runHandler = this.defaultHandler('run');
        Trace.addLoggingHandler('IDE.greenFlag', runHandler);
        Trace.addLoggingHandler('Block.clickRun', runHandler);
        Trace.addLoggingHandler('Block.clickStopRun', runHandler);

        Trace.addLoggingHandler('IDE.stop', this.defaultHandler('stop'));

        Trace.addLoggingHandler(
            'IDE.changeCategory',
            this.defaultHandler('changeCategory'));

        this.addGroupedHandlers(
            'BlockTypeDialog',
            ['changeCategory', 'setScope', 'setType', 'ok', 'cancel'],
            'blockType');
        this.addGroupedHandlers(
            'BlockEditor',
            // TODO: Should ok be accept?
            ['start', 'ok', 'apply', 'cancel', 'startUpdateBlockLabel'],
            'blockEditor');
        this.addGroupedHandlers(
            'InputSlotDialogMorph',
            ['setType', 'accept', 'cancel', 'deleteFragment'],
            'blockInput');

        this.addGroupedHandlers(
            'VariableDialogMorph',
            ['setType', 'prompt', 'accept', 'cancel'],
            'varDialog');

        this.addGroupedHandlers(
            'IDE', [
                'toggleSingleStepping', 'updateSteppingSlider', 'pause',
                'unpause', 'selectSprite'
            ], 'IDE');

        this.addGroupedHandlers(
            'SpriteMorph', [
                'toggleVariableWatcher', 'toggleWatcher',
            ], 'sprite');
    };

    defaultHandler(type) {
        return (m, data) => {
            if (data !== Object(data)) {
                // Convert to an object if a single value
                data = {value: data};
            }
            data = Object.assign({}, data);
            data.message = m;
            this.addRecord(new Record(type, data));
        };
    };

    addGroupedHandlers(group, messages, typePrefix)  {
        messages.forEach(message => {
            Trace.addLoggingHandler(
                group + '.' + message,
                this.defaultHandler(typePrefix + '_' + message));
        });
    }

    recordMenu(parent, menu, open) {
        if (open && Recorder.openMenu) {
            // TODO: allow multiple menus?
            if (Recorder.openMenu.parent) {
                Recorder.openMenu.destroy();
            }
            Recorder.openMenu = null;
        }
        if (open) {
            Recorder.openMenu = menu;
        }
        this.addRecord(new Record('menu', {
            parent: parent,
            open: open,
            position: world.hand.position(),
        }));
    }

    recordEvent(type, data) {
        this.addRecord(new Record(type, data));
    }

    recordMenuItem(item, highlight) {
        let index = item.parent.children.indexOf(item);
        if (index < 0) return;
        this.addRecord(new Record('menuItemSelect', {
            index: index,
            highlight: highlight,
        }));
    }

    recordInputTyped(input, value) {
        this.addRecord(new Record('inputTyped', {
            input: input,
            value: value,
        }));
    }

    recordNewBlock() {
        this.addRecord(new Record('blockType_newBlock', {}));
    }

    addRecord(record) {
        if (!this.isRecording) return false;
        let time = new Date().getTime();
        record.timeDelta = time - this.lastTime;
        this.lastTime = time;
        this.records.splice(this.index++, 0, record);
        console.log(record);
    }

    addDropRecord(dropRecord) {
        if (!dropRecord.lastDroppedBlock) return;
        // console.log(dropRecord);
        var record = Record.fromDropRecord(dropRecord);
        this.addRecord(record);
    }

    playNext() {
        if (this.index >= this.records.length) return;
        this.records[this.index++].replay();
    }

    stop() {
        const json = JSON.stringify(this.records, null, 4);
        window.localStorage.setItem('playback', json);
        saveData(new Blob([json]), this.recordingName + '-logs.json');
        saveData(new Blob([this.startXML]), this.recordingName + '-start.xml');
        if (this.audioRecorder) {
            this.audioRecorder.stop(this.recordingName + '-audio');
        }
        this.isRecording = false;
    }

    start(keepOldRecords, noAudio) {
        if (!keepOldRecords) this.records = []
        let ide = window.ide;
        this.startXML = ide.serializer.serialize(ide.stage);
        let date = new Date();
        this.lastTime = date.getTime();
        this.recordingName = '' + this.lastTime;
        this.isRecording = true;
        if (!noAudio) {
            this.audioRecorder = new AudioRecorder(true);
        }
        this.addRecord(new Record('setBlockScale', {
            'scale': SyntaxElementMorph.prototype.scale,
        }));
    }

    loadFromCache() {
        try {
            let stored = JSON.parse(
                window.localStorage.getItem('playback') || '[]');
            this.records = this.loadRecords(stored);
            // TODO: need to figure out if we support re-recording and if so
            // what happens to time/index?
            this.isRecording = false;
            // this.lastTime = new Date().getTime();
        } catch {}
    }

    loadRecords(json) {
        let records = json.slice();
        for (let i = 0; i < records.length; i++) {
            records[i] = Object.assign(new Record(), records[i]);
        }
        return records;
    }

    static getSprite(name) {
        return ide.sprites.contents.filter(s => s.name === name)[0];
    }

    static deserialize(original) {

        let record = Object.assign({}, original);

        Object.keys(record).forEach(prop => {
            if (!record.hasOwnProperty(prop)) return;

            let value = record[prop];
            if (!value) return;

            if (value !== Object(value)) {
                return;
            }

            let type = value.objType;
            // console.log(prop, value);
            if (type === BlockMorph.name) {
                record[prop] = Recorder.getOrCreateBlock(value);
            } else if (type === ArgMorph.name) {
                let block = Recorder.getOrCreateBlock(value);
                record[prop] = block.inputs()[value.argIndex];
                // Add index for new redo system
                record[prop].indexInParent = value.argIndex;
            } else if (type === ScriptsMorph.name) {
                record[prop] = null;
                if (value.source === 'Sprite') {
                    window.ide.sprites.contents.forEach(sprite => {
                        if (sprite.name === value.spriteName) {
                            record[prop] = sprite.scripts;
                        }
                    });
                } else if (value.source === 'Editor') {
                    let editor = Recorder.findShowingBlockEditor(value.guid);
                    if (editor) {
                        record[prop] = editor.body.children[0];
                    }
                }
                if (!record[prop]) {
                    console.warn('Cannot find ScriptsMorph', prop, value);
                }
            } else if (type === FrameMorph.name) {
                record[prop] = Recorder.getFrameMorph();
            } else if (type === ScrollFrameMorph.name) {
                // TODO: This may be overly simplistic...
                record[prop] = Recorder.getFrameMorph().scrollFrame;
            } else if (type === Point.name) {
                let recordScale = Recorder.recordScale;
                let rescale = SyntaxElementMorph.prototype.scale / recordScale;
                record[prop] = new Point(value.x * rescale, value.y * rescale);
            } else if (type == BlockLabelFragment.name) {
                record[prop] = Object.assign(new BlockLabelFragment(), value);
            } else if (type === Color.name) {
                record[prop] = Object.assign(new Color(), value);
            } else if (type === 'SpriteMorph') {
                record[prop] = this.getSprite(value.name);
                if (!record[prop]) {
                    console.warn('Could not find sprite:', value.name);
                }
            } else if (type === 'Object') {
                record[prop] = this.deserialize(value);
            } else if (Array.isArray(value)) {
                record[prop] = value.slice();
            } else {
                console.error('Unknown object in record!', prop, value);
            }
        });
        return record;
    }

    static debugType(object) {
        return /function (.{1,})\(/.exec(
            object.constructor.toString())[1];
    }

    static serialize(dropRecord) {
        let record = Object.assign({}, dropRecord);
        Object.keys(record).forEach(prop => {
            if (!record.hasOwnProperty(prop)) return;
            if (prop === 'nextRecord' || prop === 'lastRecord') {
                delete record[prop];
                return;
            }

            let value = record[prop];
            if (!value) return;

            // if ({}.toString.call(value) === '[object Function]') {
            //     console.log(prop, 'is a function')
            //     delete record[prop];
            //     return;
            // }

            let type = typeof(value);
            if (type === 'object') type = Recorder.debugType(value);
            // console.log(prop, value);
            if (value instanceof BlockMorph) {
                record[prop] = value.blockId();
                const def = value.definition;
                if (def && def.guid) record[prop].guid = def.guid;
                record[prop].objType = BlockMorph.name;
            } else if (value instanceof ArgMorph) {
                record[prop] = value.argId();
                if (record[prop].argIndex === -1 &&
                        prop === 'lastReplacedInput') {
                    // Since the arg has been replaced, we actually want the
                    // index of the block that replaced it
                    record[prop].argIndex =
                        dropRecord.lastDropTarget.inputs()
                        .indexOf(dropRecord.lastDroppedBlock);
                }
                if (record[prop].argIndex === -1) {
                    console.warn('Unknown arg index:', value);
                }
                record[prop].objType = ArgMorph.name;
            } else if (value instanceof ScriptsMorph) {
                let editorParent = value.parentThatIsA(BlockEditorMorph);
                if (editorParent) {
                    record[prop] = editorParent.getDefinitionJSON();
                    record[prop].source = 'Editor'
                } else {
                    let selectedSprite = null;
                    window.ide.sprites.contents.forEach(sprite => {
                        if (sprite.scripts === value) {
                            selectedSprite = sprite;
                        }
                    })
                    if (selectedSprite) {
                        record[prop] = {
                            'source': 'Sprite',
                            'spriteName': selectedSprite.name
                        };
                    } else {
                        console.warn('Unknown scripts source!', value)
                        record[prop] = {'source': 'Unknown'};
                    }
                }
            } else if (value instanceof FrameMorph) {
                record[prop] = {'source': 'Palette'};
            } else if (
                value instanceof Point || value instanceof Color ||
                value instanceof BlockLabelFragment
            ) {
                // nothing to do
            } else if (value instanceof SpriteMorph) {
                record[prop] = {
                    name: value.name,
                };
            } else if (type === 'Object') {
                // recurse
                record[prop] = this.serialize(value);
            } else if (value === Object(value)) {
                console.error('Unknown object in record!', prop, value);
            }
            if (!record[prop].objType && value === Object(value)) {
                record[prop].objType = type;
            }
        });
        return record;
    };

}

window.recorder = new Recorder();
// window.recorder.loadFromCache();