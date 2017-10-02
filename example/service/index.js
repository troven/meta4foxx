'use strict';
const foxxy = require("meta4foxx");

// const Router = require('@arangodb/foxx/router');

const db = require('@arangodb').db;

const app = module.context;
var manifest = app.service.manifest;

// options ensure each API is aware of it's runtime environment

const options = { db: db, context: module.context, manifest: manifest };

// A meta4foxx module manages a set of APIs

var foxx_app = foxxy.Module( options );

// Each app must be attached to the global router

app.use( foxx_app.router );

// Each API that you want to load must be declared

foxx_app.api( require ("./apis/projects") );

// Static assets can be served using the UX feature

/*
    plugin.api( foxxy.UX( { home: "./public" }, options ) );
*/
