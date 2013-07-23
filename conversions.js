var spawn = require("child_process").spawn,
    expat = require("node-expat"),
    topojson = require("topojson"),
    Writable = require("stream").Writable,
    Readable = require("stream").Readable,
    PassThrough = require("stream").PassThrough,
    events = require("events"),
    temp = require("temp"),
    fs = require("fs");

function ogr2ogr(inFormat, outFormat) {
    var inFilePath = temp.path(),
        inFileStream = fs.createWriteStream(inFilePath),
        outFilePath = temp.path(),
        jsonInput = inFormat === "GeoJSON" || inFormat === "EsriJSON",
        fileOutput = outFormat === "ESRI Shapefile" || outFormat === "FileGDB",
        
        params = ["-f", outFormat, "-preserve_fid"],
        
        outParam = fileOutput ? outFilePath : "/vsistdout/",
        inParam = jsonInput ? inFilePath : "/vsistdin/",

        self = this;    
    
    this.conversion = "ogr2ogr";
    events.EventEmitter.call(this);
    
    function outputReady() {
        self.output = fileOutput ? fs.createReadStream(outFilePath) : proc.stdout;
        self.emit("outputReady");
    }
    
    function ogr(params, callback) {
        var errorMessage = "";
        callback = callback || function () {};
        
        child = spawn("ogr2ogr", params);
        child.stderr.on("data", function (chunk) { errorMessage += chunk; });
        child.on("close", function (code) {
            if (code !== 0) {
                var err = new Error(errorMessage);
                err.process_code = code;
                throw err;
            } else {
                callback();
            }
        });
        
        return child;
    }
    
    params = params.concat([outParam, inParam]);
    if (inFormat === "EsriJSON") { params.push("OGRGeoJSON"); }
    
    if (jsonInput) {
        this.input = inFileStream;
    } else {
        if (fileOutput) {
            proc = ogr(params, outputReady);
        } else {
            proc = ogr(params);
        }
        this.input = proc.stdin;
    }
    
    this.input.on("pipe", function() {
        if (jsonInput) {
            self.input.on("finish", function () {
                if (fileOutput) {
                    proc = ogr(params, outputReady);
                }
                else { 
                    proc = ogr(params);
                    outputReady();
                }
            });
        } else if (!fileOutput) {
            outputReady();
        }
    });
}
ogr2ogr.prototype.__proto__ = events.EventEmitter.prototype;

function geojson2topojson() {
    var input = new Writable(),
        output = new Readable(),
        geojson = "",
        self = this;
        
    input._write = function (chunk, encoding, done) {
        geojson += chunk;
        done();
    };
    
    events.EventEmitter.call(this);
    this.input = input;
    this.output = output;
    this.conversion = "geojson2topojson";
    
    input.on("finish", function () {
        var topo = topojson.topology(
            { features: JSON.parse(geojson) },
            {
                verbose: true,
                "coordinate-system": "auto",
                quantization: 1e4,
                "stich-poles": true,
                "property-transform": function (o, k, v) {
                    o[k] = v;
                    return true;
                }
            }
        );
        topo = JSON.stringify(topo);
        output._read = function (size) {
            var chunk = topo.substring(0, size);
            if (chunk === "") { output.push(null); }
            else {
                output.push(topo.substring(0, size));
                topo = topo.substring(size);
            }
        }
        
        self.emit("outputReady");        
    });
}

geojson2topojson.prototype.__proto__ = events.EventEmitter.prototype;

function osm2geojson() {
    var parser = new expat.Parser("UTF-8"),
        output = new PassThrough(),
        firstFeature = true,
        currentFeature = null,
        nodes = {},
        self = this;
    
    events.EventEmitter.call(this);
    this.input = parser;
    this.output = output;
    this.conversion = "osm2geojson";
    
    this.input.on("pipe", function() {
        self.emit("outputReady");
    });
        
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
                output.write('{"type":"FeatureCollection","features":[');
                firstFeature = false;
            } else { output.write(","); }
            
            output.write(JSON.stringify(currentFeature));
        }
    });
    
    parser.on("end", function () {
        if (!currentFeature) {
            throw new Error("No OSM Ways received.");
        } else {
            output.write("]}\n");
        }
        output.end();
    });
    
    parser.on("error", function (err) {
        throw err;
    });
}

osm2geojson.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = {
    ogr2ogr: ogr2ogr,
    geojson2topojson: geojson2topojson,
    osm2geojson: osm2geojson
};