const assert = require("assert");
const _ = require("lodash");

module.exports = {

    Filter: function(_filter, queryParams) {
        var filter = _.extend({}, _filter);
        _.each(filter, function(v,k) {
            if ( queryParams[k]!= undefined) {
                filter[k] = queryParams[k];
                if (filter[k]=="false") filter[k] = false;
                else if (filter[k]=="true") filter[k] = true;
            }
        });

    },

    RenderReport: function(result, req, res) {
//        DEBUG && console.log("RenderReport: %s -> %s", req.path, req.headers);
        var contentType = req.headers.accept;

        switch (contentType) {
            case "text/csv":
                res.send( util.convert.csv(result) );
                break;
            case "application/json":
            default:
                res.send(result);
                break;
        }
    },

    MissingModel : function( model, res, options ) {
        if (model) return false;
        assert(res, "Missing response");
        assert(options, "Missing options");
        res.sendStatus(404);
        res.send({ code: "crud.model.missing", error: options.singular+" not found" } );
        return true;
    },

    InvalidSchema : function(schema, model, res) {
        assert(schema, "Missing schema");
        assert(model, "Missing model to validate");
        assert(res, "Missing response");

        var valid = schema.validate(model);

        if (valid.error) {
            res.sendStatus(400); // Bad Request
            res.send( { code: "crud.model.invalid", model: model, error: "Validation failed", errors: valid.error.details });
            return true;
        }
        return false;
    },

    InvalidSelector : function(selector, res) {
        assert(selector, "Missing selector");
        assert(res, "Missing response");
        if (selector._id || selector._key) return false;
        res.sendStatus(400); // Bad Request
        res.send({ code: "crud.selection.missing", error: "Missing or invalid model selector" } );
        return true;
    },

    EncryptModel : function(model, options) {
        assert(model, "Missing encrypt model");
        DEBUG & console.log("Encrypting %o", model);
        _.each(options.encrypted, function(field) {
            model[field] = vault.encrypt(model[field]);
            DEBUG & console.log("Encrypt %s -> %o", field, model[field]);
        });
        return model;
    },

    DecryptModel : function(model, options, toJSON) {
        assert(model, "Missing decrypt model");
        if (!options.encrypted) return model;
        _.each(options.encrypted, function(field) {
            var text = vault.decrypt(model[field], toJSON);
            model[field] = text;
            DEBUG & console.log("Decrypt %s -> %s -> %o", field, text, model[field]);
        });
        return model;
    },

    GenericEndpoint : function(endpoint, options, mixins) {
        assert(endpoint, "Missing endpoint");
        assert(options, "Missing options");

        _.each(options.queryParams, function(queryParam) {
            endpoint.queryParam( queryParam, joi.string(), queryParam );
        })

        mixins && mixins.endpoint(endpoint, options);
    }

}