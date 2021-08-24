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
        }
        console.log('Playing:', this.data);
        let data = Recorder.deserialize(this.data);
        this[method].call(this, data, callback, fast);
    }

    replay_blockDrop(dropRecord, callback, fast) {
        let sprite = window.ide.currentSprite;
        let scripts = sprite.scripts;
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
        if (data && data.id) {
            // Click run or stop run
            let block = Recorder.getOrCreateBlock(data);
            block.mouseClickLeft();
            let receiver = block.scriptTarget();
            let proc = threads.findProcess(block, receiver);
            let click = block.center().add(lastRun.position()).divideBy(2);
            Recorder.registerClick(click, fast);
            if (!proc == (data.message === 'Block.clickStopRun')) {
                // If we're starting or stopping and the script is already 
                // running/not-running just return
                setTimeout(callback, 1);
                return;
            }
            stopCondition = () => {
                // Stop when the thread has stopped running
                return !receiver || !threads.findProcess(block, receiver);
            };
        } else {
            // Green flag
            let click = ide.controlBar.startButton.center();
            Recorder.registerClick(click, fast);
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
            console.log("stopping", data);
            clearInterval(interval);
            callback();
        }, 100); // TODO: This causes a bug when lower - find out why
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
}

class Recorder {

    static blockMap = new Map();
    static recordScale = 1;
    // Offset to ensure all blockIDs from logs are unique
    // TODO: if we ever record snapshots, need to adjust this
    static ID_OFFSET = 1000;
    static onClickCallback = null;

    static registerBlock(block) {
        this.blockMap.set(block.id, block);
    }

    static getBlock(id, isTemplate) {
        if (!isTemplate) {
            id += Recorder.ID_OFFSET;
        }
        let block = this.blockMap.get(id);
        return block;
    }

    static getOrCreateBlock(blockDef) {
        let block = Recorder.getBlock(blockDef.id, blockDef.template);
        if (block) return block;
        let id = blockDef.id + Recorder.ID_OFFSET
        block = window.ide.currentSprite.blockForSelector(
            blockDef.selector, true);
        block.id = id;
        block.parent = this.getFrameMorph();
        block.isDraggable = true;
        // We actually shouldn't update this, so the offset continues to work
        // BlockMorph.nextId = Math.max(BlockMorph.nextId, blockDef.id + 1);
        this.blockMap.set(id, block);
        return block;
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
        Recorder.recordScale = scale;
    }

    constructor() {
        this.records = [];
        this.index = 0;
        this.lastTime = new Date().getTime();
        this.isRecording = false;

        let blockChangedHandler = (m, data) => {
            data = Object.assign({}, data)
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

        let defaultHandler = (type) => (m, data) => {
            if (data !== Object(data)) {
                // Convert to an object if a single value
                data = {value: data};
            }
            data = Object.assign({}, data);
            data.message = m;
            this.addRecord(new Record(type, data));
        };

        let runHandler = defaultHandler('run');
        Trace.addLoggingHandler('IDE.greenFlag', runHandler);
        Trace.addLoggingHandler('Block.clickRun', runHandler);
        Trace.addLoggingHandler('Block.clickStopRun', runHandler);

        Trace.addLoggingHandler('IDE.stop', defaultHandler('stop'));

        Trace.addLoggingHandler('IDE.changeCategory', defaultHandler('changeCategory'));
    };

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
        saveData(new Blob([json]), this.recordingName + '.json');
        if (this.audioRecorder) this.audioRecorder.stop(this.recordingName);
        this.isRecording = false;
    }

    start(keepOldRecords, noAudio) {
        if (!keepOldRecords) this.records = []
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
            } else if (type === ScriptsMorph.name) {
                record[prop] = null;
                if (value.source === 'Sprite') {
                    window.ide.sprites.contents.forEach(sprite => {
                        if (sprite.name === value.spriteName) {
                            record[prop] = sprite.scripts;
                        }
                    });
                } else if (value.source === 'Editor') {
                    BlockEditorMorph.showing.forEach(editor => {
                        if (editor.definition.guid === value.guid) {
                            record[prop] = editor.body.children[0];
                        }
                    });
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
            } else if (type === Color.name) {
                record[prop] = Object.assign(new Color(), value);
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
            if (type === 'object') type = value.getDebugType();
            // console.log(prop, value);
            if (value instanceof BlockMorph) {
                record[prop] = value.blockId();
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
            } else if (value instanceof Point || value instanceof Color) {
                // nothing to do
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