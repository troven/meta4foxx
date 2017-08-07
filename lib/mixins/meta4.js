const _ = require("lodash");
const assert = require("assert");
const joi = require("joi");

var DEBUG = false;

module.exports = {

    configure: function(options) {
        options.path = options.path || "/" + options.name;
        DEBUG && console.log("meta4: configure: %o", options);
    },
    endpoint: function(endpoint, options) {
        if (options.scoped) {
            endpoint.header("authorization", joi.string().required(), "A valid JWT bearer token");
        }
        DEBUG && console.log("meta4: endpoint");
    },
    beforeCreate: function(model, req, res, options) {
        model.meta4 = model.meta4 || {};
        if (req.jwt) {
            model.meta4.createdBy = model.meta4.modifiedBy = req.jwt.email;
        }
        model.meta4.createdOn = model.meta4.modifiedOn = Date.now();
        DEBUG && console.log("meta4: beforeCreate: %o", model);
    },
    afterCreate: function(model, req, res, options) {
        DEBUG && console.log("meta4: afterCreate: %o", model);
        assert(model.meta4);
        return model;
    },
    beforeUpdate: function(model, req, res, options) {
        model.meta4 = model.meta4 || {};
        if (req.jwt) {
            model.meta4.modifiedBy = req.jwt.email;
        }
        model.meta4.modifiedOn = Date.now();
        DEBUG && console.log("meta4: beforeUpdate: %o", model);
    },
    afterUpdate: function(model, req, res, options) {
        DEBUG && console.log("meta4: afterUpdate: %o", model);
        assert(model.meta4);
        return model;
    },
    beforeRead: function(model, req, res, options) {
        DEBUG && console.log("meta4: beforeRead: %o", model);
    },
    afterRead: function(model, req, res, options) {
        DEBUG && console.log("meta4: afterRead: %o", model);
        return model;
    },
    beforeDelete: function(model, req, res, options) {
        DEBUG && console.log("meta4: beforeDelete: %o", model);
    }
}
