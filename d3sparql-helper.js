function toggle() {
  var button = d3.select("#button")
  var elem = d3.select("#sparql")
  if (elem.style("display") == "none") {
    elem.style("display", "inline")
    button.attr("class", "icon-chevron-up")
  } else {
    elem.style("display", "none")
    button.attr("class", "icon-chevron-down")
  }
}
