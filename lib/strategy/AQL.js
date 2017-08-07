'use strict';

const createRouter = require('@arangodb/foxx/router');
const _ = require("lodash");
const joi = require("joi");
const assert = require("assert");
const Enjoi = require('enjoi');
const JSON2Schema = require('json-to-json-schema');
const RBAC = require('../RBAC')
const fs = require("fs");
const util = require("../util");

module.exports = function (options, mixins) {

    assert(options, "Missing AQL options");
    assert(mixins, "Missing AQL mixins");
    assert(options.db, "Missing AQL db");
    assert(options.name, "Missing AQL name");
    assert(options.home, "Missing AQL home folder");

    assert(options.singular, "Missing AQL singular name");
    assert(options.plural, "Missing AQL plural name");

    var home = options.context.fileName(options.home);
    assert( fs.exists(home), "Missing home folder: "+home);

    var reports_defn = false;
    try {
        reports_defn = require(home);
    } catch(e) {
        console.log("Report Definition Error: %o", e);
        throw new Error("missing "+home+"/index.js");
    }
    assert(reports_defn.reports, "Missing reports");

    var db = options.db;
    var name = options.name;
    var can = options.can || { get: true, post: true, put: true, delete: true };
    var DEBUG = options.debug?true:false;

    const router = options.router || createRouter();

    // apply configuration strategies
    mixins.configure && mixins.configure(options);
    var path = options.path = options.path || "/" + name;

    options.scoped = options.scoped===false?false: (options.scope || "urn:"+options.manifest.name+path);
    DEBUG && console.log("[%s] %s scoped: %o", options.manifest.name, options.path, options.scoped);
    var rbac = RBAC(options.scoped, options);

    DEBUG && console.log("AQL %s API: %s", options.name, options.manifest.name);

    _.each(reports_defn.reports, function(report) {

        var report_path = report.name;
        var query_file = home + "/" + (report.query||report.name+".aql");

        DEBUG && console.log("AQL Report: %s / %s -> %o -> %o", path, report.name, report, query_file );

        var endpoint = router.get(path + "/"+ report.name, rbac.protect(function (req, res) {
            var permit = rbac.request(req);

            var filter = util.models.Filter(report.filter, req.queryParams);

            mixins.beforeRequest && mixins.beforeRequest(filter, req, res, options);
            var query = false;
            try {
                query = fs.readFileSync(query_file, "UTF-8");
                util.models.RenderReport(result, req, res);
            } catch(e) {
                console.log("FILE ERROR: %o -> %o", query_file, e);
                res.sendStatus(404);
                res.send({ code: "crud.query.missing", error: report_path+" not found", file: query_file } );
                return;
            }

            try {
                var result = db._query(query, filter).toArray();
                DEBUG && console.log("QUERY: %s [%o] <- %o -> %o", req.path, filter, query, result);
                mixins.afterRead && mixins.afterRead(result, req, res, options);
                res.send(result);
            } catch(e) {
                console.log("QUERY ERROR: %o -> %o", query_file, e);
                res.sendStatus(500);
                res.send({ code: "crud.query.failed", error: report_path+" is broken", file: query_file } );
            }

        }));

        _.each(report.filter, function(filter, name) {
            endpoint.queryParam( name, joi.string(), name );
        })

        endpoint
            .response(200, null, ['application/json'], report.name)
            .response(200, null, ['text/csv'], report.name)
            .summary(report.singular + " for "+report.name)
            .description(options.singular+" for "+report.name);

        util.models.GenericEndpoint(endpoint, options, mixins);

    });

    var manifest = options.context.service.manifest;
    //DEBUG &&
    DEBUG && console.log("[%o] AQL: %o -> %o", manifest.name, options.plural, _.keys(reports_defn.reports));

    return { name: options.name, router: router, rbac: rbac};
}
