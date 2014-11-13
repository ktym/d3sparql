//
// d3sparql.js - utilities for visualizing SPARQL results with the D3 library
//
//   Web site: http://github.com/ktym/d3sparql/
//   Copyright: 2013, 2014 (C) Toshiaki Katayama (ktym@dbcls.jp)
//   Initial version: 2013-01-28
//

var d3sparql = {
  version: "d3sparql.js version 2014-07-22"
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
*/
d3sparql.query = function(endpoint, sparql, callback) {
  var url = endpoint + "?query=" + encodeURIComponent(sparql)
  console.log(endpoint)
  console.log(url)
  var mime = "application/sparql-results+json"
  d3.xhr(url, mime, function(request) {
    var json = request.responseText
    console.log(json)
    callback(JSON.parse(json))
  })
/*
  d3.json(url, function(error, json) {
    console.log(error)
    console.log(json)
    callback(json)
  })
*/
}

/*
  Convert sparql-results+json object into a JSON graph in the {"nodes": [], "links": []} form.
  Suitable for d3.layout.force(), d3.layout.sankey() etc.

  Options:
    config = {
      "key1": "SPARQL variable name for node1",
      "key2": "SPARQL variable name for node2",
      "label1": "SPARQL variable name for the label of node1",  // optional
      "label2": "SPARQL variable name for the label of node2",  // optional
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.forcegraph(json, config)
      d3sparql.sankey(json, config)
    }

  TODO:
    Should nodes hold value (in what key name)?
*/
d3sparql.graph = function(json, config) {
  var data = json.results.bindings
  var graph = {
    "nodes": [],
    "links": []
  }
  var check = d3.map()
  var index = 0
  for (var i = 0; i < data.length; i++) {
    var key1 = data[i][config.key1].value
    var key2 = data[i][config.key2].value
    var label1 = config.label1 ? data[i][config.label1].value : key1
    var label2 = config.label2 ? data[i][config.label2].value : key2
    if (!check.has(key1)) {
      graph.nodes.push({"key": key1, "label": label1})
      check.set(key1, index)
      index++
    }
    if (!check.has(key2)) {
      graph.nodes.push({"key": key2, "label": label2})
      check.set(key2, index)
      index++
    }
    graph.links.push({"source": check.get(key1), "target": check.get(key2)})
  }
  return graph
}

/*
  Convert sparql-results+json object into a JSON graph in the {"name": name, "size": size, "children": []} form.
  Suitable for d3.layout.hierarchy() family cluster (dendrogram), pack (circlepack), partition (sunburst), tree (roundtree), treemap (treemap)

  Options:
    config = {
      "root": "value for root node",
      "parent": "SPARQL variable name for parent node",
      "child": "SPARQL variable name for child node",
    }

  Synopsis:
    d3sparql.sparql(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.roundtree(json, config)
      d3sparql.dendrogram(json, config)
      d3sparql.sunburst(json, config)
      d3sparql.treemap(json, config)
    }
*/
d3sparql.tree = function(json, config) {
  var data = json.results.bindings
  var tree = d3.map()
  var parent = child = children = true
  var root = data[0][config.root].value
  for (var i = 0; i < data.length; i++) {
    parent = data[i][config.parent].value
    child = data[i][config.child].value
    if (parent != child) {
      if (tree.has(parent)) {
        children = tree.get(parent)
        children.push(child)
        tree.set(parent, children)
      } else {
        children = [child]
        tree.set(parent, children)
      }
    }
  }
  function traverse(node) {
    var list = tree.get(node)
    if (list) {
      var children = list.map(function(d) {return traverse(d)})
      var subtotal = d3.sum(children, function(d) {return d.size})
      return {"name": node, "children": children, "size": subtotal}
    } else {
      return {"name": node, "size": 1}
    }
  }
  return traverse(root)
}

/*
  Rendering sparql-results+json object containing multiple rows into a HTML table

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      d3sparql.htmltable(json)
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
d3sparql.htmltable = function(json) {
  var head = json.head.vars
  var data = json.results.bindings
  var table = d3.select("body").append("table").attr("class", "table table-bordered")
  var thead = table.append("thead")
  var tbody = table.append("tbody")
  thead.append("tr")
    .selectAll("th")
    .data(head)
    .enter()
    .append("th")
    .text(function(col) {return col})
  var rows = tbody.selectAll("tr")
    .data(data)
    .enter()
    .append("tr")
  var cells = rows.selectAll("td")
    .data(function(row) {
      return head.map(function(col) {
        return row[col].value
      })
    })
    .enter()
    .append("td")
    .text(function(val) {return val})

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

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      d3sparql.htmlhash(json)
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
d3sparql.htmlhash = function(json) {
  var head = json.head.vars
  var data = json.results.bindings[0]
  var table = d3.select("body").append("table").attr("class", "table table-bordered")
  var tbody = table.append("tbody")
  var row = tbody.selectAll("tr")
    .data(function() {
       return head.map(function(col) {
         return {"head": col, "data": data[col].value}
       })
     })
    .enter()
    .append("tr")
  row.append("th")
    .text(function(d) {return d.head})
  row.append("td")
    .text(function(d) {return d.data})

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
      "label_x": "Prefecture",
      "label_y": "Area",
      "var_x": "pref",
      "var_y": "area",
      "width":  850,  // canvas width
      "height": 300,  // canvas height
      "margin":  40,  // canvas margin
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
      stroke: #000;
      shape-rendering: crispEdges;
    }
    .x.axis path {
      display: none;
    }
    </style>
*/
d3sparql.barchart = function(json, config) {
  var opts = {
    "label_x":  config.label_x  || "label_x",
    "label_y":  config.label_y  || "label_y",
    "var_x":    config.key_x    || "var_x",  // TODO: var name, default value
    "var_y":    config.key_y    || "var_y",
    "width":    config.width    || 750,
    "height":   config.height   || 300,
    "margin":   config.margin   || {top: 10, right: 10, bottom: 80, left: 80} // TODO: to make use of this
  }
  var head = json.head.vars
  var data = json.results.bindings

  var scale_x = d3.scale.ordinal().rangeRoundBands([0, config.width - config.margin], 0.1)
  var scale_y = d3.scale.linear().range([config.height - config.margin, 0])
  var axis_x = d3.svg.axis().scale(scale_x).orient("bottom")
  var axis_y = d3.svg.axis().scale(scale_y).orient("left")  // .ticks(10, "%")
  scale_x.domain(data.map(function(d) {return d[config.var_x].value}))
  scale_y.domain(d3.extent(data, function(d) {return parseInt(d[config.var_y].value)}))

  var svg = d3.select("body")
    .append("svg")
    .attr("width", config.width)
    .attr("height", config.height)
//    .append("g")
//    .attr("transform", "translate(" + config.margin + "," + 0 + ")")

  var ax = svg.append("g")
    .attr("class", "axis x")
    .attr("transform", "translate(" + config.margin + "," + (config.height - config.margin) + ")")
    .call(axis_x)
  var ay = svg.append("g")
    .attr("class", "axis y")
    .attr("transform", "translate(" + config.margin + ",0)")
    .call(axis_y)
  var bar = svg.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("transform", "translate(" + config.margin + "," + 0 + ")")
    .attr("class", "bar")
    .attr("x", function(d) {return scale_x(d[config.var_x].value)})
    .attr("width", scale_x.rangeBand())
    .attr("y", function(d) {return scale_y(d[config.var_y].value)})
    .attr("height", function(d) {return config.height - scale_y(parseInt(d[config.var_y].value)) - config.margin})
/*
    .call(function(e) {
      e.each(function(d) {
        console.log(parseInt(d[config.var_y].value))
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
    .text(config.label_x)
    .style("text-anchor", "middle")
    .attr("transform", "translate(" + ((config.width - config.margin) / 2) + "," + (config.margin - 5) + ")")
  ay.append("text")
    .attr("class", "label")
    .text(config.label_y)
    .style("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", 0 - (config.height / 2))
    .attr("y", 0 - (config.margin - 20))

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
      "label": "pref",
      "size": "area",
      "width":  700,
      "height": 600,
      "margin":  10,
      "hole":    50,
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.piechart(json, config)
    }

  CSS/SVG:
    <style>
    body {
      font: 10px sans-serif;
    }
    .arc path {
      stroke: #fff;
    }
    </style>
*/
d3sparql.piechart = function(json, config) {
  var head = json.head.vars
  var data = json.results.bindings

  var radius = Math.min(config.width, config.height) / 2 - config.margin
  var hole = Math.max(Math.min(radius - 50, config.hole), 0)
  var color = d3.scale.category20()

  var arc = d3.svg.arc()
    .outerRadius(radius)
    .innerRadius(hole)

  var pie = d3.layout.pie()
    //.sort(null)
    .value(function(d) {return d[config.size].value})

  var svg = d3.select("body")
    .append("svg")
    .attr("width", config.width)
    .attr("height", config.height)
    .append("g")
    .attr("transform", "translate(" + config.width / 2 + "," + config.height / 2 + ")")

  var g = svg.selectAll(".arc")
    .data(pie(data))
    .enter()
    .append("g")
    .attr("class", "arc")
  g.append("path")
    .attr("d", arc)
    .attr("fill", function(d, i) { return color(i) })
  g.append("text")
    .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")" })
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .text(function(d) { return d.data[config.label].value })
}

