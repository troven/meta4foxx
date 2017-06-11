'use strict';

const createRouter = require('@arangodb/foxx/router');
const Vault = require('../Vault');
const _ = require("lodash");
const joi = require("joi");
const assert = require("assert");
const Enjoi = require('enjoi');
const JSON2Schema = require('json-to-json-schema');
const RBAC = require('../RBAC')

module.exports = function (options, mixins) {

    assert(options, "Missing CRUD options");
    assert(mixins, "Missing CRUD mixins");
    assert(options.db, "Missing CRUD db");
    assert(options.name, "Missing CRUD name");

    assert(options.singular, "Missing CRUD singular name");
    assert(options.plural, "Missing CRUD plural name");

    _.defaults(options, { defaults: {}, example: {} });

    var db = options.db;
    var name = options.name;
    var qname = module.context.collectionName(name);
    var can = options.can || { get: true, post: true, put: true, delete: true };
    const DEBUG = options.debug?true:false;
    const META_PREFIX = "/meta4";

    const router = options.router || createRouter();
    const collection = db._collection(qname);
    assert(collection, "Missing collection: "+qname);

    const vault_secret = module.context.configuration.vault_secret || options.vault_secret;
    const vault_algo = module.context.configuration.vault_algo || "AES";

    var vault = new Vault(vault_secret, vault_algo);

    // merge example with defaults
    if (options.example) {
        _.defaults(options.example, options.defaults);

        // auto-generate JSON schema
        if (!options.schema) {
            DEBUG && console.log("Example Schema: %s -> %o", options.name, _.keys(JSON2Schema));
            options.schema = JSON2Schema.convert(options.example);
        }
    }

    // apply configuration strategies
    mixins.configure && mixins.configure(options);
    var path = options.path = options.path || "/" + name;

    // apply schema strategies
    var schema = joi.object();
    mixins.schema && mixins.schema(schema, options);

    // JSON Schema support
    if (_.isObject(options.schema) && (options.schema.properties || options.schema.items) ) {
        options.schema.title = options.schema.title || options.singular+" Schema";
        options.schema.additionalProperties = options.schema.properties?true:false;
        schema = Enjoi(options.schema);

        // DEBUG &&
        console.log("JSON-Schema for %s -> %o", options.name, options.schema);

        // Validate example
        if (options.example) {
            var valid = schema.validate(options.example);
            DEBUG && console.log("Validate JSON-Schema for %s ==> %s", options.name, valid.error?true:false);
            if (valid.error) throw new Error("Example data for "+options.name+" API does not match schema");
        }

//        schema.object().string("_key");
    }
    var schema_array = joi.array();

    options.scoped = options.scoped===false?false: (options.scope || "urn:"+options.manifest.name+path);
    console.log("[%s] %s scoped: %o", options.manifest.name, options.path, options.scoped);
    var rbac = RBAC(options.scoped, options);

    // handle common error responses

    const MissingModel = function( model, res, options ) {
        if (model) return false;
        assert(res, "Missing response");
        assert(options, "Missing options");
        res.sendStatus(404);
        res.send({ code: "crud.model.missing", error: options.singular+" not found" } );
        return true;
    }

    const InvalidSchema = function(model, res) {
        assert(model, "Missing model to validate");
        assert(res, "Missing response");
        var valid = schema.validate(model);
        if (valid.error) {
            res.sendStatus(400); // Bad Request
            res.send( { code: "crud.model.invalid", model: model, error: "Validation failed", errors: valid.error.details });
            return true;
        }
        return false;
    }

    const InvalidSelector = function(selector, res) {
        assert(selector, "Missing selector");
        assert(res, "Missing response");
        if (selector._id || selector._key) return false;
        res.sendStatus(400); // Bad Request
        res.send({ code: "crud.selection.missing", error: "Missing or invalid model selector" } );
        return true;
    }

    const EncryptModel = function(model) {
        assert(model, "Missing encrypt model");
        DEBUG & console.log("Encrypting %o", model);
        _.each(options.encrypted, function(field) {
            model[field] = vault.encrypt(model[field]);
            DEBUG & console.log("Encrypt %s -> %o", field, model[field]);
        });
        return model;
    }

    const DecryptModel = function(model, toJSON) {
        assert(model, "Missing decrypt model");
        _.each(options.encrypted, function(field) {
            var text = vault.decrypt(model[field], toJSON);
            model[field] = text;
            DEBUG & console.log("Decrypt %s -> %s -> %o", field, text, model[field]);
        });
        return model;
    }

    const GenericEndpoint = function(endpoint, options) {
        assert(endpoint, "Missing endpoint");
        assert(options, "Missing options");

        _.each(options.queryParams, function(queryParam) {
            endpoint.queryParam( queryParam, joi.string(), queryParam );
        })

        mixins.endpoint(endpoint, options);
    }

    console.log("CRUD API: %s", options.name);

    // GET META-DATA

    console.log("meta-data: %s -> %s -> %o -> %o", path, can.get, options.defaults, options.example);
    if (can.get && (options.defaults || options.example) ) {

        var endpoint = router.get(META_PREFIX+path, rbac.protect(function (req, res) {
            var model = { defaults: options.defaults, example: options.example};
            if (schema) model.schema = options.schema;

            if ( MissingModel( model, res, options ) ) return;
            res.send(model);
        }));

        endpoint
            .response(['application/json'], 'Meta-data for ' + options.singular + " model.")
            .summary('Meta-data for ' + options.plural+ ".")
            .description('Returns useful meta-data for' + options.singular + " models.");

        GenericEndpoint(endpoint, options);

        DEBUG && console.log("meta-data API for %s model", options.singular );
    }

    // CREATE

    if (can.post) {
        var endpoint = router.post(path, rbac.protect(function (req, res) {
            var model = req.json();
            if (options.defaults)  model = _.extend({}, options.defaults, model);

            if (InvalidSchema(model, res)) return;

            DEBUG & console.log("API create: %o -> %o", req.path, model);

            if (options.encrypted) EncryptModel(model);

            mixins.beforeCreate && mixins.beforeCreate(model, req, res, options);
            var new_model = collection.insert(model);
            if ( MissingModel( new_model, res, options ) ) return;

            _.extend(model, new_model);
            mixins.afterCreate && mixins.afterCreate(model, options);

            res.sendStatus(201);
            res.send(model);
        }));

        endpoint
            .body(schema, ['application/json'], "A valid " + options.singular + " data model")
            .response(201, schema, ['application/json'], 'A valid' + options.singular + " data model")
            .summary('Create new ' + options.singular)
            .description('Creates a new ' + options.singular + ", with an auto-generated key");

        GenericEndpoint(endpoint, options);
    }

    if (can.get) {

        // READ ALL

        var endpoint = router.get(path, rbac.protect(function (req, res) {
            var filter = _.extend({}, options.filter);

            var permit = rbac.request(req);
            DEBUG & console.log("RBAC %s CAN: %o", req.path, permit.can("get", req.path) );

            // prepare query-by-example
            _.each(options.queryParams, function(qp) {
                if (req.queryParams[qp]) filter[qp] = req.queryParams[qp];
            });

            mixins.beforeRequest && mixins.beforeRequest(filter, req, res, options);

            if (filter) {
                mixins.beforeRead && mixins.beforeRead(filter, req, res, options);
                var models = collection.byExample(filter).toArray();
                mixins.afterRead(models, req, res, options);

//                DEBUG &&
                console.log("API get-by: %s -> %o -> %o", req.path, filter, models);
                res.send(models);
            } else {
                mixins.beforeRead && mixins.beforeRead({}, req, res, options);
                var models = collection.all();
                mixins.afterRead && mixins.afterRead(models, req, res, options);
                //DEBUG &&
                console.log("API get-all: %o -> %o found", req.path, models.length);
                res.send(models);
            }
        }));

        endpoint
            // .response(200, schema_array, ['application/json'], 'List ' + options.plural)
            .summary('List of ' + options.plural)
            .description('Returns a list of all ' + options.plural);

        GenericEndpoint(endpoint, options);

        // READ ONE

        endpoint = router.get(path + "/:_key", rbac.protect(function (req, res) {
            var filter = _.extend({}, options.filter);

            mixins.beforeRequest && mixins.beforeRequest(filter, req, res, options);
            filter._key = req.pathParams._key;

            mixins.beforeRead && mixins.beforeRead(filter, req, res, options);

            //DEBUG &&
            console.log("API get: %o -> %o", filter, model);

            var model = collection.firstExample(filter);

            if ( MissingModel( model, res, options ) ) return;

            DecryptModel(model);

            if (mixins.afterRead) {
                mixins.afterRead(model, req, res, options);
            }
            res.send(model);
        }));

        GenericEndpoint(endpoint, options);

        endpoint
            .pathParam("_key", joi.string().required())
            .response(200, schema, ['application/json'], 'A ' + options.singular)
            .summary('Retrieve  ' + options.singular)
            .description('Returns a ' + options.singular);

    }

    // UPDATE

    if (can.put) {
        var endpoint = router.put(path, rbac.protect(function (req, res) {
            var model = req.json();
            if (options.defaults)  model = _.extend({}, options.defaults, model);

            // if (InvalidSchema(model, res)) return;
            if ( MissingModel( model, res, options ) ) return;

            //DEBUG &&
            console.log("API update: %o -> %o", req.path, model);

            var selector = {_id: model._id, _key: model._key};
            if (InvalidSelector(selector, res)) return;

            if (options.encrypted) EncryptModel(model);
            mixins.beforeUpdate && mixins.beforeUpdate(model, req, res, options);

            var new_model = collection.replace(selector, model);
            _.extend(model, new_model);

            if ( MissingModel( model, res, options ) ) return;

            mixins.afterUpdate && mixins.afterUpdate(model, req, res, options);
            res.send(model);
        }));

        endpoint
            .body(schema, "A valid " + options.singular + " data model")
            .response(200, schema, ['application/json'], 'A ' + options.singular)
            .summary('Update an existing ' + options.singular)
            .description('Update an ' + options.singular + ", and returns the saved entity.");

        GenericEndpoint(endpoint, options);
    }

    // DELETE

    if (can.delete) {
        var endpoint = router.delete(path, rbac.protect(function (req, res) {
            var model = req.json();
            var selector = {_id: model._id, _key: model._key};
            DEBUG && console.log("API delete: %o", selector);

            if (InvalidSelector(selector, res)) return;

            mixins.beforeDelete && mixins.beforeDelete(selector, req, res, options);
            collection.remove(selector);

            res.sendStatus(202); // accepted
            res.send(selector);
        }));

        endpoint
            .body(schema, "A " + options.singular + " data model")
            .response(['application/json'], 'The deleted ' + options.singular + " id")
            .summary('Delete an existing ' + options.singular)
            .description('Deletes an existing ' + options.singular);

        GenericEndpoint(endpoint, options);
    }

    var manifest = options.context.service.manifest;
    //DEBUG &&
    console.log("[%o] CRUD: %o", manifest.name, options.singular);

    return { name: options.name, router: router, rbac: rbac, vault: vault, schema: schema };
}
