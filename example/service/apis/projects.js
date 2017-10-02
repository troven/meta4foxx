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