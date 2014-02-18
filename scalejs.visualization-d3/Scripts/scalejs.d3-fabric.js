﻿/*global define*/
define(function () {
    //'use strict';

    var d3fabricAPI = { version: "1.0.0" };

    return function (d3, fabric, gsap) {
        if (!d3 || !fabric) {
            return false;
        }
        function parseVersion(ver) {
            var res = {
                major: 0,
                minor: 0,
                build: 0
            },
                results;
            if (ver) {
                results = /([0-9]*)\.([0-9]*)\.([0-9]*)/i.exec(ver);
                if (results) {
                    res.major = results.length > 1 ? parseInt(results[1], 10) : 0;
                    res.minor = results.length > 2 ? parseInt(results[2], 10) : 0;
                    res.build = results.length > 3 ? parseInt(results[3], 10) : 0;
                }
            }
            res.atLeast = function (major, minor, build) {
                if (!major || res.major < major) {
                    return false;
                }
                if (minor && res.minor < minor) {
                    return false;
                }
                if (build && res.build < build) {
                    return false;
                }
                return true;
            };
            return res;
        }
        if (!parseVersion(d3.version).atLeast(3, 4, 1)) {
            console.error("Unsupported d3.js version. Need at least 3.4.1 or higher");
            return false;
        }
        if (!parseVersion(fabric.version).atLeast(1, 4)) {
            console.error("Unsupported FabricJS version. Need at least 1.4.0 or higher");
            return false;
        }
        if (d3.fabric) {
            console.error("d3-Fabric is already setup");
            return false;
        }

        //add fabric to d3
        d3.fabric = d3fabricAPI;

        //vars
        var d3_selection_append = d3.selection.prototype.append,
            d3_selection_insert = d3.selection.prototype.insert,
            d3_transition = d3.transition,
            d3_select = d3.select,
            d3_selectAll = d3.selectAll,
            d3_fabric_selection_proto = {},
            d3_fabric_selectionEnter_proto = {},
            d3_fabric_transition_proto = {},
            d3_fabric_transitionId = 0,
            d3_fabric_transitionInheritId,
            d3_fabric_transitionInherit;

        //prototype functions (d3_fabric_subclass based off one from d3)
        var d3_fabric_subclass = Object.setPrototypeOf ? function (object, prototype) {
            Object.setPrototypeOf(object, prototype);
        } : {}.__proto__ ? function (object, prototype) {
            object.__proto__ = prototype;
        } : function (object, prototype) {
            // Hope to god it never gets here... (shakes fist at Windows RT)
            for (var property in prototype) object[property] = prototype[property];
        };

        var d3_fabric_proto = function (object) {
            // tests on Trident, Gecko, and WebKit have shown that this is the fastest method (http://jsperf.com/getprototypeof-vs-proto)
            return object.constructor.prototype;
        }

        function d3_fabric_selection(groups) {
            d3_fabric_subclass(groups, d3_fabric_selection_proto);
            return groups;
        }
        function d3_fabric_selectionEnter(groups) {
            d3_fabric_subclass(groups, d3_fabric_selectionEnter_proto);
            return groups;
        }
        function d3_default_selection(groups) {
            d3_fabric_subclass(groups, d3.selection.prototype);
            return groups;
        }
        function d3_fabric_transition(groups, id) {
            d3_fabric_subclass(groups, d3_fabric_transition_proto);
            groups.fabricAniId = id;
            return groups;
        }

        //GSAP plugin
        var d3_fabric_use_GSAP = gsap && parseVersion(gsap.version).atLeast(1, 11, 4);
        if (d3_fabric_use_GSAP) {
            /*!
             * VERSION: 1.0.0
             * DATE: 2014-02-14
             * UPDATES AND DOCS AT: http://www.greensock.com
             * 
             * @license Copyright (c) 2008-2014, GreenSock. All rights reserved.
             * This work is subject to the terms at http://www.greensock.com/terms_of_use.html or for
             * Club GreenSock members, the software agreement that was issued with your membership.
             * 
             * @author: Vincent Simonetti, rcmaniac25@hotmail.com
             **/
            (window._gsQueue || (window._gsQueue = [])).push(function () {

                var _drawCalls = [],
                    _ticker, _listening,
                    _onTick = function () {
                        if (_drawCalls.length) {
                            _drawCalls.forEach(function (draw) {
                                draw.render.apply(draw.scope);
                                draw.render._addedDraw = false;
                            });
                            _drawCalls.length = 0;
                        } else {
                            _ticker.removeEventListener("tick", _onTick);
                            _listening = false;
                        }
                    };

                window._gsDefine.plugin({
                    propName: "d3fabric",
                    API: 2,
                    version: "1.0.0",

                    init: function (target, value, tween) {
                        this._target = target;

                        this._fbTween = value.tween.call(target, target.__data__, value.tweenIndex);

                        this._fbCanvasRender = value.canvasRender;
                        this._fbCanvasRenderScope = value.canvasRenderScope
                        if (!_ticker && this._fbCanvasRender) {
                            _ticker = tween.constructor.ticker;
                        }

                        return true;
                    },

                    set: function (ratio) {
                        this._super.setRatio.call(this, ratio);

                        if (this._fbTween) {
                            this._fbTween.call(this._target, ratio);
                            if (this._fbCanvasRender && !this._fbCanvasRender._addedDraw) {
                                _drawCalls.push({
                                    scope: this._fbCanvasRenderScope || null,
                                    render: this._fbCanvasRender
                                });
                                this._fbCanvasRender._addedDraw = true;
                                if (!_listening) {
                                    _ticker.addEventListener("tick", _onTick);
                                    _listening = true;
                                }
                            }
                        }
                    }

                });

            }); if (window._gsDefine) { window._gsQueue.pop()(); }
        }

        //fabric objects
        var fabric_object_private_set = [],
            fabric_group_has_widthHeightOnlyArg = fabric.Group.prototype._calcBounds.length > 0;

        (function () {
            function d3_fabric_private_set(orgSet, key, value) {
                var org = this.get(key),
                    ret = orgSet.call(this, key, value);
                if (this.group && (key === "width" || key === "height") && org !== value) {
                    var fg = this.group;
                    if (fabric_group_has_widthHeightOnlyArg) {
                        fg._calcBounds(true);
                        fg.setCoords();
                    } else {
                        var fgWidth = fg.get("width"),
                            fgHeight = fg.get("height"),
                            update = null,
                            bounds,
                            update = null,
                            aX = [],
                            aY = [];
                        fg.forEachObject(function (o) {
                            // from _calcBounds in fabric.Group
                            if (o === this) o.setCoords(); //All attr/property functions call this already, but it probably will be called after the set function
                            Object.keys(o.oCoords).forEach(function (prop) {
                                aX.push(o.oCoords[prop].x);
                                aY.push(o.oCoords[prop].y);
                            });
                        }, this);
                        bounds = fg._getBounds(aX, aY); // XXX PRIVATE FUNCTION XXX, might be a static function
                        if (bounds.width !== fgWidth) {
                            update = { width: bounds.width };
                        }
                        if (bounds.height !== fgHeight) {
                            if (!update) update = {};
                            update.height = bounds.height;
                        }
                        if (update) {
                            fg.set(update);
                            fg.setCoords();
                        }
                    }
                }
                return ret;
            }
            if (!fabric_object_private_set.length) Object.keys(fabric).forEach(function (e) {
                var type = fabric[e];
                if (type.prototype instanceof fabric.Object || (type.prototype && type.prototype.constructor === fabric.Object)) { // "instanceof is probably not the right way" - Peter
                    var p_set = type.prototype["_set"];
                    if (p_set) {
                        var set = type.prototype["_set"] = function (key, value) { return d3_fabric_private_set.call(this, p_set, key, value); };
                        fabric_object_private_set.push({ typeName: e, type: type, set: set });
                    }
                }
            });
        })();

        //function overrides
        function addCanvas(func, args) {
            var name = args.length ? args[0] : null;
            if (typeof name !== "function" && name.indexOf("fabric:") === 0) {
                var fabricName = name.slice(7);
                if (fabricName === "canvas" || fabricName === "staticcanvas") {

                    function FabricCanvas(c) {
                        return new fabric.Canvas(c);
                    }
                    function FabricStaticCanvas(c) {
                        return new fabric.StaticCanvas(c);
                    }

                    var canvasGen = fabricName === "canvas" ? FabricCanvas : FabricStaticCanvas;
                    if (!args.length) args = new Array(1);
                    args[0] = function () {
                        var can = this.ownerDocument.createElement("canvas");

                        function GSAPRender() {
                            can._fabricCanvas.canvas.renderAll();
                        }
                        function NormalRender() {
                            var t = Date.now();
                            if (t > can._fabricCanvas.time) {
                                d3_fabric_transition_process.call(can._fabricCanvas, can._fabricCanvas.transitionItems, t - can._fabricCanvas.time);
                                can._fabricCanvas.time = t;
                            }
                            if (can._fabricCanvas.renderRunning) {
                                fabric.util.requestAnimFrame(can._fabricCanvas.render, can);
                                can._fabricCanvas.canvas.renderAll();
                            }
                        }

                        can._fabricCanvas = {
                            transitionItems: new Array(),
                            canvas: null,
                            renderRunning: false,
                            time: Date.now(),
                            render: d3_fabric_use_GSAP ? GSAPRender : NormalRender
                        };
                        return can;
                    };
                    var sel = func.apply(this, args);

                    /* Bit of hackery to make sure everything is setup correctly:
                     * - Fabric canvas creation must be donw after being appended to the DOM structure since Fabric modifies the DOM structure based on what type of canvas is used
                     * - A circular reference is setup so that during transitions, the elements can be accessed
                     * - The group's parent node is changed to be the "actual" parent node
                     */
                    var can = sel.node();
                    can._fabricCanvas.canvas = canvasGen(can);
                    can._fabricCanvas.canvas._fabricCanvasDomRef = can;
                    sel[0].parentNode = this.node();

                    return d3_fabric_selection(sel);
                }
            }
            return func.apply(this, args);
        }

        d3.selection.prototype.append = function () {
            return addCanvas.call(this, d3_selection_append, arguments);
        };

        d3.selection.prototype.insert = function () {
            return addCanvas.call(this, d3_selection_insert, arguments);
        }

        d3.select = function (node) {
            var sel = d3_select.call(this, node),
                node = sel.empty() ? null : sel.node();
            if (node !== null && node._fabricCanvas !== undefined) {
                return d3_fabric_selection(sel);
            }
            return sel;
        };

        d3.selectAll = function (nodes) {
            var sel = d3_selectAll.call(this, nodes),
                allFabric = true;
            sel.each(function () {
                if (allFabric && this._fabricCanvas === undefined) {
                    allFabric = false;
                }
            });
            if (allFabric) {
                return d3_fabric_selection(sel);
            }
            return sel;
        };

        d3.transition = function (selection) {
            return arguments.length && (d3_fabric_selection_proto.isPrototypeOf(selection) || d3_fabric_transition_proto.isPrototypeOf(selection)) ?
                d3_fabric_transitionInheritId ? selection.transition() : selection :
                d3_transition.apply(this, arguments);
        };

        //fabric canvas
        d3.fabric.selection = d3_fabric_selection_proto;

        //-attr
        d3_fabric_selection_proto.attr = function (name, value) {
            //XXX should this convert "class" to "fabricClassList" if a fabric object?
            if (arguments.length < 2) {
                if (typeof name === "string") {
                    if (name === "class") return this.property(name);
                    name = d3.ns.qualify(name);
                    return d3_fabric_selection_attr_get(name.local ? name.local : name, name.local ? name.space : null);
                }
                Object.keys(name).forEach(function (value) {
                    if (value === "class") this.classed(name[value], true)
                    else this.each(d3_fabric_selection_attr(value, name[value]));
                }, this);
                return this;
            }
            if (name === "class") return this.classed(value, true);
            return this.each(d3_fabric_selection_attr(name, value));
        };
        function d3_fabric_selection_attr_get(name, nameNS) {
            var capitalizedPropName = name.charAt(0).toUpperCase() + name.slice(1),
                getterName = "get" + capitalizedPropName,
                ele = this._fabricCanvas !== undefined ? this._fabricCanvas.canvas : this,
                proto = d3_fabric_proto(ele);
            if (proto[getterName]) {
                return proto[getterName].call(ele);
            } else if (proto.getAttribute) {
                if (nameNS) {
                    return proto.getAttributeNS.call(ele, nameNS, name);
                }
                return proto.getAttribute.call(ele, name);
            }
            return null;
        }
        function d3_fabric_selection_attr_set_need_coord(name) {
            // possibly convert to array?
            return name === "left" ||
                name === "right" ||
                name === "width" ||
                name === "height" ||
                name === "originX" ||
                name === "originY" ||
                name === "scaleX" ||
                name === "scaleY" ||
                name === "strokeWidth" ||
                name === "padding";
        }
        function d3_fabric_selection_attr_set(ele, name, nameNS, value) {
            if (!d3_fabric_is_fabric_object(ele)) {
                return;
            }
            var capitalizedPropName = name.charAt(0).toUpperCase() + name.slice(1),
                    setterName = "set" + capitalizedPropName,
                    proto = d3_fabric_proto(ele),
                    isPathSet = ele instanceof fabric.Path && name === "d";
            if (isPathSet || proto[setterName]) {
                if (isPathSet) {
                    // Set the path
                    ele.initialize(value, {
                        left: ele.getLeft() || 0,
                        top: ele.getTop() || 0,
                        width: ele.getWidth() || 0,
                        height: ele.getHeight() || 0
                    });

                    // Resize width and height
                    var dim = ele._parseDimensions();
                    delete dim.left;
                    delete dim.top;
                    dim.pathOffset = { x: 0, y: 0 };
                    ele.set(dim);
                    ele.setCoords();
                } else {
                    proto[setterName].call(ele, value);
                    if (ele.setCoords && d3_fabric_selection_attr_set_need_coord(name)) ele.setCoords();
                }
            } else if (proto.setAttribute) {
                if (nameNS) {
                    return proto.setAttributeNS.call(ele, nameNS, name, value);
                }
                return proto.setAttribute.call(ele, name, value);
            }
        }
        function d3_fabric_selection_attr(name, value) {
            name = d3.ns.qualify(name);
            function attrFunction() {
                var v = value.apply(this, arguments);
                if (v !== null) {
                    d3_fabric_selection_attr_set(this._fabricCanvas !== undefined ? this._fabricCanvas.canvas : this, name.local ? name.local : name, name.local ? name.space : null, v);
                }
            }
            function attrConstant() {
                d3_fabric_selection_attr_set(this._fabricCanvas !== undefined ? this._fabricCanvas.canvas : this, name.local ? name.local : name, name.local ? name.space : null, value);
            }
            return typeof value === "function" ? attrFunction : attrConstant;
        }
        //-classed
        d3_fabric_selection_proto.classed = function (name, value) {
            if (arguments.length < 2) {
                if (typeof name === "string") {
                    var node = this.node(), n = (name = d3_fabric_selection_classes(name)).length, i = -1;
                    if (d3_fabric_is_fabric_object(node)) {
                        if (value = node.fabricClassList) {
                            while (++i < n) if (!value.contains(name[i])) return false;
                        } else {
                            return false;
                        }
                    } else {
                        if (value = node.classList) {
                            while (++i < n) if (!value.contains(name[i])) return false;
                        } else {
                            value = node.getAttribute("class");
                            while (++i < n) if (!d3_fabric_selection_classedRe(name[i]).test(value)) return false;
                        }
                    }
                    return true;
                }
                Object.keys(name).forEach(function (value) {
                    this.each(d3_fabric_selection_classed(value, name[value]));
                }, this);
                return this;
            }
            return this.each(d3_fabric_selection_classed(name, value));
        };
        function d3_fabric_collapse(s) {
            return s.trim().replace(/\s+/g, " ");
        }
        function d3_fabric_is_fabric_object(obj) {
            return obj instanceof fabric.Object ||
                obj instanceof fabric.StaticCanvas ||
                obj instanceof fabric.Point;
        }
        function d3_fabric_selection_classedRe(name) {
            return new RegExp("(?:^|\\s+)" + d3.requote(name) + "(?:\\s+|$)", "g");
        }
        function d3_fabric_selection_classes(name) {
            return name.trim().split(/^|\s+/);
        }
        function d3_fabric_selection_classed(name, value) {
            name = d3_fabric_selection_classes(name).map(d3_fabric_selection_classedName);
            var n = name.length;
            function classedConstant() {
                var i = -1;
                while (++i < n) name[i](this, value);
            }
            function classedFunction() {
                var i = -1, x = value.apply(this, arguments);
                while (++i < n) name[i](this, x);
            }
            return typeof value === "function" ? classedFunction : classedConstant;
        }
        function d3_fabric_selection_classedName(name) {
            var re = d3_fabric_selection_classedRe(name);
            return function (node, value) {
                if (d3_fabric_is_fabric_object(node)) {
                    if (node.fabricClassList === undefined || node.fabricClassList === null) node.fabricClassList = new Array();
                    return value ? d3_fabric_array_add(node.fabricClassList, name) : cd3_fabric_array_remove(node.fabricClassList, name);
                } else {
                    function nodeClass(node) {
                        if (c = node.classList) return value ? c.add(name) : c.remove(name);
                        var c = node.getAttribute("class") || "";
                        if (value) {
                            re.lastIndex = 0;
                            if (!re.test(c)) node.setAttribute("class", d3_fabric_collapse(c + " " + name));
                        } else {
                            node.setAttribute("class", d3_fabric_collapse(c.replace(re, " ")));
                        }
                    }
                    nodeClass(node);
                    if (node._fabricCanvas && node._fabricCanvas.canvas && node._fabricCanvas.canvas.getSelectionElement) {
                        // if an interactive canvas, then the selection element and parent should be modified too
                        var selectionElement = node._fabricCanvas.canvas.getSelectionElement();
                        nodeClass(selectionElement);
                        nodeClass(selectionElement.parentNode);
                    }
                }
            };
        }
        function d3_fabric_array_add(arr, value) {
            if (arr.indexOf(value) == -1) {
                arr.push(value);
            }
            return arr;
        }
        function d3_fabric_array_remove(arr, value) {
            var i;
            if ((i = arr.indexOf(value)) != -1) {
                arr.splic(i, 1);
            }
            return arr;
        }
        //-style
        d3_fabric_selection_proto.style = function (name, value, priority) {
            var n = arguments.length;
            if (n < 3) {
                if (typeof name !== "string") {
                    Object.keys(name).forEach(function (priority) {
                        this.each(d3_fabric_selection_style(this, priority, name[priority], ""));
                    }, this);
                    return this;
                }
                if (n < 2) return this.attr(name);
                priority = "";
            }
            return this.each(d3_fabric_selection_style(this, name, value, priority));
        };
        function d3_fabric_selection_style_special(name) {
            return {
                specialCase: ["left", "top"].indexOf(name) >= 0,
                fabricCanvasSpecialCase: ["width", "height"].indexOf(name) >= 0
            };
        }
        function d3_fabric_selection_style_nodes(srcNode, specialCase) {
            var list = [srcNode];
            if (srcNode._fabricCanvas !== undefined && srcNode._fabricCanvas.canvas.getSelectionElement) {
                var selectionElement = srcNode._fabricCanvas.canvas.getSelectionElement();
                if (specialCase) {
                    // modify the canvas container
                    list[0] = selectionElement.parentNode;
                } else {
                    // modify "all the nodes"
                    list.push(selectionElement);
                    if (selectionElement.parentNode) list.push(selectionElement.parentNode);
                }
            }
            return list;
        }
        function d3_fabric_selection_style(groups, name, value, priority) {
            // While nearly all fabric objects can just use the attrFunc, if left and/or top are changed on a interactive
            // canvas element, the div container for the selection canvas should be the real element changed.
            var procInfo = d3_fabric_selection_style_special(name),
                attrFunc = d3_fabric_selection_attr(name, value);
            return function (d, i, j) {
                if ((procInfo.fabricCanvasSpecialCase && this._fabricCanvas !== undefined) || d3_fabric_is_fabric_object(this)) {
                    attrFunc.call(this, d, i, j);
                } else {
                    var styleGroups = d3_default_selection([]),
                        subgroup = d3_fabric_selection_style_nodes(this, procInfo.specialCase);
                    if (subgroup.length > 0) {
                        subgroup.parentNode = subgroup.length === 1 && subgroup[0] && this !== subgroup[0] ? subgroup[0].parentNode : groups[j].parentNode;
                        styleGroups.push(subgroup);
                        styleGroups.style(name, value, priority);
                    }
                }
            };
        }
        //-property
        d3_fabric_selection_proto.property = function (name, value) {
            if (arguments.length < 2) {
                if (typeof name === "string") {
                    var n = this.node();
                    if (name === "class" && (n._fabricCanvas !== undefined || d3_fabric_is_fabric_object(n))) {
                        n = n._fabricCanvas !== undefined ? n._fabricCanvas.canvas : n;
                        return n.fabricClassList ? n.fabricClassList.join(" ") : "";
                    }
                    return n._fabricCanvas !== undefined ? n._fabricCanvas.canvas[name] : n[name];
                }
                var updateCoords = false;
                Object.keys(name).forEach(function (value) {
                    if (value === "class") this.classed(name[value], true);
                    else this.each(function () {
                        if (this._fabricCanvas !== undefined) {
                            this._fabricCanvas.canvas[value] = name[value];
                        } else {
                            this[value] = name[value];
                            updateCoords |= d3_fabric_selection_attr_set_need_coord(name);
                        }
                    });
                }, this);
                if (updateCoords) this.each(function () {
                    if (this.setCoords) this.setCoords();
                });
                return this;
            }
            if (name === "class") return this.classed(value, true);
            return this.each(function () {
                if (this._fabricCanvas !== undefined) {
                    this._fabricCanvas.canvas[name] = value;
                } else {
                    this[name] = value;
                    if (this.setCoords && d3_fabric_selection_attr_set_need_coord(name)) this.setCoords();
                }
            });
        };
        //-text
        d3_fabric_selection_proto.text = function (value) {
            if (arguments.length) {
                var textSet = typeof value === "function" ? function () {
                    var v = value.apply(this, arguments);
                    return v == null ? "" : v;
                } : value == null ? function () {
                    return "";
                } : function () {
                    return value;
                };
                return this.each(function () {
                    if (this instanceof fabric.Text) {
                        this.setText(textSet.apply(this, arguments));
                        this.setCoords();
                    } else {
                        this.fabricText = textSet.apply(this, arguments);
                    }
                });
            }
            var n = this.node();
            return n instanceof fabric.Text ? n.getText() : n.fabricText !== undefined ? n.fabricText : null;
        };
        //-append
        d3_fabric_selection_proto.append = function (name) {
            var sel = this;
            name = d3_fabric_selection_append(name);
            return d3_fabric_selection_proto.select.call(this, function (d, i, j) {
                var parent = sel[j].parentNode,
                    canvas = parent !== undefined && parent !== null && parent._fabricCanvas !== undefined ? parent : this._fabricCanvas !== undefined ? this : null,
                    fabricCanvas = canvas !== null ? canvas._fabricCanvas : null,
                    collection = this instanceof fabric.Group ? this : parent instanceof fabric.Group ? parent : fabricCanvas !== null ? fabricCanvas.canvas : null;
                if (collection !== null) {
                    var item = name.apply(this, arguments);
                    collection.add(item);
                    if (collection.calcOffset) collection.calcOffset(); // calcOffset used in multiple Fabric.JS examples, unsure if really necessary but here as a precaution
                    return item;
                }
                return null;
            });
        };
        function d3_fabric_selection_append(name) {
            return typeof name === "function" ? name : function () {
                var obj = null,
                    ln = name.toLowerCase();
                if (ln === "image") return null; //requires DOM element...
                for (var i = 0, s = fabric_object_private_set.length; i < s; i++) {
                    if (fabric_object_private_set[i].typeName.toLowerCase() === ln) {
                        if (ln === "text" || ln === "itext") {
                            obj = new fabric_object_private_set[i].type("");
                        } else if (ln === "path") {
                            obj = new fabric_object_private_set[i].type([]);
                        } else {
                            obj = new fabric_object_private_set[i].type();
                        }
                        break;
                    }
                }
                if (obj) obj.selectable = false;
                return obj;
            };
        }
        //-insert
        d3_fabric_selection_proto.insert = function (name, before) {
            var sel = this;
            name = d3_fabric_selection_append(name);
            before = d3_fabric_selection_selector(before, true);
            return d3_fabric_selection_proto.select.call(this, function (d, i, j) {
                var parent = sel[j].parentNode,
                    canvas = parent !== undefined && parent !== null && parent._fabricCanvas !== undefined ? parent : this._fabricCanvas !== undefined ? this : null,
                    fabricCanvas = canvas !== null ? canvas._fabricCanvas : null,
                    collection = this instanceof fabric.Group ? this : parent instanceof fabric.Group ? parent : fabricCanvas !== null ? fabricCanvas.canvas : null;
                if (collection !== null) {
                    var item = name.apply(this, arguments),
                        priorItem = before.apply(this, arguments) || null,
                        priorItemIndex = priorItem === null ? -1 : collection.getObjects().indexOf(priorItem);
                    priorItemIndex === -1 ? collection.add(item) : collection.insertAt(item, priorItemIndex, false);
                    if (collection.calcOffset) collection.calcOffset(); // calcOffset used in multiple Fabric.JS examples, unsure if really necessary but here as a precaution
                    if (item.setCoords) item.setCoords();
                    return item;
                }
                return null;
            });
        };
        //-remove
        d3_fabric_selection_proto.remove = function () {
            return this.each(function () {
                var collection = this.hasOwnProperty("group") && this.group instanceof fabric.Group ? this.group : this.hasOwnProperty("canvas") ? this.canvas : null,
                    p;
                if (collection) {
                    if (collection.contains(this)) {
                        collection.remove(this);
                        if (collection.setCoords) collection.setCoords();
                    }
                } else if (!d3_fabric_is_fabric_object(this) && (p = this.parentNode)) {
                    if (this._fabricCanvas && this._fabricCanvas.canvas && this._fabricCanvas.canvas.getSelectionElement) {
                        var node = this._fabricCanvas.canvas.getSelectionElement().parentNode;
                        if (node.parentNode) node.parentNode.removeChild(node);
                    } else {
                        p.removeChild(this);
                    }
                }
            });
        };
        //-data
        d3_fabric_selection_proto.data = function (value, key) {
            var selData = d3.selection.prototype.data.call(this, value, key),
                en = selData.enter(),
                ex = selData.exit();
            d3_fabric_selectionEnter(en);
            d3_fabric_selection(ex);
            return d3_fabric_selection(selData);
        };
        //-datum
        d3_fabric_selection_proto.datum = d3.selection.prototype.datum;
        //-filter
        d3_fabric_selection_proto.filter = function (filter) {
            if (typeof filter !== "function") filter = d3_fabric_selection_filter(filter);
            return d3_fabric_selection(d3.selection.prototype.filter.call(this, filter));
        }
        function d3_fabric_selection_filter(selector) {
            var selectorTest = d3_fabric_selection_parse_selector(selector);
            return function () {
                return selectorTest.testObj(this);
            };
        }
        //-sort
        d3_fabric_selection_proto.sort = d3.selection.prototype.sort;
        //-order
        d3_fabric_selection_proto.order = function () {
            //XXX should disable renderOnAddRemove until reording is complete?
            for (var j = -1, m = this.length; ++j < m;) {
                for (var group = this[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
                    if (node = group[i]) {
                        if (next) {
                            var collection = next.hasOwnProperty("group") && next.group instanceof fabric.Group ? next.group : next.hasOwnProperty("canvas") ? next.canvas : null,
                                p;
                            if (collection) {
                                // fabric objects
                                var nodeIndex = collection.getObjects().indexOf(node),
                                    nextIndex = collection.getObjects().indexOf(next);
                                if (nodeIndex !== -1 && nextIndex !== -1 && nextIndex !== (nodeIndex + 1) && nodeIndex >= 1) {
                                    collection.remove(node);
                                    collection.insertAt(node, nextIndex - 1, false);
                                    if (collection.setCoords) collection.setCoords();
                                }
                            } else if (!d3_fabric_is_fabric_object(this) && !d3_fabric_is_fabric_object(next) && (p == next.parentNode)) {
                                // DOM nodes
                                p.insertBefore(node, next);
                            }
                        }
                        next = node;
                    }
                }
            }
            return this;
        };
        //-on
        d3_fabric_selection_proto.on = function (type, listener, capture) {
            var n = arguments.length;
            if (n < 3) {
                if (typeof type !== "string") {
                    if (n < 2) listener = false;
                    Object.keys(name).forEach(function (capture) {
                        this.each(d3_fabric_selection_on(capture, type[capture], listener));
                    }, this);
                    return this;
                }
                if (n < 2) return this;
                capture = false;
            }
            return this.each(d3_fabric_selection_on(type, listener, capture));
        };
        function d3_fabric_selection_on(type, listener, capture) {
            var wrap = d3_fabric_selection_on_wrap;
            function onAdd() {
                var li = wrap(listener, arguments);
                listener._ = li;
                if (this._fabricCanvas !== undefined) {
                    this._fabricCanvas.canvas.on(type, li);
                } else {
                    this.on(type, li);
                }
            }
            function onRemove() {
                var li = listener._;
                if (this._fabricCanvas !== undefined) {
                    this._fabricCanvas.canvas.off(type, li);
                } else {
                    this.off(type, li);
                }
            }
            return listener ? onAdd : onRemove;
        }
        function d3_fabric_selection_on_wrap_event(opt) {
            if (!opt.e) {
                /* TODO: create fake event
                 * variables
                 * - isFakeD3Event:bool //always "true" so that it can be determined that everything here is not a browser event, but instead built from the known options provided
                 * - bubbles:bool
                 * - cancelable:bool
                 * - currentTarget:<obj>
                 * - defaultPrevented:bool
                 * - eventPhase:int
                 * - target:<obj>
                 * - timeStamp:Date
                 * - type:<obj>
                 * functions
                 * - preventDefault():void
                 * - stopImmediatePropagation():void
                 * - stopPropagation():void
                 */
            }
            return opt.e;
        }
        function d3_fabric_selection_on_wrap(listener, argumentz) {
            return function (opt) {
                var o = d3.event;
                d3.event = d3_fabric_selection_on_wrap_event(opt);
                argumentz[0] = this.__data__;
                try {
                    listener.apply(this, argumentz);
                } finally {
                    d3.event = o;
                }
            };
        }
        //-transition
        d3_fabric_selection_proto.transition = function () {
            var id = d3_fabric_transitionInheritId || ++d3_fabric_transitionId,
                subgroups = [],
                subgroup,
                node,
                transition = d3_fabric_transitionInherit || {
                    time: Date.now(),
                    ease: d3_fabric_use_GSAP ? Cubic.easeInOut : d3.ease("cubic-in-out"),
                    delay: 0,
                    duration: 250,
                    fabricCanvas: null
                };
            for (var j = -1, m = this.length; ++j < m;) {
                subgroups.push(subgroup = []);
                for (var group = this[j], i = -1, n = group.length; ++i < n;) {
                    if (node = group[i]) {
                        if (!transition.fabricCanvas) transition.fabricCanvas = node.canvas ? node.canvas._fabricCanvasDomRef._fabricCanvas : null
                        d3_fabric_transitionNode(node, i, id, transition);
                    }
                    subgroup.push(node);
                }
            }
            return d3_fabric_transition(subgroups, id);
        };
        //-interrupt
        d3_fabric_selection_proto.interrupt = d3.selection.prototype.interrupt;
        //-each
        d3_fabric_selection_proto.each = d3.selection.prototype.each;
        //-call
        d3_fabric_selection_proto.call = d3.selection.prototype.call;
        //-empty
        d3_fabric_selection_proto.empty = d3.selection.prototype.empty;
        //-node
        d3_fabric_selection_proto.node = d3.selection.prototype.node;
        //-domNode
        d3_fabric_selection_proto.domNode = function () {
            var n = this.node(),
                group = n instanceof fabric.Object ? [] : [n];
            group.parentNode = this[0].parentNode;
            return d3_default_selection([group]);
        };
        //-parentNode
        d3_fabric_selection_proto.parentNode = function () {
            var n = this.node(),
                canvas = n._fabricCanvas !== undefined ? n._fabricCanvas.canvas : null;
            // If an interactive canvas, then a wrapper div was created, meaning that we want the parent of that div as opposed to the div itself. Otherwise, get the usual parent of the canvas element
            return canvas instanceof fabric.Canvas ? n.parentNode.parentNode : d3_fabric_is_fabric_object(n) ? null : n.parentNode;
        };
        //-startRender
        d3_fabric_selection_proto.startRender = function () {
            return this.each(function () {
                if (this._fabricCanvas !== undefined && !this._fabricCanvas.renderRunning) {
                    this._fabricCanvas.time = Date.now();
                    this._fabricCanvas.renderRunning = true;
                    this._fabricCanvas.render.call(this);
                }
            });
        };
        //-stopRender
        d3_fabric_selection_proto.stopRender = function () {
            return this.each(function () {
                if (this._fabricCanvas !== undefined && this._fabricCanvas.renderRunning) {
                    this._fabricCanvas.renderRunning = false;
                }
            });
        };
        //-pumpRender
        d3_fabric_selection_proto.pumpRender = function () {
            return this.each(function () {
                if (this._fabricCanvas !== undefined) {
                    this._fabricCanvas.render.call(this);
                }
            });
        };
        //-size
        d3_fabric_selection_proto.size = d3.selection.prototype.size;
        //-select
        d3_fabric_selection_proto.select = function (selector) {
            selector = d3_fabric_selection_selector(selector, true);
            return d3_fabric_selection(d3.selection.prototype.select.call(this, selector));
        };
        function d3_fabric_selection_selector(selector, firstReturn) {
            return typeof selector === "function" ? selector : function () {
                var result = new Array(),
                    collection = this._fabricCanvas !== undefined ? this._fabricCanvas.canvas : this instanceof fabric.Group ? this : null,
                    selectorTest = d3_fabric_selection_parse_selector(selector);
                if (collection !== null) collection.forEachObject(function (obj) {
                    if ((!firstReturn || result.length == 0) && selectorTest.testObj(obj)) {
                        result.push(obj);
                    }
                }, this);
                return firstReturn ? result.length > 0 ? result[0] : null : result;
            };
        }
        function d3_fabric_selection_parse_selector(selector) {
            function splitSelector(selector) {
                var classIndex = selector.indexOf("."),
                    idIndex = selector.indexOf("#"),
                    selTypeEnd = classIndex === -1 || idIndex === -1 ? classIndex === -1 ? idIndex : classIndex : Math.min(classIndex, idIndex),
                    selClassEnd = classIndex >= 0 ? idIndex === -1 ? classIndex : Math.max(classIndex, idIndex) : 0,
                    selIdEnd = idIndex >= 0 ? classIndex === -1 ? idIndex : Math.max(idIndex, classIndex) : 0,
                    selType = selTypeEnd > 0 ? selector.slice(0, selTypeEnd) : (selTypeEnd === -1 && selector.length > 0) ? selector : null,
                    selClass = classIndex >= 0 ? classIndex == selClassEnd ? selector.slice(classIndex + 1) : selector.slice(classIndex + 1, selClassEnd) : null,
                    selId = idIndex >= 0 ? idIndex == selIdEnd ? selector.slice(idIndex + 1) : selector.slice(idIndex + 1, selIdEnd) : null;
                function testType(obj) {
                    return selType === null || d3_fabric_compare_type(obj, selType);
                }
                function testClass(obj) {
                    return selClass === null || (obj.fabricClassList !== undefined && obj.fabricClassList !== null && obj.fabricClassList.indexOf(selClass) >= 0);
                }
                function testId(obj) {
                    return selId === null || selId === obj.fabricText;
                }
                function testObj(obj) {
                    return testType(obj) && testClass(obj) && testId(obj);
                }
                return {
                    testType: testType,
                    testClass: testClass,
                    testId: testId,
                    testObj: testObj
                };
            }
            function parseSelectors(selectorGroup) {
                if (selectorGroup) {
                    var cleanSelectors = d3.map();
                    selectorGroup.forEach(function (ele) {
                        ele = ele.trim();
                        if (ele.length > 0 && !cleanSelectors.has(ele)) cleanSelectors.set(ele, splitSelector(ele));
                    });
                    return cleanSelectors;
                }
                return null;
            }
            function singleSelector(selector) {
                var group = d3.map();
                group.set(selector, splitSelector(selector));
                return group;
            }
            if (!selector || selector.length === 0) {
                function returnFalse() { return false; }
                return {
                    testType: returnFalse,
                    testClass: returnFalse,
                    testId: returnFalse,
                    testObj: returnFalse
                };
            }
            var selectorGroup = selector.indexOf(",") >= 0 ? parseSelectors(d3.set(selector.split(","))) : singleSelector(selector);
            function test(type, obj) {
                if (selectorGroup.size() === 1) return selectorGroup.values()[0]["test" + type].call(selector, obj);
                var testPassed = true;
                selectorGroup.forEach(function (selector) {
                    testPassed &= testPassed && selector["test" + type].call(selector, obj);
                });
                return testPassed;
            }
            return {
                testType: function (obj) { return test("Type", obj); },
                testClass: function (obj) { return test("Class", obj); },
                testId: function (obj) { return test("Id", obj); },
                testObj: function (obj) { return test("Obj", obj); }
            };
        }
        function d3_fabric_compare_type(obj, type) {
            if (!obj) return false;
            var ln = type.toLowerCase();
            for (var i = 0, s = fabric_object_private_set.length; i < s; i++) {
                if (fabric_object_private_set[i].typeName.toLowerCase() === ln) {
                    return obj instanceof fabric_object_private_set[i].type;
                }
            }
            return false;
        }
        //-selectAll
        d3_fabric_selection_proto.selectAll = function (selector) {
            selector = d3_fabric_selection_selector(selector, false);
            return d3_fabric_selection(d3.selection.prototype.selectAll.call(this, selector));
        };

        //fabric selection (enter)
        d3.fabric.selection_enter = d3_fabric_selectionEnter_proto;

        d3_fabric_selectionEnter_proto.append = d3_fabric_selection_proto.append;
        d3_fabric_selectionEnter_proto.empty = d3_fabric_selection_proto.empty;
        d3_fabric_selectionEnter_proto.node = d3_fabric_selection_proto.node;
        d3_fabric_selectionEnter_proto.call = d3_fabric_selection_proto.call;
        d3_fabric_selectionEnter_proto.size = d3_fabric_selection_proto.size;
        d3_fabric_selectionEnter_proto.select = function (selector) {
            return d3_fabric_selection(d3.selection.enter.prototype.select.call(this, selector));
        };
        d3_fabric_selectionEnter_proto.insert = function (name, before) {
            if (arguments.length < 2) before = d3_fabric_selection_enterInsertBefore(this);
            return d3_fabric_selection_proto.insert.call(this, name, before);
        };
        function d3_fabric_selection_enterInsertBefore(enter) {
            var i0, j0;
            return function (d, i, j) {
                var group = enter[j].update, n = group.length, node;
                if (j != j0) j0 = j, i0 = 0;
                if (i >= i0) i0 = i + 1;
                while (!(node = group[i0]) && ++i0 < n);
                return node;
            };
        }

        //fabric transition
        d3.fabric.transition = d3_fabric_transition_proto;

        function d3_fabric_timer_call(fabricCanvas, callback) {
            if (fabricCanvas && fabricCanvas.transitionItems && callback) {
                var time = Date.now(),
                    item = {
                        startTime: time,
                        currentTime: time,
                        callback: callback
                    };
                fabricCanvas.transitionItems.push(item);
            }
        }
        function d3_fabric_transitionNode(node, i, id, inherit) {
            var lock = node.__transition__ || (node.__transition__ = {
                active: 0,
                count: 0
            }), transition = lock[id];
            if (!transition) {
                var time = inherit.time;
                transition = lock[id] = {
                    time: time,
                    ease: inherit.ease,
                    delay: inherit.delay,
                    duration: inherit.duration,
                    fabricCanvas: inherit.fabricCanvas,
                    canvasElement: inherit.canvasElement
                };
                ++lock.count;
                if (!d3_fabric_use_GSAP) {
                    transition.tween = d3.map();

                    //more or less a straight copy of d3's code, with some minor changes
                    d3_fabric_timer_call(transition.fabricCanvas, function (elapsed) {
                        var d = node.__data__,
                            ease = transition.ease,
                            delay = transition.delay,
                            duration = transition.duration,
                            tweened = [];

                        if (delay <= elapsed) return start(elapsed - delay);
                        return true;

                        function start(elapsed) {
                            if (lock.active > id) return stop();
                            lock.active = id;
                            transition.event && transition.event.start.call(node, d, i);

                            transition.tween.forEach(function (key, value) {
                                if (value = value.call(node, d, i)) {
                                    tweened.push(value);
                                }
                            });
                            if (tweened.length == 0) return stop();
                            d3_fabric_timer_call(transition.fabricCanvas, tick);
                            return false;
                        }

                        function tick(elapsed) {
                            if (lock.active !== id) return stop();

                            var t = elapsed / duration,
                                e = ease(t),
                                n = tweened.length;

                            while (n > 0) {
                                tweened[--n].call(node, e);
                            }
                            if (t >= 1) {
                                transition.event && transition.event.end.call(node, d, i);
                                return stop();
                            }
                            return true;
                        }

                        function stop() {
                            if (--lock.count) delete lock[id];
                            else delete node.__transition__;
                            return false;
                        }
                    });
                }
            }
        }
        function d3_fabric_transition_process(transitionItems, delta) {
            var i = transitionItems.length;
            while (--i >= 0) {
                var transItem = transitionItems.shift();
                transItem.currentTime += delta;
                if (transItem.callback.call(this.canvas, transItem.currentTime - transItem.startTime)) transitionItems.push(transItem);
            }
        }

        //-delay
        d3_fabric_transition_proto.delay = function (value) {
            var id = this.fabricAniId;
            return d3_fabric_selection_proto.each.call(this, typeof value === "function" ? function (d, i, j) {
                this.__transition__[id].delay = +value.call(this, d, i, j);
            } : (value = +value, function () {
                this.__transition__[id].delay = value;
            }));
        };
        //-duration
        d3_fabric_transition_proto.duration = function (value) {
            var id = this.fabricAniId;
            return d3_fabric_selection_proto.each.call(this, typeof value === "function" ? function (d, i, j) {
                this.__transition__[id].duration = Math.max(1, value.call(this, d, i, j));
            } : (value = Math.max(1, value), function () {
                this.__transition__[id].duration = value;
            }));
        };
        //-ease
        d3_fabric_transition_proto.ease = function (value) {
            var id = this.fabricAniId;
            if (arguments.length < 1) return this.node().__transition__[id].ease;
            if (typeof value !== "function") value = d3_fabric_use_GSAP ? EaseLookup.find(value) : d3.ease.apply(d3, arguments);
            return d3_fabric_selection_proto.each.call(this, function () {
                this.__transition__[id].ease = value;
            });
        };
        //-attr
        d3_fabric_transition_proto.attr = function (nameNS, value) {
            if (arguments.length < 2) {
                Object.keys(nameNS).forEach(function (value) {
                    this.attr(value, nameNS[value]);
                }, this);
                return this;
            }
            var interpolate = d3.interpolate,
                name = d3.ns.qualify(nameNS),
                nameLocal = name.local ? name.local : name,
                nameSpace = name.local ? name.space : null;

            function attrTween(b) {
                return b === null ? function () { } : function () {
                    var a = d3_fabric_selection_attr_get.call(this, nameLocal, nameSpace), i;
                    return a !== b && (i = interpolate(a, b), function (t) { d3_fabric_selection_attr_set(this, nameLocal, nameSpace, i(t)); });
                };
            }
            return d3_fabric_transition_tween(this, "attr." + nameNS, value, attrTween);
        };
        //-attrTween
        d3_fabric_transition_proto.attrTween = function (nameNS, tween) {
            var name = d3.ns.qualify(nameNS),
                nameLocal = name.local ? name.local : name,
                nameSpace = name.local ? name.space : null;

            function attrTween(d, i) {
                var f = tween.call(this, d, i, d3_fabric_selection_attr_get.call(this, nameLocal, nameSpace));
                return f && function (t) { d3_fabric_selection_attr_set(this, nameLocal, nameSpace, f(t)); };
            }
            return this.tween("attr." + nameNS, attrTween);
        };
        //-style
        d3_fabric_transition_proto.style = function (name, value, priority) {
            var n = arguments.length;
            if (n < 3) {
                if (typeof name !== "string") {
                    if (n < 2) value = "";
                    Object.keys(name).forEach(function (priority) {
                        this.style(priority, name[priority], value);
                    }, this);
                    return this;
                }
                priority = "";
            }
            var procInfo = d3_fabric_selection_style_special(name);
            function styleNull() {
                if (!((procInfo.fabricCanvasSpecialCase && this._fabricCanvas !== undefined) || d3_fabric_is_fabric_object(this))) {
                    d3_fabric_selection_style_nodes(this, procInfo.specialCase).forEach(function (n) {
                        n.style.removeProperty(name);
                    });
                }
            }
            function styleString(b) {
                return b === null ? styleNull : (b += "", function () {
                    if ((procInfo.fabricCanvasSpecialCase && this._fabricCanvas !== undefined) || d3_fabric_is_fabric_object(this)) {
                        var a = d3_fabric_selection_attr_get.call(this, name, null);
                        return a !== b && (i = d3.interpolate(a, b), function (t) { d3_fabric_selection_attr_set(this, name, null, i(t)); });
                    } else {
                        var sourceFunctions = [];
                        d3_fabric_selection_style_nodes(this, procInfo.specialCase).forEach(function (n) {
                            var a = window.getComputedStyle(n, null).getPropertyValue(name);
                            sourceFunctions.push(a !== b && d3.interpolate(a, b));
                        });

                        return sourceFunctions.length > 0 && function (t) {
                            d3_fabric_selection_style_nodes(this, procInfo.specialCase).forEach(function (n, i) {
                                if (f = sourceFunctions[i]) n.style.setProperty(name, f(t), priority);
                            });
                        };
                    }
                });
            }
            return d3_fabric_transition_tween(this, "style." + name, value, styleString);
        };
        //-styleTween
        d3_fabric_transition_proto.styleTween = function (name, tween, priority) {
            if (arguments.length < 3) priority = "";

            var procInfo = d3_fabric_selection_style_special(name);
            function styleTween(d, i) {
                var isFabric = d3_fabric_is_fabric_object(this);

                if ((procInfo.fabricCanvasSpecialCase && this._fabricCanvas !== undefined) || isFabric) {
                    var fabricNode = isFabric ? this : this._fabricCanvas.canvas,
                        f = tween.call(fabricNode, d, i, d3_fabric_selection_attr_get.call(fabricNode, name, null));
                    return f && function (t) { d3_fabric_selection_attr_set(this, name, null, f(t)); };
                } else {
                    // If this is a special case, then we want the parent of the of the selection element. Otherwise we just use the node
                    var sourceFunctions = [];
                    d3_fabric_selection_style_nodes(this, procInfo.specialCase).forEach(function (n) {
                        sourceFunctions.push(tween.call(n, d, i, window.getComputedStyle(n, null).getPropertyValue(name)));
                    });

                    return sourceFunctions.length > 0 && function (t) {
                        d3_fabric_selection_style_nodes(this, procInfo.specialCase).forEach(function (n, i) {
                            if (f = sourceFunctions[i]) n.style.setProperty(name, f(t), priority);
                        });
                    };
                }
            }

            return this.tween("style." + name, styleTween);
        };
        //-text
        d3_fabric_transition_proto.text = function (value) {
            function textTween(b) {
                if (b == null) b = "";
                return function () {
                    if (this instanceof fabric.Text) {
                        this.setText(b);
                        this.setCoords();
                    } else {
                        this.fabricText = b;
                    }
                };
            }
            return d3_fabric_transition_tween(this, "text", value, textTween);
        };
        //-tween
        d3_fabric_transition_proto.tween = function (name, tween) {
            var id = this.fabricAniId;
            if (arguments.length < 2) return this.node().__transition__[id].tween.get(name);
            return d3_fabric_selection_proto.each.call(this, tween == null ? function () {
                if (!d3_fabric_use_GSAP) this.__transition__[id].tween.remove(name);
            } : function (d, i) {
                d3_fabric_transition_tween_direct(this, name, tween, id, i);
            });
        };
        function d3_fabric_transition_tween(groups, name, value, tween) {
            var id = groups.fabricAniId;
            return d3_fabric_selection_proto.each.call(groups, typeof value === "function"
                ? function (d, i, j) {
                    d3_fabric_transition_tween_direct(this, name, tween(value.call(this, d, i, j)), id, i);
                }
                : (value = tween(value), function (d, i) {
                    d3_fabric_transition_tween_direct(this, name, value, id, i);
                }));
        }
        function d3_fabric_transition_tween_direct(node, name, value, id, i) {
            if (d3_fabric_use_GSAP) {
                function startAni(trans, d, i) {
                    trans.event && trans.event.start.call(this, d, i);
                }
                function endAni(trans, lock, id, d, i) {
                    trans.event && trans.event.end.call(this, d, i);

                    if (--lock.count) delete lock[id];
                    else delete this.__transition__;
                }
                var lock = node.__transition__,
                    trans = lock[id],
                    fbCanvas = trans.fabricCanvas ? trans.fabricCanvas.render : null;
                var args = {
                    ease: trans.ease,
                    delay: trans.delay / 1000.0,
                    /*onStart: startAni,
                    onStartParams: [trans, d, i],
                    onStartScope: this,
                    onComplete: endAni,
                    onCompleteParams: [trans, lock, id, d, i],
                    onCompleteScope: this,*/
                    d3fabric: {
                        canvasRender: fbCanvas,
                        tween: value,
                        tweenIndex: i
                    }
                };
                TweenLite.to(node, trans.duration / 1000.0, args);
            } else {
                node.__transition__[id].tween.set(name, value);
            }
        }
        //-select
        d3_fabric_transition_proto.select = function (selector) {
            selector = d3_fabric_selection_selector(selector, true);
            var id = this.fabricAniId,
                group = d3.selection.prototype.select.call(this, function (d, i, j) {
                    var subnode = selector.call(this, d, i, j);
                    d3_fabric_transitionNode(subnode, i, id, this.__transition__[id]);
                    return subnode;
                });

            return d3_fabric_transition(group, id);
        };
        //-selectAll
        d3_fabric_transition_proto.selectAll = function (selector) {
            var id = this.fabricAniId, subgroups = [], subgroup, subnodes, node, subnode, transition;
            selector = d3_fabric_selection_selector(selector, false);
            for (var j = -1, m = this.length; ++j < m;) {
                for (var group = this[j], i = -1, n = group.length; ++i < n;) {
                    if (node = group[i]) {
                        transition = node.__transition__[id];
                        subnodes = selector.call(node, node.__data__, i, j);
                        subgroups.push(subgroup = []);
                        for (var k = -1, o = subnodes.length; ++k < o;) {
                            if (subnode = subnodes[k]) d3_fabric_transitionNode(subnode, k, id, transition);
                            subgroup.push(subnode);
                        }
                    }
                }
            }
            return d3_fabric_transition(subgroups, id);
        };
        //-filter
        d3_fabric_transition_proto.filter = function (filter) {
            var subgroups = [], subgroup, group, node;
            if (typeof filter !== "function") filter = d3_fabric_selection_filter(filter);
            for (var j = 0, m = this.length; j < m; j++) {
                subgroups.push(subgroup = []);
                for (var group = this[j], i = 0, n = group.length; i < n; i++) {
                    if ((node = group[i]) && filter.call(node, node.__data__, i, j)) {
                        subgroup.push(node);
                    }
                }
            }
            return d3_fabric_transition(subgroups, this.fabricAniId);
        };
        //-transition
        d3_fabric_transition_proto.transition = function () {
            var id0 = this.fabricAniId, id1 = ++d3_fabric_transitionId, subgroups = [], subgroup, group, node, transition;
            for (var j = 0, m = this.length; j < m; j++) {
                subgroups.push(subgroup = []);
                for (var group = this[j], i = 0, n = group.length; i < n; i++) {
                    if (node = group[i]) {
                        transition = Object.create(node.__transition__[id0]);
                        transition.delay += transition.duration;
                        d3_fabric_transitionNode(node, i, id1, transition);
                    }
                    subgroup.push(node);
                }
            }
            return d3_fabric_transition(subgroups, id1);
        };
        //-remove
        d3_fabric_transition_proto.remove = function () {
            return this.each("end.transition", function () {
                if (this.__transition__.count < 2) {
                    var collection = this.hasOwnProperty("group") && this.group instanceof fabric.Group ? this.group : this.hasOwnProperty("canvas") ? this.canvas : null,
                        p;
                    if (collection) {
                        if (collection.contains(this)) {
                            collection.remove(this);
                            if (collection.setCoords) collection.setCoords();
                        }
                    } else if (!d3_fabric_is_fabric_object(this) && (p = this.parentNode)) {
                        if (this._fabricCanvas && this._fabricCanvas.canvas && this._fabricCanvas.canvas.getSelectionElement) {
                            var node = this._fabricCanvas.canvas.getSelectionElement().parentNode;
                            if (node.parentNode) node.parentNode.removeChild(node);
                        } else {
                            p.removeChild(this);
                        }
                    }
                }
            });
        };
        //-empty
        d3_fabric_transition_proto.empty = d3_fabric_selection_proto.empty;
        //-node
        d3_fabric_transition_proto.node = d3_fabric_selection_proto.node;
        //-size
        d3_fabric_transition_proto.size = d3_fabric_selection_proto.size;
        //-each
        d3_fabric_transition_proto.each = function (type, listener) {
            var id = this.fabricAniId;
            if (arguments.length < 2) {
                var inherit = d3_fabric_transitionInherit,
                    inheritId = d3_fabric_transitionInheritId;
                d3_fabric_transitionInheritId = id;
                d3_fabric_selection_proto.each.call(this, function (d, i, j) {
                    d3_fabric_transitionInherit = this.__transition__[id];
                    type.call(this, d, i, j);
                });
                d3_fabric_transitionInherit = inherit;
                d3_fabric_transitionInheritId = inheritId;
            } else {
                d3_fabric_selection_proto.each.call(this, function (d, i, j) {
                    var transition = this.__transition__[id];
                    (transition.event || (transition.event = d3.dispatch("start", "end"))).on(type, listener);
                });
            }
            return this;

        };
        //-call
        d3_fabric_transition_proto.call = d3_fabric_selection_proto.call;

        return true;
    };
});