/*
  Rendering sparql-results+json object into a scatter plot

  References:
    http://bl.ocks.org/mbostock/3244058

  Options:
    config = {
      "label_x": "label string for x-axis",
      "label_y": "label string for y-axis",
      "var_x": "SPARQL variable name for x-axis values",
      "var_y": "SPARQL variable name for y-axis values",
      "var_r": "SPARQL variable name for radius",
      "min_r": 1,       // minimum radius size
      "max_r": 20,      // maximum radius size
      "width": 850,     // canvas width
      "height": 300,    // canvas height
      "margin_x": 80,   // canvas margin
      "margin_y": 40,   // canvas margin
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
  var head = json.head.vars
  var data = json.results.bindings
  var extent_x = d3.extent(data, function(d) {return parseInt(d[config.var_x].value)})
  var extent_y = d3.extent(data, function(d) {return parseInt(d[config.var_y].value)})
  var extent_r = d3.extent(data, function(d) {return parseInt(d[config.var_r].value)})
  var scale_x = d3.scale.linear().range([config.margin_x, config.width - config.margin_x]).domain(extent_x)
  var scale_y = d3.scale.linear().range([config.height - config.margin_y, config.margin_y]).domain(extent_y)
  var scale_r = d3.scale.linear().range([config.min_r, config.max_r]).domain(extent_r)
  var axis_x = d3.svg.axis().scale(scale_x)
  var axis_y = d3.svg.axis().scale(scale_y).orient("left")

  var svg = d3.select("body")
    .append("svg")
    .attr("width", config.width)
    .attr("height", config.height)
  var circle = svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "node")
    .attr("cx", function(d) {return scale_x(d[config.var_x].value)})
    .attr("cy", function(d) {return scale_y(d[config.var_y].value)})
    .attr("r",  function(d) {return scale_r(d[config.var_r].value)})
  var ax = svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (config.height - config.margin_y) + ")")
    .call(axis_x)
  var ay = svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + config.margin_x + ",0)")
    .call(axis_y)
  ax.append("text")
    .attr("class", "label")
    .text(config.label_x)
    .style("text-anchor", "middle")
    .attr("transform", "translate(" + ((config.width - config.margin_x) / 2) + "," + (config.margin_y - 5) + ")")
  ay.append("text")
    .attr("class", "label")
    .text(config.label_y)
    .style("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", 0 - (config.height / 2))
    .attr("y", 0 - (config.margin_x - 20))

  // default CSS/SVG
  ax.attr({
    "stroke": "black",
    "fill": "none",
  })
  ay.attr({
    "stroke": "black",
    "fill": "none",
  })
  circle.attr({
    "stroke": "gray",
    "stroke-width": "1px",
    "fill": "lightblue",
    "opacity": 0.5,
  })
  //svg.selectAll(".label")
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
      "radius": 12,    // radius value or a function
      "charge": -250,  // force between nodes (negative: repulsion, positive: attraction)
      "distance": 30,  // target distance between linked nodes
      "width": 1000,   // canvas width
      "height": 500,   // canvas height
      "label": "name", // (optional) name of a JSON key to be used as a label text for the node
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
      stroke: #999;
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
  var graph = d3sparql.graph(json, config)
  var svg = d3.select("body")
    .append("svg")
    .attr("width", config.width)
    .attr("height", config.height)
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
    .attr("r", config.radius)
  var text = node.append("text")
    .text(function(d) {return d[config.label || "label"]})
    .attr("class", "node")
  var force = d3.layout.force()
    .charge(config.charge)
    .linkDistance(config.distance)
    .size([config.width, config.height])
    .nodes(graph.nodes)
    .links(graph.links)
    .start()
  force.on("tick", function() {
    link.attr("x1", function(d) {return d.source.x})
        .attr("y1", function(d) {return d.source.y})
        .attr("x2", function(d) {return d.target.x})
        .attr("y2", function(d) {return d.target.y})
    text.attr("x", function(d) {return d.x})
        .attr("y", function(d) {return d.y})
    circle.attr("cx", function(d) {return d.x})
          .attr("cy", function(d) {return d.y})
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
      "key1": "parent",
      "key2": "child",
      "label1": "parent_label",
      "label2": "child_label",
      "width": 1000,
      "height": 900,
      "margin":  50,
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
      text-shadow: 0 1px 0 #fff;
    }
    .link {
      fill: none;
      stroke: #000;
      stroke-opacity: .2;
    }
    .link:hover {
      stroke-opacity: .5;
    }
    </style>

  Dependencies:
    Download sankey.js from https://github.com/d3/d3-plugins/tree/master/sankey
    <script src="sankey.js"></script>
*/
d3sparql.sankey = function(json, config) {
  var graph = d3sparql.graph(json, config)
  var nodes = graph.nodes
  var links = graph.links
  for (var i = 0; i < links.length; i++) {
    links[i].value = 2  // TODO: fix to use values on links
  }
  var sankey = d3.sankey()
    .size([config.width, config.height])
    .nodeWidth(15)
    .nodePadding(10)
    .nodes(nodes)
    .links(links)
    .layout(32)
  var path = sankey.link()
  var color = d3.scale.category20()
  var svg = d3.select("body").append("svg")
    .attr("width", config.width + config.margin * 2)
    .attr("height", config.height + config.margin * 2)
    .append("g")
    .attr("transform", "translate(" + config.margin + "," + config.margin + ")")
  var link = svg.selectAll(".link")
    .data(links)
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("d", path)
    .attr("stroke-width", function(d) {return Math.max(1, d.dy)})
    .sort(function(a, b) {return b.dy - a.dy})
  var node = svg.selectAll(".node")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", function(d) {return "translate(" + d.x + "," + d.y + ")"})
    .call(d3.behavior.drag()
       .origin(function(d) {return d})
       .on("dragstart", function() {this.parentNode.appendChild(this)})
       .on("drag", dragmove)
     )
  node.append("rect")
    .attr("width", function(d) {return d.dx})
    .attr("height", function(d) {return d.dy})
    .attr("fill", function(d) {return color(d.label)})
    .attr("opacity", 0.5)
  node.append("text")
    .attr("x", -6)
    .attr("y", function(d) {return d.dy/2})
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function(d) {return d.label})
    .filter(function(d) {return d.x < config.width / 2})
    .attr("x", 6 + sankey.nodeWidth())
    .attr("text-anchor", "start")

  // default CSS/SVG
  link.attr({
    "fill": "none",
    "stroke": "grey",
    "opacity": 0.5,
  })

  function dragmove(d) {
    d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(config.height - d.dy, d3.event.y))) + ")")
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
      "diameter": 800,  // diameter of canvas
      "angle": 360,     // angle of arc (less than 360 for wedge)
      "depth": 200,     // depth of arc (less than diameter/2 - label length to fit)
      "radius": 5,      // radius of node circles
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
      stroke: #ccc;
      stroke-width: 1.5px;
    }
    .node circle {
      fill: #fff;
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
  var tree = d3sparql.tree(json, config)
  var tree_layout = d3.layout.tree()
    .size([config.angle, config.depth])
    .separation(function(a, b) {return (a.parent === b.parent ? 1 : 2) / a.depth})
  var nodes = tree_layout.nodes(tree)
  var links = tree_layout.links(nodes)
  var diagonal = d3.svg.diagonal.radial()
    .projection(function(d) {return [d.y, d.x / 180 * Math.PI]})
  var svg = d3.select("body")
    .append("svg")
    .attr("width", config.diameter)
    .attr("height", config.diameter)
    .append("g")
    .attr("transform", "translate(" + config.diameter / 2 + "," + config.diameter / 2 + ")")
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
    .attr("transform", function(d) {return "rotate(" + (d.x - 90) + ") translate(" + d.y + ")"})
  var circle = node.append("circle")
    .attr("r", config.radius)
  var text = node.append("text")
    .attr("dy", ".35em")
    .attr("text-anchor", function(d) {return d.x < 180 ? "start" : "end"})
    .attr("transform", function(d) {return d.x < 180 ? "translate(8)" : "rotate(180) translate(-8)"})
    .text(function(d) {return d.name})

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

  // for IFRAME embed
  //d3.select(self.frameElement).style("height", config.diameter * 2 + "px")
}

