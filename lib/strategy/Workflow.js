'use strict';

const createRouter = require('@arangodb/foxx/router');
const _ = require("lodash");
const assert = require("assert");
const joi = require("joi");

module.exports = function(options, defaults, mixins) {
    options = _.extend({}, defaults, options);

    assert(options.home, "Missing Workflow home");
    assert(options.context, "Missing Workflow context");
    assert(options.router, "Missing Workflow router");

    options.name  = options.name || "ux";
    var path = options.path = options.path || "/" + options.name;

    const router = options.router; // || createRouter();
    const DEBUG = options.debug?true:false;
    const manifest = options.context.service.manifest;

    // router.get(path+"/*", function(req, res) {
    //     var req_path = req.path;
    //     if (req_path.indexOf(".")<0) req_path=req_path+"/index.html";
    //     if (req_path.indexOf(path)==0) {
    //         req_path = req_path.substring(path.length+1);
    //     } else {
    //         res.throw(404, "invalid request");
    //         return;
    //     }
    //
    //     var file = options.context.fileName(options.home+"/"+req_path);
    //     DEBUG && console.log("[meta4foxx] Workflow (%s) asset: %o -> %s", path, req_path, file);
    //     res.sendFile(file);
    // })
    //     .response(['text/html'], manifest.description+" assets")
    //     .summary(manifest.description+" assets")
    //     .description('Retrieve static assets for '+manifest.description);

    DEBUG && console.log("[meta4foxx] [%o] Workflow: %o @ %o", manifest.name, options.home, path);

    return { name: options.name, router:router, rbac: null, vault: null, schema: null, workflow:  };
}
