var topojson = require("topojson"),
    stream = require("stream");

module.exports = function (inFormat, outFormat, callback) {
    var inStream, outStream, geojson = "", topo;
    
    this.converterType = "TopoJSON";
    this.input = inStream = new stream.PassThrough();
    this.output = outStream = new stream.PassThrough();
    
    inStream.on("readable", function () {
        inStream.on("data", function(chunk) { geojson += chunk; });
        inStream.on("end", function () {
            topo = topojson.topology(
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
            
            callback();
            outStream.write(JSON.stringify(topo));
        });
    });
};