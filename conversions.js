var spawn = require("child_process").spawn,
    exec = require("child_process").exec,
    expat = require("node-expat"),
    topojson = require("topojson"),
    Writable = require("stream").Writable,
    Readable = require("stream").Readable,
    PassThrough = require("stream").PassThrough,
    events = require("events"),
    temp = require("temp"),
    fs = require("fs"),
    path = require("path");

function File2Stream(outFormat, inFormat) {
    var inFilePath = temp.path(),
        self = this,
        params = ["-overwrite", "-f", outFormat, "-preserve_fid", "-skipfailures", "/vsistdout/", inFilePath, "OGRGeoJSON"];
    events.EventEmitter.call(this);
    
    this.input = fs.createWriteStream(inFilePath);
    this.conversion = "file2stream";
    
    if (inFormat === "EsriJSON") { params.push("OGRGeoJSON"); }
    
    this.input.on("close", function () {
        var ogr = spawn("ogr2ogr", params);
        ogr.stderr.pipe(process.stderr);
        self.output = ogr.stdout;
        self.emit("outputReady");
        ogr.on("close", function (code) {
            temp.cleanup();
        });
    });
}

function File2File(outFormat, inFormat) {
    var inFilePath = temp.path(),
        self = this,
        params = ["-overwrite", "-f", outFormat, "-preserve_fid", "-skipfailures"];
    events.EventEmitter.call(this);
        
    this.input = fs.createWriteStream(inFilePath);
    this.conversion = "file2file";
    
    this.input.on("close", function () {
        temp.mkdir("geoproxy", function (err, dirPath) {
            dirPath = outFormat === "FileGDB" ? path.join(dirPath, "geoproxy.gdb") : dirPath;
            params = params.concat([dirPath, inFilePath]);
            if (inFormat === "EsriJSON") { params.push("OGRGeoJSON"); }
            
            var ogr = spawn("ogr2ogr", params);
            ogr.on("close", function (code) {
                var outFileName = "geoproxy-result.zip",
                    outFilePath = path.join(dirPath, outFileName),
                    
                    zip = exec("cd " + dirPath + " && zip " + outFileName + " *", function (err, stdout) {
                        self.emit("outputReady", outFilePath);
                    });
            });
        });
    });
}

function Stream2Stream(outFormat) {
    var self = this,
        params = ["-overwrite", "-f", outFormat, "-preserve_fid", "-skipfailures", "/vsistdout/", "/vsistdin/"],
        ogr = spawn("ogr2ogr", params);
    events.EventEmitter.call(this);
    
    this.conversion = "stream2stream";
    this.input = ogr.stdin;
    
    this.input.on("pipe", function () {
        self.output = ogr.stdout;
        self.emit("outputReady");
    });
}

function Stream2File(outFormat) {
    var self = this,
        params = ["-overwrite", "-f", outFormat, "-preserve_fid", "-skipfailures"],
        dirPath = temp.mkdirSync();
    dirPath = outFormat === "FileGDB" ? path.join(dirPath, "geoproxy.gdb") : dirPath;
    events.EventEmitter.call(this);
    
    this.conversion = "stream2file";
    
    params = params.concat([dirPath, "/vsistdin/"]);
    
    var ogr = spawn("ogr2ogr", params);
    self.input = ogr.stdin;
    ogr.stderr.pipe(process.stderr);
                            
    ogr.on("close", function (code) {
        var outFileName = "geoproxy-result.zip",
            outFilePath = path.join(dirPath, outFileName),
            
            zip = exec("cd " + dirPath + " && zip " + outFileName + " *", function (err, stdout) {
                console.log(outFilePath);
                self.emit("outputReady", outFilePath);
            });
    });
}

function ogr2ogr(inFormat, outFormat) {
    var fileInput = inFormat === "EsriJSON" || inFormat === "GeoJSON" ? true : false,
        fileOutput = outFormat === "ESRI Shapefile" || outFormat === "FileGDB" ? true : false;
    
    if (fileInput) {
        if (fileOutput) { return new File2File(outFormat, inFormat); }
        else { return new File2Stream(outFormat, inFormat); }
    } else {
        if (fileOutput) { return new Stream2File(outFormat); }
        else { return new Stream2Stream(outFormat); }
    }
}

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
        };
        
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

File2Stream.prototype.__proto__ = events.EventEmitter.prototype;
File2File.prototype.__proto__ = events.EventEmitter.prototype;
Stream2Stream.prototype.__proto__ = events.EventEmitter.prototype;
Stream2File.prototype.__proto__ = events.EventEmitter.prototype;
osm2geojson.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = {
    ogr2ogr: ogr2ogr,
    geojson2topojson: geojson2topojson,
    osm2geojson: osm2geojson
};