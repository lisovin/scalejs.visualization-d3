/*global define*/
define('scalejs.visualization-d3/treemap',[
    'd3'
], function (
    d3
) {
    

    return function () {
        var //Treemap variables
            canvasElement,
            json,
            selectZoom,
            canvasWidth,
            canvasHeight,
            x,
            y,
            root,
            treemapLayout,
            canvasArea,
            lastClickTime;

        // Zoom after click:
        function zoom(d) {
            if (canvasArea === undefined) {
                return; // Catch for if treemap hasn't been setup.
            }
            // Set zoom domain to d's area:
            var kx = canvasWidth / d.dx, ky = canvasHeight / d.dy, t;
            x.domain([d.x, d.x + d.dx]);
            y.domain([d.y, d.y + d.dy]);

            // Animate treemap nodes:
            t = canvasArea.selectAll("group").transition()
                .duration(d3.event ? (d3.event.altKey ? 7500 : 1000) : 1000)
                .attr("left", function (d) { return x(d.x); })
                .attr("top", function (d) { return y(d.y); });

            t.select("rect")
                .attr("width", function (d) { return Math.max(kx * d.dx - 1, 0); })
                .attr("height", function (d) { return Math.max(ky * d.dy - 1, 0); });

            t.select("text")
                .attr("left", function (d) { return kx * d.dx / 2; })
                .attr("top", function (d) { return ky * d.dy / 2; })
                .attr("opacity", function (d) {
                    d.w = this.getWidth();
                    d.h = this.getHeight();
                    var padding = 2 + 2;    // 2 for inside radius, 2 for outside radius.
                    return (kx * (d.dx - padding) >= d.w) && (ky * (d.dy - 2) >= d.h) ? 1 : 0;
                });

            // Prevent event from firing more than once:
            if (d3.event) {
                d3.event.stopPropagation();
            }
        }

        function addNodes(celSel) {
            // Add nodes to Canvas:
            var cell = celSel.enter().append("group")
                .attr("originX", "center")
                .attr("originY", "center")
                .attr("left", function (d) { return d.x; })
                .attr("top", function (d) { return d.y; })
                .on("mousedown", function (d) {
                    var clickTime = (new Date()).getTime();
                    if (clickTime - lastClickTime < 500) {
                        selectZoom(d);
                    }
                    lastClickTime = clickTime;
                });

            // Add rectangle to each node:
            cell.append("rect")
                .attr("width", function (d) { return Math.max(d.dx - 1, 0); })
                .attr("height", function (d) { return Math.max(d.dy - 1, 0); })
                .attr("fill", function (d) { return d.color; });

            // Add title to each node:
            cell.append("text")
                .attr("originX", "center")
                .attr("originY", "center")
                .attr("left", function (d) { return d.dx / 2; })
                .attr("top", function (d) { return d.dy / 2; })
                .attr("fontSize", 11)
                .text(function (d) { return d.name; })
                .attr("opacity", function (d) {
                    d.w = this.getWidth();
                    d.h = this.getHeight();
                    var padding = 2 + 2;    // 2 for inside radius, 2 for outside radius.
                    return (d.dx - padding >= d.w) && (d.dy - 2 >= d.h) ? 1 : 0;
                });
        }

        function update() {
            if (canvasArea === undefined) {
                return; // Catch for if treemap hasn't been setup.
            }
            // Define temp vars:
            var celSel, cell, nodes;

            // Get treemap data:
            root = json();

            // This is a treemap being updated:
            // Filter out nodes with children:
            nodes = treemapLayout.size([canvasWidth, canvasHeight])
                    .nodes(root)
                    .filter(function (d) { return !d.children; });

            // Select all nodes in Canvas, and apply data:
            celSel = canvasArea.selectAll("group")
                    .data(nodes, function (d) { return d.name; });

            // Update nodes on Canvas:
            cell = celSel.transition()
                .duration(1000)
                .attr("left", function (d) { return d.x; })
                .attr("top", function (d) { return d.y; });

            // Update each node's rectangle:
            cell.select("rect")
                .attr("width", function (d) { return Math.max(d.dx - 1, 0); })
                .attr("height", function (d) { return Math.max(d.dy - 1, 0); })
                .attr("fill", function (d) { return d.color; });

            // Update each node's title:
            cell.select("text")
                .attr("left", function (d) { return d.dx / 2; })
                .attr("top", function (d) { return d.dy / 2; })
                .text(function (d) { return d.name; })
                .attr("opacity", function (d) {
                    d.w = this.getWidth();
                    d.h = this.getHeight();
                    var padding = 2 + 2;    // 2 for inside radius, 2 for outside radius.
                    return (d.dx - padding >= d.w) && (d.dy - 2 >= d.h) ? 1 : 0;
                });

            // Add new nodes to Canvas:
            addNodes(celSel);

            // Remove nodes from Canvas:
            cell = celSel.exit().remove();
        }

        function init(
            element,
            width,
            height,
            jsonObservable,
            selectZoomFunction
        ) {
            if (canvasArea !== undefined) {
                return; // Catch for if treemap has been setup.
            }
            canvasElement = element;
            json = jsonObservable;
            canvasWidth = width;
            canvasHeight = height;
            x = d3.scale.linear().range([0, canvasWidth]);
            y = d3.scale.linear().range([0, canvasHeight]);
            selectZoom = selectZoomFunction;

            // Define temp vars:
            var celSel, nodes;

            // Get treemap data:
            root = json();

            // This is a new treemap:
            // Setup treemap and SVG:
            treemapLayout = d3.layout.treemap()
                            .round(false)
                            .size([canvasWidth, canvasHeight])
                            .sticky(false)
                            .mode('squarify')
                            .value(function (d) { return d.size; })
                            .children(function (d) { return d.children; });

            canvasArea = canvasElement.append("group")
                .attr("originX", "center")
                .attr("originY", "center");

            // Filter out nodes with children:
            nodes = treemapLayout.nodes(root)
                    .filter(function (d) { return !d.children; });

            // Join data with selection:
            celSel = canvasArea.selectAll("group")
                    .data(nodes, function (d) { return d.name; });

            // Add nodes to Canvas:
            addNodes(celSel);
        }

        function resize(width, height) {
            canvasWidth = width;
            canvasHeight = height;

            x.range([0, canvasWidth]);
            y.range([0, canvasHeight]);
        }

        function remove() {
            if (canvasArea !== undefined) {
                canvasArea.remove();
                //canvasElement.select("group").remove();
                //canvasArea.selectAll("group").remove();
                canvasArea = undefined;
            }
        }

        // Return treemap object:
        return {
            init: init,
            update: update,
            zoom: zoom,
            resize: resize,
            remove: remove
        };
    };
});
/*global define*/
define('scalejs.visualization-d3/sunburst',[
    'd3'
], function (
    d3
) {
    

    return function () {
        var //Sunburst variables
            canvasElement,
            json,
            selectZoom,
            canvasWidth,
            canvasHeight,
            radius,
            x,
            y,
            root,
            sunburstLayout,
            arc,
            canvasArea,
            lastClickTime;

        function isParentOf(p, c) {
            if (p === c) {
                return true;
            }
            if (p.children) {
                return p.children.some(function (d) {
                    return isParentOf(d, c);
                });
            }
            return false;
        }

        function pathTween(p) {
            return function (d) {
                // Create interpolations used for a nice slide around the parent:
                var interpX = d3.interpolate(this.old.x, d.x),
                    interpY = d3.interpolate(this.old.y, d.y),
                    interpDX = d3.interpolate(this.old.dx, d.dx),
                    interpDY = d3.interpolate(this.old.dy, d.dy),
                    interpXD = d3.interpolate(this.old.xd, [p.x, p.x + p.dx]),
                    interpYD = d3.interpolate(this.old.yd, [p.y, 1]),
                    interpYR = d3.interpolate(this.old.yr, [p.y ? 20 : 0, radius]),
                    // Remember this element:
                    pathElement = this;
                return function (t) { // Interpolate arc:
                    // Store new data in the old property:
                    pathElement.old = {
                        x: interpX(t),
                        y: interpY(t),
                        dx: interpDX(t),
                        dy: interpDY(t),
                        xd: interpXD(t),
                        yd: interpYD(t),
                        yr: interpYR(t)
                    };
                    x.domain(pathElement.old.xd);
                    y.domain(pathElement.old.yd).range(pathElement.old.yr);
                    return arc({
                        x: pathElement.old.x,
                        y: pathElement.old.y,
                        dx: pathElement.old.dx,
                        dy: pathElement.old.dy
                    });
                };
            };
        }
        function textTween(p) {
            return function (d) {
                // Create interpolations used for a nice slide around the parent:
                var interpX = d3.interpolate(this.old.x, d.x),
                    interpY = d3.interpolate(this.old.y, d.y),
                    interpDX = d3.interpolate(this.old.dx, d.dx),
                    interpDY = d3.interpolate(this.old.dy, d.dy),
                    textElement = this;
                return function (t) { // Interpolate attributes:
                    var rad, radless, offsety, angle,
                        outerRadius, innerRadius, padding, arcWidth;
                    // Store new data in the old property:
                    textElement.old = {
                        x: interpX(t),
                        y: interpY(t),
                        dx: interpDX(t),
                        dy: interpDY(t)
                    };

                    // Update data:
                    d.w = this.getWidth();
                    d.h = this.getHeight();

                    // Calculate text angle:
                    rad = x(textElement.old.x + textElement.old.dx / 2);
                    radless = rad - Math.PI / 2;
                    offsety = y(d.y) + 2;
                    angle = rad * 180 / Math.PI - 90;
                    if (angle > 90) {
                        angle = (angle + 180) % 360;
                    }

                    // Change anchor based on side of Sunburst the text is on:
                    textElement.setOriginX((rad > Math.PI ? "right" : "left"));
                    textElement.setLeft(offsety * Math.cos(radless));
                    textElement.setTop(offsety * Math.sin(radless));

                    // Setup variables for opacity:
                    outerRadius = Math.max(0, y(textElement.old.y + textElement.old.dy));
                    innerRadius = Math.max(0, y(textElement.old.y));
                    padding = 2 + 2;    // 2 pixel padding on inner and outer radius
                    arcWidth = (x(textElement.old.x + textElement.old.dx) - x(textElement.old.x)) * y(textElement.old.y);

                    // Change opacity:
                    textElement.setOpacity(isParentOf(p, d) && (outerRadius - innerRadius - padding >= d.w) && ((arcWidth - 2 >= d.h) || y(textElement.old.y) < 1) ? 1 : 0);

                    // Rotate text angle:
                    textElement.setAngle(angle);
                };
            };
        }
        // Zoom after click:
        function zoom(p) {
            if (canvasArea === undefined) {
                return; // Catch for if sunburst hasn't been setup.
            }
            // Animate sunburst nodes:
            var t = canvasArea.selectAll("group")
                .transition()
                .duration(d3.event ? (d3.event.altKey ? 7500 : 1000) : 1000)
                .attr("left", canvasWidth / 2)
                .attr("top", canvasHeight / 2);

            t.select("path")
                .attrTween("d", pathTween(p));

            t.select("text")
                .tween("textTween", textTween(p));

            // Prevent event from firing more than once:
            if (d3.event) {
                d3.event.stopPropagation();
            }
        }

        function addNodes(celSel) {
            // Add nodes to Canvas:
            var cell = celSel.enter().append("group")
                .attr("originX", "center")
                .attr("originY", "center")
                .attr("left", canvasWidth / 2)
                .attr("top", canvasHeight / 2)
                .property("perPixelTargetFind", true)
                .on("mousedown", function (d) {
                    var clickTime = (new Date()).getTime();
                    if (clickTime - lastClickTime < 500) {
                        selectZoom(d);
                    }
                    lastClickTime = clickTime;
                });

            // Add arc to nodes:
            cell.append("path")
                .attr("d", arc)
                .attr("fill", function (d) { return d.color; })
                .each(function (d) {
                    this.old = {
                        x: d.x,
                        y: d.y,
                        dx: d.dx,
                        dy: d.dy,
                        xd: x.domain(),
                        yd: y.domain(),
                        yr: y.range()
                    };
                });

            // Add text to nodes:
            cell.append("text")
                .attr("originX", function (d) { return (x(d.x + d.dx / 2) > Math.PI) ? "right" : "left"; })
                .attr("originY", "center")
                .text(function (d) { return d.name; })
                .attr("fontSize", 11)
                .attr("opacity", function (d) {
                    d.w = this.getWidth();
                    d.bw = y(d.y + d.dy) - y(d.y);
                    d.h = this.getHeight();
                    d.bh = (x(d.x + d.dx) - x(d.x)) * y(d.y);
                    var padding = 2 + 2;    // 2 for inside radius, 2 for outside radius.
                    return (d.bw - padding >= d.w) && ((d.bh - 2 >= d.h) || y(d.y) < 1) ? 1 : 0;
                })
                .attr("angle", function (d) {
                    var ang = x(d.x + d.dx / 2) * 180 / Math.PI - 90;
                    if (ang > 90) {
                        ang = (ang + 180) % 360;
                    }
                    return ang;
                })
                .attr("left", function (d) { return (y(d.y) + 2) * Math.cos(x(d.x + d.dx / 2) - Math.PI / 2); })
                .attr("top", function (d) { return (y(d.y) + 2) * Math.sin(x(d.x + d.dx / 2) - Math.PI / 2); })
                .each(function (d) {
                    this.old = {
                        x: d.x,
                        y: d.y,
                        dx: d.dx,
                        dy: d.dy
                    };
                });
        }

        function update() {
            if (canvasArea === undefined) {
                return; // Catch for if sunburst hasn't been setup.
            }
            // Define temp vars:
            var celSel, cell, nodes;

            // Get treemap data:
            root = json();

            // This is a sunburst being updated:
            // Filter out nodes with children:
            nodes = sunburstLayout.nodes(root);

            // Select all nodes in Canvas, and apply data:
            celSel = canvasArea.selectAll("group")
                .data(nodes, function (d) { return d.name; });

            // Update nodes on Canvas:
            cell = celSel.transition()
                .duration(1000)
                .attr("left", canvasWidth / 2)
                .attr("top", canvasHeight / 2);

            // Update arcs on Canvas:
            cell.select("path")
                .attrTween("d", pathTween(nodes[0]))    // Sunburst Path attrTween animation, zoom to root (node0)
                .attr("fill", function (d) { return d.color; });   //(d.parent ? d.parent.colorScale(d.color) : rootScale(d.color)); });

            // Update titles on Canvas:
            cell.select("text")
                .tween("textTween", textTween(nodes[0]));   // Sunburst Text Tween animation, zoom to root (node0)

            // Add nodes to Canvas:
            addNodes(celSel);

            // Remove nodes from Canvas:
            cell = celSel.exit().remove();
        }

        function init(
            element,
            width,
            height,
            jsonObservable,
            selectZoomFunction
        ) {
            if (canvasArea !== undefined) {
                return; // Catch for if sunburst has been setup.
            }
            canvasElement = element;
            json = jsonObservable;
            canvasWidth = width;
            canvasHeight = height;
            radius = Math.min(canvasWidth, canvasHeight) / 2;
            x = d3.scale.linear().range([0, 2 * Math.PI]);
            y = d3.scale.linear().range([0, radius]);//sqrt
            selectZoom = selectZoomFunction;

            // Define temp vars:
            var celSel, nodes;

            // Get sunburst data:
            root = json();

            // This is a new sunburst:
            // Setup sunburst and Canvas:
            sunburstLayout = d3.layout.partition()
                            .value(function (d) { return d.size; })
                            .children(function (d) { return d.children; });

            canvasArea = canvasElement.append("group")
                .attr("originX", "center")
                .attr("originY", "center");

            // Setup arc function:
            arc = d3.svg.arc()
                .startAngle(function (d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
                .endAngle(function (d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
                .innerRadius(function (d) { return Math.max(0, y(d.y)); })
                .outerRadius(function (d) { return Math.max(0, y(d.y + d.dy)); });

            // Filter out nodes with children:
            nodes = sunburstLayout.nodes(root);

            // Join data with selection:
            celSel = canvasArea.selectAll("group")
                .data(nodes, function (d) { return d.name; });

            // Add nodes to Canvas:
            addNodes(celSel);
        }

        function resize(width, height) {
            canvasWidth = width;
            canvasHeight = height;

            radius = Math.min(canvasWidth, canvasHeight) / 2;
            y.range([0, radius]);
        }

        function remove() {
            if (canvasArea !== undefined) {
                canvasArea.remove();
                //canvasElement.select("group").remove();
                //canvasArea.selectAll("group").remove();
                canvasArea = undefined;
            }
        }

        // Return sunburst object:
        return {
            init: init,
            update: update,
            zoom: zoom,
            resize: resize,
            remove: remove
        };
    };
});

/*global define*/
define('scalejs.visualization-d3/voronoi',[
    'd3'
], function (
    d3
) {
    

    return function () {
        var //Voronoi variables
            data = [{ "count": 174, "coords": ["391.885,330.542", "417.410,334.603", "402.827,370.451", "390.266,365.328"], "name": "Public Services" }, { "count": 442, "color": "#DFDD7A", "coords": ["478.269,458.569", "443.424,465.644", "419.340,440.846", "429.357,403.370", "465.808,397.980", "476.719,404.983"], "name": "College/University", "children": [{ "count": 442, "color": "#DFDD7A", "coords": ["457.101,462.867", "443.424,465.644", "419.340,440.846", "424.298,422.298", "441.700,415.308", "451.918,416.594", "467.742,431.129"], "name": "College/University (general)" }, { "count": 168, "coords": ["477.446,430.126", "478.269,458.569", "457.101,462.867", "467.742,431.129"], "name": "Graduate School" }, { "count": 159, "coords": ["477.446,430.126", "467.742,431.129", "451.918,416.594", "458.625,399.042", "465.808,397.980", "476.719,404.983"], "name": "Financial Aid" }, { "count": 29, "coords": ["437.840,402.116", "458.625,399.042", "451.918,416.594", "441.700,415.308"], "name": "UVSC/UVU" }, { "count": 22, "coords": ["424.298,422.298", "429.357,403.370", "437.840,402.116", "441.700,415.308"], "name": "University of Utah" }] }, { "count": 135, "coords": ["254.187,545.597", "239.937,555.697", "219.040,522.646", "237.922,517.638"], "name": "Family History/Genealogy" }, { "count": 19, "coords": ["0.000,338.881", "28.012,342.780", "33.436,355.324", "0.000,374.860"], "name": "Human Rights" }, { "count": 51, "coords": ["466.935,204.335", "464.219,194.778", "475.897,168.726", "513.262,178.585", "508.094,200.279"], "name": "Architecture" }, { "count": 299, "coords": ["180.958,406.709", "152.806,416.431", "141.547,402.486", "170.266,378.235"], "name": "Statistics" }, { "count": 952, "color": "#003A80", "coords": ["264.022,0.000", "420.775,0.000", "445.396,147.850", "430.128,179.696", "409.728,205.539", "368.349,227.792", "331.505,234.468", "271.667,222.711", "239.090,197.881", "215.441,165.841", "205.534,87.744", "218.673,52.874"], "name": "BYU", "children": [{ "count": 2344, "coords": ["427.072,37.815", "436.032,91.621", "408.668,122.885", "383.213,131.995", "349.469,125.059", "330.390,106.917", "319.965,84.093", "319.289,63.748", "337.172,32.739", "344.637,27.109", "390.944,18.537"], "name": "Academics", "children": [{ "count": 2344, "coords": ["430.318,57.307", "397.849,126.757", "383.213,131.995", "349.469,125.059", "330.390,106.917", "319.965,84.093", "319.289,63.748", "337.172,32.739", "344.637,27.109", "390.944,18.537", "427.072,37.815"], "name": "Academics (general)" }, { "count": 223, "coords": ["397.849,126.757", "430.318,57.307", "436.032,91.621", "408.668,122.885"], "name": "Departments" }] }, { "count": 1216, "coords": ["238.039,196.458", "215.441,165.841", "209.197,116.621", "279.619,131.947", "287.246,161.078", "276.646,180.114"], "name": "Student Life" }, { "count": 962, "coords": ["244.605,22.638", "288.501,28.373", "301.372,36.881", "319.289,63.748", "319.965,84.093", "311.362,106.244", "294.410,125.043", "279.619,131.947", "209.197,116.621", "205.534,87.744", "218.673,52.874"], "name": "Campus (physical)", "children": [{ "count": 1100, "coords": ["269.972,25.952", "278.133,131.624", "209.197,116.621", "205.534,87.744", "218.673,52.874", "244.605,22.638"], "name": "Buildings", "children": [{ "count": 1100, "coords": ["273.014,65.333", "278.133,131.624", "209.197,116.621", "205.534,87.744", "217.081,57.099"], "name": "Buildings (general)" }, { "count": 423, "coords": ["273.014,65.333", "217.081,57.099", "218.673,52.874", "244.605,22.638", "269.972,25.952"], "name": "Library" }] }, { "count": 962, "coords": ["269.972,25.952", "288.501,28.373", "301.372,36.881", "319.289,63.748", "319.965,84.093", "311.362,106.244", "294.410,125.043", "279.619,131.947", "278.133,131.624"], "name": "Campus (physical) (general)" }] }, { "count": 952, "color": "#003A80", "coords": ["383.213,131.995", "392.467,145.532", "392.623,177.936", "391.036,180.286", "379.060,190.009", "351.861,193.948", "327.448,175.826", "324.743,157.562", "333.472,136.790", "349.469,125.059"], "name": "BYU (general)" }, { "count": 652, "coords": ["348.849,231.325", "331.505,234.468", "302.920,228.852", "298.290,192.649", "304.987,184.261", "327.448,175.826", "351.861,193.948"], "name": "Athletics" }, { "count": 488, "coords": ["441.798,155.354", "430.128,179.696", "424.961,186.241", "392.623,177.936", "392.467,145.532", "413.607,132.337", "425.997,136.130"], "name": "Activities/Events" }, { "count": 404, "coords": ["392.499,0.000", "390.944,18.537", "344.637,27.109", "341.833,0.000"], "name": "Honor Code" }, { "count": 355, "coords": ["265.549,218.049", "239.090,197.881", "238.039,196.458", "276.646,180.114", "286.581,192.665", "276.284,213.519"], "name": "Culture" }, { "count": 335, "coords": ["391.429,215.380", "368.349,227.792", "348.849,231.325", "351.861,193.948", "379.060,190.009"], "name": "Network/Email" }, { "count": 314, "coords": ["290.513,0.000", "288.501,28.373", "244.605,22.638", "264.022,0.000"], "name": "Admissions" }, { "count": 251, "coords": ["436.032,91.621", "442.196,128.634", "425.997,136.130", "413.607,132.337", "408.668,122.885"], "name": "Clubs" }, { "count": 234, "coords": ["290.513,0.000", "320.150,0.000", "321.425,25.004", "301.372,36.881", "288.501,28.373"], "name": "Dining" }, { "count": 215, "coords": ["302.920,228.852", "281.878,224.718", "276.284,213.519", "286.581,192.665", "298.290,192.649"], "name": "BYU Rumors/Myths" }, { "count": 206, "coords": ["392.499,0.000", "420.775,0.000", "427.072,37.815", "390.944,18.537"], "name": "Policy" }, { "count": 176, "coords": ["291.397,161.386", "287.246,161.078", "279.619,131.947", "294.410,125.043", "304.912,133.037", "305.234,151.747"], "name": "Freshmen" }, { "count": 168, "coords": ["324.743,157.562", "327.448,175.826", "304.987,184.261", "291.397,161.386", "305.234,151.747"], "name": "Devotionals/Forums" }, { "count": 152, "coords": ["337.172,32.739", "319.289,63.748", "301.372,36.881", "321.425,25.004"], "name": "Faculty/Staff" }, { "count": 130, "coords": ["304.912,133.037", "320.509,127.278", "333.472,136.790", "324.743,157.562", "305.234,151.747"], "name": "Graduation" }, { "count": 99, "coords": ["333.472,136.790", "320.509,127.278", "321.630,111.786", "330.390,106.917", "349.469,125.059"], "name": "Bookstore" }, { "count": 92, "coords": ["304.987,184.261", "298.290,192.649", "286.581,192.665", "276.646,180.114", "287.246,161.078", "291.397,161.386"], "name": "BYUSA" }, { "count": 87, "coords": ["404.172,208.527", "391.429,215.380", "379.060,190.009", "391.036,180.286"], "name": "Study Abroad", "children": [{ "count": 87, "coords": ["399.365,211.112", "390.010,212.470", "379.060,190.009", "391.036,180.286", "404.172,208.527"], "name": "Study Abroad (general)" }, { "count": 3, "coords": ["399.365,211.112", "391.429,215.380", "390.010,212.470"], "name": "Travel Study" }] }, { "count": 79, "coords": ["321.630,111.786", "320.509,127.278", "304.912,133.037", "294.410,125.043", "311.362,106.244"], "name": "History" }, { "count": 40, "coords": ["442.196,128.634", "445.396,147.850", "441.798,155.354", "425.997,136.130"], "name": "Financial Aid" }, { "count": 32, "coords": ["383.213,131.995", "408.668,122.885", "413.607,132.337", "392.467,145.532"], "name": "Continuing Education" }, { "count": 31, "coords": ["424.961,186.241", "409.728,205.539", "404.172,208.527", "391.036,180.286", "392.623,177.936"], "name": "Publications", "children": [{ "count": 88, "coords": ["397.607,194.414", "407.803,181.835", "424.961,186.241", "409.728,205.539", "404.172,208.527"], "name": "Daily Universe" }, { "count": 31, "coords": ["407.803,181.835", "397.607,194.414", "391.036,180.286", "392.623,177.936"], "name": "Publications (general)" }] }, { "count": 20, "coords": ["320.150,0.000", "341.833,0.000", "344.637,27.109", "337.172,32.739", "321.425,25.004"], "name": "Alumni" }, { "count": 14, "coords": ["319.965,84.093", "330.390,106.917", "321.630,111.786", "311.362,106.244"], "name": "Advertising" }, { "count": 11, "coords": ["281.878,224.718", "271.667,222.711", "265.549,218.049", "276.284,213.519"], "name": "Salt Lake Center" }] }, { "count": 200, "coords": ["447.186,551.922", "422.410,568.721", "407.588,563.315", "409.045,528.356", "422.028,524.448"], "name": "Restaurants" }, { "count": 142, "coords": ["600.000,570.642", "600.000,600.000", "560.657,600.000", "558.295,577.129", "574.901,563.538"], "name": "Cartoons" }, { "count": 522, "coords": ["39.072,0.000", "0.000,35.089", "0.000,0.000"], "name": "Strange Things People Do" }, { "count": 129, "coords": ["183.037,42.406", "176.150,77.097", "151.579,79.814", "143.605,40.170", "157.101,32.876"], "name": "Military" }, { "count": 23, "color": "#405D80", "coords": ["67.411,362.161", "33.436,355.324", "28.012,342.780", "49.727,309.314", "78.330,315.870"], "name": "Games", "children": [{ "count": 376, "coords": ["71.367,345.387", "45.128,344.639", "34.957,332.077", "49.727,309.314", "78.330,315.870"], "name": "Computer/Video Games" }, { "count": 160, "coords": ["71.367,345.387", "67.411,362.161", "40.954,356.837", "45.128,344.639"], "name": "Board & Card Games" }, { "count": 23, "color": "#405D80", "coords": ["40.954,356.837", "33.436,355.324", "28.012,342.780", "34.957,332.077", "45.128,344.639"], "name": "Games (general)" }] }, { "count": 574, "color": "#003A80", "coords": ["0.000,374.860", "33.436,355.324", "67.411,362.161", "89.051,397.570", "74.291,436.732", "32.409,449.004", "0.000,429.573"], "name": "Utah", "children": [{ "count": 1054, "coords": ["53.800,359.422", "67.411,362.161", "89.051,397.570", "74.291,436.732", "40.360,446.674", "18.563,409.815"], "name": "Provo/Orem Community" }, { "count": 574, "color": "#003A80", "coords": ["0.000,408.030", "0.000,374.860", "33.436,355.324", "53.800,359.422", "18.563,409.815"], "name": "Utah (general)" }, { "count": 22, "coords": ["0.000,408.030", "18.563,409.815", "40.360,446.674", "32.409,449.004", "0.000,429.573"], "name": "University of Utah" }] }, { "count": 88, "coords": ["207.225,315.358", "214.178,274.973", "231.142,274.024", "238.164,312.177"], "name": "Humanitarian Aid/Projects" }, { "count": 489, "coords": ["200.539,177.240", "211.414,217.264", "205.559,221.398", "169.733,218.436", "162.488,185.999"], "name": "Electronics/Technology" }, { "count": 1603, "color": "#008963", "coords": ["139.230,295.562", "166.255,319.932", "176.768,345.653", "170.266,378.235", "141.547,402.486", "103.630,404.456", "89.051,397.570", "67.411,362.161", "78.330,315.870"], "name": "Language & Linguistics", "children": [{ "count": 1603, "color": "#008963", "coords": ["98.478,309.152", "139.230,295.562", "166.255,319.932", "176.768,345.653", "170.266,378.235", "143.679,400.685", "95.759,367.784"], "name": "Language & Linguistics (general)" }, { "count": 384, "coords": ["98.478,309.152", "95.759,367.784", "76.439,376.933", "67.411,362.161", "78.330,315.870"], "name": "English Usage/Grammar" }, { "count": 338, "coords": ["143.679,400.685", "141.547,402.486", "103.630,404.456", "89.051,397.570", "76.439,376.933", "95.759,367.784"], "name": "Etymology" }] }, { "count": 5135, "coords": ["0.000,149.351", "0.000,35.089", "39.072,0.000", "109.950,0.000", "143.605,40.170", "151.579,79.814", "117.111,141.426"], "name": "Comments" }, { "count": 263, "coords": ["156.166,489.182", "134.489,459.318", "151.456,447.247", "159.510,451.182", "171.865,480.587"], "name": "Telephones" }, { "count": 30, "coords": ["215.617,431.486", "194.899,440.709", "195.232,421.208"], "name": "Olympics" }, { "count": 210, "color": "#405D80", "coords": ["600.000,387.286", "600.000,466.078", "555.125,494.075", "516.783,494.394", "478.269,458.569", "476.719,404.983", "503.835,371.807", "549.871,360.489"], "name": "Entertainment", "children": [{ "count": 1833, "coords": ["600.000,428.551", "600.000,466.078", "555.125,494.075", "516.783,494.394", "495.634,474.722", "511.378,419.935", "522.942,411.554"], "name": "Movies" }, { "count": 1195, "coords": ["522.012,367.338", "549.871,360.489", "600.000,387.286", "600.000,428.551", "522.942,411.554"], "name": "Television", "children": [{ "count": 1195, "coords": ["522.307,381.351", "534.092,364.369", "549.871,360.489", "600.000,387.286", "600.000,428.551", "522.942,411.554"], "name": "Television (general)" }, { "count": 27, "coords": ["534.092,364.369", "522.307,381.351", "522.012,367.338"], "name": "Commercials" }] }, { "count": 210, "color": "#405D80", "coords": ["495.634,474.722", "478.269,458.569", "476.834,408.955", "511.378,419.935"], "name": "Entertainment (general)" }, { "count": 174, "coords": ["522.012,367.338", "522.942,411.554", "511.378,419.935", "476.834,408.955", "476.719,404.983", "503.835,371.807"], "name": "Theater" }] }, { "count": 140, "color": "#008963", "coords": ["382.968,600.000", "305.071,600.000", "284.693,547.588", "300.301,505.033", "327.423,485.171", "352.381,481.327", "379.931,490.781", "409.045,528.356", "407.588,563.315"], "name": "Social Science", "children": [{ "count": 968, "coords": ["346.315,600.000", "337.605,541.971", "365.115,523.336", "381.514,524.860", "408.373,544.484", "407.588,563.315", "382.968,600.000"], "name": "Government/Politics", "children": [{ "count": 968, "coords": ["387.713,592.929", "343.174,579.076", "337.605,541.971", "365.115,523.336", "381.514,524.860", "408.373,544.484", "407.588,563.315"], "name": "Government/Politics (general)" }, { "count": 94, "coords": ["387.713,592.929", "382.968,600.000", "346.315,600.000", "343.174,579.076"], "name": "International Relations", "children": [{ "count": 94, "coords": ["366.266,586.258", "362.795,600.000", "346.315,600.000", "343.174,579.076"], "name": "International Relations (general)" }, { "count": 46, "coords": ["369.621,587.302", "387.713,592.929", "382.968,600.000", "368.667,600.000"], "name": "Immigration" }, { "count": 17, "coords": ["366.266,586.258", "369.621,587.302", "368.667,600.000", "362.795,600.000"], "name": "Wars" }] }] }, { "count": 817, "coords": ["346.315,600.000", "305.071,600.000", "284.767,547.778", "330.404,538.168", "337.605,541.971"], "name": "Psychology" }, { "count": 258, "coords": ["341.802,502.937", "360.003,510.129", "365.115,523.336", "337.605,541.971", "330.404,538.168", "327.347,513.037"], "name": "Geography" }, { "count": 140, "color": "#008963", "coords": ["374.335,488.861", "379.931,490.781", "394.509,509.595", "381.514,524.860", "365.115,523.336", "360.003,510.129"], "name": "Social Science (general)" }, { "count": 127, "coords": ["339.149,483.365", "352.381,481.327", "374.335,488.861", "360.003,510.129", "341.802,502.937"], "name": "Economics" }, { "count": 72, "coords": ["408.373,544.484", "381.514,524.860", "394.509,509.595", "409.045,528.356"], "name": "Symbols" }, { "count": 69, "coords": ["307.500,499.761", "327.423,485.171", "339.149,483.365", "341.802,502.937", "327.347,513.037"], "name": "Traditions" }, { "count": 13, "coords": ["284.767,547.778", "284.693,547.588", "300.301,505.033", "307.500,499.761", "327.347,513.037", "330.404,538.168"], "name": "History", "children": [{ "count": 190, "coords": ["318.634,540.646", "284.767,547.778", "284.693,547.588", "296.160,516.323", "317.514,527.562"], "name": "World" }, { "count": 168, "coords": ["328.240,520.383", "317.514,527.562", "296.160,516.323", "300.301,505.033", "307.500,499.761", "327.347,513.037"], "name": "United States" }, { "count": 13, "coords": ["328.240,520.383", "330.404,538.168", "318.634,540.646", "317.514,527.562"], "name": "History (general)" }] }] }, { "count": 1081, "color": "#008963", "coords": ["522.463,266.864", "560.562,294.270", "566.208,327.967", "549.871,360.489", "503.835,371.807", "481.264,360.862", "457.039,322.416", "478.256,277.838"], "name": "Medical/Body", "children": [{ "count": 1081, "color": "#008963", "coords": ["508.547,270.319", "531.773,318.780", "480.583,359.781", "457.039,322.416", "478.256,277.838"], "name": "Medical/Body (general)" }, { "count": 652, "coords": ["556.554,347.186", "549.871,360.489", "503.835,371.807", "481.264,360.862", "480.583,359.781", "531.773,318.780", "533.524,319.180"], "name": "Anatomy/Physiology" }, { "count": 358, "coords": ["508.547,270.319", "522.463,266.864", "560.562,294.270", "561.961,302.617", "533.524,319.180", "531.773,318.780"], "name": "Products" }, { "count": 30, "coords": ["561.961,302.617", "566.208,327.967", "556.554,347.186", "533.524,319.180"], "name": "Research" }] }, { "count": 116, "coords": ["109.950,0.000", "161.185,0.000", "157.101,32.876", "143.605,40.170"], "name": "BYU-I/Rexburg Community" }, { "count": 728, "color": "#008963", "coords": ["558.295,577.129", "519.398,574.361", "497.241,544.413", "516.783,494.394", "555.125,494.075", "584.186,528.267", "574.901,563.538"], "name": "Sports", "children": [{ "count": 728, "color": "#008963", "coords": ["504.402,554.092", "573.882,516.144", "584.186,528.267", "574.901,563.538", "558.295,577.129", "519.398,574.361"], "name": "Sports (general)" }, { "count": 652, "coords": ["573.882,516.144", "504.402,554.092", "497.241,544.413", "516.783,494.394", "555.125,494.075"], "name": "Athletics" }] }, { "count": 209, "color": "#008963", "coords": ["404.508,446.539", "419.340,440.846", "443.424,465.644", "429.246,479.978", "403.694,471.031"], "name": "Advertising", "children": [{ "count": 209, "color": "#008963", "coords": ["404.211,455.464", "422.464,444.062", "443.424,465.644", "429.246,479.978", "403.694,471.031"], "name": "Advertising (general)" }, { "count": 27, "coords": ["422.464,444.062", "404.211,455.464", "404.508,446.539", "419.340,440.846"], "name": "Commercials" }] }, { "count": 150, "coords": ["176.150,77.097", "183.037,42.406", "192.364,38.085", "218.673,52.874", "205.534,87.744"], "name": "Dance" }, { "count": 787, "color": "#405D80", "coords": ["478.256,277.838", "457.039,322.416", "417.410,334.603", "391.885,330.542", "355.146,302.846", "351.524,261.964", "368.349,227.792", "409.728,205.539", "454.265,222.658"], "name": "Music", "children": [{ "count": 787, "color": "#405D80", "coords": ["424.041,211.041", "454.265,222.658", "466.839,251.580", "434.851,276.059", "420.006,273.959", "403.142,259.339", "398.561,237.437", "400.311,232.999"], "name": "Music (general)" }, { "count": 501, "coords": ["352.500,272.988", "351.524,261.964", "368.349,227.792", "369.070,227.404", "398.561,237.437", "403.142,259.339", "396.553,271.664", "384.439,279.508"], "name": "Bands/Artists" }, { "count": 382, "coords": ["465.934,303.726", "442.110,295.450", "434.851,276.059", "466.839,251.580", "478.256,277.838"], "name": "Audio/Radio" }, { "count": 285, "coords": ["374.173,317.190", "355.146,302.846", "352.500,272.988", "384.439,279.508", "389.296,297.418"], "name": "Lyrics" }, { "count": 282, "coords": ["410.819,333.554", "391.885,330.542", "374.173,317.190", "389.296,297.418", "406.922,297.028", "418.165,310.026"], "name": "Soundtracks" }, { "count": 245, "coords": ["429.570,310.144", "418.165,310.026", "406.922,297.028", "410.651,281.414", "420.006,273.959", "434.851,276.059", "442.110,295.450"], "name": "LDS Music" }, { "count": 195, "coords": ["465.934,303.726", "457.039,322.416", "438.376,328.155", "429.570,310.144", "442.110,295.450"], "name": "Instruments" }, { "count": 130, "coords": ["424.041,211.041", "400.311,232.999", "391.175,215.516", "409.728,205.539"], "name": "Downloads" }, { "count": 122, "coords": ["410.651,281.414", "406.922,297.028", "389.296,297.418", "384.439,279.508", "396.553,271.664"], "name": "Sheet Music" }, { "count": 100, "coords": ["438.376,328.155", "417.410,334.603", "410.819,333.554", "418.165,310.026", "429.570,310.144"], "name": "Vocal" }, { "count": 52, "coords": ["403.142,259.339", "420.006,273.959", "410.651,281.414", "396.553,271.664"], "name": "Videos" }, { "count": 45, "coords": ["369.070,227.404", "391.175,215.516", "400.311,232.999", "398.561,237.437"], "name": "Classical" }] }, { "count": 447, "coords": ["600.000,466.078", "600.000,526.415", "584.186,528.267", "555.125,494.075"], "name": "Etiquette" }, { "count": 371, "coords": ["352.381,481.327", "327.423,485.171", "312.224,463.585", "320.654,440.967", "349.484,438.127", "351.272,439.316"], "name": "Business" }, { "count": 71, "coords": ["362.601,398.350", "378.732,409.937", "379.127,429.513", "351.272,439.316", "349.484,438.127", "345.854,411.932"], "name": "Appliances" }, { "count": 15, "coords": ["464.219,194.778", "466.935,204.335", "454.265,222.658", "409.728,205.539", "430.128,179.696"], "name": "Mechanics" }, { "count": 305, "coords": ["312.224,463.585", "327.423,485.171", "300.301,505.033", "274.770,479.510"], "name": "Quotes/Speeches" }, { "count": 320, "color": "#003A80", "coords": ["290.298,387.892", "283.411,406.097", "247.950,434.397", "215.617,431.486", "195.232,421.208", "180.958,406.709", "170.266,378.235", "176.768,345.653", "202.597,318.119", "207.225,315.358", "238.164,312.177", "286.220,345.382"], "name": "Computers", "children": [{ "count": 1269, "coords": ["248.017,318.985", "261.172,351.204", "261.464,355.467", "251.200,381.098", "219.224,393.305", "190.860,379.576", "175.821,350.398", "176.768,345.653", "202.597,318.119", "207.225,315.358", "238.164,312.177"], "name": "Internet (general)" }, { "count": 534, "coords": ["273.063,414.355", "247.950,434.397", "226.622,432.477", "215.974,409.688", "219.224,393.305", "251.200,381.098", "251.822,381.387"], "name": "Software" }, { "count": 320, "color": "#003A80", "coords": ["198.150,422.679", "195.232,421.208", "180.958,406.709", "174.926,390.643", "190.860,379.576", "219.224,393.305", "215.974,409.688"], "name": "Computers (general)" }, { "count": 278, "coords": ["289.009,374.457", "290.298,387.892", "283.411,406.097", "273.063,414.355", "251.822,381.387", "270.282,370.576"], "name": "Hardware" }, { "count": 116, "coords": ["248.017,318.985", "275.315,337.847", "261.172,351.204"], "name": "Programming" }, { "count": 89, "coords": ["174.926,390.643", "170.266,378.235", "175.821,350.398", "190.860,379.576"], "name": "Music" }, { "count": 84, "coords": ["226.622,432.477", "215.617,431.486", "198.150,422.679", "215.974,409.688"], "name": "Browsers" }, { "count": 32, "coords": ["275.315,337.847", "286.220,345.382", "286.656,349.925", "266.241,358.297", "261.464,355.467", "261.172,351.204"], "name": "Networking" }, { "count": 21, "coords": ["266.241,358.297", "270.282,370.576", "251.822,381.387", "251.200,381.098", "261.464,355.467"], "name": "Computer Science" }, { "count": 4, "coords": ["286.656,349.925", "289.009,374.457", "270.282,370.576", "266.241,358.297"], "name": "Operating Systems", "children": [{ "count": 43, "coords": ["273.619,355.271", "286.656,349.925", "288.147,365.469", "284.574,367.117", "276.464,366.110", "275.583,365.311"], "name": "Mac or PC" }, { "count": 19, "coords": ["273.619,355.271", "275.583,365.311", "269.148,367.131", "266.241,358.297"], "name": "Mac" }, { "count": 12, "coords": ["283.858,373.389", "275.573,371.672", "276.464,366.110", "284.574,367.117"], "name": "Windows" }, { "count": 5, "coords": ["269.148,367.131", "275.583,365.311", "276.464,366.110", "275.573,371.672", "270.282,370.576"], "name": "Linux" }, { "count": 4, "coords": ["288.147,365.469", "289.009,374.457", "283.858,373.389", "284.574,367.117"], "name": "Operating Systems (general)" }] }] }, { "count": 1719, "coords": ["139.234,600.000", "163.994,526.165", "197.572,515.642", "219.040,522.646", "239.937,555.697", "232.316,600.000"], "name": "Random" }, { "count": 323, "coords": ["246.803,241.952", "219.557,216.966", "239.090,197.881", "271.667,222.711"], "name": "Trivia/Riddles" }, { "count": 225, "coords": ["445.396,147.850", "475.897,168.726", "464.219,194.778", "430.128,179.696"], "name": "Philosophy" }, { "count": 817, "coords": ["305.071,600.000", "232.316,600.000", "239.937,555.697", "254.187,545.597", "284.693,547.588"], "name": "Products" }, { "count": 117, "coords": ["600.000,244.061", "600.000,290.681", "568.810,287.561", "569.027,256.126"], "name": "News Media" }, { "count": 385, "coords": ["176.216,480.370", "197.572,515.642", "163.994,526.165", "156.166,489.182", "171.865,480.587"], "name": "Questions about Girls" }, { "count": 858, "color": "#405D80", "coords": ["139.234,600.000", "0.000,600.000", "0.000,478.820", "32.409,449.004", "74.291,436.732", "95.770,439.440", "134.489,459.318", "156.166,489.182", "163.994,526.165"], "name": "Relationships", "children": [{ "count": 1626, "coords": ["39.142,447.031", "74.291,436.732", "95.770,439.440", "120.926,452.355", "127.160,488.935", "122.612,504.757", "95.020,528.252", "48.631,517.900", "32.857,492.840"], "name": "Dating", "children": [{ "count": 1626, "coords": ["117.893,450.798", "114.003,512.088", "95.020,528.252", "48.631,517.900", "32.857,492.840", "39.142,447.031", "74.291,436.732", "95.770,439.440"], "name": "Dating (general)" }, { "count": 120, "coords": ["117.893,450.798", "120.926,452.355", "127.160,488.935", "122.612,504.757", "114.003,512.088"], "name": "Dating Ideas" }] }, { "count": 858, "color": "#405D80", "coords": ["162.777,520.416", "163.994,526.165", "149.808,568.466", "107.258,565.528", "97.628,555.501", "95.020,528.252", "122.612,504.757"], "name": "Relationships (general)" }, { "count": 659, "coords": ["0.000,556.261", "34.959,549.026", "56.857,574.988", "54.946,600.000", "0.000,600.000"], "name": "Marriage" }, { "count": 539, "coords": ["106.523,600.000", "54.946,600.000", "56.857,574.988", "97.628,555.501", "107.258,565.528"], "name": "Friends" }, { "count": 365, "coords": ["48.631,517.900", "95.020,528.252", "97.628,555.501", "56.857,574.988", "34.959,549.026", "40.181,525.660"], "name": "Family", "children": [{ "count": 365, "coords": ["60.922,573.045", "64.970,521.546", "95.020,528.252", "97.628,555.501"], "name": "Family (general)" }, { "count": 320, "coords": ["64.970,521.546", "60.922,573.045", "56.857,574.988", "34.959,549.026", "40.181,525.660", "48.631,517.900"], "name": "Parenting" }] }, { "count": 358, "coords": ["0.000,556.261", "0.000,515.600", "20.030,511.711", "40.181,525.660", "34.959,549.026"], "name": "Affection" }, { "count": 336, "coords": ["106.523,600.000", "107.258,565.528", "149.808,568.466", "139.234,600.000"], "name": "Wedding Prep." }, { "count": 268, "coords": ["0.000,481.505", "0.000,478.820", "32.409,449.004", "39.142,447.031", "32.857,492.840", "27.755,494.350"], "name": "Roommates" }, { "count": 228, "coords": ["162.777,520.416", "122.612,504.757", "127.160,488.935", "149.522,480.030", "156.166,489.182"], "name": "Breaking Up" }, { "count": 101, "coords": ["120.926,452.355", "134.489,459.318", "149.522,480.030", "127.160,488.935"], "name": "Long Distance", "children": [{ "count": 101, "coords": ["130.491,487.608", "127.160,488.935", "120.926,452.355", "134.489,459.318", "144.388,472.957"], "name": "Long Distance (general)" }, { "count": 20, "coords": ["130.491,487.608", "144.388,472.957", "149.522,480.030"], "name": "Long Distance Relationships with Missionaries" }] }, { "count": 59, "coords": ["20.030,511.711", "27.755,494.350", "32.857,492.840", "48.631,517.900", "40.181,525.660"], "name": "Singles" }, { "count": 53, "coords": ["0.000,515.600", "0.000,481.505", "27.755,494.350", "20.030,511.711"], "name": "Chastity" }] }, { "count": 538, "color": "#003A80", "coords": ["134.489,459.318", "95.770,439.440", "103.630,404.456", "141.547,402.486", "152.806,416.431", "151.456,447.247"], "name": "Money/Finance", "children": [{ "count": 538, "color": "#003A80", "coords": ["152.409,425.492", "118.902,451.316", "95.770,439.440", "103.630,404.456", "141.547,402.486", "152.806,416.431"], "name": "Money/Finance (general)" }, { "count": 143, "coords": ["118.902,451.316", "152.409,425.492", "151.456,447.247", "134.489,459.318"], "name": "Insurance" }] }, { "count": 902, "coords": ["270.520,478.623", "247.950,434.397", "283.411,406.097", "311.754,419.503", "320.654,440.967", "312.224,463.585", "274.770,479.510"], "name": "Employment" }, { "count": 101, "coords": ["283.411,406.097", "290.298,387.892", "322.007,391.152", "324.637,404.053", "311.754,419.503"], "name": "History of" }, { "count": 451, "coords": ["152.806,416.431", "180.958,406.709", "195.232,421.208", "194.899,440.709", "184.480,451.992", "159.510,451.182", "151.456,447.247"], "name": "Questions about Guys" }, { "count": 234, "coords": ["512.775,600.000", "519.398,574.361", "558.295,577.129", "560.657,600.000"], "name": "How Stuff Works" }, { "count": 5, "coords": ["200.539,177.240", "215.441,165.841", "239.090,197.881", "219.557,216.966", "211.414,217.264"], "name": "General Reference" }, { "count": 115, "coords": ["465.808,397.980", "481.264,360.862", "503.835,371.807", "476.719,404.983"], "name": "Mail" }, { "count": 36, "color": "#DFDD7A", "coords": ["351.524,261.964", "331.505,234.468", "368.349,227.792"], "name": "Education", "children": [{ "count": 150, "coords": ["358.166,248.474", "341.709,248.483", "331.505,234.468", "368.349,227.792"], "name": "Teaching" }, { "count": 36, "color": "#DFDD7A", "coords": ["358.166,248.474", "351.524,261.964", "341.709,248.483"], "name": "Education (general)" }] }, { "count": 73, "coords": ["600.000,526.415", "600.000,570.642", "574.901,563.538", "584.186,528.267"], "name": "High School" }, { "count": 350, "coords": ["568.810,287.561", "560.562,294.270", "522.463,266.864", "531.890,249.878", "569.027,256.126"], "name": "House and Home" }, { "count": 503, "coords": ["600.000,329.010", "600.000,387.286", "549.871,360.489", "566.208,327.967"], "name": "Religion" }, { "count": 20, "coords": ["176.768,345.653", "166.255,319.932", "202.597,318.119"], "name": "BYU-H" }, { "count": 766, "color": "#003A80", "coords": ["360.566,385.405", "333.970,376.812", "318.771,339.527", "355.146,302.846", "391.885,330.542", "390.266,365.328"], "name": "Legal (law)", "children": [{ "count": 766, "color": "#003A80", "coords": ["388.118,366.780", "360.566,385.405", "333.970,376.812", "318.771,339.527", "332.805,325.375", "373.849,331.558"], "name": "Legal (law) (general)" }, { "count": 242, "coords": ["332.805,325.375", "355.146,302.846", "381.231,322.511", "373.849,331.558"], "name": "Law Enforcement" }, { "count": 46, "coords": ["388.118,366.780", "373.849,331.558", "381.231,322.511", "391.885,330.542", "390.266,365.328"], "name": "Immigration" }] }, { "count": 210, "color": "#003A80", "coords": ["382.968,600.000", "407.588,563.315", "422.410,568.721", "428.988,600.000"], "name": "Environment/Nature", "children": [{ "count": 210, "color": "#003A80", "coords": ["392.714,600.000", "388.317,592.030", "407.588,563.315", "422.410,568.721", "428.988,600.000"], "name": "Environment/Nature (general)" }, { "count": 8, "coords": ["392.714,600.000", "382.968,600.000", "388.317,592.030"], "name": "Recycling" }] }, { "count": 1049, "color": "#003A80", "coords": ["0.000,274.951", "0.000,149.351", "117.111,141.426", "162.488,185.999", "169.733,218.436", "165.252,254.816", "139.230,295.562", "78.330,315.870", "49.727,309.314"], "name": "Board", "children": [{ "count": 3317, "coords": ["128.275,152.392", "162.488,185.999", "169.733,218.436", "165.252,254.816", "139.230,295.562", "111.481,304.815", "59.496,283.284", "31.900,225.409", "37.120,198.413", "64.089,164.017"], "name": "Writers", "children": [{ "count": 3317, "coords": ["165.371,253.848", "53.886,271.519", "31.900,225.409", "37.120,198.413", "64.089,164.017", "128.275,152.392", "162.488,185.999", "169.733,218.436"], "name": "Writers (general)" }, { "count": 825, "coords": ["165.371,253.848", "165.252,254.816", "139.230,295.562", "111.481,304.815", "59.496,283.284", "53.886,271.519"], "name": "What's your favorite" }] }, { "count": 1049, "color": "#003A80", "coords": ["42.153,304.080", "0.000,274.951", "0.000,231.857", "31.900,225.409", "59.496,283.284"], "name": "Board (general)" }, { "count": 688, "coords": ["0.000,185.983", "0.000,149.351", "58.715,145.378", "64.089,164.017", "37.120,198.413"], "name": "System" }, { "count": 244, "coords": ["0.000,231.857", "0.000,185.983", "37.120,198.413", "31.900,225.409"], "name": "Readers" }, { "count": 211, "coords": ["58.715,145.378", "117.111,141.426", "128.275,152.392", "64.089,164.017"], "name": "Trivia" }, { "count": 87, "coords": ["42.153,304.080", "59.496,283.284", "111.481,304.815", "78.330,315.870", "49.727,309.314"], "name": "Policy" }] }, { "count": 344, "coords": ["196.074,257.509", "165.252,254.816", "169.733,218.436", "205.559,221.398"], "name": "Ethics" }, { "count": 32, "coords": ["324.637,404.053", "322.007,391.152", "333.970,376.812", "360.566,385.405", "362.601,398.350", "345.854,411.932"], "name": "Patriotism" }, { "count": 766, "color": "#008963", "coords": ["192.955,0.000", "264.022,0.000", "218.673,52.874", "192.364,38.085"], "name": "Animals", "children": [{ "count": 766, "color": "#008963", "coords": ["213.934,50.210", "192.364,38.085", "192.955,0.000", "240.843,0.000", "248.941,17.583", "221.095,50.050"], "name": "Animals (general)" }, { "count": 22, "coords": ["213.934,50.210", "221.095,50.050", "218.673,52.874"], "name": "Dogs" }, { "count": 13, "coords": ["240.843,0.000", "264.022,0.000", "248.941,17.583"], "name": "Cats" }] }, { "count": 1134, "coords": ["531.890,249.878", "522.463,266.864", "478.256,277.838", "454.265,222.658", "466.935,204.335", "508.094,200.279"], "name": "Hypotheticals" }, { "count": 726, "coords": ["300.301,505.033", "284.693,547.588", "254.187,545.597", "237.922,517.638", "270.520,478.623", "274.770,479.510"], "name": "Housing" }, { "count": 150, "coords": ["159.510,451.182", "184.480,451.992", "176.216,480.370", "171.865,480.587"], "name": "Current Events" }, { "count": 676, "coords": ["512.775,600.000", "462.183,600.000", "459.306,555.867", "497.241,544.413", "519.398,574.361"], "name": "Famous People" }, { "count": 41, "coords": ["0.000,478.820", "0.000,429.573", "32.409,449.004"], "name": "Emergency Preparedness" }, { "count": 157, "coords": ["89.051,397.570", "103.630,404.456", "95.770,439.440", "74.291,436.732"], "name": "Safety" }, { "count": 519, "color": "#008963", "coords": ["420.775,0.000", "600.000,0.000", "600.000,147.954", "513.262,178.585", "475.897,168.726", "445.396,147.850"], "name": "LDS", "children": [{ "count": 1691, "coords": ["535.632,0.000", "600.000,0.000", "600.000,70.875", "561.172,87.549", "522.405,71.968", "515.965,64.443", "519.420,19.419"], "name": "Doctrine", "children": [{ "count": 1691, "coords": ["517.899,39.248", "519.420,19.419", "535.632,0.000", "600.000,0.000", "600.000,70.875", "561.172,87.549", "547.258,81.956"], "name": "Doctrine (general)" }, { "count": 137, "coords": ["517.899,39.248", "547.258,81.956", "522.405,71.968", "515.965,64.443"], "name": "Word of Wisdom" }] }, { "count": 1116, "coords": ["472.995,0.000", "502.266,0.000", "519.420,19.419", "515.965,64.443", "482.006,71.556", "462.346,63.224", "450.346,29.002", "454.406,18.629"], "name": "Missionaries" }, { "count": 861, "coords": ["561.672,161.489", "519.739,176.298", "500.731,156.564", "500.505,123.281", "520.095,111.280", "544.838,115.834", "556.831,127.748"], "name": "Culture" }, { "count": 665, "coords": ["515.965,64.443", "522.405,71.968", "520.095,111.280", "500.505,123.281", "480.952,115.945", "470.897,91.019", "482.006,71.556"], "name": "Scriptures" }, { "count": 519, "color": "#008963", "coords": ["455.711,154.910", "460.096,129.438", "480.952,115.945", "500.505,123.281", "500.731,156.564", "483.972,170.857", "475.897,168.726"], "name": "LDS (general)" }, { "count": 449, "coords": ["600.000,117.098", "600.000,147.954", "561.672,161.489", "556.831,127.748", "572.998,113.725"], "name": "Temples" }, { "count": 400, "coords": ["600.000,70.875", "600.000,117.098", "572.998,113.725", "561.081,96.536", "561.172,87.549"], "name": "Policy" }, { "count": 391, "coords": ["544.838,115.834", "520.095,111.280", "522.405,71.968", "561.172,87.549", "561.081,96.536"], "name": "Prophets & General Authorities" }, { "count": 341, "coords": ["432.512,70.478", "426.330,33.354", "450.346,29.002", "462.346,63.224", "459.115,66.475"], "name": "Church History" }, { "count": 341, "coords": ["441.547,124.739", "437.280,99.113", "464.748,88.979", "470.897,91.019", "480.952,115.945", "460.096,129.438"], "name": "LDS Rumors/Myths" }, { "count": 245, "coords": ["446.027,0.000", "454.406,18.629", "450.346,29.002", "426.330,33.354", "420.775,0.000"], "name": "LDS Music" }, { "count": 206, "coords": ["432.512,70.478", "459.115,66.475", "464.748,88.979", "437.280,99.113"], "name": "General Conference" }, { "count": 145, "coords": ["572.998,113.725", "556.831,127.748", "544.838,115.834", "561.081,96.536"], "name": "LDS Literature" }, { "count": 71, "coords": ["441.547,124.739", "460.096,129.438", "455.711,154.910", "445.396,147.850"], "name": "Pornography" }, { "count": 53, "coords": ["502.266,0.000", "535.632,0.000", "519.420,19.419"], "name": "Seminary/Institute" }, { "count": 48, "coords": ["470.897,91.019", "464.748,88.979", "459.115,66.475", "462.346,63.224", "482.006,71.556"], "name": "EFY" }, { "count": 20, "coords": ["519.739,176.298", "513.262,178.585", "483.972,170.857", "500.731,156.564"], "name": "Long Distance Relationships with Missionaries" }, { "count": 19, "coords": ["446.027,0.000", "472.995,0.000", "454.406,18.629"], "name": "International" }] }, { "count": 325, "color": "#003A80", "coords": ["211.414,217.264", "219.557,216.966", "246.803,241.952", "231.142,274.024", "214.178,274.973", "196.074,257.509", "205.559,221.398"], "name": "Art", "children": [{ "count": 325, "color": "#003A80", "coords": ["199.622,243.999", "242.560,238.062", "246.803,241.952", "231.142,274.024", "214.178,274.973", "196.074,257.509"], "name": "Art (general)" }, { "count": 176, "coords": ["242.560,238.062", "199.622,243.999", "205.559,221.398", "211.414,217.264", "219.557,216.966"], "name": "Photography" }] }, { "count": 16, "coords": ["600.000,290.681", "600.000,329.010", "566.208,327.967", "560.562,294.270", "568.810,287.561"], "name": "Periodicals" }, { "count": 257, "color": "#405D80", "coords": ["378.732,409.937", "410.772,390.355", "429.357,403.370", "419.340,440.846", "404.508,446.539", "379.127,429.513"], "name": "Travel", "children": [{ "count": 257, "color": "#405D80", "coords": ["382.778,407.464", "410.772,390.355", "429.357,403.370", "421.510,432.731"], "name": "Travel (general)" }, { "count": 226, "coords": ["382.778,407.464", "421.510,432.731", "419.340,440.846", "404.508,446.539", "379.127,429.513", "378.732,409.937"], "name": "International" }] }, { "count": 10, "color": "#DFDD7A", "coords": ["409.045,528.356", "379.931,490.781", "403.694,471.031", "429.246,479.978", "422.028,524.448"], "name": "World", "children": [{ "count": 271, "coords": ["389.289,483.004", "403.694,471.031", "429.246,479.978", "426.680,495.790", "411.154,505.128", "396.245,504.949"], "name": "Country Info" }, { "count": 127, "coords": ["422.561,521.166", "422.028,524.448", "409.045,528.356", "393.190,507.893", "396.245,504.949", "411.154,505.128"], "name": "Random" }, { "count": 63, "coords": ["426.680,495.790", "422.561,521.166", "411.154,505.128"], "name": "Customs" }, { "count": 10, "color": "#DFDD7A", "coords": ["393.190,507.893", "379.931,490.781", "389.289,483.004", "396.245,504.949"], "name": "World (general)" }] }, { "count": 198, "coords": ["349.484,438.127", "320.654,440.967", "311.754,419.503", "324.637,404.053", "345.854,411.932"], "name": "Comedy" }, { "count": 715, "color": "#008963", "coords": ["219.040,522.646", "197.572,515.642", "176.216,480.370", "184.480,451.992", "194.899,440.709", "215.617,431.486", "247.950,434.397", "270.520,478.623", "237.922,517.638"], "name": "Fashion/Style", "children": [{ "count": 843, "coords": ["253.913,498.499", "183.622,454.941", "184.480,451.992", "194.899,440.709", "215.617,431.486", "247.950,434.397", "270.520,478.623"], "name": "Clothing" }, { "count": 715, "color": "#008963", "coords": ["253.913,498.499", "237.922,517.638", "219.040,522.646", "197.572,515.642", "176.216,480.370", "183.622,454.941"], "name": "Fashion/Style (general)" }] }, { "count": 351, "color": "#008963", "coords": ["462.183,600.000", "428.988,600.000", "422.410,568.721", "447.186,551.922", "459.306,555.867"], "name": "Writing/Publishing", "children": [{ "count": 351, "color": "#008963", "coords": ["450.648,553.049", "459.437,557.876", "462.183,600.000", "428.988,600.000", "422.410,568.721", "447.186,551.922"], "name": "Writing/Publishing (general)" }, { "count": 2, "coords": ["450.648,553.049", "459.306,555.867", "459.437,557.876"], "name": "Typography" }] }, { "count": 901, "color": "#003A80", "coords": ["600.000,147.954", "600.000,244.061", "569.027,256.126", "531.890,249.878", "508.094,200.279", "513.262,178.585"], "name": "Science", "children": [{ "count": 901, "color": "#003A80", "coords": ["600.000,175.446", "600.000,211.398", "571.998,223.049", "551.726,219.348", "539.475,188.863", "549.033,165.953", "569.095,158.868", "589.822,167.062"], "name": "Science (general)" }, { "count": 248, "coords": ["600.000,211.398", "600.000,244.061", "580.163,251.789", "571.998,223.049"], "name": "Mathematics" }, { "count": 223, "coords": ["521.982,229.226", "508.094,200.279", "508.915,196.832", "532.614,187.125", "539.475,188.863", "551.726,219.348", "550.460,220.686"], "name": "Biology", "children": [{ "count": 223, "coords": ["513.924,212.431", "542.226,195.708", "551.726,219.348", "550.460,220.686", "521.982,229.226"], "name": "Biology (general)" }, { "count": 139, "coords": ["542.226,195.708", "513.924,212.431", "508.094,200.279", "508.915,196.832", "532.614,187.125", "539.475,188.863"], "name": "Botany" }] }, { "count": 193, "coords": ["547.371,252.483", "531.890,249.878", "521.982,229.226", "550.460,220.686"], "name": "Meteorology/Climatology" }, { "count": 140, "coords": ["580.163,251.789", "569.027,256.126", "547.371,252.483", "550.460,220.686", "551.726,219.348", "571.998,223.049"], "name": "Physics", "children": [{ "count": 145, "coords": ["575.854,236.622", "548.282,243.101", "550.460,220.686", "551.726,219.348", "571.998,223.049"], "name": "Astronomy" }, { "count": 140, "coords": ["575.854,236.622", "580.163,251.789", "569.027,256.126", "547.371,252.483", "548.282,243.101"], "name": "Physics (general)" }] }, { "count": 86, "coords": ["526.798,173.805", "532.614,187.125", "508.915,196.832", "513.262,178.585"], "name": "Agriculture" }, { "count": 59, "coords": ["593.267,150.331", "589.822,167.062", "569.095,158.868"], "name": "Ecology" }, { "count": 41, "coords": ["549.033,165.953", "539.475,188.863", "532.614,187.125", "526.798,173.805"], "name": "Geology" }, { "count": 21, "coords": ["593.267,150.331", "600.000,147.954", "600.000,175.446", "589.822,167.062"], "name": "Computer Science" }] }, { "count": 483, "color": "#003A80", "coords": ["404.508,446.539", "403.694,471.031", "379.931,490.781", "352.381,481.327", "351.272,439.316", "379.127,429.513"], "name": "Holidays", "children": [{ "count": 483, "color": "#003A80", "coords": ["366.679,433.894", "379.127,429.513", "404.508,446.539", "403.694,471.031", "391.070,481.523", "367.583,477.869", "361.682,472.262", "355.560,454.202"], "name": "Holidays (general)" }, { "count": 69, "coords": ["391.070,481.523", "379.931,490.781", "365.211,485.730", "367.583,477.869"], "name": "Traditions" }, { "count": 44, "coords": ["352.226,475.448", "351.658,453.942", "355.560,454.202", "361.682,472.262"], "name": "Christmas" }, { "count": 34, "coords": ["366.679,433.894", "355.560,454.202", "351.658,453.942", "351.272,439.316"], "name": "Presents" }, { "count": 8, "coords": ["365.211,485.730", "352.381,481.327", "352.226,475.448", "361.682,472.262", "367.583,477.869"], "name": "Birthdays" }] }, { "count": 347, "color": "#003A80", "coords": ["402.827,370.451", "417.410,334.603", "457.039,322.416", "481.264,360.862", "465.808,397.980", "429.357,403.370", "410.772,390.355"], "name": "Transportation", "children": [{ "count": 583, "coords": ["410.108,352.554", "447.153,353.010", "458.283,399.093", "429.357,403.370", "410.772,390.355", "402.827,370.451"], "name": "Automobiles" }, { "count": 347, "color": "#003A80", "coords": ["471.524,345.404", "481.264,360.862", "465.808,397.980", "458.283,399.093", "447.153,353.010", "448.465,351.399"], "name": "Transportation (general)" }, { "count": 181, "coords": ["410.108,352.554", "417.410,334.603", "443.574,326.557", "448.465,351.399", "447.153,353.010"], "name": "Airlines/Aircraft" }, { "count": 35, "coords": ["443.574,326.557", "457.039,322.416", "471.524,345.404", "448.465,351.399"], "name": "Bicycles" }] }, { "count": 105, "color": "#405D80", "coords": ["166.255,319.932", "139.230,295.562", "165.252,254.816", "196.074,257.509", "214.178,274.973", "207.225,315.358", "202.597,318.119"], "name": "Folklore", "children": [{ "count": 341, "coords": ["172.634,319.614", "166.255,319.932", "139.230,295.562", "153.345,273.460", "172.635,277.173", "182.337,293.320"], "name": "LDS Rumors/Myths" }, { "count": 319, "coords": ["181.719,256.255", "196.074,257.509", "214.178,274.973", "210.915,293.927", "182.337,293.320", "172.635,277.173"], "name": "Rumors/Myths" }, { "count": 215, "coords": ["172.634,319.614", "182.337,293.320", "210.915,293.927", "207.225,315.358", "202.597,318.119"], "name": "BYU Rumors/Myths" }, { "count": 105, "color": "#405D80", "coords": ["153.345,273.460", "165.252,254.816", "181.719,256.255", "172.635,277.173"], "name": "Folklore (general)" }] }, { "count": 332, "coords": ["402.827,370.451", "410.772,390.355", "378.732,409.937", "362.601,398.350", "360.566,385.405", "390.266,365.328"], "name": "United States" }, { "count": 1007, "color": "#008963", "coords": ["117.111,141.426", "151.579,79.814", "176.150,77.097", "205.534,87.744", "215.441,165.841", "200.539,177.240", "162.488,185.999"], "name": "Health", "children": [{ "count": 1007, "color": "#008963", "coords": ["139.869,100.746", "166.777,104.656", "189.011,131.955", "182.286,153.135", "149.525,173.266", "117.111,141.426"], "name": "Health (general)" }, { "count": 483, "coords": ["179.825,78.429", "205.534,87.744", "210.536,127.172", "189.011,131.955", "166.777,104.656"], "name": "Wellness/Exercise" }, { "count": 333, "coords": ["210.536,127.172", "215.441,165.841", "202.092,176.052", "182.286,153.135", "189.011,131.955"], "name": "Hygiene" }, { "count": 281, "coords": ["149.525,173.266", "182.286,153.135", "202.092,176.052", "200.539,177.240", "162.488,185.999"], "name": "Diets" }, { "count": 204, "coords": ["139.869,100.746", "151.579,79.814", "176.150,77.097", "179.825,78.429", "166.777,104.656"], "name": "Pregnancy" }] }, { "count": 732, "color": "#003A80", "coords": ["459.306,555.867", "447.186,551.922", "422.028,524.448", "429.246,479.978", "443.424,465.644", "478.269,458.569", "516.783,494.394", "497.241,544.413"], "name": "Literature", "children": [{ "count": 732, "color": "#003A80", "coords": ["427.442,491.096", "429.246,479.978", "443.424,465.644", "478.269,458.569", "493.382,472.627", "487.793,505.355", "464.451,518.480", "450.933,515.680"], "name": "Literature (general)" }, { "count": 243, "coords": ["431.423,534.708", "450.933,515.680", "464.451,518.480", "470.161,530.884", "466.282,544.131", "450.225,552.911", "447.186,551.922"], "name": "Harry Potter" }, { "count": 188, "coords": ["431.423,534.708", "422.028,524.448", "427.442,491.096", "450.933,515.680"], "name": "Children's" }, { "count": 167, "coords": ["511.756,507.262", "489.660,506.742", "487.793,505.355", "493.382,472.627", "516.783,494.394"], "name": "Classics" }, { "count": 145, "coords": ["494.885,525.230", "486.698,533.355", "470.161,530.884", "464.451,518.480", "487.793,505.355", "489.660,506.742"], "name": "LDS Literature" }, { "count": 95, "coords": ["491.477,546.153", "471.156,552.289", "466.282,544.131", "470.161,530.884", "486.698,533.355"], "name": "Poetry" }, { "count": 76, "coords": ["511.756,507.262", "503.779,527.680", "494.885,525.230", "489.660,506.742"], "name": "Comic Books" }, { "count": 23, "coords": ["503.779,527.680", "497.241,544.413", "491.477,546.153", "486.698,533.355", "494.885,525.230"], "name": "Foreign Language" }, { "count": 12, "coords": ["471.156,552.289", "459.306,555.867", "450.225,552.911", "466.282,544.131"], "name": "Political" }] }, { "count": 2408, "color": "#008963", "coords": ["331.505,234.468", "351.524,261.964", "355.146,302.846", "318.771,339.527", "286.220,345.382", "238.164,312.177", "231.142,274.024", "246.803,241.952", "271.667,222.711"], "name": "Food & Drink", "children": [{ "count": 2408, "color": "#008963", "coords": ["238.106,311.861", "290.308,226.374", "331.505,234.468", "351.524,261.964", "355.146,302.846", "318.771,339.527", "286.220,345.382", "238.164,312.177"], "name": "Food & Drink (general)" }, { "count": 551, "coords": ["290.308,226.374", "238.106,311.861", "231.142,274.024", "246.803,241.952", "271.667,222.711"], "name": "Cooking" }] }, { "count": 688, "coords": ["0.000,274.951", "49.727,309.314", "28.012,342.780", "0.000,338.881"], "name": "Self Improvement" }, { "count": 520, "coords": ["318.771,339.527", "333.970,376.812", "322.007,391.152", "290.298,387.892", "286.220,345.382"], "name": "Recreation" }, { "count": 198, "coords": ["161.185,0.000", "192.955,0.000", "192.364,38.085", "183.037,42.406", "157.101,32.876"], "name": "Personal Purity" }],
            dataSize = { width: 600, height: 600 },
            canvasElement,
            json,
            selectZoom,
            canvasWidth,
            canvasHeight,
            root,
            canvasArea,
            flatten_nodes = function flatten_nodes(node, name, depth, base_color) {
                var flat = [], i, child, desc;
                depth = depth || 0;
                if (node.color !== undefined) { base_color = d3.hsl(node.color); }
                base_color = base_color || d3.hsl("#E0D3C1");
                node.depth = depth;
                node.color = base_color;
                for (i = 1; i < depth; i += 1) { node.color = node.color.brighter(1.5); }
                //node.color = node.color.toString();
                if (node.children !== undefined) {
                    if (name === undefined) {
                        name = node.name;
                    } else { name += " > " + node.name; }
                    for (i = 0; i < node.children.length; i += 1) {
                        child = node.children[i];
                        desc = flatten_nodes(child, name, depth + 1, base_color);
                        flat = flat.concat(desc);
                    }
                } else {
                    if (name !== undefined) { node.name = name + " > " + node.name; }
                    flat.push(node);
                }
                return flat;
            },
            i, flat = [], node, desc,
            lastClickTime;

        // Parse demo data:
        for (i = 0; i < data.length; i += 1) {
            node = data[i];
            desc = flatten_nodes(node);
            flat = flat.concat(desc);
        }

        // Zoom after click:
        function zoom() {
            if (canvasArea === undefined || true) {
                return; // Catch for if treemap hasn't been setup.
            }

            // Prevent event from firing more than once:
            if (d3.event) {
                d3.event.stopPropagation();
            }
        }

        function addNodes(celSel) {
            // Add nodes to Canvas:
            var cell = celSel.enter().append("group")
                .attr("originX", "center")
                .attr("originY", "center")
                .on("mousedown", function (d) {
                    var clickTime = (new Date()).getTime();
                    if (clickTime - lastClickTime < 500) {
                        selectZoom(d);
                    }
                    lastClickTime = clickTime;
                });

            // Add polygon to each node:
            cell.append("polygon")
                .attr("points", function (d) {
                    return d.coords;//.join(" ");
                })
                .attr("stroke", "#000")
                .attr("stroke-width", 1)
                .attr("fill", function (d) {
                    return d.color.toString();
                })
                .attr("originX", "center")
                .attr("originY", "center");
        }

        function update() {
            if (canvasArea === undefined) {
                return; // Catch for if treemap hasn't been setup.
            }
            // Define temp vars:
            var celSel, cell;

            // Get treemap data:
            root = flat;

            // Select all nodes in Canvas, and apply data:
            celSel = canvasArea.selectAll("group")
                    .data(root, function (d) { return d.name; });

            // Update nodes on Canvas:
            cell = celSel.transition()
                .duration(1000);

            // Update each node's rectangle:
            cell.select("polygon")
                .attr("points", function (d) {
                    return d.coords;
                })
                .attr("fill", function (d) {
                    return d.color.toString();
                });

            // Add new nodes to Canvas:
            addNodes(celSel);

            // Remove nodes from Canvas:
            cell = celSel.exit().remove();
        }

        function init(
            element,
            width,
            height,
            jsonObservable,
            selectZoomFunction
        ) {
            if (canvasArea !== undefined) {
                return; // Catch for if voronoi has been setup.
            }
            canvasElement = element;
            json = jsonObservable;
            json();
            canvasWidth = width;
            canvasHeight = height;
            selectZoom = selectZoomFunction;

            // Define temp vars:
            var celSel, j, coord,
                widthRatio = canvasWidth / dataSize.width,
                heightRatio = canvasHeight / dataSize.height;

            // Respace coords:
            for (i = 0; i < flat.length; i += 1) {
                for (j = 0; j < flat[i].coords.length; j += 1) {
                    coord = flat[i].coords[j].split(",");
                    flat[i].coords[j] = {
                        x: Number(coord[0]) * widthRatio,
                        y: Number(coord[1]) * heightRatio
                    };
                }
            }

            // Store for next time:
            dataSize.width = canvasWidth;
            dataSize.height = canvasHeight;

            // Get voronoi data:
            root = flat;

            canvasArea = canvasElement.append("group")
                .attr("originX", "center")
                .attr("originY", "center");

            // Join data with selection:
            celSel = canvasArea.selectAll("group")
                    .data(root, function (d) { return d.name; });

            // Add nodes to Canvas:
            addNodes(celSel);
        }

        function resize(width, height) {
            // Temp vars:
            var j, coord,
                widthRatio = width / dataSize.width,
                heightRatio = height / dataSize.height;

            // Store width and height for later:
            canvasWidth = width;
            canvasHeight = height;

            // Respace coords:
            for (i = 0; i < root.length; i += 1) {
                for (j = 0; j < root[i].coords.length; j += 1) {
                    coord = root[i].coords[j];
                    coord.x *= widthRatio;
                    coord.y *= heightRatio;
                }
            }

            // Store for next time:
            dataSize.width = canvasWidth;
            dataSize.height = canvasHeight;
        }

        function remove() {
            if (canvasArea !== undefined) {
                canvasArea.remove();
                canvasArea = undefined;
            }
        }

        // Return treemap object:
        return {
            init: init,
            update: update,
            zoom: zoom,
            resize: resize,
            remove: remove
        };
    };
});
/*global define*/
/*jslint devel: true */
/*jslint browser: true */
define('scalejs.visualization-d3/d3',[
    'scalejs!core',
    'knockout',
    'd3',
    'd3.colorbrewer',
    'hammer',
    'scalejs.visualization-d3/treemap',
    'scalejs.visualization-d3/sunburst',
    'scalejs.visualization-d3/voronoi'
], function (
    core,
    ko,
    d3,
    colorbrewer,
    hammer,
    treemap,
    sunburst,
    voronoi
) {
    
    var //imports
        unwrap = ko.utils.unwrapObservable,
        isObservable = ko.isObservable,
        visualizations = {
            treemap: treemap,
            sunburst: sunburst,
            voronoi: voronoi
        };

    function blankVisualization(type) {
        // Generate general error:
        var strError = "Visualization ";
        if (type !== undefined) {
            strError += "(" + type + ") ";
        }
        strError += "doesn't exist!";

        // Generate error function:
        function visualizationError(func) {
            var strFuncError = "Calling " + func + " function of undefined visualization. " + strError;
            return function () {
                console.error(strFuncError);
            };
        }

        // Return blank visualization with errors as functions:
        return {
            init: visualizationError("init"),
            update: visualizationError("update"),
            zoom: visualizationError("zoom"),
            renderEnd: visualizationError("renderEnd"),
            resize: visualizationError("resize"),
            remove: visualizationError("remove")
        };
    }

    function init(
        element,
        valueAccessor
    ) {
        var parameters = valueAccessor(),
            visualization,
            visualizationType,
            visualizationTypeObservable,
            json,
            dataSource,
            levelsSource,
            levels,
            childrenPath,
            areaPath,
            colorPath,
            colorPalette,
            colorScale,
            selectedItemPath,
            selectedItemPathObservable,
            rootScale = d3.scale.linear(),
            canvas,
            canvasElement,  // Holds the lower canvas of fabric.
            canvasShow,     // Holds the canvas used to display objects on the user's screen.
            canvasRender,   // Holds the offscreen buffer canvas used to hold a snapshot of the visualization for zooming.
            context,        // Holds canvasShow's 2d context.
            hammerObj,      // Holds touch event system.
            elementStyle,
            canvasWidth,
            canvasHeight,
            root,
            nodeSelected,
            zooms,
            zoomObservable,
            zoomEnabled = true, // Temporary fix to errors with NaN widths during adding/removing nodes.
            //left = 0,
            //top = 0,
            leftVal = 0,
            topVal = 0,
            rotateVal = 0,
            scaleVal = 1,
            //lastEvent,
            //lastGesture,
            lastTouches,
            lastCenter;

        // Get element's width and height:
        elementStyle = window.getComputedStyle(element);
        canvasWidth = parseInt(elementStyle.width, 10);
        canvasHeight = parseInt(elementStyle.height, 10);
        if (canvasHeight <= 0) {
            canvasHeight = 1;   // Temp fix for drawImage.
        }

        // Create fabric canvas:
        canvas = d3.select(element)
                .style('overflow', 'hidden')
                .append("fabric:canvas")
                    .property("renderOnAddRemove", false)
                    .property("selection", false)
                    .property("targetFindTolerance", 1)
                    .attr("width", canvasWidth)
                    .attr("height", canvasHeight);

        // Create zoom canvas, and offscreen buffer canvas:
        canvasElement = canvas.domNode()[0][0];
        canvasShow = d3.select(canvas[0][0].parentNode)
            .append("canvas")
                .style("position", "absolute")
                .style("left", 0)
                .style("top", 0)
                .attr("width", canvasWidth)
                .attr("height", canvasHeight)
                .style("display", "none");
        context = canvasShow[0][0].getContext('2d');
        canvasRender = document.createElement("canvas");
        canvasRender.width = canvasWidth;
        canvasRender.height = canvasHeight;

        // Loop through levels to determine parameters:
        function createLevelParameters(lvlsParam) {
            // Setup temp vars:
            var colorPaletteType = Object.prototype.toString.call(unwrap(colorPalette)),
                // Unwrap levels:
                lvls = unwrap(lvlsParam),
                i;

            // Set colorPalette parameters:
            colorScale = d3.scale.linear();
            if (colorPaletteType === '[object Array]') {
                //colorPalette is an array:
                colorScale.range(unwrap(colorPalette));
            } else if (colorPaletteType === '[object String]') {
                // Check if colorPalette is a predefined colorbrewer array:
                if (colorbrewer[unwrap(colorPalette)] !== undefined) {
                    // Use specified colorbrewer palette:
                    colorScale.range(colorbrewer[unwrap(colorPalette)][3]);
                } else {
                    // Use default palette:
                    colorScale.range(colorbrewer.PuBu[3]);
                }
            } else {
                // Use default palette:
                colorScale.range(colorbrewer.PuBu[3]);
            }

            // Clear levels:
            levels = [];

            // Loop through all levels and parse the parameters:
            if (typeof lvls !== 'array' || lvls.length === 0) {
                levels[0] = {   // Use global parameters for the level:
                    childrenPath: unwrap(childrenPath),
                    areaPath: unwrap(areaPath),
                    colorPath: unwrap(colorPath),
                    colorPalette: unwrap(colorPalette),
                    colorScale: colorScale
                };
            }
            for (i = 0; i < lvls.length; i += 1) {
                if (typeof lvls[i] === 'string') {
                    levels[i] = {   // Level just defines the childrenPath, use global parameters for the rest:
                        childrenPath: unwrap(lvls[i]),
                        areaPath: unwrap(areaPath),
                        colorPath: unwrap(colorPath),
                        colorPalette: unwrap(colorPalette),
                        colorScale: colorScale
                    };
                } else {
                    // Level has parameters:
                    levels[i] = {   // Use global parameters for parameters not defined:
                        childrenPath: unwrap(lvls[i].childrenPath || childrenPath),
                        areaPath: unwrap(lvls[i].areaPath || areaPath),
                        colorPath: unwrap(lvls[i].colorPath || colorPath)
                    };
                    if (lvls[i].colorPalette === undefined) {
                        // Use global colorScale and Palette for this Level:
                        levels[i].colorPalette = colorPalette;
                        levels[i].colorScale = colorScale;
                    } else {
                        // Create colorScale and Palette for this Level:
                        levels[i].colorPalette = unwrap(lvls[i].colorPalette);
                        levels[i].colorScale = d3.scale.linear();

                        colorPaletteType = Object.prototype.toString.call(levels[i].colorPalette);
                        if (colorPaletteType === '[object Array]') {
                            //colorPalette is an array:
                            levels[i].colorScale.range(levels[i].colorPalette);
                        } else if (colorPaletteType === '[object String]') {
                            // Check if colorPalette is a predefined colorbrewer array:
                            if (colorbrewer[levels[i].colorPalette] !== undefined) {
                                // Use specified colorbrewer palette:
                                levels[i].colorScale.range(colorbrewer[levels[i].colorPalette][3]);
                            } else {
                                // Use default palette:
                                levels[i].colorPalette = colorPalette;
                                levels[i].colorScale = colorScale;
                            }
                        } else {
                            // Use default palette:
                            levels[i].colorPalette = colorPalette;
                            levels[i].colorScale = colorScale;
                        }
                    }
                }
            }
        }
        // Recursively traverse json data, and build it for rendering:
        function createNodeJson(dat, lvls, ind) {
            var node = unwrap(dat), newNode, childNode, i, children, stepSize, lvl, color;

            if (lvls.length === 0) {    // Out of defined levels, so use global parameters for node:
                return {
                    name: unwrap(node.name || ''),
                    size: unwrap(node[unwrap(areaPath)] || 1),
                    colorSize: unwrap(node[unwrap(colorPath)] || 0)
                };
            }

            lvl = lvls[ind] || {
                childrenPath: unwrap(childrenPath),
                areaPath: unwrap(areaPath),
                colorPath: unwrap(colorPath),
                colorPalette: unwrap(colorPalette),
                colorScale: colorScale
            };

            if (node[lvl.childrenPath] === undefined) {   // Use current level parameters for node:
                return {
                    name: unwrap(node.name || ''),
                    size: unwrap(node[lvl.areaPath] || 1),
                    colorSize: unwrap(node[lvl.colorPath] || 0)
                };
            }

            // Set default properties of node with children:
            newNode = {
                name: unwrap(node.name || ''),
                children: [],
                childrenReference: [],
                size: unwrap(node[lvl.areaPath] || 1),
                colorSize: unwrap(node[lvl.colorPath] || 0),
                colorScale: d3.scale.linear(),
                minSize: 0,
                maxSize: 1,
                minColor: 0,
                maxColor: 1
            };

            // Node has children, so set them up first:
            children = unwrap(node[lvl.childrenPath]);
            for (i = 0; i < children.length; i += 1) {
                childNode = createNodeJson(children[i], lvls, ind + 1); // Get basic node-specific properties
                childNode.parent = newNode; // Set node's parent
                childNode.index = i;    // Set node's index to match the index it appears in the original dataset.

                // Update the parent's overall size:
                if (node[lvl.areaPath] === undefined) {
                    newNode.size += childNode.size; // If parent has no size, default to adding child colors.
                }

                // Update the parent's overall color:
                if (node[lvl.colorPath] === undefined) {
                    newNode.colorSize += childNode.colorSize;   // If parent has no color, default to adding child colors.
                }

                // Update min and max properties:
                if (i) {
                    // Update min and max values: 
                    newNode.minSize = Math.min(newNode.minSize, childNode.size);
                    newNode.maxSize = Math.max(newNode.maxSize, childNode.size);
                    newNode.minColor = Math.min(newNode.minColor, childNode.colorSize);
                    newNode.maxColor = Math.max(newNode.maxColor, childNode.colorSize);
                } else {
                    // Insure min and max values are different if there is only one child:
                    newNode.minSize = childNode.size;
                    newNode.maxSize = childNode.size + 1;
                    newNode.minColor = childNode.colorSize;
                    newNode.maxColor = childNode.colorSize + 1;
                }

                // Add node to parent's children and childrenReference arrays:
                newNode.children[i] = childNode;
                // d3 reorganizes the children later in the code, so the following array is used to preserve children order for indexing:
                newNode.childrenReference[i] = childNode;
            }

            // Set parent node's colorScale range (Palette):
            if (lvls.length <= ind + 1) {    // Set to global Palette:
                newNode.colorScale.range(colorScale.range());
            } else {    // Set to node's Level color Palette:
                newNode.colorScale.range(lvls[ind + 1].colorScale.range());
            }
            // Set domain of color values:
            stepSize = (newNode.maxColor - newNode.minColor) / Math.max(newNode.colorScale.range().length - 1, 1);
            newNode.colorScale.domain(d3.range(newNode.minColor, newNode.maxColor + stepSize, stepSize));

            // Set children's colors:
            for (i = 0; i < children.length; i += 1) {
                color = newNode.colorScale(newNode.children[i].colorSize);
                newNode.children[i].color = color;
                newNode.childrenReference[i].color = color; //Needed? This should be an object reference anyway...
            }

            return newNode;
        }
        json = ko.computed(function () {
            // Get parameters (or defaults values):
            dataSource = parameters.data || { name: "Empty" };
            levelsSource = parameters.levels || [{}];
            childrenPath = parameters.childrenPath || 'children';
            areaPath = parameters.areaPath || 'area';
            colorPath = parameters.colorPath || 'color';
            colorPalette = parameters.colorPalette || 'PuBu';

            // Create copy of data in a easy structure for d3:
            createLevelParameters(levelsSource);
            root = createNodeJson(dataSource, levels, 0);

            // Setup colorscale for the root:
            rootScale = d3.scale.linear()
                        .range(levels[0].colorScale.range());
            var stepSize = 2 / Math.max(rootScale.range().length - 1, 1);
            rootScale.domain(d3.range(root.colorSize - stepSize / 2, root.colorSize + stepSize / 2, stepSize));

            // Set root's color:
            root.color = rootScale(root.colorSize);

            // Return the new json data:
            return root;
        });
        selectedItemPathObservable = ko.computed(function () {
            selectedItemPath = parameters.selectedItemPath || ko.observable([]);
            return unwrap(selectedItemPath);
        });

        // Zoom after click, and set the path:
        function selectZoom(d) {
            var path = [],
                dTmp,
                oldSelected = nodeSelected;

            if (d === oldSelected) {    // Reset path since item was already selected.
                d = root;
            }

            nodeSelected = dTmp = d;
            // Check if selectedItemPath is an observable:
            if (isObservable(selectedItemPath)) {   // Path is an observable, so set path to the selected item:
                while (dTmp.parent !== undefined) {
                    path.unshift(dTmp.index);
                    dTmp = dTmp.parent;
                }
                selectedItemPath(path);
            } else {    // Path is not an observable, so no need to push an update to it.
                visualization.zoom(d);
            }

            // Prevent event from firing more than once:
            if (d3.event) {
                d3.event.stopPropagation();
            }
        }
        // Subscribe to selectedItemPath changes from outside of the extension (and then zoom):
        selectedItemPathObservable.subscribe(function (path) {
            var d = json(), i;
            if (Object.prototype.toString.call(path) === '[object Array]') {
                for (i = 0; i < path.length; i += 1) {
                    if (d.childrenReference === undefined) {
                        d = json(); // Path doesn't exist, so reset path.
                        break;
                    }
                    if (d.childrenReference[path[i]] === undefined) {
                        d = json(); // Path doesn't exist, so reset path.
                        break;
                    }
                    d = d.childrenReference[path[i]];
                }
            }
            // Verify d exists:
            if (d) {
                nodeSelected = d;       // Set nodeSelected to d
                if (zoomEnabled) {
                    visualization.zoom(d);    // Animate zoom effect
                }
            }
        });

        visualizationTypeObservable = ko.computed(function () {
            visualizationType = parameters.visualization || ko.observable("");
            return unwrap(visualizationType);
        });
        visualizationType = visualizationTypeObservable();

        if (visualizations[visualizationType] !== undefined) {
            visualization = visualizations[visualizationType]();
        } else {
            visualization = blankVisualization(visualizationType);
        }
        // Run visualization's initialize code:
        visualization.init(canvas, canvasWidth, canvasHeight, json, selectZoom, element);
        // Start rendering the canvas
        canvas.startRender();
        canvas.pumpRender();

        // Subscribe to visualization type changes:
        visualizationTypeObservable.subscribe(function () {
            visualization.remove();
            //canvas.pumpRender();
            visualizationType = visualizationTypeObservable();

            if (visualizations[visualizationType] !== undefined) {
                visualization = visualizations[visualizationType]();
            } else {
                visualization = blankVisualization(visualizationType);
            }

            // Set selected node to the root of the treemap:
            nodeSelected = root;
            // Set default selected item (do this after the data is set, and before modifying attributes):
            if (isObservable(selectedItemPath)) {
                selectedItemPath([]);
            }

            // Reset transform:
            leftVal = 0;
            topVal = 0;
            rotateVal = 0;
            scaleVal = 1;

            // Run visualization's initialize code:
            visualization.init(canvas, canvasWidth, canvasHeight, json, selectZoom, element);
            canvas.pumpRender();
        });

        function update() {
            // Set selected node to the root of the treemap:
            nodeSelected = root;

            // Set default selected item (do this after the data is set, and before modifying attributes):
            zoomEnabled = false;
            if (isObservable(selectedItemPath)) {
                selectedItemPath([]);
            }   // selectedItemPath is reset here to prevent errors in zooming, need to reorder later.
            zoomEnabled = true;

            // Update visualization:
            visualization.update();
            canvas.pumpRender();
        }

        // Subscribe to data changes:
        json.subscribe(function () {
            update();   // Re-render on change
        });

        // Check if a layout plugin exists:
        if (core.layout) {
            // Add event listener for on layout change:
            core.layout.onLayoutDone(function () {
                // Get element's width and height:
                elementStyle = window.getComputedStyle(element);
                canvasWidth = parseInt(elementStyle.width, 10);
                canvasHeight = parseInt(elementStyle.height, 10);
                if (canvasHeight <= 0) {
                    canvasHeight = 1;   // Temp fix for drawImage.
                }

                // Resize canvas:
                canvas.attr('width', canvasWidth);
                canvas.attr('height', canvasHeight);
                canvasShow.attr('width', canvasWidth);
                canvasShow.attr('height', canvasHeight);
                canvasRender.width = canvasWidth;
                canvasRender.height = canvasHeight;

                // Reset transform:
                leftVal = 0;
                topVal = 0;
                rotateVal = 0;
                scaleVal = 1;
                canvas.select("group")
                    .attr("scaleX", scaleVal)
                    .attr("scaleY", scaleVal)
                    .attr("angle", rotateVal)
                    .attr("left", leftVal)
                    .attr("top", topVal);

                // Call visualization's resize function to handle resizing internally:
                visualization.resize(canvasWidth, canvasHeight);
                // Update the visualization:
                visualization.update();
                canvas.pumpRender();
            });
        }

        // Subscribe to zoomPath changes:
        zoomObservable = ko.computed(function () {
            zooms = parameters.scale || ko.observable(1);
            return unwrap(zooms);
        });
        zoomObservable.subscribe(function (val) {
            visualization.scale(val);
            canvas.pumpRender();
        });

        // Function to handle touch events (for pinch and zoom):
        function touchHandler(event) {
            //console.log(event);
            if (!event.gesture) {
                return;
            }
            event.gesture.preventDefault();

            var gesture = event.gesture,
                touches = [],
                center,
                scaleDiff,
                rotateDiff,
                pagePos,
                elementPos,
                groupPos,
                rotatePos,
                scalePos,
                transPos,
                sin,
                cos,
                i;

            // Convert touches to an array (to avoid safari's reuse of touch objects):
            for (i = 0; i < gesture.touches.length; i += 1) {
                touches[i] = {
                    pageX: gesture.touches[i].pageX,
                    pageY: gesture.touches[i].pageY
                };
            }

            function distance(p1, p2) { // Get distance between two points:
                var x = p1.pageX - p2.pageX,
                    y = p1.pageY - p2.pageY;
                return Math.sqrt(x * x + y * y);
            }

            if (event.type === "touch") {
                // Set all last* variables to starting gesture:
                //lastEvent = event;
                //lastGesture = gesture;
                lastTouches = touches;
                // Calculate Center:
                if (touches.length === 2) {
                    lastCenter = {
                        x: (touches[0].pageX - touches[1].pageX) / 2 + touches[1].pageX,
                        y: (touches[0].pageY - touches[1].pageY) / 2 + touches[1].pageY
                    };
                } else {
                    lastCenter = {
                        x: touches[0].pageX,
                        y: touches[0].pageY
                    };
                }

                // Render fabric canvas to pinch&zoom canvas:
                context.setTransform(1, 0, 0, 1, 0, 0);
                context.clearRect(0, 0, canvasWidth, canvasHeight);
                context.drawImage(canvasElement, 0, 0);
                // Show pinch&zoom canvas:
                canvasShow.style("display", "");
                // Hide fabric canvas:
                canvasElement.style.display = "none";
                // Reset fabric canvas visualization to default pinch&zoom settings, and render:
                canvas.select("group")
                    .attr("scaleX", 1)//scaleVal
                    .attr("scaleY", 1)//scaleVal
                    .attr("angle", 0)//rotateVal
                    .attr("left", 0)//leftVal
                    .attr("top", 0);//topVal
                canvas.pumpRender();
                // Render fabric canvas to off-screen buffer:
                canvasRender.getContext('2d').clearRect(0, 0, canvasWidth, canvasHeight);
                canvasRender.getContext('2d').drawImage(canvasElement, 0, 0);
            } else if (event.type === "release") {
                // Reset all last* variables, and update fabric canvas to get crisper image:
                //lastEvent = undefined;
                //lastGesture = undefined;
                lastTouches = undefined;
                lastCenter = undefined;

                // Set fabric canvas visualization's pinch&zoom settings, and render:
                canvas.select("group")
                    .attr("scaleX", scaleVal)
                    .attr("scaleY", scaleVal)
                    .attr("angle", rotateVal)
                    .attr("left", leftVal)
                    .attr("top", topVal);
                canvas.pumpRender();
                // Show fabric canvas:
                //canvasElement.style.display = null;
                canvasElement.style.display = "";
                // Hide pinch&zoom canvas:
                canvasShow.style("display", "none");
            } else {
                // Last action was a release, so fix lastTouches:
                if (lastTouches === undefined) {
                    lastTouches = touches;
                }
                if (touches.length === 1) {
                    // Starting action, so reset lastTouches:
                    if (lastTouches.length !== 1) {
                        lastTouches = touches;
                        lastCenter = undefined; // Prevent rotating when removing finger.
                    }

                    // Calculate Center:
                    center = {
                        x: touches[0].pageX,
                        y: touches[0].pageY
                    };

                    // Translate:
                    leftVal += touches[0].pageX - lastTouches[0].pageX;
                    topVal += touches[0].pageY - lastTouches[0].pageY;
                } else if (touches.length === 2) {
                    // Starting action, so reset lastTouches:
                    if (lastTouches.length !== 2) {
                        lastTouches = touches;
                        lastCenter = undefined; // Prevent rotating when adding finger.
                    }

                    // Calculate Center:
                    center = {
                        x: (touches[0].pageX - touches[1].pageX) / 2 + touches[1].pageX,
                        y: (touches[0].pageY - touches[1].pageY) / 2 + touches[1].pageY
                    };
                    if (lastCenter === undefined) {
                        lastCenter = center;
                    }

                    // Calculate Scale:
                    scaleDiff = distance(touches[0], touches[1]) / distance(lastTouches[0], lastTouches[1]);

                    // Calculate Rotation:
                    rotateDiff = Math.atan2(lastTouches[0].pageX - lastCenter.x, lastTouches[0].pageY - lastCenter.y) - Math.atan2(touches[0].pageX - center.x, touches[0].pageY - center.y);
                    // Get sin and cos of angle in radians (for later):
                    sin = Math.sin(rotateDiff);
                    cos = Math.cos(rotateDiff);
                    // Convert to degrees for fabric:
                    rotateDiff *= 180 / Math.PI;

                    // Apply Scale:
                    scaleVal *= scaleDiff;

                    // Apply Rotation:
                    rotateVal += rotateDiff;

                    // Get canvas position:
                    pagePos = event.currentTarget.getBoundingClientRect();
                    // Convert page coords to canvas coords:
                    elementPos = {
                        pageX: center.x,
                        pageY: center.y
                    };
                    elementPos.pageX -= pagePos.left;
                    elementPos.pageY -= pagePos.top;

                    // Get difference between center position and group:
                    groupPos = {
                        x: leftVal - elementPos.pageX,
                        y: topVal - elementPos.pageY
                    };

                    // Rotate around point:
                    rotatePos = {
                        x: groupPos.x * cos - groupPos.y * sin + elementPos.pageX,
                        y: groupPos.x * sin + groupPos.y * cos + elementPos.pageY
                    };

                    // Scale relative to center point:
                    scalePos = {
                        x: scaleDiff * (rotatePos.x - elementPos.pageX) + elementPos.pageX - leftVal,
                        y: scaleDiff * (rotatePos.y - elementPos.pageY) + elementPos.pageY - topVal
                    };

                    // Translate delta in center position:
                    transPos = {
                        x: scalePos.x + (center.x - lastCenter.x),
                        y: scalePos.y + (center.y - lastCenter.y)
                    };

                    // Apply Translate:
                    leftVal += transPos.x;
                    topVal += transPos.y;
                }

                // Set pinch&zoom canvas's pinch&zoom settings, and render:
                context.setTransform(1, 0, 0, 1, 0, 0);
                context.clearRect(0, 0, canvasWidth, canvasHeight);
                context.translate(leftVal, topVal);
                context.scale(scaleVal, scaleVal);
                context.rotate(rotateVal / 180 * Math.PI);
                context.translate(-leftVal, -topVal);
                context.drawImage(canvasRender, leftVal, topVal);
                context.setTransform(1, 0, 0, 1, 0, 0);

                //lastEvent = event;
                //lastGesture = gesture;
                lastTouches = touches;
                lastCenter = center;
            }
        }

        // Subscribe to touch events:
        hammer.plugins.showTouches();
        hammer.plugins.fakeMultitouch();

        hammerObj = hammer(canvas[0].parentNode, {
            prevent_default: true
        });
        hammerObj.on("touch drag swipe pinch rotate transform release", touchHandler);
    }

    return {
        init: init
    };
});

/*global define*/
/*jslint devel: true */
define('scalejs.visualization-d3',[
    'scalejs!core',
    'knockout',
    'scalejs.visualization-d3/d3',
    'd3',
    'fabric',
    'scalejs.d3-fabric',
    'tweenLite'
], function (
    core,
    ko,
    d3,
    d3original,
    fabric,
    d3fabric,
    tweenLite
) {
    
    if (ko.bindingHandlers.d3) {
        console.error("visualization-d3 is already setup");
        return false;
    }
    d3fabric(d3original, fabric, tweenLite);    // Returns true if initialized, else returns false.

    ko.bindingHandlers.d3 = d3;
    ko.virtualElements.allowedBindings.d3 = true;

    core.registerExtension({
        d3: d3
    });
});