/*
  Rendering sparql-results+json object into a dendrogram

  References:
    http://bl.ocks.org/4063570  Cluster Dendrogram

  Options:
    config = {
      "width": 900,    // canvas width
      "height": 4500,  // canvas height
      "margin": 300,   // width margin for labels
      "radius": 5,     // radius of node circles
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
      stroke: #ccc;
      stroke-width: 1.5px;
    }
    .node circle {
      fill: #fff;
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
  var tree = d3sparql.tree(json, config)
  var cluster = d3.layout.cluster()
    .size([config.height, config.width - config.margin])
  var diagonal = d3.svg.diagonal()
    .projection(function(d) {return [d.y, d.x]})
  var svg = d3.select("body").append("svg")
    .attr("width", config.width)
    .attr("height", config.height)
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
    .attr("transform", function(d) {return "translate(" + d.y + "," + d.x + ")"})
  var circle = node.append("circle")
    .attr("r", config.radius)
  var text = node.append("text")
    .attr("dx", function(d) {return (d.parent && d.children) ? -8 : 8})
    .attr("dy", 5)
    .style("text-anchor", function(d) {return (d.parent && d.children) ? "end" : "start"})
    .text(function(d) {return d.name})

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

  // for IFRAME embed
  //d3.select(self.frameElement).style("height", config.height + "px")
}

/*
  Rendering sparql-results+json object into a sunburst

  References:
    http://bl.ocks.org/4348373  Zoomable Sunburst
    http://www.jasondavies.com/coffee-wheel/  Coffee Flavour Wheel

  Options:
    config = {
      "width": 1000,  // canvas width
      "height": 900,  // canvas height
      "margin": 150,  // margin for labels
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
      stroke: #fff;
      fill-rule: evenodd;
    }
    </style>
*/
d3sparql.sunburst = function(json, config) {
  var tree = d3sparql.tree(json, config)
  var radius = Math.min(config.width, config.height) / 2 - config.margin
  var x = d3.scale.linear().range([0, 2 * Math.PI])
  var y = d3.scale.sqrt().range([0, radius])
  var color = d3.scale.category20()
  var svg = d3.select("body").append("svg")
    .attr("width", config.width)
    .attr("height", config.height)
    .append("g")
    .attr("transform", "translate(" + config.width/2 + "," + config.height/2 + ")");
  var arc = d3.svg.arc()
    .startAngle(function(d)  { return Math.max(0, Math.min(2 * Math.PI, x(d.x))) })
    .endAngle(function(d)    { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))) })
    .innerRadius(function(d) { return Math.max(0, y(d.y)) })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)) })
  var partition = d3.layout.partition()
    .value(function(d) {return d.size})
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
    .text(function(d) {return d.name})
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
      "width": 800,     // canvas width
      "height": 800,    // canvas height
      "diameter": 700,  // diamieter of the outer circle
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
      fill: #ccc;
      stroke: #999;
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
  var tree = d3sparql.tree(json, config)
  var w = config.width,
      h = config.height,
      r = config.diameter,
      x = d3.scale.linear().range([0, r]),
      y = d3.scale.linear().range([0, r])

  var pack = d3.layout.pack()
    .size([r, r])
    .value(function(d) { return d.size })

  var node  = tree
  var nodes = pack.nodes(tree)

  var vis = d3.select("body").insert("svg:svg", "h2")
    .attr("width", w)
    .attr("height", h)
    .append("svg:g")
    .attr("transform", "translate(" + (w - r) / 2 + "," + (h - r) / 2 + ")")

  vis.selectAll("circle")
    .data(nodes)
    .enter()
    .append("svg:circle")
    .attr("class", function(d) { return d.children ? "parent" : "child" })
    .attr("cx", function(d) { return d.x })
    .attr("cy", function(d) { return d.y })
    .attr("r", function(d) { return d.r })
