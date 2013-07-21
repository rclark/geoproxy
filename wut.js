var stream = require("stream"),
    request = require("request"),
    OgrConverter = require("./ogr");

function Pipe(name) {
    var thing = "", output, input;
    
    this.input = input = new stream.PassThrough();
    this.output = output = new stream.PassThrough();
    
    this.input.on("readable", function() {
        var line;
        while (line = input.read()) { thing += line; }
        output.write(thing);
    });
}

var first = new OgrConverter("WFS", "GeoJSON", function () {}),
    second = new Pipe("second"),
    url = "http://data.usgin.org/arizona/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=azgs:activefaults&maxFeatures=10";

first.output.pipe(second.input);

request(url).pipe(first.input);

//second.output.pipe(process.stdout);