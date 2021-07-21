require('isnap/util.js')

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

    replay() {
        let method = 'replay_' + this.type;
        if (!this[method]) {
            console.warn('Unknown record type: ' + this.type);
        }
        console.log('Playing:', this.data);
        let data = Recorder.deserialize(this.data);
        this[method].call(this, data);
    }

    replay_blockDrop(dropRecord) {
        let sprite = window.ide.currentSprite;
        let scripts = sprite.scripts;
        scripts.playDropRecord(dropRecord);
    }

    replay_inputSlotEdit(data) {
        let block = Recorder.getOrCreateBlock(data.id);
        let input = block.inputs()[data.id.argIndex];
        if (input instanceof ColorSlotMorph) {
            input.setColor(data.value);
        } else if (input instanceof InputSlotMorph) {
            input.setContents(data.value);
        }
    }
}

class Recorder {

    static blockMap = new Map();

    static registerBlock(block) {
        this.blockMap.set(block.id, block);
    }

    static getOrCreateBlock(blockDef) {
        // TODO: May need to worry about overwriting blockIDs
        let block = this.blockMap.get(blockDef.id);
        if (block) return block;
        block = window.ide.currentSprite.blockForSelector(
            blockDef.selector, true);
        block.id = blockDef.id;
        block.parent = this.getFrameMorph();
        block.isDraggable = true;
        BlockMorph.nextId = Math.max(BlockMorph.nextId, blockDef.id + 1);
        this.blockMap.set(blockDef.id, block);
        return block;
    }

    static getFrameMorph() {
        return ide.palette.children[0];
    }

    constructor() {
        this.records = [];
        this.recording = true;
        this.index = 0;
        this.lastTime = new Date().getTime();
        this.isRecording = true;

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

    save() {
        window.localStorage.setItem('playback', JSON.stringify(this.records));
    }

    start(keepOldRecords) {
        if (!keepOldRecords) this.records = []
        this.startTime = new Date().getTime();
        this.isRecording = true;
    }

    load() {
        try {
            this.records =
                JSON.parse(window.localStorage.getItem('playback') || '[]');
            for (let i = 0; i < this.records.length; i++) {
                this.records[i] = Object.assign(new Record(), this.records[i]);
            }
            // TODO: need to figure out if we support re-recording and if so
            // what happens to time/index?
            this.isRecording = false;
            // this.lastTime = new Date().getTime();
        } catch {}
    }

    static deserialize(record) {

        let dropRecord = Object.assign({}, record);

        Object.keys(dropRecord).forEach(prop => {
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
            } else if (type === Point.name) {
                record[prop] = new Point(value.x, value.y);
            } else if (type === Color.name) {
                record[prop] = Object.assign(new Color(), value);
            } else if (type === 'Object') {
                record[prop] = this.deserialize(value);
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
window.recorder.load();

setTimeout(() => {
    window.onbeforeunload = function() {
        window.recorder.save();
    };
}, 1000);