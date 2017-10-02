'use strict';

const _ = require("lodash");
const assert = require("assert");
const joi = require("joi");

var DEBUG = false;

module.exports = {

    configure: function(options) {

        _.each(options.contextPath, function(ctx) {
            assert(ctx.path, "Missing ContextPath path");
            assert(ctx.collection, "Missing ContextPath collection");

            // defaults for missing parameters / properties
            ctx.param = ctx.param || ctx.property;
            ctx.property = ctx.property || ctx.param;

            assert(ctx.param, "Missing ContextPath param");
            assert(ctx.property, "Missing ContextPath property");

            var debug = options.DEBUG===false?false:true;
            options.path = ctx.path + options.path;

            options.filter = _.extend( {}, options.filter);
            debug && console.log("[meta4foxx] ContextCollection: configure: %o", options.contextPath);
        })

        return options;
    },
    endpoint: function(endpoint, options) {
        DEBUG && console.log("[meta4foxx] ContextCollection: endpoint");
    },
    beforeRequest: function(filter, req, res, options) {

        // convert context path (parameters) into filter (property) constraints
        _.each(options.contextPath, function(ctx) {
            filter[ctx.property] = req.pathParams[ctx.param];
            if (_.isUndefined(filter[ctx.property])) throw new Error("mixin.filter.value.missing");
        });

        DEBUG &&console.log("[meta4foxx] ContextCollection: beforeRequest: %o --> %o", req.queryParams, filter);
    },
    beforeCreate: function(model, req, res, options) {

        // enforce context properties from path parameters
        _.each(options.contextPath, function(ctx) {
            model[ctx.property] = req.pathParams[ctx.param];
            if (_.isUndefined(model[ctx.property])) throw new Error("mixin.filter.value.missing");
        });

        DEBUG && console.log("[meta4foxx] ContextCollection: beforeCreate: %o", model);
    },
    afterCreate: function(model, req, res, options) {
        DEBUG && console.log("[meta4foxx] ContextCollection: afterCreate: %o", model);
    },
    beforeUpdate: function(model, req, res, options) {

        // enforce context properties from path parameters
        _.each(options.contextPath, function(ctx) {
            model[ctx.property] = req.pathParams[ctx.param];
            if (_.isUndefined(model[ctx.property])) throw new Error("mixin.filter.value.missing");
        });

        DEBUG && console.log("[meta4foxx] ContextCollection: beforeUpdate: %o", model);
    },
    afterUpdate: function(model, req, res, options) {
        DEBUG && console.log("[meta4foxx] ContextCollection: afterUpdate: %o", model);
    },
    beforeRead: function(model, req, res, options) {
        DEBUG && console.log("[meta4foxx] ContextCollection: beforeRead: %o", model);
    },
    afterRead: function(model, req, res, options) {
        DEBUG && console.log("[meta4foxx] ContextCollection: afterRead: %o", model);
    },
    beforeDelete: function(model, req, res, options) {
        DEBUG && console.log("[meta4foxx] ContextCollection: beforeDelete: %o", model);
    }
}
