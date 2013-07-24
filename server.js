var Pipeline = require("./pipeline"),
    request = require("request"),
    _ = require("underscore"),
    formats = require("./formats"),
    express = require("express"),
    app = express();

app.use(express.bodyParser());
app.use(app.router);
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.send(err.http_status || 500, err.message);
});

function enableCors(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    if (req.method === "OPTIONS") {
        res.send(200);
    } else {
        next();
    }
}

app.get("/", function (req, res) {
    res.send("this will be a homepage");
});

app.post("/", enableCors, function (req, res, next) {
    var dataKeys = _.keys(req.body), err, converter;
    
    if (!_.contains(dataKeys, "url")) {
        err = new Error("You must specify a url to request. This is, after all, a proxy service.");
        err.http_status = 400;
        next(err);
        return;
    }
    
    if (!_.contains(dataKeys, "inFormat") || !_.contains(dataKeys, "outFormat")) {
        err = new Error("You must specify the input and output formats (inFormat and outFormat)");
        err.http_status = 400;
        next(err);
        return;
    }
    
    if (!_.contains(formats.readTypes, req.body.inFormat) || !_.contains(formats.writeFormats, req.body.outFormat)) {
        err = new Error("You must choose an allowed input and output format.\nInputs: " + formats.readTypes.join(", ") + "\nOutputs: " + _.keys(formats.writeFormats).join(", "));
        err.http_status = 400;
        next(err);
        return;
    }
    
    if (_.contains(dataKeys, "post")) {
        res.send("Not implemented yet", 501);
        return;
    }
    
    converter = new Pipeline(req.body.inFormat, req.body.outFormat);
    converter.on("error", function (err) {
        if (err.process_code) { err.http_status = 500; }
        else { err.http_status = 400; }
        next(err);
    });
    
    converter.on("outputReady", function () {
        res.header("Content-type", formats.writeFormats[req.body.outFormat]);
        converter.output.pipe(res);
    });
    
    converter.on("downloadReady", function (filePath) {
        res.download(filePath);
    });
    
    request(req.body.url).pipe(converter.input);
});

app.listen(3000);