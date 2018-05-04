//
// d3sparql.js - utilities for visualizing SPARQL results with the D3 library
//
//   Web site: http://github.com/ktym/d3sparql/
//   Copyright: 2013-2015 (C) Toshiaki Katayama (ktym@dbcls.jp)
//   License: BSD license (same as D3.js)
//   Initial version: 2013-01-28
//

var d3sparql = {
  version: "d3sparql.js version 2018-05-04",
  debug: false  // set to true for showing debug information
}

/*
  Execute a SPARQL query and pass the result to a given callback function

  Synopsis:
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
         // set options and call the d3sparql.xxxxx visualization methods in this library ...
         var config = {
          "margin": {"top": 10, "right": 10, "bottom": 10, "left": 10},
          "selector": "#result",
          ...
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
*/
d3sparql.fetch = function(url, callback) {
  if (d3sparql.debug) { console.log(url) }
  var mime = "application/sparql-results+json"
  d3.xhr(url, mime, function(request) {
    var json = request.responseText
    if (d3sparql.debug) { console.log(json) }
    callback(JSON.parse(json))
  })
/*
  // d3.json sometimes fails to retrieve "application/sparql-results+json" as it is designed for "application/json"
  d3.json(url, function(error, json) {
    if (d3sparql.debug) { console.log(error) }
    if (d3sparql.debug) { console.log(json) }
    callback(json)
  })
*/
}

d3sparql.query = function(endpoint, sparql, callback) {
  var url = endpoint + "?query=" + encodeURIComponent(sparql)
  if (d3sparql.debug) { console.log(endpoint) }
  d3sparql.fetch(url, callback)
}



/*
  Convert sparql-results+json object into a JSON graph in the {"nodes": [], "links": []} form.
  Suitable for d3.layout.force(), d3.layout.sankey() etc.

  Options:
    config = {
      "key1":   "node1",       // SPARQL variable name for node1 (optional; default is the 1st variable)
      "key2":   "node2",       // SPARQL variable name for node2 (optional; default is the 2nd varibale)
      "label1": "node1label",  // SPARQL variable name for the label of node1 (optional; default is the 3rd variable)
      "label2": "node2label",  // SPARQL variable name for the label of node2 (optional; default is the 4th variable)
      "value1": "node1value",  // SPARQL variable name for the value of node1 (optional; default is the 5th variable)
      "value2": "node2value"   // SPARQL variable name for the value of node2 (optional; default is the 6th variable)
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.forcegraph(json, config)
      d3sparql.sankey(json, config)
    }

  TODO:
    Should follow the convention in the miserables.json https://gist.github.com/mbostock/4062045 to contain group for nodes and value for edges.
*/
d3sparql.graph = function(json, config) {
  config = config || {}

  var head = json.head.vars
  var data = json.results.bindings

  var opts = {
    "key1":   config.key1   || head[0] || "key1",
    "key2":   config.key2   || head[1] || "key2",
    "label1": config.label1 || head[2] || false,
    "label2": config.label2 || head[3] || false,
    "value1": config.value1 || head[4] || false,
    "value2": config.value2 || head[5] || false,
  }
  var graph = {
    "nodes": [],
    "links": []
  }
  var check = d3.map()
  var index = 0
  for (var i = 0; i < data.length; i++) {
    var key1 = data[i][opts.key1].value
    var key2 = data[i][opts.key2].value
    var label1 = opts.label1 ? data[i][opts.label1].value : key1
    var label2 = opts.label2 ? data[i][opts.label2].value : key2
    var value1 = opts.value1 ? data[i][opts.value1].value : false
    var value2 = opts.value2 ? data[i][opts.value2].value : false
    if (!check.has(key1)) {
      graph.nodes.push({"key": key1, "label": label1, "value": value1})
      check.set(key1, index)
      index++
    }
    if (!check.has(key2)) {
      graph.nodes.push({"key": key2, "label": label2, "value": value2})
      check.set(key2, index)
      index++
    }
    graph.links.push({"source": check.get(key1), "target": check.get(key2)})
  }
  if (d3sparql.debug) { console.log(JSON.stringify(graph)) }
  return graph
}

/*
  Convert sparql-results+json object into a JSON tree of {"name": name, "value": size, "children": []} format like in the flare.json file.

  Suitable for d3.layout.hierarchy() family
    * cluster:    d3sparql.dendrogram()
    * pack:       d3sparql.circlepack()
    * partition:  d3sparql.sunburst()
    * tree:       d3sparql.roundtree()
    * treemap:    d3sparql.treemap(), d3sparql.treemapzoom()

  Options:
    config = {
      "root":   "root_name",    // SPARQL variable name for root node (optional; default is the 1st variable)
      "parent": "parent_name",  // SPARQL variable name for parent node (optional; default is the 2nd variable)
      "child":  "child_name",   // SPARQL variable name for child node (ptional; default is the 3rd variable)
      "value":  "value_name"    // SPARQL variable name for numerical value of the child node (optional; default is the 4th variable or "value")
    }

  Synopsis:
    d3sparql.sparql(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.roundtree(json, config)
      d3sparql.dendrogram(json, config)
      d3sparql.sunburst(json, config)
      d3sparql.treemap(json, config)
      d3sparql.treemapzoom(json, config)
    }
*/
d3sparql.tree = function(json, config) {
  config = config || {}

  var head = json.head.vars
  var data = json.results.bindings

  var opts = {
    "root":   config.root   || head[0],
    "parent": config.parent || head[1],
    "child":  config.child  || head[2],
    "value":  config.value  || head[3] || "value",
  }

  var pair = d3.map()
  var size = d3.map()
  var root = data[0][opts.root].value
  var parent = child = children = true
  for (var i = 0; i < data.length; i++) {
    parent = data[i][opts.parent].value
    child = data[i][opts.child].value
    if (parent != child) {
      if (pair.has(parent)) {
        children = pair.get(parent)
        children.push(child)
      } else {
        children = [child]
      }
      pair.set(parent, children)
      if (data[i][opts.value]) {
        size.set(child, data[i][opts.value].value)
      }
    }
  }
  function traverse(node) {
    var list = pair.get(node)
    if (list) {
      var children = list.map(function(d) { return traverse(d) })
      // sum of values of children
      var subtotal = d3.sum(children, function(d) { return d.value })
      // add a value of parent if exists
      var total = d3.sum([subtotal, size.get(node)])
      return {"name": node, "children": children, "value": total}
    } else {
      return {"name": node, "value": size.get(node) || 1}
    }
  }
  var tree = traverse(root)

  if (d3sparql.debug) { console.log(JSON.stringify(tree)) }
  return tree
}

