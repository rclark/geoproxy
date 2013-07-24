var stream = require("stream"),
    events = require("events"),
    conversions = require("./conversions");

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
            pipeline.push(conversions.ogr2ogr(inFormat, "GeoJSON"));
        }
        pipeline.push(new conversions.geojson2topojson());
    } else if (inFormat !== outFormat) {
        pipeline.push(conversions.ogr2ogr(inFormat, outFormat));
    }
    
    pipeline.forEach(function (step, index, array) {
        
        var next = index === array.length - 1 ? output : array[index + 1].input;
            
        step.on("outputReady", function (filePath) {
            if (filePath) {
                self.emit("downloadReady", filePath);
            } else {
                step.output.pipe(next);
            }
        });
    });
    
    events.EventEmitter.call(this);
    this.input = input;
    this.output = output;
    
    input.on("pipe", function () {
        var final = pipeline.length > 0 ? pipeline[0].input : output,
            lastPipeType = pipeline[pipeline.length - 1].conversion;
        self.input.pipe(final);
        
        if (lastPipeType !== "file2file" && lastPipeType !== "stream2file") {
            self.emit("outputReady");
        }
    });
}

Pipeline.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = Pipeline;