module.exports = {

    query: require("./queries"),
    convert: {
        csv: require("./json2csv"),
    },
    models: require("./models"),
    multipart: require("./multipart")

}