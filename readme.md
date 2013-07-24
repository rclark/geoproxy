# geoproxy
... all the hip GIS encodings

## What does it do?
You have a data service but you don't like its output formats. You want something different. Or maybe your data service doesn't understand the internet, I mean, [CORS](http://enable-cors.org). __Geoproxy__ can give you what you need.

## How do I use it?
- __The Easy Way__: You can go [try the form]().
- __The Probably More Useful Way__: You can use the proxy service. Do this:
    - Construct a __POST___ request to this URL: http://notreadyyet.sorry
    - Make sure your request sets the `Content-type: application/json` header.
    - Your POST body should look like:
    
        {
            "url": "http://path/to/your/data...",
            "inFormat": "WFS",
            "outFormat": "TopoJSON"
        }
    
    