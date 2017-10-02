const _ = require("lodash");
const yaml = require('js-yaml');
const fs   = require('fs');

module.exports = {

    load: function(filename) {
        try {
            var doc = yaml.safeLoad(fs.readFileSync(filename, 'utf8'));
            console.log("[meta4foxx] load YAML: %s -> %o", filename, doc);
            return doc;
        } catch (e) {
            console.error("YAML load error: %s -> %o", filename, e);
            return null;
        }
    },

    save: function(filename, json) {
        try {
            var doc = yaml.safeDump(json);
            fs.writeFileSync(filename, doc);
            console.log("[meta4foxx] saved YAML: %s", filename);
            return doc;
        } catch (e) {
            console.error("YAML save error: %s -> %o", filename, e);
            return null;
        }
    }
}