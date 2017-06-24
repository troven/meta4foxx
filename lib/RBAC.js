const _ = require("lodash");
const jwt_decode = require('jwt-decode')


module.exports = function(scoped, options) {

    var VERBOSE = true;

    var is_scoped = scoped?true:false;
    var verbs = options.can || [ "get", "put", "post", "delete", "head" ];
    var _can = {};

    // verbs into default permissions

    var CanScope = function(_verbs) {
        _verbs = _verbs || [];

        console.log("_verbs: %o", _verbs);

        _.each(_verbs, function(v,k) {
            if (v===true) {
                _can[k] = true;
            } else {
                _can[v.toLowerCase()] = true;
            }
        })
    }

    var RoleScope = function(_roles) {
        if (_.isString(_roles)) _roles = [_roles];
        _.each(_roles, function(r) {
            var frag = r.indexOf("#");
            if (frag>=0) {
                path = r.substring(0,frag);
                var verbs = r.substring(frag+1).split(",");
            }
        });
    }

    VERBOSE && console.log("VERBS: %o", verbs)
    CanScope(verbs);

    var RBAC = {

        request: function(req) {
            var authHeader = req.headers.authorization;
            if (!authHeader) return {
                can: function() { return false }
            };

            var token = authHeader.substring(7);
            var jwt = jwt_decode(token);
            return RBAC.authorize(jwt, req);
        },

        protect: function(fn) {

            return function(req, res) {
                if (is_scoped) {
                    console.log("rbac protect?: %o --> %o", req.method, req.path);
                    var rbac = RBAC.request(req);
                    if (!rbac) {
                        res.sendStatus(401); // 401 Unauthorized (RFC 7235)
                        res.send( { code: "rbac.authenticate", error: "Please Login" });
                        return false;
                    }

                    var can = rbac.can(req.method, req.path);
                    if (!can) {
                        res.sendStatus(403);
                        res.send( { code: "rbac.denied", error: "Access Denied to "+options.plural, scoped: scoped });
                        return false;
                    }
                }
                fn(req,res);
            }
        },

        authorize: function(jwt, req) {

            // aggregate roles for convenience
            var roles = [];
            if (jwt && jwt.realm_access) roles = roles.concat( jwt.realm_access.roles );
            if (jwt && jwt.resource_access && jwt.resource_access.account) roles = roles.concat( jwt.resource_access.account.roles );

            VERBOSE && console.log("rbac jwt roles: %o", roles);

            var matched = [];
            req.jwt = jwt;

            _.each(roles, function(r) {
                var frag = r.indexOf("#");

                if (frag>0) {
                    verbs = frag.split(",");
                    path = r.substring(0,frag);
                } else {
                    path = r;
                }
                // match
                if (path.indexOf(scoped)==0) {
                    matched = verbs;
                }
            });

            VERBOSE && console.log("rbac authorizes: %o --> %s --> %o", roles, scoped, matched);

            return {

                can: function(action, resource) {
                    action = action.toLowerCase();

                    if (!is_scoped) return _can[action]?true:false;
                    if (!jwt) {
                        VERBOSE && console.log("rbac no-jwt: %s --> %o", action, resource);
                        return false;
                    }
                    var granted = matched.indexOf?matched.indexOf(action)>=0:matched[action]?true:false;
                    VERBOSE && console.log("rbac granted?: %s --> %s --> %o", action, matched, granted);
                    return granted;
                }

            }
        }
    }

    return RBAC;

}