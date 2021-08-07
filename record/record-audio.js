
class AudioRecorder {
    static isSupported() {
        return navigator.mediaDevices.getUserMedia;
    }

    constructor(autostart) {
        this.chunks = [];
        this.fileName = 'audio'
        let onError = function(err) {
            console.error('The following error occurred: ' + err);
        }
        let onSuccess = (stream) => this.#setup(stream, autostart);
        const constraints = { audio: true };
        navigator.mediaDevices
            .getUserMedia(constraints)
            .then(onSuccess, onError);
    }

    start() {
        if (!this.loaded) {
            console.warn('Attempted to start audio before loaded');
            return;
        }
        this.mediaRecorder.start();
        console.log("recorder started");
    }

    stop(name) {
        if (!this.loaded) return;
        this.fileName = name;
        this.mediaRecorder.stop();
    }

    #setup(stream, autostart) {
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.onstop = () => this.#handleStop();
        this.mediaRecorder.ondataavailable = (e) => {
            this.chunks.push(e.data);
        };
        this.loaded = true;
        if (autostart) this.start();
    }

    #handleStop() {
        // const audio = document.createElement('audio');
        // audio.controls = true;
        const blob = new Blob(
            this.chunks,
            { 'type': 'audio/ogg; codecs=opus' }
        );
        saveData(blob, this.fileName + '.ogg');
        this.chunks = [];
        // audio.src = audioURL;
        console.log("recorder stopped");
    }
}

document.addEventListener("DOMContentLoaded", function(){
    window.saveData = (function () {
        var a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        return function (blob, fileName) {
            const url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
        };
    }());
});
