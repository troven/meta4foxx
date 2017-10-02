'use strict';

const _ = require("lodash");
const assert = require("assert");

module.exports = {

    configure: function(options) {
        console.log("[meta4foxx] noop: configure: %o", options);
    },
    endpoint: function(endpoint) {
        console.log("[meta4foxx] noop: endpoint");
    },
    beforeCreate: function(model, req, res) {
        console.log("[meta4foxx] noop: beforeCreate: %o", model);
    },
    afterCreate: function(model, req, res) {
        console.log("[meta4foxx] noop: afterCreate: %o", model);
    },
    beforeUpdate: function(model, req, res) {
        console.log("[meta4foxx] noop: beforeUpdate: %o", model);
    },
    afterUpdate: function(model, req, res) {
        console.log("[meta4foxx] noop: afterUpdate: %o", model);
    },
    beforeRead: function(model, req, res) {
        console.log("[meta4foxx] noop: beforeRead: %o", model);
    },
    afterRead: function(model, req, res) {
        console.log("[meta4foxx] noop: afterRead: %o", model);
    },
    beforeDelete: function(model, req, res) {
        console.log("[meta4foxx] noop: beforeDelete: %o", model);
    }
}
