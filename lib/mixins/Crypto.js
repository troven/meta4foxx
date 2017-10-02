'use strict';

const _ = require("lodash");
const assert = require("assert");

// const EncryptModel = function(options, model) {
//     assert(options, "Missing encrypt options");
//     assert(model, "Missing encrypt model");
//
//     DEBUG && options.encrypted && console.log("[meta4foxx] Encrypting: %o", model);
//
//     _.each(options.encrypted, function(field) {
//         model[field] = vault.encrypt(model[field]);
//         DEBUG & console.log("[meta4foxx] Encrypt %s -> %o", field, model[field]);
//     });
//
//     return model;
// }
//
// const DecryptModel = function(options, model, toJSON) {
//     assert(model, "Missing decrypt model");
//
//     _.each(options.encrypted, function(field) {
//         var text = vault.decrypt(model[field], toJSON);
//         model[field] = text;
//         DEBUG & console.log("[meta4foxx] Decrypt %s -> %s -> %o", field, text, model[field]);
//     });
//     return model;
// }

var DEBUG = false;

module.exports = {

    beforeCreate: function(model, req, res, options) {
//        if (options.encrypted) EncryptModel(options, model);
        DEBUG && console.log("[meta4foxx] Crypto: beforeCreate: %o", model);
    },
    beforeUpdate: function(model, req, res, options) {
//        if (options.encrypted) EncryptModel(options, model);
        DEBUG && console.log("[meta4foxx] Crypto: beforeUpdate: %o", model);
    },
    afterRead: function(model, req, res, options) {
//        DecryptModel(options, model);
        DEBUG && console.log("[meta4foxx] Crypto: afterRead: %o", model);
    }
}
