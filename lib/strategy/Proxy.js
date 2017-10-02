'use strict';

const request = require('@arangodb/request');
const createRouter = require('@arangodb/foxx/router');

const _ = require("lodash");
const assert = require("assert");

module.exports = function (options, mixins) {

    assert(options, "Missing Proxy options");
    assert(options.db, "Missing Proxy db");
    assert(options.name, "Missing Proxy name");

    assert(options.singular, "Missing Proxy singular name");
    assert(options.plural, "Missing Proxy plural name");

    mixins.configure && mixins.configure(options);
    var can = options.can || { get: true, post: true, put: true, delete: true };

    var db = options.db;
    var name = options.name;
    var basePath = "/" + name;
    var manifest = options.context.service.manifest;
    const DEBUG = options.debug?true:false;

    const router = options.router || createRouter();
    options.proxy = _.extend({}, options.proxy);

    _.each(can, function(enabled, method) {
        method = method.toLowerCase();
        options.proxy[method] = options.proxy[method] || {};

        var endpoint = router[method](basePath, function(req, res) {

            var proxy_req = _.extend({}, options.defaults, options.proxy[method]);

            var result = request(proxy_req);

            _.each(result.headers, function(value, name) {
                res.setHeader( name, value);
            })

            try {
                res.send( result.body, result.headers['content-type'] );
            } catch(e) {
                res.sendStatus(500);
                res.send( { code: "proxy.request.error", error: ""+e} );
            }
        });

        endpoint.response(['application/json'], "Return " +options.singular)
            .summary("Execution  " +options.singular + " action")
            .description("Returns result of " +options.singular);
        DEBUG && console.log("[meta4foxx] [%o] Proxy: %o -> %o", manifest.name, options.singular, _.keys(options.processes));
    })

    return { name: options.name, router:router, rbac: null, vault: null, schema: null };
}
