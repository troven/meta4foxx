'use strict';

const _ = require("lodash");
const assert = require("assert");

module.exports = {

    configure: function(options) {
        console.log("noop: configure: %o", options);
    },
    endpoint: function(endpoint) {
        console.log("noop: endpoint");
    },
    beforeCreate: function(model, req, res) {
        console.log("noop: beforeCreate: %o", model);
    },
    afterCreate: function(model, req, res) {
        console.log("noop: afterCreate: %o", model);
    },
    beforeUpdate: function(model, req, res) {
        console.log("noop: beforeUpdate: %o", model);
    },
    afterUpdate: function(model, req, res) {
        console.log("noop: afterUpdate: %o", model);
    },
    beforeRead: function(model, req, res) {
        console.log("noop: beforeRead: %o", model);
    },
    afterRead: function(model, req, res) {
        console.log("noop: afterRead: %o", model);
    },
    beforeDelete: function(model, req, res) {
        console.log("noop: beforeDelete: %o", model);
    }
}