/*
    // CSS: circle { ... }
    .attr("fill", function(d) { return d.children ? "#1f77b4" : "#ccc" })
    .attr("fill-opacity", function(d) { return d.children ? ".1" : "1" })
    .attr("stroke", function(d) { return d.children ? "steelblue" : "#999" })
    .attr("pointer-events", function(d) { return d.children ? "all" : "none" })
    .on("mouseover", function() { d3.select(this).attr("stroke", "#ff7f0e").attr("stroke-width", ".5px") })
    .on("mouseout", function() { d3.select(this).attr("stroke", "steelblue").attr("stroke-width", ".5px") })
*/
    .on("click", function(d) { return zoom(node === d ? tree : d) })

  vis.selectAll("text")
    .data(nodes)
    .enter()
    .append("svg:text")
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
    .attr("transform", function(d) { return "rotate(-30, " + d.x + ", " + d.y + ")"})

  d3.select(window).on("click", function() {zoom(tree)})

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
      "width": 900,    // canvas width
      "height": 4500,  // canvas height
      "margin": 10,    // margin around the treemap
      "radius": 5,     // radius of node circles
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
  var tree = d3sparql.tree(json, config)
  var width  = config.width - config.margin * 2
  var height = config.height - config.margin * 2
  var color = d3.scale.category20c()
  var treemap = d3.layout.treemap()
    .size([width, height])
    .sticky(true)
    .value(function(d) {return d.size})
  var div = d3.select("body").append("div")
    .style("position", "relative")
    .style("width", config.width + "px")
    .style("height", config.height + "px")
    .style("left", config.margin + "px")
    .style("top", config.margin + "px")
  var node = div.datum(tree).selectAll(".node")
    .data(treemap.nodes)
    .enter()
    .append("div")
    .attr("class", "node")
    .call(position)
    .style("background", function(d) {return d.children ? color(d.name) : null})
    .text(function(d) {return d.children ? null : d.name})

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
    this.style("left",   function(d) {return d.x + "px"})
        .style("top",    function(d) {return d.y + "px"})
        .style("width",  function(d) {return Math.max(0, d.dx - 1) + "px"})
        .style("height", function(d) {return Math.max(0, d.dy - 1) + "px"})
  }
}

