'use strict';

const createRouter = require('@arangodb/foxx/router');
const _ = require("lodash");
const joi = require("joi");
const assert = require("assert");

module.exports = function (options, mixins) {

    assert(options, "Missing Custom options");
    assert(mixins, "Missing Custom mixins");
    assert(options.db, "Missing Custom db");
    assert(options.name, "Missing Custom name");

    assert(options.singular, "Missing Custom singular name");
    assert(options.plural, "Missing Custom plural name");

    var db = options.db;
    var name = options.name;
    var basePath = "/" + name;
    var manifest = options.context.service.manifest;
    const DEBUG = options.debug?true:false;

    const router = options.router || createRouter();

    mixins.configure && mixins.configure(options);

    var self = this;
    _.each(options.paths, function(methods, path) {
        _.each(methods, function(defn, method) {

            method = method.toLowerCase();
            var operation = router[method];
            assert(operation, "Custom method "+method+" not defined in "+path);
            var fn = _.isFunction(defn)?defn:defn.fn;
            assert(_.isFunction(fn), "Invalid handler fn()")
            defn = _.isObject(defn)?defn:{ endpoint: true };

            // method triggers a custom function
            DEBUG && console.log("[%o] Custom: %o", manifest.name, method, path);


            var endpoint = operation.apply(router, [path, function( req, res) {
                DEBUG && console.log("Triggered API: %s %s", method, path);
                mixins.beforeRequest && mixins.beforeRequest({}, req, res, options);
                fn.apply(router, [ req, res, options ]);
            }]);

            if (defn.endpoint===true) {
                endpoint.body(joi.object(), ['application/json'], "A valid " + options.singular + " payload")
                endpoint.summary(method+" "+options.singular.toLowerCase() );
                endpoint.description("Custom method to "+method+" "+options.plural);
                mixins.endpoint && mixins.endpoint(endpoint, options);
            } else if (_.isFunction(defn.endpoint)) {
                defn.endpoint(endpoint, options);
            }

        });
    });

    //
    // DEBUG &&
    console.log("[%o] Custom: %o", manifest.name, options.singular);

    return { name: options.name, router:router, rbac: null, vault: null, schema: null };
}
