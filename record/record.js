require('isnap/util.js')

extend(ScriptsMorph, 'recordDrop', function(base, lastGrabOrigin) {
    base.call(this, lastGrabOrigin);
    window.recorder.record(this.dropRecord);
});

class Recorder {

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
        scripts.redrop(dropRecord);
    }

    record(dropRecord) {
        if (!dropRecord.lastDroppedBlock) return;
        var record = this.serialize(dropRecord);
        console.log(record);
        this.records.splice(this.index++, 0, record);
    }

    getBlockMap() {
        let map = {};
        let scripts = []
        editor.sprites.contents.forEach(sprite => {
            scripts.push(sprite.scripts);
        });

    }

    static findBlock(parent, id) {
        if (parent instanceof BlockMorph && parent.id === id) {
            return parent;
        }
        if (parent == null || !parent.children ||
                parent instanceof FrameMorph) {
            return null;
        }
        for (child in parent.children) {
            let block = Recorder.findBlock(child, id);
            if (block) return block;
        };
        return null;
    }

    deserialize(record) {

        let dropRecord = Object.assign({}, record);
        if (dropRecord.lastOrigin) {
            var lastOrigin = dropRecord.lastOrigin =
                this.deserialize(dropRecord.lastOrigin);
        }

        Object.keys(dropRecord).forEach(prop => {
            if (!record.hasOwnProperty(prop)) return;

            let value = record[prop];
            if (!value) return;

            if (value !== Object(value)) {
                return;
            }

            let type = value.type;
            // console.log(prop, value);
            if (value.type === BlockMorph.name) {
                record[prop] = Recorder.findBlock(lastOrigin, value.id);
                // TODO: create if missing
            } else if (value.type === ArgMorph.name) {
                let block = Recorder.findBlock(lastOrigin, value.blockId);
                if (block == null) {
                    // TODO
                    record[prop] = null;
                }
                record[prop] = block.inputs()[value.index];
            } else if (value.type === ScriptsMorph.name) {
                record[prop] = null;
                if (value.source === 'Sprite') {
                    window.ide.sprite.contents.forEach(sprite => {
                        if (sprite.name === value.name) {
                            record[prop] = sprite.scripts;
                        }
                    });
                } else if (value.source === 'Editor') {
                    // TODO
                } else if (value.source === 'Palette') {
                    // TODO
                }
            } else if (value.type == FrameMorph.name) {
                // TODO?
            } else if (value.type === Point.name) {
                // nothing to do
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
                record[prop].type = BlockMorph.name;
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
            if (!record[prop].type && value === Object(value)) {
                record[prop].type = type;
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