/* TODO */
d3sparql.treemapzoom = function(json, config) {
  var tree = d3sparql.tree(json, config)
  var margin = {top: 20, right: 0, bottom: 0, left: 0},
    width = 960,
    height = 500 - margin.top - margin.bottom,
    formatNumber = d3.format(",d"),
    transitioning;

  var x = d3.scale.linear().domain([0, width]).range([0, width])
  var y = d3.scale.linear().domain([0, height]).range([0, height])

  var treemap = d3.layout.treemap()
    .children(function(d, depth) { return depth ? null : d.children; })
    .sort(function(a, b) { return a.value - b.value; })
    .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
    .round(false);

  var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.bottom + margin.top)
    .style("margin-left", -margin.left + "px")
    .style("margin.right", -margin.right + "px")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .style("shape-rendering", "crispEdges");

  var grandparent = svg.append("g")
    .attr("class", "grandparent");

  grandparent.append("rect")
    .attr("y", -margin.top)
    .attr("width", width)
    .attr("height", margin.top);

  grandparent.append("text")
    .attr("x", 6)
    .attr("y", 6 - margin.top)
    .attr("dy", ".75em");

  initialize(tree);
  accumulate(tree);
  layout(tree);
  display(tree);

  function initialize(tree) {
    tree.x = root.y = 0;
    tree.dx = width;
    tree.dy = height;
    tree.depth = 0;
  }

  // Aggregate the values for internal nodes. This is normally done by the
  // treemap layout, but not here because of our custom implementation.
  function accumulate(d) {
    return d.children
        ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
        : d.value;
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
      treemap.nodes({children: d.children});
      d.children.forEach(function(c) {
        c.x = d.x + c.x * d.dx;
        c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.parent = d;
        layout(c);
      });
    }
  }

  function display(d) {
    grandparent
      .datum(d.parent)
      .on("click", transition)
      .select("text")
      .text(name(d));

    var g1 = svg.insert("g", ".grandparent")
      .datum(d)
      .attr("class", "depth");

    var g = g1.selectAll("g")
      .data(d.children)
      .enter()
      .append("g");

    g.filter(function(d) { return d.children; })
      .classed("children", true)
      .on("click", transition);

    g.selectAll(".child")
      .data(function(d) { return d.children || [d]; })
      .enter()
      .append("rect")
      .attr("class", "child")
      .call(rect);

    g.append("rect")
      .attr("class", "parent")
      .call(rect)
      .append("title")
      .text(function(d) { return formatNumber(d.value); });

    g.append("text")
      .attr("dy", ".75em")
      .text(function(d) { return d.name; })
      .call(text);

    function transition(d) {
      if (transitioning || !d) return;
      transitioning = true;
      var g2 = display(d),
          t1 = g1.transition().duration(750),
          t2 = g2.transition().duration(750);

      // Update the domain only after entering new elements.
      x.domain([d.x, d.x + d.dx]);
      y.domain([d.y, d.y + d.dy]);

      // Enable anti-aliasing during the transition.
      svg.style("shape-rendering", null);

      // Draw child nodes on top of parent nodes.
      svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

      // Fade-in entering text.
      g2.selectAll("text").style("fill-opacity", 0);

      // Transition to the new view.
      t1.selectAll("text").call(text).style("fill-opacity", 0);
      t2.selectAll("text").call(text).style("fill-opacity", 1);
      t1.selectAll("rect").call(rect);
      t2.selectAll("rect").call(rect);

      // Remove the old node when the transition is finished.
      t1.remove().each("end", function() {
        svg.style("shape-rendering", "crispEdges");
        transitioning = false;
      });
    }

    return g;
  }

  function text(text) {
    text.attr("x", function(d) { return x(d.x) + 6; })
        .attr("y", function(d) { return y(d.y) + 6; });
  }

  function rect(rect) {
    rect.attr("x", function(d) { return x(d.x); })
        .attr("y", function(d) { return y(d.y); })
        .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
        .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
  }

  function name(d) {
    return d.parent
        ? name(d.parent) + "." + d.name
        : d.name;
  }
}