/*
  Rendering sparql-results+json object containing multiple rows into a HTML table

  Options:
    config = {
      "selector": "#result"
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.htmltable(json, config)
    }

  CSS:
    <style>
    table {
      margin: 10px;
    }
    th {
      background: #eeeeee;
    }
    th:first-letter {
       text-transform: capitalize;
    }
    </style>
*/
d3sparql.htmltable = function(json, config) {
  config = config || {}

  var head = json.head.vars
  var data = json.results.bindings

  var opts = {
    "selector": config.selector || null
  }

  var table = d3sparql.select(opts.selector, "htmltable").append("table").attr("class", "table table-bordered")
  var thead = table.append("thead")
  var tbody = table.append("tbody")
  thead.append("tr")
    .selectAll("th")
    .data(head)
    .enter()
    .append("th")
    .text(function(col) { return col })
  var rows = tbody.selectAll("tr")
    .data(data)
    .enter()
    .append("tr")
  var cells = rows.selectAll("td")
    .data(function(row) {
      return head.map(function(col) {
        return row[col] ? row[col].value : ""
      })
    })
    .enter()
    .append("td")
    .text(function(val) { return val })

  // default CSS
  table.style({
    "margin": "10px"
  })
  table.selectAll("th").style({
    "background": "#eeeeee",
    "text-transform": "capitalize",
  })
}

/*
  Rendering sparql-results+json object containing one row into a HTML table

  Options:
    config = {
      "selector": "#result"
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.htmlhash(json, config)
    }

  CSS:
    <style>
    table {
      margin: 10px;
    }
    th {
      background: #eeeeee;
    }
    th:first-letter {
       text-transform: capitalize;
    }
    </style>
*/
d3sparql.htmlhash = function(json, config) {
  config = config || {}

  var head = json.head.vars
  var data = json.results.bindings[0]

  var opts = {
    "selector": config.selector || null
  }

  var table = d3sparql.select(opts.selector, "htmlhash").append("table").attr("class", "table table-bordered")
  var tbody = table.append("tbody")
  var row = tbody.selectAll("tr")
    .data(function() {
       return head.map(function(col) {
         return {"head": col, "data": data[col] ? data[col].value : ""}
       })
     })
    .enter()
    .append("tr")
  row.append("th")
    .text(function(d) { return d.head })
  row.append("td")
    .text(function(d) { return d.data })

  // default CSS
  table.style({
    "margin": "10px"
  })
  table.selectAll("th").style({
    "background": "#eeeeee",
    "text-transform": "capitalize",
  })
}

/*
  Rendering sparql-results+json object into a bar chart

  References:
    http://bl.ocks.org/mbostock/3885304
    http://bl.ocks.org/mbostock/4403522

  Options:
    config = {
      "label_x":  "Prefecture",  // label for x-axis (optional; default is same as var_x)
      "label_y":  "Area",        // label for y-axis (optional; default is same as var_y)
      "var_x":    "pref",        // SPARQL variable name for x-axis (optional; default is the 1st variable)
      "var_y":    "area",        // SPARQL variable name for y-axis (optional; default is the 2nd variable)
      "width":    850,           // canvas width (optional)
      "height":   300,           // canvas height (optional)
      "margin":   40,            // canvas margin (optional)
      "selector": "#result"
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.barchart(json, config)
    }

  CSS/SVG:
    <style>
    .bar {
      fill: steelblue;
    }
    .bar:hover {
      fill: brown;
    }
    .axis {
      font: 10px sans-serif;
    }
    .axis path,
    .axis line {
      fill: none;
      stroke: #000000;
      shape-rendering: crispEdges;
    }
    .x.axis path {
      display: none;
    }
    </style>
*/
d3sparql.barchart = function(json, config) {
  config = config || {}

  var head = json.head.vars
  var data = json.results.bindings

  var opts = {
    "label_x":  config.label_x  || head[0],
    "label_y":  config.label_y  || head[1],
    "var_x":    config.var_x    || head[0],
    "var_y":    config.var_y    || head[1],
    "width":    config.width    || 750,
    "height":   config.height   || 300,
    "margin":   config.margin   || 80,  // TODO: to make use of {top: 10, right: 10, bottom: 80, left: 80}
    "selector": config.selector || null
  }

  var scale_x = d3.scale.ordinal().rangeRoundBands([0, opts.width - opts.margin], 0.1)
  var scale_y = d3.scale.linear().range([opts.height - opts.margin, 0])
  var axis_x = d3.svg.axis().scale(scale_x).orient("bottom")
  var axis_y = d3.svg.axis().scale(scale_y).orient("left")  // .ticks(10, "%")
  scale_x.domain(data.map(function(d) { return d[opts.var_x].value }))
  scale_y.domain(d3.extent(data, function(d) { return parseInt(d[opts.var_y].value) }))

  var svg = d3sparql.select(opts.selector, "barchart").append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)
//    .append("g")
//    .attr("transform", "translate(" + opts.margin + "," + 0 + ")")

  var ax = svg.append("g")
    .attr("class", "axis x")
    .attr("transform", "translate(" + opts.margin + "," + (opts.height - opts.margin) + ")")
    .call(axis_x)
  var ay = svg.append("g")
    .attr("class", "axis y")
    .attr("transform", "translate(" + opts.margin + ",0)")
    .call(axis_y)
  var bar = svg.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("transform", "translate(" + opts.margin + "," + 0 + ")")
    .attr("class", "bar")
    .attr("x", function(d) { return scale_x(d[opts.var_x].value) })
    .attr("width", scale_x.rangeBand())
    .attr("y", function(d) { return scale_y(d[opts.var_y].value) })
    .attr("height", function(d) { return opts.height - scale_y(parseInt(d[opts.var_y].value)) - opts.margin })
/*
    .call(function(e) {
      e.each(function(d) {
        console.log(parseInt(d[opts.var_y].value))
      })
    })
*/
  ax.selectAll("text")
    .attr("dy", ".35em")
    .attr("x", 10)
    .attr("y", 0)
    .attr("transform", "rotate(90)")
    .style("text-anchor", "start")
  ax.append("text")
    .attr("class", "label")
    .text(opts.label_x)
    .style("text-anchor", "middle")
    .attr("transform", "translate(" + ((opts.width - opts.margin) / 2) + "," + (opts.margin - 5) + ")")
  ay.append("text")
    .attr("class", "label")
    .text(opts.label_y)
    .style("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", 0 - (opts.height / 2))
    .attr("y", 0 - (opts.margin - 20))

  // default CSS/SVG
  bar.attr({
    "fill": "steelblue",
  })
  svg.selectAll(".axis").attr({
    "stroke": "black",
    "fill": "none",
    "shape-rendering": "crispEdges",
  })
  svg.selectAll("text").attr({
    "stroke": "none",
    "fill": "black",
    "font-size": "8pt",
    "font-family": "sans-serif",
  })
}

