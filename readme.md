# geoproxy
... all the hip web-GIS encodings

## What does it do?
You have a data service but you don't like its output formats. You want something different. Or maybe your data service doesn't understand the modern web, err, [CORS](http://enable-cors.org) at least. __Geoproxy__ can give you what you need.

## How do I use it?
- __The Easy Way__: You can go [try the form](http://geoproxy.worbly.org/).
- __The Slightly-More-Useful Way__: You can use the proxy service. Do this:
    - Construct a __POST__ request to this URL: http://geoproxy.worbly.org/
    - Make sure your request sets the `Content-type: application/json` header.
    - Your POST body should look like:
    
            {
                "url": "http://path/to/your/data...",
                "inFormat": "WFS",
                "outFormat": "TopoJSON"
            }

## What formats are supported?
I'm working on bringing in other valid OGR vector formats (and some others), but for now, here's what you can do

You can transform any of these: | Into any of these:
--- | ---
WFS (GetFeature response) | GeoJSON
GeoJSON | TopoJSON
OpenStreetMap XML | KML
EsriJSON | ESRI Shapefile

## What do I want to do?
- Support more formats. Currently I'm working on baking in support for ESRI File Geodatabases.
- Allow transformations of uploaded files.
- Allow proxy service to work with __GET__ requests that are similar to those supported by popular data services (i.e. WFS, ESRI MapService, OSM 0.6 API).
