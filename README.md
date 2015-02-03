d3sparql.js
===========

JavaScript library for executing SPARQL query and transforming resulted JSON for visualization in D3.js.

### Description

Semantic Web technologies are being widely applied in life sciences. Major bioinformatics data centers started to provide heterogeneous biomedical datasets in RDF and expose them at SPARQL endpoints. SPARQL query is used to search those endpoints and the results are obtained as a SPARQL Query Results XML Format or a SPARQL Query Results JSON Format, both are essentially tabular structured data. To effectively represent the SPARQL results, appropriate visualization methods are highly demanded. To create and control dynamic graphical representation of data on the Web, the D3.js JavaScript library is getting popularity as a generic framework based on the widely accepted Web standards such as SVG, JavaScript, HTML5 and CSS. A variety of visualization examples implemented with the D3.js library is already available, however, each of them depends on assumed JSON data structure that differs from the JSON structure returned from SPARQL endpoints. Therefore, it is expected to largely reduce development costs of Semantic Web visualization if a JavaScript library is available which transforms SPARQL Query Results JSON Format into JSON data structures consumed by the D3.js. The d3sparql.js is developed as a generic JavaScript library to fill this gap and can be used to query SPARQL endpoints as an AJAX call and provides various callback functions to visualize the obtained results.

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
    var endpoint = d3.select("#endpoint").property("value")
    var sparql = d3.select("#sparql").property("value")
    d3sparql.query(endpoint, sparql, render)
  }
  function render(json) {
    // set options and call the d3xxxxx function in this library ...
    var config = { ... }
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
 </body>
</html>
```

### Live demo

* http://biohackathon.org/d3sparql

### Code base

* https://github.com/ktym/d3sparql

### Publication

* http://ceur-ws.org/Vol-1320/paper_39.pdf

### Presentation

* http://www.slideshare.net/ToshiakiKatayama/d3sparqljs-demo-at-swat4ls-2014-in-berlin

### ChangeLog

https://github.com/ktym/d3sparql/commits/master/d3sparql.js

* 2014-07-03 Made publicly available at GitHub
* 2015-02-03 Added README file, updated namedmap to use an option for scale