/* World Map usable with GeoLocation data (i.e. Longitude and Latitude)
 
Options:
  config = {
  "radius": 5 // circles radius
  "color": #FF3333 // circles colors
  "map": "map/world-50m.json" // default location of GeoMap JSON
                              // https://github.com/mbostock/topojson/blob/master/examples/world-50m.json
}

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      d3sparql.geomap(json, config = {})
    }
*/
d3sparql.geomap = function(json,config) {


  var head = json.head.vars
  var data = json.results.bindings
	
	var opts = {
		"radius": config.radius || 5,
		"color": config.color || "#FF3333",
		"map": config.map || "map/world-50m.json"
	} 

	var width = 960,
			height = 480;
	
	var projection = d3.geo.equirectangular()
			.scale(153)
			.translate([width / 2, height / 2])
			.precision(.1);
	
	var path = d3.geo.path()
			.projection(projection);

	var graticule = d3.geo.graticule();

	var svg = d3.select("body").append("svg")
			.attr("width", width)
			.attr("height", height);

	svg.append("path")
		.datum(graticule.outline)
		.attr("fill","#a4bac7")
		.attr("d",path);

	svg.append("path")
			.datum(graticule)
			.attr("fill","none")
			.attr("stroke","#333")
			.attr("stroke-width",".5px")
			.attr("stroke-opacity",".5")
			.attr("d", path);


	d3.json(opts.map, function(error, world) {
		svg.insert("path", ".graticule")
				.datum(topojson.feature(world, world.objects.land))
				.attr("fill", "#d7c7ad")
				.attr("stroke", "#766951")
				.attr("d", path);

		svg.insert("path", ".graticule")
				.datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
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
					d.longVal.value,
					d.latVal.value
				]) + ")"
			});

	});

	d3.select(self.frameElement).style("height", height + "px");
}

