'use strict';

const _ = require("lodash");
const assert = require("assert");
const joi = require("joi");

const ExpandModel = function(model, options) {
    assert(model, "Missing model");
    assert(options, "Missing options");
    if (!options.nested) return model;
    assert(options.db, "Missing database");
    assert(options.db._collection, "Invalid database");

    _.each(options.nested, function(qname, k) {
        var collection = options.db._collection(qname);
        assert(collection, "Missing collection: "+qname);
        var key = model[k];
        if (key) model[k] = collection.document(key);
    });
    return model;
}

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
        // TODO: identify the model and update the object in the collection
        //  consider how best to minimise buggy/ nefarious behaviour
        //  1) read-only - 2) sanity check

        _.each(options.nested, function(qname, k) {
            if (_.isObject(model[k])) {
                delete model[k]; // model[k]= model[k]._key;
            }
        });
    },
    afterUpdate: function(model, req, res, options) {
    },
    beforeRead: function(model, req, res, options) {
    },
    afterRead: function(models, req, res, options) {
        // iff nested is true, then deference any context variables as nested objects
        if (options.nested===true) {
            options.nested = {};
            _.each(options.contextPath, function(ctx, k) {
                options.nested[ctx.property] = ctx.collection;
            })
        }

        if (_.isArray(models)) {
            // TODO: one-to-many
            DEBUG && console.log("[meta4foxx] NestedModels [afterRead] TODO: %o", models);
            _.each(models, function(model) {
                ExpandModel(model, options);
            })
        } else {
            // expand a 1-1 relationship
            ExpandModel(models, options);
        }
        return models;
    },
    beforeDelete: function(model, req, res, options) {
    }
}
