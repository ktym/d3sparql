//
// d3sparql.js - utilities for visualizing SPARQL results with the D3 library
//
//   Web site: http://github.com/ktym/d3sparql/
//   Copyright: 2013, 2014 (C) Toshiaki Katayama (ktym@dbcls.jp)
//   Initial version: 2013-01-28
//   Last updated: 2014-05-15
//

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
         var endpoint = "http://beta.sparql.uniprot.org/sparql"
         var query = d3.select("#sparql").property("value")
         sparql(endpoint, query, render)
       }
       function render(json) {
         // set options and call the d3xxxxx functions in this library ...
         var opts = { ... }
         d3xxxxx(json, opts)
       }
      </script>
     </head>
     <body onload="exec()">
      <textarea id="sparql" style="display:none">
        PREFIX ...
        SELECT ...
        WHERE { ... }
      </textarea>
     </body>
    </html>
*/
function sparql(endpoint, sparql_string, callback) {
  var query = endpoint + "?query=" + encodeURIComponent(sparql_string)
  var mime = "application/sparql-results+json"
  console.log(endpoint)
  console.log(query)
  d3.xhr(query, mime, function(request) {
    var json = request.responseText
    callback(JSON.parse(json))
  })
}

/*
  Rendering sparql-results+json object containing multiple rows into a HTML table

  Synopsis:
    sparql(endpoint, query, render)

    function render(json) {
      d3htmltable(json)
    }
*/
function d3htmltable(json) {
  var head = json.head.vars
  var data = json.results.bindings
  var table = d3.select("body").append("table").attr('class', 'table table-bordered').attr('style', 'margin: 10px')
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
}

/*
  Rendering sparql-results+json object containing one row into a HTML table

  Synopsis:
    sparql(endpoint, query, render)

    function render(json) {
      d3htmlhash(json)
    }
*/
function d3htmlhash(json) {
  var head = json.head.vars
  var data = json.results.bindings[0]
  var table = d3.select("body").append("table").attr('class', 'table table-bordered').attr('style', 'margin: 10px')
  var row = table.selectAll("tr")
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
}

/*
  Rendering sparql-results+json object into a scatter plot

  Options:
    opts = {
      "x_label": "label string for x-axis",
      "y_label": "label string for y-axis",
      "x_var": "SPARQL variable name for x-axis values",
      "y_var": "SPARQL variable name for y-axis values",
      "r_var": "SPARQL variable name for radius",
      "r_min": 1,     // minimum radius size
      "r_max": 20,    // maximum radius size
      "width": 850,   // canvas width
      "height": 300,  // canvas height
      "margin": 60,   // canvas margin
    }

  Synopsis:
    sparql(endpoint, query, render)

    function render(json) {
      d3scatterplot(json, opts)
    }

  TODO:
    Fix the position of y-axis label to fit automatically
*/
function d3scatterplot(json, opts) {
  var head = json.head.vars
  var data = json.results.bindings
  var x_extent = d3.extent(data, function(d) {return parseInt(d[opts.x_var].value)})
  var y_extent = d3.extent(data, function(d) {return parseInt(d[opts.y_var].value)})
  var r_extent = d3.extent(data, function(d) {return parseInt(d[opts.r_var].value)})
  var x_scale = d3.scale.linear().range([opts.margin, opts.width - opts.margin]).domain(x_extent)
  var y_scale = d3.scale.linear().range([opts.height - opts.margin, opts.margin]).domain(y_extent)
  var r_scale = d3.scale.linear().range([opts.r_min, opts.r_max]).domain(r_extent)
  var x_axis = d3.svg.axis().scale(x_scale)
  var y_axis = d3.svg.axis().scale(y_scale).orient("left")
  var x_label_offset = opts.x_label.length * 4    // font-size / 2
  var y_label_offset = opts.y_label.length * 4    // font-size / 2

  var svg = d3.select("body")
    .append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)
  svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", function(d) {return x_scale(d[opts.x_var].value)})
    .attr("cy", function(d) {return y_scale(d[opts.y_var].value)})
    .attr("r",  function(d) {return r_scale(d[opts.r_var].value)})
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (opts.height - opts.margin) + ")")
    .call(x_axis)
  svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + opts.margin + ", 0)")
    .call(y_axis)
  d3.select(".x.axis")
    .append("text")
    .text(opts.x_label)
    .attr("x", (opts.width - x_label_offset) / 2)
    .attr("y", opts.margin / 1.5)
  d3.select(".y.axis")
    .append("text")
    .text(opts.y_label)
    .attr("transform", "rotate(-90, -43, 0) translate(-170)")
//  .attr("transform", "rotate(-90, -45, 0) translate(-" + y_label_offset + ")")
//  .attr("transform", "rotate(-90), translate(-" + y_label_offset / 2 + ",-50)")
//  .attr("transform", "rotate(-90, -" + y_label_offset / 2 + "0, 0)")
//  .attr("transform", "rotate(-90, -" + opts.margin - 40 + "0, 0) translate(-" + y_label_offset * 2 + ")");
//  .attr("transform", "rotate(-90, -" + opts.margin + "0, 0) translate(-" + y_label_offset * 2 + ")");
}

