const _ = require("lodash");

module.exports = function(json) {
    var csv = "";
    if (!json || !json.length) return csv;
    var headers = _.keys( json[0] );
    _.each(headers, function(header) {
        if (csv) csv+=",";
        csv+=header;
    })
    csv+="\n";

    _.each(json, function(row) {
        var row$ = "";
        _.each(headers, function(name) {
            if (row$) row$+=",";
            if (!_.isObject(row[name])) {
                row$+=row[name];
            }
        })
        csv+=row$+"\n";
    })
    return csv;
}