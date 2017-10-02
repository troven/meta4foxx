const _ = require("lodash");
const assert = require("assert");
const CryptoJS = require("crypto-js");

module.exports = function(secret, algo) {
    algo = algo || "AES";

    return {
        encrypt: function(plaintext) {
            assert(secret, "Missing secret");
            assert(plaintext, "Missing plaintext");
            if (_.isObject(plaintext)) plaintext = JSON.stringify(plaintext);
            assert( _.isString(plaintext), "Plain-text not a string");
            var ciphertext = CryptoJS[algo].encrypt(plaintext, secret);
            return ciphertext.toString();
        },

        decrypt: function(ciphertext, toJSON) {
            assert(secret, "Missing secret");
            assert(ciphertext, "Missing ciphertext");
            var bytes = CryptoJS[algo].decrypt(ciphertext, secret);
            var plaintext = bytes.toString(CryptoJS.enc.Utf8);
            console.log("[meta4foxx] plaintext: [%s] %s --> %s", secret, ciphertext, plaintext);
            return toJSON?JSON.parse(plaintext):plaintext;
        }
    }
}