/*
  Rendering sparql-results+json object into a pie chart

  References:
    http://bl.ocks.org/mbostock/3887235 Pie chart
    http://bl.ocks.org/mbostock/3887193 Donut chart

  Options:
    config = {
      "label":    "pref",    // SPARQL variable name for slice label (optional; default is the 1st variable)
      "size":     "area",    // SPARQL variable name for slice value (optional; default is the 2nd variable)
      "width":    700,       // canvas width (optional)
      "height":   600,       // canvas height (optional)
      "margin":   10,        // canvas margin (optional)
      "hole":     50,        // radius size of a center hole (optional; 0 for pie, r > 0 for doughnut)
      "selector": "#result"
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.piechart(json, config)
    }

  CSS/SVG:
    <style>
    .label {
      font: 10px sans-serif;
    }
    .arc path {
      stroke: #ffffff;
    }
    </style>
*/
d3sparql.piechart = function(json, config) {
  config = config || {}

  var head = json.head.vars
  var data = json.results.bindings

  var opts = {
    "label":    config.label    || head[0],
    "size":     config.size     || head[1],
    "width":    config.width    || 700,
    "height":   config.height   || 700,
    "margin":   config.margin   || 10,
    "hole":     config.hole     || 100,
    "selector": config.selector || null
  }

  var radius = Math.min(opts.width, opts.height) / 2 - opts.margin
  var hole = Math.max(Math.min(radius - 50, opts.hole), 0)
  var color = d3.scale.category20()

  var arc = d3.svg.arc()
    .outerRadius(radius)
    .innerRadius(hole)

  var pie = d3.layout.pie()
    //.sort(null)
    .value(function(d) { return d[opts.size].value })

  var svg = d3sparql.select(opts.selector, "piechart").append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)
    .append("g")
    .attr("transform", "translate(" + opts.width / 2 + "," + opts.height / 2 + ")")

  var g = svg.selectAll(".arc")
    .data(pie(data))
    .enter()
    .append("g")
    .attr("class", "arc")
  var slice = g.append("path")
    .attr("d", arc)
    .attr("fill", function(d, i) { return color(i) })
  var text = g.append("text")
    .attr("class", "label")
    .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")" })
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .text(function(d) { return d.data[opts.label].value })

  // default CSS/SVG
  slice.attr({
    "stroke": "#ffffff",
  })
  // TODO: not working?
  svg.selectAll("text").attr({
    "stroke": "none",
    "fill": "black",
    "font-size": "20px",
    "font-family": "sans-serif",
  })
}

/*
  Rendering sparql-results+json object into a scatter plot

  References:
    http://bl.ocks.org/mbostock/3244058

  Options:
    config = {
      "label_x":  "Size",    // label for x-axis (optional; default is same as var_x)
      "label_y":  "Count",   // label for y-axis (optional; default is same as var_y)
      "var_x":    "size",    // SPARQL variable name for x-axis values (optional; default is the 1st variable)
      "var_y":    "count",   // SPARQL variable name for y-axis values (optional; default is the 2nd variable)
      "var_r":    "volume",  // SPARQL variable name for radius (optional; default is the 3rd variable)
      "min_r":    1,         // minimum radius size (optional; default is 1)
      "max_r":    20,        // maximum radius size (optional; default is 20)
      "width":    850,       // canvas width (optional)
      "height":   300,       // canvas height (optional)
      "margin_x": 80,        // canvas margin x (optional)
      "margin_y": 40,        // canvas margin y (optional)
      "selector": "#result"
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.scatterplot(json, config)
    }

  CSS/SVG:
    <style>
    .label {
      font-size: 10pt;
    }
    .node circle {
      stroke: black;
      stroke-width: 1px;
      fill: pink;
      opacity: 0.5;
    }
    </style>
*/
d3sparql.scatterplot = function(json, config) {
  config = config || {}

  var head = json.head.vars
  var data = json.results.bindings

  var opts = {
    "label_x":  config.label_x  || head[0] || "x",
    "label_y":  config.label_y  || head[1] || "y",
    "label_r":  config.label_r  || head[2] || "r",
    "var_x":    config.var_x    || head[0],
    "var_y":    config.var_y    || head[1],
    "var_r":    config.var_r    || head[2] || 5,
    "min_r":    config.min_r    || 1,
    "max_r":    config.max_r    || 20,
    "width":    config.width    || 850,
    "height":   config.height   || 300,
    "margin_x": config.margin_x || 80,
    "margin_y": config.margin_y || 40,
    "selector": config.selector || null
  }
  var extent_x = d3.extent(data, function(d) { return parseInt(d[opts.var_x].value) })
  var extent_y = d3.extent(data, function(d) { return parseInt(d[opts.var_y].value) })
  var extent_r = d3.extent(data, function(d) { return parseInt(d[opts.var_r] ? d[opts.var_r].value : opts.var_r) })
  var scale_x = d3.scale.linear().range([opts.margin_x, opts.width - opts.margin_x]).domain(extent_x)
  var scale_y = d3.scale.linear().range([opts.height - opts.margin_y, opts.margin_y]).domain(extent_y)
  var scale_r = d3.scale.linear().range([opts.min_r, opts.max_r]).domain(extent_r)
  var axis_x = d3.svg.axis().scale(scale_x)
  var axis_y = d3.svg.axis().scale(scale_y).orient("left")

  var svg = d3sparql.select(opts.selector, "scatterplot").append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)
  var circle = svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "node")
    .attr("cx", function(d) { return scale_x(d[opts.var_x].value) })
    .attr("cy", function(d) { return scale_y(d[opts.var_y].value) })
    .attr("r",  function(d) { return scale_r(d[opts.var_r] ? d[opts.var_r].value : opts.var_r) })
    .attr("opacity", 0.5)
    .append("title")
    .text(function(d) { return d[opts.label_r] ? d[opts.label_r].value : opts.label_r })
  var ax = svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (opts.height - opts.margin_y) + ")")
    .call(axis_x)
  var ay = svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + opts.margin_x + ",0)")
    .call(axis_y)
  ax.append("text")
    .attr("class", "label")
    .text(opts.label_x)
    .style("text-anchor", "middle")
    .attr("transform", "translate(" + ((opts.width - opts.margin_x) / 2) + "," + (opts.margin_y - 5) + ")")
  ay.append("text")
    .attr("class", "label")
    .text(opts.label_y)
    .style("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", 0 - (opts.height / 2))
    .attr("y", 0 - (opts.margin_x - 20))

  // default CSS/SVG
  ax.attr({
    "stroke": "black",
    "fill": "none",
  })
  ay.attr({
    "stroke": "black",
    "fill": "none",
  })
  // This doesn't work with .append("circle") with .append("title") for tooltip
  circle.attr({
    "stroke": "gray",
    "stroke-width": "1px",
    "fill": "lightblue",
    "opacity": 0.5,
  })
  //svg.selectAll(".label").attr({
  svg.selectAll("text").attr({
    "stroke": "none",
    "fill": "black",
    "font-size": "8pt",
    "font-family": "sans-serif",
  })
}

