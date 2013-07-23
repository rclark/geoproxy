var stream = require("stream"),
    formats = require("./formats"),
    temp = require("temp"),
    fs = require("fs"),
    events = require("events"),
    _ = require("underscore"),    
    conversions = require("./conversions");

/*
    readTypes: [
        "WFS",
        //"GeoJSON",
        //"EsriJSON",
        "OSM"
    ],
    
    writeFormats: {
        GeoJSON: "application/json",
        TopoJSON: "application/json",
        KML: "application/vnd.google-earth.kml+xml",
        //"ESRI Shapefile": "application/octet-stream",
        //FileGDB: "application/octet-stream"
    }
*/

function Pipeline(inFormat, outFormat) {
    var pipeline = [],
        input = new stream.PassThrough(),
        output = new stream.PassThrough(),
        self = this;
    
    if (inFormat === "OSM") {
        pipeline.push(new conversions.osm2geojson());
        inFormat = "GeoJSON";
    }
    
    if (outFormat === "TopoJSON") {
        if (inFormat !== "GeoJSON") {
            pipeline.push(new conversions.ogr2ogr(inFormat, "GeoJSON"));
        }
        pipeline.push(new conversions.geojson2topojson());
    } else if (inFormat !== outFormat) {
        pipeline.push(new conversions.ogr2ogr(inFormat, outFormat));
    }
    
    pipeline.forEach(function (step, index, array) {
        
        var next = index === array.length - 1 ? output : array[index + 1].input
            
        step.on("outputReady", function() {
            step.output.pipe(next);
        });
    });
    
    events.EventEmitter.call(this);
    this.input = input;
    this.output = output;
    
    input.on("pipe", function () {
        input.pipe(pipeline[0].input);
        self.emit("outputReady");
    });
};

Pipeline.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = Pipeline;