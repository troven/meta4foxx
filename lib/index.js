const _ = require("lodash");
const assert = require("assert");

const createRouter = require('@arangodb/foxx/router');

const Mixins = require("./mixins");

var UX = require("./strategy/UX");

var self = module.exports = {

    options: function(arg) {
        if (_.isFunction(arg)) {
            arguments.shift();
            return arg.apply(this, arguments);
        }
        if (_.isObject(arg)) {
            return _.extend.apply(this, arguments);
        }
        console.error("invalid options: %o", arguments);
        throw new Error("invalid options");
    },

    /**
     * Initialise the module API and openapi
     *
     * @param options
     * @returns {{options: *, router: *, apis: {}, api: api}}
     * @constructor
     */
    Module: function(options) {

        assert(options, "Missing Module options");
        assert(options.context, "Missing Module context");
        assert(options.manifest, "Missing Module manifest");

        var DEBUG = options.debug?true:false;

        const router = options.router = options.router || createRouter();
        const META_PREFIX = "/meta4";
//        const now = new Date().getTime();

        options.manifest.models = [];
        var manifest = _.pick(options.manifest, [ "name", "version", "description", "thumbnail",  "author", "license" ]);

        var about = _.extend(manifest, {
            path: options.context.service.mount,
            prefix: options.context.collectionPrefix,
            basePath: options.context.baseUrl,
            models: options.manifest.models,
            isProduction: options.context.isProduction,
            isDevelopment: options.context.isDevelopment,
            home: options.context.baseUrl+"/"+options.manifest.defaultDocument
        } );

        DEBUG && console.log("[meta4foxx] Module: depends on: %o", _.keys(module.context.dependencies));

        // Module Meta-Data

        router.get(META_PREFIX+"/module", function (req, res) {
            res.send(about);
        })
        .response(['application/json'], about.name+" module manifest")
        .summary('Module manifest for '+about.name)
        .description('Returns a module manifest for: '+about.description);

        // Module API Docs

        router.use("openapi", module.context.createDocumentationRouter())
        .summary("OpenAPI Documentation")
        .description("API documentation for the "+about.description);

        return { options: options, router: router, apis: {},

            api: function(defn) {
                assert(defn, "Missing API definition");
                assert(defn.name, "Missing API name");

                var DEBUG = options.debug?true:false;
                var api = defn.router?defn:new self.API(options, defn);
                assert(api.name, "Missing API name");

                this.apis = this.apis || {};
                this.apis[api.name] = api;

                DEBUG && console.log("[meta4foxx] Registered [%s] API: %o -> %o", defn.router?"Existing":"New", api.name, _.keys(api));
                return defn;
            }
        };
    },

    API: function(_defaults, _options) {
        var options = _.extend({}, _defaults, _options);
        assert(options, "Missing API options");
        assert(options.context, "Missing API context");
        assert(options.name, "Missing API local name");
        assert(options.singular, "Missing API's singular name");
        assert(options.plural, "Missing API's plural name");

        options.config = _.extend({}, options.config, options.context.configuration);

        var strategy = options.strategy || "CRUD";
        var Strategy = _.isFunction(strategy)?strategy:require("./strategy/"+strategy);
        assert(Strategy, "Unknown strategy: "+strategy);

        var DEBUG = options.debug?true:false;

        DEBUG && console.log("[meta4foxx] API: %s @ %s -> ", options.name, options.manifest.name, strategy);

        // cross-cutting strategy hooks
        var mixins = new Mixins(options);

        var api = new Strategy(options, mixins);
        assert(api, "Invalid API Strategy");
        assert(api.router, "Missing API router");

        DEBUG && console.log("[meta4foxx] API Strategy: %s => %o => %o", options.name, strategy, _.keys(api));
        return api;
    },

    UX: function(_defaults, _options) {
        var options = _.extend({}, _defaults, _options);

        assert(options, "Missing UX options");

        return UX(options);
    },

    Setup: function(_defaults, _options) {
        var options = _.extend({}, _defaults, _options);

        assert(options, "Missing Model options");
        assert(options.name, "Missing Model local name");
        assert(options.db, "Missing Model db");
        assert(options.context, "Missing Model context");

        const db = options.db;
        const coll_name = options.collection || options.name;
        const qName = options.context.collectionName(coll_name);
        var manifest = options.context.service.manifest;

        var examples = options.examples || [];
        options.data && examples.push(options.data);

        options.example && examples.push(options.example);
        console.log("[meta4foxx] initial data: %o.", examples);

        switch(options.model) {
            case "graph":
                if (!db._collection(qName)) {
                    var graph = db._createEdgeCollection(qName);
                    console.log("[meta4foxx] created graph: %s.", qName);
                    _.each(examples, function(example) { graph.insert(example) })
                } else {
                    console.log("[meta4foxx] graph %s found", qName);
                }
            break;
            case "collection":
            default:
                if (!db._collection(qName)) {
                    var coll = db._createDocumentCollection(qName);
                    console.log("[meta4foxx] created [%s] collection: %s", manifest.name, qName);
                    _.each(examples, function(example) { coll.insert(example) })
               } else {
                    console.log("[meta4foxx] [%s] collection %s found.", manifest.name, qName);
                }
            break;
        }


        var models = db._collection(qName);
        assert(models, "model setup failed: "+qName);

        // use field level indexing
        if (options.indexes) {
            assert(_.isArray(options.indexes), "indexes not an array: "+qName);
            models.ensureIndex({ type: "hash", fields: options.indexes, unique: false, sparse: true });
            console.log("[meta4foxx] [%s] collection %s found.", manifest.name, qName);
        }
        // use field level uniques / indexing
        if (options.uniques) {
            assert(_.isArray(options.uniques), "uniques not an array: "+qName);
            models.ensureIndex({ type: "hash", fields: options.uniques, unique: true, sparse: true });
            console.log("[meta4foxx] [%s] %s x uniques for %s", manifest.name, options.uniques.length, qName);
        }
        return models;
    },

    Teardown: function(_defaults, _options) {
        var options = _.extend({}, _defaults, _options);

        assert(options, "Missing Model options");
        assert(options.name, "Missing Model local name");
        assert(options.db, "Missing Model db");
        assert(options.context, "Missing Model context");

        const db = options.db;
        const qName = options.context.collectionName(options.name);
        const coll = db._collection(qName)
        assert(coll, "Can't drop an unknown collection: "+qName);
        coll.drop();
        var model = db._collection(qName);
        assert(!model, "Model teardown failed: "+qName);
        return true;
    },

    exports: {
        "pkg": require("../package"),
        "_": _,
        "assert": assert,
        "RBAC": require("./RBAC"),
        "Vault": require("./Vault"),
        "json-to-json-schema": require('json-to-json-schema'),
        "yaml": require('./util/yaml'),
        "moment": require('moment'),
        "joi": require('joi'),
        "enjoi": require('enjoi'),
        "javascript-state-machine": require("javascript-state-machine")
    }
};