/*
  Rendering sparql-results+json object into a force graph

  References:
    http://bl.ocks.org/mbostock/4062045

  Options:
    config = {
      "radius":   12,        // static value or a function to calculate radius of nodes (optional)
      "charge":   -250,      // force between nodes (optional; negative: repulsion, positive: attraction)
      "distance": 30,        // target distance between linked nodes (optional)
      "width":    1000,      // canvas width (optional)
      "height":   500,       // canvas height (optional)
      "label":    "name",    // SPARQL variable name for node labels (optional)
      "selector": "#result"
      // options for d3sparql.graph() can be added here ...
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.forcegraph(json, config)
    }

  CSS/SVG:
    <style>
    .link {
      stroke: #999999;
    }
    .node {
      stroke: black;
      opacity: 0.5;
    }
    circle.node {
      stroke-width: 1px;
      fill: lightblue;
    }
    text.node {
      font-family: "sans-serif";
      font-size: 8px;
    }
    </style>

  TODO:
    Try other d3.layout.force options.
*/
d3sparql.forcegraph = function(json, config) {
  config = config || {}

  var graph = (json.head && json.results) ? d3sparql.graph(json, config) : json

  var scale = d3.scale.linear()
    .domain(d3.extent(graph.nodes, function(d) { return parseFloat(d.value) }))
    .range([1, 20])

  var opts = {
    "radius":    config.radius    || function(d) { return d.value ? scale(d.value) : 1 + d.label.length },
    "charge":    config.charge    || -500,
    "distance":  config.distance  || 50,
    "width":     config.width     || 1000,
    "height":    config.height    || 750,
    "label":     config.label     || false,
    "selector":  config.selector  || null
  }

  var svg = d3sparql.select(opts.selector, "forcegraph").append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)
  var link = svg.selectAll(".link")
    .data(graph.links)
    .enter()
    .append("line")
    .attr("class", "link")
  var node = svg.selectAll(".node")
    .data(graph.nodes)
    .enter()
    .append("g")
  var circle = node.append("circle")
    .attr("class", "node")
    .attr("r", opts.radius)
  var text = node.append("text")
    .text(function(d) { return d[opts.label || "label"] })
    .attr("class", "node")
  var force = d3.layout.force()
    .charge(opts.charge)
    .linkDistance(opts.distance)
    .size([opts.width, opts.height])
    .nodes(graph.nodes)
    .links(graph.links)
    .start()
  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x })
        .attr("y1", function(d) { return d.source.y })
        .attr("x2", function(d) { return d.target.x })
        .attr("y2", function(d) { return d.target.y })
    text.attr("x", function(d) { return d.x })
        .attr("y", function(d) { return d.y })
    circle.attr("cx", function(d) { return d.x })
          .attr("cy", function(d) { return d.y })
  })
  node.call(force.drag)

  // default CSS/SVG
  link.attr({
    "stroke": "#999999",
  })
  circle.attr({
    "stroke": "black",
    "stroke-width": "1px",
    "fill": "lightblue",
    "opacity": 1,
  })
  text.attr({
    "font-size": "8px",
    "font-family": "sans-serif",
  })
}

/*
  Rendering sparql-results+json object into a sanky graph

  References:
    https://github.com/d3/d3-plugins/tree/master/sankey
    http://bost.ocks.org/mike/sankey/

  Options:
    config = {
      "width":    1000,      // canvas width (optional)
      "height":   900,       // canvas height (optional)
      "margin":   50,        // canvas margin (optional)
      "selector": "#result"
      // options for d3sparql.graph() can be added here ...
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.sankey(json, config)
    }

  CSS/SVG:
    <style>
    .node rect {
      cursor: move;
      fill-opacity: .9;
      shape-rendering: crispEdges;
    }
    .node text {
      pointer-events: none;
      text-shadow: 0 1px 0 #ffffff;
    }
    .link {
      fill: none;
      stroke: #000000;
      stroke-opacity: .2;
    }
    .link:hover {
      stroke-opacity: .5;
    }
    </style>

  Dependencies:
    * sankey.js
      * Download from https://github.com/d3/d3-plugins/tree/master/sankey
      * Put <script src="sankey.js"></script> in the HTML <head> section
*/
d3sparql.sankey = function(json, config) {
  config = config || {}

  var graph = (json.head && json.results) ? d3sparql.graph(json, config) : json

  var opts = {
    "width":    config.width    || 750,
    "height":   config.height   || 1200,
    "margin":   config.margin   || 10,
    "selector": config.selector || null
  }

  var nodes = graph.nodes
  var links = graph.links
  for (var i = 0; i < links.length; i++) {
    links[i].value = 2  // TODO: fix to use values on links
  }
  var sankey = d3.sankey()
    .size([opts.width, opts.height])
    .nodeWidth(15)
    .nodePadding(10)
    .nodes(nodes)
    .links(links)
    .layout(32)
  var path = sankey.link()
  var color = d3.scale.category20()
  var svg = d3sparql.select(opts.selector, "sankey").append("svg")
    .attr("width", opts.width + opts.margin * 2)
    .attr("height", opts.height + opts.margin * 2)
    .append("g")
    .attr("transform", "translate(" + opts.margin + "," + opts.margin + ")")
  var link = svg.selectAll(".link")
    .data(links)
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("d", path)
    .attr("stroke-width", function(d) { return Math.max(1, d.dy) })
    .sort(function(a, b) { return b.dy - a.dy })
  var node = svg.selectAll(".node")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")" })
    .call(d3.behavior.drag()
       .origin(function(d) { return d })
       .on("dragstart", function() { this.parentNode.appendChild(this) })
       .on("drag", dragmove)
     )
  node.append("rect")
    .attr("width", function(d) { return d.dx })
    .attr("height", function(d) { return d.dy })
    .attr("fill", function(d) { return color(d.label) })
    .attr("opacity", 0.5)
  node.append("text")
    .attr("x", -6)
    .attr("y", function(d) { return d.dy/2 })
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function(d) { return d.label })
    .filter(function(d) { return d.x < opts.width / 2 })
    .attr("x", 6 + sankey.nodeWidth())
    .attr("text-anchor", "start")

  // default CSS/SVG
  link.attr({
    "fill": "none",
    "stroke": "grey",
    "opacity": 0.5,
  })

  function dragmove(d) {
    d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(opts.height - d.dy, d3.event.y))) + ")")
    sankey.relayout()
    link.attr("d", path)
  }
}


/*
  Rendering sparql-results+json object into a round tree

  References:
    http://bl.ocks.org/4063550  Reingold-Tilford Tree

  Options:
    config = {
      "diameter": 800,       // canvas diameter (optional)
      "angle":    360,       // arc angle (optional; less than 360 for wedge)
      "depth":    200,       // arc depth (optional; less than diameter/2 - label length to fit)
      "radius":   5,         // node radius (optional)
      "selector": "#result"
      // options for d3sparql.tree() can be added here ...
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.roundtree(json, config)
    }

  CSS/SVG:
    <style>
    .link {
      fill: none;
      stroke: #cccccc;
      stroke-width: 1.5px;
    }
    .node circle {
      fill: #ffffff;
      stroke: darkgreen;
      stroke-width: 1.5px;
      opacity: 1;
    }
    .node text {
      font-size: 10px;
      font-family: sans-serif;
    }
    </style>
*/
d3sparql.roundtree = function(json, config) {
  config = config || {}

  var tree = (json.head && json.results) ? d3sparql.tree(json, config) : json

  var opts = {
    "diameter":  config.diameter || 800,
    "angle":     config.angle    || 360,
    "depth":     config.depth    || 200,
    "radius":    config.radius   || 5,
    "selector":  config.selector || null
  }

  var tree_layout = d3.layout.tree()
    .size([opts.angle, opts.depth])
    .separation(function(a, b) { return (a.parent === b.parent ? 1 : 2) / a.depth })
  var nodes = tree_layout.nodes(tree)
  var links = tree_layout.links(nodes)
  var diagonal = d3.svg.diagonal.radial()
    .projection(function(d) { return [d.y, d.x / 180 * Math.PI] })
  var svg = d3sparql.select(opts.selector, "roundtree").append("svg")
    .attr("width", opts.diameter)
    .attr("height", opts.diameter)
    .append("g")
    .attr("transform", "translate(" + opts.diameter / 2 + "," + opts.diameter / 2 + ")")
  var link = svg.selectAll(".link")
    .data(links)
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("d", diagonal)
  var node = svg.selectAll(".node")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ") translate(" + d.y + ")" })
  var circle = node.append("circle")
    .attr("r", opts.radius)
  var text = node.append("text")
    .attr("dy", ".35em")
    .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end" })
    .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180) translate(-8)" })
    .text(function(d) { return d.name })

  // default CSS/SVG
  link.attr({
    "fill": "none",
    "stroke": "#cccccc",
    "stroke-width": "1.5px",
  })
  circle.attr({
    "fill": "#ffffff",
    "stroke": "steelblue",
    "stroke-width": "1.5px",
    "opacity": 1,
  })
  text.attr({
    "font-size": "10px",
    "font-family": "sans-serif",
  })
}

