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
    const DEBUG = options.debug?true:false;
    const META_PREFIX = "/meta4";

    const router = options.router || createRouter();

    // apply configuration strategies
    mixins.configure && mixins.configure(options);
    var path = options.path = options.path || "/" + name;

    const RenderReport = function(result, req, res) {
        console.log("RenderReport: %s -> %s", req.path, req.headers);
        switch (req.headers.accept) {
            case "text/csv":
                res.send( util.convert.csv(result));
            break;
            case "application/json":
            default:
                res.send(result);
                break;
        }
    }

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

    console.log("AQL %s API: %s", options.name, options.manifest.name);

    _.each(reports_defn.reports, function(report) {


        var report_path = report.name;
        var query_file = home + "/" + (report.query||report.name+".aql");

        console.log("AQL Report: %s / %s -> %o", path, report.name, report);

        var endpoint = router.get(path + "/"+ report.name, rbac.protect(function (req, res) {
            var permit = rbac.request(req);

            var filter = _.extend({}, report.filter);
            _.each(filter, function(v,k) {
                if ( req.queryParams[k]!= undefined) {
                    filter[k] = req.queryParams[k];
                    if (filter[k]=="false") filter[k] = false;
                    else if (filter[k]=="true") filter[k] = true;
                }
            });

            mixins.beforeRequest && mixins.beforeRequest(filter, req, res, options);

            try {
                // DEBUG &
                var query = fs.readFileSync(query_file, "UTF-8");
                console.log("QUERY: %s [%s] <- %o\n%s", req.path, query_file, filter, query);
                var result = db._query(query, filter).toArray();
                mixins.afterRead && mixins.afterRead(result, req, res, options);

                RenderReport(result, req, res);
            } catch(e) {
                console.log("ERROR: %o", e);
                res.sendStatus(404);
                res.send({ code: "crud.query.missing", error: report_path+" not found", file: query_file } );
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

        GenericEndpoint(endpoint, options);

    });

    var manifest = options.context.service.manifest;
    //DEBUG &&
    console.log("[%o] AQL: %o -> %o", manifest.name, options.plural, _.keys(reports_defn.reports));

    return { name: options.name, router: router, rbac: rbac};
}
