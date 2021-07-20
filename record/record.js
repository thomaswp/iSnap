require('isnap/util.js')

extend(ScriptsMorph, 'recordDrop', function(base, lastGrabOrigin) {
    base.call(this, lastGrabOrigin);
    // Record the situation now instead of waiting to undo
    if (this.dropRecord.lastDroppedBlock) {
        this.dropRecord.situation =
                this.dropRecord.lastDroppedBlock.situation();
    }
    window.recorder.record(this.dropRecord);
});

extend(BlockMorph, 'init', function(base) {
    base.call(this);
    Recorder.registerBlock(this);
});

class Recorder {

    static blockMap = new Map();

    static registerBlock(block) {
        this.blockMap.set(block.id, block);
    }

    static getOrCreateBlock(blockDef) {
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
    };

    save() {
        window.localStorage.setItem('playback', JSON.stringify(this.records));
    }

    load() {
        try {
            this.records =
                JSON.parse(window.localStorage.getItem('playback') || '[]');
        } catch {}
    }

    playNext() {
        if (this.index >= this.records.length) return;
        let dropRecord = this.deserialize(this.records[this.index++]);
        console.log('Playing:', dropRecord);
        let sprite = window.ide.currentSprite;
        let scripts = sprite.scripts;
        scripts.playDropRecord(dropRecord);
    }

    record(dropRecord) {
        if (!dropRecord.lastDroppedBlock) return;
        var record = this.serialize(dropRecord);
        console.log(record);
        this.records.splice(this.index++, 0, record);
    }

    deserialize(record) {

        let dropRecord = Object.assign({}, record);
        // if (dropRecord.lastOrigin) {
        //     var lastOrigin = dropRecord.lastOrigin =
        //         this.deserialize(dropRecord.lastOrigin);
        // }

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
                let block = Recorder.getOrCreateBlock(value.blockId);
                record[prop] = block.inputs()[value.index];
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
            } else if (type === 'Object') {
                record[prop] = this.deserialize(value);
            } else {
                console.error('Unknown object in record!', prop, value);
            }
        });
        return record;
    }

    serialize(dropRecord) {
        let record = Object.assign({}, dropRecord);
        Object.keys(record).forEach(prop => {
            if (!record.hasOwnProperty(prop)) return;
            if (prop === 'nextRecord' || prop === 'lastRecord') {
                delete record[prop];
                return;
            }

            let value = record[prop];
            if (!value) return;

            if ({}.toString.call(value) === '[object Function]') {
                console.log(prop, 'is a function')
                delete record[prop];
                return;
            }

            let type = typeof(value);
            if (type === 'object') type = value.getDebugType();
            // console.log(prop, value);
            if (value instanceof BlockMorph) {
                record[prop] = value.blockId();
                record[prop].objType = BlockMorph.name;
            } else if (value instanceof ArgMorph) {
                record[prop] = value.argId();
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
            } else if (value instanceof Point) {
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