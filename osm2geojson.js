var expat = require("node-expat"),
    stream = require("stream");

function osmStream2Stream(inFormat, outFormat, callback) {
    var parser = new expat.Parser("UTF-8"),
        firstFeature = true,
        currentFeature = null,
        nodes = {},
        readable,
        writable;
    
    this.converterType = "OSM";
    this.input = readable = new stream.PassThrough();
    this.output = writable = new stream.PassThrough();
    
    parser.on("startElement", function (name, attrs) {
        switch (name) {
        case "node":
            nodes[attrs.id] = { uid: attrs.uid, coordinates: [attrs.lon, attrs.lat] };
            break;
        case "way":
            currentFeature = {
                type: "Feature",
                id: attrs.id,
                properties: { uid: attrs.uid },
                geometry: { type: "", coordinates: [] }
            };
            break;
        case "nd":
            currentFeature.geometry.coordinates.push(nodes[attrs.ref].coordinates);
            break;
        case "tag":
            if (currentFeature) { currentFeature.properties[attrs.k] = attrs.v; }
            break;
        }
    });
    
    parser.on("endElement", function (name) {
        if (name === "way") {
            var last = currentFeature.geometry.coordinates.length - 1;
            if (currentFeature.geometry.coordinates[0] === currentFeature.geometry.coordinates[last]) {
                currentFeature.geometry.coordinates = [currentFeature.geometry.coordinates];
                currentFeature.geometry.type = "Polygon";
            } else {
                currentFeature.geometry.type = "LineString";
            }
            
            if (firstFeature) {
                callback();
                writable.write('{"type":"FeatureCollection","features":[');
                firstFeature = false;
            } else { writable.write(","); }
            
            writable.write(JSON.stringify(currentFeature));
        }
    });
    
    parser.on("end", function () {
        if (!currentFeature) { callback(new Error("No OSM Ways received.")); return; }        
        writable.write("]}\n");
        writable.end();
    });
    
    parser.on("error", function (err) {
        callback(err);
    });
    
    readable.pipe(parser);
}

module.exports = osmStream2Stream;