/*
  Rendering sparql-results+json object into a dendrogram

  References:
    http://bl.ocks.org/4063570  Cluster Dendrogram

  Options:
    config = {
      "width":    900,       // canvas width (optional)
      "height":   4500,      // canvas height (optional)
      "margin":   300,       // width margin for labels (optional)
      "radius":   5,         // radius of node circles (optional)
      "selector": "#result"
      // options for d3sparql.tree() can be added here ...
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.dendrogram(json, config)
    }

  CSS/SVG:
    <style>
    .link {
      fill: none;
      stroke: #cccccc;
      stroke-width: 1.5px;
    }
    .node circle {
      fill: #ffffff;
      stroke: steelblue;
      stroke-width: 1.5px;
      opacity: 1;
    }
    .node text {
      font-size: 10px;
      font-family: sans-serif;
    }
    </style>
*/
d3sparql.dendrogram = function(json, config) {
  config = config || {}

  var tree = (json.head && json.results) ? d3sparql.tree(json, config) : json

  var opts = {
    "width":    config.width    || 800,
    "height":   config.height   || 2000,
    "margin":   config.margin   || 350,
    "radius":   config.radius   || 5,
    "selector": config.selector || null
  }

  var cluster = d3.layout.cluster()
    .size([opts.height, opts.width - opts.margin])
  var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x] })
  var svg = d3sparql.select(opts.selector, "dendrogram").append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)
    .append("g")
    .attr("transform", "translate(40,0)")
  var nodes = cluster.nodes(tree)
  var links = cluster.links(nodes)
  var link = svg.selectAll(".link")
    .data(links)
    .enter().append("path")
    .attr("class", "link")
    .attr("d", diagonal)
  var node = svg.selectAll(".node")
    .data(nodes)
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")" })
  var circle = node.append("circle")
    .attr("r", opts.radius)
  var text = node.append("text")
    .attr("dx", function(d) { return (d.parent && d.children) ? -8 : 8 })
    .attr("dy", 5)
    .style("text-anchor", function(d) { return (d.parent && d.children) ? "end" : "start" })
    .text(function(d) { return d.name })

  // default CSS/SVG
  link.attr({
    "fill": "none",
    "stroke": "#cccccc",
    "stroke-width": "1.5px",
  })
  circle.attr({
    "fill": "#ffffff",
    "stroke": "steelblue",
    "stroke-width": "1.5px",
    "opacity": 1,
  })
  text.attr({
    "font-size": "10px",
    "font-family": "sans-serif",
  })
}

/*
  Rendering sparql-results+json object into a sunburst

  References:
    http://bl.ocks.org/4348373  Zoomable Sunburst
    http://www.jasondavies.com/coffee-wheel/  Coffee Flavour Wheel

  Options:
    config = {
      "width":    1000,      // canvas width (optional)
      "height":   900,       // canvas height (optional)
      "margin":   150,       // margin for labels (optional)
      "selector": "#result"
      // options for d3sparql.tree() can be added here ...
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.sunburst(json, config)
    }

  CSS/SVG:
    <style>
    .node text {
      font-size: 10px;
      font-family: sans-serif;
    }
    .arc {
      stroke: #ffffff;
      fill-rule: evenodd;
    }
    </style>
*/
d3sparql.sunburst = function(json, config) {
  config = config || {}

  var tree = (json.head && json.results) ? d3sparql.tree(json, config) : json

  var opts = {
    "width":    config.width    || 1000,
    "height":   config.height   || 900,
    "margin":   config.margin   || 150,
    "selector": config.selector || null
  }

  var radius = Math.min(opts.width, opts.height) / 2 - opts.margin
  var x = d3.scale.linear().range([0, 2 * Math.PI])
  var y = d3.scale.sqrt().range([0, radius])
  var color = d3.scale.category20()
  var svg = d3sparql.select(opts.selector, "sunburst").append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)
    .append("g")
    .attr("transform", "translate(" + opts.width/2 + "," + opts.height/2 + ")");
  var arc = d3.svg.arc()
    .startAngle(function(d)  { return Math.max(0, Math.min(2 * Math.PI, x(d.x))) })
    .endAngle(function(d)    { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))) })
    .innerRadius(function(d) { return Math.max(0, y(d.y)) })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)) })
  var partition = d3.layout.partition()
    .value(function(d) {return d.value})
  var nodes = partition.nodes(tree)
  var path = svg.selectAll("path")
    .data(nodes)
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("class", "arc")
    .style("fill", function(d) { return color((d.children ? d : d.parent).name) })
    .on("click", click)
  var text = svg.selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .attr("transform", function(d) {
      var rotate = x(d.x + d.dx/2) * 180 / Math.PI - 90
      return "rotate(" + rotate + ") translate(" + y(d.y) + ")"
    })
    .attr("dx", ".5em")
    .attr("dy", ".35em")
    .text(function(d) { return d.name })
    .on("click", click)

  // default CSS/SVG
  path.attr({
    "stroke": "#ffffff",
    "fill-rule": "evenodd",
  })
  text.attr({
    "font-size": "10px",
    "font-family": "sans-serif",
  })

  function click(d) {
    path.transition()
      .duration(750)
      .attrTween("d", arcTween(d))
    text.style("visibility", function (e) {
        // required for showing labels just before the transition when zooming back to the upper level
        return isParentOf(d, e) ? null : d3.select(this).style("visibility")
      })
      .transition()
      .duration(750)
      .attrTween("transform", function(d) {
        return function() {
          var rotate = x(d.x + d.dx / 2) * 180 / Math.PI - 90
          return "rotate(" + rotate + ") translate(" + y(d.y) + ")"
        }
      })
      .each("end", function(e) {
        // required for hiding labels just after the transition when zooming down to the lower level
        d3.select(this).style("visibility", isParentOf(d, e) ? null : "hidden")
      })
  }
  function maxDepth(d) {
    return d.children ? Math.max.apply(Math, d.children.map(maxDepth)) : d.y + d.dy
  }
  function arcTween(d) {
    var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
        yd = d3.interpolate(y.domain(), [d.y, maxDepth(d)]),
        yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius])
    return function(d) {
      return function(t) {
        x.domain(xd(t))
        y.domain(yd(t)).range(yr(t))
        return arc(d)
      }
    }
  }
  function isParentOf(p, c) {
    if (p === c) return true
    if (p.children) {
      return p.children.some(function(d) {
        return isParentOf(d, c)
      })
    }
    return false
  }
}

