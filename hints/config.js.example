
function getHintURL() {
    return location.protocol + '//' + location.hostname +
        ':8080/HintServer/hints';
}

function getHintProvider() {
    var url = getHintURL();
    // After X consecutive hint dialogs, the HintDisplay can show a warning
    var hintWarning = 6;
    // Options: HintDisplay, DebugDisplay, SnapDisplay
    var displays = [new HighlightDisplay(hintWarning)];
    var reloadCode = false; // automatically reloads last code
    return new HintProvider(url, displays, reloadCode);
}
