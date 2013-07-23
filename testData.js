var fs = require("fs");

module.exports = {
    urls: {
        OSM: "http://api.openstreetmap.org/api/0.6/map?bbox=-111.01032257080078,31.314701127170984,-110.68004608154295,31.44749254518246",
        WFS: "http://data.usgin.org/arizona/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=azgs:activefaults&maxFeatures=10",
        esriJSON: "http://services.azgs.az.gov/ArcGIS/rest/services/aasggeothermal/AKActiveFaults/MapServer/0/query?geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&where=1%3D1&returnCountOnly=false&returnIdsOnly=false&returnGeometry=true&f=json",
        GeoJSON: "http://data.usgin.org/arizona/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=azgs:activefaults&maxFeatures=10&outputformat=application/json"
    },
    
    streams: {
        
    },
    
    paths: {
        
    }
};