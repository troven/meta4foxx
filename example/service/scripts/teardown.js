'use strict';
const foxxy = require("meta4foxx");

const db = require('@arangodb').db;

var options = { db: db, context: module.context };

// each API that uses the database may be explicity torn down (caution: data loss can occur)

// foxxy.Teardown( require("../apis/projects"), options);

