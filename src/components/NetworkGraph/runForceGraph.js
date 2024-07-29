import * as d3 from "d3";

const COLOR_MAP = {
  0: "white",     // uncategorised node
  1: "white",     // host nodes
  2: "white",     // severity cluster
  3: "#7f7f7f",   // name cluster node
  4: "#7f7f7f",   // alert node
  5: "#ffbaac",   // LOW    severity ALERT
  6: "#ff9585",   // MEDIUM severity ALERT
  7: "#ff584d",   // HIGH   severity ALERT
};

function wrap() {
  var self = d3.select(this),
    textLength = self.node().getComputedTextLength(),
    text = self.text();
  while (textLength > (150 - 2 * 8) && text.length > 0) {
    text = text.slice(0, -1);
    self.text(text + '...');
    textLength = self.node().getComputedTextLength();
  }
}

export function runForceGraph(
  container,
  linksData,
  nodesData,
  strength,
  //   nodeHoverTooltip
) {
  const nodes = nodesData; //nodesData.map((d) => Object.assign({}, d));
  const hostNodes = nodesData.filter(node => node.group === 1);
  const alertNodes = nodesData
    .filter(node => node.group !== 1)
    .sort((nodeA, nodeB) => nodeA.count > nodeB.count)
  // .slice(0, 4);

  const links = linksData //.filter(link => link.from); //linksData.map((d) => Object.assign({}, d));

  const containerRect = container.getBoundingClientRect();
  container.innerHTML = "";
  let width = containerRect.width;
  let height = containerRect.height;

  // const drag = (simulation) => {
  //   const dragstarted = (event, d) => {
  //     if (!event.active) simulation.alphaTarget(0.3).restart();
  //     d.fx = d.x;
  //     d.fy = d.y;
  //   };

  //   const dragged = (event, d) => {
  //     d.fx = event.x;
  //     d.fy = event.y;
  //   };

  //   const dragended = (event, d) => {
  //     if (!event.active) simulation.alphaTarget(0);
  //     d.fx = null;
  //     d.fy = null;
  //   };

  //   return d3
  //     .drag()
  //     .on("start", dragstarted)
  //     .on("drag", dragged)
  //     .on("end", dragended);
  // };

  // Add the tooltip element to the graph
  const tooltip = document.querySelector("#graph-tooltip");
  if (!tooltip) {
    const tooltipDiv = document.createElement("div");
    tooltipDiv.style.opacity = "0";
    tooltipDiv.id = "graph-tooltip";
    document.body.appendChild(tooltipDiv);
  }
  const tooltipContainer = d3.select("#graph-tooltip");

  const addTooltip = (hoverTooltip, d, x, y) => {
    tooltipContainer.transition().duration(200).style("opacity", 0.9);
    tooltipContainer.transition().duration(200).style("transform", 'scale(1)');
    tooltipContainer
      .html(hoverTooltip(d))
      .style("left", `${x}px`)
      .style("top", `${y - 28}px`);
  };

  const removeTooltip = () => {
    tooltipContainer.transition().duration(200).style("opacity", 0);
    tooltipContainer.transition().duration(200).style("transform", 'scale(0)');
  };

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3.forceLink(links).id((d) => `${d.index}`),
    )
    .force("charge", d3.forceManyBody().strength(strength))
    // .force('center', d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX(width / 2))
    .force("y", d3.forceY(height / 2));

  const svg = d3
    .select(container)
    .append("svg")
    .attr("height", "100%")
    .attr("width", "100%")
    .attr("viewBox", [0, 0, width, height])
    .attr("overflow", "visible")
    .call(
      d3
        .zoom()
        .on("zoom", function (event) {
          svg.attr("transform", event.transform);
        })
        .translateExtent([
          [-400, -400],
          [width + 400, height + 400],
        ]),
    );

  const link = svg
    .append("g")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
  // .join("line")
  // .attr("stroke-width", 1);

  const node = svg
    .append("g")
    // .attr("stroke", "#fff")
    // .attr("stroke-width", 2)
    .selectAll("circle")
    .data(alertNodes)
    .join("circle")
    .attr("r", (d) =>
      Math.sqrt(2) *
      Math.max(1, Math.log(isNaN(d.count) ? 1 : d.count * 20)),
    )
    .attr("fill", (d) => COLOR_MAP[d.group])
  // .call(drag(simulation));

  const hostNode = svg
    .append("g")
    .attr("stroke", "#ff9585")
    .attr("stroke-width", 4)
    .selectAll("rect")
    .data(hostNodes)
    .join("rect")
    .attr("width", 16)
    .attr("height", 16)
    .attr("fill", (d) => COLOR_MAP[d.group])
    .on("dblclick", (event, d) => {
      event.preventDefault();
      console.log(d.entity);
      window.location = (`/view3/?entity=${d.entity}`)
    });

  const hostLabel = svg
    .append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(nodes.filter((node) => node.group === 1)) // hostnodes
    .enter()
    .append("text")
    .text((d) => d.entity.toUpperCase())
    .each(wrap)
    .attr("stroke", "#000")
    .attr("stroke-width", 1)
    .attr('fill', '#ff9585')
    .attr('font-size', '20')
    .attr('font-weight', '900')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')

  // const clusterLabel = svg.append("g")
  //     .attr("class", "labels")
  //     .selectAll("text")
  //     .data(nodes.filter((node) => node.group === 4)) // alert source
  //     .enter()
  //     .append("text")
  //     .text((d) => d.detection_type)
  //     .attr('fill', '#9f9795')
  //     .attr('text-anchor', 'middle')
  //     .attr('dominant-baseline', 'central')

  node
    .on("click", (event, d) => {
      addTooltip((t) => t.group === 4 ? t.detection_type : `${t.name ?? t.detection_type} (${t.count})`, d, event.pageX, event.pageY);
    })
    .on("mouseout", () => {
      removeTooltip();
    });

  simulation.on("tick", () => {
    //update link positions
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    // update node positions
    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y).transition()
      .duration(2000);

    hostNode.attr("x", (d) => d.x - 8).attr("y", (d) => d.y - 8);

    // update label positions
    hostLabel.attr("x", d => d.x).attr("y", d => d.y - 16);
    // clusterLabel.attr("x", d => d.x).attr("y", d => d.y - 16);
  });

  return {
    destroy: () => {
      simulation.stop();
    },
    nodes: () => {
      return svg.node();
    },
  };
}
