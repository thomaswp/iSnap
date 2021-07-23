
class Editor {
    constructor(path) {
        this.path = path;
        this.audioPath = path + 'audio.ogg';
        this.logs = [];
        this.words = [];
        this.scriptEvents = [];

        $('#audio').attr('src', this.audioPath)
            .attr('type', 'audio/ogg')
            .attr('controls', true);
        $.ajax({
            url: path + 'logs.json',
            success: (data) => this.addLogs(data)
        });
        $.ajax({
            url: path + 'transcript.json',
            success: (data) => this.addTranscript(data)
        });
    }

    addLogs(json) {
        // TODO convert
        this.logs.push(...json);
        this.generateScript();
    }

    addTranscript(json) {
        this.words.push(json.transcripts[0].words);
        this.generateScript();
    }

    generateScript() {
        $('#script').text(JSON.stringify(this.logs, null, 4) +
            JSON.stringify(this.words, null, 4));
    }
}

$(document).ready(() => {
    new Editor('sample/1627046605547/');
});