/*
  Rendering sparql-results+json object into a circle pack

  References:
    http://mbostock.github.com/d3/talk/20111116/pack-hierarchy.html  Circle Packing

  Options:
    config = {
      "width":    800,       // canvas width (optional)
      "height":   800,       // canvas height (optional)
      "diameter": 700,       // diamieter of the outer circle (optional)
      "selector": "#result"
      // options for d3sparql.tree() can be added here ...
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.circlepack(json, config)
    }

  CSS/SVG:
    <style>
    text {
      font-size: 11px;
      pointer-events: none;
    }
    text.parent {
      fill: #1f77b4;
    }
    circle {
      fill: #cccccc;
      stroke: #999999;
      pointer-events: all;
    }
    circle.parent {
      fill: #1f77b4;
      fill-opacity: .1;
      stroke: steelblue;
    }
    circle.parent:hover {
      stroke: #ff7f0e;
      stroke-width: .5px;
    }
    circle.child {
      pointer-events: none;
    }
    </style>

  TODO:
    Fix rotation angle for each text to avoid string collision
*/
d3sparql.circlepack = function(json, config) {
  config = config || {}

  var tree = (json.head && json.results) ? d3sparql.tree(json, config) : json

  var opts = {
    "width":     config.width    || 800,
    "height":    config.height   || 800,
    "diameter":  config.diameter || 700,
    "selector":  config.selector || null
  }

  var w = opts.width,
      h = opts.height,
      r = opts.diameter,
      x = d3.scale.linear().range([0, r]),
      y = d3.scale.linear().range([0, r])

  var pack = d3.layout.pack()
    .size([r, r])
    .value(function(d) { return d.value })

  var node  = tree
  var nodes = pack.nodes(tree)

  var vis = d3sparql.select(opts.selector, "circlepack").append("svg")
    .attr("width", w)
    .attr("height", h)
    .append("g")
    .attr("transform", "translate(" + (w - r) / 2 + "," + (h - r) / 2 + ")")

  vis.selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("class", function(d) { return d.children ? "parent" : "child" })
    .attr("cx", function(d) { return d.x })
    .attr("cy", function(d) { return d.y })
    .attr("r", function(d) { return d.r })
/*
    // CSS: circle { ... }
    .attr("fill", function(d) { return d.children ? "#1f77b4" : "#cccccc" })
    .attr("fill-opacity", function(d) { return d.children ? ".1" : "1" })
    .attr("stroke", function(d) { return d.children ? "steelblue" : "#999999" })
    .attr("pointer-events", function(d) { return d.children ? "all" : "none" })
    .on("mouseover", function() { d3.select(this).attr("stroke", "#ff7f0e").attr("stroke-width", ".5px") })
    .on("mouseout", function() { d3.select(this).attr("stroke", "steelblue").attr("stroke-width", ".5px") })
*/
    .on("click", function(d) { return zoom(node === d ? tree : d) })

  vis.selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .attr("class", function(d) { return d.children ? "parent" : "child" })
    .attr("x", function(d) { return d.x })
    .attr("y", function(d) { return d.y })
//    .attr("dy", ".35em")
    .style("opacity", function(d) { return d.r > 20 ? 1 : 0 })
    .text(function(d) { return d.name })
    // rotate to avoid string collision
    //.attr("text-anchor", "middle")
    .attr("text-anchor", "start")
    .transition()
    .duration(1000)
    .attr("transform", function(d) { return "rotate(-30, " + d.x + ", " + d.y + ")" })

  d3.select(window).on("click", function() { zoom(tree) })

  function zoom(d, i) {
    var k = r / d.r / 2
    x.domain([d.x - d.r, d.x + d.r])
    y.domain([d.y - d.r, d.y + d.r])
    var t = vis.transition()
      .duration(d3.event.altKey ? 2000 : 500)
    t.selectAll("circle")
      .attr("cx", function(d) { return x(d.x) })
      .attr("cy", function(d) { return y(d.y) })
      .attr("r", function(d) { return k * d.r })
    t.selectAll("text")
        .attr("x", function(d) { return x(d.x) })
        .attr("y", function(d) { return y(d.y) })
        .style("opacity", function(d) { return k * d.r > 20 ? 1 : 0 })
    d3.event.stopPropagation()
  }
}

/*
  Rendering sparql-results+json object into a treemap

  References:
    http://bl.ocks.org/4063582  Treemap

  Options:
    config = {
      "width":    800,       // canvas width (optional)
      "height":   500,       // canvas height (optional)
      "margin":   {"top": 10, "right": 10, "bottom": 10, "left": 10},
      "selector": "#result"
      // options for d3sparql.tree() can be added here ...
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.treemap(json, config)
    }

  CSS/SVG:
    <style>
    .node {
      border: solid 1px white;
      font: 10px sans-serif;
      line-height: 12px;
      overflow: hidden;
      position: absolute;
      text-indent: 2px;
    }
    </style>
*/
d3sparql.treemap = function(json, config) {
  config = config || {}

  var tree = (json.head && json.results) ? d3sparql.tree(json, config) : json

  var opts = {
    "width":    config.width    || 800,
    "height":   config.height   || 500,
    "count":    config.count    || false,
    "color":    config.color    || d3.scale.category20c(),
    "margin":   config.margin   || {top: 0, right: 0, bottom: 0, left: 0},
    "selector": config.selector || null
  }

  var width  = opts.width - opts.margin.left - opts.margin.right
  var height = opts.height - opts.margin.top - opts.margin.bottom
  var color = opts.color

  function count(d) { return 1 }
  function size(d) { return d.value }

  var treemap = d3.layout.treemap()
    .size([width, height])
    .sticky(true)
    .value(opts.count ? count : size)

  var div = d3sparql.select(opts.selector, "treemap")
    .style("position", "relative")
    .style("width", opts.width + "px")
    .style("height", opts.height + "px")
    .style("left", opts.margin.left + "px")
    .style("top", opts.margin.top + "px")

  var node = div.datum(tree).selectAll(".node")
    .data(treemap.nodes)
    .enter()
    .append("div")
    .attr("class", "node")
    .call(position)
    .style("background", function(d) { return d.children ? color(d.name) : null })
    .text(function(d) { return d.children ? null : d.name })

  // default CSS/SVG
  node.style({
    "border-style": "solid",
    "border-width": "1px",
    "border-color": "white",
    "font-size": "10px",
    "font-family": "sans-serif",
    "line-height": "12px",
    "overflow": "hidden",
    "position": "absolute",
    "text-indent": "2px",
  })

  function position() {
    this.style("left",   function(d) { return d.x + "px" })
        .style("top",    function(d) { return d.y + "px" })
        .style("width",  function(d) { return Math.max(0, d.dx - 1) + "px" })
        .style("height", function(d) { return Math.max(0, d.dy - 1) + "px" })
  }
}

