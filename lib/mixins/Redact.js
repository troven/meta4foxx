'use strict';

const _ = require("lodash");
const assert = require("assert");

var DEBUG = false;

module.exports = {

    afterRead: function(model, req, res, options) {
        _.each(options.redact, function(redact) {
            if ( _.isString(redact) ) {
                DEBUG && console.log("redact: %o", redact);
                delete model[redact];
            }
        });
        return model;
    }
}
