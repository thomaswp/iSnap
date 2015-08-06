StageMorph.prototype.init = function (globals) {
    this.name = localize('Stage');
    this.threads = new ThreadManager();
    this.variables = new VariableFrame(globals || null, this);
    this.scripts = new ScriptsMorph(this);
    this.customBlocks = [];
    this.globalBlocks = [];
    this.costumes = new List();
    this.costume = null;
    this.sounds = new List();
    this.version = Date.now(); // for observers
    this.isFastTracked = false;
    this.cloneCount = 0;

    this.timerStart = Date.now();
    this.tempo = 60; // bpm
    this.lastMessage = '';

    this.watcherUpdateFrequency = 2;
    this.lastWatcherUpdate = Date.now();

    this.scale = 1; // for display modes, do not persist

    this.keysPressed = {}; // for handling keyboard events, do not persist
    this.blocksCache = {}; // not to be serialized (!)
    this.paletteCache = {}; // not to be serialized (!)
    this.lastAnswer = ''; // last user input, do not persist
    this.activeSounds = []; // do not persist

    this.trailsCanvas = null;
    this.isThreadSafe = false;

    this.graphicsValues = { 'negative': 0,
                            'fisheye': 0,
                            'whirl': 0,
                            'pixelate': 0,
                            'mosaic': 0,
                            'brightness': 0,
                            'color': 0,
                            'comic': 0,
                            'duplicate': 0,
                            'confetti': 0
                        };

    StageMorph.uber.init.call(this);

    this.acceptsDrops = false;
    this.setColor(new Color(255, 255, 255));
    this.fps = this.frameRate;
};