/*
  Rendering sparql-results+json object into a zoomable treemap

  References:
    http://bost.ocks.org/mike/treemap/  Zoomable Treemaps
    http://bl.ocks.org/zanarmstrong/76d263bd36f312cb0f9f

  Options:
    config = {
      "width":    800,       // canvas width (optional)
      "height":   500,       // canvas height (optional)
      "margin":   {"top": 10, "right": 10, "bottom": 10, "left": 10},
      "selector": "#result"
      // options for d3sparql.tree() can be added here ...
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.treemapzoom(json, config)
    }

  CSS/SVG:
    <style>
    rect {
      cursor: pointer;
    }
    .grandparent:hover rect {
      opacity: 0.8;
    }
    .children:hover rect.child {
      opacity: 0.2;
    }
    </style>
*/
d3sparql.treemapzoom = function(json, config) {
  config = config || {}

  var tree = (json.head && json.results) ? d3sparql.tree(json, config) : json

  var opts = {
    "width":    config.width    || 800,
    "height":   config.height   || 500,
    "margin":   config.margin   || {top: 25, right: 0, bottom: 0, left: 0},
    "color":    config.color    || d3.scale.category20(),
    "format":   config.format   || d3.format(",d"),
    "selector": config.selector || null
  }

  var width  = opts.width - opts.margin.left - opts.margin.right
  var height = opts.height - opts.margin.top - opts.margin.bottom
  var color = opts.color
  var format = opts.format
  var transitioning

  var x = d3.scale.linear().domain([0, width]).range([0, width])
  var y = d3.scale.linear().domain([0, height]).range([0, height])

  var treemap = d3.layout.treemap()
    .children(function(d, depth) { return depth ? null : d.children })
    .sort(function(a, b) { return a.value - b.value })
    .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
    .round(false)

  var svg = d3sparql.select(opts.selector, "treemapzoom").append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)
    .style("margin-left", -opts.margin.left + "px")
    .style("margin.right", -opts.margin.right + "px")
    .append("g")
    .attr("transform", "translate(" + opts.margin.left + "," + opts.margin.top + ")")
    .style("shape-rendering", "crispEdges")

  var grandparent = svg.append("g")
    .attr("class", "grandparent")

  grandparent.append("rect")
    .attr("y", -opts.margin.top)
    .attr("width", width)
    .attr("height", opts.margin.top)
    .attr("fill", "#666666")

  grandparent.append("text")
    .attr("x", 6)
    .attr("y", 6 - opts.margin.top)
    .attr("dy", ".75em")
    .attr("stroke", "#ffffff")
    .attr("fill", "#ffffff")

  initialize(tree)
  layout(tree)
  display(tree)

  function initialize(tree) {
    tree.x = tree.y = 0
    tree.dx = width
    tree.dy = height
    tree.depth = 0
  }

  // Compute the treemap layout recursively such that each group of siblings
  // uses the same size (1×1) rather than the dimensions of the parent cell.
  // This optimizes the layout for the current zoom state. Note that a wrapper
  // object is created for the parent node for each group of siblings so that
  // the parent’s dimensions are not discarded as we recurse. Since each group
  // of sibling was laid out in 1×1, we must rescale to fit using absolute
  // coordinates. This lets us use a viewport to zoom.
  function layout(d) {
    if (d.children) {
      treemap.nodes({children: d.children})
      d.children.forEach(function(c) {
        c.x = d.x + c.x * d.dx
        c.y = d.y + c.y * d.dy
        c.dx *= d.dx
        c.dy *= d.dy
        c.parent = d
        layout(c)
      })
    }
  }

  function display(d) {
    grandparent
      .datum(d.parent)
      .on("click", transition)
      .select("text")
      .text(name(d))

    var g1 = svg.insert("g", ".grandparent")
      .datum(d)
      .attr("class", "depth")

    var g = g1.selectAll("g")
      .data(d.children)
      .enter()
      .append("g")

    g.filter(function(d) { return d.children })
      .classed("children", true)
      .on("click", transition)

    g.selectAll(".child")
      .data(function(d) { return d.children || [d] })
      .enter()
      .append("rect")
      .attr("class", "child")
      .call(rect)

    g.append("rect")
      .attr("class", "parent")
      .call(rect)
      .append("title")
      .text(function(d) { return format(d.value) })

    g.append("text")
      .attr("dy", ".75em")
      .text(function(d) { return d.name })
      .call(text)

    function transition(d) {
      if (transitioning || !d) return
      transitioning = true
      var g2 = display(d),
          t1 = g1.transition().duration(750),
          t2 = g2.transition().duration(750)

      // Update the domain only after entering new elements.
      x.domain([d.x, d.x + d.dx])
      y.domain([d.y, d.y + d.dy])

      // Enable anti-aliasing during the transition.
      svg.style("shape-rendering", null)

      // Draw child nodes on top of parent nodes.
      svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth })

      // Fade-in entering text.
      g2.selectAll("text").style("fill-opacity", 0)

      // Transition to the new view.
      t1.selectAll("text").call(text).style("fill-opacity", 0)
      t2.selectAll("text").call(text).style("fill-opacity", 1)
      t1.selectAll("rect").call(rect)
      t2.selectAll("rect").call(rect)

      // Remove the old node when the transition is finished.
      t1.remove().each("end", function() {
        svg.style("shape-rendering", "crispEdges")
        transitioning = false
      })
    }
    return g
  }

  function text(text) {
    text.attr("x", function(d) { return x(d.x) + 6 })
        .attr("y", function(d) { return y(d.y) + 6 })
  }

  function rect(rect) {
    rect.attr("x", function(d) { return x(d.x) })
        .attr("y", function(d) { return y(d.y) })
        .attr("width", function(d) { return x(d.x + d.dx) - x(d.x) })
        .attr("height", function(d) { return y(d.y + d.dy) - y(d.y) })
        .attr("fill", function(d) { return color(d.name) })
    rect.attr({
      "stroke": "#ffffff",
      "stroke-width": "1px",
      "opacity": 0.8,
    })
  }

  function name(d) {
    return d.parent
        ? name(d.parent) + " / " + d.name
        : d.name
  }
}

