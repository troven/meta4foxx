'use strict';
const foxxy = require("meta4foxx");

const db = require('@arangodb').db;

var options = { db: db, context: module.context };

foxxy.Setup( require("../apis/projects"), options);

