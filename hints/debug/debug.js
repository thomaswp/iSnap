showDebugInfo = function(info) {

    localStorage.setItem('last-info', JSON.stringify(info));

    console.log(info);
    $('#from-container').html('<pre id="debug-from">{0}</pre>'.format(
        prettyPrintNode(info.from, true)));
    $('#to-container').html('<pre id="debug-to">{0}</pre>'.format(
        prettyPrintNode(info.to, true)));

    var fromDic = {}, toDic = {};

    $('#debug-from span.node').each(function(i, span) {
        fromDic[$(span).data('id')] = span;
    });
    $('#debug-to span.node').each(function(i, span) {
        toDic[$(span).data('id')] = span;
    });

    var mapping = info.mapping.nodeMapping;
    Object.keys(mapping).forEach(function(fromID) {
        var toID = mapping[fromID];

        var fromSpan = fromDic[fromID];
        var toSpan = toDic[toID];

        $(fromSpan).addClass('paired');
        $(fromSpan).attr('data-pair-id', toID);
        $(toSpan).addClass('paired');
        $(toSpan).attr('data-pair-id', fromID);
    });

    showCostCalculation(info, fromDic, toDic);

    updateNodes();
};

showCostCalculation = function(info, fromDic, toDic) {
    var fromMap = {}, toMap = {};

    function addToMap(node, map) {
        map[node.id] = node;
        if (node.children) {
            node.children.forEach(function(child) {
                child.parent = node;
                addToMap(child, map);
            });
        }
    }

    addToMap(info.from, fromMap);
    addToMap(info.to, toMap);

    function getDiff(from, to) {
        getChildren = function(node) {
            return '[' + node.children.map(function(child) {
                return child.type;
            }).join(', ') + ']';
        };
        return DebugDisplay.prototype.createDiff(
            getChildren(from), getChildren(to));
    }

    $table = $('#cost-container');
    $table.find('tr:gt(0)').remove();
    info.mapping.itemizedCost.forEach(function(item) {
        var from = fromMap[item.fromID], to = toMap[item.toID];

        $row = $('<tr>');
        $row.append($('<td>').html(-item.cost));
        $row.append($('<td>').html(item.type));
        $node = $(makeNodeSpan(from));

        $node.addClass('paired');
        $node.data('data-pair-id', item.toID);
        var fromSpan = fromDic[item.fromID], toSpan = toDic[item.toID];
        $node.hover(function() {
            showInfo(fromSpan, toSpan);
        }, function() {
            hideInfo(fromSpan, toSpan);
        });

        $row.append($('<td>').append($('<pre>').append($node)));

        var explanation;
        if (item.type === 'Match Children') {
            explanation = getDiff(from, to);
        } else {
            explanation = 'Nodes matched that were unpaired in their parents';
        }

        $row.append($('<td>').html(explanation));
        $table.append($row);
    });

    $table.append($('<tr>')
        .append($('<th>').html(-info.mapping.cost))
        .append($('<th>').html('Total Reward')));
};

makeNodeSpan = function(node) {
    function escape(string) {
        if (string == null) return '';
        return string.replace('"', '&quot;').replace(/</g, '&lt;');
    }
    return ('<span class="node {1}" data-id="{0}" data-type="{1}" ' +
                'data-value="{2}" title="{1}"></span>')
            .format(escape(node.id), escape(node.type), escape(node.value));
};

prettyPrintNode = function(node, html, indent) {
    indent = indent || 0;

    var hasBody = ['snapshot', 'stage', 'sprite', 'script', 'customBlock'];
    var inline = !hasBody.includes(node.type);
    var children = node.children;

    var out = node.type;
    if (html) {
        out = makeNodeSpan(node);
    }

    if (children && children.length > 0) {
        var i;
        if (inline) {
            out += '(';
            for (i = 0; i < children.length; i++) {
                if (i > 0) out += ', ';
                if (children[i] == null) {
                    out += 'null';
                    continue;
                }
                out += prettyPrintNode(children[i], html, indent);
            }
            out += ')';
        } else {
            out += ' {\n';
            var indentString = ''.padEnd(indent * 3, ' ');
            indent++;
            var indentMore = ''.padEnd(indent * 3, ' ');
            for (i = 0; i < children.length; i++) {
                if (children[i] == null) {
                    out += indentMore + 'null\n';
                    continue;
                }
                out += indentMore +
                    prettyPrintNode(children[i], html, indent) + '\n';
            }
            out += indentString + '}';
        }
    }
    return out;
};

updateNodes = function() {
    var useValues = $('#values-checkbox').is(':checked');
    $('.node').each(function(i, node) {
        var text = $(node).data('type');
        if (useValues) {
            var value = $(node).data('value');
            if (value) text = value;
        }
        $(node).html(text);
    });

    $('span.paired').unbind('mouseenter mouseleave').each(function(i, span) {
        var id = $(span).data('id');
        var selector = 'span[data-id="{0}"], span[data-pair-id="{0}"]'.format(
            id, id);
        $(span).hover(function() {
            $(selector).addClass('hover');
        }, function() {
            $(selector).removeClass('hover');
        });
    });
};

(function() {
    var last = localStorage.getItem('last-info');
    if (last != null) showDebugInfo(JSON.parse(last));

    $('#values-checkbox').change(function() {
        updateNodes();
    });
})();