/*
  Convert sparql-results+json object into a JSON graph of the {"nodes": [], "links": []} form

  Options:
    opts = {
      "key1": "SPARQL variable name for node1",
      "key2": "SPARQL variable name for node2",
      "label1": "SPARQL variable name for the label of node1",  // optional
      "label2": "SPARQL variable name for the label of node2",  // optional
    }

  Synopsis:
    sparql(endpoint, query, render)

    function render(json) {
      var graph = sparql2graph(json, opts)
      d3forcegraph(graph, options)
    }
*/
function sparql2graph(json, opts) {
  var data = json.results.bindings
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
  Force graph layout

  Options:
    opts = {
      "radius": 12,    // radius value or a function
      "charge": -250,  // force between nodes (negative: repulsion, positive: attraction)
      "distance": 30,  // target distance between linked nodes
      "width": 1000,   // canvas width
      "height": 500,   // canvas height
      "label": "name", // (optional) name of a JSON key to be used as a label text for the node
    }

  Synopsis:
    sparql(endpoint, query, render)
    function render(json) {
      var graph = sparql2graph(json, options)
      d3forcegraph(graph, opts)
    }

  TODO:
    Provide an option to direct attributes of the nodes (colors etc.).
    Try other d3.layout.force options.
*/
function d3forcegraph(json, opts) {
  var svg = d3.select("body")
    .append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)
  var link = svg.selectAll(".link")
    .data(json.links)
    .enter()
    .append("line")
    .attr("class", "link")
  var node = svg.selectAll(".node")
    .data(json.nodes)
    .enter()
    .append("g")
  var circle = node.append("circle")
    .attr("class", "node")
    .attr("r", opts.radius)
  var text = node.append("text")
    .text(function(d) {return d[opts.label || "label"]})
    .attr("class", "node")
  var force = d3.layout.force()
    .charge(opts.charge)
    .linkDistance(opts.distance)
    .size([opts.width, opts.height])
    .nodes(json.nodes)
    .links(json.links)
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
}

