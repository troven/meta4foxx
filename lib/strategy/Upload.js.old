'use strict';

const createRouter = require('@arangodb/foxx/router');
const Vault = require('../Vault');
const _ = require("lodash");
const joi = require("joi");
const assert = require("assert");
const Enjoi = require('enjoi');
const JSON2Schema = require('json-to-json-schema');
const RBAC = require('../RBAC');
const util = require('../util');

module.exports = function (options, mixins) {

    assert(options, "Missing Upload options");
    assert(mixins, "Missing Upload mixins");
    assert(options.db, "Missing Upload db");
    assert(options.name, "Missing Upload name");

    assert(options.singular, "Missing Upload singular name");
    assert(options.plural, "Missing Upload plural name");

    _.defaults(options, { defaults: {}, example: {} });

    var db = options.db;
    var name = options.name;
    var qname = module.context.collectionName(name);
    var can = options.can || { get: true, post: true, put: true, delete: true };
    const DEBUG = options.debug?true:false;

    const router = options.router || createRouter();
    const collection = db._collection(qname);
    assert(collection, "Missing collection: "+qname);

    // apply configuration strategies
    mixins.configure && mixins.configure(options);
    var path = options.path = options.path || "/" + name;

    // apply schema strategies
    var schema = joi.object();
    mixins.schema && mixins.schema(schema, options);
    var schema_array = joi.array().items(schema);
    var key_schema = joi.object({ _key: joi.string(), _id: joi.string() });

    options.scoped = options.scoped===false?false: (options.scope || "urn:"+options.manifest.name+path);
    DEBUG && console.log("[meta4foxx] [%s] %s scoped: %o", options.manifest.name, options.path, options.scoped);
    var rbac = RBAC(options.scoped, options);

    // handle common error responses


    DEBUG && console.log("[meta4foxx] Upload API: %s", options.name);

    // UPLOAD | CREATE

    if (can.upload || can.post) {
        var endpoint = router.post(path, rbac.protect(function (req, res) {
            DEBUG & console.log("[meta4foxx] API upload: %o -> %o", req.path, _.keys(req));

            util.multipart.upload(req, options);

            // mixins.beforeCreate && mixins.beforeCreate(model, req, res, options);

            // var new_model = collection.insert(model);
            // if ( util.models.MissingModel( new_model, res, options ) ) return;
            //
            // _.extend(model, new_model);
            // mixins.afterCreate && mixins.afterCreate(model, options);

            res.sendStatus(201);
            res.send( { debug: true });
        }));

        endpoint
            .response(201, schema, ['application/json'], 'Upload a ' + options.singular)
            .summary('Upload a ' + options.singular)
            .description('Upload a ' + options.singular);

        util.models.GenericEndpoint(endpoint, options, mixins);
    }

    if (can.get) {

        // READ ALL

        var endpoint = router.get(path, rbac.protect(function (req, res) {
            var filter = _.extend({}, options.filter);

            var permit = rbac.request(req);
            DEBUG & console.log("[meta4foxx] RBAC %s CAN: %o", req.path, permit.can("get", req.path) );

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
                DEBUG && console.log("[meta4foxx] API get-by: %s -> %o -> %o", req.path, filter, models);
                res.send(models);
            } else {
                mixins.beforeRead && mixins.beforeRead({}, req, res, options);
                var models = collection.all();
                mixins.afterRead && mixins.afterRead(models, req, res, options);
                //DEBUG &&
                DEBUG && console.log("[meta4foxx] API get-all: %o -> %o found", req.path, util.models.length);
                res.send(models);
            }
        }));

        endpoint
            .response(200, schema_array, ['application/json'], 'List ' + options.plural)
            .summary('List of ' + options.plural)
            .description('Returns a list of all ' + options.plural);

        util.models.GenericEndpoint(endpoint, options, mixins);

        // READ ONE

        endpoint = router.get(path + "/:_key", rbac.protect(function (req, res) {
            var filter = _.extend({}, options.filter);

            mixins.beforeRequest && mixins.beforeRequest(filter, req, res, options);
            filter._key = req.pathParams._key;

            mixins.beforeRead && mixins.beforeRead(filter, req, res, options);

            //DEBUG &&
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

            var new_model = collection.replace(selector, model);
            _.extend(model, new_model);

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
            collection.remove(selector);

            res.sendStatus(202); // accepted
            res.send(selector);
        }));

        endpoint
            .body(key_schema, "A " + options.singular + " data model")
            .response(['application/json'], 'The deleted ' + options.singular + " id")
            .summary('Delete an existing ' + options.singular)
            .description('Deletes an existing ' + options.singular);

        util.models.GenericEndpoint(endpoint, options, mixins);
    }

    var manifest = options.context.service.manifest;
    //DEBUG &&
    DEBUG && console.log("[meta4foxx] [%o] Upload: %o", manifest.name, options.singular);

    return { name: options.name, router: router, rbac: rbac, schema: schema };
}
