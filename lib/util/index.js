module.exports = {

    query: require("./queries"),
    convert: {
        csv: require("./json2csv"),
    },
    models: require("./models")
}

/*

    deprecated due to limited support in Arango for streaming / events

    multipart: require("./multipart")

 */