/*
  Convert sparql-results+json object into a JSON graph of the {"name": name, "size": size, "children": []} form

  Options:
    opts = {
      "root": "value for root node",
      "parent": "SPARQL variable name for parent node",
      "child": "SPARQL variable name for child node",
    }

  Synopsis:
    sparql(endpoint, query, render)
    function render(json) {
      var tree = sparql2tree(json, opts)
      d3roundtree(tree, options)
      d3dendrogram(tree, options)
      d3sunburst(tree, options)
      d3treemap(tree, options)
    }
*/
function sparql2tree(json, opts) {
  var data = json.results.bindings
  var tree = d3.map()
  var parent = child = children = true
  for (var i = 0; i < data.length; i++) {
    parent = data[i][opts.parent].value
    child = data[i][opts.child].value
    if (tree.has(parent)) {
      children = tree.get(parent)
      children.push(child)
      tree.set(parent, children)
    } else {
      children = [child]
      tree.set(parent, children)
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
  return traverse(opts.root)
}

/*
  http://bl.ocks.org/4063550  Reingold-Tilford Tree

  Options:
    opts = {
      "diameter": 800,  // diameter of canvas
      "angle": 360,     // angle of arc (less than 360 for wedge)
      "depth": 200,     // depth of arc (less than diameter/2 - label length to fit)
      "radius": 5,      // radius of node circles
    }

  Synopsis:
    var tree = sparql2tree(json, options)
    d3roundtree(tree, opts)
*/
function d3roundtree(root, opts) {
  var tree = d3.layout.tree()
    .size([opts.angle, opts.depth])
    .separation(function(a, b) {return (a.parent == b.parent ? 1 : 2) / a.depth})
  var nodes = tree.nodes(root)
  var links = tree.links(nodes)
  var diagonal = d3.svg.diagonal.radial()
    .projection(function(d) {return [d.y, d.x / 180 * Math.PI]})
  var svg = d3.select("body")
    .append("svg")
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
    .attr("transform", function(d) {return "rotate(" + (d.x - 90) + ") translate(" + d.y + ")"})
  node.append("circle")
    .attr("r", opts.radius)
  node.append("text")
    .attr("dy", ".35em")
    .attr("text-anchor", function(d) {return d.x < 180 ? "start" : "end"})
    .attr("transform", function(d) {return d.x < 180 ? "translate(8)" : "rotate(180) translate(-8)"})
    .text(function(d) {return d.name})
  // for IFRAME embed (probably)
  d3.select(self.frameElement).style("height", opts.diameter - 150 + "px")
}

/*
  http://bl.ocks.org/4063570  Cluster Dendrogram

  Options:
    opts = {
      "width": 900,    // canvas width
      "height": 4500,  // canvas height
      "margin": 300,   // width margin for labels
      "radius": 5,     // radius of node circles
    }

  Synopsis:
    var tree = sparql2tree(json, options)
    d3dendrogram(tree, opts)
*/
function d3dendrogram(root, opts) {
  var cluster = d3.layout.cluster()
    .size([opts.height, opts.width - opts.margin])
  var diagonal = d3.svg.diagonal()
    .projection(function(d) {return [d.y, d.x]})
  var svg = d3.select("body").append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)
    .append("g")
    .attr("transform", "translate(40,0)")
  var nodes = cluster.nodes(root)
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
  node.append("circle")
    .attr("r", opts.radius)
  node.append("text")
    .attr("dx", function(d) {return (d.parent && d.children) ? -8 : 8})
    .attr("dy", 5)
    .style("text-anchor", function(d) {return (d.parent && d.children) ? "end" : "start"})
    .text(function(d) {return d.name})
  // for IFRAME embed (probably)
  d3.select(self.frameElement).style("height", opts.height + "px")
}

/*
  http://bl.ocks.org/4348373  Zoomable Sunburst
  http://www.jasondavies.com/coffee-wheel/  Coffee Flavour Wheel

  Options:
    opts = {
      "width": 1000,  // canvas width
      "height": 900,  // canvas height
      "margin": 150,  // margin for labels
    }

  Synopsis:
    var tree = sparql2tree(json, options)
    d3sunburst(tree, opts)
 */
function d3sunburst(root, opts) {
  var radius = Math.min(opts.width, opts.height) / 2 - opts.margin
  var x = d3.scale.linear().range([0, 2 * Math.PI])
  var y = d3.scale.sqrt().range([0, radius])
  var color = d3.scale.category20()
  var svg = d3.select("body").append("svg")
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
    .value(function(d) {return d.size})
  var nodes = partition.nodes(root)
  var path = svg.selectAll("path")
    .data(nodes)
    .enter()
    .append("path")
    .attr("d", arc)
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
  // for IFRAME embed (probably)
  d3.select(self.frameElement).style("height", opts.height + "px");
}

/*
  http://mbostock.github.com/d3/talk/20111116/pack-hierarchy.html  Circle Packing

  Options:
    opts = {
      "width": 800,     // canvas width
      "height": 800,    // canvas height
      "diameter": 700,  // diamieter of the outer circle
    }

  Synopsis:
    var tree = sparql2tree(json, options)
    d3circlepack(tree, opts)

  TODO:
    Fix rotation angle for each text to avoid string collision
*/
function d3circlepack(root, opts) {
  var w = opts.width,
      h = opts.height,
      r = opts.diameter,
      x = d3.scale.linear().range([0, r]),
      y = d3.scale.linear().range([0, r])

  var pack = d3.layout.pack()
    .size([r, r])
    .value(function(d) { return d.size })

  var node = root
  var nodes = pack.nodes(root)

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
    .on("click", function(d) { return zoom(node == d ? root : d) })

  vis.selectAll("text")
    .data(nodes)
    .enter()
    .append("svg:text")
    .attr("class", function(d) { return d.children ? "parent" : "child" })
    .attr("x", function(d) { return d.x })
    .attr("y", function(d) { return d.y })
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .style("opacity", function(d) { return d.r > 20 ? 1 : 0 })
    .text(function(d) { return d.name })
    // rotate to avoid string collision
    .transition()
    .duration(1000)
    .attr("transform", function(d) { return "rotate(-30, " + d.x + ", " + d.y + ")"})

  d3.select(window).on("click", function() {zoom(root)})

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
  http://bl.ocks.org/4063582  Treemap

  Options:
    opts = {
      "width": 900,    // canvas width
      "height": 4500,  // canvas height
      "margin": 10,    // margin around the treemap
      "radius": 5,     // radius of node circles
    }

  Synopsis:
    var tree = sparql2tree(json, options)
    d3sunburst(tree, opts)
*/
function d3treemap(root, opts) {
  var width  = opts.width - opts.margin * 2
  var height = opts.height - opts.margin * 2
  var color = d3.scale.category20c()
  var treemap = d3.layout.treemap()
    .size([width, height])
    .sticky(true)
    .value(function(d) {return d.size})
  var div = d3.select("body").append("div")
    .style("position", "relative")
    .style("width", opts.width + "px")
    .style("height", opts.height + "px")
    .style("left", opts.margin + "px")
    .style("top", opts.margin + "px")
  var node = div.datum(root).selectAll(".node")
    .data(treemap.nodes)
    .enter()
    .append("div")
    .attr("class", "node")
    .call(position)
    .style("background", function(d) {return d.children ? color(d.name) : null})
    .text(function(d) {return d.children ? null : d.name})
  function position() {
    this.style("left",   function(d) {return d.x + "px"})
        .style("top",    function(d) {return d.y + "px"})
        .style("width",  function(d) {return Math.max(0, d.dx - 1) + "px"})
        .style("height", function(d) {return Math.max(0, d.dy - 1) + "px"})
  }
}

/* TODO */
function d3treemapzoom(root, opts) {
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

  initialize(root);
  accumulate(root);
  layout(root);
  display(root);

  function initialize(root) {
    root.x = root.y = 0;
    root.dx = width;
    root.dy = height;
    root.depth = 0;
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
