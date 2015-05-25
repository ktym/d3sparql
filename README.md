d3sparql.js
===========

JavaScript library for executing SPARQL query and transforming resulted JSON for visualization in D3.js.

### Description

Semantic Web technologies are getting widely used in information sciences along with the Linked Open Data (LOD) initiative and RDF data are exposed at SPARQL endpoints around the world. SPARQL query is used to search those endpoints and the results are obtained as a SPARQL Query Results XML Format or a SPARQL Query Results JSON Format, both are essentially tabular structured data. To effectively represent the SPARQL results, appropriate visualization methods are highly demanded. To create and control dynamic graphical representation of data on the Web, the D3.js JavaScript library is getting popularity as a generic framework based on the widely accepted Web standards such as SVG, JavaScript, HTML5 and CSS. A variety of visualization examples implemented with the D3.js library are already freely available, however, each of them depends on a predefined JSON data structure that differs from the JSON structure returned from SPARQL endpoints. Therefore, it is expected to largely reduce development costs of Semantic Web visualization if a JavaScript library is available which can transform SPARQL Query Results JSON Format into JSON data structures consumed by the D3.js. The d3sparql.js is developed as a generic JavaScript library to fill this gap which can be used to query SPARQL endpoints as an AJAX call and provides various callback functions to visualize the obtained results.

### Currently supports

* Charts
  * barchart, piechart, scatterplot
* Graphs
  * force graph, sankey graph
* Trees
  * roundtree, dendrogram, treemap, sunburst, circlepack
* Maps
  * coordmap, namedmap
* Tables
  * htmltable, htmlhash

### Usage

```html
<!DOCTYPE html>
<meta charset="utf-8">
<html>
 <head>
  <script src="http://d3js.org/d3.v3.min.js"></script>
  <script src="d3sparql.js"></script>
  <script>
  function exec() {
    /* Uncomment to see debug information in console */
    // d3sparql.debug = true
    var endpoint = d3.select("#endpoint").property("value")
    var sparql = d3.select("#sparql").property("value")
    d3sparql.query(endpoint, sparql, render)
  }
  function render(json) {
    /* set options and call the d3spraql.xxxxx function in this library ... */
    var config = {
	  "selector": "#result"
	}
    d3sparql.xxxxx(json, config)
  }
  </script>
  <style>
  <!-- customize CSS -->
  </style>
 </head>
 <body onload="exec()">
  <form style="display:none">
   <input id="endpoint" value="http://dbpedia.org/sparql" type="text">
   <textarea id="sparql">
    PREFIX ...
    SELECT ...
    WHERE { ... }
   </textarea>
  </form>
  <div id="result"></div>
 </body>
</html>
```

### Live demo

* http://biohackathon.org/d3sparql

### Codebase

* https://github.com/ktym/d3sparql

### Publication

* http://ceur-ws.org/Vol-1320/paper_39.pdf

### Presentation

* http://www.slideshare.net/ToshiakiKatayama/d3sparqljs-demo-at-swat4ls-2014-in-berlin

### ChangeLog

See details at https://github.com/ktym/d3sparql/commits/master/d3sparql.js

* 2013-01-28 Project started
* 2014-07-03 Made publicly available at GitHub
* 2014-07-14 Added bar/line charts ```barchart()``` with scales
* 2014-07-17 Added default SVG attributes equivalent to CSS styles
  * Visualizations look good without CSS by default (user can customize style by CSS)
  * Added descriptions to each visualization function
* 2014-07-19 Introduced ```d3sparql``` name space
* 2014-07-20 Added Pie, Doughnut ```piechart()```, Sankey diagram ```sankey()``` and a name based map ```namedmap()```
* 2014-11-13 Merged a pull request to visualize a coordination based map ```coordmap()```
* 2014-12-11 Updated to set default values in options
* 2015-02-03 Added README file
  * updated namedmap to use an option for scale
  * merged a pull request to insert visualization at the specified DOM ID instead of appending to the body
* 2015-02-04 Improved to customize the target DOM ID
* 2015-02-06 Changed to clear the DOM contents before appending elements to update the visualization
* 2015-05-21 Updated ```tree()``` and ```graph()``` to keep values associated to nodes
  * Values are reflected in the ```treemap()```, ```sunburst()``` and ```forcegraph()``` visualizations
* 2015-05-21 Debug mode is introduced
  * Assign ```d3sparql.debug = true``` at anytime to enable verbose console log
* 2015-05-25 Incorporated ```treemapzoom()``` useful to dig into a nested tree (in which each leaf may have a value)


