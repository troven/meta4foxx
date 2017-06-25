const _ = require("lodash");

module.exports = function(json) {
    var csv = "";
    if (!json || !json.length) return csv;

    // write the headers
    var headers = _.keys( json[0] );
    _.each(headers, function(header) {
        if ( !_.isObject(json[0][header]) && header.indexOf("_")!=0 ) {
            if (csv) csv+=",";
            csv+=header;
        }
    });
    csv+="\n";

    // write the rows
    _.each(json, function(row) {
        var row$ = "";
        // write each column
        _.each(headers, function(name) {
            if (!_.isObject(row[name]) && name.indexOf("_")!=0) {
                if (row$) row$+=",";
                row$+=row[name];
            }
        })
        csv+=row$+"\n";
    });
    return csv;
}