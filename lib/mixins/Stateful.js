'use strict';

const _ = require("lodash");
const assert = require("assert");

var DEBUG = true;

module.exports = {

    configure: function(options) {
        return options;
    },
    endpoint: function(endpoint, options) {
        return endpoint;
    },
    beforeRequest: function(filter, req, res, options) {
    },
    beforeCreate: function(model, req, res, options) {
    },
    afterCreate: function(model, req, res, options) {
    },
    beforeUpdate: function(model, req, res, options) {
    },
    afterUpdate: function(model, req, res, options) {
    },
    beforeRead: function(model, req, res, options) {
    },
    afterRead: function(models, req, res, options) {
    },
    beforeDelete: function(model, req, res, options) {
    }
}
