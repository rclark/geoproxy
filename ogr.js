var spawn = require("child_process").spawn,
    stream = require("stream");
        
function OgrConverter(inFormat, outFormat, callback) {
    var inStream, outStream, params, ogr2ogr, ogrError;
    
    this.converterType = "OGR";
    this.input = inStream = new stream.PassThrough();
    this.output = outStream = new stream.PassThrough();
    
    outStream.on("error", function (err) {
        callback(err);
    });
    
    params = [
        "-f", outFormat,
        "-preserve_fid",
        "/vsistdout/", "/vsistdin/"
    ];
    
    if (inFormat === "EsriJSON") { params.push("OGRGeoJSON"); }
    
    ogr2ogr = spawn("ogr2ogr", params);    
    
    ogrError = "";
    ogr2ogr.stderr.on("data", function (chunk) { ogrError += chunk; });
    
    ogr2ogr.on("close", function (code) {
        if (code === 0) {            
            return;
        } else {
            var err = new Error(ogrError);
            err.process_code = code;
            callback(err);
        }
    });
    
    inStream.on("readable", function () {        
        ogr2ogr.stdout.pipe(outStream);
        //inStream.pipe(ogr2ogr.stdin);
        //ogr2ogr.stdin.write(inStream.read());
    });
    inStream.on("end", function () {
        console.log("end");
        ogr2ogr.stdin.end();
    });
}

module.exports = OgrConverter;