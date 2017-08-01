'use strict';

const createRouter = require('@arangodb/foxx/router');
const _ = require("lodash");
const joi = require("joi");
const assert = require("assert");
const StateMachine = require('javascript-state-machine');
const CRUD = require("./CRUD");
const util = require('../util');

module.exports = function (options, mixins) {

    assert(options, "Missing FSM options");
    assert(options.db, "Missing FSM db");
    assert(options.name, "Missing FSM name");

    assert(options.singular, "Missing FSM singular name");
    assert(options.plural, "Missing FSM plural name");

    assert(options.processes, "Missing FSM processes");

    mixins.configure && mixins.configure(options);

    var db = options.db;
    var name = options.name;
    var basePath = "/" + name;
    var manifest = options.context.service.manifest;

    const router = options.router || createRouter();

    var coll_name = options.collection || name;
    var qname = module.context.collectionName(coll_name);
    const collection = db._collection(qname);
    const DEBUG = options.debug?true:false;

    var crud = new CRUD(options, mixins);

    var self = this;
    _.each(options.processes, function(process, process_name) {

        process.error = function(eventName, from, to, args, errorCode, errorMessage, originalException) {
            return 'state ' + eventName + ' was ' + errorMessage;
        };

        var fsm = new StateMachine.create(process);
        var events = {};
        _.map(process.events, function(v) { events[v.name] = true } );

        var endpoint = router.get(basePath+"/:id/"+process_name+"/:action", function(req, res) {
            var action = req.pathParams.action;
            var state_id = req.pathParams.id;
            DEBUG && console.log("action: %s -> %s -> %o", process_name, action, state_id);
            var state = collection.document(state_id);

            if (!state) {
                res.sendStatus(404);
                res.send({ code: "fsm.state.missing", error: "Missing "+state_id+" state for "+coll_name } );
                return;
            }

            if (state.process && !state.process==process_name) {
                res.sendStatus(404);
                res.send({ code: "fsm.process.invalid", error: "Process mismatch: "+state.process+" is not "+process_name} );
                return;
            }

            state.state = state.state || process.initial || "initial";
            fsm.current = state.state;

            var response = { _key: state._key, _id: state._id, process: process_name, action: action, state: state.state, from: state.state, actions: fsm.transitions() };

            if (state.completed) {
                res.sendStatus(405);
                res.send( _.extend({ code: "fsm.state.completed", error: ""+process_name+" already completed" },response) )
                return;
            }

            var fn = fsm[action];
            if (!fn) {
                res.sendStatus(500);
                res.send( _.extend({  "code": "fsm.action.missing", error: "Missing '"+action+"' action for "+process_name+" "+options.singular }, response ));
                return;
            }

            if (!fsm.can(action)) {
                res.sendStatus(409); // 409 Conflicted state
                res.send( _.extend({  "code": "fsm.action.denied", error: "Invalid '"+action+"' action for "+process_name+" "+options.singular }, response ));
                return;
            }

            var now = Date.now();

            try {
                var result = fn.apply(fsm);
                response.state = state.state = fsm.current;
                response.changed = (state.state != response.from);

                // ignored if no transition occurred
                if (!response.changed) {
                    res.sendStatus(202);
                    res.send( response );
                    return;
                }

                // optional history tracking
                if (options.history) {
                   state.history = state.history || [];
                   state.history.push( { from: state.state, to: fsm.current, modifiedOn: now });
                }

                // update state document
                state.lastState = state.state;
                state.state = fsm.current;
                state.completed = process.final && (state.state==process.final)?true:false;

                // persist then response to client
                collection.update( { _key: state._key }, state);
                res.send( _.extend( response, { actions: fsm.transitions() }) );

            } catch(e) {
                res.sendStatus(500);
                res.send( _.extend({ code: "fsm.transition.failed", error: "Error: "+action+" action for "+process_name, ex: ""+e },response) );
            }

        });

        endpoint.response(['application/json'], 'Return ' + process_name + " " +options.singular)
            .summary('Execution' + process_name+" " +options.singular + " action")
            .description('Returns result of ' + process_name+" " +options.singular);

    });

    DEBUG && console.log("[%o] FSM: %o -> %o", manifest.name, options.singular, _.keys(options.processes));

    return { name: options.name, router:router, rbac: null, vault: null, schema: null, crud: crud };
}
