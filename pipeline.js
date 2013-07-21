var stream = require("stream"),
    OsmConverter = require("./osm2geojson.js"),
    TopoJsonConverter = require("./geo2topojson.js"),
    OgrConverter = require("./ogr"),
    formats = require("./formats"),
    temp = require("temp"),
    fs = require("fs"),
    _ = require("underscore"),
    
    converters = {
        osm: OsmConverter,
        topojson: TopoJsonConverter,
        ogr: OgrConverter
    };

module.exports = function (inFormat, outFormat, callback) {
    var inStream, outStream, pipeline = [], outfile, i, step, last, tempPath;
    function handleError(err) {
        if (err) { 
            callback(err); 
        }        
    }
    
    function connectPipes(err) {
        if (err) { 
            callback(err); 
        }
        else { 
            callback(); 
        }
    }
    
    this.input = inStream = new stream.PassThrough();
    this.output = outStream = new stream.PassThrough();
    
    if (!_.contains(formats.readTypes, inFormat)) {
        callback(new Error("An invalid input format was specified. Please select one of " + formats.readTypes.join(", ")));
    } else if (!_.contains(_.keys(formats.writeFormats), outFormat)) {
        callback(new Error("An invalid output format was specified. Please select one of " + _.keys(formats.writeFormats).join(", ")));
    } else {
        if (inFormat === "OSM") { 
            pipeline.push("osm");
            inFormat = "GeoJSON";
        }
        
        if (outFormat === "TopoJSON") {
            if (inFormat !== "GeoJSON") { pipeline.push("ogr"); }
            pipeline.push("topojson");
        } else if (inFormat !== outFormat) {
            pipeline.push("ogr");
        }
            
        pipeline = _.map(pipeline, function (step, index, array) {
            if (index === array.length -1) {
                return new converters[step](inFormat, outFormat, connectPipes);
            } else {
                return new converters[step](inFormat, outFormat, handleError);
            }
        });
        
        /*
        
        if (inFormat === "OSM") {
            pipeline.push(new OsmConverter(handleError));
            inFormat = "GeoJSON";
        }
        
        if (outFormat === "TopoJSON") {
            if (inFormat !== "GeoJSON") {
                pipeline.push(new OgrConverter(inFormat, "GeoJSON", handleError));
            }
            
            pipeline.push(new TopoJsonConverter(handleError));
            
        } else if (inFormat !== outFormat) {
            pipeline.push(new OgrConverter(inFormat, outFormat, handleError));
        }
        */
        
        pipeline.forEach(function (step, i) {
            if (i === 0) {
                inStream.pipe(step.input);
            } else {
                pipeline[i - 1].output.pipe(step.input);
            }
        });
        
        last = pipeline[pipeline.length - 1].output;
        
        if (outFormat === "ESRI Shapefile" || outFormat === "FileGDB") {
            tempPath = temp.path();
            last.pipe(fs.createWriteStream(tempPath));
            // Now I have the file, need to zip it up.
            callback();
        } else {
            last.pipe(outStream);
        }
    }
};