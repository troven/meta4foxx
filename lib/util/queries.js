const assert = require("assert");
const _ = require("lodash");
const fs = require("fs");

module.exports = {

    execute: function(query_file, options, filter) {
        assert(query_file, "Missing query file");
        assert(options, "Missing options");
        assert(options.db, "Missing db");

        filter = filter || {};

        var db = options.db;

        var query = false;
        try {
            query = fs.readFileSync(query_file, "UTF-8");
        } catch(e) {
            // IGNORE
        }

        if (!query) {
            console.error("QUERY FILE: %o -> %o", query_file, e);
            return false;
        }

        try {
            return db._query(query, filter).toArray();
        } catch(e) {
            console.error("QUERY ERROR: %o -> %o", query_file, e);
            return false;
        }

    }

}