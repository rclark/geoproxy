module.exports = {
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
};