/*
  World Map spotted by coordinations (longitude and latitude)

  Options:
    config = {
      "var_lat":  "lat",     // SPARQL variable name for latitude (optional; default is the 1st variable)
      "var_lng":  "lng",     // SPARQL variable name for longitude (optional; default is the 2nd variable)
      "width":    960,       // canvas width (optional)
      "height":   480,       // canvas height (optional)
      "radius":   5,         // circle radius (optional)
      "color":    "#FF3333,  // circle color (optional)
      "topojson": "path/to/world-50m.json",  // TopoJSON file
      "selector": "#result"
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      d3sparql.coordmap(json, config = {})
    }

  Dependencies:
    * topojson.js
      * Download from http://d3js.org/topojson.v1.min.js
      * Put <script src="topojson.js"></script> in the HTML <head> section
    * world-50m.json
      * Download from https://github.com/mbostock/topojson/blob/master/examples/world-50m.json
*/
d3sparql.coordmap = function(json,config) {
  config = config || {}

  var head = json.head.vars
  var data = json.results.bindings

  var opts = {
    "var_lat":   config.var_lat  || head[0] || "lat",
    "var_lng":   config.var_lng  || head[1] || "lng",
    "width":     config.width    || 960,
    "height":    config.height   || 480,
    "radius":    config.radius   || 5,
    "color":     config.color    || "#FF3333",
    "topojson":  config.topojson || "world-50m.json",
    "selector":  config.selector || null
  }

  var projection = d3.geo.equirectangular()
    .scale(153)
    .translate([opts.width / 2, opts.height / 2])
    .precision(.1);
  var path = d3.geo.path()
    .projection(projection);
  var graticule = d3.geo.graticule();
  var svg = d3sparql.select(opts.selector, "coordmap").append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height);

  svg.append("path")
    .datum(graticule.outline)
    .attr("fill","#a4bac7")
    .attr("d",path);

  svg.append("path")
    .datum(graticule)
    .attr("fill","none")
    .attr("stroke","#333333")
    .attr("stroke-width",".5px")
    .attr("stroke-opacity",".5")
    .attr("d", path);

  d3.json(opts.topojson, function(error, world) {
    svg.insert("path", ".graticule")
      .datum(topojson.feature(world, world.objects.land))
      .attr("fill", "#d7c7ad")
      .attr("stroke", "#766951")
      .attr("d", path);

    svg.insert("path", ".graticule")
      .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b }))
      .attr("class", "boundary")
      .attr("fill", "none")
      .attr("stroke", "#a5967e")
      .attr("stroke-width", ".5px")
      .attr("d", path);

    svg.selectAll(".pin")
      .data(data)
      .enter().append("circle", ".pin")
      .attr("fill",opts.color)
      .attr("r", opts.radius)
      .attr("stroke","#455346")
      .attr("transform", function(d) {
        return "translate(" + projection([
          d[opts.var_lng].value,
          d[opts.var_lat].value
        ]) + ")"
      });
  });
}

/*
  World Map colored by location names defined in a TopoJSON file

  Options:
    config = {
      "label":       "name",    // SPARQL variable name for location names (optional; default is the 1st variable)
      "value":       "size",    // SPARQL variable name for numerical values (optional; default is the 2nd variable)
      "width":       1000,      // canvas width (optional)
      "height":      1000,      // canvas height (optional)
      "color_max":   "blue",    // color for maximum value (optional)
      "color_min":   "white",   // color for minimum value (optional)
      "color_scale": "linear"   // color scale (optional; "linear" or "log")
      "topojson":    "path/to/japan.topojson",  // TopoJSON file
      "mapname":     "japan",   // JSON key name of a map location root (e.g., "objects":{"japan":{"type":"GeometryCollection", ...)
      "keyname":     "name",    // JSON key name of map locations matched with "label" (e.g., "properties":{"name":"Tokyo", ...)
      "center_lat":  34,        // latitude for a map location center (optional; default is 34 for Japan)
      "center_lng":  137,       // longitude for a map location center (optional; default is 137 for Japan)
      "scale":       10000,     // scale of rendering (optional)
      "selector":    "#result"
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      d3sparql.namedmap(json, config = {})
    }

  Dependencies:
    * topojson.js
      * Download from http://d3js.org/topojson.v1.min.js
      * Put <script src="topojson.js"></script> in the HTML <head> section
    * japan.topojson
      * Download from https://github.com/sparql-book/sparql-book/blob/master/chapter5/D3/japan.topojson
*/
d3sparql.namedmap = function(json, config) {
  config = config || {}

  var head = json.head.vars
  var data = json.results.bindings

  var opts = {
    "label":        config.label       || head[0] || "label",
    "value":        config.value       || head[1] || "value",
    "width":        config.width       || 1000,
    "height":       config.height      || 1000,
    "color_max":    config.color_max   || "red",
    "color_min":    config.color_min   || "white",
    "color_scale":  config.color_scale || "log",
    "topojson":     config.topojson    || "japan.topojson",
    "mapname":      config.mapname     || "japan",
    "keyname":      config.keyname     || "name_local",
    "center_lat":   config.center_lat  || 34,
    "center_lng":   config.center_lng  || 137,
    "scale":        config.scale       || 10000,
    "selector":     config.selector    || null
  }

  var size = d3.nest()
        .key(function(d) { return d[opts.label].value })
        .rollup(function(d) {
          return d3.sum(d, function(d) {
            return parseInt(d[opts.value].value)
          })
        }).map(data, d3.map)
  var extent = d3.extent((d3.map(size).values()))

  if (d3sparql.debug) { console.log(JSON.stringify(size)) }

  var svg = d3sparql.select(opts.selector, "namedmap").append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)

  d3.json(opts.topojson, function(topojson_map) {
    var geo = topojson.object(topojson_map, topojson_map.objects[opts.mapname]).geometries
    var projection = d3.geo.mercator()
      .center([opts.center_lng, opts.center_lat])
      .translate([opts.width/2, opts.height/2])
      .scale(opts.scale)
    var path = d3.geo.path().projection(projection)
    switch (opts.color_scale) {
      case "log":
        var scale = d3.scale.log()
        break
      default:
        var scale = d3.scale.linear()
        break
    }
    var color = scale.domain(extent).range([opts.color_min, opts.color_max])

    svg.selectAll("path")
      .data(geo)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("stroke", "black")
      .attr("stroke-width", 0.5)
      .style("fill", function(d, i) {
        // map SPARQL results to colors
        return color(size[d.properties[opts.keyname]])
      })

    svg.selectAll(".place-label")
      .data(geo)
      .enter()
      .append("text")
      .attr("font-size", "8px")
      .attr("class", "place-label")
      .attr("transform", function(d) {
        var lat = d.properties.latitude
        var lng = d.properties.longitude
        return "translate(" + projection([lng, lat]) + ")"
      })
      .attr("dx", "-1.5em")
      .text(function(d) { return d.properties[opts.keyname] })
  })
}

d3sparql.select = function(selector, type) {
  if (selector) {
    return d3.select(selector).html("").append("div").attr("class", "d3sparql " + type)
  } else {
    return d3.select("body").append("div").attr("class", "d3sparql " + type)
  }
}

/* Helper function only for the d3sparql web site */
d3sparql.toggle = function() {
  var button = d3.select("#button")
  var elem = d3.select("#sparql")
  if (elem.style("display") === "none") {
    elem.style("display", "inline")
    button.attr("class", "icon-chevron-up")
  } else {
    elem.style("display", "none")
    button.attr("class", "icon-chevron-down")
  }
}

/* for IFRAME embed */
d3sparql.frameheight = function(height) {
  d3.select(self.frameElement).style("height", height + "px")
}

/* for Node.js */
//module.exports = d3sparql
