'use strict';

const _ = require("lodash");
const assert = require("assert");

/**
 * Declare the supported Mixins
 *
 *
 * @type {*[]}
 */
var _mixins = {};

module.exports = function(options) {
    options.mixins = {};

    options.mixins.nested = require("./NestedModels");
    options.mixins.context = require("./ContextCollection");
    // options.mixins.crypto = require("./Crypto");
    options.mixins.redact = require("./Redact");
    // options.mixins.state = require("./Stateful");
    options.mixins.meta4 = require("./meta4");

    const Mixin = function(self, action, args) {
        _.each(options.mixins, function(mixin, name) {
            mixin[action] && mixin[action].apply(self, args);
        });
    }

    return {
        configure: function(options) {
            Mixin(this, "configure", arguments);
        },
        endpoint: function(endpoint, options) {
            Mixin(this, "endpoint", arguments);
        },
        beforeRequest: function(model, req, res, options) {
            Mixin(this, "beforeRequest", arguments);
        },
        beforeCreate: function(model, req, res, options) {
            Mixin(this, "beforeCreate", arguments);
        },
        afterCreate: function(model, req, res, options) {
            Mixin(this, "afterCreate", arguments);
        },
        beforeUpdate: function(model, req, res, options) {
            Mixin(this, "beforeUpdate", arguments);
        },
        afterUpdate: function(model, req, res, options) {
            Mixin(this, "afterUpdate", arguments);
        },
        beforeRead: function(queryBy, req, res, options) {
            Mixin(this, "beforeRead", arguments);
        },
        afterRead: function(models, req, res, options) {
            Mixin(this, "afterRead", arguments);
        },
        beforeDelete: function(model, req, res, options) {
            Mixin(this, "beforeDelete", arguments);
        }
    }
}
