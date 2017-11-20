'use strict';

const _ = require("lodash");
const assert = require("assert");
const joi = require("joi");

var DEBUG = true;

var self = module.exports = {

    _is_resolvable: function(qname) {
        return qname.indexOf("@")==0;
    },
    _resolve: function(model, options) {
        assert(model, "Missing model");
        assert(options, "Missing options");
        assert(options.db, "Missing database");
        assert(options.db._collection, "Invalid database");

        _.each(model, function(field, qname) {
            if ( self._is_resolvable(qname) ) {
                var name = qname.substring(1);
                var entity_key = model[qname];
                var parts = entity_key.split("/");
                var collection = options.db._collection(parts[0]);
                if (!collection) {
                    model[qname] = { collection: parts[0], key: parts[1], error: "meta4foxx:mixin:resolve:collection:missing" }
                } else {
                    model[name] = collection.document(parts[1]);
                    delete model[qname];
                }
            }
        });
        return model;
    },

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

        // support updating by converting objects into references
        // TODO: save out the referenced models
        _.each(model, function(field, name) {

            // resolvable objects are turned into string references
            if (self._is_resolvable(name) && _.isObject(field)) {
                if (field._key) {
                    model[name] = field._key;
                } else {
                    // or deleted if missing _key
                    delete model[name];
                }
            }
        });
    },
    afterUpdate: function(model, req, res, options) {
    },
    beforeRead: function(model, req, res, options) {
    },
    afterRead: function(models, req, res, options) {

        // resolve array only iff explicitly enabled
        if (_.isArray(models) && options.resolveArrays) {
            _.each(models, function(model) {
                self._resolve(models, options);
            })
        } else {
            // expand a 1-1 relationship
            self._resolve(models, options);
        }
        return models;
    },
    beforeDelete: function(model, req, res, options) {
    }
}
