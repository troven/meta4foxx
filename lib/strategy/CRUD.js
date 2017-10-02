'use strict';

const createRouter = require('@arangodb/foxx/router');
const Vault = require('../Vault');
const _ = require("lodash");
const joi = require("joi");
const assert = require("assert");
const Enjoi = require('enjoi');
const JSON2Schema = require('json-to-json-schema');
const RBAC = require('../RBAC')
const util = require('../util');

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

    const home = options.home?options.context.fileName(options.home):false;

    if (options.query) {
        assert( fs.exists(home), "Missing query folder: "+home);
    }

    const router = options.router || createRouter();
    const collection = db._collection(qname);
    assert(collection, "Missing collection: "+qname);

    console.log("[meta4foxx] CRUD collection: %s -> %o ->%o", qname, _.keys(collection), _.keys( collection.all() ) );

    const vault_secret = module.context.configuration.vault_secret || options.vault_secret;
    const vault_algo = module.context.configuration.vault_algo || "AES";

    var vault = new Vault(vault_secret, vault_algo);

    // merge example with defaults
    if (options.example) {
        _.defaults(options.example, options.defaults);

        // auto-generate JSON schema
        if (!options.schema) {
            DEBUG && console.log("[meta4foxx] Example Schema: %s -> %o", options.name, _.keys(JSON2Schema));
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
        options.schema.title = options.schema.title || options.singular+" schema";
        options.schema.additionalProperties = options.schema.properties?true:false;
        schema = Enjoi(options.schema);

        DEBUG && console.log("[meta4foxx] JSON-Schema for %s -> %o", options.name, options.schema);

        // Validate example against schema :-)
        if (options.example) {
            var valid = schema.validate(options.example);
            DEBUG && console.log("[meta4foxx] Validate JSON-Schema for %s ==> %s", options.name, valid.error?true:false);
            if (valid.error) throw new Error("Example data for "+options.name+" API does not match schema");
        }

//        schema.object().string("_key");
    }
    var schema_array = joi.array().items(schema);
    var key_schema = joi.object({ _key: joi.string(), _id: joi.string() });

    options.scoped = options.scoped===false?false: (options.scope || options.manifest.name+path);
    DEBUG && console.log("[meta4foxx] [%s] %s scoped: %o", options.manifest.name, options.path, options.scoped);
    var rbac = RBAC(options.scoped, options);

    DEBUG && console.log("[meta4foxx] CRUD API: %s", options.name);

    // GET META-DATA

    DEBUG && console.log("[meta4foxx] meta-data: %s -> %s -> %o -> %o", path, can.get, options.defaults, options.example);
    if (can.get && (options.defaults || options.example) ) {

        var endpoint = router.get(META_PREFIX+path, rbac.protect(function (req, res) {
            var model = { defaults: options.defaults, example: options.example};
            if (schema) model.schema = options.schema;

            if ( util.models.MissingModel( model, res, options ) ) return;
            res.send(model);
        }));

        endpoint
            .response(['application/json'], 'Meta-data for ' + options.singular + " model.")
            .summary('Meta-data for ' + options.plural+ ".")
            .description('Returns useful meta-data for' + options.singular + " models.");

        util.models.GenericEndpoint(endpoint, options, mixins);

        DEBUG && console.log("[meta4foxx] meta-data API for %s model", options.singular );
    }

    // CREATE

    if (can.post) {
        var endpoint = router.post(path, rbac.protect(function (req, res) {
            var model = req.json();
            if (options.defaults)  model = _.extend({}, options.defaults, model);

            if (util.models.InvalidSchema(schema, model, res)) return;

            DEBUG & console.log("[meta4foxx] API create: %o -> %o", req.path, model);

            if (options.encrypted) util.models.EncryptModel(model);

            mixins.beforeCreate && mixins.beforeCreate(model, req, res, options);

            try {
                var new_model = collection.insert(model);
                if ( util.models.MissingModel( new_model, res, options ) ) return;
                _.extend( model, new_model );
            } catch(e) {
                res.status(400);
                res.sendStatus(e);
                return;
            }

            mixins.afterCreate && mixins.afterCreate(model, options);

            res.sendStatus(201);
            res.send(model);
        }));

        endpoint
            .body(schema, ['application/json'], "A valid " + options.singular + " data model")
            .response(201, schema, ['application/json'], 'A valid' + options.singular + " data model")
            .summary('Create new ' + options.singular)
            .description('Creates a new ' + options.singular + ", with an auto-generated key");

        util.models.GenericEndpoint(endpoint, options, mixins);
    }

    if (can.get) {

        // READ ALL

        var endpoint = router.get(path, rbac.protect(function (req, res) {
            var filter = _.extend({}, options.filter);

            var permit = rbac.request(req);
            DEBUG & console.log("[meta4foxx] RBAC %s permit: %o -> %o", req.path, permit.can("get", req.path));

            // prepare query-by-example
            if (options.queryParams===true || options.byExample) {
                _.each(req.queryParams, function(v,k) {
                    if (req.queryParams[k]) filter[k] = req.queryParams[k];
                });

                delete filter._;

                DEBUG && console.log("[meta4foxx] byExample1: %o -> %o -> %o", _.keys(options), filter, req.queryParams);
            } else if (_.isArray(options.queryParams)) {
                _.each(options.queryParams, function(qp) {
                    if (req.queryParams[qp]!="") filter[qp] = req.queryParams[qp];
                });
                DEBUG && console.log("[meta4foxx] byExample2: %o -> %o", _.keys(options), filter);
            } else if (options.queryParams) {
                throw new Exception("API queryParams is not an array");
            }

            mixins.beforeRequest && mixins.beforeRequest(filter, req, res, options);

            var models = [];

            if (options.query.all) {
                // use custom query
                var query_file = home + "/" + options.name+"/all.aql";
                mixins.beforeRead && mixins.beforeRead(filter, req, res, options);
                var models = util.query.execute(query_file, options, filter).toArray();
                mixins.afterRead(models, req, res, options);

                DEBUG && console.log("[meta4foxx] API get-query: %s @ %s -> %o -> %o", req.path, query_file, filter, models);
            } else if (filter) {
                // filter query by code
                mixins.beforeRead && mixins.beforeRead(filter, req, res, options);
                var models = collection.byExample(filter).toArray();
                mixins.afterRead(models, req, res, options);

                DEBUG && console.log("[meta4foxx] API get-by: %s -> %o -> %o", req.path, filter, models);
            } else {
                mixins.beforeRead && mixins.beforeRead({}, req, res, options);
                var models = collection.all();
                mixins.afterRead && mixins.afterRead(models, req, res, options);

                DEBUG && console.log("[meta4foxx] API get-all: %o -> %o found", req.path, models.length);
            }

            _.each(models, function(model) {
                console.log("[meta4foxx] CRUD model: %o", model);
            });

            res.send(models);
        }));

        endpoint
            .response(200, schema_array, ['application/json'], 'List ' + options.plural)
            .summary('List of ' + options.plural)
            .description('Returns a list of all ' + options.plural);

        util.models.GenericEndpoint(endpoint, options, mixins);

        // READ ONE

        endpoint = router.get(path + "/:_key", rbac.protect(function (req, res) {
            var filter = _.extend({}, options.filter);
            filter._key = req.pathParams._key;

            mixins.beforeRequest && mixins.beforeRequest(filter, req, res, options);

            mixins.beforeRead && mixins.beforeRead(filter, req, res, options);

            DEBUG && console.log("[meta4foxx] API get: %o -> %o", filter, model);

            var model = collection.firstExample(filter);

            if ( util.models.MissingModel( model, res, options ) ) return;

            util.models.DecryptModel(model, options);

            if (mixins.afterRead) {
                mixins.afterRead(model, req, res, options);
            }
            res.send(model);
        }));

        util.models.GenericEndpoint(endpoint, options, mixins);

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

            // if (util.models.InvalidSchema(schema, model, res)) return;
            if ( util.models.MissingModel( model, res, options ) ) return;

            //DEBUG &&
            DEBUG && console.log("[meta4foxx] API update: %o -> %o", req.path, model);

            var selector = {_id: model._id, _key: model._key};
            if (util.models.InvalidSelector(selector, res)) return;

            if (options.encrypted) util.models.EncryptModel(model);
            mixins.beforeUpdate && mixins.beforeUpdate(model, req, res, options);

            try {
                _.extend(model, collection.replace(selector, model) );
            } catch(e) {
                res.status(400);
                res.sendStatus(e);
                return;
            }
            if ( util.models.MissingModel( model, res, options ) ) return;

            mixins.afterUpdate && mixins.afterUpdate(model, req, res, options);
            res.send(model);
        }));

        endpoint
            .body(schema, "A valid " + options.singular + " data model")
            .response(200, schema, ['application/json'], 'A ' + options.singular)
            .summary('Update an existing ' + options.singular)
            .description('Update an ' + options.singular + ", and returns the saved entity.");

        util.models.GenericEndpoint(endpoint, options, mixins);
    }

    // DELETE

    if (can.delete) {
        var endpoint = router.delete(path, rbac.protect(function (req, res) {
            var model = req.json();
            var selector = {_id: model._id, _key: model._key};
            DEBUG && console.log("[meta4foxx] API delete: %o", selector);

            if (util.models.InvalidSelector(selector, res)) return;

            mixins.beforeDelete && mixins.beforeDelete(selector, req, res, options);
            try {
                collection.remove(selector);
            } catch(e) {
                res.status(400);
                res.sendStatus(e);
                return;
            }

            res.sendStatus(202); // accepted
            res.send(selector);
        }));

        endpoint
            .body(key_schema, "A " + options.singular + " data model")
            .response(['application/json'], 'The deleted ' + options.singular + " id")
            .summary('Delete an existing ' + options.singular)
            .description('Deletes an existing ' + options.singular);

        // util.models.GenericEndpoint(endpoint, options, mixins);
    }

    var manifest = options.context.service.manifest;
    //DEBUG &&
    DEBUG && console.log("[meta4foxx] [%o] CRUD: %o", manifest.name, options.singular);

    return { name: options.name, router: router, rbac: rbac, vault: vault, schema: schema };
}
