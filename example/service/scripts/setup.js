'use strict';
const foxxy = require("meta4foxx");

const db = require('@arangodb').db;

var options = { db: db, context: module.context };

// each API that uses the database must be explicity setup

foxxy.Setup( require("../apis/projects"), options);

