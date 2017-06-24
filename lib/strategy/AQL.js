'use strict';

const createRouter = require('@arangodb/foxx/router');
const Vault = require('../Vault');
const _ = require("lodash");
const joi = require("joi");
const assert = require("assert");
const Enjoi = require('enjoi');
const JSON2Schema = require('json-to-json-schema');
const RBAC = require('../RBAC')
const fs = require("fs");

module.exports = function (options, mixins) {

    assert(options, "Missing AQL options");
    assert(mixins, "Missing AQL mixins");
    assert(options.db, "Missing AQL db");
    assert(options.name, "Missing AQL name");
    assert(options.home, "Missing AQL home folder");

    assert(options.singular, "Missing AQL singular name");
    assert(options.plural, "Missing AQL plural name");

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
    var schema_array = joi.array().items(schema);
    var key_schema = joi.object({ _key: joi.string(), _id: joi.string() });

    options.scoped = options.scoped===false?false: (options.scope || "urn:"+options.manifest.name+path);
    console.log("[%s] %s scoped: %o", options.manifest.name, options.path, options.scoped);
    var rbac = RBAC(options.scoped, options);

    // handle common error responses

    const MissingResponse = function( model, res, options ) {
        if (model) return false;
        assert(res, "Missing response");
        assert(options, "Missing options");
        res.sendStatus(404);
        res.send({ code: "crud.model.missing", error: options.singular+" not found" } );
        return true;
    }


    const GenericEndpoint = function(endpoint, options) {
        assert(endpoint, "Missing endpoint");
        assert(options, "Missing options");

        _.each(options.queryParams, function(queryParam) {
            endpoint.queryParam( queryParam, joi.string(), queryParam );
        })

        mixins.endpoint(endpoint, options);
    }

    console.log("AQL API: %s", options.name);

    // GET META-DATA

    console.log("meta-data: %s -> %s -> %o -> %o", path, can.get, options.defaults, options.example);
    if (can.get) {

        var query_home = options.context.fileName(options.home+"/"+req_path);

        console.log("query-home [%s]: %s", options.manifest.name, query_home);
        endpoint = router.get(path + "/*", rbac.protect(function (req, res) {
            var permit = rbac.request(req);

            var filter = _.extend({}, options.filter);
            mixins.beforeRequest && mixins.beforeRequest(filter, req, res, options);
            filter._key = req.pathParams._key;


            // prepare filter from query params
            _.each(options.queryParams, function(qp) {
                if (req.queryParams[qp]) filter[qp] = req.queryParams[qp];
            });

            var query = fs.readFileSync(query_path, "UTF-8");
            DEBUG & console.log("QUERY %s CAN: %o", query, permit.can("get", req.path) );
            var result = db._query(query).toArray();

            mixins.afterRead && mixins.afterRead(result, req, res, options);

            res.send(result);
        }));

        endpoint
            .response(200, schema_array, ['application/json'], options.plural);
            .summary(options.plural)
            .description('Supports ' + options.plural);

        GenericEndpoint(endpoint, options);

    var manifest = options.context.service.manifest;
    //DEBUG &&
    console.log("[%o] AQL: %o", manifest.name, options.singular);

    return { name: options.name, router: router, rbac: rbac, vault: vault, schema: schema };
}
