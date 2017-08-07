const assert = require("assert");
const _ = require("lodash");
const fs = require("fs");
const Dicer = require("dicer");
const stream = require('stream');

const RE_BOUNDARY = /^multipart\/.+?(?:; boundary=(?:(?:"(.+)")|(?:([^\s]+))))$/i

module.exports = {

    upload: function(req, options) {
        assert(req.rawBody, "Missing rawBody");
        assert(options.upload, "Missing upload options");

        var bufferStream = new stream.PassThrough();
        bufferStream.end(req.rawBody);

        var boundary = RE_BOUNDARY.exec(req.headers['content-type']);
        var dicer = new Dicer({ boundary: boundary[1] || boundary[2] });

        dicer.on('part', function(p) {
            console.log('New part!');
            p.on('header', function(header) {
                for (var h in header) {
                    console.log('Part header: k: ' + inspect(h)
                        + ', v: ' + inspect(header[h]));
                }
            });
            p.on('data', function(data) {
                console.log('Part data: ' + inspect(data.toString()));
            });
            p.on('end', function() {
                console.log('End of part\n');
            });
        });

        dicer.on('finish', function() {
            console.log('End of parts');
            res.writeHead(200);
            res.end('Form submission successful!');
        });

//        bufferStream.pipe(dicer);

        console.log("Upload Mime: %o -> %o", options.upload, boundary);
    }

}