/*
    Each API is declared as a module
    The name is used to construct database collections and other API-specific naming conventions.

    The "singular" and "plural" fields are used to auto-generate API documentation.

    The "strategy" can be CRUD, AQL, Custom.
        Experimental stratgies include: FSM, Proxy, Upload, UX and Workflow

    The "scoped" field can be set to true to enable JWT based scopes. Or to a string which relates to a JWT role claim.

    "schema" should refer to a JSON schema - or set to false

    "defaults" can be optional used to instanitate a minimal data model

    "example" is used in API examples. If no schema specified, the example is used to auto-generate one. Note, "defaults" also apply.

 */
module.exports = {
    name: "projects",
    singular: "Project",
    plural: "Projects",
    strategy: "CRUD",
    debug: true,
    scoped: false,
    model: "collection",
    schema: require("../schema/project.json"),
    defaults: {
        "title": "New Project"
    },
    example: {
        "title": "New Project",
        "active": true,
        "business_unit": "Example Dept",
        "progress": 0
    }
}