/*
  Japanese map + values for each prefecture in color

  Options:
    config = {
      "width":  1000,        // canvas width
      "height": 1000,        // canvas height
      "color_max": "red",    // color for maximum value
      "color_min": "white",  // color for minimum value
      "topojson": "dir/to/japan.topojson",
      "mapname": "japan"
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      d3sparql.map(json, config = {})
    }
*/
d3sparql.map = function(json, config) {
  var opts = {
    "width":        config.width || 1000,
    "height":       config.height || 1000,
    "color_max":    config.color_max || "blue",
    "color_min":    config.color_min || "white",
    "color_scale":  config.color_scale || "log",
    "topojson":     config.topojson || "japan.topojson",
    "mapname":      config.mapname || "japan",
    "center_lat":   config.center_lat || 34,
    "center_lng":   config.center_lng || 137
  }

  var head = json.head.vars
  var data = json.results.bindings

  // uses ?size for numbers, ?label for geo names
  var size = d3.nest()
        .key(function(d) {return d.label.value})
        .rollup(function(d) {
          return d3.sum(d, function(d) {
            return parseInt(d.size.value)
          })
        }).map(data, d3.map)
  //console.log(size)
  var extent = d3.extent((d3.map(size).values()))

  var svg = d3.select("body")
    .append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)

  d3.json(opts.topojson, function(topojson_map) {
    var geo = topojson.object(topojson_map, topojson_map.objects[opts.mapname]).geometries
    var projection = d3.geo.mercator()
      .center([opts.center_lng, opts.center_lat])
      .translate([opts.width/2, opts.height/2])
      .scale(10000)
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
        return color(size[d.properties.name_local])
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
      .text(function(d) { return d.properties.name_local; })
  })
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
