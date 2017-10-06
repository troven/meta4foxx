'use strict';

const _ = require("lodash");
const assert = require("assert");
const joi = require("joi");

module.exports = function(options, defaults, mixins) {
    options = _.extend({}, defaults, options);

    assert(options.home, "Missing UX home");
    assert(options.context, "Missing UX context");
    assert(options.router, "Missing UX router");

    options.name  = options.name || "ux";
    var path = options.path = options.path || "/" + options.name;

    const router = options.router; // || createRouter();
    const DEBUG = options.debug?true:false;
    const manifest = options.context.service.manifest;

    var config = options.config;

    // configure Cookie factory

    var COOKIE_ALGO = config.cookie_algo || options.cookie_algo || "sha256";
    var COOKIE_NAME = config.cookie_name || options.cookie_name || manifest.name;
    var COOKIE_SECRET = config.cookie_secret || options.cookie_secret || false;
    var COOKIE_DOMAIN = config.cookie_domain || options.cookie_domain || false;
    var COOKIE_PATH = config.cookie_path || options.cookie_path || "/";
    var COOKIE_TTL = config.cookie_ttl|| options.cookie_ttl || 600;

    // configure JWT factory

    var THIN_JWT_KEY = config.jwt_keyspace || options.jwt_keyspace || manifest.name;
    var JWT_ISSUER = config.jwt_issuer || options.jwt_issuer || manifest.name;
    var JWT_ALGO = config.jwt_algo || options.jwt_algo || "HS256";
    var JWT_SECRET = config.jwt_secret|| options.jwt_secret;

    // make sure we can sign our JWT
    assert(JWT_SECRET, "Missing JWT_SECRET");

    // router

    router.get(path, function(req, res) {
        assert(req.headers, "Missing request headers");

        var token = req.headers.authorization;
        console.log("Token: %s -> %s", token, JWT_SECRET);
        if (!token || token.indexOf("Bearer ")!=0) {
            res.sendStatus(403);
            res.send( { code: "token-missing", error: "missing token" } );
            return;
        }

        // extract the JWT token from auth header
        var jwt = token.substring(6);

        // decode the JWT

        var thin_jwt = crypto.jwtDecode(JWT_SECRET, jwt, true);
        if (!thin_jwt || !thin_jwt.sub) {
            res.sendStatus(403);
            res.send( { code: "token-invalid", error: "invalid token for: "+thin_jwt.sub } );
            return;
        }

        // Fat JWT is a merger of the thin JWT with persistent User State

        var userStateByIdentity = { _key: thin_jwt.sub };
        var UserStateModel = options.collection.firstExample( userStateByIdentity );

        var now = Date.now();

        // just in time provisioning
        if (!UserStateModel) {
            userStateByIdentity.createdAt = now;
            userStateByIdentity.iss = JWT_ISSUER;
            UserStateModel = options.collection.insert( userStateByIdentity );
            console.log("NEW thin_jwt: %j", thin_jwt, UserStateModel);
        } else {
            console.log("Existing thin_jwt: %j", thin_jwt, UserStateModel);
        }

        UserStateModel[THIN_JWT_KEY] = thin_jwt;

        // make it more JWT like

        UserStateModel.sub = UserStateModel._key;
        UserStateModel.aud = thin_jwt.aud;
        UserStateModel.exp = thin_jwt.exp;
        UserStateModel.iss = JWT_ISSUER;
        UserStateModel.nbf = UserStateModel.iat = now;

        // remove Arango specific fields
        delete UserStateModel._id;
        delete UserStateModel._key;
        delete UserStateModel._rev;

        // encode as a JWT
        var fat_jwt = crypto.jwtEncode( JWT_SECRET, UserStateModel, JWT_ALGO );

        // bake cookie if both name and secret provided

        if (config.jwt_cookie_name && config.jwt_cookie_secret) {

            // bake our cookie

            var cookie_recipe = {
                secret: COOKIE_SECRET,
                algorithm: COOKIE_ALGO,
                ttl: COOKIE_TTL,
                path: COOKIE_PATH,
                domain: COOKIE_DOMAIN
            };

            // enjoy your cookie :-)
            res.cookie( COOKIE_NAME, fat_jwt, cookie_recipe );

        }

        // we're done
        res.sendStatus(200);
        res.send( { id_token: fat_jwt, ttl: UserStateModel.exp-now } );
    });
}
