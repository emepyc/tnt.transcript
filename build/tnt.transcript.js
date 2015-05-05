(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if (typeof tnt === "undefined") {
    module.exports = tnt = {};
}
// tnt.board = require("./index.js");
// tnt.utils = require("tnt.utils");
// tnt.tooltip = require("tnt.tooltip");

tnt.transcript = require("./index.js");
tnt.tooltip = require("tnt.tooltip");

},{"./index.js":2,"tnt.tooltip":31}],2:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
module.exports = require("./src/transcriptFeature.js");


},{"./src/transcriptFeature.js":40}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
// tnt.utils = require("tnt.utils");
// tnt.tooltip = require("tnt.tooltip");
// tnt.board = require("./src/index.js");

module.exports = require("./src/index");

},{"./src/index":10}],5:[function(require,module,exports){
module.exports = require("./src/api.js");

},{"./src/api.js":6}],6:[function(require,module,exports){
var api = function (who) {

    var _methods = function () {
	var m = [];

	m.add_batch = function (obj) {
	    m.unshift(obj);
	};

	m.update = function (method, value) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			m[i][p] = value;
			return true;
		    }
		}
	    }
	    return false;
	};

	m.add = function (method, value) {
	    if (m.update (method, value) ) {
	    } else {
		var reg = {};
		reg[method] = value;
		m.add_batch (reg);
	    }
	};

	m.get = function (method) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			return m[i][p];
		    }
		}
	    }
	};

	return m;
    };

    var methods    = _methods();
    var api = function () {};

    api.check = function (method, check, msg) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.check(method[i], check, msg);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.check(check, msg);
	} else {
	    who[method].check(check, msg);
	}
	return api;
    };

    api.transform = function (method, cbak) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.transform (method[i], cbak);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.transform (cbak);
	} else {
	    who[method].transform(cbak);
	}
	return api;
    };

    var attach_method = function (method, opts) {
	var checks = [];
	var transforms = [];

	var getter = opts.on_getter || function () {
	    return methods.get(method);
	};

	var setter = opts.on_setter || function (x) {
	    for (var i=0; i<transforms.length; i++) {
		x = transforms[i](x);
	    }

	    for (var j=0; j<checks.length; j++) {
		if (!checks[j].check(x)) {
		    var msg = checks[j].msg || 
			("Value " + x + " doesn't seem to be valid for this method");
		    throw (msg);
		}
	    }
	    methods.add(method, x);
	};

	var new_method = function (new_val) {
	    if (!arguments.length) {
		return getter();
	    }
	    setter(new_val);
	    return who; // Return this?
	};
	new_method.check = function (cbak, msg) {
	    if (!arguments.length) {
		return checks;
	    }
	    checks.push ({check : cbak,
			  msg   : msg});
	    return this;
	};
	new_method.transform = function (cbak) {
	    if (!arguments.length) {
		return transforms;
	    }
	    transforms.push(cbak);
	    return this;
	};

	who[method] = new_method;
    };

    var getset = function (param, opts) {
	if (typeof (param) === 'object') {
	    methods.add_batch (param);
	    for (var p in param) {
		attach_method (p, opts);
	    }
	} else {
	    methods.add (param, opts.default_value);
	    attach_method (param, opts);
	}
    };

    api.getset = function (param, def) {
	getset(param, {default_value : def});

	return api;
    };

    api.get = function (param, def) {
	var on_setter = function () {
	    throw ("Method defined only as a getter (you are trying to use it as a setter");
	};

	getset(param, {default_value : def,
		       on_setter : on_setter}
	      );

	return api;
    };

    api.set = function (param, def) {
	var on_getter = function () {
	    throw ("Method defined only as a setter (you are trying to use it as a getter");
	};

	getset(param, {default_value : def,
		       on_getter : on_getter}
	      );

	return api;
    };

    api.method = function (name, cbak) {
	if (typeof (name) === 'object') {
	    for (var p in name) {
		who[p] = name[p];
	    }
	} else {
	    who[name] = cbak;
	}
	return api;
    };

    return api;
    
};

module.exports = exports = api;
},{}],7:[function(require,module,exports){
var apijs = require ("tnt.api");
var deferCancel = require ("tnt.utils").defer_cancel;

var board = function() {
    "use strict";
    
    //// Private vars
    var svg;
    var div_id;
    var tracks = [];
    var min_width = 50;
    var height    = 0;    // This is the global height including all the tracks
    var width     = 920;
    var height_offset = 20;
    var loc = {
	species  : undefined,
	chr      : undefined,
        from     : 0,
        to       : 500
    };

    // TODO: We have now background color in the tracks. Can this be removed?
    // It looks like it is used in the too-wide pane etc, but it may not be needed anymore
    var bgColor   = d3.rgb('#F8FBEF'); //#F8FBEF
    var pane; // Draggable pane
    var svg_g;
    var xScale;
    var zoomEventHandler = d3.behavior.zoom();
    var limits = {
	left : 0,
	right : 1000,
	zoom_out : 1000,
	zoom_in  : 100
    };
    var cap_width = 3;
    var dur = 500;
    var drag_allowed = true;

    var exports = {
	ease          : d3.ease("cubic-in-out"),
	extend_canvas : {
	    left : 0,
	    right : 0
	},
	show_frame : true
	// limits        : function () {throw "The limits method should be defined"}	
    };

    // The returned closure / object
    var track_vis = function(div) {
	div_id = d3.select(div).attr("id");

	// The original div is classed with the tnt class
	d3.select(div)
	    .classed("tnt", true);

	// TODO: Move the styling to the scss?
	var browserDiv = d3.select(div)
	    .append("div")
	    .attr("id", "tnt_" + div_id)
	    .style("position", "relative")
	    .classed("tnt_framed", exports.show_frame ? true : false)
	    .style("width", (width + cap_width*2 + exports.extend_canvas.right + exports.extend_canvas.left) + "px")

	var groupDiv = browserDiv
	    .append("div")
	    .attr("class", "tnt_groupDiv");

	// The SVG
	svg = groupDiv
	    .append("svg")
	    .attr("class", "tnt_svg")
	    .attr("width", width)
	    .attr("height", height)
	    .attr("pointer-events", "all");

	svg_g = svg
	    .append("g")
            .attr("transform", "translate(0,20)")
            .append("g")
	    .attr("class", "tnt_g");

	// caps
	svg_g
	    .append("rect")
	    .attr("id", "tnt_" + div_id + "_5pcap")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("width", 0)
	    .attr("height", height)
	    .attr("fill", "red");
	svg_g
	    .append("rect")
	    .attr("id", "tnt_" + div_id + "_3pcap")
	    .attr("x", width-cap_width)
	    .attr("y", 0)
	    .attr("width", 0)
	    .attr("height", height)
	    .attr("fill", "red");

	// The Zooming/Panning Pane
	pane = svg_g
	    .append("rect")
	    .attr("class", "tnt_pane")
	    .attr("id", "tnt_" + div_id + "_pane")
	    .attr("width", width)
	    .attr("height", height)
	    .style("fill", bgColor);

	// ** TODO: Wouldn't be better to have these messages by track?
	// var tooWide_text = svg_g
	//     .append("text")
	//     .attr("class", "tnt_wideOK_text")
	//     .attr("id", "tnt_" + div_id + "_tooWide")
	//     .attr("fill", bgColor)
	//     .text("Region too wide");

	// TODO: I don't know if this is the best way (and portable) way
	// of centering the text in the text area
	// var bb = tooWide_text[0][0].getBBox();
	// tooWide_text
	//     .attr("x", ~~(width/2 - bb.width/2))
	//     .attr("y", ~~(height/2 - bb.height/2));
    };

    // API
    var api = apijs (track_vis)
	.getset (exports)
	.getset (limits)
	.getset (loc);

    api.transform (track_vis.extend_canvas, function (val) {
	var prev_val = track_vis.extend_canvas();
	val.left = val.left || prev_val.left;
	val.right = val.right || prev_val.right;
	return val;
    });

    // track_vis always starts on loc.from & loc.to
    api.method ('start', function () {

	// Reset the tracks
	for (var i=0; i<tracks.length; i++) {
	    if (tracks[i].g) {
		tracks[i].display().reset.call(tracks[i]);
	    }
	    _init_track(tracks[i]);
	}

	_place_tracks();

	// The continuation callback
	var cont = function (resp) {
	    limits.right = resp;

	    // zoomEventHandler.xExtent([limits.left, limits.right]);
	    if ((loc.to - loc.from) < limits.zoom_in) {
		if ((loc.from + limits.zoom_in) > limits.zoom_in) {
		    loc.to = limits.right;
		} else {
		    loc.to = loc.from + limits.zoom_in;
		}
	    }
	    plot();

	    for (var i=0; i<tracks.length; i++) {
		_update_track(tracks[i], loc);
	    }
	};

	// If limits.right is a function, we have to call it asynchronously and
	// then starting the plot once we have set the right limit (plot)
	// If not, we assume that it is an objet with new (maybe partially defined)
	// definitions of the limits and we can plot directly
	// TODO: Right now, only right can be called as an async function which is weak
	if (typeof (limits.right) === 'function') {
	    limits.right(cont);
	} else {
	    cont(limits.right);
	}

    });

    api.method ('update', function () {
	for (var i=0; i<tracks.length; i++) {
	    _update_track (tracks[i]);
	}

    });

    var _update_track = function (track, where) {
	if (track.data()) {
	    var track_data = track.data();
	    var data_updater = track_data.update();
	    //var data_updater = track.data().update();
	    data_updater.call(track_data, {
		'loc' : where,
		'on_success' : function () {
		    track.display().update.call(track, xScale);
		}
	    });
	}
    };

    var plot = function() {

	xScale = d3.scale.linear()
	    .domain([loc.from, loc.to])
	    .range([0, width]);

	if (drag_allowed) {
	    svg_g.call( zoomEventHandler
		       .x(xScale)
		       .scaleExtent([(loc.to-loc.from)/(limits.zoom_out-1), (loc.to-loc.from)/limits.zoom_in])
		       .on("zoom", _move)
		     );
	}

    };

    // right/left/zoom pans or zooms the track. These methods are exposed to allow external buttons, etc to interact with the tracks. The argument is the amount of panning/zooming (ie. 1.2 means 20% panning) With left/right only positive numbers are allowed.
    api.method ('move_right', function (factor) {
	if (factor > 0) {
	    _manual_move(factor, 1);
	}
    });

    api.method ('move_left', function (factor) {
	if (factor > 0) {
	    _manual_move(factor, -1);
	}
    });

    api.method ('zoom', function (factor) {
	_manual_move(factor, 0);
    });

    api.method ('find_track_by_id', function (id) {
	for (var i=0; i<tracks.length; i++) {
	    if (tracks[i].id() === id) {
		return tracks[i];
	    }
	}
    });

    api.method ('reorder', function (new_tracks) {
	// TODO: This is defining a new height, but the global height is used to define the size of several
	// parts. We should do this dynamically

	for (var j=0; j<new_tracks.length; j++) {
	    var found = false;
	    for (var i=0; i<tracks.length; i++) {
		if (tracks[i].id() === new_tracks[j].id()) {
		    found = true;
		    tracks.splice(i,1);
		    break;
		}
	    }
	    if (!found) {
		_init_track(new_tracks[j]);
		_update_track(new_tracks[j], {from : loc.from, to : loc.to});
	    }
	}

	for (var x=0; x<tracks.length; x++) {
	    tracks[x].g.remove();
	}

	tracks = new_tracks;
	_place_tracks();

    });

    api.method ('remove_track', function (track) {
	track.g.remove();
    });

    api.method ('add_track', function (track) {
	if (track instanceof Array) {
	    for (var i=0; i<track.length; i++) {
		track_vis.add_track (track[i]);
	    }
	    return track_vis;
	}
	tracks.push(track);
	return track_vis;
    });

    api.method('tracks', function (new_tracks) {
	if (!arguments.length) {
	    return tracks
	}
	tracks = new_tracks;
	return track_vis;
    });

    // 
    api.method ('width', function (w) {
	// TODO: Allow suffixes like "1000px"?
	// TODO: Test wrong formats
	if (!arguments.length) {
	    return width;
	}
	// At least min-width
	if (w < min_width) {
	    w = min_width
	}

	// We are resizing
	if (div_id !== undefined) {
	    d3.select("#tnt_" + div_id).select("svg").attr("width", w);
	    // Resize the zooming/panning pane
	    d3.select("#tnt_" + div_id).style("width", (parseInt(w) + cap_width*2) + "px");
	    d3.select("#tnt_" + div_id + "_pane").attr("width", w);

	    // Replot
	    width = w;
	    plot();
	    for (var i=0; i<tracks.length; i++) {
		tracks[i].g.select("rect").attr("width", w);
		tracks[i].display().reset.call(tracks[i]);
		tracks[i].display().update.call(tracks[i],xScale);
	    }
	    
	} else {
	    width = w;
	}
	
	return track_vis;
    });

    api.method('allow_drag', function(b) {
	if (!arguments.length) {
	    return drag_allowed;
	}
	drag_allowed = b;
	if (drag_allowed) {
	    // When this method is called on the object before starting the simulation, we don't have defined xScale
	    if (xScale !== undefined) {
		svg_g.call( zoomEventHandler.x(xScale)
			   // .xExtent([0, limits.right])
			   .scaleExtent([(loc.to-loc.from)/(limits.zoom_out-1), (loc.to-loc.from)/limits.zoom_in])
			   .on("zoom", _move) );
	    }
	} else {
	    // We create a new dummy scale in x to avoid dragging the previous one
	    // TODO: There may be a cheaper way of doing this?
	    zoomEventHandler.x(d3.scale.linear()).on("zoom", null);
	}
	return track_vis;
    });

    var _place_tracks = function () {
	var h = 0;
	for (var i=0; i<tracks.length; i++) {
	    var track = tracks[i];
	    if (track.g.attr("transform")) {
		track.g
		    .transition()
		    .duration(dur)
		    .attr("transform", "translate(0," + h + ")");
	    } else {
		track.g
		    .attr("transform", "translate(0," + h + ")");
	    }

	    h += track.height();
	}

	// svg
	svg.attr("height", h + height_offset);

	// div
	d3.select("#tnt_" + div_id)
	    .style("height", (h + 10 + height_offset) + "px");

	// caps
	d3.select("#tnt_" + div_id + "_5pcap")
	    .attr("height", h)
	    // .move_to_front()
	    .each(function (d) {
		move_to_front(this);
	    })
	d3.select("#tnt_" + div_id + "_3pcap")
	    .attr("height", h)
	//.move_to_front()
	    .each (function (d) {
		move_to_front(this);
	    });
	

	// pane
	pane
	    .attr("height", h + height_offset);

	// tooWide_text. TODO: Is this still needed?
	// var tooWide_text = d3.select("#tnt_" + div_id + "_tooWide");
	// var bb = tooWide_text[0][0].getBBox();
	// tooWide_text
	//     .attr("y", ~~(h/2) - bb.height/2);

	return track_vis;
    }

    var _init_track = function (track) {
	track.g = svg.select("g").select("g")
	    .append("g")
	    .attr("class", "tnt_track")
	    .attr("height", track.height());

	// Rect for the background color
	track.g
	    .append("rect")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("width", track_vis.width())
	    .attr("height", track.height())
	    .style("fill", track.background_color())
	    .style("pointer-events", "none");

	if (track.display()) {
	    track.display().init.call(track, width);
	}
	
	return track_vis;
    };

    var _manual_move = function (factor, direction) {
	var oldDomain = xScale.domain();

	var span = oldDomain[1] - oldDomain[0];
	var offset = (span * factor) - span;

	var newDomain;
	switch (direction) {
	case -1 :
	    newDomain = [(~~oldDomain[0] - offset), ~~(oldDomain[1] - offset)];
	    break;
	case 1 :
	    newDomain = [(~~oldDomain[0] + offset), ~~(oldDomain[1] - offset)];
	    break;
	case 0 :
	    newDomain = [oldDomain[0] - ~~(offset/2), oldDomain[1] + (~~offset/2)];
	}

	var interpolator = d3.interpolateNumber(oldDomain[0], newDomain[0]);
	var ease = exports.ease;

	var x = 0;
	d3.timer(function() {
	    var curr_start = interpolator(ease(x));
	    var curr_end;
	    switch (direction) {
	    case -1 :
		curr_end = curr_start + span;
		break;
	    case 1 :
		curr_end = curr_start + span;
		break;
	    case 0 :
		curr_end = oldDomain[1] + oldDomain[0] - curr_start;
		break;
	    }

	    var currDomain = [curr_start, curr_end];
	    xScale.domain(currDomain);
	    _move(xScale);
	    x+=0.02;
	    return x>1;
	});
    };


    var _move_cbak = function () {
	var currDomain = xScale.domain();
	track_vis.from(~~currDomain[0]);
	track_vis.to(~~currDomain[1]);

	for (var i = 0; i < tracks.length; i++) {
	    var track = tracks[i];
	    _update_track(track, loc);
	}
    };
    // The deferred_cbak is deferred at least this amount of time or re-scheduled if deferred is called before
    var _deferred = deferCancel(_move_cbak, 300);

    // api.method('update', function () {
    // 	_move();
    // });

    var _move = function (new_xScale) {
	if (new_xScale !== undefined && drag_allowed) {
	    zoomEventHandler.x(new_xScale);
	}

	// Show the red bars at the limits
	var domain = xScale.domain();
	if (domain[0] <= 5) {
	    d3.select("#tnt_" + div_id + "_5pcap")
		.attr("width", cap_width)
		.transition()
		.duration(200)
		.attr("width", 0);
	}

	if (domain[1] >= (limits.right)-5) {
	    d3.select("#tnt_" + div_id + "_3pcap")
		.attr("width", cap_width)
		.transition()
		.duration(200)
		.attr("width", 0);
	}


	// Avoid moving past the limits
	if (domain[0] < limits.left) {
	    zoomEventHandler.translate([zoomEventHandler.translate()[0] - xScale(limits.left) + xScale.range()[0], zoomEventHandler.translate()[1]]);
	} else if (domain[1] > limits.right) {
	    zoomEventHandler.translate([zoomEventHandler.translate()[0] - xScale(limits.right) + xScale.range()[1], zoomEventHandler.translate()[1]]);
	}

	_deferred();

	for (var i = 0; i < tracks.length; i++) {
	    var track = tracks[i];
	    track.display().move.call(track,xScale);
	}
    };

    // api.method({
    // 	allow_drag : api_allow_drag,
    // 	width      : api_width,
    // 	add_track  : api_add_track,
    // 	reorder    : api_reorder,
    // 	zoom       : api_zoom,
    // 	left       : api_left,
    // 	right      : api_right,
    // 	start      : api_start
    // });

    // Auxiliar functions
    function move_to_front (elem) {
	elem.parentNode.appendChild(elem);
    }
    
    return track_vis;
};

module.exports = exports = board;

},{"tnt.api":5,"tnt.utils":35}],8:[function(require,module,exports){
var apijs = require ("tnt.api");
// var ensemblRestAPI = require("tnt.ensembl");

// var board = {};
// board.track = {};

var data = function() {
    "use strict";
    var _ = function () {
    };

    // Getters / Setters
    apijs (_)
	.getset ('label', "")
	.getset ('elements', [])
	.getset ('update', function () {});

    return _;
};

// The retrievers. They need to access 'elements'
data.retriever = {};

data.retriever.sync = function() {
    var update_track = function(obj) {
	// "this" is set to the data obj
        this.elements(update_track.retriever()(obj.loc));
        obj.on_success();
    };

    apijs (update_track)
	.getset ('retriever', function () {})

    return update_track;
};

data.retriever.async = function () {
    var url = '';

    // "this" is set to the data obj
    var data_obj = this;
    var update_track = function (obj) {
	d3.json(url, function (err, resp) {
	    data_obj.elements(resp);
	    obj.on_success();
	}); 
    };

    apijs (update_track)
	.getset ('url', '');

    return update_track;
};



// A predefined track for genes
// tnt.track.data.gene = function () {
//     var track = tnt.track.data();
// 	// .index("ID");

//     var updater = tnt.track.retriever.ensembl()
// 	.endpoint("region")
//     // TODO: If success is defined here, means that it can't be user-defined
//     // is that good? enough? API?
//     // UPDATE: Now success is backed up by an array. Still don't know if this is the best option
// 	.success(function(genes) {
// 	    for (var i = 0; i < genes.length; i++) {
// 		if (genes[i].strand === -1) {  
// 		    genes[i].display_label = "<" + genes[i].external_name;
// 		} else {
// 		    genes[i].display_label = genes[i].external_name + ">";
// 		}
// 	    }
// 	});

//     return track.update(updater);
// }

// A predefined track displaying no external data
// it is used for location and axis tracks for example
data.empty = function () {
    var track = data();
    var updater = data.retriever.sync();
    track.update(updater);

    return track;
};

module.exports = exports = data;

},{"tnt.api":5}],9:[function(require,module,exports){
var apijs = require ("tnt.api");
var layout = require("./layout.js");

// FEATURE VIS
// var board = {};
// board.track = {};
var tnt_feature = function () {
    ////// Vars exposed in the API
    var exports = {
	create   : function () {throw "create_elem is not defined in the base feature object";},
	mover    : function () {throw "move_elem is not defined in the base feature object";},
	updater  : function () {},
	on_click : function () {},
	on_mouseover : function () {},
	guider   : function () {},
	index    : undefined,
	layout   : layout.identity(),
	foreground_color : '#000'
    };


    // The returned object
    var feature = {};

    var reset = function () {
    	var track = this;
    	track.g.selectAll(".tnt_elem").remove();
	track.g.selectAll(".tnt_guider").remove();
    };

    var init = function (width) {
	var track = this;
	exports.guider.call(track, width);
    };

    var plot = function (new_elems, track, xScale) {
	new_elems.on("click", exports.on_click);
	new_elems.on("mouseover", exports.on_mouseover);
	// new_elem is a g element where the feature is inserted
	exports.create.call(track, new_elems, xScale);
    };

    var update = function (xScale, field) {
	var track = this;
	var svg_g = track.g;
	var layout = exports.layout;

	var elements = track.data().elements();

	if (field !== undefined) {
	    elements = elements[field];
	}

	layout(elements, xScale);
	var data_elems = layout.elements();

	var vis_sel;
	var vis_elems;
	if (field !== undefined) {
	    vis_sel = svg_g.selectAll(".tnt_elem_" + field);
	} else {
	    vis_sel = svg_g.selectAll(".tnt_elem");
	}

	if (exports.index) { // Indexing by field
	    vis_elems = vis_sel
		.data(data_elems, function (d) {
		    if (d !== undefined) {
			return exports.index(d);
		    }
		});
	} else { // Indexing by position in array
	    vis_elems = vis_sel
		.data(data_elems);
	}

	exports.updater.call(track, vis_elems, xScale);

	var new_elem = vis_elems
	    .enter();

	new_elem
	    .append("g")
	    .attr("class", "tnt_elem")
	    .classed("tnt_elem_" + field, field)
	    .call(feature.plot, track, xScale);

	vis_elems
	    .exit()
	    .remove();
    };

    var move = function (xScale, field) {
	var track = this;
	var svg_g = track.g;
	var elems;
	// TODO: Is selecting the elements to move too slow?
	// It would be nice to profile
	if (field !== undefined) {
	    elems = svg_g.selectAll(".tnt_elem_" + field);
	} else {
	    elems = svg_g.selectAll(".tnt_elem");
	}

	exports.mover.call(this, elems, xScale);
    };

    var mtf = function (elem) {
	elem.parentNode.appendChild(elem);
    };
    
    var move_to_front = function (field) {
	if (field !== undefined) {
	    var track = this;
	    var svg_g = track.g;
	    svg_g.selectAll(".tnt_elem_" + field)
	        .each( function () {
		    mtf(this);
		});
	}
    };

    // API
    apijs (feature)
	.getset (exports)
	.method ({
	    reset  : reset,
	    plot   : plot,
	    update : update,
	    move   : move,
	    init   : init,
	    move_to_front : move_to_front
	});

    return feature;
};

tnt_feature.composite = function () {
    var displays = {};
    var display_order = [];

    var features = {};

    var reset = function () {
	var track = this;
	for (var i=0; i<displays.length; i++) {
	    displays[i].reset.call(track);
	}
    };

    var init = function (width) {
	var track = this;
 	for (var display in displays) {
	    if (displays.hasOwnProperty(display)) {
		displays[display].init.call(track, width);
	    }
	}
    };

    var update = function (xScale) {
	var track = this;
	for (var i=0; i<display_order.length; i++) {
	    displays[display_order[i]].update.call(track, xScale, display_order[i]);
	    displays[display_order[i]].move_to_front.call(track, display_order[i]);
	}
	// for (var display in displays) {
	//     if (displays.hasOwnProperty(display)) {
	// 	displays[display].update.call(track, xScale, display);
	//     }
	// }
    };

    var move = function (xScale) {
	var track = this;
	for (var display in displays) {
	    if (displays.hasOwnProperty(display)) {
		displays[display].move.call(track, xScale, display);
	    }
	}
    };

    var add = function (key, display) {
	displays[key] = display;
	display_order.push(key);
	return features;
    };

    var on_click = function (cbak) {
	for (var display in displays) {
	    if (displays.hasOwnProperty(display)) {
		displays[display].on_click(cbak);
	    }
	}
	return features;
    };

    var get_displays = function () {
	var ds = [];
	for (var i=0; i<display_order.length; i++) {
	    ds.push(displays[display_order[i]]);
	}
	return ds;
    };
    
    // API
    apijs (features)
	.method ({
	    reset  : reset,
	    update : update,
	    move   : move,
	    init   : init,
	    add    : add,
	    on_click : on_click,
	    displays : get_displays
	});

    return features;
};

tnt_feature.sequence = function () {
    // 'Inherit' from tnt.track.feature
    var feature = tnt_feature();

    var config = {
	fontsize : 10,
	sequence : function (d) {
	    return d.sequence;
	}
    };

    var api = apijs (feature)
	.getset (config);


    feature.create (function (new_nts, xScale) {
	var track = this;

	new_nts
	    .append("text")
	    .attr("fill", track.background_color())
	    .style('font-size', config.fontsize + "px")
	    .attr("x", function (d) {
		return xScale (d.pos);
	    })
	    .attr("y", function (d) {
		return ~~(track.height() / 2) + 5; 
	    })
	    .text(config.sequence)
	    .transition()
	    .duration(500)
	    .attr('fill', feature.foreground_color());
    });

    feature.mover (function (nts, xScale) {
	nts.select ("text")
	    .attr("x", function (d) {
		return xScale(d.pos);
	    });
    });

    return feature;
};

tnt_feature.area = function () {
    var feature = tnt_feature.line();
    var line = tnt_feature.line();

    var area = d3.svg.area()
	.interpolate(line.interpolate())
	.tension(feature.tension());

    var data_points;

    var line_create = feature.create(); // We 'save' line creation
    feature.create (function (points, xScale) {
	var track = this;

	if (data_points !== undefined) {
//	     return;
	    track.g.select("path").remove();
	}

	line_create.call(track, points, xScale);

	area
	    .x(line.x())
	    .y1(line.y())
	    .y0(track.height());

	data_points = points.data();
	points.remove();

	track.g
	    .append("path")
	    .attr("class", "tnt_area")
	    .classed("tnt_elem", true)
	    .datum(data_points)
	    .attr("d", area)
	    .attr("fill", d3.rgb(feature.foreground_color()).brighter());
	
    });

    var line_mover = feature.mover();
    feature.mover (function (path, xScale) {
	var track = this;
	line_mover.call(track, path, xScale);

	area.x(line.x());
	track.g
	    .select(".tnt_area")
	    .datum(data_points)
	    .attr("d", area);
    });

    return feature;

};

tnt_feature.line = function () {
    var feature = tnt_feature();

    var x = function (d) {
	return d.pos;
    };
    var y = function (d) {
	return d.val;
    };
    var tension = 0.7;
    var yScale = d3.scale.linear();
    var line = d3.svg.line()
	.interpolate("basis");

    // line getter. TODO: Setter?
    feature.line = function () {
	return line;
    };

    feature.x = function (cbak) {
	if (!arguments.length) {
	    return x;
	}
	x = cbak;
	return feature;
    };

    feature.y = function (cbak) {
	if (!arguments.length) {
	    return y;
	}
	y = cbak;
	return feature;
    };

    feature.tension = function (t) {
	if (!arguments.length) {
	    return tension;
	}
	tension = t;
	return feature;
    };

    var data_points;

    // For now, create is a one-off event
    // TODO: Make it work with partial paths, ie. creating and displaying only the path that is being displayed
    feature.create (function (points, xScale) {
	var track = this;

	if (data_points !== undefined) {
	    // return;
	    track.g.select("path").remove();
	}

	line
	    .tension(tension)
	    .x(function (d) {
		return xScale(x(d));
	    })
	    .y(function (d) {
		return track.height() - yScale(y(d));
	    })

	data_points = points.data();
	points.remove();

	yScale
	    .domain([0, 1])
	    // .domain([0, d3.max(data_points, function (d) {
	    // 	return y(d);
	    // })])
	    .range([0, track.height() - 2]);
	
	track.g
	    .append("path")
	    .attr("class", "tnt_elem")
	    .attr("d", line(data_points))
	    .style("stroke", feature.foreground_color())
	    .style("stroke-width", 4)
	    .style("fill", "none");

    });

    feature.mover (function (path, xScale) {
	var track = this;

	line.x(function (d) {
	    return xScale(x(d))
	});
	track.g.select("path")
	    .attr("d", line(data_points));
    });

    return feature;
};

tnt_feature.conservation = function () {
    // 'Inherit' from feature.area
    var feature = tnt_feature.area();

    var area_create = feature.create(); // We 'save' area creation
    feature.create  (function (points, xScale) {
	var track = this;

	area_create.call(track, d3.select(points[0][0]), xScale)
    });

    return feature;
};

tnt_feature.ensembl = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    var foreground_color2 = "#7FFF00";
    var foreground_color3 = "#00BB00";

    feature.guider (function (width) {
	var track = this;
	var height_offset = ~~(track.height() - (track.height()  * 0.8)) / 2;

	track.g
	    .append("line")
	    .attr("class", "tnt_guider")
	    .attr("x1", 0)
	    .attr("x2", width)
	    .attr("y1", height_offset)
	    .attr("y2", height_offset)
	    .style("stroke", feature.foreground_color())
	    .style("stroke-width", 1);

	track.g
	    .append("line")
	    .attr("class", "tnt_guider")
	    .attr("x1", 0)
	    .attr("x2", width)
	    .attr("y1", track.height() - height_offset)
	    .attr("y2", track.height() - height_offset)
	    .style("stroke", feature.foreground_color())
	    .style("stroke-width", 1);

    });

    feature.create (function (new_elems, xScale) {
	var track = this;

	var height_offset = ~~(track.height() - (track.height()  * 0.8)) / 2;

	new_elems
	    .append("rect")
	    .attr("x", function (d) {
		return xScale (d.start);
	    })
	    .attr("y", height_offset)
// 	    .attr("rx", 3)
// 	    .attr("ry", 3)
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    })
	    .attr("height", track.height() - ~~(height_offset * 2))
	    .attr("fill", track.background_color())
	    .transition()
	    .duration(500)
	    .attr("fill", function (d) { 
		if (d.type === 'high') {
		    return d3.rgb(feature.foreground_color());
		}
		if (d.type === 'low') {
		    return d3.rgb(feature.foreground_color2());
		}
		return d3.rgb(feature.foreground_color3());
	    });
    });

    feature.updater (function (blocks, xScale) {
	blocks
	    .select("rect")
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start))
	    });
    });

    feature.mover (function (blocks, xScale) {
	blocks
	    .select("rect")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    });
    });

    feature.foreground_color2 = function (col) {
	if (!arguments.length) {
	    return foreground_color2;
	}
	foreground_color2 = col;
	return feature;
    };

    feature.foreground_color3 = function (col) {
	if (!arguments.length) {
	    return foreground_color3;
	}
	foreground_color3 = col;
	return feature;
    };

    return feature;
};

tnt_feature.vline = function () {
    // 'Inherit' from feature
    var feature = tnt_feature();

    feature.create (function (new_elems, xScale) {
	var track = this;
	new_elems
	    .append ("line")
	    .attr("x1", function (d) {
		// TODO: Should use the index value?
		return xScale(feature.index()(d))
	    })
	    .attr("x2", function (d) {
		return xScale(feature.index()(d))
	    })
	    .attr("y1", 0)
	    .attr("y2", track.height())
	    .attr("stroke", feature.foreground_color())
	    .attr("stroke-width", 1);
    });

    feature.mover (function (vlines, xScale) {
	vlines
	    .select("line")
	    .attr("x1", function (d) {
		return xScale(feature.index()(d));
	    })
	    .attr("x2", function (d) {
		return xScale(feature.index()(d));
	    });
    });

    return feature;

};

tnt_feature.block = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    apijs(feature)
	.getset('from', function (d) {
	    return d.start;
	})
	.getset('to', function (d) {
	    return d.end;
	});

    feature.create(function (new_elems, xScale) {
	var track = this;
	new_elems
	    .append("rect")
	    .attr("x", function (d, i) {
		// TODO: start, end should be adjustable via the tracks API
		return xScale(feature.from()(d, i));
	    })
	    .attr("y", 0)
	    .attr("width", function (d, i) {
		return (xScale(feature.to()(d, i)) - xScale(feature.from()(d, i)));
	    })
	    .attr("height", track.height())
	    .attr("fill", track.background_color())
	    .transition()
	    .duration(500)
	    .attr("fill", function (d) {
		if (d.color === undefined) {
		    return feature.foreground_color();
		} else {
		    return d.color;
		}
	    });
    });

    feature.updater(function (elems, xScale) {
	elems
	    .select("rect")
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    });
    });

    feature.mover(function (blocks, xScale) {
	blocks
	    .select("rect")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    });
    });

    return feature;

};

tnt_feature.axis = function () {
    var xAxis;
    var orientation = "top";

    // Axis doesn't inherit from feature
    var feature = {};
    feature.reset = function () {
	xAxis = undefined;
	var track = this;
	track.g.selectAll("rect").remove();
	track.g.selectAll(".tick").remove();
    };
    feature.plot = function () {};
    feature.move = function () {
	var track = this;
	var svg_g = track.g;
	svg_g.call(xAxis);
    }
    
    feature.init = function () {};

    feature.update = function (xScale) {
	// Create Axis if it doesn't exist
	if (xAxis === undefined) {
	    xAxis = d3.svg.axis()
		.scale(xScale)
		.orient(orientation);
	}

	var track = this;
	var svg_g = track.g;
	svg_g.call(xAxis);
    };

    feature.orientation = function (pos) {
	if (!arguments.length) {
	    return orientation;
	}
	orientation = pos;
	return feature;
    };

    return feature;
};

tnt_feature.location = function () {
    var row;

    var feature = {};
    feature.reset = function () {};
    feature.plot = function () {};
    feature.init = function () {};
    feature.move = function(xScale) {
	var domain = xScale.domain();
	row.select("text")
	    .text("Location: " + ~~domain[0] + "-" + ~~domain[1]);
    };

    feature.update = function (xScale) {
	var track = this;
	var svg_g = track.g;
	var domain = xScale.domain();
	if (row === undefined) {
	    row = svg_g;
	    row
		.append("text")
		.text("Location: " + ~~domain[0] + "-" + ~~domain[1]);
	}
    };

    return feature;
};

module.exports = exports = tnt_feature;

},{"./layout.js":11,"tnt.api":5}],10:[function(require,module,exports){
var board = require ("./board.js");
board.track = require ("./track");
board.track.data = require ("./data.js");
board.track.layout = require ("./layout.js");
board.track.feature = require ("./feature.js");

module.exports = exports = board;

},{"./board.js":7,"./data.js":8,"./feature.js":9,"./layout.js":11,"./track":12}],11:[function(require,module,exports){
var apijs = require ("tnt.api");

// var board = {};
// board.track = {};
layout = {};

layout.identity = function () {
    // vars exposed in the API:
    var elements;

    // The returned closure / object
    var l = function (new_elements) {
	elements = new_elements;
    }

    var api = apijs (l)
	.method ({
	    height   : function () {},
	    elements : function () {
		return elements;
	    }
	});

    return l;
};

module.exports = exports = layout;

},{"tnt.api":5}],12:[function(require,module,exports){
var apijs = require ("tnt.api");
var iterator = require("tnt.utils").iterator;

//var board = {};

var track = function () {
    "use strict";

    var read_conf = {
	// Unique ID for this track
	id : track.id()
    };

    var display;

    var conf = {
	// foreground_color : d3.rgb('#000000'),
	background_color : d3.rgb('#CCCCCC'),
	height           : 250,
	// data is the object (normally a tnt.track.data object) used to retrieve and update data for the track
	data             : track.data.empty()
    };

    // The returned object / closure
    var _ = function() {
    };

    // API
    var api = apijs (_)
	.getset (conf)
	.get (read_conf);

    // TODO: This means that height should be defined before display
    // we shouldn't rely on this
    _.display = function (new_plotter) {
	if (!arguments.length) {
	    return display;
	}
	display = new_plotter;
	if (typeof (display) === 'function') {
	    display.layout && display.layout().height(conf.height);	    
	} else {
	    for (var key in display) {
		if (display.hasOwnProperty(key)) {
		    display[key].layout && display[key].layout().height(conf.height);
		}
	    }
	}

	return _;
    };

    return _;

};

track.id = iterator(1);

module.exports = exports = track;

},{"tnt.api":5,"tnt.utils":35}],13:[function(require,module,exports){
module.exports = tnt_ensembl = require("./src/rest.js");

},{"./src/rest.js":30}],14:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   2.1.1
 */

(function() {
    "use strict";
    function lib$es6$promise$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function lib$es6$promise$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function lib$es6$promise$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var lib$es6$promise$utils$$_isArray;
    if (!Array.isArray) {
      lib$es6$promise$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      lib$es6$promise$utils$$_isArray = Array.isArray;
    }

    var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
    var lib$es6$promise$asap$$len = 0;
    var lib$es6$promise$asap$$toString = {}.toString;
    var lib$es6$promise$asap$$vertxNext;
    function lib$es6$promise$asap$$asap(callback, arg) {
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
      lib$es6$promise$asap$$len += 2;
      if (lib$es6$promise$asap$$len === 2) {
        // If len is 2, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        lib$es6$promise$asap$$scheduleFlush();
      }
    }

    var lib$es6$promise$asap$$default = lib$es6$promise$asap$$asap;

    var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
    var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
    var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
    var lib$es6$promise$asap$$isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function lib$es6$promise$asap$$useNextTick() {
      var nextTick = process.nextTick;
      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
      // setImmediate should be used instead instead
      var version = process.versions.node.match(/^(?:(\d+)\.)?(?:(\d+)\.)?(\*|\d+)$/);
      if (Array.isArray(version) && version[1] === '0' && version[2] === '10') {
        nextTick = setImmediate;
      }
      return function() {
        nextTick(lib$es6$promise$asap$$flush);
      };
    }

    // vertx
    function lib$es6$promise$asap$$useVertxTimer() {
      return function() {
        lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
      };
    }

    function lib$es6$promise$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function lib$es6$promise$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = lib$es6$promise$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function lib$es6$promise$asap$$useSetTimeout() {
      return function() {
        setTimeout(lib$es6$promise$asap$$flush, 1);
      };
    }

    var lib$es6$promise$asap$$queue = new Array(1000);
    function lib$es6$promise$asap$$flush() {
      for (var i = 0; i < lib$es6$promise$asap$$len; i+=2) {
        var callback = lib$es6$promise$asap$$queue[i];
        var arg = lib$es6$promise$asap$$queue[i+1];

        callback(arg);

        lib$es6$promise$asap$$queue[i] = undefined;
        lib$es6$promise$asap$$queue[i+1] = undefined;
      }

      lib$es6$promise$asap$$len = 0;
    }

    function lib$es6$promise$asap$$attemptVertex() {
      try {
        var r = require;
        var vertx = r('vertx');
        lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
        return lib$es6$promise$asap$$useVertxTimer();
      } catch(e) {
        return lib$es6$promise$asap$$useSetTimeout();
      }
    }

    var lib$es6$promise$asap$$scheduleFlush;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (lib$es6$promise$asap$$isNode) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
    } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
    } else if (lib$es6$promise$asap$$isWorker) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
    } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof require === 'function') {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertex();
    } else {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
    }

    function lib$es6$promise$$internal$$noop() {}

    var lib$es6$promise$$internal$$PENDING   = void 0;
    var lib$es6$promise$$internal$$FULFILLED = 1;
    var lib$es6$promise$$internal$$REJECTED  = 2;

    var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$selfFullfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function lib$es6$promise$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.');
    }

    function lib$es6$promise$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
        return lib$es6$promise$$internal$$GET_THEN_ERROR;
      }
    }

    function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
       lib$es6$promise$asap$$default(function(promise) {
        var sealed = false;
        var error = lib$es6$promise$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            lib$es6$promise$$internal$$resolve(promise, value);
          } else {
            lib$es6$promise$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          lib$es6$promise$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          lib$es6$promise$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, thenable._result);
      } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, thenable._result);
      } else {
        lib$es6$promise$$internal$$subscribe(thenable, undefined, function(value) {
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      }
    }

    function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable) {
      if (maybeThenable.constructor === promise.constructor) {
        lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        var then = lib$es6$promise$$internal$$getThen(maybeThenable);

        if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        } else if (lib$es6$promise$utils$$isFunction(then)) {
          lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function lib$es6$promise$$internal$$resolve(promise, value) {
      if (promise === value) {
        lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFullfillment());
      } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
        lib$es6$promise$$internal$$handleMaybeThenable(promise, value);
      } else {
        lib$es6$promise$$internal$$fulfill(promise, value);
      }
    }

    function lib$es6$promise$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      lib$es6$promise$$internal$$publish(promise);
    }

    function lib$es6$promise$$internal$$fulfill(promise, value) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = lib$es6$promise$$internal$$FULFILLED;

      if (promise._subscribers.length !== 0) {
        lib$es6$promise$asap$$default(lib$es6$promise$$internal$$publish, promise);
      }
    }

    function lib$es6$promise$$internal$$reject(promise, reason) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }
      promise._state = lib$es6$promise$$internal$$REJECTED;
      promise._result = reason;

      lib$es6$promise$asap$$default(lib$es6$promise$$internal$$publishRejection, promise);
    }

    function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + lib$es6$promise$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        lib$es6$promise$asap$$default(lib$es6$promise$$internal$$publish, parent);
      }
    }

    function lib$es6$promise$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function lib$es6$promise$$internal$$ErrorObject() {
      this.error = null;
    }

    var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
        return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
      }
    }

    function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = lib$es6$promise$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = lib$es6$promise$$internal$$tryCatch(callback, detail);

        if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== lib$es6$promise$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        lib$es6$promise$$internal$$resolve(promise, value);
      } else if (failed) {
        lib$es6$promise$$internal$$reject(promise, error);
      } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, value);
      } else if (settled === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, value);
      }
    }

    function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      } catch(e) {
        lib$es6$promise$$internal$$reject(promise, e);
      }
    }

    function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
      var enumerator = this;

      enumerator._instanceConstructor = Constructor;
      enumerator.promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (enumerator._validateInput(input)) {
        enumerator._input     = input;
        enumerator.length     = input.length;
        enumerator._remaining = input.length;

        enumerator._init();

        if (enumerator.length === 0) {
          lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
        } else {
          enumerator.length = enumerator.length || 0;
          enumerator._enumerate();
          if (enumerator._remaining === 0) {
            lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
          }
        }
      } else {
        lib$es6$promise$$internal$$reject(enumerator.promise, enumerator._validationError());
      }
    }

    lib$es6$promise$enumerator$$Enumerator.prototype._validateInput = function(input) {
      return lib$es6$promise$utils$$isArray(input);
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._init = function() {
      this._result = new Array(this.length);
    };

    var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;

    lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
      var enumerator = this;

      var length  = enumerator.length;
      var promise = enumerator.promise;
      var input   = enumerator._input;

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        enumerator._eachEntry(input[i], i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var enumerator = this;
      var c = enumerator._instanceConstructor;

      if (lib$es6$promise$utils$$isMaybeThenable(entry)) {
        if (entry.constructor === c && entry._state !== lib$es6$promise$$internal$$PENDING) {
          entry._onerror = null;
          enumerator._settledAt(entry._state, i, entry._result);
        } else {
          enumerator._willSettleAt(c.resolve(entry), i);
        }
      } else {
        enumerator._remaining--;
        enumerator._result[i] = entry;
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var enumerator = this;
      var promise = enumerator.promise;

      if (promise._state === lib$es6$promise$$internal$$PENDING) {
        enumerator._remaining--;

        if (state === lib$es6$promise$$internal$$REJECTED) {
          lib$es6$promise$$internal$$reject(promise, value);
        } else {
          enumerator._result[i] = value;
        }
      }

      if (enumerator._remaining === 0) {
        lib$es6$promise$$internal$$fulfill(promise, enumerator._result);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      lib$es6$promise$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
      });
    };
    function lib$es6$promise$promise$all$$all(entries) {
      return new lib$es6$promise$enumerator$$default(this, entries).promise;
    }
    var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
    function lib$es6$promise$promise$race$$race(entries) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (!lib$es6$promise$utils$$isArray(entries)) {
        lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        lib$es6$promise$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        lib$es6$promise$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    }
    var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
    function lib$es6$promise$promise$resolve$$resolve(object) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$resolve(promise, object);
      return promise;
    }
    var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;
    function lib$es6$promise$promise$reject$$reject(reason) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$reject(promise, reason);
      return promise;
    }
    var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;

    var lib$es6$promise$promise$$counter = 0;

    function lib$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function lib$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise’s eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function lib$es6$promise$promise$$Promise(resolver) {
      this._id = lib$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if (lib$es6$promise$$internal$$noop !== resolver) {
        if (!lib$es6$promise$utils$$isFunction(resolver)) {
          lib$es6$promise$promise$$needsResolver();
        }

        if (!(this instanceof lib$es6$promise$promise$$Promise)) {
          lib$es6$promise$promise$$needsNew();
        }

        lib$es6$promise$$internal$$initializePromise(this, resolver);
      }
    }

    lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
    lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
    lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
    lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;

    lib$es6$promise$promise$$Promise.prototype = {
      constructor: lib$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: function(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;

        if (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment || state === lib$es6$promise$$internal$$REJECTED && !onRejection) {
          return this;
        }

        var child = new this.constructor(lib$es6$promise$$internal$$noop);
        var result = parent._result;

        if (state) {
          var callback = arguments[state - 1];
          lib$es6$promise$asap$$default(function(){
            lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
          });
        } else {
          lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
        }

        return child;
      },

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };
    function lib$es6$promise$polyfill$$polyfill() {
      var local;

      if (typeof global !== 'undefined') {
          local = global;
      } else if (typeof self !== 'undefined') {
          local = self;
      } else {
          try {
              local = Function('return this')();
          } catch (e) {
              throw new Error('polyfill failed because global object is unavailable in this environment');
          }
      }

      var P = local.Promise;

      if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
        return;
      }

      local.Promise = lib$es6$promise$promise$$default;
    }
    var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

    var lib$es6$promise$umd$$ES6Promise = {
      'Promise': lib$es6$promise$promise$$default,
      'polyfill': lib$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return lib$es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = lib$es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
    }

    lib$es6$promise$polyfill$$default();
}).call(this);


}).call(this,require("IrXUsu"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"IrXUsu":3}],15:[function(require,module,exports){
/*globals define */
'use strict';


(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return (root.httppleasepromises = factory(root));
        });
    } else if (typeof exports === 'object') {
        module.exports = factory(root);
    } else {
        root.httppleasepromises = factory(root);
    }
}(this, function (root) { // jshint ignore:line
    return function (Promise) {
        Promise = Promise || root && root.Promise;
        if (!Promise) {
            throw new Error('No Promise implementation found.');
        }
        return {
            processRequest: function (req) {
                var resolve, reject,
                    oldOnload = req.onload,
                    oldOnerror = req.onerror,
                    promise = new Promise(function (a, b) {
                        resolve = a;
                        reject = b;
                    });
                req.onload = function (res) {
                    var result;
                    if (oldOnload) {
                        result = oldOnload.apply(this, arguments);
                    }
                    resolve(res);
                    return result;
                };
                req.onerror = function (err) {
                    var result;
                    if (oldOnerror) {
                        result = oldOnerror.apply(this, arguments);
                    }
                    reject(err);
                    return result;
                };
                req.then = function () {
                    return promise.then.apply(promise, arguments);
                };
                req['catch'] = function () {
                    return promise['catch'].apply(promise, arguments);
                };
            }
        };
    };
}));

},{}],16:[function(require,module,exports){
'use strict';

var Response = require('./response');

function RequestError(message, props) {
    var err = new Error(message);
    err.name = 'RequestError';
    this.name = err.name;
    this.message = err.message;
    if (err.stack) {
        this.stack = err.stack;
    }

    this.toString = function () {
        return this.message;
    };

    for (var k in props) {
        if (props.hasOwnProperty(k)) {
            this[k] = props[k];
        }
    }
}

RequestError.prototype = Error.prototype;

RequestError.create = function (message, req, props) {
    var err = new RequestError(message, props);
    Response.call(err, req);
    return err;
};

module.exports = RequestError;

},{"./response":19}],17:[function(require,module,exports){
'use strict';

var i,
    cleanURL = require('../plugins/cleanurl'),
    XHR = require('./xhr'),
    delay = require('./utils/delay'),
    createError = require('./error').create,
    Response = require('./response'),
    Request = require('./request'),
    extend = require('xtend'),
    once = require('./utils/once');

function factory(defaults, plugins) {
    defaults = defaults || {};
    plugins = plugins || [];

    function http(req, cb) {
        var xhr, plugin, done, k, timeoutId;

        req = new Request(extend(defaults, req));

        for (i = 0; i < plugins.length; i++) {
            plugin = plugins[i];
            if (plugin.processRequest) {
                plugin.processRequest(req);
            }
        }

        // Give the plugins a chance to create the XHR object
        for (i = 0; i < plugins.length; i++) {
            plugin = plugins[i];
            if (plugin.createXHR) {
                xhr = plugin.createXHR(req);
                break; // First come, first serve
            }
        }
        xhr = xhr || new XHR();

        req.xhr = xhr;

        // Because XHR can be an XMLHttpRequest or an XDomainRequest, we add
        // `onreadystatechange`, `onload`, and `onerror` callbacks. We use the
        // `once` util to make sure that only one is called (and it's only called
        // one time).
        done = once(delay(function (err) {
            clearTimeout(timeoutId);
            xhr.onload = xhr.onerror = xhr.onreadystatechange = xhr.ontimeout = xhr.onprogress = null;
            var res = err && err.isHttpError ? err : new Response(req);
            for (i = 0; i < plugins.length; i++) {
                plugin = plugins[i];
                if (plugin.processResponse) {
                    plugin.processResponse(res);
                }
            }
            if (err) {
                if (req.onerror) {
                    req.onerror(err);
                }
            } else {
                if (req.onload) {
                    req.onload(res);
                }
            }
            if (cb) {
                cb(err, res);
            }
        }));

        // When the request completes, continue.
        xhr.onreadystatechange = function () {
            if (req.timedOut) return;

            if (req.aborted) {
                done(createError('Request aborted', req, {name: 'Abort'}));
            } else if (xhr.readyState === 4) {
                var type = Math.floor(xhr.status / 100);
                if (type === 2) {
                    done();
                } else if (xhr.status === 404 && !req.errorOn404) {
                    done();
                } else {
                    var kind;
                    switch (type) {
                        case 4:
                            kind = 'Client';
                            break;
                        case 5:
                            kind = 'Server';
                            break;
                        default:
                            kind = 'HTTP';
                    }
                    var msg = kind + ' Error: ' +
                              'The server returned a status of ' + xhr.status +
                              ' for the request "' +
                              req.method.toUpperCase() + ' ' + req.url + '"';
                    done(createError(msg, req));
                }
            }
        };

        // `onload` is only called on success and, in IE, will be called without
        // `xhr.status` having been set, so we don't check it.
        xhr.onload = function () { done(); };

        xhr.onerror = function () {
            done(createError('Internal XHR Error', req));
        };

        // IE sometimes fails if you don't specify every handler.
        // See http://social.msdn.microsoft.com/Forums/ie/en-US/30ef3add-767c-4436-b8a9-f1ca19b4812e/ie9-rtm-xdomainrequest-issued-requests-may-abort-if-all-event-handlers-not-specified?forum=iewebdevelopment
        xhr.ontimeout = function () { /* noop */ };
        xhr.onprogress = function () { /* noop */ };

        xhr.open(req.method, req.url);

        if (req.timeout) {
            // If we use the normal XHR timeout mechanism (`xhr.timeout` and
            // `xhr.ontimeout`), `onreadystatechange` will be triggered before
            // `ontimeout`. There's no way to recognize that it was triggered by
            // a timeout, and we'd be unable to dispatch the right error.
            timeoutId = setTimeout(function () {
                req.timedOut = true;
                done(createError('Request timeout', req, {name: 'Timeout'}));
                try {
                    xhr.abort();
                } catch (err) {}
            }, req.timeout);
        }

        for (k in req.headers) {
            if (req.headers.hasOwnProperty(k)) {
                xhr.setRequestHeader(k, req.headers[k]);
            }
        }

        xhr.send(req.body);

        return req;
    }

    var method,
        methods = ['get', 'post', 'put', 'head', 'patch', 'delete'],
        verb = function (method) {
            return function (req, cb) {
                req = new Request(req);
                req.method = method;
                return http(req, cb);
            };
        };
    for (i = 0; i < methods.length; i++) {
        method = methods[i];
        http[method] = verb(method);
    }

    http.plugins = function () {
        return plugins;
    };

    http.defaults = function (newValues) {
        if (newValues) {
            return factory(extend(defaults, newValues), plugins);
        }
        return defaults;
    };

    http.use = function () {
        var newPlugins = Array.prototype.slice.call(arguments, 0);
        return factory(defaults, plugins.concat(newPlugins));
    };

    http.bare = function () {
        return factory();
    };

    http.Request = Request;
    http.Response = Response;

    return http;
}

module.exports = factory({}, [cleanURL]);

},{"../plugins/cleanurl":24,"./error":16,"./request":18,"./response":19,"./utils/delay":20,"./utils/once":21,"./xhr":22,"xtend":23}],18:[function(require,module,exports){
'use strict';

function Request(optsOrUrl) {
    var opts = typeof optsOrUrl === 'string' ? {url: optsOrUrl} : optsOrUrl || {};
    this.method = opts.method ? opts.method.toUpperCase() : 'GET';
    this.url = opts.url;
    this.headers = opts.headers || {};
    this.body = opts.body;
    this.timeout = opts.timeout || 0;
    this.errorOn404 = opts.errorOn404 != null ? opts.errorOn404 : true;
    this.onload = opts.onload;
    this.onerror = opts.onerror;
}

Request.prototype.abort = function () {
    if (this.aborted) return;
    this.aborted = true;
    this.xhr.abort();
    return this;
};

Request.prototype.header = function (name, value) {
    var k;
    for (k in this.headers) {
        if (this.headers.hasOwnProperty(k)) {
            if (name.toLowerCase() === k.toLowerCase()) {
                if (arguments.length === 1) {
                    return this.headers[k];
                }

                delete this.headers[k];
                break;
            }
        }
    }
    if (value != null) {
        this.headers[name] = value;
        return value;
    }
};


module.exports = Request;

},{}],19:[function(require,module,exports){
'use strict';

var Request = require('./request');


function Response(req) {
    var i, lines, m,
        xhr = req.xhr;
    this.request = req;
    this.xhr = xhr;
    this.headers = {};

    // Browsers don't like you trying to read XHR properties when you abort the
    // request, so we don't.
    if (req.aborted || req.timedOut) return;

    this.status = xhr.status || 0;
    this.text = xhr.responseText;
    this.body = xhr.response || xhr.responseText;
    this.contentType = xhr.contentType || (xhr.getResponseHeader && xhr.getResponseHeader('Content-Type'));

    if (xhr.getAllResponseHeaders) {
        lines = xhr.getAllResponseHeaders().split('\n');
        for (i = 0; i < lines.length; i++) {
            if ((m = lines[i].match(/\s*([^\s]+):\s+([^\s]+)/))) {
                this.headers[m[1]] = m[2];
            }
        }
    }

    this.isHttpError = this.status >= 400;
}

Response.prototype.header = Request.prototype.header;


module.exports = Response;

},{"./request":18}],20:[function(require,module,exports){
'use strict';

// Wrap a function in a `setTimeout` call. This is used to guarantee async
// behavior, which can avoid unexpected errors.

module.exports = function (fn) {
    return function () {
        var
            args = Array.prototype.slice.call(arguments, 0),
            newFunc = function () {
                return fn.apply(null, args);
            };
        setTimeout(newFunc, 0);
    };
};

},{}],21:[function(require,module,exports){
'use strict';

// A "once" utility.
module.exports = function (fn) {
    var result, called = false;
    return function () {
        if (!called) {
            called = true;
            result = fn.apply(this, arguments);
        }
        return result;
    };
};

},{}],22:[function(require,module,exports){
module.exports = window.XMLHttpRequest;

},{}],23:[function(require,module,exports){
module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],24:[function(require,module,exports){
'use strict';

module.exports = {
    processRequest: function (req) {
        req.url = req.url.replace(/[^%]+/g, function (s) {
            return encodeURI(s);
        });
    }
};

},{}],25:[function(require,module,exports){
'use strict';

var jsonrequest = require('./jsonrequest'),
    jsonresponse = require('./jsonresponse');

module.exports = {
    processRequest: function (req) {
        jsonrequest.processRequest.call(this, req);
        jsonresponse.processRequest.call(this, req);
    },
    processResponse: function (res) {
        jsonresponse.processResponse.call(this, res);
    }
};

},{"./jsonrequest":26,"./jsonresponse":27}],26:[function(require,module,exports){
'use strict';

module.exports = {
    processRequest: function (req) {
        var
            contentType = req.header('Content-Type'),
            hasJsonContentType = contentType &&
                                 contentType.indexOf('application/json') !== -1;

        if (contentType != null && !hasJsonContentType) {
            return;
        }

        if (req.body) {
            if (!contentType) {
                req.header('Content-Type', 'application/json');
            }

            req.body = JSON.stringify(req.body);
        }
    }
};

},{}],27:[function(require,module,exports){
'use strict';

module.exports = {
    processRequest: function (req) {
        var accept = req.header('Accept');
        if (accept == null) {
            req.header('Accept', 'application/json');
        }
    },
    processResponse: function (res) {
        // Check to see if the contentype is "something/json" or
        // "something/somethingelse+json"
        if (res.contentType && /^.*\/(?:.*\+)?json(;|$)/i.test(res.contentType)) {
            var raw = typeof res.body === 'string' ? res.body : res.text;
            if (raw) {
                res.body = JSON.parse(raw);
            }
        }
    }
};

},{}],28:[function(require,module,exports){
module.exports=require(5)
},{"./src/api.js":29}],29:[function(require,module,exports){
module.exports=require(6)
},{}],30:[function(require,module,exports){
var http = require("httpplease");
var apijs = require("tnt.api");
var promises = require('httpplease-promises');
var Promise = require('es6-promise').Promise;
var json = require("httpplease/plugins/json");
http = http.use(json).use(promises(Promise));

tnt_eRest = function() {

    // Prefixes to use the REST API.
    // These are modified in the localREST setter
    var prefix = "https://rest.ensembl.org";
    var prefix_region = prefix + "/overlap/region/";
    var prefix_ensgene = prefix + "/lookup/id/";
    var prefix_xref = prefix + "/xrefs/symbol/";
    var prefix_homologues = prefix + "/homology/id/";
    var prefix_chr_info = prefix + "/info/assembly/";
    var prefix_aln_region = prefix + "/alignment/region/";
    var prefix_gene_tree = prefix + "/genetree/id/";
    var prefix_assembly = prefix + "/info/assembly/";

    // Number of connections made to the database
    var connections = 0;

    var eRest = function() {
    };

    // Limits imposed by the ensembl REST API
    eRest.limits = {
	region : 5000000
    };

    var api = apijs (eRest);


    /** <strong>localREST</strong> points the queries to a local REST service to debug.
	TODO: This method should be removed in "production"
    */
    api.method ('localREST', function() {
	prefix = "http://127.0.0.1:3000";
	prefix_region = prefix + "/overlap/region/";
	prefix_ensgene = prefix + "/lookup/id/";
	prefix_xref = prefix + "/xrefs/symbol/";
	prefix_homologues = prefix + "/homology/id/";

	return eRest;
    });

    /** <strong>call</strong> makes an asynchronous call to the ensembl REST service.
	@param {Object} object - A literal object containing the following fields:
	<ul>
	<li>url => The rest URL. This is returned by {@link eRest.url}</li>
	<li>success => A callback to be called when the REST query is successful (i.e. the response from the server is a defined value and no error has been returned)</li>
	<li>error => A callback to be called when the REST query returns an error
	</ul>
    */
    api.method ('call', function (myurl) {
	return http.get({
	    "url": myurl
	});
    });
    // api.method ('call', function (obj) {
    // 	var url = obj.url;
    // 	var on_success = obj.success;
    // 	var on_error   = obj.error;
    // 	connections++;
    // 	http.get({
    // 	    "url" : url
    // 	}, function (error, resp) {
    // 	    if (resp !== undefined && error == null && on_success !== undefined) {
    // 		on_success(JSON.parse(resp.body));
    // 	    }
    // 	    if (error !== null && on_error !== undefined) {
    // 		on_error(error);
    // 	    }
    // 	});
    // });


    eRest.url = {};
    var url_api = apijs (eRest.url);
	/** eRest.url.<strong>region</strong> returns the ensembl REST url to retrieve the genes included in the specified region
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>species : The species the region refers to</li>
<li>chr     : The chr (or seq_region name)</li>
<li>from    : The start position of the region in the chr</li>
<li>to      : The end position of the region (from < to always)</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/feature/region/homo_sapiens/13:32889611-32973805.json?feature=gene|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.region ({ species : "homo_sapiens", chr : "13", from : 32889611, to : 32973805 }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('region', function(obj) {
	return prefix_region +
	    obj.species +
	    "/" +
	    obj.chr +
	    ":" + 
	    obj.from + 
	    "-" + obj.to + 
	    ".json?feature=gene";
    });

	/** eRest.url.<strong>species_gene</strong> returns the ensembl REST url to retrieve the ensembl gene associated with
	    the given name in the specified species.
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>species   : The species the region refers to</li>
<li>gene_name : The name of the gene</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/xrefs/symbol/human/BRCA2.json?object_type=gene|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.species_gene ({ species : "human", gene_name : "BRCA2" }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('xref', function (obj) {
	return prefix_xref +
	    obj.species  +
	    "/" +
	    obj.name +
	    ".json?object_type=gene";
    });

	/** eRest.url.<strong>homologues</strong> returns the ensembl REST url to retrieve the homologues (orthologues + paralogues) of the given ensembl ID.
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>id : The Ensembl ID of the gene</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/homology/id/ENSG00000139618.json?format=condensed;sequence=none;type=all|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.homologues ({ id : "ENSG00000139618" }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('homologues', function(obj) {
	return prefix_homologues +
	    obj.id + 
	    ".json?format=condensed;sequence=none;type=all";
    });

	/** eRest.url.<strong>gene</strong> returns the ensembl REST url to retrieve the ensembl gene associated with
	    the given ID
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>id : The name of the gene</li>
<li>expand : if transcripts should be included in the response (default to 0)</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/lookup/ENSG00000139618.json?format=full|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.gene ({ id : "ENSG00000139618" }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('gene', function(obj) {
	var url = prefix_ensgene + obj.id + ".json?format=full";
	if (obj.expand && obj.expand === 1) {
	    url = url + "&expand=1";
	}
	return url;
    });

	/** eRest.url.<strong>chr_info</strong> returns the ensembl REST url to retrieve the information associated with the chromosome (seq_region in Ensembl nomenclature).
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>species : The species the chr (or seq_region) belongs to
<li>chr     : The name of the chr (or seq_region)</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/assembly/info/homo_sapiens/13.json?format=full|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.chr_info ({ species : "homo_sapiens", chr : "13" }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('chr_info', function(obj) {
	return prefix_chr_info +
	    obj.species +
	    "/" +
	    obj.chr +
	    ".json?format=full";
    });

	// TODO: For now, it only works with species_set and not species_set_groups
	// Should be extended for wider use
    url_api.method ('aln_block', function (obj) {
	var url = prefix_aln_region + 
	    obj.species +
	    "/" +
	    obj.chr +
	    ":" +
	    obj.from +
	    "-" +
	    obj.to +
	    ".json?method=" +
	    obj.method;

	for (var i=0; i<obj.species_set.length; i++) {
	    url += "&species_set=" + obj.species_set[i];
	}

	return url;
    });

    url_api.method ('gene_tree', function (obj) {
	return prefix_gene_tree +
	    obj.id + 
	    ".json?sequence=" +
	    ((obj.sequence || obj.aligned) ? 1 : "none") +
	    (obj.aligned ? '&aligned=1' : '');
    });

    url_api.method('assembly', function (obj) {
	return prefix_assembly + 
	    obj.species +
	    ".json";
    });


    api.method ('connections', function() {
	return connections;
    });

    return eRest;
};

module.exports = exports = tnt_eRest;

},{"es6-promise":14,"httpplease":17,"httpplease-promises":15,"httpplease/plugins/json":25,"tnt.api":28}],31:[function(require,module,exports){
module.exports = tooltip = require("./src/tooltip.js");

},{"./src/tooltip.js":34}],32:[function(require,module,exports){
module.exports=require(5)
},{"./src/api.js":33}],33:[function(require,module,exports){
module.exports=require(6)
},{}],34:[function(require,module,exports){
var apijs = require("tnt.api");

var tooltip = function () {
    "use strict";

    var drag = d3.behavior.drag();
    var tooltip_div;

    var conf = {
	background_color : "white",
	foreground_color : "black",
	position : "right",
	allow_drag : true,
	show_closer : true,
	fill : function () { throw "fill is not defined in the base object"; },
	width : 180,
	id : 1
    };

    var t = function (data, event) {
	drag
	    .origin(function(){
		return {x:parseInt(d3.select(this).style("left")),
			y:parseInt(d3.select(this).style("top"))
		       };
	    })
	    .on("drag", function() {
		if (conf.allow_drag) {
		    d3.select(this)
			.style("left", d3.event.x + "px")
			.style("top", d3.event.y + "px");
		}
	    });

	// TODO: Why do we need the div element?
	// It looks like if we anchor the tooltip in the "body"
	// The tooltip is not located in the right place (appears at the bottom)
	// See clients/tooltips_test.html for an example
	var containerElem = selectAncestor (this, "div");
	if (containerElem === undefined) {
	    // We require a div element at some point to anchor the tooltip
	    return;
	}

	// Container element position (needed for "relative" positioned parents)
	var elemPos = containerElem.getBoundingClientRect();
	var elemTop = elemPos.top + document.body.scrollTop;
	var elemLeft = elemPos.left + document.body.scrollLeft;
	
	tooltip_div = d3.select(containerElem)
	    .append("div")
	    .attr("class", "tnt_tooltip")
	    .classed("tnt_tooltip_active", true)  // TODO: Is this needed/used???
	    .call(drag);

	// prev tooltips with the same header
	d3.select("#tnt_tooltip_" + conf.id).remove();

	if ((d3.event === null) && (event)) {
	    d3.event = event;
	}
	var mouse = [d3.event.pageX, d3.event.pageY];
	d3.event = null;

	var offset = 0;
	if (conf.position === "left") {
	    offset = conf.width;
	}
	
	tooltip_div.attr("id", "tnt_tooltip_" + conf.id);
	
	// We place the tooltip
	tooltip_div
	    .style("left", (mouse[0] - offset - elemLeft) + "px")
	    .style("top", mouse[1] - elemTop + "px");

	// Close
	if (conf.show_closer) {
	    tooltip_div.append("span")
		.style("position", "absolute")
		.style("right", "-10px")
		.style("top", "-10px")
		.append("img")
		.attr("src", tooltip.images.close)
		.attr("width", "20px")
		.attr("height", "20px")
		.on("click", function () {
		    t.close();
		});
	}

	conf.fill.call(tooltip_div, data);

	// return this here?
	return t;
    };

    // gets the first ancestor of elem having tagname "type"
    // example : var mydiv = selectAncestor(myelem, "div");
    function selectAncestor (elem, type) {
	type = type.toLowerCase();
	if (elem.parentNode === null) {
	    console.log("No more parents");
	    return undefined;
	}
	var tagName = elem.parentNode.tagName;

	if ((tagName !== undefined) && (tagName.toLowerCase() === type)) {
	    return elem.parentNode;
	} else {
	    return selectAncestor (elem.parentNode, type);
	}
    }
    
    var api = apijs(t)
	.getset(conf);
    api.check('position', function (val) {
	return (val === 'left') || (val === 'right');
    }, "Only 'left' or 'right' values are allowed for position");

    api.method('close', function () {
	tooltip_div.remove();
    });

    return t;
};

tooltip.table = function () {
    // table tooltips are based on general tooltips
    var t = tooltip();
    
    var width = 180;

    t.fill (function (obj) {
	var tooltip_div = this;

	var obj_info_table = tooltip_div
	    .append("table")
	    .attr("class", "tnt_zmenu")
	    .attr("border", "solid")
	    .style("width", t.width() + "px");

	// Tooltip header
	obj_info_table
	    .append("tr")
	    .attr("class", "tnt_zmenu_header")
	    .append("th")
	    .attr("colspan", 2)
	    .text(obj.header);

	// Tooltip rows
	var table_rows = obj_info_table.selectAll(".tnt_zmenu_row")
	    .data(obj.rows)
	    .enter()
	    .append("tr")
	    .attr("class", "tnt_zmenu_row");

	table_rows
	    .append("th")
	    .html(function(d,i) {
		return obj.rows[i].label;
	    });

	table_rows
	    .append("td")
	    .html(function(d,i) {
		return obj.rows[i].value;
	    })
	    .each(function (d) {
		if (d.link === undefined) {
		    return;
		}
		d3.select(this)
		    .classed("link", 1)
		    .on('click', function (d) {
			d.link(d.obj);
			t.close.call(this);
		    });
	    });
    });

    return t;
};

tooltip.plain = function () {
    // plain tooltips are based on general tooltips
    var t = tooltip();

    t.fill (function (obj) {
	var tooltip_div = this;

	var obj_info_table = tooltip_div
	    .append("table")
	    .attr("class", "tnt_zmenu")
	    .attr("border", "solid")
	    .style("width", t.width() + "px");

	obj_info_table
	    .append("tr")
	    .attr("class", "tnt_zmenu_header")
	    .append("th")
	    .text(obj.header);

	obj_info_table
	    .append("tr")
	    .attr("class", "tnt_zmenu_row")
	    .append("td")
	    .style("text-align", "center")
	    .html(obj.body);
    });

    return t;
};

// TODO: This shouldn't be exposed in the API. It would be better to have as a local variable
// or alternatively have the images somewhere else (although the number of hardcoded images should be left at a minimum)
tooltip.images = {};
tooltip.images.close = 'data:image/png;base64,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';

module.exports = exports = tooltip;

},{"tnt.api":32}],35:[function(require,module,exports){
module.exports = require("./src/index.js");

},{"./src/index.js":36}],36:[function(require,module,exports){
// require('fs').readdirSync(__dirname + '/').forEach(function(file) {
//     if (file.match(/.+\.js/g) !== null && file !== __filename) {
// 	var name = file.replace('.js', '');
// 	module.exports[name] = require('./' + file);
//     }
// });

// Same as
var utils = require("./utils.js");
utils.reduce = require("./reduce.js");
module.exports = exports = utils;

},{"./reduce.js":37,"./utils.js":38}],37:[function(require,module,exports){
var reduce = function () {
    var smooth = 5;
    var value = 'val';
    var redundant = function (a, b) {
	if (a < b) {
	    return ((b-a) <= (b * 0.2));
	}
	return ((a-b) <= (a * 0.2));
    };
    var perform_reduce = function (arr) {return arr;};

    var reduce = function (arr) {
	if (!arr.length) {
	    return arr;
	}
	var smoothed = perform_smooth(arr);
	var reduced  = perform_reduce(smoothed);
	return reduced;
    };

    var median = function (v, arr) {
	arr.sort(function (a, b) {
	    return a[value] - b[value];
	});
	if (arr.length % 2) {
	    v[value] = arr[~~(arr.length / 2)][value];	    
	} else {
	    var n = ~~(arr.length / 2) - 1;
	    v[value] = (arr[n][value] + arr[n+1][value]) / 2;
	}

	return v;
    };

    var clone = function (source) {
	var target = {};
	for (var prop in source) {
	    if (source.hasOwnProperty(prop)) {
		target[prop] = source[prop];
	    }
	}
	return target;
    };

    var perform_smooth = function (arr) {
	if (smooth === 0) { // no smooth
	    return arr;
	}
	var smooth_arr = [];
	for (var i=0; i<arr.length; i++) {
	    var low = (i < smooth) ? 0 : (i - smooth);
	    var high = (i > (arr.length - smooth)) ? arr.length : (i + smooth);
	    smooth_arr[i] = median(clone(arr[i]), arr.slice(low,high+1));
	}
	return smooth_arr;
    };

    reduce.reducer = function (cbak) {
	if (!arguments.length) {
	    return perform_reduce;
	}
	perform_reduce = cbak;
	return reduce;
    };

    reduce.redundant = function (cbak) {
	if (!arguments.length) {
	    return redundant;
	}
	redundant = cbak;
	return reduce;
    };

    reduce.value = function (val) {
	if (!arguments.length) {
	    return value;
	}
	value = val;
	return reduce;
    };

    reduce.smooth = function (val) {
	if (!arguments.length) {
	    return smooth;
	}
	smooth = val;
	return reduce;
    };

    return reduce;
};

var block = function () {
    var red = reduce()
	.value('start');

    var value2 = 'end';

    var join = function (obj1, obj2) {
        return {
            'object' : {
                'start' : obj1.object[red.value()],
                'end'   : obj2[value2]
            },
            'value'  : obj2[value2]
        };
    };

    // var join = function (obj1, obj2) { return obj1 };

    red.reducer( function (arr) {
	var value = red.value();
	var redundant = red.redundant();
	var reduced_arr = [];
	var curr = {
	    'object' : arr[0],
	    'value'  : arr[0][value2]
	};
	for (var i=1; i<arr.length; i++) {
	    if (redundant (arr[i][value], curr.value)) {
		curr = join(curr, arr[i]);
		continue;
	    }
	    reduced_arr.push (curr.object);
	    curr.object = arr[i];
	    curr.value = arr[i].end;
	}
	reduced_arr.push(curr.object);

	// reduced_arr.push(arr[arr.length-1]);
	return reduced_arr;
    });

    reduce.join = function (cbak) {
	if (!arguments.length) {
	    return join;
	}
	join = cbak;
	return red;
    };

    reduce.value2 = function (field) {
	if (!arguments.length) {
	    return value2;
	}
	value2 = field;
	return red;
    };

    return red;
};

var line = function () {
    var red = reduce();

    red.reducer ( function (arr) {
	var redundant = red.redundant();
	var value = red.value();
	var reduced_arr = [];
	var curr = arr[0];
	for (var i=1; i<arr.length-1; i++) {
	    if (redundant (arr[i][value], curr[value])) {
		continue;
	    }
	    reduced_arr.push (curr);
	    curr = arr[i];
	}
	reduced_arr.push(curr);
	reduced_arr.push(arr[arr.length-1]);
	return reduced_arr;
    });

    return red;

};

module.exports = reduce;
module.exports.line = line;
module.exports.block = block;


},{}],38:[function(require,module,exports){

module.exports = {
    iterator : function(init_val) {
	var i = init_val || 0;
	var iter = function () {
	    return i++;
	};
	return iter;
    },

    script_path : function (script_name) { // script_name is the filename
	var script_scaped = script_name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	var script_re = new RegExp(script_scaped + '$');
	var script_re_sub = new RegExp('(.*)' + script_scaped + '$');

	// TODO: This requires phantom.js or a similar headless webkit to work (document)
	var scripts = document.getElementsByTagName('script');
	var path = "";  // Default to current path
	if(scripts !== undefined) {
            for(var i in scripts) {
		if(scripts[i].src && scripts[i].src.match(script_re)) {
                    return scripts[i].src.replace(script_re_sub, '$1');
		}
            }
	}
	return path;
    },

    defer_cancel : function (cbak, time) {
	var tick;

	var defer_cancel = function () {
	    clearTimeout(tick);
	    tick = setTimeout(cbak, time);
	};

	return defer_cancel;
    }
};

},{}],39:[function(require,module,exports){
var tnt_board = require("tnt.board");

var tnt_feature_transcript = function () {
    // NAME FEATURE
    var nameFeature = tnt_board.track.feature()
	.create (function (name, xScale) {
	    var track = this;
	    var baseline = (track.height() / 2) + 7;
	    name
		.append("text")
		.attr("x", function (d) {
		    return xScale(d.pos);
		})
		.attr("y", baseline)
		.attr("fill", function (d) {
		    return nameFeature.foreground_color();
		})
		.text(function (d) {
		    var label = d.name;
		    return d.strand === 1 ? (d.name + ">") : ("<" + d.name);
		});
	})
	.mover (function () {}); // No need to move since the board doens't allow panning or zooming

    // INTRON FEATURE
    var intronFeature = tnt_board.track.feature()
        .create (function (new_elems, xScale) {
	    var track = this;

	    var featureBottom = (track.height() / 2) * 0.25;

	    new_elems
	        .append("path")
		.attr("stroke", intronFeature.foreground_color())
		.attr("stroke-width", "1px")
	        .attr("d", function (d) {
		    var path = "M" + xScale(d.start) + "," + featureBottom +
			"L" + (xScale(d.start) + (xScale(d.end) - xScale(d.start))/2)  + "," + 0 +
			"L" + (xScale(d.end)) + "," + featureBottom;
		    return path;
		});
	})
        .mover (function () {}); // No need to move since the board doesn't allow panning & zooming

    // EXON FEATURE
    var exonFeature = tnt_board.track.feature()
        .index(function (n) {
	    return n.start;
	})
        .create (function (new_elems, xScale) {
	    var track = this;

	    var featureHeight = (track.height()/2) * 0.5;
	    var yOffset = (track.height()/2) * 0.25;

	    new_elems
	        .append("rect")
	        .attr("x", function (d) {
		    return xScale(d.start);
		})
	        .attr("y", yOffset)
	        .attr("width", function (d) {
		    return (xScale(d.end) - xScale(d.start));
		})
	        .attr("height", featureHeight)
	        .attr("fill", track.background_color())
	        .transition()
	        .duration(500)
	        .attr("fill", function (d) {
		    if (!d.coding) {
			return track.background_color();
		    }
		    //return track.background_color();
		})
	        .attr("stroke", exonFeature.foreground_color());
	})
        .mover (function () {}); // No need to move since the board doesn't allow panning & zooming

    // COMPOSITE FEATURE
    var compositeFeature = tnt_board.track.feature.composite()
        .add ("exons", exonFeature)
        .add ("introns", intronFeature)
        .add ("name", nameFeature);

    return compositeFeature;

};

module.exports = exports = tnt_feature_transcript;

},{"tnt.board":4}],40:[function(require,module,exports){
var tnt_board = require("tnt.board");
var ensembl = require("tnt.ensembl");
var transcriptFeature = require("./feature");

tnt_transcript = function () {

    var conf = {
	data : undefined,
	gene : undefined,
	on_click : function () {},
	on_load : function () {} // executed when the transcript data arrives
    };
    

    // tracks
    var axis_track = tnt_board.track()
	.height(20)
	.background_color("white")
	.display(tnt_board.track.feature.axis()
		 .orientation("top")
		);

    var transcriptViewer = tnt_board()
	.allow_drag(false)
	.add_track(axis_track);

    transcriptViewer._start = transcriptViewer.start;

    var start = function () {
	if (!conf.data && conf.gene) {
    	    var ensemblRest = ensembl();
	    var gene_url = ensemblRest.url.gene({
		id: conf.gene,
		expand: 1
	    });
	    ensemblRest.call(gene_url)
		.then (function (resp) {
		    for (var i=0; i<resp.body.Transcript.length; i++) {
			var t = resp.body.Transcript[i];
			transcriptViewer.add_track(getTranscriptTrack(t));
		    }
		    transcriptViewer
			.from(resp.body.start)
			.to(resp.body.end)
			.right(resp.body.end)
			.zoom_out(resp.body.end - resp.body.start);
		    conf.on_load(resp.body.Transcript);
		    transcriptViewer._start();
		});
	}
	// TODO: This is not working yet. The idea is to be able to pass custom data instead of
	// relying on ensembl gene transcripts
	if (conf.data) {
	    console.warn ("Data fully passed, lets try to visualize that (Nothing for now)");
	}
    };
    transcriptViewer.start = start;

    function exonsToExonsAndIntrons (exons, t) {
	var obj = {};
	obj.exons = exons;
	obj.introns = [];
	for (var i=0; i<exons.length-1; i++) {
	    var intron = {
		start : exons[i].strand === 1 ? exons[i].end : exons[i].start,
		end   : exons[i].strand === 1 ? exons[i+1].start : exons[i+1].end,
		transcript : t
	    };
	    obj.introns.push(intron);
	}
	return obj;
    }

    function getTranscriptTrack (transcript) {
	// Non coding
	var newExons = [];
	var translationStart;
	var translationEnd;
	if (transcript.Translation !== undefined) {
	    translationStart = transcript.Translation.start;
	    translationEnd = transcript.Translation.end;
	}
	var exons = transcript.Exon;
	for (var i=0; i<exons.length; i++) {
	    if (transcript.Translation === undefined) { // NO coding transcript
		newExons.push({
		    start   : exons[i].start,
		    end     : exons[i].end,
		    transcript : transcript,
		    coding  : false
		});
	    } else {
		if (exons[i].start < translationStart) {
		    // 5'
		    if (exons[i].end < translationStart) {
			// Completely non coding
			newExons.push({
			    start  : exons[i].start,
			    end    : exons[i].end,
			    transcript : transcript,
			    coding : false
			});
		    } else {
			// Has 5'UTR
			var ncExon5 = {
			    start  : exons[i].start,
			    end    : translationStart,
			    transcript : transcript,
			    coding : false
			};
			var codingExon5 = {
			    start  : translationStart,
			    end    : exons[i].end,
			    transcript : transcript,
			    coding : true
			};
			if (exons[i].strand === 1) {
			    newExons.push(ncExon5);
			    newExons.push(codingExon5);
			} else {
			    newExons.push(codingExon5);
			    newExons.push(ncExon5);
			}
		    }
		} else if (exons[i].end > translationEnd) {
		    // 3'
		    if (exons[i].start > translationEnd) {
			// Completely non coding
			newExons.push({
			    start   : exons[i].start,
			    end     : exons[i].end,
			    transcript : transcript,
			    coding  : false
			});
		    } else {
			// Has 3'UTR
			var codingExon3 = {
			    start  : exons[i].start,
			    end    : translationEnd,
			    transcript : transcript,
			    coding : true
			};
			var ncExon3 = {
			    start  : translationEnd,
			    end    : exons[i].end,
			    transcript : transcript,
			    coding : false
			};
			if (exons[i].strand === 1) {
			    newExons.push(codingExon3);
			    newExons.push(ncExon3);
			} else {
			    newExons.push(ncExon3);
			    newExons.push(codingExon3);
			}
		    }
		} else {
		    // coding exon
		    newExons.push({
			start  : exons[i].start,
			end    : exons[i].end,
			transcript : transcript,
			coding : true
		    });
		}
	    }
	}
	return tnt_board.track()
	    .height(30)
	    .background_color ("white")
	    .display(transcriptFeature()
		     //.foreground_color("#A00000")
		     .on_click(conf.on_click)
		    )
	    .data(tnt_board.track.data()
		  .update(tnt_board.track.data.retriever.sync()
			  .retriever (function () {
			      var obj = exonsToExonsAndIntrons (newExons, transcript);
			      obj.name = [{
				  pos: transcript.start,
				  name: transcript.display_name,
				  strand: transcript.strand,
				  transcript: transcript
			      }];
			      return obj;
			  })
			 )
		 );
    }

    transcriptViewer.on_click = function (cbak) {
	if (!arguments.length) {
	    return conf.on_click;
	}
	conf.on_click = cbak;
	return this;
    };
    
    transcriptViewer.data = function (d) {
	if (!arguments.length) {
	    return conf.data;
	}
	conf.data = d;
	return this;
    };

    transcriptViewer.gene = function (g) {
	if (!arguments.length) {
	    return conf.gene;
	}
	conf.gene = g;
	return this;
    };

    transcriptViewer.on_load = function (cbak) {
	if (!arguments.length) {
	    return conf.cbak;
	}
	conf.on_load = cbak;
	return this;
    };
   
    return transcriptViewer;
};

module.exports = exports = tnt_transcript;

},{"./feature":39,"tnt.board":4,"tnt.ensembl":13}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvZmFrZV9hMTNkYjJlYS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmJvYXJkL25vZGVfbW9kdWxlcy90bnQuYXBpL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuYm9hcmQvbm9kZV9tb2R1bGVzL3RudC5hcGkvc3JjL2FwaS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9ib2FyZC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9kYXRhLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2ZlYXR1cmUuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvbGF5b3V0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL3RyYWNrLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvZXM2LXByb21pc2UuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlLXByb21pc2VzL2h0dHBwbGVhc2UtcHJvbWlzZXMuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi9lcnJvci5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIvcmVxdWVzdC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3Jlc3BvbnNlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIvdXRpbHMvZGVsYXkuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi91dGlscy9vbmNlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIveGhyLWJyb3dzZXIuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL25vZGVfbW9kdWxlcy94dGVuZC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvcGx1Z2lucy9jbGVhbnVybC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvcGx1Z2lucy9qc29uLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9wbHVnaW5zL2pzb25yZXF1ZXN0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9wbHVnaW5zL2pzb25yZXNwb25zZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvc3JjL3Jlc3QuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC50b29sdGlwL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQudG9vbHRpcC9zcmMvdG9vbHRpcC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LnV0aWxzL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL3JlZHVjZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LnV0aWxzL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9zcmMvZmVhdHVyZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9zcmMvdHJhbnNjcmlwdEZlYXR1cmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JpQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3ckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDLzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMU9BO0FBQ0E7Ozs7OztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU5BO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fTtcbn1cbi8vIHRudC5ib2FyZCA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpO1xuLy8gdG50LnV0aWxzID0gcmVxdWlyZShcInRudC51dGlsc1wiKTtcbi8vIHRudC50b29sdGlwID0gcmVxdWlyZShcInRudC50b29sdGlwXCIpO1xuXG50bnQudHJhbnNjcmlwdCA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpO1xudG50LnRvb2x0aXAgPSByZXF1aXJlKFwidG50LnRvb2x0aXBcIik7XG4iLCIvLyBpZiAodHlwZW9mIHRudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuLy8gICAgIG1vZHVsZS5leHBvcnRzID0gdG50ID0ge31cbi8vIH1cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL3RyYW5zY3JpcHRGZWF0dXJlLmpzXCIpO1xuXG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIi8vIGlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4vLyAgICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fVxuLy8gfVxuLy8gdG50LnV0aWxzID0gcmVxdWlyZShcInRudC51dGlsc1wiKTtcbi8vIHRudC50b29sdGlwID0gcmVxdWlyZShcInRudC50b29sdGlwXCIpO1xuLy8gdG50LmJvYXJkID0gcmVxdWlyZShcIi4vc3JjL2luZGV4LmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleFwiKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL2FwaS5qc1wiKTtcbiIsInZhciBhcGkgPSBmdW5jdGlvbiAod2hvKSB7XG5cbiAgICB2YXIgX21ldGhvZHMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBtID0gW107XG5cblx0bS5hZGRfYmF0Y2ggPSBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICBtLnVuc2hpZnQob2JqKTtcblx0fTtcblxuXHRtLnVwZGF0ZSA9IGZ1bmN0aW9uIChtZXRob2QsIHZhbHVlKSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bS5sZW5ndGg7IGkrKykge1xuXHRcdGZvciAodmFyIHAgaW4gbVtpXSkge1xuXHRcdCAgICBpZiAocCA9PT0gbWV0aG9kKSB7XG5cdFx0XHRtW2ldW3BdID0gdmFsdWU7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHQgICAgfVxuXHRcdH1cblx0ICAgIH1cblx0ICAgIHJldHVybiBmYWxzZTtcblx0fTtcblxuXHRtLmFkZCA9IGZ1bmN0aW9uIChtZXRob2QsIHZhbHVlKSB7XG5cdCAgICBpZiAobS51cGRhdGUgKG1ldGhvZCwgdmFsdWUpICkge1xuXHQgICAgfSBlbHNlIHtcblx0XHR2YXIgcmVnID0ge307XG5cdFx0cmVnW21ldGhvZF0gPSB2YWx1ZTtcblx0XHRtLmFkZF9iYXRjaCAocmVnKTtcblx0ICAgIH1cblx0fTtcblxuXHRtLmdldCA9IGZ1bmN0aW9uIChtZXRob2QpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtLmxlbmd0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgcCBpbiBtW2ldKSB7XG5cdFx0ICAgIGlmIChwID09PSBtZXRob2QpIHtcblx0XHRcdHJldHVybiBtW2ldW3BdO1xuXHRcdCAgICB9XG5cdFx0fVxuXHQgICAgfVxuXHR9O1xuXG5cdHJldHVybiBtO1xuICAgIH07XG5cbiAgICB2YXIgbWV0aG9kcyAgICA9IF9tZXRob2RzKCk7XG4gICAgdmFyIGFwaSA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgYXBpLmNoZWNrID0gZnVuY3Rpb24gKG1ldGhvZCwgY2hlY2ssIG1zZykge1xuXHRpZiAobWV0aG9kIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtZXRob2QubGVuZ3RoOyBpKyspIHtcblx0XHRhcGkuY2hlY2sobWV0aG9kW2ldLCBjaGVjaywgbXNnKTtcblx0ICAgIH1cblx0ICAgIHJldHVybjtcblx0fVxuXG5cdGlmICh0eXBlb2YgKG1ldGhvZCkgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIG1ldGhvZC5jaGVjayhjaGVjaywgbXNnKTtcblx0fSBlbHNlIHtcblx0ICAgIHdob1ttZXRob2RdLmNoZWNrKGNoZWNrLCBtc2cpO1xuXHR9XG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAobWV0aG9kLCBjYmFrKSB7XG5cdGlmIChtZXRob2QgaW5zdGFuY2VvZiBBcnJheSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG1ldGhvZC5sZW5ndGg7IGkrKykge1xuXHRcdGFwaS50cmFuc2Zvcm0gKG1ldGhvZFtpXSwgY2Jhayk7XG5cdCAgICB9XG5cdCAgICByZXR1cm47XG5cdH1cblxuXHRpZiAodHlwZW9mIChtZXRob2QpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBtZXRob2QudHJhbnNmb3JtIChjYmFrKTtcblx0fSBlbHNlIHtcblx0ICAgIHdob1ttZXRob2RdLnRyYW5zZm9ybShjYmFrKTtcblx0fVxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICB2YXIgYXR0YWNoX21ldGhvZCA9IGZ1bmN0aW9uIChtZXRob2QsIG9wdHMpIHtcblx0dmFyIGNoZWNrcyA9IFtdO1xuXHR2YXIgdHJhbnNmb3JtcyA9IFtdO1xuXG5cdHZhciBnZXR0ZXIgPSBvcHRzLm9uX2dldHRlciB8fCBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gbWV0aG9kcy5nZXQobWV0aG9kKTtcblx0fTtcblxuXHR2YXIgc2V0dGVyID0gb3B0cy5vbl9zZXR0ZXIgfHwgZnVuY3Rpb24gKHgpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFuc2Zvcm1zLmxlbmd0aDsgaSsrKSB7XG5cdFx0eCA9IHRyYW5zZm9ybXNbaV0oeCk7XG5cdCAgICB9XG5cblx0ICAgIGZvciAodmFyIGo9MDsgajxjaGVja3MubGVuZ3RoOyBqKyspIHtcblx0XHRpZiAoIWNoZWNrc1tqXS5jaGVjayh4KSkge1xuXHRcdCAgICB2YXIgbXNnID0gY2hlY2tzW2pdLm1zZyB8fCBcblx0XHRcdChcIlZhbHVlIFwiICsgeCArIFwiIGRvZXNuJ3Qgc2VlbSB0byBiZSB2YWxpZCBmb3IgdGhpcyBtZXRob2RcIik7XG5cdFx0ICAgIHRocm93IChtc2cpO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIG1ldGhvZHMuYWRkKG1ldGhvZCwgeCk7XG5cdH07XG5cblx0dmFyIG5ld19tZXRob2QgPSBmdW5jdGlvbiAobmV3X3ZhbCkge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGdldHRlcigpO1xuXHQgICAgfVxuXHQgICAgc2V0dGVyKG5ld192YWwpO1xuXHQgICAgcmV0dXJuIHdobzsgLy8gUmV0dXJuIHRoaXM/XG5cdH07XG5cdG5ld19tZXRob2QuY2hlY2sgPSBmdW5jdGlvbiAoY2JhaywgbXNnKSB7XG5cdCAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gY2hlY2tzO1xuXHQgICAgfVxuXHQgICAgY2hlY2tzLnB1c2ggKHtjaGVjayA6IGNiYWssXG5cdFx0XHQgIG1zZyAgIDogbXNnfSk7XG5cdCAgICByZXR1cm4gdGhpcztcblx0fTtcblx0bmV3X21ldGhvZC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2Jhaykge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRyYW5zZm9ybXM7XG5cdCAgICB9XG5cdCAgICB0cmFuc2Zvcm1zLnB1c2goY2Jhayk7XG5cdCAgICByZXR1cm4gdGhpcztcblx0fTtcblxuXHR3aG9bbWV0aG9kXSA9IG5ld19tZXRob2Q7XG4gICAgfTtcblxuICAgIHZhciBnZXRzZXQgPSBmdW5jdGlvbiAocGFyYW0sIG9wdHMpIHtcblx0aWYgKHR5cGVvZiAocGFyYW0pID09PSAnb2JqZWN0Jykge1xuXHQgICAgbWV0aG9kcy5hZGRfYmF0Y2ggKHBhcmFtKTtcblx0ICAgIGZvciAodmFyIHAgaW4gcGFyYW0pIHtcblx0XHRhdHRhY2hfbWV0aG9kIChwLCBvcHRzKTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIG1ldGhvZHMuYWRkIChwYXJhbSwgb3B0cy5kZWZhdWx0X3ZhbHVlKTtcblx0ICAgIGF0dGFjaF9tZXRob2QgKHBhcmFtLCBvcHRzKTtcblx0fVxuICAgIH07XG5cbiAgICBhcGkuZ2V0c2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0Z2V0c2V0KHBhcmFtLCB7ZGVmYXVsdF92YWx1ZSA6IGRlZn0pO1xuXG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS5nZXQgPSBmdW5jdGlvbiAocGFyYW0sIGRlZikge1xuXHR2YXIgb25fc2V0dGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgdGhyb3cgKFwiTWV0aG9kIGRlZmluZWQgb25seSBhcyBhIGdldHRlciAoeW91IGFyZSB0cnlpbmcgdG8gdXNlIGl0IGFzIGEgc2V0dGVyXCIpO1xuXHR9O1xuXG5cdGdldHNldChwYXJhbSwge2RlZmF1bHRfdmFsdWUgOiBkZWYsXG5cdFx0ICAgICAgIG9uX3NldHRlciA6IG9uX3NldHRlcn1cblx0ICAgICAgKTtcblxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkuc2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0dmFyIG9uX2dldHRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRocm93IChcIk1ldGhvZCBkZWZpbmVkIG9ubHkgYXMgYSBzZXR0ZXIgKHlvdSBhcmUgdHJ5aW5nIHRvIHVzZSBpdCBhcyBhIGdldHRlclwiKTtcblx0fTtcblxuXHRnZXRzZXQocGFyYW0sIHtkZWZhdWx0X3ZhbHVlIDogZGVmLFxuXHRcdCAgICAgICBvbl9nZXR0ZXIgOiBvbl9nZXR0ZXJ9XG5cdCAgICAgICk7XG5cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLm1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBjYmFrKSB7XG5cdGlmICh0eXBlb2YgKG5hbWUpID09PSAnb2JqZWN0Jykge1xuXHQgICAgZm9yICh2YXIgcCBpbiBuYW1lKSB7XG5cdFx0d2hvW3BdID0gbmFtZVtwXTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIHdob1tuYW1lXSA9IGNiYWs7XG5cdH1cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGFwaTtcbiAgICBcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGFwaTsiLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG52YXIgZGVmZXJDYW5jZWwgPSByZXF1aXJlIChcInRudC51dGlsc1wiKS5kZWZlcl9jYW5jZWw7XG5cbnZhciBib2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIFxuICAgIC8vLy8gUHJpdmF0ZSB2YXJzXG4gICAgdmFyIHN2ZztcbiAgICB2YXIgZGl2X2lkO1xuICAgIHZhciB0cmFja3MgPSBbXTtcbiAgICB2YXIgbWluX3dpZHRoID0gNTA7XG4gICAgdmFyIGhlaWdodCAgICA9IDA7ICAgIC8vIFRoaXMgaXMgdGhlIGdsb2JhbCBoZWlnaHQgaW5jbHVkaW5nIGFsbCB0aGUgdHJhY2tzXG4gICAgdmFyIHdpZHRoICAgICA9IDkyMDtcbiAgICB2YXIgaGVpZ2h0X29mZnNldCA9IDIwO1xuICAgIHZhciBsb2MgPSB7XG5cdHNwZWNpZXMgIDogdW5kZWZpbmVkLFxuXHRjaHIgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgICAgZnJvbSAgICAgOiAwLFxuICAgICAgICB0byAgICAgICA6IDUwMFxuICAgIH07XG5cbiAgICAvLyBUT0RPOiBXZSBoYXZlIG5vdyBiYWNrZ3JvdW5kIGNvbG9yIGluIHRoZSB0cmFja3MuIENhbiB0aGlzIGJlIHJlbW92ZWQ/XG4gICAgLy8gSXQgbG9va3MgbGlrZSBpdCBpcyB1c2VkIGluIHRoZSB0b28td2lkZSBwYW5lIGV0YywgYnV0IGl0IG1heSBub3QgYmUgbmVlZGVkIGFueW1vcmVcbiAgICB2YXIgYmdDb2xvciAgID0gZDMucmdiKCcjRjhGQkVGJyk7IC8vI0Y4RkJFRlxuICAgIHZhciBwYW5lOyAvLyBEcmFnZ2FibGUgcGFuZVxuICAgIHZhciBzdmdfZztcbiAgICB2YXIgeFNjYWxlO1xuICAgIHZhciB6b29tRXZlbnRIYW5kbGVyID0gZDMuYmVoYXZpb3Iuem9vbSgpO1xuICAgIHZhciBsaW1pdHMgPSB7XG5cdGxlZnQgOiAwLFxuXHRyaWdodCA6IDEwMDAsXG5cdHpvb21fb3V0IDogMTAwMCxcblx0em9vbV9pbiAgOiAxMDBcbiAgICB9O1xuICAgIHZhciBjYXBfd2lkdGggPSAzO1xuICAgIHZhciBkdXIgPSA1MDA7XG4gICAgdmFyIGRyYWdfYWxsb3dlZCA9IHRydWU7XG5cbiAgICB2YXIgZXhwb3J0cyA9IHtcblx0ZWFzZSAgICAgICAgICA6IGQzLmVhc2UoXCJjdWJpYy1pbi1vdXRcIiksXG5cdGV4dGVuZF9jYW52YXMgOiB7XG5cdCAgICBsZWZ0IDogMCxcblx0ICAgIHJpZ2h0IDogMFxuXHR9LFxuXHRzaG93X2ZyYW1lIDogdHJ1ZVxuXHQvLyBsaW1pdHMgICAgICAgIDogZnVuY3Rpb24gKCkge3Rocm93IFwiVGhlIGxpbWl0cyBtZXRob2Qgc2hvdWxkIGJlIGRlZmluZWRcIn1cdFxuICAgIH07XG5cbiAgICAvLyBUaGUgcmV0dXJuZWQgY2xvc3VyZSAvIG9iamVjdFxuICAgIHZhciB0cmFja192aXMgPSBmdW5jdGlvbihkaXYpIHtcblx0ZGl2X2lkID0gZDMuc2VsZWN0KGRpdikuYXR0cihcImlkXCIpO1xuXG5cdC8vIFRoZSBvcmlnaW5hbCBkaXYgaXMgY2xhc3NlZCB3aXRoIHRoZSB0bnQgY2xhc3Ncblx0ZDMuc2VsZWN0KGRpdilcblx0ICAgIC5jbGFzc2VkKFwidG50XCIsIHRydWUpO1xuXG5cdC8vIFRPRE86IE1vdmUgdGhlIHN0eWxpbmcgdG8gdGhlIHNjc3M/XG5cdHZhciBicm93c2VyRGl2ID0gZDMuc2VsZWN0KGRpdilcblx0ICAgIC5hcHBlbmQoXCJkaXZcIilcblx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQpXG5cdCAgICAuc3R5bGUoXCJwb3NpdGlvblwiLCBcInJlbGF0aXZlXCIpXG5cdCAgICAuY2xhc3NlZChcInRudF9mcmFtZWRcIiwgZXhwb3J0cy5zaG93X2ZyYW1lID8gdHJ1ZSA6IGZhbHNlKVxuXHQgICAgLnN0eWxlKFwid2lkdGhcIiwgKHdpZHRoICsgY2FwX3dpZHRoKjIgKyBleHBvcnRzLmV4dGVuZF9jYW52YXMucmlnaHQgKyBleHBvcnRzLmV4dGVuZF9jYW52YXMubGVmdCkgKyBcInB4XCIpXG5cblx0dmFyIGdyb3VwRGl2ID0gYnJvd3NlckRpdlxuXHQgICAgLmFwcGVuZChcImRpdlwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9ncm91cERpdlwiKTtcblxuXHQvLyBUaGUgU1ZHXG5cdHN2ZyA9IGdyb3VwRGl2XG5cdCAgICAuYXBwZW5kKFwic3ZnXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3N2Z1wiKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcblx0ICAgIC5hdHRyKFwicG9pbnRlci1ldmVudHNcIiwgXCJhbGxcIik7XG5cblx0c3ZnX2cgPSBzdmdcblx0ICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLDIwKVwiKVxuICAgICAgICAgICAgLmFwcGVuZChcImdcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZ1wiKTtcblxuXHQvLyBjYXBzXG5cdHN2Z19nXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZCArIFwiXzVwY2FwXCIpXG5cdCAgICAuYXR0cihcInhcIiwgMClcblx0ICAgIC5hdHRyKFwieVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCAwKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIFwicmVkXCIpO1xuXHRzdmdfZ1xuXHQgICAgLmFwcGVuZChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl8zcGNhcFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIHdpZHRoLWNhcF93aWR0aClcblx0ICAgIC5hdHRyKFwieVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCAwKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIFwicmVkXCIpO1xuXG5cdC8vIFRoZSBab29taW5nL1Bhbm5pbmcgUGFuZVxuXHRwYW5lID0gc3ZnX2dcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3BhbmVcIilcblx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl9wYW5lXCIpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuXHQgICAgLnN0eWxlKFwiZmlsbFwiLCBiZ0NvbG9yKTtcblxuXHQvLyAqKiBUT0RPOiBXb3VsZG4ndCBiZSBiZXR0ZXIgdG8gaGF2ZSB0aGVzZSBtZXNzYWdlcyBieSB0cmFjaz9cblx0Ly8gdmFyIHRvb1dpZGVfdGV4dCA9IHN2Z19nXG5cdC8vICAgICAuYXBwZW5kKFwidGV4dFwiKVxuXHQvLyAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF93aWRlT0tfdGV4dFwiKVxuXHQvLyAgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZCArIFwiX3Rvb1dpZGVcIilcblx0Ly8gICAgIC5hdHRyKFwiZmlsbFwiLCBiZ0NvbG9yKVxuXHQvLyAgICAgLnRleHQoXCJSZWdpb24gdG9vIHdpZGVcIik7XG5cblx0Ly8gVE9ETzogSSBkb24ndCBrbm93IGlmIHRoaXMgaXMgdGhlIGJlc3Qgd2F5IChhbmQgcG9ydGFibGUpIHdheVxuXHQvLyBvZiBjZW50ZXJpbmcgdGhlIHRleHQgaW4gdGhlIHRleHQgYXJlYVxuXHQvLyB2YXIgYmIgPSB0b29XaWRlX3RleHRbMF1bMF0uZ2V0QkJveCgpO1xuXHQvLyB0b29XaWRlX3RleHRcblx0Ly8gICAgIC5hdHRyKFwieFwiLCB+fih3aWR0aC8yIC0gYmIud2lkdGgvMikpXG5cdC8vICAgICAuYXR0cihcInlcIiwgfn4oaGVpZ2h0LzIgLSBiYi5oZWlnaHQvMikpO1xuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICB2YXIgYXBpID0gYXBpanMgKHRyYWNrX3Zpcylcblx0LmdldHNldCAoZXhwb3J0cylcblx0LmdldHNldCAobGltaXRzKVxuXHQuZ2V0c2V0IChsb2MpO1xuXG4gICAgYXBpLnRyYW5zZm9ybSAodHJhY2tfdmlzLmV4dGVuZF9jYW52YXMsIGZ1bmN0aW9uICh2YWwpIHtcblx0dmFyIHByZXZfdmFsID0gdHJhY2tfdmlzLmV4dGVuZF9jYW52YXMoKTtcblx0dmFsLmxlZnQgPSB2YWwubGVmdCB8fCBwcmV2X3ZhbC5sZWZ0O1xuXHR2YWwucmlnaHQgPSB2YWwucmlnaHQgfHwgcHJldl92YWwucmlnaHQ7XG5cdHJldHVybiB2YWw7XG4gICAgfSk7XG5cbiAgICAvLyB0cmFja192aXMgYWx3YXlzIHN0YXJ0cyBvbiBsb2MuZnJvbSAmIGxvYy50b1xuICAgIGFwaS5tZXRob2QgKCdzdGFydCcsIGZ1bmN0aW9uICgpIHtcblxuXHQvLyBSZXNldCB0aGUgdHJhY2tzXG5cdGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmICh0cmFja3NbaV0uZykge1xuXHRcdHRyYWNrc1tpXS5kaXNwbGF5KCkucmVzZXQuY2FsbCh0cmFja3NbaV0pO1xuXHQgICAgfVxuXHQgICAgX2luaXRfdHJhY2sodHJhY2tzW2ldKTtcblx0fVxuXG5cdF9wbGFjZV90cmFja3MoKTtcblxuXHQvLyBUaGUgY29udGludWF0aW9uIGNhbGxiYWNrXG5cdHZhciBjb250ID0gZnVuY3Rpb24gKHJlc3ApIHtcblx0ICAgIGxpbWl0cy5yaWdodCA9IHJlc3A7XG5cblx0ICAgIC8vIHpvb21FdmVudEhhbmRsZXIueEV4dGVudChbbGltaXRzLmxlZnQsIGxpbWl0cy5yaWdodF0pO1xuXHQgICAgaWYgKChsb2MudG8gLSBsb2MuZnJvbSkgPCBsaW1pdHMuem9vbV9pbikge1xuXHRcdGlmICgobG9jLmZyb20gKyBsaW1pdHMuem9vbV9pbikgPiBsaW1pdHMuem9vbV9pbikge1xuXHRcdCAgICBsb2MudG8gPSBsaW1pdHMucmlnaHQ7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgbG9jLnRvID0gbG9jLmZyb20gKyBsaW1pdHMuem9vbV9pbjtcblx0XHR9XG5cdCAgICB9XG5cdCAgICBwbG90KCk7XG5cblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0XHRfdXBkYXRlX3RyYWNrKHRyYWNrc1tpXSwgbG9jKTtcblx0ICAgIH1cblx0fTtcblxuXHQvLyBJZiBsaW1pdHMucmlnaHQgaXMgYSBmdW5jdGlvbiwgd2UgaGF2ZSB0byBjYWxsIGl0IGFzeW5jaHJvbm91c2x5IGFuZFxuXHQvLyB0aGVuIHN0YXJ0aW5nIHRoZSBwbG90IG9uY2Ugd2UgaGF2ZSBzZXQgdGhlIHJpZ2h0IGxpbWl0IChwbG90KVxuXHQvLyBJZiBub3QsIHdlIGFzc3VtZSB0aGF0IGl0IGlzIGFuIG9iamV0IHdpdGggbmV3IChtYXliZSBwYXJ0aWFsbHkgZGVmaW5lZClcblx0Ly8gZGVmaW5pdGlvbnMgb2YgdGhlIGxpbWl0cyBhbmQgd2UgY2FuIHBsb3QgZGlyZWN0bHlcblx0Ly8gVE9ETzogUmlnaHQgbm93LCBvbmx5IHJpZ2h0IGNhbiBiZSBjYWxsZWQgYXMgYW4gYXN5bmMgZnVuY3Rpb24gd2hpY2ggaXMgd2Vha1xuXHRpZiAodHlwZW9mIChsaW1pdHMucmlnaHQpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBsaW1pdHMucmlnaHQoY29udCk7XG5cdH0gZWxzZSB7XG5cdCAgICBjb250KGxpbWl0cy5yaWdodCk7XG5cdH1cblxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3VwZGF0ZScsIGZ1bmN0aW9uICgpIHtcblx0Zm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgX3VwZGF0ZV90cmFjayAodHJhY2tzW2ldKTtcblx0fVxuXG4gICAgfSk7XG5cbiAgICB2YXIgX3VwZGF0ZV90cmFjayA9IGZ1bmN0aW9uICh0cmFjaywgd2hlcmUpIHtcblx0aWYgKHRyYWNrLmRhdGEoKSkge1xuXHQgICAgdmFyIHRyYWNrX2RhdGEgPSB0cmFjay5kYXRhKCk7XG5cdCAgICB2YXIgZGF0YV91cGRhdGVyID0gdHJhY2tfZGF0YS51cGRhdGUoKTtcblx0ICAgIC8vdmFyIGRhdGFfdXBkYXRlciA9IHRyYWNrLmRhdGEoKS51cGRhdGUoKTtcblx0ICAgIGRhdGFfdXBkYXRlci5jYWxsKHRyYWNrX2RhdGEsIHtcblx0XHQnbG9jJyA6IHdoZXJlLFxuXHRcdCdvbl9zdWNjZXNzJyA6IGZ1bmN0aW9uICgpIHtcblx0XHQgICAgdHJhY2suZGlzcGxheSgpLnVwZGF0ZS5jYWxsKHRyYWNrLCB4U2NhbGUpO1xuXHRcdH1cblx0ICAgIH0pO1xuXHR9XG4gICAgfTtcblxuICAgIHZhciBwbG90ID0gZnVuY3Rpb24oKSB7XG5cblx0eFNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcblx0ICAgIC5kb21haW4oW2xvYy5mcm9tLCBsb2MudG9dKVxuXHQgICAgLnJhbmdlKFswLCB3aWR0aF0pO1xuXG5cdGlmIChkcmFnX2FsbG93ZWQpIHtcblx0ICAgIHN2Z19nLmNhbGwoIHpvb21FdmVudEhhbmRsZXJcblx0XHQgICAgICAgLngoeFNjYWxlKVxuXHRcdCAgICAgICAuc2NhbGVFeHRlbnQoWyhsb2MudG8tbG9jLmZyb20pLyhsaW1pdHMuem9vbV9vdXQtMSksIChsb2MudG8tbG9jLmZyb20pL2xpbWl0cy56b29tX2luXSlcblx0XHQgICAgICAgLm9uKFwiem9vbVwiLCBfbW92ZSlcblx0XHQgICAgICk7XG5cdH1cblxuICAgIH07XG5cbiAgICAvLyByaWdodC9sZWZ0L3pvb20gcGFucyBvciB6b29tcyB0aGUgdHJhY2suIFRoZXNlIG1ldGhvZHMgYXJlIGV4cG9zZWQgdG8gYWxsb3cgZXh0ZXJuYWwgYnV0dG9ucywgZXRjIHRvIGludGVyYWN0IHdpdGggdGhlIHRyYWNrcy4gVGhlIGFyZ3VtZW50IGlzIHRoZSBhbW91bnQgb2YgcGFubmluZy96b29taW5nIChpZS4gMS4yIG1lYW5zIDIwJSBwYW5uaW5nKSBXaXRoIGxlZnQvcmlnaHQgb25seSBwb3NpdGl2ZSBudW1iZXJzIGFyZSBhbGxvd2VkLlxuICAgIGFwaS5tZXRob2QgKCdtb3ZlX3JpZ2h0JywgZnVuY3Rpb24gKGZhY3Rvcikge1xuXHRpZiAoZmFjdG9yID4gMCkge1xuXHQgICAgX21hbnVhbF9tb3ZlKGZhY3RvciwgMSk7XG5cdH1cbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdtb3ZlX2xlZnQnLCBmdW5jdGlvbiAoZmFjdG9yKSB7XG5cdGlmIChmYWN0b3IgPiAwKSB7XG5cdCAgICBfbWFudWFsX21vdmUoZmFjdG9yLCAtMSk7XG5cdH1cbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCd6b29tJywgZnVuY3Rpb24gKGZhY3Rvcikge1xuXHRfbWFudWFsX21vdmUoZmFjdG9yLCAwKTtcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdmaW5kX3RyYWNrX2J5X2lkJywgZnVuY3Rpb24gKGlkKSB7XG5cdGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmICh0cmFja3NbaV0uaWQoKSA9PT0gaWQpIHtcblx0XHRyZXR1cm4gdHJhY2tzW2ldO1xuXHQgICAgfVxuXHR9XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgncmVvcmRlcicsIGZ1bmN0aW9uIChuZXdfdHJhY2tzKSB7XG5cdC8vIFRPRE86IFRoaXMgaXMgZGVmaW5pbmcgYSBuZXcgaGVpZ2h0LCBidXQgdGhlIGdsb2JhbCBoZWlnaHQgaXMgdXNlZCB0byBkZWZpbmUgdGhlIHNpemUgb2Ygc2V2ZXJhbFxuXHQvLyBwYXJ0cy4gV2Ugc2hvdWxkIGRvIHRoaXMgZHluYW1pY2FsbHlcblxuXHRmb3IgKHZhciBqPTA7IGo8bmV3X3RyYWNrcy5sZW5ndGg7IGorKykge1xuXHQgICAgdmFyIGZvdW5kID0gZmFsc2U7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdFx0aWYgKHRyYWNrc1tpXS5pZCgpID09PSBuZXdfdHJhY2tzW2pdLmlkKCkpIHtcblx0XHQgICAgZm91bmQgPSB0cnVlO1xuXHRcdCAgICB0cmFja3Muc3BsaWNlKGksMSk7XG5cdFx0ICAgIGJyZWFrO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIGlmICghZm91bmQpIHtcblx0XHRfaW5pdF90cmFjayhuZXdfdHJhY2tzW2pdKTtcblx0XHRfdXBkYXRlX3RyYWNrKG5ld190cmFja3Nbal0sIHtmcm9tIDogbG9jLmZyb20sIHRvIDogbG9jLnRvfSk7XG5cdCAgICB9XG5cdH1cblxuXHRmb3IgKHZhciB4PTA7IHg8dHJhY2tzLmxlbmd0aDsgeCsrKSB7XG5cdCAgICB0cmFja3NbeF0uZy5yZW1vdmUoKTtcblx0fVxuXG5cdHRyYWNrcyA9IG5ld190cmFja3M7XG5cdF9wbGFjZV90cmFja3MoKTtcblxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3JlbW92ZV90cmFjaycsIGZ1bmN0aW9uICh0cmFjaykge1xuXHR0cmFjay5nLnJlbW92ZSgpO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2FkZF90cmFjaycsIGZ1bmN0aW9uICh0cmFjaykge1xuXHRpZiAodHJhY2sgaW5zdGFuY2VvZiBBcnJheSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrLmxlbmd0aDsgaSsrKSB7XG5cdFx0dHJhY2tfdmlzLmFkZF90cmFjayAodHJhY2tbaV0pO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRyYWNrX3Zpcztcblx0fVxuXHR0cmFja3MucHVzaCh0cmFjayk7XG5cdHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kKCd0cmFja3MnLCBmdW5jdGlvbiAobmV3X3RyYWNrcykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB0cmFja3Ncblx0fVxuXHR0cmFja3MgPSBuZXdfdHJhY2tzO1xuXHRyZXR1cm4gdHJhY2tfdmlzO1xuICAgIH0pO1xuXG4gICAgLy8gXG4gICAgYXBpLm1ldGhvZCAoJ3dpZHRoJywgZnVuY3Rpb24gKHcpIHtcblx0Ly8gVE9ETzogQWxsb3cgc3VmZml4ZXMgbGlrZSBcIjEwMDBweFwiP1xuXHQvLyBUT0RPOiBUZXN0IHdyb25nIGZvcm1hdHNcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gd2lkdGg7XG5cdH1cblx0Ly8gQXQgbGVhc3QgbWluLXdpZHRoXG5cdGlmICh3IDwgbWluX3dpZHRoKSB7XG5cdCAgICB3ID0gbWluX3dpZHRoXG5cdH1cblxuXHQvLyBXZSBhcmUgcmVzaXppbmdcblx0aWYgKGRpdl9pZCAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkKS5zZWxlY3QoXCJzdmdcIikuYXR0cihcIndpZHRoXCIsIHcpO1xuXHQgICAgLy8gUmVzaXplIHRoZSB6b29taW5nL3Bhbm5pbmcgcGFuZVxuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCkuc3R5bGUoXCJ3aWR0aFwiLCAocGFyc2VJbnQodykgKyBjYXBfd2lkdGgqMikgKyBcInB4XCIpO1xuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiX3BhbmVcIikuYXR0cihcIndpZHRoXCIsIHcpO1xuXG5cdCAgICAvLyBSZXBsb3Rcblx0ICAgIHdpZHRoID0gdztcblx0ICAgIHBsb3QoKTtcblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0XHR0cmFja3NbaV0uZy5zZWxlY3QoXCJyZWN0XCIpLmF0dHIoXCJ3aWR0aFwiLCB3KTtcblx0XHR0cmFja3NbaV0uZGlzcGxheSgpLnJlc2V0LmNhbGwodHJhY2tzW2ldKTtcblx0XHR0cmFja3NbaV0uZGlzcGxheSgpLnVwZGF0ZS5jYWxsKHRyYWNrc1tpXSx4U2NhbGUpO1xuXHQgICAgfVxuXHQgICAgXG5cdH0gZWxzZSB7XG5cdCAgICB3aWR0aCA9IHc7XG5cdH1cblx0XG5cdHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kKCdhbGxvd19kcmFnJywgZnVuY3Rpb24oYikge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBkcmFnX2FsbG93ZWQ7XG5cdH1cblx0ZHJhZ19hbGxvd2VkID0gYjtcblx0aWYgKGRyYWdfYWxsb3dlZCkge1xuXHQgICAgLy8gV2hlbiB0aGlzIG1ldGhvZCBpcyBjYWxsZWQgb24gdGhlIG9iamVjdCBiZWZvcmUgc3RhcnRpbmcgdGhlIHNpbXVsYXRpb24sIHdlIGRvbid0IGhhdmUgZGVmaW5lZCB4U2NhbGVcblx0ICAgIGlmICh4U2NhbGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHN2Z19nLmNhbGwoIHpvb21FdmVudEhhbmRsZXIueCh4U2NhbGUpXG5cdFx0XHQgICAvLyAueEV4dGVudChbMCwgbGltaXRzLnJpZ2h0XSlcblx0XHRcdCAgIC5zY2FsZUV4dGVudChbKGxvYy50by1sb2MuZnJvbSkvKGxpbWl0cy56b29tX291dC0xKSwgKGxvYy50by1sb2MuZnJvbSkvbGltaXRzLnpvb21faW5dKVxuXHRcdFx0ICAgLm9uKFwiem9vbVwiLCBfbW92ZSkgKTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIC8vIFdlIGNyZWF0ZSBhIG5ldyBkdW1teSBzY2FsZSBpbiB4IHRvIGF2b2lkIGRyYWdnaW5nIHRoZSBwcmV2aW91cyBvbmVcblx0ICAgIC8vIFRPRE86IFRoZXJlIG1heSBiZSBhIGNoZWFwZXIgd2F5IG9mIGRvaW5nIHRoaXM/XG5cdCAgICB6b29tRXZlbnRIYW5kbGVyLngoZDMuc2NhbGUubGluZWFyKCkpLm9uKFwiem9vbVwiLCBudWxsKTtcblx0fVxuXHRyZXR1cm4gdHJhY2tfdmlzO1xuICAgIH0pO1xuXG4gICAgdmFyIF9wbGFjZV90cmFja3MgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBoID0gMDtcblx0Zm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIHRyYWNrID0gdHJhY2tzW2ldO1xuXHQgICAgaWYgKHRyYWNrLmcuYXR0cihcInRyYW5zZm9ybVwiKSkge1xuXHRcdHRyYWNrLmdcblx0XHQgICAgLnRyYW5zaXRpb24oKVxuXHRcdCAgICAuZHVyYXRpb24oZHVyKVxuXHRcdCAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLFwiICsgaCArIFwiKVwiKTtcblx0ICAgIH0gZWxzZSB7XG5cdFx0dHJhY2suZ1xuXHRcdCAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLFwiICsgaCArIFwiKVwiKTtcblx0ICAgIH1cblxuXHQgICAgaCArPSB0cmFjay5oZWlnaHQoKTtcblx0fVxuXG5cdC8vIHN2Z1xuXHRzdmcuYXR0cihcImhlaWdodFwiLCBoICsgaGVpZ2h0X29mZnNldCk7XG5cblx0Ly8gZGl2XG5cdGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQpXG5cdCAgICAuc3R5bGUoXCJoZWlnaHRcIiwgKGggKyAxMCArIGhlaWdodF9vZmZzZXQpICsgXCJweFwiKTtcblxuXHQvLyBjYXBzXG5cdGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQgKyBcIl81cGNhcFwiKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaClcblx0ICAgIC8vIC5tb3ZlX3RvX2Zyb250KClcblx0ICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG5cdFx0bW92ZV90b19mcm9udCh0aGlzKTtcblx0ICAgIH0pXG5cdGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQgKyBcIl8zcGNhcFwiKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaClcblx0Ly8ubW92ZV90b19mcm9udCgpXG5cdCAgICAuZWFjaCAoZnVuY3Rpb24gKGQpIHtcblx0XHRtb3ZlX3RvX2Zyb250KHRoaXMpO1xuXHQgICAgfSk7XG5cdFxuXG5cdC8vIHBhbmVcblx0cGFuZVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaCArIGhlaWdodF9vZmZzZXQpO1xuXG5cdC8vIHRvb1dpZGVfdGV4dC4gVE9ETzogSXMgdGhpcyBzdGlsbCBuZWVkZWQ/XG5cdC8vIHZhciB0b29XaWRlX3RleHQgPSBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfdG9vV2lkZVwiKTtcblx0Ly8gdmFyIGJiID0gdG9vV2lkZV90ZXh0WzBdWzBdLmdldEJCb3goKTtcblx0Ly8gdG9vV2lkZV90ZXh0XG5cdC8vICAgICAuYXR0cihcInlcIiwgfn4oaC8yKSAtIGJiLmhlaWdodC8yKTtcblxuXHRyZXR1cm4gdHJhY2tfdmlzO1xuICAgIH1cblxuICAgIHZhciBfaW5pdF90cmFjayA9IGZ1bmN0aW9uICh0cmFjaykge1xuXHR0cmFjay5nID0gc3ZnLnNlbGVjdChcImdcIikuc2VsZWN0KFwiZ1wiKVxuXHQgICAgLmFwcGVuZChcImdcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfdHJhY2tcIilcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRyYWNrLmhlaWdodCgpKTtcblxuXHQvLyBSZWN0IGZvciB0aGUgYmFja2dyb3VuZCBjb2xvclxuXHR0cmFjay5nXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIDApXG5cdCAgICAuYXR0cihcInlcIiwgMClcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgdHJhY2tfdmlzLndpZHRoKCkpXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSlcblx0ICAgIC5zdHlsZShcImZpbGxcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuXHQgICAgLnN0eWxlKFwicG9pbnRlci1ldmVudHNcIiwgXCJub25lXCIpO1xuXG5cdGlmICh0cmFjay5kaXNwbGF5KCkpIHtcblx0ICAgIHRyYWNrLmRpc3BsYXkoKS5pbml0LmNhbGwodHJhY2ssIHdpZHRoKTtcblx0fVxuXHRcblx0cmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9O1xuXG4gICAgdmFyIF9tYW51YWxfbW92ZSA9IGZ1bmN0aW9uIChmYWN0b3IsIGRpcmVjdGlvbikge1xuXHR2YXIgb2xkRG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuXG5cdHZhciBzcGFuID0gb2xkRG9tYWluWzFdIC0gb2xkRG9tYWluWzBdO1xuXHR2YXIgb2Zmc2V0ID0gKHNwYW4gKiBmYWN0b3IpIC0gc3BhbjtcblxuXHR2YXIgbmV3RG9tYWluO1xuXHRzd2l0Y2ggKGRpcmVjdGlvbikge1xuXHRjYXNlIC0xIDpcblx0ICAgIG5ld0RvbWFpbiA9IFsofn5vbGREb21haW5bMF0gLSBvZmZzZXQpLCB+fihvbGREb21haW5bMV0gLSBvZmZzZXQpXTtcblx0ICAgIGJyZWFrO1xuXHRjYXNlIDEgOlxuXHQgICAgbmV3RG9tYWluID0gWyh+fm9sZERvbWFpblswXSArIG9mZnNldCksIH5+KG9sZERvbWFpblsxXSAtIG9mZnNldCldO1xuXHQgICAgYnJlYWs7XG5cdGNhc2UgMCA6XG5cdCAgICBuZXdEb21haW4gPSBbb2xkRG9tYWluWzBdIC0gfn4ob2Zmc2V0LzIpLCBvbGREb21haW5bMV0gKyAofn5vZmZzZXQvMildO1xuXHR9XG5cblx0dmFyIGludGVycG9sYXRvciA9IGQzLmludGVycG9sYXRlTnVtYmVyKG9sZERvbWFpblswXSwgbmV3RG9tYWluWzBdKTtcblx0dmFyIGVhc2UgPSBleHBvcnRzLmVhc2U7XG5cblx0dmFyIHggPSAwO1xuXHRkMy50aW1lcihmdW5jdGlvbigpIHtcblx0ICAgIHZhciBjdXJyX3N0YXJ0ID0gaW50ZXJwb2xhdG9yKGVhc2UoeCkpO1xuXHQgICAgdmFyIGN1cnJfZW5kO1xuXHQgICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcblx0ICAgIGNhc2UgLTEgOlxuXHRcdGN1cnJfZW5kID0gY3Vycl9zdGFydCArIHNwYW47XG5cdFx0YnJlYWs7XG5cdCAgICBjYXNlIDEgOlxuXHRcdGN1cnJfZW5kID0gY3Vycl9zdGFydCArIHNwYW47XG5cdFx0YnJlYWs7XG5cdCAgICBjYXNlIDAgOlxuXHRcdGN1cnJfZW5kID0gb2xkRG9tYWluWzFdICsgb2xkRG9tYWluWzBdIC0gY3Vycl9zdGFydDtcblx0XHRicmVhaztcblx0ICAgIH1cblxuXHQgICAgdmFyIGN1cnJEb21haW4gPSBbY3Vycl9zdGFydCwgY3Vycl9lbmRdO1xuXHQgICAgeFNjYWxlLmRvbWFpbihjdXJyRG9tYWluKTtcblx0ICAgIF9tb3ZlKHhTY2FsZSk7XG5cdCAgICB4Kz0wLjAyO1xuXHQgICAgcmV0dXJuIHg+MTtcblx0fSk7XG4gICAgfTtcblxuXG4gICAgdmFyIF9tb3ZlX2NiYWsgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBjdXJyRG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuXHR0cmFja192aXMuZnJvbSh+fmN1cnJEb21haW5bMF0pO1xuXHR0cmFja192aXMudG8ofn5jdXJyRG9tYWluWzFdKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIHRyYWNrID0gdHJhY2tzW2ldO1xuXHQgICAgX3VwZGF0ZV90cmFjayh0cmFjaywgbG9jKTtcblx0fVxuICAgIH07XG4gICAgLy8gVGhlIGRlZmVycmVkX2NiYWsgaXMgZGVmZXJyZWQgYXQgbGVhc3QgdGhpcyBhbW91bnQgb2YgdGltZSBvciByZS1zY2hlZHVsZWQgaWYgZGVmZXJyZWQgaXMgY2FsbGVkIGJlZm9yZVxuICAgIHZhciBfZGVmZXJyZWQgPSBkZWZlckNhbmNlbChfbW92ZV9jYmFrLCAzMDApO1xuXG4gICAgLy8gYXBpLm1ldGhvZCgndXBkYXRlJywgZnVuY3Rpb24gKCkge1xuICAgIC8vIFx0X21vdmUoKTtcbiAgICAvLyB9KTtcblxuICAgIHZhciBfbW92ZSA9IGZ1bmN0aW9uIChuZXdfeFNjYWxlKSB7XG5cdGlmIChuZXdfeFNjYWxlICE9PSB1bmRlZmluZWQgJiYgZHJhZ19hbGxvd2VkKSB7XG5cdCAgICB6b29tRXZlbnRIYW5kbGVyLngobmV3X3hTY2FsZSk7XG5cdH1cblxuXHQvLyBTaG93IHRoZSByZWQgYmFycyBhdCB0aGUgbGltaXRzXG5cdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG5cdGlmIChkb21haW5bMF0gPD0gNSkge1xuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzVwY2FwXCIpXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCBjYXBfd2lkdGgpXG5cdFx0LnRyYW5zaXRpb24oKVxuXHRcdC5kdXJhdGlvbigyMDApXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCAwKTtcblx0fVxuXG5cdGlmIChkb21haW5bMV0gPj0gKGxpbWl0cy5yaWdodCktNSkge1xuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzNwY2FwXCIpXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCBjYXBfd2lkdGgpXG5cdFx0LnRyYW5zaXRpb24oKVxuXHRcdC5kdXJhdGlvbigyMDApXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCAwKTtcblx0fVxuXG5cblx0Ly8gQXZvaWQgbW92aW5nIHBhc3QgdGhlIGxpbWl0c1xuXHRpZiAoZG9tYWluWzBdIDwgbGltaXRzLmxlZnQpIHtcblx0ICAgIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKFt6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzBdIC0geFNjYWxlKGxpbWl0cy5sZWZ0KSArIHhTY2FsZS5yYW5nZSgpWzBdLCB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzFdXSk7XG5cdH0gZWxzZSBpZiAoZG9tYWluWzFdID4gbGltaXRzLnJpZ2h0KSB7XG5cdCAgICB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZShbem9vbUV2ZW50SGFuZGxlci50cmFuc2xhdGUoKVswXSAtIHhTY2FsZShsaW1pdHMucmlnaHQpICsgeFNjYWxlLnJhbmdlKClbMV0sIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKClbMV1dKTtcblx0fVxuXG5cdF9kZWZlcnJlZCgpO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0cmFja3NbaV07XG5cdCAgICB0cmFjay5kaXNwbGF5KCkubW92ZS5jYWxsKHRyYWNrLHhTY2FsZSk7XG5cdH1cbiAgICB9O1xuXG4gICAgLy8gYXBpLm1ldGhvZCh7XG4gICAgLy8gXHRhbGxvd19kcmFnIDogYXBpX2FsbG93X2RyYWcsXG4gICAgLy8gXHR3aWR0aCAgICAgIDogYXBpX3dpZHRoLFxuICAgIC8vIFx0YWRkX3RyYWNrICA6IGFwaV9hZGRfdHJhY2ssXG4gICAgLy8gXHRyZW9yZGVyICAgIDogYXBpX3Jlb3JkZXIsXG4gICAgLy8gXHR6b29tICAgICAgIDogYXBpX3pvb20sXG4gICAgLy8gXHRsZWZ0ICAgICAgIDogYXBpX2xlZnQsXG4gICAgLy8gXHRyaWdodCAgICAgIDogYXBpX3JpZ2h0LFxuICAgIC8vIFx0c3RhcnQgICAgICA6IGFwaV9zdGFydFxuICAgIC8vIH0pO1xuXG4gICAgLy8gQXV4aWxpYXIgZnVuY3Rpb25zXG4gICAgZnVuY3Rpb24gbW92ZV90b19mcm9udCAoZWxlbSkge1xuXHRlbGVtLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0cmFja192aXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBib2FyZDtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcbi8vIHZhciBlbnNlbWJsUmVzdEFQSSA9IHJlcXVpcmUoXCJ0bnQuZW5zZW1ibFwiKTtcblxuLy8gdmFyIGJvYXJkID0ge307XG4vLyBib2FyZC50cmFjayA9IHt9O1xuXG52YXIgZGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBfID0gZnVuY3Rpb24gKCkge1xuICAgIH07XG5cbiAgICAvLyBHZXR0ZXJzIC8gU2V0dGVyc1xuICAgIGFwaWpzIChfKVxuXHQuZ2V0c2V0ICgnbGFiZWwnLCBcIlwiKVxuXHQuZ2V0c2V0ICgnZWxlbWVudHMnLCBbXSlcblx0LmdldHNldCAoJ3VwZGF0ZScsIGZ1bmN0aW9uICgpIHt9KTtcblxuICAgIHJldHVybiBfO1xufTtcblxuLy8gVGhlIHJldHJpZXZlcnMuIFRoZXkgbmVlZCB0byBhY2Nlc3MgJ2VsZW1lbnRzJ1xuZGF0YS5yZXRyaWV2ZXIgPSB7fTtcblxuZGF0YS5yZXRyaWV2ZXIuc3luYyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB1cGRhdGVfdHJhY2sgPSBmdW5jdGlvbihvYmopIHtcblx0Ly8gXCJ0aGlzXCIgaXMgc2V0IHRvIHRoZSBkYXRhIG9ialxuICAgICAgICB0aGlzLmVsZW1lbnRzKHVwZGF0ZV90cmFjay5yZXRyaWV2ZXIoKShvYmoubG9jKSk7XG4gICAgICAgIG9iai5vbl9zdWNjZXNzKCk7XG4gICAgfTtcblxuICAgIGFwaWpzICh1cGRhdGVfdHJhY2spXG5cdC5nZXRzZXQgKCdyZXRyaWV2ZXInLCBmdW5jdGlvbiAoKSB7fSlcblxuICAgIHJldHVybiB1cGRhdGVfdHJhY2s7XG59O1xuXG5kYXRhLnJldHJpZXZlci5hc3luYyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdXJsID0gJyc7XG5cbiAgICAvLyBcInRoaXNcIiBpcyBzZXQgdG8gdGhlIGRhdGEgb2JqXG4gICAgdmFyIGRhdGFfb2JqID0gdGhpcztcbiAgICB2YXIgdXBkYXRlX3RyYWNrID0gZnVuY3Rpb24gKG9iaikge1xuXHRkMy5qc29uKHVybCwgZnVuY3Rpb24gKGVyciwgcmVzcCkge1xuXHQgICAgZGF0YV9vYmouZWxlbWVudHMocmVzcCk7XG5cdCAgICBvYmoub25fc3VjY2VzcygpO1xuXHR9KTsgXG4gICAgfTtcblxuICAgIGFwaWpzICh1cGRhdGVfdHJhY2spXG5cdC5nZXRzZXQgKCd1cmwnLCAnJyk7XG5cbiAgICByZXR1cm4gdXBkYXRlX3RyYWNrO1xufTtcblxuXG5cbi8vIEEgcHJlZGVmaW5lZCB0cmFjayBmb3IgZ2VuZXNcbi8vIHRudC50cmFjay5kYXRhLmdlbmUgPSBmdW5jdGlvbiAoKSB7XG4vLyAgICAgdmFyIHRyYWNrID0gdG50LnRyYWNrLmRhdGEoKTtcbi8vIFx0Ly8gLmluZGV4KFwiSURcIik7XG5cbi8vICAgICB2YXIgdXBkYXRlciA9IHRudC50cmFjay5yZXRyaWV2ZXIuZW5zZW1ibCgpXG4vLyBcdC5lbmRwb2ludChcInJlZ2lvblwiKVxuLy8gICAgIC8vIFRPRE86IElmIHN1Y2Nlc3MgaXMgZGVmaW5lZCBoZXJlLCBtZWFucyB0aGF0IGl0IGNhbid0IGJlIHVzZXItZGVmaW5lZFxuLy8gICAgIC8vIGlzIHRoYXQgZ29vZD8gZW5vdWdoPyBBUEk/XG4vLyAgICAgLy8gVVBEQVRFOiBOb3cgc3VjY2VzcyBpcyBiYWNrZWQgdXAgYnkgYW4gYXJyYXkuIFN0aWxsIGRvbid0IGtub3cgaWYgdGhpcyBpcyB0aGUgYmVzdCBvcHRpb25cbi8vIFx0LnN1Y2Nlc3MoZnVuY3Rpb24oZ2VuZXMpIHtcbi8vIFx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXMubGVuZ3RoOyBpKyspIHtcbi8vIFx0XHRpZiAoZ2VuZXNbaV0uc3RyYW5kID09PSAtMSkgeyAgXG4vLyBcdFx0ICAgIGdlbmVzW2ldLmRpc3BsYXlfbGFiZWwgPSBcIjxcIiArIGdlbmVzW2ldLmV4dGVybmFsX25hbWU7XG4vLyBcdFx0fSBlbHNlIHtcbi8vIFx0XHQgICAgZ2VuZXNbaV0uZGlzcGxheV9sYWJlbCA9IGdlbmVzW2ldLmV4dGVybmFsX25hbWUgKyBcIj5cIjtcbi8vIFx0XHR9XG4vLyBcdCAgICB9XG4vLyBcdH0pO1xuXG4vLyAgICAgcmV0dXJuIHRyYWNrLnVwZGF0ZSh1cGRhdGVyKTtcbi8vIH1cblxuLy8gQSBwcmVkZWZpbmVkIHRyYWNrIGRpc3BsYXlpbmcgbm8gZXh0ZXJuYWwgZGF0YVxuLy8gaXQgaXMgdXNlZCBmb3IgbG9jYXRpb24gYW5kIGF4aXMgdHJhY2tzIGZvciBleGFtcGxlXG5kYXRhLmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB0cmFjayA9IGRhdGEoKTtcbiAgICB2YXIgdXBkYXRlciA9IGRhdGEucmV0cmlldmVyLnN5bmMoKTtcbiAgICB0cmFjay51cGRhdGUodXBkYXRlcik7XG5cbiAgICByZXR1cm4gdHJhY2s7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBkYXRhO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGxheW91dCA9IHJlcXVpcmUoXCIuL2xheW91dC5qc1wiKTtcblxuLy8gRkVBVFVSRSBWSVNcbi8vIHZhciBib2FyZCA9IHt9O1xuLy8gYm9hcmQudHJhY2sgPSB7fTtcbnZhciB0bnRfZmVhdHVyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLy8vLy8gVmFycyBleHBvc2VkIGluIHRoZSBBUElcbiAgICB2YXIgZXhwb3J0cyA9IHtcblx0Y3JlYXRlICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJjcmVhdGVfZWxlbSBpcyBub3QgZGVmaW5lZCBpbiB0aGUgYmFzZSBmZWF0dXJlIG9iamVjdFwiO30sXG5cdG1vdmVyICAgIDogZnVuY3Rpb24gKCkge3Rocm93IFwibW92ZV9lbGVtIGlzIG5vdCBkZWZpbmVkIGluIHRoZSBiYXNlIGZlYXR1cmUgb2JqZWN0XCI7fSxcblx0dXBkYXRlciAgOiBmdW5jdGlvbiAoKSB7fSxcblx0b25fY2xpY2sgOiBmdW5jdGlvbiAoKSB7fSxcblx0b25fbW91c2VvdmVyIDogZnVuY3Rpb24gKCkge30sXG5cdGd1aWRlciAgIDogZnVuY3Rpb24gKCkge30sXG5cdGluZGV4ICAgIDogdW5kZWZpbmVkLFxuXHRsYXlvdXQgICA6IGxheW91dC5pZGVudGl0eSgpLFxuXHRmb3JlZ3JvdW5kX2NvbG9yIDogJyMwMDAnXG4gICAgfTtcblxuXG4gICAgLy8gVGhlIHJldHVybmVkIG9iamVjdFxuICAgIHZhciBmZWF0dXJlID0ge307XG5cbiAgICB2YXIgcmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0dHJhY2suZy5zZWxlY3RBbGwoXCIudG50X2VsZW1cIikucmVtb3ZlKCk7XG5cdHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRudF9ndWlkZXJcIikucmVtb3ZlKCk7XG4gICAgfTtcblxuICAgIHZhciBpbml0ID0gZnVuY3Rpb24gKHdpZHRoKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdGV4cG9ydHMuZ3VpZGVyLmNhbGwodHJhY2ssIHdpZHRoKTtcbiAgICB9O1xuXG4gICAgdmFyIHBsb3QgPSBmdW5jdGlvbiAobmV3X2VsZW1zLCB0cmFjaywgeFNjYWxlKSB7XG5cdG5ld19lbGVtcy5vbihcImNsaWNrXCIsIGV4cG9ydHMub25fY2xpY2spO1xuXHRuZXdfZWxlbXMub24oXCJtb3VzZW92ZXJcIiwgZXhwb3J0cy5vbl9tb3VzZW92ZXIpO1xuXHQvLyBuZXdfZWxlbSBpcyBhIGcgZWxlbWVudCB3aGVyZSB0aGUgZmVhdHVyZSBpcyBpbnNlcnRlZFxuXHRleHBvcnRzLmNyZWF0ZS5jYWxsKHRyYWNrLCBuZXdfZWxlbXMsIHhTY2FsZSk7XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGUgPSBmdW5jdGlvbiAoeFNjYWxlLCBmaWVsZCkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHR2YXIgc3ZnX2cgPSB0cmFjay5nO1xuXHR2YXIgbGF5b3V0ID0gZXhwb3J0cy5sYXlvdXQ7XG5cblx0dmFyIGVsZW1lbnRzID0gdHJhY2suZGF0YSgpLmVsZW1lbnRzKCk7XG5cblx0aWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIGVsZW1lbnRzID0gZWxlbWVudHNbZmllbGRdO1xuXHR9XG5cblx0bGF5b3V0KGVsZW1lbnRzLCB4U2NhbGUpO1xuXHR2YXIgZGF0YV9lbGVtcyA9IGxheW91dC5lbGVtZW50cygpO1xuXG5cdHZhciB2aXNfc2VsO1xuXHR2YXIgdmlzX2VsZW1zO1xuXHRpZiAoZmllbGQgIT09IHVuZGVmaW5lZCkge1xuXHQgICAgdmlzX3NlbCA9IHN2Z19nLnNlbGVjdEFsbChcIi50bnRfZWxlbV9cIiArIGZpZWxkKTtcblx0fSBlbHNlIHtcblx0ICAgIHZpc19zZWwgPSBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1cIik7XG5cdH1cblxuXHRpZiAoZXhwb3J0cy5pbmRleCkgeyAvLyBJbmRleGluZyBieSBmaWVsZFxuXHQgICAgdmlzX2VsZW1zID0gdmlzX3NlbFxuXHRcdC5kYXRhKGRhdGFfZWxlbXMsIGZ1bmN0aW9uIChkKSB7XG5cdFx0ICAgIGlmIChkICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybiBleHBvcnRzLmluZGV4KGQpO1xuXHRcdCAgICB9XG5cdFx0fSk7XG5cdH0gZWxzZSB7IC8vIEluZGV4aW5nIGJ5IHBvc2l0aW9uIGluIGFycmF5XG5cdCAgICB2aXNfZWxlbXMgPSB2aXNfc2VsXG5cdFx0LmRhdGEoZGF0YV9lbGVtcyk7XG5cdH1cblxuXHRleHBvcnRzLnVwZGF0ZXIuY2FsbCh0cmFjaywgdmlzX2VsZW1zLCB4U2NhbGUpO1xuXG5cdHZhciBuZXdfZWxlbSA9IHZpc19lbGVtc1xuXHQgICAgLmVudGVyKCk7XG5cblx0bmV3X2VsZW1cblx0ICAgIC5hcHBlbmQoXCJnXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2VsZW1cIilcblx0ICAgIC5jbGFzc2VkKFwidG50X2VsZW1fXCIgKyBmaWVsZCwgZmllbGQpXG5cdCAgICAuY2FsbChmZWF0dXJlLnBsb3QsIHRyYWNrLCB4U2NhbGUpO1xuXG5cdHZpc19lbGVtc1xuXHQgICAgLmV4aXQoKVxuXHQgICAgLnJlbW92ZSgpO1xuICAgIH07XG5cbiAgICB2YXIgbW92ZSA9IGZ1bmN0aW9uICh4U2NhbGUsIGZpZWxkKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdHZhciBzdmdfZyA9IHRyYWNrLmc7XG5cdHZhciBlbGVtcztcblx0Ly8gVE9ETzogSXMgc2VsZWN0aW5nIHRoZSBlbGVtZW50cyB0byBtb3ZlIHRvbyBzbG93P1xuXHQvLyBJdCB3b3VsZCBiZSBuaWNlIHRvIHByb2ZpbGVcblx0aWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIGVsZW1zID0gc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtX1wiICsgZmllbGQpO1xuXHR9IGVsc2Uge1xuXHQgICAgZWxlbXMgPSBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1cIik7XG5cdH1cblxuXHRleHBvcnRzLm1vdmVyLmNhbGwodGhpcywgZWxlbXMsIHhTY2FsZSk7XG4gICAgfTtcblxuICAgIHZhciBtdGYgPSBmdW5jdGlvbiAoZWxlbSkge1xuXHRlbGVtLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgbW92ZV90b19mcm9udCA9IGZ1bmN0aW9uIChmaWVsZCkge1xuXHRpZiAoZmllbGQgIT09IHVuZGVmaW5lZCkge1xuXHQgICAgdmFyIHRyYWNrID0gdGhpcztcblx0ICAgIHZhciBzdmdfZyA9IHRyYWNrLmc7XG5cdCAgICBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1fXCIgKyBmaWVsZClcblx0ICAgICAgICAuZWFjaCggZnVuY3Rpb24gKCkge1xuXHRcdCAgICBtdGYodGhpcyk7XG5cdFx0fSk7XG5cdH1cbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgYXBpanMgKGZlYXR1cmUpXG5cdC5nZXRzZXQgKGV4cG9ydHMpXG5cdC5tZXRob2QgKHtcblx0ICAgIHJlc2V0ICA6IHJlc2V0LFxuXHQgICAgcGxvdCAgIDogcGxvdCxcblx0ICAgIHVwZGF0ZSA6IHVwZGF0ZSxcblx0ICAgIG1vdmUgICA6IG1vdmUsXG5cdCAgICBpbml0ICAgOiBpbml0LFxuXHQgICAgbW92ZV90b19mcm9udCA6IG1vdmVfdG9fZnJvbnRcblx0fSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLmNvbXBvc2l0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGlzcGxheXMgPSB7fTtcbiAgICB2YXIgZGlzcGxheV9vcmRlciA9IFtdO1xuXG4gICAgdmFyIGZlYXR1cmVzID0ge307XG5cbiAgICB2YXIgcmVzZXQgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdGZvciAodmFyIGk9MDsgaTxkaXNwbGF5cy5sZW5ndGg7IGkrKykge1xuXHQgICAgZGlzcGxheXNbaV0ucmVzZXQuY2FsbCh0cmFjayk7XG5cdH1cbiAgICB9O1xuXG4gICAgdmFyIGluaXQgPSBmdW5jdGlvbiAod2lkdGgpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcbiBcdGZvciAodmFyIGRpc3BsYXkgaW4gZGlzcGxheXMpIHtcblx0ICAgIGlmIChkaXNwbGF5cy5oYXNPd25Qcm9wZXJ0eShkaXNwbGF5KSkge1xuXHRcdGRpc3BsYXlzW2Rpc3BsYXldLmluaXQuY2FsbCh0cmFjaywgd2lkdGgpO1xuXHQgICAgfVxuXHR9XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGUgPSBmdW5jdGlvbiAoeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdGZvciAodmFyIGk9MDsgaTxkaXNwbGF5X29yZGVyLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBkaXNwbGF5c1tkaXNwbGF5X29yZGVyW2ldXS51cGRhdGUuY2FsbCh0cmFjaywgeFNjYWxlLCBkaXNwbGF5X29yZGVyW2ldKTtcblx0ICAgIGRpc3BsYXlzW2Rpc3BsYXlfb3JkZXJbaV1dLm1vdmVfdG9fZnJvbnQuY2FsbCh0cmFjaywgZGlzcGxheV9vcmRlcltpXSk7XG5cdH1cblx0Ly8gZm9yICh2YXIgZGlzcGxheSBpbiBkaXNwbGF5cykge1xuXHQvLyAgICAgaWYgKGRpc3BsYXlzLmhhc093blByb3BlcnR5KGRpc3BsYXkpKSB7XG5cdC8vIFx0ZGlzcGxheXNbZGlzcGxheV0udXBkYXRlLmNhbGwodHJhY2ssIHhTY2FsZSwgZGlzcGxheSk7XG5cdC8vICAgICB9XG5cdC8vIH1cbiAgICB9O1xuXG4gICAgdmFyIG1vdmUgPSBmdW5jdGlvbiAoeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdGZvciAodmFyIGRpc3BsYXkgaW4gZGlzcGxheXMpIHtcblx0ICAgIGlmIChkaXNwbGF5cy5oYXNPd25Qcm9wZXJ0eShkaXNwbGF5KSkge1xuXHRcdGRpc3BsYXlzW2Rpc3BsYXldLm1vdmUuY2FsbCh0cmFjaywgeFNjYWxlLCBkaXNwbGF5KTtcblx0ICAgIH1cblx0fVxuICAgIH07XG5cbiAgICB2YXIgYWRkID0gZnVuY3Rpb24gKGtleSwgZGlzcGxheSkge1xuXHRkaXNwbGF5c1trZXldID0gZGlzcGxheTtcblx0ZGlzcGxheV9vcmRlci5wdXNoKGtleSk7XG5cdHJldHVybiBmZWF0dXJlcztcbiAgICB9O1xuXG4gICAgdmFyIG9uX2NsaWNrID0gZnVuY3Rpb24gKGNiYWspIHtcblx0Zm9yICh2YXIgZGlzcGxheSBpbiBkaXNwbGF5cykge1xuXHQgICAgaWYgKGRpc3BsYXlzLmhhc093blByb3BlcnR5KGRpc3BsYXkpKSB7XG5cdFx0ZGlzcGxheXNbZGlzcGxheV0ub25fY2xpY2soY2Jhayk7XG5cdCAgICB9XG5cdH1cblx0cmV0dXJuIGZlYXR1cmVzO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0X2Rpc3BsYXlzID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgZHMgPSBbXTtcblx0Zm9yICh2YXIgaT0wOyBpPGRpc3BsYXlfb3JkZXIubGVuZ3RoOyBpKyspIHtcblx0ICAgIGRzLnB1c2goZGlzcGxheXNbZGlzcGxheV9vcmRlcltpXV0pO1xuXHR9XG5cdHJldHVybiBkcztcbiAgICB9O1xuICAgIFxuICAgIC8vIEFQSVxuICAgIGFwaWpzIChmZWF0dXJlcylcblx0Lm1ldGhvZCAoe1xuXHQgICAgcmVzZXQgIDogcmVzZXQsXG5cdCAgICB1cGRhdGUgOiB1cGRhdGUsXG5cdCAgICBtb3ZlICAgOiBtb3ZlLFxuXHQgICAgaW5pdCAgIDogaW5pdCxcblx0ICAgIGFkZCAgICA6IGFkZCxcblx0ICAgIG9uX2NsaWNrIDogb25fY2xpY2ssXG5cdCAgICBkaXNwbGF5cyA6IGdldF9kaXNwbGF5c1xuXHR9KTtcblxuICAgIHJldHVybiBmZWF0dXJlcztcbn07XG5cbnRudF9mZWF0dXJlLnNlcXVlbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vICdJbmhlcml0JyBmcm9tIHRudC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgdmFyIGNvbmZpZyA9IHtcblx0Zm9udHNpemUgOiAxMCxcblx0c2VxdWVuY2UgOiBmdW5jdGlvbiAoZCkge1xuXHQgICAgcmV0dXJuIGQuc2VxdWVuY2U7XG5cdH1cbiAgICB9O1xuXG4gICAgdmFyIGFwaSA9IGFwaWpzIChmZWF0dXJlKVxuXHQuZ2V0c2V0IChjb25maWcpO1xuXG5cbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKG5ld19udHMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG5cdG5ld19udHNcblx0ICAgIC5hcHBlbmQoXCJ0ZXh0XCIpXG5cdCAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuXHQgICAgLnN0eWxlKCdmb250LXNpemUnLCBjb25maWcuZm9udHNpemUgKyBcInB4XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlIChkLnBvcyk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIH5+KHRyYWNrLmhlaWdodCgpIC8gMikgKyA1OyBcblx0ICAgIH0pXG5cdCAgICAudGV4dChjb25maWcuc2VxdWVuY2UpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoJ2ZpbGwnLCBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmVyIChmdW5jdGlvbiAobnRzLCB4U2NhbGUpIHtcblx0bnRzLnNlbGVjdCAoXCJ0ZXh0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQucG9zKTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5hcmVhID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBmZWF0dXJlID0gdG50X2ZlYXR1cmUubGluZSgpO1xuICAgIHZhciBsaW5lID0gdG50X2ZlYXR1cmUubGluZSgpO1xuXG4gICAgdmFyIGFyZWEgPSBkMy5zdmcuYXJlYSgpXG5cdC5pbnRlcnBvbGF0ZShsaW5lLmludGVycG9sYXRlKCkpXG5cdC50ZW5zaW9uKGZlYXR1cmUudGVuc2lvbigpKTtcblxuICAgIHZhciBkYXRhX3BvaW50cztcblxuICAgIHZhciBsaW5lX2NyZWF0ZSA9IGZlYXR1cmUuY3JlYXRlKCk7IC8vIFdlICdzYXZlJyBsaW5lIGNyZWF0aW9uXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChwb2ludHMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG5cdGlmIChkYXRhX3BvaW50cyAhPT0gdW5kZWZpbmVkKSB7XG4vL1x0ICAgICByZXR1cm47XG5cdCAgICB0cmFjay5nLnNlbGVjdChcInBhdGhcIikucmVtb3ZlKCk7XG5cdH1cblxuXHRsaW5lX2NyZWF0ZS5jYWxsKHRyYWNrLCBwb2ludHMsIHhTY2FsZSk7XG5cblx0YXJlYVxuXHQgICAgLngobGluZS54KCkpXG5cdCAgICAueTEobGluZS55KCkpXG5cdCAgICAueTAodHJhY2suaGVpZ2h0KCkpO1xuXG5cdGRhdGFfcG9pbnRzID0gcG9pbnRzLmRhdGEoKTtcblx0cG9pbnRzLnJlbW92ZSgpO1xuXG5cdHRyYWNrLmdcblx0ICAgIC5hcHBlbmQoXCJwYXRoXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2FyZWFcIilcblx0ICAgIC5jbGFzc2VkKFwidG50X2VsZW1cIiwgdHJ1ZSlcblx0ICAgIC5kYXR1bShkYXRhX3BvaW50cylcblx0ICAgIC5hdHRyKFwiZFwiLCBhcmVhKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGQzLnJnYihmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSkuYnJpZ2h0ZXIoKSk7XG5cdFxuICAgIH0pO1xuXG4gICAgdmFyIGxpbmVfbW92ZXIgPSBmZWF0dXJlLm1vdmVyKCk7XG4gICAgZmVhdHVyZS5tb3ZlciAoZnVuY3Rpb24gKHBhdGgsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRsaW5lX21vdmVyLmNhbGwodHJhY2ssIHBhdGgsIHhTY2FsZSk7XG5cblx0YXJlYS54KGxpbmUueCgpKTtcblx0dHJhY2suZ1xuXHQgICAgLnNlbGVjdChcIi50bnRfYXJlYVwiKVxuXHQgICAgLmRhdHVtKGRhdGFfcG9pbnRzKVxuXHQgICAgLmF0dHIoXCJkXCIsIGFyZWEpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG5cbn07XG5cbnRudF9mZWF0dXJlLmxpbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgdmFyIHggPSBmdW5jdGlvbiAoZCkge1xuXHRyZXR1cm4gZC5wb3M7XG4gICAgfTtcbiAgICB2YXIgeSA9IGZ1bmN0aW9uIChkKSB7XG5cdHJldHVybiBkLnZhbDtcbiAgICB9O1xuICAgIHZhciB0ZW5zaW9uID0gMC43O1xuICAgIHZhciB5U2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKTtcbiAgICB2YXIgbGluZSA9IGQzLnN2Zy5saW5lKClcblx0LmludGVycG9sYXRlKFwiYmFzaXNcIik7XG5cbiAgICAvLyBsaW5lIGdldHRlci4gVE9ETzogU2V0dGVyP1xuICAgIGZlYXR1cmUubGluZSA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIGxpbmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUueCA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHg7XG5cdH1cblx0eCA9IGNiYWs7XG5cdHJldHVybiBmZWF0dXJlO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLnkgPSBmdW5jdGlvbiAoY2Jhaykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB5O1xuXHR9XG5cdHkgPSBjYmFrO1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS50ZW5zaW9uID0gZnVuY3Rpb24gKHQpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gdGVuc2lvbjtcblx0fVxuXHR0ZW5zaW9uID0gdDtcblx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIHZhciBkYXRhX3BvaW50cztcblxuICAgIC8vIEZvciBub3csIGNyZWF0ZSBpcyBhIG9uZS1vZmYgZXZlbnRcbiAgICAvLyBUT0RPOiBNYWtlIGl0IHdvcmsgd2l0aCBwYXJ0aWFsIHBhdGhzLCBpZS4gY3JlYXRpbmcgYW5kIGRpc3BsYXlpbmcgb25seSB0aGUgcGF0aCB0aGF0IGlzIGJlaW5nIGRpc3BsYXllZFxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAocG9pbnRzLCB4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblxuXHRpZiAoZGF0YV9wb2ludHMgIT09IHVuZGVmaW5lZCkge1xuXHQgICAgLy8gcmV0dXJuO1xuXHQgICAgdHJhY2suZy5zZWxlY3QoXCJwYXRoXCIpLnJlbW92ZSgpO1xuXHR9XG5cblx0bGluZVxuXHQgICAgLnRlbnNpb24odGVuc2lvbilcblx0ICAgIC54KGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZSh4KGQpKTtcblx0ICAgIH0pXG5cdCAgICAueShmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiB0cmFjay5oZWlnaHQoKSAtIHlTY2FsZSh5KGQpKTtcblx0ICAgIH0pXG5cblx0ZGF0YV9wb2ludHMgPSBwb2ludHMuZGF0YSgpO1xuXHRwb2ludHMucmVtb3ZlKCk7XG5cblx0eVNjYWxlXG5cdCAgICAuZG9tYWluKFswLCAxXSlcblx0ICAgIC8vIC5kb21haW4oWzAsIGQzLm1heChkYXRhX3BvaW50cywgZnVuY3Rpb24gKGQpIHtcblx0ICAgIC8vIFx0cmV0dXJuIHkoZCk7XG5cdCAgICAvLyB9KV0pXG5cdCAgICAucmFuZ2UoWzAsIHRyYWNrLmhlaWdodCgpIC0gMl0pO1xuXHRcblx0dHJhY2suZ1xuXHQgICAgLmFwcGVuZChcInBhdGhcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZWxlbVwiKVxuXHQgICAgLmF0dHIoXCJkXCIsIGxpbmUoZGF0YV9wb2ludHMpKVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlXCIsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIDQpXG5cdCAgICAuc3R5bGUoXCJmaWxsXCIsIFwibm9uZVwiKTtcblxuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlciAoZnVuY3Rpb24gKHBhdGgsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG5cdGxpbmUueChmdW5jdGlvbiAoZCkge1xuXHQgICAgcmV0dXJuIHhTY2FsZSh4KGQpKVxuXHR9KTtcblx0dHJhY2suZy5zZWxlY3QoXCJwYXRoXCIpXG5cdCAgICAuYXR0cihcImRcIiwgbGluZShkYXRhX3BvaW50cykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5jb25zZXJ2YXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gJ0luaGVyaXQnIGZyb20gZmVhdHVyZS5hcmVhXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZS5hcmVhKCk7XG5cbiAgICB2YXIgYXJlYV9jcmVhdGUgPSBmZWF0dXJlLmNyZWF0ZSgpOyAvLyBXZSAnc2F2ZScgYXJlYSBjcmVhdGlvblxuICAgIGZlYXR1cmUuY3JlYXRlICAoZnVuY3Rpb24gKHBvaW50cywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0YXJlYV9jcmVhdGUuY2FsbCh0cmFjaywgZDMuc2VsZWN0KHBvaW50c1swXVswXSksIHhTY2FsZSlcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudG50X2ZlYXR1cmUuZW5zZW1ibCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBib2FyZC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgdmFyIGZvcmVncm91bmRfY29sb3IyID0gXCIjN0ZGRjAwXCI7XG4gICAgdmFyIGZvcmVncm91bmRfY29sb3IzID0gXCIjMDBCQjAwXCI7XG5cbiAgICBmZWF0dXJlLmd1aWRlciAoZnVuY3Rpb24gKHdpZHRoKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdHZhciBoZWlnaHRfb2Zmc2V0ID0gfn4odHJhY2suaGVpZ2h0KCkgLSAodHJhY2suaGVpZ2h0KCkgICogMC44KSkgLyAyO1xuXG5cdHRyYWNrLmdcblx0ICAgIC5hcHBlbmQoXCJsaW5lXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2d1aWRlclwiKVxuXHQgICAgLmF0dHIoXCJ4MVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ4MlwiLCB3aWR0aClcblx0ICAgIC5hdHRyKFwieTFcIiwgaGVpZ2h0X29mZnNldClcblx0ICAgIC5hdHRyKFwieTJcIiwgaGVpZ2h0X29mZnNldClcblx0ICAgIC5zdHlsZShcInN0cm9rZVwiLCBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSlcblx0ICAgIC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCAxKTtcblxuXHR0cmFjay5nXG5cdCAgICAuYXBwZW5kKFwibGluZVwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9ndWlkZXJcIilcblx0ICAgIC5hdHRyKFwieDFcIiwgMClcblx0ICAgIC5hdHRyKFwieDJcIiwgd2lkdGgpXG5cdCAgICAuYXR0cihcInkxXCIsIHRyYWNrLmhlaWdodCgpIC0gaGVpZ2h0X29mZnNldClcblx0ICAgIC5hdHRyKFwieTJcIiwgdHJhY2suaGVpZ2h0KCkgLSBoZWlnaHRfb2Zmc2V0KVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlXCIsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIDEpO1xuXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKG5ld19lbGVtcywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0dmFyIGhlaWdodF9vZmZzZXQgPSB+fih0cmFjay5oZWlnaHQoKSAtICh0cmFjay5oZWlnaHQoKSAgKiAwLjgpKSAvIDI7XG5cblx0bmV3X2VsZW1zXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZSAoZC5zdGFydCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ5XCIsIGhlaWdodF9vZmZzZXQpXG4vLyBcdCAgICAuYXR0cihcInJ4XCIsIDMpXG4vLyBcdCAgICAuYXR0cihcInJ5XCIsIDMpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSAtIH5+KGhlaWdodF9vZmZzZXQgKiAyKSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7IFxuXHRcdGlmIChkLnR5cGUgPT09ICdoaWdoJykge1xuXHRcdCAgICByZXR1cm4gZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKTtcblx0XHR9XG5cdFx0aWYgKGQudHlwZSA9PT0gJ2xvdycpIHtcblx0XHQgICAgcmV0dXJuIGQzLnJnYihmZWF0dXJlLmZvcmVncm91bmRfY29sb3IyKCkpO1xuXHRcdH1cblx0XHRyZXR1cm4gZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcjMoKSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUudXBkYXRlciAoZnVuY3Rpb24gKGJsb2NrcywgeFNjYWxlKSB7XG5cdGJsb2Nrc1xuXHQgICAgLnNlbGVjdChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpXG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uIChibG9ja3MsIHhTY2FsZSkge1xuXHRibG9ja3Ncblx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IyID0gZnVuY3Rpb24gKGNvbCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBmb3JlZ3JvdW5kX2NvbG9yMjtcblx0fVxuXHRmb3JlZ3JvdW5kX2NvbG9yMiA9IGNvbDtcblx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcjMgPSBmdW5jdGlvbiAoY29sKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGZvcmVncm91bmRfY29sb3IzO1xuXHR9XG5cdGZvcmVncm91bmRfY29sb3IzID0gY29sO1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS52bGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBmZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRuZXdfZWxlbXNcblx0ICAgIC5hcHBlbmQgKFwibGluZVwiKVxuXHQgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdC8vIFRPRE86IFNob3VsZCB1c2UgdGhlIGluZGV4IHZhbHVlP1xuXHRcdHJldHVybiB4U2NhbGUoZmVhdHVyZS5pbmRleCgpKGQpKVxuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSlcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInkxXCIsIDApXG5cdCAgICAuYXR0cihcInkyXCIsIHRyYWNrLmhlaWdodCgpKVxuXHQgICAgLmF0dHIoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAxKTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uICh2bGluZXMsIHhTY2FsZSkge1xuXHR2bGluZXNcblx0ICAgIC5zZWxlY3QoXCJsaW5lXCIpXG5cdCAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShmZWF0dXJlLmluZGV4KCkoZCkpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xuXG59O1xuXG50bnRfZmVhdHVyZS5ibG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBib2FyZC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgYXBpanMoZmVhdHVyZSlcblx0LmdldHNldCgnZnJvbScsIGZ1bmN0aW9uIChkKSB7XG5cdCAgICByZXR1cm4gZC5zdGFydDtcblx0fSlcblx0LmdldHNldCgndG8nLCBmdW5jdGlvbiAoZCkge1xuXHQgICAgcmV0dXJuIGQuZW5kO1xuXHR9KTtcblxuICAgIGZlYXR1cmUuY3JlYXRlKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRuZXdfZWxlbXNcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQsIGkpIHtcblx0XHQvLyBUT0RPOiBzdGFydCwgZW5kIHNob3VsZCBiZSBhZGp1c3RhYmxlIHZpYSB0aGUgdHJhY2tzIEFQSVxuXHRcdHJldHVybiB4U2NhbGUoZmVhdHVyZS5mcm9tKCkoZCwgaSkpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuXHRcdHJldHVybiAoeFNjYWxlKGZlYXR1cmUudG8oKShkLCBpKSkgLSB4U2NhbGUoZmVhdHVyZS5mcm9tKCkoZCwgaSkpKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0aWYgKGQuY29sb3IgPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICByZXR1cm4gZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCk7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgcmV0dXJuIGQuY29sb3I7XG5cdFx0fVxuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLnVwZGF0ZXIoZnVuY3Rpb24gKGVsZW1zLCB4U2NhbGUpIHtcblx0ZWxlbXNcblx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlcihmdW5jdGlvbiAoYmxvY2tzLCB4U2NhbGUpIHtcblx0YmxvY2tzXG5cdCAgICAuc2VsZWN0KFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG5cbn07XG5cbnRudF9mZWF0dXJlLmF4aXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHhBeGlzO1xuICAgIHZhciBvcmllbnRhdGlvbiA9IFwidG9wXCI7XG5cbiAgICAvLyBBeGlzIGRvZXNuJ3QgaW5oZXJpdCBmcm9tIGZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IHt9O1xuICAgIGZlYXR1cmUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG5cdHhBeGlzID0gdW5kZWZpbmVkO1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHR0cmFjay5nLnNlbGVjdEFsbChcInJlY3RcIikucmVtb3ZlKCk7XG5cdHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRpY2tcIikucmVtb3ZlKCk7XG4gICAgfTtcbiAgICBmZWF0dXJlLnBsb3QgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICBmZWF0dXJlLm1vdmUgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdHZhciBzdmdfZyA9IHRyYWNrLmc7XG5cdHN2Z19nLmNhbGwoeEF4aXMpO1xuICAgIH1cbiAgICBcbiAgICBmZWF0dXJlLmluaXQgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIGZlYXR1cmUudXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSkge1xuXHQvLyBDcmVhdGUgQXhpcyBpZiBpdCBkb2Vzbid0IGV4aXN0XG5cdGlmICh4QXhpcyA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICB4QXhpcyA9IGQzLnN2Zy5heGlzKClcblx0XHQuc2NhbGUoeFNjYWxlKVxuXHRcdC5vcmllbnQob3JpZW50YXRpb24pO1xuXHR9XG5cblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIHN2Z19nID0gdHJhY2suZztcblx0c3ZnX2cuY2FsbCh4QXhpcyk7XG4gICAgfTtcblxuICAgIGZlYXR1cmUub3JpZW50YXRpb24gPSBmdW5jdGlvbiAocG9zKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIG9yaWVudGF0aW9uO1xuXHR9XG5cdG9yaWVudGF0aW9uID0gcG9zO1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5sb2NhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcm93O1xuXG4gICAgdmFyIGZlYXR1cmUgPSB7fTtcbiAgICBmZWF0dXJlLnJlc2V0ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5wbG90ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5pbml0ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5tb3ZlID0gZnVuY3Rpb24oeFNjYWxlKSB7XG5cdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG5cdHJvdy5zZWxlY3QoXCJ0ZXh0XCIpXG5cdCAgICAudGV4dChcIkxvY2F0aW9uOiBcIiArIH5+ZG9tYWluWzBdICsgXCItXCIgKyB+fmRvbWFpblsxXSk7XG4gICAgfTtcblxuICAgIGZlYXR1cmUudXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHR2YXIgc3ZnX2cgPSB0cmFjay5nO1xuXHR2YXIgZG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuXHRpZiAocm93ID09PSB1bmRlZmluZWQpIHtcblx0ICAgIHJvdyA9IHN2Z19nO1xuXHQgICAgcm93XG5cdFx0LmFwcGVuZChcInRleHRcIilcblx0XHQudGV4dChcIkxvY2F0aW9uOiBcIiArIH5+ZG9tYWluWzBdICsgXCItXCIgKyB+fmRvbWFpblsxXSk7XG5cdH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfZmVhdHVyZTtcbiIsInZhciBib2FyZCA9IHJlcXVpcmUgKFwiLi9ib2FyZC5qc1wiKTtcbmJvYXJkLnRyYWNrID0gcmVxdWlyZSAoXCIuL3RyYWNrXCIpO1xuYm9hcmQudHJhY2suZGF0YSA9IHJlcXVpcmUgKFwiLi9kYXRhLmpzXCIpO1xuYm9hcmQudHJhY2subGF5b3V0ID0gcmVxdWlyZSAoXCIuL2xheW91dC5qc1wiKTtcbmJvYXJkLnRyYWNrLmZlYXR1cmUgPSByZXF1aXJlIChcIi4vZmVhdHVyZS5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gYm9hcmQ7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG5cbi8vIHZhciBib2FyZCA9IHt9O1xuLy8gYm9hcmQudHJhY2sgPSB7fTtcbmxheW91dCA9IHt9O1xuXG5sYXlvdXQuaWRlbnRpdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gdmFycyBleHBvc2VkIGluIHRoZSBBUEk6XG4gICAgdmFyIGVsZW1lbnRzO1xuXG4gICAgLy8gVGhlIHJldHVybmVkIGNsb3N1cmUgLyBvYmplY3RcbiAgICB2YXIgbCA9IGZ1bmN0aW9uIChuZXdfZWxlbWVudHMpIHtcblx0ZWxlbWVudHMgPSBuZXdfZWxlbWVudHM7XG4gICAgfVxuXG4gICAgdmFyIGFwaSA9IGFwaWpzIChsKVxuXHQubWV0aG9kICh7XG5cdCAgICBoZWlnaHQgICA6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgZWxlbWVudHMgOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIGVsZW1lbnRzO1xuXHQgICAgfVxuXHR9KTtcblxuICAgIHJldHVybiBsO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gbGF5b3V0O1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGl0ZXJhdG9yID0gcmVxdWlyZShcInRudC51dGlsc1wiKS5pdGVyYXRvcjtcblxuLy92YXIgYm9hcmQgPSB7fTtcblxudmFyIHRyYWNrID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIHJlYWRfY29uZiA9IHtcblx0Ly8gVW5pcXVlIElEIGZvciB0aGlzIHRyYWNrXG5cdGlkIDogdHJhY2suaWQoKVxuICAgIH07XG5cbiAgICB2YXIgZGlzcGxheTtcblxuICAgIHZhciBjb25mID0ge1xuXHQvLyBmb3JlZ3JvdW5kX2NvbG9yIDogZDMucmdiKCcjMDAwMDAwJyksXG5cdGJhY2tncm91bmRfY29sb3IgOiBkMy5yZ2IoJyNDQ0NDQ0MnKSxcblx0aGVpZ2h0ICAgICAgICAgICA6IDI1MCxcblx0Ly8gZGF0YSBpcyB0aGUgb2JqZWN0IChub3JtYWxseSBhIHRudC50cmFjay5kYXRhIG9iamVjdCkgdXNlZCB0byByZXRyaWV2ZSBhbmQgdXBkYXRlIGRhdGEgZm9yIHRoZSB0cmFja1xuXHRkYXRhICAgICAgICAgICAgIDogdHJhY2suZGF0YS5lbXB0eSgpXG4gICAgfTtcblxuICAgIC8vIFRoZSByZXR1cm5lZCBvYmplY3QgLyBjbG9zdXJlXG4gICAgdmFyIF8gPSBmdW5jdGlvbigpIHtcbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzIChfKVxuXHQuZ2V0c2V0IChjb25mKVxuXHQuZ2V0IChyZWFkX2NvbmYpO1xuXG4gICAgLy8gVE9ETzogVGhpcyBtZWFucyB0aGF0IGhlaWdodCBzaG91bGQgYmUgZGVmaW5lZCBiZWZvcmUgZGlzcGxheVxuICAgIC8vIHdlIHNob3VsZG4ndCByZWx5IG9uIHRoaXNcbiAgICBfLmRpc3BsYXkgPSBmdW5jdGlvbiAobmV3X3Bsb3R0ZXIpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gZGlzcGxheTtcblx0fVxuXHRkaXNwbGF5ID0gbmV3X3Bsb3R0ZXI7XG5cdGlmICh0eXBlb2YgKGRpc3BsYXkpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBkaXNwbGF5LmxheW91dCAmJiBkaXNwbGF5LmxheW91dCgpLmhlaWdodChjb25mLmhlaWdodCk7XHQgICAgXG5cdH0gZWxzZSB7XG5cdCAgICBmb3IgKHZhciBrZXkgaW4gZGlzcGxheSkge1xuXHRcdGlmIChkaXNwbGF5Lmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHQgICAgZGlzcGxheVtrZXldLmxheW91dCAmJiBkaXNwbGF5W2tleV0ubGF5b3V0KCkuaGVpZ2h0KGNvbmYuaGVpZ2h0KTtcblx0XHR9XG5cdCAgICB9XG5cdH1cblxuXHRyZXR1cm4gXztcbiAgICB9O1xuXG4gICAgcmV0dXJuIF87XG5cbn07XG5cbnRyYWNrLmlkID0gaXRlcmF0b3IoMSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRyYWNrO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB0bnRfZW5zZW1ibCA9IHJlcXVpcmUoXCIuL3NyYy9yZXN0LmpzXCIpO1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vamFrZWFyY2hpYmFsZC9lczYtcHJvbWlzZS9tYXN0ZXIvTElDRU5TRVxuICogQHZlcnNpb24gICAyLjEuMVxuICovXG5cbihmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkdXRpbHMkJG9iamVjdE9yRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nIHx8ICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgeCAhPT0gbnVsbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0Z1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzTWF5YmVUaGVuYWJsZSh4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkX2lzQXJyYXk7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkdXRpbHMkJF9pc0FycmF5ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuICAgIH1cblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzQXJyYXkgPSBsaWIkZXM2JHByb21pc2UkdXRpbHMkJF9pc0FycmF5O1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkbGVuID0gMDtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJHRvU3RyaW5nID0ge30udG9TdHJpbmc7XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR2ZXJ0eE5leHQ7XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJGFzYXAoY2FsbGJhY2ssIGFyZykge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHF1ZXVlW2xpYiRlczYkcHJvbWlzZSRhc2FwJCRsZW5dID0gY2FsbGJhY2s7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWVbbGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbiArIDFdID0gYXJnO1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbiArPSAyO1xuICAgICAgaWYgKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRsZW4gPT09IDIpIHtcbiAgICAgICAgLy8gSWYgbGVuIGlzIDIsIHRoYXQgbWVhbnMgdGhhdCB3ZSBuZWVkIHRvIHNjaGVkdWxlIGFuIGFzeW5jIGZsdXNoLlxuICAgICAgICAvLyBJZiBhZGRpdGlvbmFsIGNhbGxiYWNrcyBhcmUgcXVldWVkIGJlZm9yZSB0aGUgcXVldWUgaXMgZmx1c2hlZCwgdGhleVxuICAgICAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRkZWZhdWx0ID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJGFzYXA7XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJGJyb3dzZXJXaW5kb3cgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpID8gd2luZG93IDogdW5kZWZpbmVkO1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkYnJvd3Nlckdsb2JhbCA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRicm93c2VyV2luZG93IHx8IHt9O1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRpc05vZGUgPSB0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYge30udG9TdHJpbmcuY2FsbChwcm9jZXNzKSA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nO1xuXG4gICAgLy8gdGVzdCBmb3Igd2ViIHdvcmtlciBidXQgbm90IGluIElFMTBcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJGlzV29ya2VyID0gdHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIGltcG9ydFNjcmlwdHMgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09ICd1bmRlZmluZWQnO1xuXG4gICAgLy8gbm9kZVxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VOZXh0VGljaygpIHtcbiAgICAgIHZhciBuZXh0VGljayA9IHByb2Nlc3MubmV4dFRpY2s7XG4gICAgICAvLyBub2RlIHZlcnNpb24gMC4xMC54IGRpc3BsYXlzIGEgZGVwcmVjYXRpb24gd2FybmluZyB3aGVuIG5leHRUaWNrIGlzIHVzZWQgcmVjdXJzaXZlbHlcbiAgICAgIC8vIHNldEltbWVkaWF0ZSBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkIGluc3RlYWRcbiAgICAgIHZhciB2ZXJzaW9uID0gcHJvY2Vzcy52ZXJzaW9ucy5ub2RlLm1hdGNoKC9eKD86KFxcZCspXFwuKT8oPzooXFxkKylcXC4pPyhcXCp8XFxkKykkLyk7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2ZXJzaW9uKSAmJiB2ZXJzaW9uWzFdID09PSAnMCcgJiYgdmVyc2lvblsyXSA9PT0gJzEwJykge1xuICAgICAgICBuZXh0VGljayA9IHNldEltbWVkaWF0ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgbmV4dFRpY2sobGliJGVzNiRwcm9taXNlJGFzYXAkJGZsdXNoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gdmVydHhcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlVmVydHhUaW1lcigpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHZlcnR4TmV4dChsaWIkZXM2JHByb21pc2UkYXNhcCQkZmx1c2gpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTXV0YXRpb25PYnNlcnZlcigpIHtcbiAgICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBsaWIkZXM2JHByb21pc2UkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIobGliJGVzNiRwcm9taXNlJGFzYXAkJGZsdXNoKTtcbiAgICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7IGNoYXJhY3RlckRhdGE6IHRydWUgfSk7XG5cbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgbm9kZS5kYXRhID0gKGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gd2ViIHdvcmtlclxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VNZXNzYWdlQ2hhbm5lbCgpIHtcbiAgICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRmbHVzaDtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VTZXRUaW1lb3V0KCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGxpYiRlczYkcHJvbWlzZSRhc2FwJCRmbHVzaCwgMSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJGZsdXNoKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaWIkZXM2JHByb21pc2UkYXNhcCQkbGVuOyBpKz0yKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRxdWV1ZVtpXTtcbiAgICAgICAgdmFyIGFyZyA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRxdWV1ZVtpKzFdO1xuXG4gICAgICAgIGNhbGxiYWNrKGFyZyk7XG5cbiAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHF1ZXVlW2ldID0gdW5kZWZpbmVkO1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWVbaSsxXSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbiA9IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJGF0dGVtcHRWZXJ0ZXgoKSB7XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgciA9IHJlcXVpcmU7XG4gICAgICAgIHZhciB2ZXJ0eCA9IHIoJ3ZlcnR4Jyk7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR2ZXJ0eE5leHQgPSB2ZXJ0eC5ydW5Pbkxvb3AgfHwgdmVydHgucnVuT25Db250ZXh0O1xuICAgICAgICByZXR1cm4gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZVZlcnR4VGltZXIoKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZVNldFRpbWVvdXQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2g7XG4gICAgLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbiAgICBpZiAobGliJGVzNiRwcm9taXNlJGFzYXAkJGlzTm9kZSkge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTmV4dFRpY2soKTtcbiAgICB9IGVsc2UgaWYgKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTXV0YXRpb25PYnNlcnZlcigpO1xuICAgIH0gZWxzZSBpZiAobGliJGVzNiRwcm9taXNlJGFzYXAkJGlzV29ya2VyKSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkc2NoZWR1bGVGbHVzaCA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIH0gZWxzZSBpZiAobGliJGVzNiRwcm9taXNlJGFzYXAkJGJyb3dzZXJXaW5kb3cgPT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgcmVxdWlyZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkYXR0ZW1wdFZlcnRleCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkc2NoZWR1bGVGbHVzaCA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VTZXRUaW1lb3V0KCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbm9vcCgpIHt9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUEVORElORyAgID0gdm9pZCAwO1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRGVUxGSUxMRUQgPSAxO1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRCAgPSAyO1xuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SID0gbmV3IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRzZWxmRnVsbGZpbGxtZW50KCkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoXCJZb3UgY2Fubm90IHJlc29sdmUgYSBwcm9taXNlIHdpdGggaXRzZWxmXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGNhbm5vdFJldHVybk93bigpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKCdBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZ2V0VGhlbihwcm9taXNlKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUi5lcnJvciA9IGVycm9yO1xuICAgICAgICByZXR1cm4gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1I7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGVuLmNhbGwodmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcik7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuKSB7XG4gICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGRlZmF1bHQoZnVuY3Rpb24ocHJvbWlzZSkge1xuICAgICAgICB2YXIgc2VhbGVkID0gZmFsc2U7XG4gICAgICAgIHZhciBlcnJvciA9IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHRyeVRoZW4odGhlbiwgdGhlbmFibGUsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgIGlmICh0aGVuYWJsZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAgIGlmIChzZWFsZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcblxuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgICAgIGlmICghc2VhbGVkICYmIGVycm9yKSB7XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICB9LCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSkge1xuICAgICAgaWYgKHRoZW5hYmxlLl9zdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2UgaWYgKHRoZW5hYmxlLl9zdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHRoZW5hYmxlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpIHtcbiAgICAgIGlmIChtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yID09PSBwcm9taXNlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRoZW4gPSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRnZXRUaGVuKG1heWJlVGhlbmFibGUpO1xuXG4gICAgICAgIGlmICh0aGVuID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUikge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUi5lcnJvcik7XG4gICAgICAgIH0gZWxzZSBpZiAodGhlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfSBlbHNlIGlmIChsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzRnVuY3Rpb24odGhlbikpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRoYW5kbGVGb3JlaWduVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSwgdGhlbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpKTtcbiAgICAgIH0gZWxzZSBpZiAobGliJGVzNiRwcm9taXNlJHV0aWxzJCRvYmplY3RPckZ1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHB1Ymxpc2hSZWplY3Rpb24ocHJvbWlzZSkge1xuICAgICAgaWYgKHByb21pc2UuX29uZXJyb3IpIHtcbiAgICAgICAgcHJvbWlzZS5fb25lcnJvcihwcm9taXNlLl9yZXN1bHQpO1xuICAgICAgfVxuXG4gICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRwdWJsaXNoKHByb21pc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUEVORElORykgeyByZXR1cm47IH1cblxuICAgICAgcHJvbWlzZS5fcmVzdWx0ID0gdmFsdWU7XG4gICAgICBwcm9taXNlLl9zdGF0ZSA9IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEZVTEZJTExFRDtcblxuICAgICAgaWYgKHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkZGVmYXVsdChsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRwdWJsaXNoLCBwcm9taXNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKSB7XG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG4gICAgICBwcm9taXNlLl9zdGF0ZSA9IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFJFSkVDVEVEO1xuICAgICAgcHJvbWlzZS5fcmVzdWx0ID0gcmVhc29uO1xuXG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkZGVmYXVsdChsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uLCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICAgIHZhciBzdWJzY3JpYmVycyA9IHBhcmVudC5fc3Vic2NyaWJlcnM7XG4gICAgICB2YXIgbGVuZ3RoID0gc3Vic2NyaWJlcnMubGVuZ3RoO1xuXG4gICAgICBwYXJlbnQuX29uZXJyb3IgPSBudWxsO1xuXG4gICAgICBzdWJzY3JpYmVyc1tsZW5ndGhdID0gY2hpbGQ7XG4gICAgICBzdWJzY3JpYmVyc1tsZW5ndGggKyBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFJFSkVDVEVEXSAgPSBvblJlamVjdGlvbjtcblxuICAgICAgaWYgKGxlbmd0aCA9PT0gMCAmJiBwYXJlbnQuX3N0YXRlKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRkZWZhdWx0KGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHB1Ymxpc2gsIHBhcmVudCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcHVibGlzaChwcm9taXNlKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlcnMgPSBwcm9taXNlLl9zdWJzY3JpYmVycztcbiAgICAgIHZhciBzZXR0bGVkID0gcHJvbWlzZS5fc3RhdGU7XG5cbiAgICAgIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHsgcmV0dXJuOyB9XG5cbiAgICAgIHZhciBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCA9IHByb21pc2UuX3Jlc3VsdDtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJzY3JpYmVycy5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgICAgICBjYWxsYmFjayA9IHN1YnNjcmliZXJzW2kgKyBzZXR0bGVkXTtcblxuICAgICAgICBpZiAoY2hpbGQpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2soZGV0YWlsKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggPSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCkge1xuICAgICAgdGhpcy5lcnJvciA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUiA9IG5ldyBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRFcnJvck9iamVjdCgpO1xuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SLmVycm9yID0gZTtcbiAgICAgICAgcmV0dXJuIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBwcm9taXNlLCBjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB2YXIgaGFzQ2FsbGJhY2sgPSBsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzRnVuY3Rpb24oY2FsbGJhY2spLFxuICAgICAgICAgIHZhbHVlLCBlcnJvciwgc3VjY2VlZGVkLCBmYWlsZWQ7XG5cbiAgICAgIGlmIChoYXNDYWxsYmFjaykge1xuICAgICAgICB2YWx1ZSA9IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHRyeUNhdGNoKGNhbGxiYWNrLCBkZXRhaWwpO1xuXG4gICAgICAgIGlmICh2YWx1ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SKSB7XG4gICAgICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICBlcnJvciA9IHZhbHVlLmVycm9yO1xuICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGNhbm5vdFJldHVybk93bigpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBkZXRhaWw7XG4gICAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICAvLyBub29wXG4gICAgICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoZmFpbGVkKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRpbml0aWFsaXplUHJvbWlzZShwcm9taXNlLCByZXNvbHZlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZXIoZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpe1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9LCBmdW5jdGlvbiByZWplY3RQcm9taXNlKHJlYXNvbikge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0KSB7XG4gICAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgICAgIGVudW1lcmF0b3IuX2luc3RhbmNlQ29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcbiAgICAgIGVudW1lcmF0b3IucHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcihsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRub29wKTtcblxuICAgICAgaWYgKGVudW1lcmF0b3IuX3ZhbGlkYXRlSW5wdXQoaW5wdXQpKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX2lucHV0ICAgICA9IGlucHV0O1xuICAgICAgICBlbnVtZXJhdG9yLmxlbmd0aCAgICAgPSBpbnB1dC5sZW5ndGg7XG4gICAgICAgIGVudW1lcmF0b3IuX3JlbWFpbmluZyA9IGlucHV0Lmxlbmd0aDtcblxuICAgICAgICBlbnVtZXJhdG9yLl9pbml0KCk7XG5cbiAgICAgICAgaWYgKGVudW1lcmF0b3IubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChlbnVtZXJhdG9yLnByb21pc2UsIGVudW1lcmF0b3IuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZW51bWVyYXRvci5sZW5ndGggPSBlbnVtZXJhdG9yLmxlbmd0aCB8fCAwO1xuICAgICAgICAgIGVudW1lcmF0b3IuX2VudW1lcmF0ZSgpO1xuICAgICAgICAgIGlmIChlbnVtZXJhdG9yLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwoZW51bWVyYXRvci5wcm9taXNlLCBlbnVtZXJhdG9yLl9yZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KGVudW1lcmF0b3IucHJvbWlzZSwgZW51bWVyYXRvci5fdmFsaWRhdGlvbkVycm9yKCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fdmFsaWRhdGVJbnB1dCA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICByZXR1cm4gbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0FycmF5KGlucHV0KTtcbiAgICB9O1xuXG4gICAgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl92YWxpZGF0aW9uRXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRXJyb3IoJ0FycmF5IE1ldGhvZHMgbXVzdCBiZSBwcm92aWRlZCBhbiBBcnJheScpO1xuICAgIH07XG5cbiAgICBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX3Jlc3VsdCA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG4gICAgfTtcblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkZGVmYXVsdCA9IGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yO1xuXG4gICAgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9lbnVtZXJhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgICAgdmFyIGxlbmd0aCAgPSBlbnVtZXJhdG9yLmxlbmd0aDtcbiAgICAgIHZhciBwcm9taXNlID0gZW51bWVyYXRvci5wcm9taXNlO1xuICAgICAgdmFyIGlucHV0ICAgPSBlbnVtZXJhdG9yLl9pbnB1dDtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IHByb21pc2UuX3N0YXRlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBlbnVtZXJhdG9yLl9lYWNoRW50cnkoaW5wdXRbaV0sIGkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX2VhY2hFbnRyeSA9IGZ1bmN0aW9uKGVudHJ5LCBpKSB7XG4gICAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG4gICAgICB2YXIgYyA9IGVudW1lcmF0b3IuX2luc3RhbmNlQ29uc3RydWN0b3I7XG5cbiAgICAgIGlmIChsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzTWF5YmVUaGVuYWJsZShlbnRyeSkpIHtcbiAgICAgICAgaWYgKGVudHJ5LmNvbnN0cnVjdG9yID09PSBjICYmIGVudHJ5Ll9zdGF0ZSAhPT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICAgIGVudHJ5Ll9vbmVycm9yID0gbnVsbDtcbiAgICAgICAgICBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoZW50cnkuX3N0YXRlLCBpLCBlbnRyeS5fcmVzdWx0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbnVtZXJhdG9yLl93aWxsU2V0dGxlQXQoYy5yZXNvbHZlKGVudHJ5KSwgaSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3JlbWFpbmluZy0tO1xuICAgICAgICBlbnVtZXJhdG9yLl9yZXN1bHRbaV0gPSBlbnRyeTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9zZXR0bGVkQXQgPSBmdW5jdGlvbihzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcbiAgICAgIHZhciBwcm9taXNlID0gZW51bWVyYXRvci5wcm9taXNlO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgZW51bWVyYXRvci5fcmVtYWluaW5nLS07XG5cbiAgICAgICAgaWYgKHN0YXRlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZW51bWVyYXRvci5fcmVzdWx0W2ldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGVudW1lcmF0b3IuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIGVudW1lcmF0b3IuX3Jlc3VsdCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fd2lsbFNldHRsZUF0ID0gZnVuY3Rpb24ocHJvbWlzZSwgaSkge1xuICAgICAgdmFyIGVudW1lcmF0b3IgPSB0aGlzO1xuXG4gICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRzdWJzY3JpYmUocHJvbWlzZSwgdW5kZWZpbmVkLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBlbnVtZXJhdG9yLl9zZXR0bGVkQXQobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFJFSkVDVEVELCBpLCByZWFzb24pO1xuICAgICAgfSk7XG4gICAgfTtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRhbGwkJGFsbChlbnRyaWVzKSB7XG4gICAgICByZXR1cm4gbmV3IGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRkZWZhdWx0KHRoaXMsIGVudHJpZXMpLnByb21pc2U7XG4gICAgfVxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRhbGwkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRhbGwkJGFsbDtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyYWNlJCRyYWNlKGVudHJpZXMpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcihsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRub29wKTtcblxuICAgICAgaWYgKCFsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzQXJyYXkoZW50cmllcykpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKSk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVuZ3RoID0gZW50cmllcy5sZW5ndGg7XG5cbiAgICAgIGZ1bmN0aW9uIG9uRnVsZmlsbG1lbnQodmFsdWUpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG9uUmVqZWN0aW9uKHJlYXNvbikge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IHByb21pc2UuX3N0YXRlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRzdWJzY3JpYmUoQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKSwgdW5kZWZpbmVkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmFjZSQkZGVmYXVsdCA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJhY2UkJHJhY2U7XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVzb2x2ZSQkcmVzb2x2ZShvYmplY3QpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gICAgICBpZiAob2JqZWN0ICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmIG9iamVjdC5jb25zdHJ1Y3RvciA9PT0gQ29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgIH1cblxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbm9vcCk7XG4gICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIG9iamVjdCk7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZXNvbHZlJCRyZXNvbHZlO1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlamVjdCQkcmVqZWN0KHJlYXNvbikge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcihsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRub29wKTtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZWplY3QkJHJlamVjdDtcblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkY291bnRlciA9IDA7XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNOZXcoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUHJvbWlzZSc6IFBsZWFzZSB1c2UgdGhlICduZXcnIG9wZXJhdG9yLCB0aGlzIG9iamVjdCBjb25zdHJ1Y3RvciBjYW5ub3QgYmUgY2FsbGVkIGFzIGEgZnVuY3Rpb24uXCIpO1xuICAgIH1cblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdCA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlO1xuICAgIC8qKlxuICAgICAgUHJvbWlzZSBvYmplY3RzIHJlcHJlc2VudCB0aGUgZXZlbnR1YWwgcmVzdWx0IG9mIGFuIGFzeW5jaHJvbm91cyBvcGVyYXRpb24uIFRoZVxuICAgICAgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCwgd2hpY2hcbiAgICAgIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNl4oCZcyBldmVudHVhbCB2YWx1ZSBvciB0aGUgcmVhc29uXG4gICAgICB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cblxuICAgICAgVGVybWlub2xvZ3lcbiAgICAgIC0tLS0tLS0tLS0tXG5cbiAgICAgIC0gYHByb21pc2VgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB3aXRoIGEgYHRoZW5gIG1ldGhvZCB3aG9zZSBiZWhhdmlvciBjb25mb3JtcyB0byB0aGlzIHNwZWNpZmljYXRpb24uXG4gICAgICAtIGB0aGVuYWJsZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyBhIGB0aGVuYCBtZXRob2QuXG4gICAgICAtIGB2YWx1ZWAgaXMgYW55IGxlZ2FsIEphdmFTY3JpcHQgdmFsdWUgKGluY2x1ZGluZyB1bmRlZmluZWQsIGEgdGhlbmFibGUsIG9yIGEgcHJvbWlzZSkuXG4gICAgICAtIGBleGNlcHRpb25gIGlzIGEgdmFsdWUgdGhhdCBpcyB0aHJvd24gdXNpbmcgdGhlIHRocm93IHN0YXRlbWVudC5cbiAgICAgIC0gYHJlYXNvbmAgaXMgYSB2YWx1ZSB0aGF0IGluZGljYXRlcyB3aHkgYSBwcm9taXNlIHdhcyByZWplY3RlZC5cbiAgICAgIC0gYHNldHRsZWRgIHRoZSBmaW5hbCByZXN0aW5nIHN0YXRlIG9mIGEgcHJvbWlzZSwgZnVsZmlsbGVkIG9yIHJlamVjdGVkLlxuXG4gICAgICBBIHByb21pc2UgY2FuIGJlIGluIG9uZSBvZiB0aHJlZSBzdGF0ZXM6IHBlbmRpbmcsIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQuXG5cbiAgICAgIFByb21pc2VzIHRoYXQgYXJlIGZ1bGZpbGxlZCBoYXZlIGEgZnVsZmlsbG1lbnQgdmFsdWUgYW5kIGFyZSBpbiB0aGUgZnVsZmlsbGVkXG4gICAgICBzdGF0ZS4gIFByb21pc2VzIHRoYXQgYXJlIHJlamVjdGVkIGhhdmUgYSByZWplY3Rpb24gcmVhc29uIGFuZCBhcmUgaW4gdGhlXG4gICAgICByZWplY3RlZCBzdGF0ZS4gIEEgZnVsZmlsbG1lbnQgdmFsdWUgaXMgbmV2ZXIgYSB0aGVuYWJsZS5cblxuICAgICAgUHJvbWlzZXMgY2FuIGFsc28gYmUgc2FpZCB0byAqcmVzb2x2ZSogYSB2YWx1ZS4gIElmIHRoaXMgdmFsdWUgaXMgYWxzbyBhXG4gICAgICBwcm9taXNlLCB0aGVuIHRoZSBvcmlnaW5hbCBwcm9taXNlJ3Mgc2V0dGxlZCBzdGF0ZSB3aWxsIG1hdGNoIHRoZSB2YWx1ZSdzXG4gICAgICBzZXR0bGVkIHN0YXRlLiAgU28gYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCByZWplY3RzIHdpbGxcbiAgICAgIGl0c2VsZiByZWplY3QsIGFuZCBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IGZ1bGZpbGxzIHdpbGxcbiAgICAgIGl0c2VsZiBmdWxmaWxsLlxuXG5cbiAgICAgIEJhc2ljIFVzYWdlOlxuICAgICAgLS0tLS0tLS0tLS0tXG5cbiAgICAgIGBgYGpzXG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAvLyBvbiBzdWNjZXNzXG4gICAgICAgIHJlc29sdmUodmFsdWUpO1xuXG4gICAgICAgIC8vIG9uIGZhaWx1cmVcbiAgICAgICAgcmVqZWN0KHJlYXNvbik7XG4gICAgICB9KTtcblxuICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgLy8gb24gcmVqZWN0aW9uXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBBZHZhbmNlZCBVc2FnZTpcbiAgICAgIC0tLS0tLS0tLS0tLS0tLVxuXG4gICAgICBQcm9taXNlcyBzaGluZSB3aGVuIGFic3RyYWN0aW5nIGF3YXkgYXN5bmNocm9ub3VzIGludGVyYWN0aW9ucyBzdWNoIGFzXG4gICAgICBgWE1MSHR0cFJlcXVlc3Rgcy5cblxuICAgICAgYGBganNcbiAgICAgIGZ1bmN0aW9uIGdldEpTT04odXJsKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpO1xuICAgICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBoYW5kbGVyO1xuICAgICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnanNvbic7XG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgICAgeGhyLnNlbmQoKTtcblxuICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZXIoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSB0aGlzLkRPTkUpIHtcbiAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRoaXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ2dldEpTT046IGAnICsgdXJsICsgJ2AgZmFpbGVkIHdpdGggc3RhdHVzOiBbJyArIHRoaXMuc3RhdHVzICsgJ10nKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZ2V0SlNPTignL3Bvc3RzLmpzb24nKS50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAvLyBvbiByZWplY3Rpb25cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFVubGlrZSBjYWxsYmFja3MsIHByb21pc2VzIGFyZSBncmVhdCBjb21wb3NhYmxlIHByaW1pdGl2ZXMuXG5cbiAgICAgIGBgYGpzXG4gICAgICBQcm9taXNlLmFsbChbXG4gICAgICAgIGdldEpTT04oJy9wb3N0cycpLFxuICAgICAgICBnZXRKU09OKCcvY29tbWVudHMnKVxuICAgICAgXSkudGhlbihmdW5jdGlvbih2YWx1ZXMpe1xuICAgICAgICB2YWx1ZXNbMF0gLy8gPT4gcG9zdHNKU09OXG4gICAgICAgIHZhbHVlc1sxXSAvLyA9PiBjb21tZW50c0pTT05cblxuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQGNsYXNzIFByb21pc2VcbiAgICAgIEBwYXJhbSB7ZnVuY3Rpb259IHJlc29sdmVyXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAY29uc3RydWN0b3JcbiAgICAqL1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgICB0aGlzLl9pZCA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRjb3VudGVyKys7XG4gICAgICB0aGlzLl9zdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX3Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX3N1YnNjcmliZXJzID0gW107XG5cbiAgICAgIGlmIChsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRub29wICE9PSByZXNvbHZlcikge1xuICAgICAgICBpZiAoIWxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlcikpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlKSkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc05ldygpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UodGhpcywgcmVzb2x2ZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLmFsbCA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJGFsbCQkZGVmYXVsdDtcbiAgICBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yYWNlID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmFjZSQkZGVmYXVsdDtcbiAgICBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yZXNvbHZlID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVzb2x2ZSQkZGVmYXVsdDtcbiAgICBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yZWplY3QgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQ7XG5cbiAgICBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5wcm90b3R5cGUgPSB7XG4gICAgICBjb25zdHJ1Y3RvcjogbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UsXG5cbiAgICAvKipcbiAgICAgIFRoZSBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLFxuICAgICAgd2hpY2ggcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGVcbiAgICAgIHJlYXNvbiB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgLy8gdXNlciBpcyBhdmFpbGFibGVcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHVzZXIgaXMgdW5hdmFpbGFibGUsIGFuZCB5b3UgYXJlIGdpdmVuIHRoZSByZWFzb24gd2h5XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBDaGFpbmluZ1xuICAgICAgLS0tLS0tLS1cblxuICAgICAgVGhlIHJldHVybiB2YWx1ZSBvZiBgdGhlbmAgaXMgaXRzZWxmIGEgcHJvbWlzZS4gIFRoaXMgc2Vjb25kLCAnZG93bnN0cmVhbSdcbiAgICAgIHByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmaXJzdCBwcm9taXNlJ3MgZnVsZmlsbG1lbnRcbiAgICAgIG9yIHJlamVjdGlvbiBoYW5kbGVyLCBvciByZWplY3RlZCBpZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiB1c2VyLm5hbWU7XG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIHJldHVybiAnZGVmYXVsdCBuYW1lJztcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHVzZXJOYW1lKSB7XG4gICAgICAgIC8vIElmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgdXNlck5hbWVgIHdpbGwgYmUgdGhlIHVzZXIncyBuYW1lLCBvdGhlcndpc2UgaXRcbiAgICAgICAgLy8gd2lsbCBiZSBgJ2RlZmF1bHQgbmFtZSdgXG4gICAgICB9KTtcblxuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknKTtcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jyk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIGlmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgcmVhc29uYCB3aWxsIGJlICdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScuXG4gICAgICAgIC8vIElmIGBmaW5kVXNlcmAgcmVqZWN0ZWQsIGByZWFzb25gIHdpbGwgYmUgJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknLlxuICAgICAgfSk7XG4gICAgICBgYGBcbiAgICAgIElmIHRoZSBkb3duc3RyZWFtIHByb21pc2UgZG9lcyBub3Qgc3BlY2lmeSBhIHJlamVjdGlvbiBoYW5kbGVyLCByZWplY3Rpb24gcmVhc29ucyB3aWxsIGJlIHByb3BhZ2F0ZWQgZnVydGhlciBkb3duc3RyZWFtLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBQZWRhZ29naWNhbEV4Y2VwdGlvbignVXBzdHJlYW0gZXJyb3InKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gVGhlIGBQZWRnYWdvY2lhbEV4Y2VwdGlvbmAgaXMgcHJvcGFnYXRlZCBhbGwgdGhlIHdheSBkb3duIHRvIGhlcmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFzc2ltaWxhdGlvblxuICAgICAgLS0tLS0tLS0tLS0tXG5cbiAgICAgIFNvbWV0aW1lcyB0aGUgdmFsdWUgeW91IHdhbnQgdG8gcHJvcGFnYXRlIHRvIGEgZG93bnN0cmVhbSBwcm9taXNlIGNhbiBvbmx5IGJlXG4gICAgICByZXRyaWV2ZWQgYXN5bmNocm9ub3VzbHkuIFRoaXMgY2FuIGJlIGFjaGlldmVkIGJ5IHJldHVybmluZyBhIHByb21pc2UgaW4gdGhlXG4gICAgICBmdWxmaWxsbWVudCBvciByZWplY3Rpb24gaGFuZGxlci4gVGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIHRoZW4gYmUgcGVuZGluZ1xuICAgICAgdW50aWwgdGhlIHJldHVybmVkIHByb21pc2UgaXMgc2V0dGxlZC4gVGhpcyBpcyBjYWxsZWQgKmFzc2ltaWxhdGlvbiouXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAgICAgLy8gVGhlIHVzZXIncyBjb21tZW50cyBhcmUgbm93IGF2YWlsYWJsZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgSWYgdGhlIGFzc2ltbGlhdGVkIHByb21pc2UgcmVqZWN0cywgdGhlbiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgYWxzbyByZWplY3QuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAgICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCBmdWxmaWxscywgd2UnbGwgaGF2ZSB0aGUgdmFsdWUgaGVyZVxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIHJlamVjdHMsIHdlJ2xsIGhhdmUgdGhlIHJlYXNvbiBoZXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBTaW1wbGUgRXhhbXBsZVxuICAgICAgLS0tLS0tLS0tLS0tLS1cblxuICAgICAgU3luY2hyb25vdXMgRXhhbXBsZVxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgcmVzdWx0O1xuXG4gICAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSBmaW5kUmVzdWx0KCk7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH1cbiAgICAgIGBgYFxuXG4gICAgICBFcnJiYWNrIEV4YW1wbGVcblxuICAgICAgYGBganNcbiAgICAgIGZpbmRSZXN1bHQoZnVuY3Rpb24ocmVzdWx0LCBlcnIpe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgUHJvbWlzZSBFeGFtcGxlO1xuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICBmaW5kUmVzdWx0KCkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBBZHZhbmNlZCBFeGFtcGxlXG4gICAgICAtLS0tLS0tLS0tLS0tLVxuXG4gICAgICBTeW5jaHJvbm91cyBFeGFtcGxlXG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciBhdXRob3IsIGJvb2tzO1xuXG4gICAgICB0cnkge1xuICAgICAgICBhdXRob3IgPSBmaW5kQXV0aG9yKCk7XG4gICAgICAgIGJvb2tzICA9IGZpbmRCb29rc0J5QXV0aG9yKGF1dGhvcik7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH1cbiAgICAgIGBgYFxuXG4gICAgICBFcnJiYWNrIEV4YW1wbGVcblxuICAgICAgYGBganNcblxuICAgICAgZnVuY3Rpb24gZm91bmRCb29rcyhib29rcykge1xuXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZhaWx1cmUocmVhc29uKSB7XG5cbiAgICAgIH1cblxuICAgICAgZmluZEF1dGhvcihmdW5jdGlvbihhdXRob3IsIGVycil7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmaW5kQm9vb2tzQnlBdXRob3IoYXV0aG9yLCBmdW5jdGlvbihib29rcywgZXJyKSB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIGZvdW5kQm9va3MoYm9va3MpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICBmYWlsdXJlKHJlYXNvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgUHJvbWlzZSBFeGFtcGxlO1xuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICBmaW5kQXV0aG9yKCkuXG4gICAgICAgIHRoZW4oZmluZEJvb2tzQnlBdXRob3IpLlxuICAgICAgICB0aGVuKGZ1bmN0aW9uKGJvb2tzKXtcbiAgICAgICAgICAvLyBmb3VuZCBib29rc1xuICAgICAgfSkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgdGhlblxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25GdWxmaWxsZWRcbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0ZWRcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEByZXR1cm4ge1Byb21pc2V9XG4gICAgKi9cbiAgICAgIHRoZW46IGZ1bmN0aW9uKG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgICB2YXIgc3RhdGUgPSBwYXJlbnQuX3N0YXRlO1xuXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEICYmICFvbkZ1bGZpbGxtZW50IHx8IHN0YXRlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRCAmJiAhb25SZWplY3Rpb24pIHtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGlsZCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3ApO1xuICAgICAgICB2YXIgcmVzdWx0ID0gcGFyZW50Ll9yZXN1bHQ7XG5cbiAgICAgICAgaWYgKHN0YXRlKSB7XG4gICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJndW1lbnRzW3N0YXRlIC0gMV07XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHN0YXRlLCBjaGlsZCwgY2FsbGJhY2ssIHJlc3VsdCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgIH0sXG5cbiAgICAvKipcbiAgICAgIGBjYXRjaGAgaXMgc2ltcGx5IHN1Z2FyIGZvciBgdGhlbih1bmRlZmluZWQsIG9uUmVqZWN0aW9uKWAgd2hpY2ggbWFrZXMgaXQgdGhlIHNhbWVcbiAgICAgIGFzIHRoZSBjYXRjaCBibG9jayBvZiBhIHRyeS9jYXRjaCBzdGF0ZW1lbnQuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmdW5jdGlvbiBmaW5kQXV0aG9yKCl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGRuJ3QgZmluZCB0aGF0IGF1dGhvcicpO1xuICAgICAgfVxuXG4gICAgICAvLyBzeW5jaHJvbm91c1xuICAgICAgdHJ5IHtcbiAgICAgICAgZmluZEF1dGhvcigpO1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH1cblxuICAgICAgLy8gYXN5bmMgd2l0aCBwcm9taXNlc1xuICAgICAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIGNhdGNoXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGlvblxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgJ2NhdGNoJzogZnVuY3Rpb24ob25SZWplY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGlvbik7XG4gICAgICB9XG4gICAgfTtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkcG9seWZpbGwkJHBvbHlmaWxsKCkge1xuICAgICAgdmFyIGxvY2FsO1xuXG4gICAgICBpZiAodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBsb2NhbCA9IGdsb2JhbDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgbG9jYWwgPSBzZWxmO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBsb2NhbCA9IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BvbHlmaWxsIGZhaWxlZCBiZWNhdXNlIGdsb2JhbCBvYmplY3QgaXMgdW5hdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudCcpO1xuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIFAgPSBsb2NhbC5Qcm9taXNlO1xuXG4gICAgICBpZiAoUCAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoUC5yZXNvbHZlKCkpID09PSAnW29iamVjdCBQcm9taXNlXScgJiYgIVAuY2FzdCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGxvY2FsLlByb21pc2UgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdDtcbiAgICB9XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkZGVmYXVsdCA9IGxpYiRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkcG9seWZpbGw7XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZSA9IHtcbiAgICAgICdQcm9taXNlJzogbGliJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQsXG4gICAgICAncG9seWZpbGwnOiBsaWIkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHRcbiAgICB9O1xuXG4gICAgLyogZ2xvYmFsIGRlZmluZTp0cnVlIG1vZHVsZTp0cnVlIHdpbmRvdzogdHJ1ZSAqL1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZVsnYW1kJ10pIHtcbiAgICAgIGRlZmluZShmdW5jdGlvbigpIHsgcmV0dXJuIGxpYiRlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7IH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlWydleHBvcnRzJ10pIHtcbiAgICAgIG1vZHVsZVsnZXhwb3J0cyddID0gbGliJGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpc1snRVM2UHJvbWlzZSddID0gbGliJGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTtcbiAgICB9XG5cbiAgICBsaWIkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHQoKTtcbn0pLmNhbGwodGhpcyk7XG5cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJJclhVc3VcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qZ2xvYmFscyBkZWZpbmUgKi9cbid1c2Ugc3RyaWN0JztcblxuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKHJvb3QuaHR0cHBsZWFzZXByb21pc2VzID0gZmFjdG9yeShyb290KSk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyb290KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByb290Lmh0dHBwbGVhc2Vwcm9taXNlcyA9IGZhY3Rvcnkocm9vdCk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAocm9vdCkgeyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICByZXR1cm4gZnVuY3Rpb24gKFByb21pc2UpIHtcbiAgICAgICAgUHJvbWlzZSA9IFByb21pc2UgfHwgcm9vdCAmJiByb290LlByb21pc2U7XG4gICAgICAgIGlmICghUHJvbWlzZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBQcm9taXNlIGltcGxlbWVudGF0aW9uIGZvdW5kLicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwcm9jZXNzUmVxdWVzdDogZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICAgICAgICAgIHZhciByZXNvbHZlLCByZWplY3QsXG4gICAgICAgICAgICAgICAgICAgIG9sZE9ubG9hZCA9IHJlcS5vbmxvYWQsXG4gICAgICAgICAgICAgICAgICAgIG9sZE9uZXJyb3IgPSByZXEub25lcnJvcixcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlID0gYTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCA9IGI7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlcS5vbmxvYWQgPSBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvbGRPbmxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IG9sZE9ubG9hZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICBpZiAob2xkT25lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gb2xkT25lcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxLnRoZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlLnRoZW4uYXBwbHkocHJvbWlzZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcVsnY2F0Y2gnXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2VbJ2NhdGNoJ10uYXBwbHkocHJvbWlzZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG59KSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZXNwb25zZSA9IHJlcXVpcmUoJy4vcmVzcG9uc2UnKTtcblxuZnVuY3Rpb24gUmVxdWVzdEVycm9yKG1lc3NhZ2UsIHByb3BzKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICBlcnIubmFtZSA9ICdSZXF1ZXN0RXJyb3InO1xuICAgIHRoaXMubmFtZSA9IGVyci5uYW1lO1xuICAgIHRoaXMubWVzc2FnZSA9IGVyci5tZXNzYWdlO1xuICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgICAgdGhpcy5zdGFjayA9IGVyci5zdGFjaztcbiAgICB9XG5cbiAgICB0aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlO1xuICAgIH07XG5cbiAgICBmb3IgKHZhciBrIGluIHByb3BzKSB7XG4gICAgICAgIGlmIChwcm9wcy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgdGhpc1trXSA9IHByb3BzW2tdO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5SZXF1ZXN0RXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG5SZXF1ZXN0RXJyb3IuY3JlYXRlID0gZnVuY3Rpb24gKG1lc3NhZ2UsIHJlcSwgcHJvcHMpIHtcbiAgICB2YXIgZXJyID0gbmV3IFJlcXVlc3RFcnJvcihtZXNzYWdlLCBwcm9wcyk7XG4gICAgUmVzcG9uc2UuY2FsbChlcnIsIHJlcSk7XG4gICAgcmV0dXJuIGVycjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdEVycm9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaSxcbiAgICBjbGVhblVSTCA9IHJlcXVpcmUoJy4uL3BsdWdpbnMvY2xlYW51cmwnKSxcbiAgICBYSFIgPSByZXF1aXJlKCcuL3hocicpLFxuICAgIGRlbGF5ID0gcmVxdWlyZSgnLi91dGlscy9kZWxheScpLFxuICAgIGNyZWF0ZUVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpLmNyZWF0ZSxcbiAgICBSZXNwb25zZSA9IHJlcXVpcmUoJy4vcmVzcG9uc2UnKSxcbiAgICBSZXF1ZXN0ID0gcmVxdWlyZSgnLi9yZXF1ZXN0JyksXG4gICAgZXh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKSxcbiAgICBvbmNlID0gcmVxdWlyZSgnLi91dGlscy9vbmNlJyk7XG5cbmZ1bmN0aW9uIGZhY3RvcnkoZGVmYXVsdHMsIHBsdWdpbnMpIHtcbiAgICBkZWZhdWx0cyA9IGRlZmF1bHRzIHx8IHt9O1xuICAgIHBsdWdpbnMgPSBwbHVnaW5zIHx8IFtdO1xuXG4gICAgZnVuY3Rpb24gaHR0cChyZXEsIGNiKSB7XG4gICAgICAgIHZhciB4aHIsIHBsdWdpbiwgZG9uZSwgaywgdGltZW91dElkO1xuXG4gICAgICAgIHJlcSA9IG5ldyBSZXF1ZXN0KGV4dGVuZChkZWZhdWx0cywgcmVxKSk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBsdWdpbiA9IHBsdWdpbnNbaV07XG4gICAgICAgICAgICBpZiAocGx1Z2luLnByb2Nlc3NSZXF1ZXN0KSB7XG4gICAgICAgICAgICAgICAgcGx1Z2luLnByb2Nlc3NSZXF1ZXN0KHJlcSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHaXZlIHRoZSBwbHVnaW5zIGEgY2hhbmNlIHRvIGNyZWF0ZSB0aGUgWEhSIG9iamVjdFxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcGx1Z2luID0gcGx1Z2luc1tpXTtcbiAgICAgICAgICAgIGlmIChwbHVnaW4uY3JlYXRlWEhSKSB7XG4gICAgICAgICAgICAgICAgeGhyID0gcGx1Z2luLmNyZWF0ZVhIUihyZXEpO1xuICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBGaXJzdCBjb21lLCBmaXJzdCBzZXJ2ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHhociA9IHhociB8fCBuZXcgWEhSKCk7XG5cbiAgICAgICAgcmVxLnhociA9IHhocjtcblxuICAgICAgICAvLyBCZWNhdXNlIFhIUiBjYW4gYmUgYW4gWE1MSHR0cFJlcXVlc3Qgb3IgYW4gWERvbWFpblJlcXVlc3QsIHdlIGFkZFxuICAgICAgICAvLyBgb25yZWFkeXN0YXRlY2hhbmdlYCwgYG9ubG9hZGAsIGFuZCBgb25lcnJvcmAgY2FsbGJhY2tzLiBXZSB1c2UgdGhlXG4gICAgICAgIC8vIGBvbmNlYCB1dGlsIHRvIG1ha2Ugc3VyZSB0aGF0IG9ubHkgb25lIGlzIGNhbGxlZCAoYW5kIGl0J3Mgb25seSBjYWxsZWRcbiAgICAgICAgLy8gb25lIHRpbWUpLlxuICAgICAgICBkb25lID0gb25jZShkZWxheShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgICAgIHhoci5vbmxvYWQgPSB4aHIub25lcnJvciA9IHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSB4aHIub250aW1lb3V0ID0geGhyLm9ucHJvZ3Jlc3MgPSBudWxsO1xuICAgICAgICAgICAgdmFyIHJlcyA9IGVyciAmJiBlcnIuaXNIdHRwRXJyb3IgPyBlcnIgOiBuZXcgUmVzcG9uc2UocmVxKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGx1Z2luID0gcGx1Z2luc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAocGx1Z2luLnByb2Nlc3NSZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBwbHVnaW4ucHJvY2Vzc1Jlc3BvbnNlKHJlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChyZXEub25lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlcS5vbmxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxLm9ubG9hZChyZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICAgIGNiKGVyciwgcmVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuXG4gICAgICAgIC8vIFdoZW4gdGhlIHJlcXVlc3QgY29tcGxldGVzLCBjb250aW51ZS5cbiAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyZXEudGltZWRPdXQpIHJldHVybjtcblxuICAgICAgICAgICAgaWYgKHJlcS5hYm9ydGVkKSB7XG4gICAgICAgICAgICAgICAgZG9uZShjcmVhdGVFcnJvcignUmVxdWVzdCBhYm9ydGVkJywgcmVxLCB7bmFtZTogJ0Fib3J0J30pKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IE1hdGguZmxvb3IoeGhyLnN0YXR1cyAvIDEwMCk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PT0gNDA0ICYmICFyZXEuZXJyb3JPbjQwNCkge1xuICAgICAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtpbmQ7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQgPSAnQ2xpZW50JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kID0gJ1NlcnZlcic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQgPSAnSFRUUCc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIG1zZyA9IGtpbmQgKyAnIEVycm9yOiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdUaGUgc2VydmVyIHJldHVybmVkIGEgc3RhdHVzIG9mICcgKyB4aHIuc3RhdHVzICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgZm9yIHRoZSByZXF1ZXN0IFwiJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXEubWV0aG9kLnRvVXBwZXJDYXNlKCkgKyAnICcgKyByZXEudXJsICsgJ1wiJztcbiAgICAgICAgICAgICAgICAgICAgZG9uZShjcmVhdGVFcnJvcihtc2csIHJlcSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBgb25sb2FkYCBpcyBvbmx5IGNhbGxlZCBvbiBzdWNjZXNzIGFuZCwgaW4gSUUsIHdpbGwgYmUgY2FsbGVkIHdpdGhvdXRcbiAgICAgICAgLy8gYHhoci5zdGF0dXNgIGhhdmluZyBiZWVuIHNldCwgc28gd2UgZG9uJ3QgY2hlY2sgaXQuXG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7IGRvbmUoKTsgfTtcblxuICAgICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRvbmUoY3JlYXRlRXJyb3IoJ0ludGVybmFsIFhIUiBFcnJvcicsIHJlcSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIElFIHNvbWV0aW1lcyBmYWlscyBpZiB5b3UgZG9uJ3Qgc3BlY2lmeSBldmVyeSBoYW5kbGVyLlxuICAgICAgICAvLyBTZWUgaHR0cDovL3NvY2lhbC5tc2RuLm1pY3Jvc29mdC5jb20vRm9ydW1zL2llL2VuLVVTLzMwZWYzYWRkLTc2N2MtNDQzNi1iOGE5LWYxY2ExOWI0ODEyZS9pZTktcnRtLXhkb21haW5yZXF1ZXN0LWlzc3VlZC1yZXF1ZXN0cy1tYXktYWJvcnQtaWYtYWxsLWV2ZW50LWhhbmRsZXJzLW5vdC1zcGVjaWZpZWQ/Zm9ydW09aWV3ZWJkZXZlbG9wbWVudFxuICAgICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24gKCkgeyAvKiBub29wICovIH07XG4gICAgICAgIHhoci5vbnByb2dyZXNzID0gZnVuY3Rpb24gKCkgeyAvKiBub29wICovIH07XG5cbiAgICAgICAgeGhyLm9wZW4ocmVxLm1ldGhvZCwgcmVxLnVybCk7XG5cbiAgICAgICAgaWYgKHJlcS50aW1lb3V0KSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSB1c2UgdGhlIG5vcm1hbCBYSFIgdGltZW91dCBtZWNoYW5pc20gKGB4aHIudGltZW91dGAgYW5kXG4gICAgICAgICAgICAvLyBgeGhyLm9udGltZW91dGApLCBgb25yZWFkeXN0YXRlY2hhbmdlYCB3aWxsIGJlIHRyaWdnZXJlZCBiZWZvcmVcbiAgICAgICAgICAgIC8vIGBvbnRpbWVvdXRgLiBUaGVyZSdzIG5vIHdheSB0byByZWNvZ25pemUgdGhhdCBpdCB3YXMgdHJpZ2dlcmVkIGJ5XG4gICAgICAgICAgICAvLyBhIHRpbWVvdXQsIGFuZCB3ZSdkIGJlIHVuYWJsZSB0byBkaXNwYXRjaCB0aGUgcmlnaHQgZXJyb3IuXG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXEudGltZWRPdXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGRvbmUoY3JlYXRlRXJyb3IoJ1JlcXVlc3QgdGltZW91dCcsIHJlcSwge25hbWU6ICdUaW1lb3V0J30pKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB4aHIuYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHt9XG4gICAgICAgICAgICB9LCByZXEudGltZW91dCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGsgaW4gcmVxLmhlYWRlcnMpIHtcbiAgICAgICAgICAgIGlmIChyZXEuaGVhZGVycy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGssIHJlcS5oZWFkZXJzW2tdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHhoci5zZW5kKHJlcS5ib2R5KTtcblxuICAgICAgICByZXR1cm4gcmVxO1xuICAgIH1cblxuICAgIHZhciBtZXRob2QsXG4gICAgICAgIG1ldGhvZHMgPSBbJ2dldCcsICdwb3N0JywgJ3B1dCcsICdoZWFkJywgJ3BhdGNoJywgJ2RlbGV0ZSddLFxuICAgICAgICB2ZXJiID0gZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChyZXEsIGNiKSB7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFJlcXVlc3QocmVxKTtcbiAgICAgICAgICAgICAgICByZXEubWV0aG9kID0gbWV0aG9kO1xuICAgICAgICAgICAgICAgIHJldHVybiBodHRwKHJlcSwgY2IpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbWV0aG9kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBtZXRob2QgPSBtZXRob2RzW2ldO1xuICAgICAgICBodHRwW21ldGhvZF0gPSB2ZXJiKG1ldGhvZCk7XG4gICAgfVxuXG4gICAgaHR0cC5wbHVnaW5zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gcGx1Z2lucztcbiAgICB9O1xuXG4gICAgaHR0cC5kZWZhdWx0cyA9IGZ1bmN0aW9uIChuZXdWYWx1ZXMpIHtcbiAgICAgICAgaWYgKG5ld1ZhbHVlcykge1xuICAgICAgICAgICAgcmV0dXJuIGZhY3RvcnkoZXh0ZW5kKGRlZmF1bHRzLCBuZXdWYWx1ZXMpLCBwbHVnaW5zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmYXVsdHM7XG4gICAgfTtcblxuICAgIGh0dHAudXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbmV3UGx1Z2lucyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICAgIHJldHVybiBmYWN0b3J5KGRlZmF1bHRzLCBwbHVnaW5zLmNvbmNhdChuZXdQbHVnaW5zKSk7XG4gICAgfTtcblxuICAgIGh0dHAuYmFyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZhY3RvcnkoKTtcbiAgICB9O1xuXG4gICAgaHR0cC5SZXF1ZXN0ID0gUmVxdWVzdDtcbiAgICBodHRwLlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbiAgICByZXR1cm4gaHR0cDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHt9LCBbY2xlYW5VUkxdKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUmVxdWVzdChvcHRzT3JVcmwpIHtcbiAgICB2YXIgb3B0cyA9IHR5cGVvZiBvcHRzT3JVcmwgPT09ICdzdHJpbmcnID8ge3VybDogb3B0c09yVXJsfSA6IG9wdHNPclVybCB8fCB7fTtcbiAgICB0aGlzLm1ldGhvZCA9IG9wdHMubWV0aG9kID8gb3B0cy5tZXRob2QudG9VcHBlckNhc2UoKSA6ICdHRVQnO1xuICAgIHRoaXMudXJsID0gb3B0cy51cmw7XG4gICAgdGhpcy5oZWFkZXJzID0gb3B0cy5oZWFkZXJzIHx8IHt9O1xuICAgIHRoaXMuYm9keSA9IG9wdHMuYm9keTtcbiAgICB0aGlzLnRpbWVvdXQgPSBvcHRzLnRpbWVvdXQgfHwgMDtcbiAgICB0aGlzLmVycm9yT240MDQgPSBvcHRzLmVycm9yT240MDQgIT0gbnVsbCA/IG9wdHMuZXJyb3JPbjQwNCA6IHRydWU7XG4gICAgdGhpcy5vbmxvYWQgPSBvcHRzLm9ubG9hZDtcbiAgICB0aGlzLm9uZXJyb3IgPSBvcHRzLm9uZXJyb3I7XG59XG5cblJlcXVlc3QucHJvdG90eXBlLmFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmFib3J0ZWQpIHJldHVybjtcbiAgICB0aGlzLmFib3J0ZWQgPSB0cnVlO1xuICAgIHRoaXMueGhyLmFib3J0KCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5oZWFkZXIgPSBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICB2YXIgaztcbiAgICBmb3IgKGsgaW4gdGhpcy5oZWFkZXJzKSB7XG4gICAgICAgIGlmICh0aGlzLmhlYWRlcnMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIGlmIChuYW1lLnRvTG93ZXJDYXNlKCkgPT09IGsudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhlYWRlcnNba107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuaGVhZGVyc1trXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICB0aGlzLmhlYWRlcnNbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpO1xuXG5cbmZ1bmN0aW9uIFJlc3BvbnNlKHJlcSkge1xuICAgIHZhciBpLCBsaW5lcywgbSxcbiAgICAgICAgeGhyID0gcmVxLnhocjtcbiAgICB0aGlzLnJlcXVlc3QgPSByZXE7XG4gICAgdGhpcy54aHIgPSB4aHI7XG4gICAgdGhpcy5oZWFkZXJzID0ge307XG5cbiAgICAvLyBCcm93c2VycyBkb24ndCBsaWtlIHlvdSB0cnlpbmcgdG8gcmVhZCBYSFIgcHJvcGVydGllcyB3aGVuIHlvdSBhYm9ydCB0aGVcbiAgICAvLyByZXF1ZXN0LCBzbyB3ZSBkb24ndC5cbiAgICBpZiAocmVxLmFib3J0ZWQgfHwgcmVxLnRpbWVkT3V0KSByZXR1cm47XG5cbiAgICB0aGlzLnN0YXR1cyA9IHhoci5zdGF0dXMgfHwgMDtcbiAgICB0aGlzLnRleHQgPSB4aHIucmVzcG9uc2VUZXh0O1xuICAgIHRoaXMuYm9keSA9IHhoci5yZXNwb25zZSB8fCB4aHIucmVzcG9uc2VUZXh0O1xuICAgIHRoaXMuY29udGVudFR5cGUgPSB4aHIuY29udGVudFR5cGUgfHwgKHhoci5nZXRSZXNwb25zZUhlYWRlciAmJiB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ0NvbnRlbnQtVHlwZScpKTtcblxuICAgIGlmICh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKSB7XG4gICAgICAgIGxpbmVzID0geGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoKG0gPSBsaW5lc1tpXS5tYXRjaCgvXFxzKihbXlxcc10rKTpcXHMrKFteXFxzXSspLykpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oZWFkZXJzW21bMV1dID0gbVsyXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaXNIdHRwRXJyb3IgPSB0aGlzLnN0YXR1cyA+PSA0MDA7XG59XG5cblJlc3BvbnNlLnByb3RvdHlwZS5oZWFkZXIgPSBSZXF1ZXN0LnByb3RvdHlwZS5oZWFkZXI7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBSZXNwb25zZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gV3JhcCBhIGZ1bmN0aW9uIGluIGEgYHNldFRpbWVvdXRgIGNhbGwuIFRoaXMgaXMgdXNlZCB0byBndWFyYW50ZWUgYXN5bmNcbi8vIGJlaGF2aW9yLCB3aGljaCBjYW4gYXZvaWQgdW5leHBlY3RlZCBlcnJvcnMuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyXG4gICAgICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSxcbiAgICAgICAgICAgIG5ld0Z1bmMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgc2V0VGltZW91dChuZXdGdW5jLCAwKTtcbiAgICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gQSBcIm9uY2VcIiB1dGlsaXR5LlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgcmVzdWx0LCBjYWxsZWQgPSBmYWxzZTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIWNhbGxlZCkge1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gd2luZG93LlhNTEh0dHBSZXF1ZXN0O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJvY2Vzc1JlcXVlc3Q6IGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgICAgcmVxLnVybCA9IHJlcS51cmwucmVwbGFjZSgvW14lXSsvZywgZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVVUkkocyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBqc29ucmVxdWVzdCA9IHJlcXVpcmUoJy4vanNvbnJlcXVlc3QnKSxcbiAgICBqc29ucmVzcG9uc2UgPSByZXF1aXJlKCcuL2pzb25yZXNwb25zZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcm9jZXNzUmVxdWVzdDogZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICBqc29ucmVxdWVzdC5wcm9jZXNzUmVxdWVzdC5jYWxsKHRoaXMsIHJlcSk7XG4gICAgICAgIGpzb25yZXNwb25zZS5wcm9jZXNzUmVxdWVzdC5jYWxsKHRoaXMsIHJlcSk7XG4gICAgfSxcbiAgICBwcm9jZXNzUmVzcG9uc2U6IGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAganNvbnJlc3BvbnNlLnByb2Nlc3NSZXNwb25zZS5jYWxsKHRoaXMsIHJlcyk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJvY2Vzc1JlcXVlc3Q6IGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgICAgdmFyXG4gICAgICAgICAgICBjb250ZW50VHlwZSA9IHJlcS5oZWFkZXIoJ0NvbnRlbnQtVHlwZScpLFxuICAgICAgICAgICAgaGFzSnNvbkNvbnRlbnRUeXBlID0gY29udGVudFR5cGUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL2pzb24nKSAhPT0gLTE7XG5cbiAgICAgICAgaWYgKGNvbnRlbnRUeXBlICE9IG51bGwgJiYgIWhhc0pzb25Db250ZW50VHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlcS5ib2R5KSB7XG4gICAgICAgICAgICBpZiAoIWNvbnRlbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgcmVxLmhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxLmJvZHkgPSBKU09OLnN0cmluZ2lmeShyZXEuYm9keSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcm9jZXNzUmVxdWVzdDogZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICB2YXIgYWNjZXB0ID0gcmVxLmhlYWRlcignQWNjZXB0Jyk7XG4gICAgICAgIGlmIChhY2NlcHQgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVxLmhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcHJvY2Vzc1Jlc3BvbnNlOiBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIC8vIENoZWNrIHRvIHNlZSBpZiB0aGUgY29udGVudHlwZSBpcyBcInNvbWV0aGluZy9qc29uXCIgb3JcbiAgICAgICAgLy8gXCJzb21ldGhpbmcvc29tZXRoaW5nZWxzZStqc29uXCJcbiAgICAgICAgaWYgKHJlcy5jb250ZW50VHlwZSAmJiAvXi4qXFwvKD86LipcXCspP2pzb24oO3wkKS9pLnRlc3QocmVzLmNvbnRlbnRUeXBlKSkge1xuICAgICAgICAgICAgdmFyIHJhdyA9IHR5cGVvZiByZXMuYm9keSA9PT0gJ3N0cmluZycgPyByZXMuYm9keSA6IHJlcy50ZXh0O1xuICAgICAgICAgICAgaWYgKHJhdykge1xuICAgICAgICAgICAgICAgIHJlcy5ib2R5ID0gSlNPTi5wYXJzZShyYXcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbiIsInZhciBodHRwID0gcmVxdWlyZShcImh0dHBwbGVhc2VcIik7XG52YXIgYXBpanMgPSByZXF1aXJlKFwidG50LmFwaVwiKTtcbnZhciBwcm9taXNlcyA9IHJlcXVpcmUoJ2h0dHBwbGVhc2UtcHJvbWlzZXMnKTtcbnZhciBQcm9taXNlID0gcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xudmFyIGpzb24gPSByZXF1aXJlKFwiaHR0cHBsZWFzZS9wbHVnaW5zL2pzb25cIik7XG5odHRwID0gaHR0cC51c2UoanNvbikudXNlKHByb21pc2VzKFByb21pc2UpKTtcblxudG50X2VSZXN0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBQcmVmaXhlcyB0byB1c2UgdGhlIFJFU1QgQVBJLlxuICAgIC8vIFRoZXNlIGFyZSBtb2RpZmllZCBpbiB0aGUgbG9jYWxSRVNUIHNldHRlclxuICAgIHZhciBwcmVmaXggPSBcImh0dHBzOi8vcmVzdC5lbnNlbWJsLm9yZ1wiO1xuICAgIHZhciBwcmVmaXhfcmVnaW9uID0gcHJlZml4ICsgXCIvb3ZlcmxhcC9yZWdpb24vXCI7XG4gICAgdmFyIHByZWZpeF9lbnNnZW5lID0gcHJlZml4ICsgXCIvbG9va3VwL2lkL1wiO1xuICAgIHZhciBwcmVmaXhfeHJlZiA9IHByZWZpeCArIFwiL3hyZWZzL3N5bWJvbC9cIjtcbiAgICB2YXIgcHJlZml4X2hvbW9sb2d1ZXMgPSBwcmVmaXggKyBcIi9ob21vbG9neS9pZC9cIjtcbiAgICB2YXIgcHJlZml4X2Nocl9pbmZvID0gcHJlZml4ICsgXCIvaW5mby9hc3NlbWJseS9cIjtcbiAgICB2YXIgcHJlZml4X2Fsbl9yZWdpb24gPSBwcmVmaXggKyBcIi9hbGlnbm1lbnQvcmVnaW9uL1wiO1xuICAgIHZhciBwcmVmaXhfZ2VuZV90cmVlID0gcHJlZml4ICsgXCIvZ2VuZXRyZWUvaWQvXCI7XG4gICAgdmFyIHByZWZpeF9hc3NlbWJseSA9IHByZWZpeCArIFwiL2luZm8vYXNzZW1ibHkvXCI7XG5cbiAgICAvLyBOdW1iZXIgb2YgY29ubmVjdGlvbnMgbWFkZSB0byB0aGUgZGF0YWJhc2VcbiAgICB2YXIgY29ubmVjdGlvbnMgPSAwO1xuXG4gICAgdmFyIGVSZXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgfTtcblxuICAgIC8vIExpbWl0cyBpbXBvc2VkIGJ5IHRoZSBlbnNlbWJsIFJFU1QgQVBJXG4gICAgZVJlc3QubGltaXRzID0ge1xuXHRyZWdpb24gOiA1MDAwMDAwXG4gICAgfTtcblxuICAgIHZhciBhcGkgPSBhcGlqcyAoZVJlc3QpO1xuXG5cbiAgICAvKiogPHN0cm9uZz5sb2NhbFJFU1Q8L3N0cm9uZz4gcG9pbnRzIHRoZSBxdWVyaWVzIHRvIGEgbG9jYWwgUkVTVCBzZXJ2aWNlIHRvIGRlYnVnLlxuXHRUT0RPOiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgcmVtb3ZlZCBpbiBcInByb2R1Y3Rpb25cIlxuICAgICovXG4gICAgYXBpLm1ldGhvZCAoJ2xvY2FsUkVTVCcsIGZ1bmN0aW9uKCkge1xuXHRwcmVmaXggPSBcImh0dHA6Ly8xMjcuMC4wLjE6MzAwMFwiO1xuXHRwcmVmaXhfcmVnaW9uID0gcHJlZml4ICsgXCIvb3ZlcmxhcC9yZWdpb24vXCI7XG5cdHByZWZpeF9lbnNnZW5lID0gcHJlZml4ICsgXCIvbG9va3VwL2lkL1wiO1xuXHRwcmVmaXhfeHJlZiA9IHByZWZpeCArIFwiL3hyZWZzL3N5bWJvbC9cIjtcblx0cHJlZml4X2hvbW9sb2d1ZXMgPSBwcmVmaXggKyBcIi9ob21vbG9neS9pZC9cIjtcblxuXHRyZXR1cm4gZVJlc3Q7XG4gICAgfSk7XG5cbiAgICAvKiogPHN0cm9uZz5jYWxsPC9zdHJvbmc+IG1ha2VzIGFuIGFzeW5jaHJvbm91cyBjYWxsIHRvIHRoZSBlbnNlbWJsIFJFU1Qgc2VydmljZS5cblx0QHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIEEgbGl0ZXJhbCBvYmplY3QgY29udGFpbmluZyB0aGUgZm9sbG93aW5nIGZpZWxkczpcblx0PHVsPlxuXHQ8bGk+dXJsID0+IFRoZSByZXN0IFVSTC4gVGhpcyBpcyByZXR1cm5lZCBieSB7QGxpbmsgZVJlc3QudXJsfTwvbGk+XG5cdDxsaT5zdWNjZXNzID0+IEEgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4gdGhlIFJFU1QgcXVlcnkgaXMgc3VjY2Vzc2Z1bCAoaS5lLiB0aGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGlzIGEgZGVmaW5lZCB2YWx1ZSBhbmQgbm8gZXJyb3IgaGFzIGJlZW4gcmV0dXJuZWQpPC9saT5cblx0PGxpPmVycm9yID0+IEEgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4gdGhlIFJFU1QgcXVlcnkgcmV0dXJucyBhbiBlcnJvclxuXHQ8L3VsPlxuICAgICovXG4gICAgYXBpLm1ldGhvZCAoJ2NhbGwnLCBmdW5jdGlvbiAobXl1cmwpIHtcblx0cmV0dXJuIGh0dHAuZ2V0KHtcblx0ICAgIFwidXJsXCI6IG15dXJsXG5cdH0pO1xuICAgIH0pO1xuICAgIC8vIGFwaS5tZXRob2QgKCdjYWxsJywgZnVuY3Rpb24gKG9iaikge1xuICAgIC8vIFx0dmFyIHVybCA9IG9iai51cmw7XG4gICAgLy8gXHR2YXIgb25fc3VjY2VzcyA9IG9iai5zdWNjZXNzO1xuICAgIC8vIFx0dmFyIG9uX2Vycm9yICAgPSBvYmouZXJyb3I7XG4gICAgLy8gXHRjb25uZWN0aW9ucysrO1xuICAgIC8vIFx0aHR0cC5nZXQoe1xuICAgIC8vIFx0ICAgIFwidXJsXCIgOiB1cmxcbiAgICAvLyBcdH0sIGZ1bmN0aW9uIChlcnJvciwgcmVzcCkge1xuICAgIC8vIFx0ICAgIGlmIChyZXNwICE9PSB1bmRlZmluZWQgJiYgZXJyb3IgPT0gbnVsbCAmJiBvbl9zdWNjZXNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBcdFx0b25fc3VjY2VzcyhKU09OLnBhcnNlKHJlc3AuYm9keSkpO1xuICAgIC8vIFx0ICAgIH1cbiAgICAvLyBcdCAgICBpZiAoZXJyb3IgIT09IG51bGwgJiYgb25fZXJyb3IgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIFx0XHRvbl9lcnJvcihlcnJvcik7XG4gICAgLy8gXHQgICAgfVxuICAgIC8vIFx0fSk7XG4gICAgLy8gfSk7XG5cblxuICAgIGVSZXN0LnVybCA9IHt9O1xuICAgIHZhciB1cmxfYXBpID0gYXBpanMgKGVSZXN0LnVybCk7XG5cdC8qKiBlUmVzdC51cmwuPHN0cm9uZz5yZWdpb248L3N0cm9uZz4gcmV0dXJucyB0aGUgZW5zZW1ibCBSRVNUIHVybCB0byByZXRyaWV2ZSB0aGUgZ2VuZXMgaW5jbHVkZWQgaW4gdGhlIHNwZWNpZmllZCByZWdpb25cblx0ICAgIEBwYXJhbSB7b2JqZWN0fSBvYmogLSBBbiBvYmplY3QgbGl0ZXJhbCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOjxiciAvPlxuPHVsPlxuPGxpPnNwZWNpZXMgOiBUaGUgc3BlY2llcyB0aGUgcmVnaW9uIHJlZmVycyB0bzwvbGk+XG48bGk+Y2hyICAgICA6IFRoZSBjaHIgKG9yIHNlcV9yZWdpb24gbmFtZSk8L2xpPlxuPGxpPmZyb20gICAgOiBUaGUgc3RhcnQgcG9zaXRpb24gb2YgdGhlIHJlZ2lvbiBpbiB0aGUgY2hyPC9saT5cbjxsaT50byAgICAgIDogVGhlIGVuZCBwb3NpdGlvbiBvZiB0aGUgcmVnaW9uIChmcm9tIDwgdG8gYWx3YXlzKTwvbGk+XG48L3VsPlxuICAgICAgICAgICAgQHJldHVybnMge3N0cmluZ30gLSBUaGUgdXJsIHRvIHF1ZXJ5IHRoZSBFbnNlbWJsIFJFU1Qgc2VydmVyLiBGb3IgYW4gZXhhbXBsZSBvZiBvdXRwdXQgb2YgdGhlc2UgdXJscyBzZWUgdGhlIHtAbGluayBodHRwOi8vYmV0YS5yZXN0LmVuc2VtYmwub3JnL2ZlYXR1cmUvcmVnaW9uL2hvbW9fc2FwaWVucy8xMzozMjg4OTYxMS0zMjk3MzgwNS5qc29uP2ZlYXR1cmU9Z2VuZXxFbnNlbWJsIFJFU1QgQVBJIGV4YW1wbGV9XG5cdCAgICBAZXhhbXBsZVxuZVJlc3QuY2FsbCAoIHVybCAgICAgOiBlUmVzdC51cmwucmVnaW9uICh7IHNwZWNpZXMgOiBcImhvbW9fc2FwaWVuc1wiLCBjaHIgOiBcIjEzXCIsIGZyb20gOiAzMjg4OTYxMSwgdG8gOiAzMjk3MzgwNSB9KSxcbiAgICAgICAgICAgICBzdWNjZXNzIDogY2FsbGJhY2ssXG4gICAgICAgICAgICAgZXJyb3IgICA6IGNhbGxiYWNrXG5cdCAgICk7XG5cdCAqL1xuICAgIHVybF9hcGkubWV0aG9kICgncmVnaW9uJywgZnVuY3Rpb24ob2JqKSB7XG5cdHJldHVybiBwcmVmaXhfcmVnaW9uICtcblx0ICAgIG9iai5zcGVjaWVzICtcblx0ICAgIFwiL1wiICtcblx0ICAgIG9iai5jaHIgK1xuXHQgICAgXCI6XCIgKyBcblx0ICAgIG9iai5mcm9tICsgXG5cdCAgICBcIi1cIiArIG9iai50byArIFxuXHQgICAgXCIuanNvbj9mZWF0dXJlPWdlbmVcIjtcbiAgICB9KTtcblxuXHQvKiogZVJlc3QudXJsLjxzdHJvbmc+c3BlY2llc19nZW5lPC9zdHJvbmc+IHJldHVybnMgdGhlIGVuc2VtYmwgUkVTVCB1cmwgdG8gcmV0cmlldmUgdGhlIGVuc2VtYmwgZ2VuZSBhc3NvY2lhdGVkIHdpdGhcblx0ICAgIHRoZSBnaXZlbiBuYW1lIGluIHRoZSBzcGVjaWZpZWQgc3BlY2llcy5cblx0ICAgIEBwYXJhbSB7b2JqZWN0fSBvYmogLSBBbiBvYmplY3QgbGl0ZXJhbCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOjxiciAvPlxuPHVsPlxuPGxpPnNwZWNpZXMgICA6IFRoZSBzcGVjaWVzIHRoZSByZWdpb24gcmVmZXJzIHRvPC9saT5cbjxsaT5nZW5lX25hbWUgOiBUaGUgbmFtZSBvZiB0aGUgZ2VuZTwvbGk+XG48L3VsPlxuICAgICAgICAgICAgQHJldHVybnMge3N0cmluZ30gLSBUaGUgdXJsIHRvIHF1ZXJ5IHRoZSBFbnNlbWJsIFJFU1Qgc2VydmVyLiBGb3IgYW4gZXhhbXBsZSBvZiBvdXRwdXQgb2YgdGhlc2UgdXJscyBzZWUgdGhlIHtAbGluayBodHRwOi8vYmV0YS5yZXN0LmVuc2VtYmwub3JnL3hyZWZzL3N5bWJvbC9odW1hbi9CUkNBMi5qc29uP29iamVjdF90eXBlPWdlbmV8RW5zZW1ibCBSRVNUIEFQSSBleGFtcGxlfVxuXHQgICAgQGV4YW1wbGVcbmVSZXN0LmNhbGwgKCB1cmwgICAgIDogZVJlc3QudXJsLnNwZWNpZXNfZ2VuZSAoeyBzcGVjaWVzIDogXCJodW1hblwiLCBnZW5lX25hbWUgOiBcIkJSQ0EyXCIgfSksXG4gICAgICAgICAgICAgc3VjY2VzcyA6IGNhbGxiYWNrLFxuICAgICAgICAgICAgIGVycm9yICAgOiBjYWxsYmFja1xuXHQgICApO1xuXHQgKi9cbiAgICB1cmxfYXBpLm1ldGhvZCAoJ3hyZWYnLCBmdW5jdGlvbiAob2JqKSB7XG5cdHJldHVybiBwcmVmaXhfeHJlZiArXG5cdCAgICBvYmouc3BlY2llcyAgK1xuXHQgICAgXCIvXCIgK1xuXHQgICAgb2JqLm5hbWUgK1xuXHQgICAgXCIuanNvbj9vYmplY3RfdHlwZT1nZW5lXCI7XG4gICAgfSk7XG5cblx0LyoqIGVSZXN0LnVybC48c3Ryb25nPmhvbW9sb2d1ZXM8L3N0cm9uZz4gcmV0dXJucyB0aGUgZW5zZW1ibCBSRVNUIHVybCB0byByZXRyaWV2ZSB0aGUgaG9tb2xvZ3VlcyAob3J0aG9sb2d1ZXMgKyBwYXJhbG9ndWVzKSBvZiB0aGUgZ2l2ZW4gZW5zZW1ibCBJRC5cblx0ICAgIEBwYXJhbSB7b2JqZWN0fSBvYmogLSBBbiBvYmplY3QgbGl0ZXJhbCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOjxiciAvPlxuPHVsPlxuPGxpPmlkIDogVGhlIEVuc2VtYmwgSUQgb2YgdGhlIGdlbmU8L2xpPlxuPC91bD5cbiAgICAgICAgICAgIEByZXR1cm5zIHtzdHJpbmd9IC0gVGhlIHVybCB0byBxdWVyeSB0aGUgRW5zZW1ibCBSRVNUIHNlcnZlci4gRm9yIGFuIGV4YW1wbGUgb2Ygb3V0cHV0IG9mIHRoZXNlIHVybHMgc2VlIHRoZSB7QGxpbmsgaHR0cDovL2JldGEucmVzdC5lbnNlbWJsLm9yZy9ob21vbG9neS9pZC9FTlNHMDAwMDAxMzk2MTguanNvbj9mb3JtYXQ9Y29uZGVuc2VkO3NlcXVlbmNlPW5vbmU7dHlwZT1hbGx8RW5zZW1ibCBSRVNUIEFQSSBleGFtcGxlfVxuXHQgICAgQGV4YW1wbGVcbmVSZXN0LmNhbGwgKCB1cmwgICAgIDogZVJlc3QudXJsLmhvbW9sb2d1ZXMgKHsgaWQgOiBcIkVOU0cwMDAwMDEzOTYxOFwiIH0pLFxuICAgICAgICAgICAgIHN1Y2Nlc3MgOiBjYWxsYmFjayxcbiAgICAgICAgICAgICBlcnJvciAgIDogY2FsbGJhY2tcblx0ICAgKTtcblx0ICovXG4gICAgdXJsX2FwaS5tZXRob2QgKCdob21vbG9ndWVzJywgZnVuY3Rpb24ob2JqKSB7XG5cdHJldHVybiBwcmVmaXhfaG9tb2xvZ3VlcyArXG5cdCAgICBvYmouaWQgKyBcblx0ICAgIFwiLmpzb24/Zm9ybWF0PWNvbmRlbnNlZDtzZXF1ZW5jZT1ub25lO3R5cGU9YWxsXCI7XG4gICAgfSk7XG5cblx0LyoqIGVSZXN0LnVybC48c3Ryb25nPmdlbmU8L3N0cm9uZz4gcmV0dXJucyB0aGUgZW5zZW1ibCBSRVNUIHVybCB0byByZXRyaWV2ZSB0aGUgZW5zZW1ibCBnZW5lIGFzc29jaWF0ZWQgd2l0aFxuXHQgICAgdGhlIGdpdmVuIElEXG5cdCAgICBAcGFyYW0ge29iamVjdH0gb2JqIC0gQW4gb2JqZWN0IGxpdGVyYWwgd2l0aCB0aGUgZm9sbG93aW5nIGZpZWxkczo8YnIgLz5cbjx1bD5cbjxsaT5pZCA6IFRoZSBuYW1lIG9mIHRoZSBnZW5lPC9saT5cbjxsaT5leHBhbmQgOiBpZiB0cmFuc2NyaXB0cyBzaG91bGQgYmUgaW5jbHVkZWQgaW4gdGhlIHJlc3BvbnNlIChkZWZhdWx0IHRvIDApPC9saT5cbjwvdWw+XG4gICAgICAgICAgICBAcmV0dXJucyB7c3RyaW5nfSAtIFRoZSB1cmwgdG8gcXVlcnkgdGhlIEVuc2VtYmwgUkVTVCBzZXJ2ZXIuIEZvciBhbiBleGFtcGxlIG9mIG91dHB1dCBvZiB0aGVzZSB1cmxzIHNlZSB0aGUge0BsaW5rIGh0dHA6Ly9iZXRhLnJlc3QuZW5zZW1ibC5vcmcvbG9va3VwL0VOU0cwMDAwMDEzOTYxOC5qc29uP2Zvcm1hdD1mdWxsfEVuc2VtYmwgUkVTVCBBUEkgZXhhbXBsZX1cblx0ICAgIEBleGFtcGxlXG5lUmVzdC5jYWxsICggdXJsICAgICA6IGVSZXN0LnVybC5nZW5lICh7IGlkIDogXCJFTlNHMDAwMDAxMzk2MThcIiB9KSxcbiAgICAgICAgICAgICBzdWNjZXNzIDogY2FsbGJhY2ssXG4gICAgICAgICAgICAgZXJyb3IgICA6IGNhbGxiYWNrXG5cdCAgICk7XG5cdCAqL1xuICAgIHVybF9hcGkubWV0aG9kICgnZ2VuZScsIGZ1bmN0aW9uKG9iaikge1xuXHR2YXIgdXJsID0gcHJlZml4X2Vuc2dlbmUgKyBvYmouaWQgKyBcIi5qc29uP2Zvcm1hdD1mdWxsXCI7XG5cdGlmIChvYmouZXhwYW5kICYmIG9iai5leHBhbmQgPT09IDEpIHtcblx0ICAgIHVybCA9IHVybCArIFwiJmV4cGFuZD0xXCI7XG5cdH1cblx0cmV0dXJuIHVybDtcbiAgICB9KTtcblxuXHQvKiogZVJlc3QudXJsLjxzdHJvbmc+Y2hyX2luZm88L3N0cm9uZz4gcmV0dXJucyB0aGUgZW5zZW1ibCBSRVNUIHVybCB0byByZXRyaWV2ZSB0aGUgaW5mb3JtYXRpb24gYXNzb2NpYXRlZCB3aXRoIHRoZSBjaHJvbW9zb21lIChzZXFfcmVnaW9uIGluIEVuc2VtYmwgbm9tZW5jbGF0dXJlKS5cblx0ICAgIEBwYXJhbSB7b2JqZWN0fSBvYmogLSBBbiBvYmplY3QgbGl0ZXJhbCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOjxiciAvPlxuPHVsPlxuPGxpPnNwZWNpZXMgOiBUaGUgc3BlY2llcyB0aGUgY2hyIChvciBzZXFfcmVnaW9uKSBiZWxvbmdzIHRvXG48bGk+Y2hyICAgICA6IFRoZSBuYW1lIG9mIHRoZSBjaHIgKG9yIHNlcV9yZWdpb24pPC9saT5cbjwvdWw+XG4gICAgICAgICAgICBAcmV0dXJucyB7c3RyaW5nfSAtIFRoZSB1cmwgdG8gcXVlcnkgdGhlIEVuc2VtYmwgUkVTVCBzZXJ2ZXIuIEZvciBhbiBleGFtcGxlIG9mIG91dHB1dCBvZiB0aGVzZSB1cmxzIHNlZSB0aGUge0BsaW5rIGh0dHA6Ly9iZXRhLnJlc3QuZW5zZW1ibC5vcmcvYXNzZW1ibHkvaW5mby9ob21vX3NhcGllbnMvMTMuanNvbj9mb3JtYXQ9ZnVsbHxFbnNlbWJsIFJFU1QgQVBJIGV4YW1wbGV9XG5cdCAgICBAZXhhbXBsZVxuZVJlc3QuY2FsbCAoIHVybCAgICAgOiBlUmVzdC51cmwuY2hyX2luZm8gKHsgc3BlY2llcyA6IFwiaG9tb19zYXBpZW5zXCIsIGNociA6IFwiMTNcIiB9KSxcbiAgICAgICAgICAgICBzdWNjZXNzIDogY2FsbGJhY2ssXG4gICAgICAgICAgICAgZXJyb3IgICA6IGNhbGxiYWNrXG5cdCAgICk7XG5cdCAqL1xuICAgIHVybF9hcGkubWV0aG9kICgnY2hyX2luZm8nLCBmdW5jdGlvbihvYmopIHtcblx0cmV0dXJuIHByZWZpeF9jaHJfaW5mbyArXG5cdCAgICBvYmouc3BlY2llcyArXG5cdCAgICBcIi9cIiArXG5cdCAgICBvYmouY2hyICtcblx0ICAgIFwiLmpzb24/Zm9ybWF0PWZ1bGxcIjtcbiAgICB9KTtcblxuXHQvLyBUT0RPOiBGb3Igbm93LCBpdCBvbmx5IHdvcmtzIHdpdGggc3BlY2llc19zZXQgYW5kIG5vdCBzcGVjaWVzX3NldF9ncm91cHNcblx0Ly8gU2hvdWxkIGJlIGV4dGVuZGVkIGZvciB3aWRlciB1c2VcbiAgICB1cmxfYXBpLm1ldGhvZCAoJ2Fsbl9ibG9jaycsIGZ1bmN0aW9uIChvYmopIHtcblx0dmFyIHVybCA9IHByZWZpeF9hbG5fcmVnaW9uICsgXG5cdCAgICBvYmouc3BlY2llcyArXG5cdCAgICBcIi9cIiArXG5cdCAgICBvYmouY2hyICtcblx0ICAgIFwiOlwiICtcblx0ICAgIG9iai5mcm9tICtcblx0ICAgIFwiLVwiICtcblx0ICAgIG9iai50byArXG5cdCAgICBcIi5qc29uP21ldGhvZD1cIiArXG5cdCAgICBvYmoubWV0aG9kO1xuXG5cdGZvciAodmFyIGk9MDsgaTxvYmouc3BlY2llc19zZXQubGVuZ3RoOyBpKyspIHtcblx0ICAgIHVybCArPSBcIiZzcGVjaWVzX3NldD1cIiArIG9iai5zcGVjaWVzX3NldFtpXTtcblx0fVxuXG5cdHJldHVybiB1cmw7XG4gICAgfSk7XG5cbiAgICB1cmxfYXBpLm1ldGhvZCAoJ2dlbmVfdHJlZScsIGZ1bmN0aW9uIChvYmopIHtcblx0cmV0dXJuIHByZWZpeF9nZW5lX3RyZWUgK1xuXHQgICAgb2JqLmlkICsgXG5cdCAgICBcIi5qc29uP3NlcXVlbmNlPVwiICtcblx0ICAgICgob2JqLnNlcXVlbmNlIHx8IG9iai5hbGlnbmVkKSA/IDEgOiBcIm5vbmVcIikgK1xuXHQgICAgKG9iai5hbGlnbmVkID8gJyZhbGlnbmVkPTEnIDogJycpO1xuICAgIH0pO1xuXG4gICAgdXJsX2FwaS5tZXRob2QoJ2Fzc2VtYmx5JywgZnVuY3Rpb24gKG9iaikge1xuXHRyZXR1cm4gcHJlZml4X2Fzc2VtYmx5ICsgXG5cdCAgICBvYmouc3BlY2llcyArXG5cdCAgICBcIi5qc29uXCI7XG4gICAgfSk7XG5cblxuICAgIGFwaS5tZXRob2QgKCdjb25uZWN0aW9ucycsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gY29ubmVjdGlvbnM7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZVJlc3Q7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfZVJlc3Q7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvb2x0aXAgPSByZXF1aXJlKFwiLi9zcmMvdG9vbHRpcC5qc1wiKTtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUoXCJ0bnQuYXBpXCIpO1xuXG52YXIgdG9vbHRpcCA9IGZ1bmN0aW9uICgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBkcmFnID0gZDMuYmVoYXZpb3IuZHJhZygpO1xuICAgIHZhciB0b29sdGlwX2RpdjtcblxuICAgIHZhciBjb25mID0ge1xuXHRiYWNrZ3JvdW5kX2NvbG9yIDogXCJ3aGl0ZVwiLFxuXHRmb3JlZ3JvdW5kX2NvbG9yIDogXCJibGFja1wiLFxuXHRwb3NpdGlvbiA6IFwicmlnaHRcIixcblx0YWxsb3dfZHJhZyA6IHRydWUsXG5cdHNob3dfY2xvc2VyIDogdHJ1ZSxcblx0ZmlsbCA6IGZ1bmN0aW9uICgpIHsgdGhyb3cgXCJmaWxsIGlzIG5vdCBkZWZpbmVkIGluIHRoZSBiYXNlIG9iamVjdFwiOyB9LFxuXHR3aWR0aCA6IDE4MCxcblx0aWQgOiAxXG4gICAgfTtcblxuICAgIHZhciB0ID0gZnVuY3Rpb24gKGRhdGEsIGV2ZW50KSB7XG5cdGRyYWdcblx0ICAgIC5vcmlnaW4oZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4ge3g6cGFyc2VJbnQoZDMuc2VsZWN0KHRoaXMpLnN0eWxlKFwibGVmdFwiKSksXG5cdFx0XHR5OnBhcnNlSW50KGQzLnNlbGVjdCh0aGlzKS5zdHlsZShcInRvcFwiKSlcblx0XHQgICAgICAgfTtcblx0ICAgIH0pXG5cdCAgICAub24oXCJkcmFnXCIsIGZ1bmN0aW9uKCkge1xuXHRcdGlmIChjb25mLmFsbG93X2RyYWcpIHtcblx0XHQgICAgZDMuc2VsZWN0KHRoaXMpXG5cdFx0XHQuc3R5bGUoXCJsZWZ0XCIsIGQzLmV2ZW50LnggKyBcInB4XCIpXG5cdFx0XHQuc3R5bGUoXCJ0b3BcIiwgZDMuZXZlbnQueSArIFwicHhcIik7XG5cdFx0fVxuXHQgICAgfSk7XG5cblx0Ly8gVE9ETzogV2h5IGRvIHdlIG5lZWQgdGhlIGRpdiBlbGVtZW50P1xuXHQvLyBJdCBsb29rcyBsaWtlIGlmIHdlIGFuY2hvciB0aGUgdG9vbHRpcCBpbiB0aGUgXCJib2R5XCJcblx0Ly8gVGhlIHRvb2x0aXAgaXMgbm90IGxvY2F0ZWQgaW4gdGhlIHJpZ2h0IHBsYWNlIChhcHBlYXJzIGF0IHRoZSBib3R0b20pXG5cdC8vIFNlZSBjbGllbnRzL3Rvb2x0aXBzX3Rlc3QuaHRtbCBmb3IgYW4gZXhhbXBsZVxuXHR2YXIgY29udGFpbmVyRWxlbSA9IHNlbGVjdEFuY2VzdG9yICh0aGlzLCBcImRpdlwiKTtcblx0aWYgKGNvbnRhaW5lckVsZW0gPT09IHVuZGVmaW5lZCkge1xuXHQgICAgLy8gV2UgcmVxdWlyZSBhIGRpdiBlbGVtZW50IGF0IHNvbWUgcG9pbnQgdG8gYW5jaG9yIHRoZSB0b29sdGlwXG5cdCAgICByZXR1cm47XG5cdH1cblxuXHQvLyBDb250YWluZXIgZWxlbWVudCBwb3NpdGlvbiAobmVlZGVkIGZvciBcInJlbGF0aXZlXCIgcG9zaXRpb25lZCBwYXJlbnRzKVxuXHR2YXIgZWxlbVBvcyA9IGNvbnRhaW5lckVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdHZhciBlbGVtVG9wID0gZWxlbVBvcy50b3AgKyBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcDtcblx0dmFyIGVsZW1MZWZ0ID0gZWxlbVBvcy5sZWZ0ICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0O1xuXHRcblx0dG9vbHRpcF9kaXYgPSBkMy5zZWxlY3QoY29udGFpbmVyRWxlbSlcblx0ICAgIC5hcHBlbmQoXCJkaXZcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfdG9vbHRpcFwiKVxuXHQgICAgLmNsYXNzZWQoXCJ0bnRfdG9vbHRpcF9hY3RpdmVcIiwgdHJ1ZSkgIC8vIFRPRE86IElzIHRoaXMgbmVlZGVkL3VzZWQ/Pz9cblx0ICAgIC5jYWxsKGRyYWcpO1xuXG5cdC8vIHByZXYgdG9vbHRpcHMgd2l0aCB0aGUgc2FtZSBoZWFkZXJcblx0ZDMuc2VsZWN0KFwiI3RudF90b29sdGlwX1wiICsgY29uZi5pZCkucmVtb3ZlKCk7XG5cblx0aWYgKChkMy5ldmVudCA9PT0gbnVsbCkgJiYgKGV2ZW50KSkge1xuXHQgICAgZDMuZXZlbnQgPSBldmVudDtcblx0fVxuXHR2YXIgbW91c2UgPSBbZDMuZXZlbnQucGFnZVgsIGQzLmV2ZW50LnBhZ2VZXTtcblx0ZDMuZXZlbnQgPSBudWxsO1xuXG5cdHZhciBvZmZzZXQgPSAwO1xuXHRpZiAoY29uZi5wb3NpdGlvbiA9PT0gXCJsZWZ0XCIpIHtcblx0ICAgIG9mZnNldCA9IGNvbmYud2lkdGg7XG5cdH1cblx0XG5cdHRvb2x0aXBfZGl2LmF0dHIoXCJpZFwiLCBcInRudF90b29sdGlwX1wiICsgY29uZi5pZCk7XG5cdFxuXHQvLyBXZSBwbGFjZSB0aGUgdG9vbHRpcFxuXHR0b29sdGlwX2RpdlxuXHQgICAgLnN0eWxlKFwibGVmdFwiLCAobW91c2VbMF0gLSBvZmZzZXQgLSBlbGVtTGVmdCkgKyBcInB4XCIpXG5cdCAgICAuc3R5bGUoXCJ0b3BcIiwgbW91c2VbMV0gLSBlbGVtVG9wICsgXCJweFwiKTtcblxuXHQvLyBDbG9zZVxuXHRpZiAoY29uZi5zaG93X2Nsb3Nlcikge1xuXHQgICAgdG9vbHRpcF9kaXYuYXBwZW5kKFwic3BhblwiKVxuXHRcdC5zdHlsZShcInBvc2l0aW9uXCIsIFwiYWJzb2x1dGVcIilcblx0XHQuc3R5bGUoXCJyaWdodFwiLCBcIi0xMHB4XCIpXG5cdFx0LnN0eWxlKFwidG9wXCIsIFwiLTEwcHhcIilcblx0XHQuYXBwZW5kKFwiaW1nXCIpXG5cdFx0LmF0dHIoXCJzcmNcIiwgdG9vbHRpcC5pbWFnZXMuY2xvc2UpXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCBcIjIwcHhcIilcblx0XHQuYXR0cihcImhlaWdodFwiLCBcIjIwcHhcIilcblx0XHQub24oXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XG5cdFx0ICAgIHQuY2xvc2UoKTtcblx0XHR9KTtcblx0fVxuXG5cdGNvbmYuZmlsbC5jYWxsKHRvb2x0aXBfZGl2LCBkYXRhKTtcblxuXHQvLyByZXR1cm4gdGhpcyBoZXJlP1xuXHRyZXR1cm4gdDtcbiAgICB9O1xuXG4gICAgLy8gZ2V0cyB0aGUgZmlyc3QgYW5jZXN0b3Igb2YgZWxlbSBoYXZpbmcgdGFnbmFtZSBcInR5cGVcIlxuICAgIC8vIGV4YW1wbGUgOiB2YXIgbXlkaXYgPSBzZWxlY3RBbmNlc3RvcihteWVsZW0sIFwiZGl2XCIpO1xuICAgIGZ1bmN0aW9uIHNlbGVjdEFuY2VzdG9yIChlbGVtLCB0eXBlKSB7XG5cdHR5cGUgPSB0eXBlLnRvTG93ZXJDYXNlKCk7XG5cdGlmIChlbGVtLnBhcmVudE5vZGUgPT09IG51bGwpIHtcblx0ICAgIGNvbnNvbGUubG9nKFwiTm8gbW9yZSBwYXJlbnRzXCIpO1xuXHQgICAgcmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXHR2YXIgdGFnTmFtZSA9IGVsZW0ucGFyZW50Tm9kZS50YWdOYW1lO1xuXG5cdGlmICgodGFnTmFtZSAhPT0gdW5kZWZpbmVkKSAmJiAodGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSB0eXBlKSkge1xuXHQgICAgcmV0dXJuIGVsZW0ucGFyZW50Tm9kZTtcblx0fSBlbHNlIHtcblx0ICAgIHJldHVybiBzZWxlY3RBbmNlc3RvciAoZWxlbS5wYXJlbnROb2RlLCB0eXBlKTtcblx0fVxuICAgIH1cbiAgICBcbiAgICB2YXIgYXBpID0gYXBpanModClcblx0LmdldHNldChjb25mKTtcbiAgICBhcGkuY2hlY2soJ3Bvc2l0aW9uJywgZnVuY3Rpb24gKHZhbCkge1xuXHRyZXR1cm4gKHZhbCA9PT0gJ2xlZnQnKSB8fCAodmFsID09PSAncmlnaHQnKTtcbiAgICB9LCBcIk9ubHkgJ2xlZnQnIG9yICdyaWdodCcgdmFsdWVzIGFyZSBhbGxvd2VkIGZvciBwb3NpdGlvblwiKTtcblxuICAgIGFwaS5tZXRob2QoJ2Nsb3NlJywgZnVuY3Rpb24gKCkge1xuXHR0b29sdGlwX2Rpdi5yZW1vdmUoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0O1xufTtcblxudG9vbHRpcC50YWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyB0YWJsZSB0b29sdGlwcyBhcmUgYmFzZWQgb24gZ2VuZXJhbCB0b29sdGlwc1xuICAgIHZhciB0ID0gdG9vbHRpcCgpO1xuICAgIFxuICAgIHZhciB3aWR0aCA9IDE4MDtcblxuICAgIHQuZmlsbCAoZnVuY3Rpb24gKG9iaikge1xuXHR2YXIgdG9vbHRpcF9kaXYgPSB0aGlzO1xuXG5cdHZhciBvYmpfaW5mb190YWJsZSA9IHRvb2x0aXBfZGl2XG5cdCAgICAuYXBwZW5kKFwidGFibGVcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVcIilcblx0ICAgIC5hdHRyKFwiYm9yZGVyXCIsIFwic29saWRcIilcblx0ICAgIC5zdHlsZShcIndpZHRoXCIsIHQud2lkdGgoKSArIFwicHhcIik7XG5cblx0Ly8gVG9vbHRpcCBoZWFkZXJcblx0b2JqX2luZm9fdGFibGVcblx0ICAgIC5hcHBlbmQoXCJ0clwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9oZWFkZXJcIilcblx0ICAgIC5hcHBlbmQoXCJ0aFwiKVxuXHQgICAgLmF0dHIoXCJjb2xzcGFuXCIsIDIpXG5cdCAgICAudGV4dChvYmouaGVhZGVyKTtcblxuXHQvLyBUb29sdGlwIHJvd3Ncblx0dmFyIHRhYmxlX3Jvd3MgPSBvYmpfaW5mb190YWJsZS5zZWxlY3RBbGwoXCIudG50X3ptZW51X3Jvd1wiKVxuXHQgICAgLmRhdGEob2JqLnJvd3MpXG5cdCAgICAuZW50ZXIoKVxuXHQgICAgLmFwcGVuZChcInRyXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51X3Jvd1wiKTtcblxuXHR0YWJsZV9yb3dzXG5cdCAgICAuYXBwZW5kKFwidGhcIilcblx0ICAgIC5odG1sKGZ1bmN0aW9uKGQsaSkge1xuXHRcdHJldHVybiBvYmoucm93c1tpXS5sYWJlbDtcblx0ICAgIH0pO1xuXG5cdHRhYmxlX3Jvd3Ncblx0ICAgIC5hcHBlbmQoXCJ0ZFwiKVxuXHQgICAgLmh0bWwoZnVuY3Rpb24oZCxpKSB7XG5cdFx0cmV0dXJuIG9iai5yb3dzW2ldLnZhbHVlO1xuXHQgICAgfSlcblx0ICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG5cdFx0aWYgKGQubGluayA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0ICAgIHJldHVybjtcblx0XHR9XG5cdFx0ZDMuc2VsZWN0KHRoaXMpXG5cdFx0ICAgIC5jbGFzc2VkKFwibGlua1wiLCAxKVxuXHRcdCAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24gKGQpIHtcblx0XHRcdGQubGluayhkLm9iaik7XG5cdFx0XHR0LmNsb3NlLmNhbGwodGhpcyk7XG5cdFx0ICAgIH0pO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdDtcbn07XG5cbnRvb2x0aXAucGxhaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gcGxhaW4gdG9vbHRpcHMgYXJlIGJhc2VkIG9uIGdlbmVyYWwgdG9vbHRpcHNcbiAgICB2YXIgdCA9IHRvb2x0aXAoKTtcblxuICAgIHQuZmlsbCAoZnVuY3Rpb24gKG9iaikge1xuXHR2YXIgdG9vbHRpcF9kaXYgPSB0aGlzO1xuXG5cdHZhciBvYmpfaW5mb190YWJsZSA9IHRvb2x0aXBfZGl2XG5cdCAgICAuYXBwZW5kKFwidGFibGVcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVcIilcblx0ICAgIC5hdHRyKFwiYm9yZGVyXCIsIFwic29saWRcIilcblx0ICAgIC5zdHlsZShcIndpZHRoXCIsIHQud2lkdGgoKSArIFwicHhcIik7XG5cblx0b2JqX2luZm9fdGFibGVcblx0ICAgIC5hcHBlbmQoXCJ0clwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9oZWFkZXJcIilcblx0ICAgIC5hcHBlbmQoXCJ0aFwiKVxuXHQgICAgLnRleHQob2JqLmhlYWRlcik7XG5cblx0b2JqX2luZm9fdGFibGVcblx0ICAgIC5hcHBlbmQoXCJ0clwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9yb3dcIilcblx0ICAgIC5hcHBlbmQoXCJ0ZFwiKVxuXHQgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLCBcImNlbnRlclwiKVxuXHQgICAgLmh0bWwob2JqLmJvZHkpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHQ7XG59O1xuXG4vLyBUT0RPOiBUaGlzIHNob3VsZG4ndCBiZSBleHBvc2VkIGluIHRoZSBBUEkuIEl0IHdvdWxkIGJlIGJldHRlciB0byBoYXZlIGFzIGEgbG9jYWwgdmFyaWFibGVcbi8vIG9yIGFsdGVybmF0aXZlbHkgaGF2ZSB0aGUgaW1hZ2VzIHNvbWV3aGVyZSBlbHNlIChhbHRob3VnaCB0aGUgbnVtYmVyIG9mIGhhcmRjb2RlZCBpbWFnZXMgc2hvdWxkIGJlIGxlZnQgYXQgYSBtaW5pbXVtKVxudG9vbHRpcC5pbWFnZXMgPSB7fTtcbnRvb2x0aXAuaW1hZ2VzLmNsb3NlID0gJ2RhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBUUFBQUFFQUNBWUFBQUJjY3FobUFBQUtRMmxEUTFCSlEwTWdjSEp2Wm1sc1pRQUFlTnFkVTNkWWsvY1dQdC8zWlE5V1F0andzWmRzZ1FBaUk2d0l5QkJab2hDU0FHR0VFQkpBeFlXSUNsWVVGUkdjU0ZYRWd0VUtTSjJJNHFBb3VHZEJpb2hhaTFWY09PNGYzS2UxZlhydjdlMzcxL3U4NTV6bi9NNTV6dytBRVJJbWtlYWlhZ0E1VW9VOE90Z2ZqMDlJeE1tOWdBSVZTT0FFSUJEbXk4Sm5CY1VBQVBBRGVYaCtkTEEvL0FHdmJ3QUNBSERWTGlRU3grSC9nN3BRSmxjQUlKRUE0Q0lTNXdzQmtGSUF5QzVVeUJRQXlCZ0FzRk96WkFvQWxBQUFiSGw4UWlJQXFnMEE3UFJKUGdVQTJLbVQzQmNBMktJY3FRZ0FqUUVBbVNoSEpBSkF1d0JnVllGU0xBTEF3Z0NnckVBaUxnVEFyZ0dBV2JZeVJ3S0F2UVVBZG81WWtBOUFZQUNBbVVJc3pBQWdPQUlBUXg0VHpRTWdUQU9nTU5LLzRLbGZjSVc0U0FFQXdNdVZ6WmRMMGpNVXVKWFFHbmZ5OE9EaUllTENiTEZDWVJjcEVHWUo1Q0tjbDVzakUwam5BMHpPREFBQUd2blJ3ZjQ0UDVEbjV1VGg1bWJuYk8vMHhhTCthL0J2SWo0aDhkLyt2SXdDQkFBUVRzL3YybC9sNWRZRGNNY0JzSFcvYTZsYkFOcFdBR2pmK1YwejJ3bWdXZ3JRZXZtTGVUajhRQjZlb1ZESVBCMGNDZ3NMN1NWaW9iMHc0NHMrL3pQaGIrQ0xmdmI4UUI3KzIzcndBSEdhUUptdHdLT0QvWEZoYm5hdVVvN255d1JDTVc3MzV5UCt4NFYvL1k0cDBlSTBzVndzRllyeFdJbTRVQ0pOeDNtNVVwRkVJY21WNGhMcGZ6THhINWI5Q1pOM0RRQ3Noay9BVHJZSHRjdHN3SDd1QVFLTERsalNkZ0JBZnZNdGpCb0xrUUFRWnpReWVmY0FBSk8vK1k5QUt3RUF6WmVrNHdBQXZPZ1lYS2lVRjB6R0NBQUFSS0NCS3JCQkJ3ekJGS3pBRHB6QkhiekFGd0poQmtSQURDVEFQQkJDQnVTQUhBcWhHSlpCR1ZUQU90Z0V0YkFER3FBUm11RVF0TUV4T0EzbjRCSmNnZXR3RndaZ0dKN0NHTHlHQ1FSQnlBZ1RZU0U2aUJGaWp0Z2l6Z2dYbVk0RUltRklOSktBcENEcGlCUlJJc1hJY3FRQ3FVSnFrVjFJSS9JdGNoUTVqVnhBK3BEYnlDQXlpdnlLdkVjeGxJR3lVUVBVQW5WQXVhZ2ZHb3JHb0hQUmREUVBYWUNXb212UkdyUWVQWUMyb3FmUlMraDFkQUI5aW81amdORXhEbWFNMldGY2pJZEZZSWxZR2liSEZtUGxXRFZXanpWakhWZzNkaFVid0o1aDd3Z2tBb3VBRSt3SVhvUVF3bXlDa0pCSFdFeFlRNmdsN0NPMEVyb0lWd21EaERIQ0p5S1RxRSswSlhvUytjUjRZanF4a0ZoR3JDYnVJUjRobmlWZUp3NFRYNU5JSkE3Smt1Uk9DaUVsa0RKSkMwbHJTTnRJTGFSVHBEN1NFR21jVENicmtHM0ozdVFJc29Dc0lKZVJ0NUFQa0UrUys4bkQ1TGNVT3NXSTRrd0pvaVJTcEpRU1NqVmxQK1VFcFo4eVFwbWdxbEhOcVo3VUNLcUlPcDlhU1cyZ2RsQXZVNGVwRXpSMW1pWE5teFpEeTZRdG85WFFtbWxuYWZkb0wrbDB1Z25kZ3g1Rmw5Q1gwbXZvQitubjZZUDBkd3dOaGcyRHgwaGlLQmxyR1hzWnB4aTNHUytaVEtZRjA1ZVp5RlF3MXpJYm1XZVlENWh2VlZncTlpcDhGWkhLRXBVNmxWYVZmcFhucWxSVmMxVS8xWG1xQzFTclZRK3JYbFo5cGtaVnMxRGpxUW5VRnF2VnFSMVZ1NmsycnM1U2QxS1BVTTlSWDZPK1gvMkMrbU1Oc29hRlJxQ0dTS05VWTdmR0dZMGhGc1l5WmZGWVF0WnlWZ1ByTEd1WVRXSmJzdm5zVEhZRit4dDJMM3RNVTBOenFtYXNacEZtbmVaeHpRRU94ckhnOERuWm5Fck9JYzROem5zdEF5MC9MYkhXYXExbXJYNnROOXA2MnI3YVl1MXk3UmJ0NjlydmRYQ2RRSjBzbmZVNmJUcjNkUW02TnJwUnVvVzYyM1hQNmo3VFkrdDU2UW4xeXZVTzZkM1JSL1Z0OUtQMUYrcnYxdS9SSHpjd05BZzJrQmxzTVRoajhNeVFZK2hybUdtNDBmQ0U0YWdSeTJpNmtjUm9vOUZKb3llNEp1NkhaK00xZUJjK1pxeHZIR0tzTk41bDNHczhZV0pwTXR1a3hLVEY1TDRwelpScm1tYTYwYlRUZE16TXlDemNyTmlzeWV5T09kV2NhNTVodnRtODIveU5oYVZGbk1WS2l6YUx4NWJhbG56TEJaWk5sdmVzbUZZK1ZubFc5VmJYckVuV1hPc3M2MjNXVjJ4UUcxZWJESnM2bTh1MnFLMmJyY1IybTIzZkZPSVVqeW5TS2ZWVGJ0b3g3UHpzQ3V5YTdBYnRPZlpoOWlYMmJmYlBIY3djRWgzV08zUTdmSEowZGN4MmJIQzg2NlRoTk1PcHhLbkQ2VmRuRzJlaGM1M3pOUmVtUzVETEVwZDJseGRUYmFlS3AyNmZlc3VWNVJydXV0SzEwL1dqbTd1YjNLM1piZFRkekQzRmZhdjdUUzZiRzhsZHd6M3ZRZlR3OTFqaWNjempuYWVicDhMemtPY3ZYblplV1Y3N3ZSNVBzNXdtbnRZd2JjamJ4RnZndmN0N1lEbytQV1g2enVrRFBzWStBcDk2bjRlK3ByNGkzejIrSTM3V2ZwbCtCL3llK3p2NnkvMlArTC9oZWZJVzhVNEZZQUhCQWVVQnZZRWFnYk1EYXdNZkJKa0VwUWMxQlkwRnV3WXZERDRWUWd3SkRWa2ZjcE52d0JmeUcvbGpNOXhuTEpyUkZjb0luUlZhRy9vd3pDWk1IdFlSam9iUENOOFFmbSttK1V6cHpMWUlpT0JIYklpNEgya1ptUmY1ZlJRcEtqS3FMdXBSdEZOMGNYVDNMTmFzNUZuN1o3Mk84WStwakxrNzIycTJjblpuckdwc1VteGo3SnU0Z0xpcXVJRjRoL2hGOFpjU2RCTWtDZTJKNU1UWXhEMko0M01DNTJ5YU01emttbFNXZEdPdTVkeWl1UmZtNmM3TG5uYzhXVFZaa0h3NGhaZ1NsN0kvNVlNZ1FsQXZHRS9scDI1TkhSUHloSnVGVDBXK29vMmlVYkczdUVvOGt1YWRWcFgyT04wN2ZVUDZhSVpQUm5YR013bFBVaXQ1a1JtU3VTUHpUVlpFMXQ2c3o5bHgyUzA1bEp5VW5LTlNEV21XdEN2WE1MY290MDltS3l1VERlUjU1bTNLRzVPSHl2ZmtJL2x6ODlzVmJJVk0wYU8wVXE1UURoWk1MNmdyZUZzWVczaTRTTDFJV3RRejMyYis2dmtqQzRJV2ZMMlFzRkM0c0xQWXVIaFo4ZUFpdjBXN0ZpT0xVeGQzTGpGZFVycGtlR253MG4zTGFNdXlsdjFRNGxoU1ZmSnFlZHp5amxLRDBxV2xReXVDVnpTVnFaVEp5MjZ1OUZxNVl4VmhsV1JWNzJxWDFWdFdmeW9YbFYrc2NLeW9ydml3UnJqbTRsZE9YOVY4OVhsdDJ0cmVTcmZLN2V0STY2VHJicXozV2IrdlNyMXFRZFhRaHZBTnJSdnhqZVViWDIxSzNuU2hlbXIxanMyMHpjck5BelZoTmUxYnpMYXMyL0toTnFQMmVwMS9YY3RXL2EycnQ3N1pKdHJXdjkxM2UvTU9neDBWTzk3dmxPeTh0U3Q0VjJ1OVJYMzFidEx1Z3QyUEdtSWJ1ci9tZnQyNFIzZFB4WjZQZTZWN0IvWkY3K3RxZEc5czNLKy92N0lKYlZJMmpSNUlPbkRsbTRCdjJwdnRtbmUxY0ZvcURzSkI1Y0VuMzZaOGUrTlE2S0hPdzl6RHpkK1pmN2YxQ090SWVTdlNPcjkxckMyamJhQTlvYjN2Nkl5am5SMWVIVWUrdC85Kzd6SGpZM1hITlk5WG5xQ2RLRDN4K2VTQ2srT25aS2VlblU0L1BkU1ozSG4zVFB5WmExMVJYYjFuUTgrZVB4ZDA3a3kzWC9mSjg5N25qMTN3dkhEMEl2ZGkyeVczUzYwOXJqMUhmbkQ5NFVpdlcyL3JaZmZMN1ZjOHJuVDBUZXM3MGUvVGYvcHF3TlZ6MS9qWExsMmZlYjN2eHV3YnQyNG0zUnk0SmJyMStIYjI3UmQzQ3U1TTNGMTZqM2l2L0w3YS9lb0grZy9xZjdUK3NXWEFiZUQ0WU1CZ3o4TlpEKzhPQ1llZS9wVC8wNGZoMGtmTVI5VWpSaU9OajUwZkh4c05HcjN5Wk02VDRhZXlweFBQeW41Vy8zbnJjNnZuMy8zaSswdlBXUHpZOEF2NWk4Ky9ybm1wODNMdnE2bXZPc2NqeHgrOHpuazk4YWI4cmM3YmZlKzQ3N3JmeDcwZm1TajhRUDVRODlINlk4ZW4wRS8zUHVkOC92d3Y5NFR6KzRBNUpSRUFBQUFHWWt0SFJBRC9BUDhBLzZDOXA1TUFBQUFKY0VoWmN3QUFDeE1BQUFzVEFRQ2FuQmdBQUFBSGRFbE5SUWZkQ3dNVUVnYU5xZVhrQUFBZ0FFbEVRVlI0MnUxOWVWaVVaZmYvbVEwUWxXRm4yQVZjd0lVZEFkZGNFRFJOelNWUk15MlZ5cmMwVTN2VE1sT3pzc1UxQmR6M0ZRUUdtSTJCQWZTSFNtNVpXZm9tK3BiaXZtVUtncHpmSDkvT2M4MDhna3V2T3ZNTTk3a3Vybk5aTFBPYyszdys5K2MrOTdudkI0QVpNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGalpuNFRzUkNZMmhkZmZDRkNSRkZkWFoyb29xSUNLaW9xUkFBQWlDaENSQllnSVNXM1NJUWlrUWhhdEdpQkFRRUI5RytjT1hNbUc4akdUZ0R6NTg4WFZWUlVpQ3NxS2lRQUlEMTkrclQwekprek1nQ3dCUUFaQUVnQlFBSUE0cisvR0ZrS3p4QUE2djcrdWc4QXRRQlFBd0RWTFZxMHFBa0lDS2dGZ0ZwL2YvLzdnWUdCZGJObnowWkdBRlpxYytmT0ZaMDVjMFpTVVZFaFBYMzZ0TzNaczJmdEFhQ3BwNmVuYzF4Y1hFdUZRaEhvNmVucDM2VkxsMEEzTnplRnJhMXRNeHNibTJZU2ljUldMQlkzWlZnU0lQb1JvYWFtNWk4QXFLNnFxcnBkVlZWMSs5S2xTeGYrMy8vN2Y2Y3JLeXZQWHJodzRYUjVlZmwvS2lzcnJ3SEFYMzUrZm5jQ0FnS3EvZjM5YS8zOS9lL1BtemNQR1FFSTJPYk1tU002YythTTlNeVpNN1lHZzZFcEFEVHYyTEZqWUV4TVRIeGlZbUxIME5EUVNCc2JHMFZOVFExVVYxZkR2WHYzb0thbUJ1cnE2cUN1cmc0UWtmdGlKbHdUaThVZ0VvbEFKQktCV0N3R2lVUUNNcGtNYkd4c1FDcVZ3dDI3ZHk4Y1AzNzhpRTZuTzNENDhPR3lRNGNPblFhQVA3dDI3Zm9YQUZSMzdkcTFkc0dDQmNnSVFDQTJac3dZeWRtelorMktpNHViMmRuWk9ROFpNcVJiLy83OUV6dDI3Qmh0WjJmbmUrZk9IYmh6NXc3VTFOUkFiVzB0OTNPMXRiVnc3dHc1dUgzN05sUldWb0pVS29YS3lrcG8wcVFKWEw1OEdkemQzZUhTcFV2TUM4Uzd1Ym5CM2J0M3dkUFRFMnByYThIVDB4T2FOV3NHM3Q3ZUlKVktUUWhDS3BXQ3JhMHQyTm5ad1owN2QvNG9MeTh2VjZsVTJweWNuSkxxNnVxclhicDB1ZTNuNTFlMWRldlcrNHhTTGRBKy9QQkQwYXV2dmlyejkvZDNCSUNBWHIxNkRWbTFhdFgyMzMvLy9lcVpNMmZ3K1BIaldGNWVqdnYzNzhleXNqSlVxVlQ0NmFlZjR0U3BVN0Y3OSs3WXUzZHZ0TE96dzdDd01KUktwUmdSRVlGU3FSUWpJeU5SSnBOaFZGVFVRMzEwZERUelp2Q1BHcGZJeUVpVDhRd0xDME03T3p2czNiczNkdS9lSGFkT25ZcHo1c3hCbFVxRlpXVmxXRlpXaGdjUEhzVERody9qenovL2pDZE9uTGkrWk1tU0hkMjZkUnNDQUFHK3ZyNk95Y25Kc3VuVHA3T2FrQ1hZQng5OElCbzFhcFNObjUrZnM1MmRYZkQ0OGVPbi8vREREOGZPblR1SFAvMzBFNWFYbDJOWldSa1dGaGJpaWhVcmNPalFvWmlRa0lCU3FSVER3OE5SS3BWeXlSUWJHNHN5bVF6ajQrTlJKcE5ocDA2ZFVDYVRZZWZPbmRIR3hxWkIzNlZMRitiTjZCODJQc2JqU09OSzR4d2RIVzJTQndrSkNUaGt5QkJjc1dJRkZoWVdZbGxaR2U3ZnZ4OFBIejZNSjA2Y3dKS1NraDlHalJvMTNkYldOdGpYMTlkNXhJZ1JOdSsvL3o0akFuTlpjbkt5ek5mWDE4bmUzajVreG93WmN5c3FLdjQ0YytZTUhqbHloSnZwMDlMU01Da3BDV05pWWt4bWRFcUNUcDA2b1kyTkRYYnQyaFZ0Ykd6d2hSZGVRQnNiRyt6Um93ZmEydHBpejU0OTYvVzlldlZpM2dKOVErUFZvMGNQay9HbDhTWnlvSHlJaW9wQ3FWU0tNVEV4MktkUEgweE5UZVdVUVhsNU9SNC9maHdQSFRyMHg2UkprK1kyYWRJa3hNZkh4Mm5Zc0dFeWhzYm5hTU9IRDVmNCtQZzRBRURRTysrOE0vUDA2ZE8vbno1OUdnOGRPb1JsWldXbzBXaHd3b1FKMkxWclY1UktwWndjakl1TFE1bE1aZ0oyNCtSSlNFaEFXMXRiVEV4TVJGdGJXMHhLU21MZWlqeU5LNDB6alR1ZkZDaFBpQXk2ZHUySzQ4ZVBSNDFHZzJWbFpYamd3QUU4ZHV3WWxwZVgvejUrL1BpWkFCRGs3ZTN0OFBMTEwwc1lPcCtoVFowNlZSUWZIMjhIQUY1SlNVbkpSNDRjT1hybXpCazhmUGd3bHBXVllYWjJOazZhTkFudDdlMjVtVDR1THM1a2NHbG01NE85YjkrK2FHdHJpeSsrK0tLSjc5Ky9QK2Z0N095WUY1QTNIai8rdU5KNDgwbUJsQUtmRENJakk5SGUzaDRuVFpxRTJkblpYSzNnaHg5K1FJMUdjN1I3OSs3SkFPRFZzV05IdTBtVEpyRmx3ZE8yb1VPSFNyeTl2UjBWQ2tYa3VuWHJ0cDgvZjc3MjJMRmp1SC8vZmxTcFZEaGt5QkNNaUloQW1VeUdIVHQyUkpsTXhxMFIrYUNuR2FGZnYzNG00QjR3WUFEYTJkbmhTeSs5Wk9JSERoekl2SUE5Znp4cG5Ja2NLQThvTC9oazBLVkxGNU84aW9pSXdDRkRobkNGdy9MeWN2emhoeDlxdi83NjYrMXVibTZSWGw1ZWpvTUdEWkl5MUQ0Rm16SmxpbWpvMEtHMkFPRFZ2My8vY1dmT25EbC84dVJKUEhqd0lCb01CcHc1Y3lZMmJkcVVtL0ZwVFUveW5nYlRlSWF2RCt3TkpjK2dRWU9ZdHdML0tIS2dmT0FyQk1vZldpWlF6U0F5TWhLYk5tMktNMmZPUklQQndCVUx5OHJLemlja0pJd0RBSytCQXdmYXZ2WFdXMHdOL0EvZ0YzdDdlemUxczdOcnZXTEZpdFhuenAyclBYTGtDTzdidHcrWExWdUd2WHIxUXBsTWhqRXhNU2F5amRaMnhPaVBBdjNqSnRIZ3dZT1pGNUIvVW5Kb2lBd29qM3IxNm1XU1p6RXhNU2lUeWJCWHIxNjRkT2xTM0xkdkgrN2Z2eCtQSERsU08yL2V2RFcydHJhdFBUMDltNzcxMWx0aWh1Wi9CbjdIb0tDZ3p2djI3VHZ3MjIrLzRZRURCMUN2MStPSUVTTXdMQ3lNMjlwNTJJeFA4cjZobVo3TmtNdy9UQm5RTXFFaFJVQmJpMkZoWVRoaXhBalU2L1ZZVmxhR2h3NGR3bDI3ZGgzMDgvUHI3T25wNmZqbW0yOHlFbmlDOWI0VUFGemo0K09IVmxSVVZQNzAwMDlZVmxhRzI3ZHZ4NENBQUc2dFQvdTl0TlhEWm56bW42Y2k2Tm16cDBtL1FVUkVCTFpvMFFLM2JkdUcrL2J0dzRNSEQySkpTVWxsZUhqNFVBQndmZW1sbDFoZDRESEFMd01BeFd1dnZUYnBqei8rdUgzMDZGSGN0MjhmZnYzMTF5aVh5ekVxS29xVFliYTJ0dGk3ZCsvSG12RVp5Sm4vSitUd0tFVkErVWZMZ3Fpb0tKVEw1ZmoxMTE5elM0SURCdzdjSGp4NDhMOEFRREZnd0FEV00vQUk4SHRObXpadDVybHo1KzRkT25RSTkrM2JoKysrKzY3SldyOTc5KzRtY3F4ZnYzNG1UTTFBei95ekpBUEtNOW85b0R6czNyMjdTVzNnM1hmZjVVaWd2THo4M3JoeDQyWUNnQmNqZ1llQS8rT1BQNTc3KysrLzN6OTQ4Q0FXRkJUZzJMRmp1UzBZWS9EMzZkUEhCUHhzcmMvODg2NE5HSk1BNVNPUkFHMFpqaDA3RmdzS0NtaEpjUC9OTjkrYysvZU9GaU1Cc2lGRGhrZ0J3UFBERHovOGhNQ3YxV3B4K1BEaFhKdW1jYUdQbWpmNGEzMjJsY2Y4ODl4QzVOY0dLQytwUUVqdHhjT0hEMGV0Vmt0cTRQNzQ4ZU0vQVFEUC92MzdzNXJBMEtGREpRRGcvczQ3NzB6Ly9mZmZhd2o4Z3djUE51bmtvMlllS3NDd0daOTVTOXd0b1B5a0ppTHFKQnc4ZUxBeENkUWtKeWRQQndEMy92MzdOOTcyNGNtVEo0dTl2YjJkazVLU3h2eisrKzlWQnc4ZVJKMU9oME9IRGpXWitmbmdwNW1mZGV3eGIwa2RodnhkQWlJQlVnSkRodzVGblU2SCsvYnR3OUxTMHFvdVhicThwbEFvbkNkT25OajR0Z2pmZmZkZGtiZTN0ME9IRGgzNm5qMTc5dnFoUTRld3NMQVFrNU9UNndWL1E3S2ZnWjk1U3lDQmhwWURmQkpJVGs3R3dzSkMzTGR2SCtyMSt1c3RXN2JzcTFBb0hDWk1tTkM0T2daalkyT2J1TG01aFI4N2R1emswYU5Ic2JTMEZGTlNVdGpNejd6Vks0R1VsQlFzTFMzRnZYdjM0dTdkdTArNnVMaUVSMFpHTm1sTVJUOFpBUGhuWkdTb2Z2NzVaeXd0TGNXNWMrZWFWUHNmdGVabjRHZmVra21nb1pvQTdRN01uVHNYUzB0TGNkKytmZmpWVjErcEFNQy9VZXdNVEo0OFdRd0FidE9uVDU5OSt2UnAzTHQzTDY1YXRRcHRiVzI1ZmY1SFZmc2JPclhIUFBQbTlQejhiR2gzSUNZbUJtMXRiWEhWcWxWWVdscUtwYVdsT0hyMDZFOEF3RzNDaEFuV1hRL3c5dlp1RmhvYTJ2Zk1tVE8zRHh3NGdFcWxFbDFjWERBNk9wcmI1N2V4c1hua21wOTU1b1ZBQnNZa1lKemYwZEhSNk9MaWdqazVPVmhhV29vNm5lNzIzL1dBWnRiZTdCTm9NQmdPSGoxNkZFdEtTakFtSm9ZN3l0dXRXemUwc2JIaG1pcll6TSs4TlNtQlBuMzZvSTJORFhicjFvMDdVaHdkSFkwbEpTVllVbEtDNmVucEJ3RWcwQ283QmYrVy9xN1RwMC8vOU5TcFUxaGFXb3BUcDA3bFR2WFI1UjM4OWw3K1pSM01NeThreis4WVRFaElNTGxrSkN3c0RLZE9uWW9sSlNWb01CaHc5T2pSY3dIQTFlcTJCdVBqNDV2NCtmbkYvZmJiYjlmMzc5K1BtWm1aM0cyOGRJa0hIYXhnNEdmZW1rbWdkKy9lSnBlTFJFZEhZMlptSnBhVWxHQnVidTUxRHcrUHVPam9hT3ZaRlhqLy9mZkZBT0NWbnA2Ky9mang0MWhjWEl5dnZQS0tTYWNmWGVMUnQyOWZUall4RW1EZVdzQlArVXluQ09seUVlb1VmT1dWVjdDNHVCZ05CZ1ArKzkvLzNnNEFYbFp6a1VpblRwMmFSa2RIdjNqNjlPbDdlL2Z1eFJVclZuQlhML08zL0l5RHhTY0I1cGtYb3Vmbk0zOXJrSzZzLys2Nzc3QzR1QmpWYXZXOTRPRGdGMk5pWW9UL1RzcnAwNmRMQU1CbisvYnQrVWVPSE1IaTRtSnMyYklsUmtaR21wenVTMHhNNUdRU0F6L3oxa29DbE4rMHkwVzdBcEdSa2RpeVpVdE9CY3liTnk4ZkFId21UWm9rN0xNQ25UdDNiaG9mSC8vU2I3LzlWbHRhV29xZmZ2b3Bob2FHMWx2NGEwaitNOCs4TlpHQThmVml4Z1hCME5CUS9QVFRUMGtGMUxacjErNGxRYXVBR1RObWlBSEFhLzM2OVZtSER4OUdnOEdBUFh2Mk5Mbkx6L2dDei9vVUFQUE1XNU9uL09aZk5FcDNDL2JzMlJNTkJnTVdGaGJpckZtenNnREFhOUtrU1dLaHp2NTJyVnExNm5icTFLbTdwYVdsdUhqeFlwUktwZlcyK3pMd005OVlTY0M0VFZncWxlTGl4WXZSWURDZ1VxbTg2K1BqMHkwbUpzWk9jT0NmTm0yYUNBQmM1OHlacytMWXNXTm9NQmd3TkRRVUl5SWlUTzcwNjlPbkR5ZUxqSVBEUFBQVzdDbmZxZW1ON2hTTWlJakEwTkJRTkJnTVdGQlFnT1BHalZzQkFLNkNlOXZReUpFalpSS0pwUFVQUC96d3g5NjllM0g5K3ZYWXZuMTdrOXQ4NlpYY2ZBWEFQUE9Od1ZQZVUxOEEzUzdjdm4xN1hMOStQUllWRmVIbXpadi9FSXZGclFjUEhpeXM3a0JmWDk5bVE0WU1tWERpeEFrc0tpcDY0S2l2OFZYZVRBRXczMWdWQVArS2NlTWp3MFZGUmFoU3FiQnIxNjRUdkx5OGhITkc0SU1QUGhBQmdHTFZxbFZaNWVYbHFOVnFVUzZYY3ozL3RQVkI4b2VDUU5WUjVwbHZESjd5bnM0SWRPL2VuVHNqNE9EZ2dGcXRGZ3NLQ25ENjlPbFpBS0Q0MTcvK0pZeGx3S2hSbzJTMnRyWnRmL3JwcDJzbEpTVTRiOTQ4N05DaHd3UHluNEdmZVVZQ1NTYnR3YlFNNk5DaEE4NmJOdzhMQ3d0eDI3WnQxMlF5V1Z2QkxBTzZkdTNhZE9EQWdlTisvUEZITEN3c3hERmp4cUJVS20zd21pK2hrOEEvZlY4OUEwSGpqaU45L3ZxdUQ1TktwVGhtekJnc0xDekUzTnhjN05TcDA3aU9IVHMyRllyOGQxdXdZTUg2OHZKeTFPbDBKdksvVzdkdUppOVQ0Sk9BVUR4OWJ2SzBuQ0ZQejBlZS8vLzVQeSswNTJkeGZMclBUODluZkZSWUxwZWpUcWREclZhTDQ4ZVBYdzhBYnUrODg0NWxMd05telpvbEFZQ0FBd2NPbkN3dExjVnZ2LzJXcS83VHFUOXEvaEhhb0RXVXJMU2NvZWVpQWlmZjAvK243MitzWk1EaVdIODhxQ21JVGdtMmI5OGV2LzMyVzlUcjlaaWVubjRTQUFMZWZmZGR5MjRON3RhdG00MjN0M2ZzVHovOVZGTllXSWlUSjA4Mk9makRmNHN2ZjlBczFmTm5KRXBDV3M1UVlaUDJjNm5ObVR6OWR6cjdRRDlIdjRjL3d3a2xMaXlPVDhmejN6cE1CNFFtVDU2TWVyMGVkKzNhVmVQaTRoSWJHeHRyWStrRTBHellzR0Z2SFR0MkRQVjZQWWFIaDV0YyttSE0zRUpQVnJyQmlBcWJkTFNaT2gzNW52NC9mVDh0aDZ5ZERGZ2NIODhUTG93dkN3a1BEMGU5WG84NU9Ubll0V3ZYdHpwMjdHangyNEV1NzcvLy9zcURCdytpWHEvbndNOS93NCtsRHdwZmxwTDhwQm1LbGpQMElzakl5RWhzMHFRSkppUWtZSHg4UEw3MjJtczRhTkFnSER0MkxIYnExQWtURWhMUTN0NmVlN1U1S1NMNlBUU2owZDk1bEx3Vkd2aWZOSTU5K3ZUQitQaDRIRFZxRkE0YU5BaEhqUnFGY1hGeG1KQ1FnSFoyZGx4TnlWcmlTSitQLzBhaDBOQlExR3ExcUZhcmNlalFvU3NCd01WaWtUOXo1a3dSQUhobFpXVVpTa3BLY1BQbXpTaVZTcm5CNHIvU20xL1FzUlRQbjZsSWx0R01RMWM3UjBSRVlIUjBOSDc0NFllNGRPbFNWS3ZWV0ZCUTBPQ1hScVBCNWN1WDQ4eVpNekUyTnBhTEM4MXM5UHRwbWRUUVRDWVUveVJ4N05peDQyUEhVYVZTNGFKRmkzRDY5T2tZRVJIQmthclE0Mmo4cW5FaVE2bFVpcHMzYjBhTlJvUHo1czB6QUlEWDVNbVRMYk1RK1BISEgwc0FJR2ovL3Yxbmk0cUtjUGJzMlZ3Qk1ENCszb1NaaFpLME5GUFI2Y1dvcUNoMGQzZkhqejc2Q0hmdjNzMVZhZlB5OG5EUG5qMjRkZXRXWEw5K1BhNWV2UnJUMDlOeDdkcTF1SEhqUnR5NWN5ZG1aMmVqU3FWQ25VNkhCUVVGbUptWmliTm56MFovZjMvdWZnVDZPL3laVEdna1FKK1hQK1BUODBWR1JtSkFRQURPbmowYk16SXk2bzNqaGcwYmNNMmFOYmhxMVNwY3QyNGRGOGVjbkJ4VXE5VmNISGZ1M0lrZmZ2Z2h1cm01WVZSVVZMMXhGQW9KVUx6b2RHRDc5dTF4OXV6WnFOUHBNQzB0N1N3QUJFMlpNa1ZpcWV0L21WZ3NibnZzMkxFcXZWNlBNMmJNUUtsVWFuTGx0ekhUOGJkNHpPM3BjOUV5aFFwT05GUEZ4OGZqOU9uVFVhUFJvRmFyUmFWU2lSczNic1NsUzVkV2YvamhoMGRmZXVtbDlaMDdkLzQ0UER6ODliWnQydzV0MGFKRllraEl5TkN3c0xCeG5UcDErbmpBZ0FGclAvcm9vOE9wcWFsVk8zZnV4UHo4Zk5UcGRLalQ2WERtekpsY0V3ak5aS1NZNlBOWWF0eWVOSTZkTzNmR0R6LzhrQU45VGs0T3hiR0s0dGlwVTZlUHdzUEQzK2pRb2NQSUZpMWFKSWFHaG82S2lJZ1kzNmxUcDQ5ZmZ2bmxUWFBuenYxcDFhcFY5M2J2M3MyUnFscXR4dmZlZTQ5cnA2VytFNG9qZjFsZ3FYRXp2anBjS3BYaWpCa3pzS0NnQURkdjNsd2xGb3ZieHNYRnlTeVZBR3dqSXlON0h6bHlCSFU2SFE0WU1JQzcvS056NTg3MU1yR2xKaTFWbldsdE9uNzhlTXpJeUVDdFZvdDc5dXpCMU5SVW5EWnRXbm1uVHAwK2RuQnc2QWdBL2tWRlJiM3hJVlpVVk5RYkFQeWJOMjhlM2JsejU1bXpaczNhdjNuejVycmMzRnpVNlhTWWxaV0ZiNy85dHNuYWxncW5EUlc0TE0zekMzejhPTDc5OXR1NFo4OGUxR3ExbUptWmlTdFdyTGcvZGVyVS9mSHg4UjgxYjk0ODVuSGlPSFhxMU5ZQTBNTEp5YWxUMTY1ZDUzejY2YWRIdG16WmdubDVlYWpUNlhEMzd0MDRkdXhZa3pnS2hVd3BmalFaaElhRzRvQUJBMUNuMCtHT0hUdXdaY3VXdmVQaTRtd3RsUUNhRGhnd1lOejMzMytQT3AwT0J3MGFaTElGeUpkak5Bam05c1pKYTd5R2pJNk9SaWNuSjF5NGNDRTM0NmVucCtNNzc3eXpOemc0ZUNRQUJOVFcxbGJnUDdEYTJ0b0tBR2dSSEJ3OGJOcTBhVVhidDI5SGxVcUZXcTBXbHl4WmdpNHVMcHljcFFJWHJhSDVNNW1sZURyUVFwK1RQbmRVVkJRNk96dmpraVZMdURpbXBhWGhXMis5WlFnS0Nob0tBQzMrYVJ5cnFxb01BQkFZR2hyNjZzY2ZmM3hnNTg2ZDNQSmd3WUlGS0pmTE9RVks0OG9uVTB2TFExSUF0QlU0YU5BZ2p0aGlZMlBIeGNiR1dtWkhZTmV1WFpzbkp5ZFBwOWQ4dDJyVml0c0ZvT0JiV3ZJMkJQNm9xQ2gwYzNQRFRaczJvVWFqd1IwN2R1Qm5uMzEyTVNvcWFqSUFCT0JUTkFEd2o0Nk9mdk83Nzc0N3AxUXFVYXZWNHViTm05SFQwNU1yRkZvNkNkUUhmaXBrS1JRS3JwQzFmZnQybkRkdjN2bXdzTEMzQWFERlU0NWpZUGZ1M2FlbHA2ZGZ5YzNOUmExV2l4czJiREFoVTBzbkFZb2pLWUN3c0RCczFhb1Y2blE2M0xObkQzYnYzbjE2eDQ0ZG0xc2tBZmo1K1RtT0hUdDJmbGxaR2VwME9veUxpN05vQmRCUWRUb3FLZ29WQ2dWdTI3WU4xV28xYnRpd0FTZE5tbFRxNHVMUytmYnQyK3Z4R1ZoVlZaWEIyZG01NHdjZmZGQ1FsWldGV3EwV2QrM2FoWDUrZmx5VjI3aXdaVXdDNW9xbmNjZWU4ZWVpQWxaRVJBVDYrdnJpcmwyN1VLMVc0N3AxNnpBbEpVWHY1T1FVVzFWVlpYZ1djYnh5NWNxbjd1N3UzZWJPbmJzL096dWJJMVBqQW1GRHV3U1dxZ0RpNHVKUXA5TmhUazRPSmlRa3pQZnk4bkswMUoxQXAvSGp4eThxTFMzbGpnRHpGUUNmZWMzbENUejFnZC9GeFFVM2JkcUVLcFVLVjY5ZWpjbkp5YnNrRWtscmZBNG1Gb3RiVHB3NGNXTm1aaWFxMVdyY3VYTW4rdm41WVhoNGVMMGtZTzU0a25MaWd6ODhQQng5ZlgxeHg0NGRtSitmajZ0V3JjTGh3NGR2RW9sRUxaOUhIR1V5V2ZEa3laT3o5dXpaZ3hxTkJqZHUzRml2RWlBUzRKT3B1ZU5wckFEa2NqbFhMRTFNVEZ3RUFFNldTZ0RPRXlkT1hGbFNVb0phclJiYnQyOXZjZ2NnWHdGWVNyQ3BVQlVkSFkxTm1qVEI5UFIwVktsVXVIYnRXaHcrZlBpbXB5MzVIMFBLK3IzMjJtdkxMSjBFSGhmODZlbnBPSERnd09VQTRQK2M0eGo0emp2djdNek96a2FOUm9PcHFhbllwRWtUcmlaQTQyNHBreEpmQWRBZGdlM2J0K2RxSjBsSlNTc0F3TmxpQ1NBbEpXVzF3V0JBclZhTFVxbTBRUVhRMEVHUDUrWDU0S2NxOWV6WnMxR2owZUNXTFZ0dzNMaHh1UUFRaUdZd0FQQ3Rqd1Q0blpYVVJzdWZ5WjYxSitWRWY1ODYxOExDd2hvQ3Y2ODU0aWlWU2x2Tm1qVkxrNXViaXhxTkJxZFBuLzdBN29BbDVxV3hBcEJLcGFqVmFqRTNOeGY3OWV1MzJwSUp3Q1VsSldWMVVWRVJhalFhREE0T05sRUExTE50Q1VFMjdrR24vZW5FeEVSVXE5V1lrWkdCSDM3NDRTLzI5dmFoYUVZakVzakl5RUNWU29VN2R1eEFYMTlmczVQQW84Qy9mZnQyek12THc3UzBOSHpwcFpmTUJuNnk1czJiaDZXbXB2NmFuNStQYXJVYUV4TVRUZm90K0djSnpKMmZ4bmtwbFVveE9EZ1lOUm9OS3BWSzdOdTM3MnBMYmdjMklRQmpCV0JjeFRZT3RyazhCWm1hUmtKRFEzSEpraVdZbDVlSFM1Y3VyZkx4OFJtSUZtQ1BJZ0hqWnBmNlRzazliYzgvclVmeHMxVHdrN1Z1M1hwUVZsWldsVnF0eGtXTEZuRTNWRkg4K0NSZ0xzL2ZSU0VGSUVnQ0lBVkFjc3RTZ3N4dlN3MFBEK2RtL3kxYnR1RExMNys4QmdBODBVTE1Va2hBcU9EL080YWU3N3p6enJyOC9IelVhRFRZdTNkdjdvcDZmdHV3cFV4T3RBc2dLQVV3Y2VMRTFZV0ZoYWhXcXprRllCeGtjeXVBK3FyK01wa01OMjdjaUxtNXVmamxsMTllc2JlM2owQUxNejRKYk4rK0hYMTlmYmxPUzVLelZOTjQyc2xNNEtmZlQ4dW0wTkJRRS9DbnBxWmFIUGpKbkp5Y292ZnMyWE5kclZaamVubzZ5bVN5Qm5jRnpKMmZoQmRTQUdxMUduTnljb1JGQUczYXRERTVDMER0bUJSa2MzbWF3YWp3TjJEQUFGU3BWTGgxNjFaODhjVVhseitxRmRXY0pEQm16SmhsdTNmdnh2ejgvTWNtZ2Y4MVhvOEMvN1p0MnpBM054ZFRVMU54d0lBQkZnbCthaUdlTkdsU21rcWxRclZhalVsSlNmVzJDMXRLZnRKWmdEWnQyZ2lUQUtSU0tZYUdodFlyczh3VlhIN2hxa09IRGpoNThtVE16OC9IWmN1V1ZUazVPWFZHQzdiblRRTFdBbjR5WDEvZjdtcTF1a2FsVXVIYmI3L054YzI0b0dyTy9PUXZUME5EUTYxSEFWQVNrY3g1M3Q3NEVncnFWSk5LcGJoanh3N015c3JDOTk1N3I5alNFL2hoSkVDRkxUNEpHTzhTUEltbm4rT0R2ME9IRG9JRVAvVllyRnExYXI5YXJjYXRXN2VhM0ZkaGZLbUlPZlBVdUM5RmtBcEFyOWVqU3FWQ2lVVENNU3kvZWNYY3dTWDUzNzE3ZDFTcFZMaGx5eGJzMHFYTHAvLzBVSXE1U0dEWHJsMllsNWVIMjdadGU2b2s4RGpnVnlxVnVITGxTc0dBSHhHeHVycmFNR3pZc004MEdnMnFWQ3J1K2kxK3ZNdzlTVkZUVldob0tFb2tFbFNwVkppZG5ZMUpTVW5DSVlEV3JWdWpWQ3A5b05CQ0QvbThQYTJ0ak9WL1VsSVM1dWZuNDVvMWF6QXdNTEFmQ3NnZVJRSzB0cVc0Rys4U1BFNmM2T2VJTEJzQS96S2hnSjhzSmlabUlMMTJxM2Z2M2x5OCtIMFY1c3BUNHdLMVZDckYxcTFiQzVNQUpCS0p4UWFYcmx1YU9YTW01dVhsNGJKbHkyNENRREFLeko0MkNWZzcrUDgrYjlHMnNMRHdqa3FsNGk2dG9SdVp6RDFKMVZlakVxUUN5TS9QNXhRQUJaZldXUFNRejl2ejVXeTdkdTF3L3Z6NXFGUXE4YlBQUGp2eHZIditueVlKdlBycXF4d0piTjI2RlgxOWZibnIyS2dHUS9Ibkx3djQ4YUh2aTQ2TzVxNmw4dlgxeGExYnR3b2UvSFJHSURjMzl6ZTFXbzJmZlBJSnRtdlg3cUhMcHVmdEtmNDBTYlZ1M1JyejgvTXhLeXRMR0FSUVVGQ0ErZm41SmdxQTM2eGlydUFhSDFpUlNxVzRhdFVxek03T3hsbXpadTBEQUI4VXFCRUo3Tnk1RTNOemN4K2JCUGozN3o4TS9EazVPYmhpeFFyczM3Ky9ZTUZQc2RxK2ZmdCtqVWFEYVdscEtKVktIemhvWmE3ODVEZFprUUlRSkFHMGF0VUtwVkxwQXgxWDlKRFAyeHZmOUNPVHlUQWtKQVRYcmwyTDJkblpPRzNhTkIwQWVLR0FyU0VTb0JtT2YyRW14WU84OGNXbnBKQ3NEZngveDhsNzQ4YU5lcTFXaTZ0WHI4YVFrQkFUa3VRdmw1NjNwM0dnWGFwV3JWb0pWd0hRRE1TWFYrWUtydkhCRmFsVWloczJiTURzN0d6ODk3Ly9yUmM2QVR3SkNWQk5obVo4K3JlMWc1OElZTnUyYlFhZFRvZnIxcTB6T2JOQ2NUQlhmdktYcWUzYnR4ZVdBcGd3WWNKcW5VNkhlWGw1RFNvQS91dWVucGMzdnFPT0ZNQ3laY3N3T3pzYjU4eVpVMllOeVcxTUFqdDI3RUNsVW9sYnRtd3hJUUdxeWRDeWpEenRoeFA0dDJ6Wmd0bloyZmpkZDkvaGl5Kyt1TXlhNHJObno1NkRHbzBHRnk5ZS9JQUM0QytUbnJldlR3SFFkZW1DSWdDSlJNSWxIYjhhYmE3Z0doOWdrVXFsK00wMzM2QlNxY1N2di81YXNFWEFKeUdCdG0zYmNrMVFwQWlNLzkyMmJWdXJCajhWQVFzTEMwOXFOQnBjdUhDaGlRSWdNalJYZnZKM1g5cTFhNGNTaVVTWUJOQ3laVXV1d0ZMZk85MmV0K2V2Y1VOQ1F2RHR0OS9HM054Y1hMMTY5UTBoYmdNK0tRbjQrUGh3TXg0MWFaRVBDUWxCSHg4ZnF3Yi8zM0ZwZStqUW9kc3FsUW9uVHB6NGdBSm9xRWJ5dkR6aGhBclZMVnUyRkI0QjVPYm1va1FpNFdZY0tyeVJ2REpYY1BrS1lQVG8wZHhhdVdYTGxuM1J5b3hQQXBzM2IwWWZIeDl1aXpZa0pJVGJhdkx4OGNITm16ZGJOZmdSRVR0MzdqencwS0ZEbUp1Ymk4bkp5ZlVxQUhQbEo3V3BFMTdhdG0yTEVva0VjM056TVRNekV4TVRFeTJmQU9qNkltTUZZQnhjSW9IbjdXa0wwRGk0dnI2K21KdWJpeGtaR2RpN2QrODVRbWtGZmxJU0dEMTY5TEx0MjdkalRrNE9idHEwQ1gxOGZEQXdNQkNsVWlrR0JnYWlqNDhQYnRxMENiT3lzbkQ1OHVWV0MvN3E2bXJENjYrL1ByK3NyQXh6YzNOUm9WQnd5MVRLQzFJQTVzcFRtcVNNRllBZ0NjQllBWkRzdHJUZ3RtclZDamR1M0lnNU9UbjR5U2VmR0t3eDZSc2lBVzl2Yi9UeDhVRnZiKzlHQVg2S1EwNU96bDY5WG85cjE2N2xDdFdXTmtrUlhnU3RBSUtDZ2t6a0ZXMEZFZ2s4YjA5cksyTDZEaDA2b0ZRcXhWbXpadEV5b01yRnhTVWVyZFQ0SkxCeDQwYU1qbzdHalJzM05ncndJeUw2K3ZwMk9YNzhlSFYrZnA3YUFDa0FBQ0FBU1VSQlZENSs4TUVIS0pWS3VXWTFxZ0ZRbnBnclQya0xrSmFwUVVGQndpTUFwVktKRW9tRUs3QVFvMWxLY0dtTEpUZzRHRU5EUTFHcFZHSldWaFlPSHo1ODBXKy8vZlo2WXlFQmV1N0dBUDZpb3FMZXMyZlBYbjdnd0FGVUtwWFlybDA3cmdiQ2Y4VzRPU2NwWTd5RWhJU2dSQ0pCcFZLSkdSa1p3aUlBVWdCVVphYXRRSE1GbHp4dHNSRER0bXJWQ3RQVDAxR3BWT0tHRFJzdU5tL2VQQnl0MklnRXRtM2JocG1abWJoczJUS3JCejhpb3JPemM4VHg0OGV2MERzQ1NQNlRRclcwL0tUTFFJS0Nnb1JKQU1ZS2dKcE1hSTFGU3VCNWUySjRZbGg2ZWNtb1VhTlFxVlJpZG5ZMmpoOC9QaFVBUEJvQkNTeFp0R2dSOXUvZmY0bTFneDhBRkY5ODhVVmFlWGs1S3BWS0hERmlCUGZTRGVNT1Njb1BjK1VuMWFnSUw0SldBRlJsYm1pTlpTNVBERXZMZ0xadDI2SlVLc1hseTVlalVxbkUzYnQzM3drSUNPaVBWbTRBNEJFVkZkWFAyc2tPRVRFc0xHekFyNy8rZWtlbFV1SHk1Y3ROeHAza1B5a0FjK2NudjBZVkdCZ29YQVVRSEJ4czBtbEdETXR2UTMxZW52NCtCWmxrVnV2V3JiRk5temFvVkNveE56Y1gwOUxTZm1yYXRHbDdaQ1o0azh2bEhRNGVQUGhMU1VrSktwVktiTk9tRGRjSFFmS2ZKaWRMeUU5anZBUUhCd3RMQVl3ZlAzNjFScVBCbkp3Y1RnSHdaWmE1Z2t1ZW1KNWtGakZ0eTVZdE1TVWxCWE55Y2pBM054Yy8rdWlqSEd0cUQyNk1CZ0FCbXpadHl2NysrKzlScVZSaVNrb0sxNTlDeXBUT1JsQmVtRHMvK2N2VHdNQkF6TW5Kd2QyN2QyT2ZQbjJFUXdBU2lZUzdHSlQyV1VsK0U5T1p5NU1Db0dVQTlWeTNidDBhdi9ycUs4ekp5Y0g4L0h4ODc3MzMxc0p6ZnFrbHM2Y0dmdi9seTVldk8zNzhPT2JsNWVIQ2hRdXhWYXRXM0JrVlkvbFArV0R1dkNSOFVKOUttelp0VUNLUkNKTUFBZ0lDSGxBQWxoQms4dlI1S05qVWROR2hRd2RjdVhJbEtwVktWS2xVT0dYS2xGUUE4R09RRWhUNC9SWXZYcHo2ODg4L1kzNStQcTVjdVpLN1hJUFcvalFwV1dwZWtnSUlDQWdRcmdLb2I2MWx6SFRtOHZRNWFCbEF0UUJhYzBWR1J1S3FWYXRRcVZTaVdxMW1KQ0JBOEo4NGNRTHo4L054MWFwVkdCRVJ3ZFdralBPUnh0L1M4cEsycUZ1M2JpMWNCZENpUlF0T1hoc0gyOXhCSms5TXl5Y0JrbDBSRVJHTUJLd0kvTFFjcGI0VUduZktBMHZKUytON0dhUlNLYlpvMFVKWUJLQldxekU3Ty91aENzQlNQUDg4UE1rdVl0NklpQWhNVDAvSG5Kd2NWS2xVT0hueVpFWUNBcEQ5ZVhsNW1KNmV6b0dmOHBBS2YvejdFQ3d0TC9rS0lEczdHM2Z0MmlVc0FpQUZ3TCtFd3RLQ1RZeExhMEkrQ1lTSGh6TVNFQ0Q0dzhQRFRjQlB0U2dhWjc3OHR4UnZmRGtMS1FCQkVvQkVJdUhhTFVsMkVlTmFtcWVnRS9PUy9LS3FNU01CWVlLZjhvL0drNVFvWHdGWW1xZmxLT1dmVlNnQWZ0WFZVanpOQkk4aWdiQ3dNRVlDQWdCL1dGallZNEdmWHdPd0ZFODRzUW9GVUYvVGhTVjdDajR4TUEwQ0l3RmhncC9HanhRb1gvNWJxamR1VGhPY0FsQ3BWSmlWbFlYKy92N2N0Vk0wczFweTBHbG1hSWdFYURDSUJMS3pzekUvUDUrUmdJV0JueWFkaHNEUFZ3Q1c1Z2tuZEZUWjM5OGZzN0t5Y09mT25jSWlBT1BCb0FLTXBRZWZrWUN3d0orYm0ydFY0T2Z2UmxHK0NaSUEvUHo4Nm0yK29JZTBWRS9KUXArWDVCZ2R6YVJCQ1EwTlpTUmdBZUNuVjJqVHVORE1TY3RPR2tjK0NWaXFweG9VTmFYNStma0pWd0hRcFNEVURDU1VRWGdVQ1FRRkJURVNzQ0R3MDNnSUhmejBPYWx3U2M4bGFBWEE3OENpaDdSMFQ4bERuNXRrR1RFekl3SExBajhwVFZwdTByanhTY0RTUGI4ajFTb1ZBQ01CWmd6OERYdXJVQUMrdnI0bUNvQXZ5NFRpS1pubzg5UGdFRU1IQmdaeXB3Z1pDVHg3OE5PcFBvbzc1UmROTWpST2ZCSVFpcWZsSnVXWHI2K3ZjQlVBWFFwQ3pVQkNHd3hHQWd6ODV2QzBpMEhQS1JnQ2VPT05OMWJuNStmam5qMTdPQVhBNzhYbXY1Tk9LSjZTaTU2REJvbk9EQVFFQkhBa2tKYVdobGxaV1ppWGw4ZEk0Q21BUHkwdGpRTS94Wm55aWlZWEdoYytDUWpOODgraStQcjY0cDQ5ZTNESGpoMllrSkFnSEFLZ3dUSnVCaExxb0R3cENiUnYzOTZFQk41OTkxMUdBazhJL3A5KytnbVZTaVdtcGFWaCsvYnRHd1g0alYvVVNwZUJTQ1FTWVJLQWo0L1BBejNaeG9Na1ZFL0pSczlqL0lKTlJnTFBEL3cwcWRBNDhFbEFxSjUvQnNYSHgwZjRDb0J1QnhiNjREQVNZT0IvSHA1Mk5heEtBWkJjczNZU0lPWnUwYUlGSTRHbkFINktJK1dSdFlPZmZ3Qk4wQXFBamdSVHRaWUtITmJpU2E3Um9CRnpHNU9BV0N4bUpQQVB3QzhXaXg4QVA4V1g0azN4dDdhOElyelE4d3VTQUx5OXZVME9hTkFNMmRoSXdOL2ZIOFZpTWJacjE0NlJ3R09BdjEyN2RpZ1dpOUhmMzc5UmdwOXdRbWNidkwyOWhhc0E2RWd3cmQxbzBLek5VMUxTNEZHeTBpRDYrZm1oV0N6R2tKQVFSZ0lQQVg5SVNBaUt4V0t1alp3bUQ0b254WmRQQXRibUNTOUVnb0lrQUM4dkw1TjJZQnJFeGtJQ0pPT29uZFBIeHdmRllqRzJhZE9tUGhMd2JXVGc5K1dEdjAyYk5pZ1dpN25hRWVVTnhiR3hnSjl3UW5uajVlVWxYQVhnNStkbndtZzBlTmJ1YVJEcHVhbWE2K25waVdLeEdJT0NnamdTeU1yS3dva1RKeTVwVEFUd3pUZmZMUG54eHg4NThBY0ZCYUZZTEVaUFQwK1QzU09LSDEvK1c3dW41eVlsWkZVS29MR1JBSDhaNE9ibWhwNmVucmhtelJyY3ZYczNMbG15QkFjTkd2UlZZeUtBTjk5ODg2dXRXN2RpUmtZR3JsbXpCajA5UGRITnplMmg4cit4NVkxVktBQmZYMSt1SUdZczQ2emRHeGNDamF1NUNvVUN2Ynk4T1BBdlhyd1krL1hydHhRQWZCclpFc0JuNU1pUlN6ZHYzc3lSZ0plWEZ5b1VDcFBkSTM0QnNMSGtEejAzdGRNTGtnQkl6dEdCSVA1YXJyR0FudzUwZUhsNW9aZVhGNjVkdTVZRGY5KytmWmMxdHZXL2NSMGdPVGw1R1pIQTJyVnJ1UmdaNTAxakl3SENDZVdOcDZlbjhCVUFYODVacTZmQm82U2x0YitQanc4RC94T1FBQlVDcVJaQThhVDRXbnNlRVY2c1FnRTBWTkJoNEcvYzRHY2tVTCt2cjNBc1dBWGc0K1BERlRTc2VmQVkrQmtKUE0wOElyelE4d3VTQUl3TE9zWWRYZlNRMXVLSnNhbnpqOER2N2UzTndQOFVTSUE2U2ltdWxFY1VkMnZMSi81WkVvVkNJVXdDZUZoVEJ3TS9NMFlDRFh0Kzg1Z2dDY0REdzROckJ6YmUxNlZCRTdxbkpLUjlmZ2IrNTBzQ2xFOThNaEM2cDN3aTNIaDRlQWhYQWRDZzBaWU9Bejh6UmdLUDlyUUY2TzN0TFh3RlFKMWR0QXlnd1JLcXA2UWptVVpyTmJiUC8zejdCQ2p1bEZkOE1oQ3FwN3dpM0FoS0FSamZDbXlzQVBoVlhHc0YvN3AxNnpBakl3T1hMRm1DL2ZyMVkrQi9DaVF3Y3VUSVpWdTJiTUhNekV4Y3QyNWRveUFCWTBVcEZvdUZlUzI0dTd1N1ZTa0FTaTZTWjdSR1krQTNMd25RT05BeVUrZ2t3RmNBN3U3dXdpUUFzVmhzd3RUR2d5TTBUK1RGQjcrbnB5Y0R2eGxKZ0pyTitDVEFWd1JDODhiSzBtb1VBSitoR2ZpWk1SSjQwRk9lV1lVQ01CNGM0MEVSaXFka29qVVpEUXFkNm1QZ3R3d1NvS1l6R2grcU9mSEpRQ2plZUpJUnJBSndjM1BqRGdRWkR3b0RQek5HQWcxN3lqZkNqWnViRzFNQURQek1HaE1KV0kwQ01HNEhKakJSbGROU1BhM0JxQkREQi8vYXRXc1orQzJRQktoUGdFOENOSTQwcnBhZWY4WUh5ZWdHS1VFUmdGcXR4dXpzN0FjVWdCQUc0VkhnWDdkdUhXWm1adUxTcFVzWitDMkVCRWFOR3JWczY5YXR1R2ZQbmdhVmdGQklvTDVDczFnc3h1enNiTnkxYTVld0NNRFYxZFdrR1lnL0NKYm1pWGtwK0xRR1krQVhOZ25RT05LNDBqaGJhaDRTVHFnSnlOWFZWWmdFWUt3QWpOZGtEUHpNR0FrOFBBOEpMMWFsQVBqQnR4UlBqTXZBYjUwa1FHZFMrQ1JBNDI1cCtVaWZ6eW9VQUorQkxTM29mUEJUd2RMRHc0T0Izd3BKZ01iWFVrbUFQby94Sk1RVWdCbG1mazlQVHdaK0t5SUJUMC9QQnBjRGxrWUNnbGNBR28wR2MzSnlVQ3dXUDVKNXplMXByVVdmVDZGUW9MT3pNNjVac3diMzdObUR5NVl0WStBWE1BbHMyN1lOczdLeWNNMmFOZWpzN015UkFJMDNmNWZBM0w0K0pTb1dpekVuSndkMzc5NHRMQUp3Y1hFeE9SQms2Y0ZXS0JSb1oyZUhTNVlzd1QxNzl1Q0tGU3Z3cFpkZVNnZjJHbStoa29EZjJMRmowM2JzMklIWjJkbTRaTWtTdExPemU0QUVMSFZTb29OQUxpNHV3aVFBUzFZQWZObFAxZFlwVTZaZ2RuWTJybDY5R3BPVGt6TUJJSUJCU2RBa0VQRHV1KzltN042OUc3T3pzM0hLbENrbXUxTU5MUWVZQW5pS0NxQ2hZSnZMRThQeXdSOFRFNFBaMmRtNGRldFdmTys5OTQ3YjJOaTBaUkFTdnRuWjJiVmR0R2pSOFQxNzltQk9UZzdHeE1TWUtGUEtBOG9MYytjblB5OEZyUURvU0RBVkFpMHR5SlFFN3U3dXVHVEpFc3pNek1TdnZ2cnFqa0toNk5jSVprZEZjbkx5WUFCUVdQdXp0bWpSb3QvMjdkdnZaR2RuNDdmZmZzc2RWT09UZ0tWTVRvUVhkM2QzWVNtQUNSTW1yTlpxdGFoVUtodFVBUFNRNXZMME9ZeUQzTGR2WDh6SnljRzFhOWRpLy83OVZ3S0FoN1d2ajVjdVhicnkxMTkveGZmZmYzK2x0ZGM1QU1CajRzU0pxVmxaV1ppVGs0TUpDUWtQVEU2V2xwL0dDa0NwVkdKR1JnWW1KaVkrVlFLUVBrczJ1SDc5T3JpNHVNREZpeGRCb1ZEQStmUG53Y3ZMQzg2ZE93ZmUzdDVtOFY1ZVhuRCsvSGxRS0JSUVdWa0pycTZ1Y09YS0ZSZzJiQmpVMXRiQ0gzLzhjVkduMDYxQXhBdGdwU1lTaWZ3WEwxNDhNeUVoSWFXaW9nSVNFaExldkgvL3ZrZ2tFdmtqNGxscmZHWkV2T0RnNEJEUm8wZVBsNXMyYmVyMnlpdXZnRjZ2QnpjM042aXNyQVJQVDArTHlrOFBEdys0Y09FQ3VMaTR3TldyVjU5WlhNVFBNdWhPVGs1dzllcFZjSGQzaHdzWExuQkJObGR3dmIyOTRmejU4K0RwNlFtVmxaWGc3dTRPVjY1Y2djNmRPNE9ycXl2Y3VuVUxpb3VMTi8vODg4OHgxZzcreE1URWxETm56a0JOVFEzVTF0WkNVbEpTeXBRcFUyYUtSQ0ovYTMzMm5Kd2NWNjFXdXgwQXdNUERBK0xpNHVEeTVjdmc3dTV1UWdLV2tKOFhMbHdBZDNkM3VIcjFLamc1T1FtVEFFZ0JYTHAwaVp0eGlXSE41UW44Q29VQ0xsMjZCTTdPemhBUkVRR0lDTmV1WGJ0NzZOQ2gzWUdCZ1dzYUEvalBuVHNIYytiTWdRc1hMalFLRW5qaGhSZDBlWGw1MndIZ0hpSkNlSGc0T0RzN20rU25wNmVuV2ZQVHk4dkxKRDlkWEZ6Zyt2WHJ3aU1Ba1VqRUtRQTNOemNUQlVBeXh4eStzcktTazFldXJxNXc3ZG8xaUkyTmhacWFHdmpQZi82ei84YU5HMzlZSy9pWExGa3lNeWtwS2VYczJiTncvdng1bUQ5L1BodytmQmptejU4UEZ5OWVoUHYzNzBQZnZuMVQzbnZ2UGFzbGdVdVhMdjMrMy8vKzk0QllMSWJZMkZpNGR1MGF1THE2d29VTEY4RER3NE9icE15WnA2UUEzTnpjT0FVZ0VvbEFKQklKVXdGY3ZuelpJb043NWNvVmFOdTJMY2psY3JoejV3NGNQWHEwdUxhMnR0UmF3Vzg4ODMvMjJXZHc5dXhaY0hCd2dMTm56OEpubjMxbW9nU3NsUVNxcTZzM0dReUdFb2xFQWk0dUx0QzZkV3U0Y3VXS1JVNVNseTlmRnE0Q01LNEJ1TG01bVJRQ0tjam04TWJCZFhaMkJtOXZiMEJFcUtxcWduUG56aDJRU0NRdHJCMzhDeFlzZ0lxS0NuQnljb0pidDI2Qms1TVRWRlJVd0lJRkM2eWVCR3hzYkxxZlBuMzZvRXdtQXdBQWIyOXZjSFoyaHN1WEw1c3NBOHlacHdxRkFpNWV2R2lpQUFSYkE2RGdHaGNDS2NqbThCNGVIbkR4NGtWTy9vZUVoQUFpd3AwN2QyNmVQWHYyVEdNQS8rblRwOEhaMlJsdTNMZ0JMaTR1Y09QR0RYQjJkb2JUcDA4M0NoSTRmUGp3ZnhEeEx3Q0FrSkNRZXBjQjVzeFRLZ0RTSkNVNEJVQnJGVWRIUnk2NC9FS0xPYnd4czE2NWNnV2NuSnpBMWRVVkVCSCsvUFBQOHdCUWJZM2dQM3YyTEp3N2R3NCsvL3h6cUtpbzRKS0tTTkRWMVpVajY0cUtDdmo4ODg4NUVyRFNta0RWblR0M3pvdkZZbkJ4Y1FFbkp5ZHVHVUJLMWR4NWV1blNKVzU4SEIwZG4xa2dwTTh3QWJtWjVjcVZLeGFsQUl6M1Y1MmNuR2dKY0JNQWFxd1ovRFR6RStncDZTOWZ2c3o5bTVUQTU1OS9Eak5uemdTRlFnRjkrL1pOK2JzSVpTMTlBalhWMWRVM2JHMXRPZktqV3BWQ29iQ0lQSFYzZCtkMnFhNWR1OFlWQVo5MklmQ1pOZ0xKNWZKNkZZQzV2TEg4SndWZ2EydEx4YUcvQUtET0dzRlBzdC9KeWNrRS9DUXpLZG1NNDBMTEFTS0JwS1NrRlByOVZrQUNkZmZ1M2JzakVvbEFKcE54dFNwWFYxZTRlUEVpdHd3d1o1N1NMdFdWSzFkQUxwY0xUd0VBQU55OGViTmVlWFhod2dXemVYZDNkN2g0OFNMSHJCS0poSUNEMWc1K2t2M1VuR1VNZnZwM1l5RUJpVVFpRW9sRUlCYUx1ZVhQbFN0WHVFbkMzSGxLeW96R1RUQTFBR09wSXBmTHVhU2pyVUJ6QnRYRHc4TmtiZVhrNUFSMzd0d0JzVmdNOXZiMjlzKzZLUG84d0orVWxKVHkzLy8rRjg2ZlAvL0U0S2ZPTTVMRnhpUmczQ2N3ZGVwVW9kY0VKSCtQTjl5NWM4ZEVHVjI2ZE1raThwVEkrUHIxNnlDWHk1OVpIOEJ6VndBVVhITjRLZ0FhcjYxdTNib0ZZckVZNUhLNUN3REloQTUrbXZrLysreXplc0ZQejI4TWZtUFByd2tRQ1h6MjJXY3dhOVlzcmlZZ2NDVWdsY3ZsenRYVjFYRHIxaTBUQlVBSzBSTHlWSkFLZ0Y4RE1DNndHQWZYSE41WTVwSUNPSHYyTEloRUluQjBkUFFDQUR0ckFQLzgrZk5Od0U4RlQwcXFoc0JQOGFIOVoycENJUktZUDMrK3llNkFVSldBV0N4dTByeDVjMDlFaFAvKzk3OG1Dc0NTOHBUaUwvZ2FBTWxLa2xmbURDN05nQVNLOCtmUGcwZ2tnaVpObWpRUERnNE9zZ2J3VTVNUGdmL2F0V3NQZ1A5aHlXZXNCSXgzU3lvcUttRCsvUG53MFVjZkNWb0pkT3ZXTFZna0VqV3BxNnVEYytmT2NYRWlCV0FKZVdxc3dBVFpCMkJjQXpBT3JxVW9BRXJxNzcvL0hrUWlFZGpiMjRPZm4xL0hlL2Z1RlF0MXpmKy9ncDlxSk1aSzROcTFheVpLZ0VpQWFnTDkrdlZMZWYvOTl3V2pCRzdmdnIwaE9EaTQ0NzE3OTBBa0VrRjVlYm5KSkVXMUtuUG42WlVyVjB3VXdMT3FBVHh0YzVrNGNlSnF2VjZQS3BVS1JTSVJkeWtJM1d4Q2x4eVl5OU1kYTNSbHVaT1RFMjdhdEFuejgvTnh3WUlGKzBBQUYyTUFnTitTSlV0U2YvMzFWOVRwZExoKy9Yb01DZ295aVRlOW1KV2VsKzZYZjl3NDBmZlR6OVB2YzNGeFFaRkloRUZCUWJoKy9YcFVxOVZZVUZDQTc3Ly9mcXBBWXVldjBXZ09GQlVWNFpvMWE5REp5Y2trSCtoNXpaMm5oQmVLdDBxbHd1enNiRXhLU3JMc0c0R01DY0RSMGRFa3VFK2FoTThqdUhRUnFFcWx3aDA3ZHR4VEtCVGRHanY0clprRVdyWnMyZVBubjMrdTBXZzArSzkvL2Nza0R5eGxrcUs0RTI0Y0hSMkZSUUNGaFlVV3F3QW91TWJKSEJJU2dpcVZDbk56YzNIczJMRXJwMDZkMnRxU3dYL3k1TWxuRG41ckpBRUE4UGo4ODg5WEh6eDRFRlVxRmJadTNmcUJ1Rm5pSkNVNEJWQllXSWhxdGRwaUZVQjl5NEJseTVhaFdxM0diZHUyWFhWMGRJeXlaUEFYRkJUZ2hnMGJuam40bjRRRU5tellnQnFOQnZWNnZjV1NnSmVYVit5SkV5ZXVGeFFVNExmZmZtdXg4cjgrQmFCV3F6RW5Kd2Y3OXUwckhBSVFpVVRvN094Y0w4T2EyeHNuc1Znc3h2NzkrNk5hclVhVlNvV1RKazFhQndDZVFnQS94WmVTaFdZT1BnbjhyNTUrSC8xKytudk96czZDSUFFQThGcTJiTm1XUTRjT29WcXR4bjc5K3BtTXY2WG1KOFZYa0FRZ2w4dE5ndnkway9KL1RXWktZcHJKRmkxYVJJR3VhdE9temNzTS9OWkRBdkh4OGNOT25UcDFUNmZUNFZkZmZmVll5c25jK1VtZlR5NlhDNGNBVWxKU1ZoY1ZGYUZHbzdGb0JjQlBZaWNuSnd3S0NrS1ZTb1ZhclJZM2JkcjBIN2xjSG00SjREOTE2aFRxOVhxemd2OUpTVUNyMVdKaFlTRk9temJON0NUZzRlRVI5Y01QUDFUczI3Y1A4L1B6c1VXTEZnL0lmM29lUzFVQTlLNE5TeWNBNTRrVEozSUVZS2tLb0NFU2NIUjB4TkdqUjZOR28wR2RUb2VmZi82NVJpd1d0N1FrOEZOU21BUDhqME1DWXJIWW9raEFKcE8xenNuSktUeHk1QWhxTkJwTVRrNjJlUER6RllDVGt4TnFOQm9xQXFZQmdMUEZFc0Q0OGVOWEVnSFkyTmcwV0dpeEZNK3ZCVGc1T2VIWFgzL055ZGlQUC81NEJ3QUVQbWZ3dDFpNmRHbWFNZmdEQXdPNXoxZmYydFdTNGljV2l6RXdNTkNFQktaUG41NEdBQzJlWnh3bEVrbkxUWnMyWmZ6NDQ0OUU2RnhoMmxMaTE1QTNWcVoyZG5ZY0FTUW1KbjVueVFUZ05HN2N1RVVHZ3dHMVdpM0hhUHl0UUVzSk1uOEdvOC9wN2UyTjZlbnBxTlZxc2Fpb0NELy8vUE1zR3h1YjRPZVV0SzNXckZtejdlVEprMWhZV0lnYk4yNThKUGpORlZmNnV3OGpnWTBiTjZKT3AwT0R3WUJ6NXN6WkpoYUxXejJQT05yYjI0ZnMyclVyNzhTSkUxaFFVSURwNmVrbWI5dDltSUt5bEx5a3o2bFFLRkNyMVdKV1ZoWW1KQ1FzQWdBbmkwUy9yNit2NDZ1dnZqcS91TGdZdFZvdHVybTVQWkMwbHFvQStETFcxOWNYVjY5ZWpWcXRGZzBHQTI3WXNHRy9uNTlmdDZ0WHIzNzZMQkwycjcvK1d0K2lSWXRPR28ybStNU0pFNmpYNjNIanhvMmM3TGMwOEQ4dUNRUUZCWm1Rd09yVnEwdTh2YjA3Mzc1OWUvMnppT052di8zMmVwczJiWHFVbHBaKy8rT1BQM0xnOS9IeHFYZjVaS2tLd0RpT2JtNXVxTlZxTVNNakEzdjI3RG5mMDlQVDBTSUpvRXVYTHMySERSczJ2YVNrQkxWYUxYYm8wTUVrNkpiR3RJOGlBUjhmSDB4TlRlV1VRRkZSMGVVUkkwWk1lOXBMQWdBSUdEMTY5THYvK2M5L0xodytmQmgxT2gybXA2ZWpuNStmUllQL2NVbkF6OCtQVTFRR2d3RUxDd3N2RGhvMGFESTg1VmV2QTBEUXYvNzFyNWxuenB5NTl2MzMzNk5PcDhNVksxYWd0N2Uzb01CUDhhVFBHeG9haWxxdEZuZnUzSWxkdW5TWkhoTVQwOXhTQ2FCcDM3NTl4KzNkdXhlMVdpMUdSMGMvc09ZU0dnbDRlSGpndEduVFVLdlZvbDZ2eC8zNzkrT3VYYnNPSkNRa2pBR0F3T3JxYXNNL1NkYmEydG9LQUFqbzI3ZnZ5TUxDd3RMZmZ2c045KzdkaXpxZERqLzU1Qk91S2NUU3dmKzRKT0RwNllrelo4N2s0bmpnd0FIY3ZuMzd2cDQ5ZTQ0R2dJQi9Hc2UvL3ZwclBRQUVEaGt5NUkzOSsvY2ZPblhxRk5JRU5IbnlaTzd6Q1EzOEZEOUhSMGVNam81R3JWYUwyN1p0dytqbzZIRWRPM1pzYXFrRVlCc2FHdHE3ckt3TWRUb2REaGt5cE42dFFFc0wrcU5JUUM2WFk4K2VQWEgzN3QyY2xEMTA2QkJxdGRwajQ4YU5tK3Z0N2QwSkFGcE1uVHExZFcxdGJVVkR5VHAxNnRUV0FOREN5OHNyOXMwMzMvems0TUdEMzU4NWN3WVBIanlJQlFVRm1KbVppUU1HRE9CMlQranZXenI0SDBVQ3huRk1URXpFakl3TTFPbDBXRnhjakg4MzVod2VOMjdjbk1lSjQ5L0U2UUVBZ1FFQkFWMm5USm15NE5peFl6K2VQbjBhOSsvZmp3VUZCVFJUUGhCSFN3Yy9QdzlwQzNESWtDR28xV3B4NDhhTkdCQVEwTHRqeDQ2MlQrMVU2ZE1rZ002ZE84c09IRGpRMm1Bd0hMcDc5Njd0amgwN1lQZnUzZHpMSitobUd1UGJhQzNOMC9sM3VqSEkwZEVSYnR5NEFRNE9EbEJUVXdOdnZ2a205T3JWQzJReUdVaWxVbWphdENuWTI5dlgzTHg1ODFScGFlbXhpb3FLVTlldVhUdFhVMU56NThhTkczODZPVGsxbDhsa2RzN096cDR0Vzdac25aQ1FFTzdvNk5qNjl1M2JOamR1M0lDN2QrOUNUVTBOR0F3R1NFMU5CWkZJQkxkdTNlTCtMbjBPK2x5V0hqLzZmQStMWTExZEhhU2twRURQbmoxQktwV0NUQ1lEZTN0N2t6aWVPWFBtdDJ2WHJwMjdkKy9lWDRoNFh5d1dTK3pzN0pxNXVMajRCQWNIdCt6Um8wZDRzMmJOQW0vZHVpVzllZk1tVkZWVndkMjdkeUUvUHg4MmJOZ0FOalkyRDQyanBjZVA4T0xnNEFCRGh3NkY0Y09IdzVrelo2cFRVbElpTzNic2VPckFnUU5QNVFacjZWTW1nTHA5Ky9aVjNiNTkrNkpVS3ZYejlmV0ZtemR2Z3FPam84bTlBSllhL0laSWdBWkRMcGZEb2tXTFlNZU9IZENyVnkvbzE2OGZPRHM3dzYxYnQyUVNpYVJ0bHk1ZDJ2YnUzUnRzYlcxQktwV0NXQ3dHUkFSRWhKcWFHcWlxcW9LYk4yL0NsU3RYb0s2dURtN2N1QUVhalFhMFdpMzg4Y2NmNE9EZ1lFS1dRZ1AvbzBqQU9JN2ZmUE1ON05peEF4SVNFaUF4TVpIZVVzVEZzVmV2WHZYRzhkNjllMUJWVlFWWHJseUJ5c3BLUUVTNGZQa3k1T2ZuUTFGUkVWUldWb0pjTHVjdW82a3Zqa0xKUDdsY0RqZHUzQUJmWDErb3E2dURQLy84OHlJaVZzZkV4TlFkT0hEQThtNEVxcTJ0clFPQXFrdVhMbFg0K1BqNCtmajRnSU9Ed3dNM0ExbHk4QitIQk02ZlB3OVpXVm13Y2VOR2lJbUpnVFp0MmtCa1pDUzBhdFVLN093YXZsV3N1cm9hVHAwNkJZY1BINGFUSjAvQ3dZTUhvWG56NXZEbm4zOCtNbW1GQXY0bklZRS8vdmdEZHUvZURXdlhybjJpT042NWN3ZCsrZVVYT0hMa0NKdzhlUklPSHo0TWNya2NidDI2SlhqdzE2Y0FmSHg4b0s2dURpNWZ2bHdCQUZWMWRYVVdmWDI5eTF0dnZiV3lzTEFRdFZvdDJ0blpOZGg1WmFscnNJWnFBdncxTFQyWG82TWppa1FpbE12bDZPbnBpWjA3ZDhhNHVEZ2NNR0FBeHNYRllaY3VYZERIeHdlZG5KeTQ3elArZWY1YW43OVdGVXE4SGxVVGVKSTRlbmg0WUtkT25UQXVMZzU3OSs2TmNYRnhHQjhmajI1dWJpaVh5MUVrRW5FRjVzZU5vMURpVlY4VFVGWldGZzRZTUNEVmt0dUFhUm5RckgvLy9tOFhGeGRqUVVFQnhzYkdtZ3lPVUFhRFR3SlBrc1FQODQrYnJFS0xFNHZqMHk4QWlzVmlqSTJOeFlLQ0F0eTJiUnQyN05qeDdlam82R1lXVFFEeDhmRTJDb1VpdHFTa3BMYWdvQUNUazVNZk9CTWd0Qm1OUDVNOUtva2Y1ZW43K2RWOW9jLzQ1b3BqUTZBWGFwNFpud0pNVGs1R25VNkhxMWV2cm5WMmRvNk5pb3F5c1dnQ21ESmxpZ1FBQXJLenMwL3E5WHBjdkhneGlrUWlqckdGT3JQUjREd3FpZm5KekUvU1J5V3J0WUtmeGZISkZBQXRGeGN2WG94cXRSby8vL3p6a3dBUU1ISGlSSWxGRThDa1NaTkVBT0EyZmZyMERWUUg0RE9iME5lMGowcml4L1VOL1Q1ckJUK0w0NU1wQUhkM2Q5UnF0WmlkblkzRGh3L2ZBQUJ1NDhlUHQveXJnV05qWTV2MTZkUG5EWVBCZ0hxOUhudjE2dlhBOVdCQ1QvYUdrdTZmZW1zSFBZdmpreFVBSFIwZHNWZXZYbGhRVUlDYk4yL0dpSWlJMXlNakk1dUJFS3hqeDQ0eWUzdjdkbHF0OXJwZXI4Y0ZDeGJVdXd5d2x1Um5vR2R4ZkpxMUVaTC9DeFlzUUoxT2gwdVhMcjF1WTJQVE5pSWlRaGl2cm52cnJiZEVBT0M1WU1HQ0xMb2VqSC9LeWRxcTNNd3ovelR2VmZEdzhFQzFXbzFLcFJMZmVPT05MQUR3ZlAzMTEwVWdGUFB5OG1xZW1KZzRzYWlvQ1BWNlBmYnYzOS9xbGdITU0vK3M1SC8vL3YxUnI5Zmo1czJiTVNvcWFxSkNvV2dPUXJLQkF3Zkt4R0p4Njl6YzNNckN3a0pNUzBzeldRWXdFbUNlK2ZxYmYwUWlFYWFscGFGV3E4V3Z2LzY2VWlRU3RVNUtTaExXbTZzblRKZ2dBZ0RYZDk1NUo3V3dzQkNMaW9vd0ppYUdMUU9ZWi80UjhqOG1KZ1lMQ3dzeEl5TURCdzhlbkFvQXJtUEdqQkdCMEN3Nk90ck96OCt2dTFhcnJTb3NMTVI1OCtZSnZpbUllZWFmZGZQUHZIbnpzS0NnQUZldVhGbmw3dTdlUFN3c1RIQ3ZyUWNBZ0lrVEo0b0J3R3YrL1BsWmVyMGVpNHFLME4vZm45VUNtR2UrZ2JXL3Y3OC9GaFVWWVhaMk5oWC92TWFNR1NNR29WcFVWRlRUc0xDd2dRVUZCYlZGUlVVNGYvNzh4N3JYbm5ubUd4UDRhNnV5UWdBQUNtdEpSRUZVNmZLUCtmUG5vMTZ2eDlXclY5Y0dCZ1lPREFzTGF3cEN0bjc5K2trQXdHZmh3b1dxd3NKQ05CZ00zRjJCUXJucGhubm1uOGZOU1IwNmRFQ0R3WUE1T1RuNDVwdHZxZ0RBSnlFaFFRSkN0OGpJeUtadDI3YnRyOUZvN2hVVkZlR1hYMzc1UUMyQUZRU1piOHlGUDdsY2psOSsrU1hxOVhwTVMwdTc1Ky92M3o4ME5MUXBXSU85L3ZycllnRHdtalZyMWs2OVhvOEdnd0hqNCtNRmMyRW84OHcvNjRzLzQrUGowV0F3WUdabUpvNFpNMlluQUhpTkdqVktETlppRVJFUlRUdzhQT0tWU3VWMWVsQjdlM3ZXRjhCOG85LzN0N2UzeDh6TVROVHBkTGg0OGVMcnpzN084ZTNidDI4QzFtUmp4NDRWQTREcnFGR2o1aFlVRktEQllNQVpNMmF3Z2lEempiN3dOMlBHREN3cUtzSXRXN1pnUWtMQ1hBQndIVEZpaEJpc3pmN3VaZ3BNVFUwdEx5d3N4T0xpWXV6U3BRc3JDRExmYUF0L1hicDBRWVBCZ0VxbEVtZk1tRkVPQUlFOWUvYVVnYldhaDRkSHM2Q2dvTDVLcGZLMndXREFqSXdNN3MwdGpBU1liMHpnOS9iMnhveU1EQ3dvS01EbHk1ZmY5dmIyN3V2bTV0WU1yTm4rWGdxNGpSZ3hZZzY5SEdMeDRzV0Nld2tHODh6L3J5OUxXYng0TVJvTUJ0eTBhUk1tSkNUTUFRQzNWMTU1UlF6V2JvbUppVElBOEo4N2Q2NnFvS0FBaTR1TGNjS0VDUTF1RFRJU1lONmF3QytYeTNIQ2hBbFlYRnlNR1JrWm1KS1NvZ0lBL3g0OWVzaWdzVmhZV0ZnVEp5ZW44UFhyMTU4cUxDekVrcElTSERCZ2dHRGVoY2M4OC8vMFhZa0RCZ3pBNHVKaXpNdkx3MDgvL2ZTVWc0TkRlTHQyN1pwQVk3SXhZOGFJUER3OEhBSUNBdnBsWkdSYy8vdXRzZGk1YzJkR0FzeGJMZmc3ZCs2TWVyMGVOUm9OTGxxMDZMcVhsMWMvTnpjM2grSERoNHVnc2RscnI3MG05dkR3Y0k2TmpSMmJtNXRiVlZ4Y2pEcWREcU9qb3hrSk1HOTE0S2UzL09yMWVreE5UYTFxMzc3OU9EYzNOK2RHc2U1L1NEMUFBZ0R1TDczMDB2VGMzTnlhNHVKaTFHZzBHQkVSd1VpQWVhc0JmMFJFQkdvMEd1Nmd6d3N2dkRBREFOeDc5T2doZ2NadWlZbUpVZ0R3SEQ1OCtDZDVlWG4zaTR1TFVhdlZZbHhjSENNQjVnVVAvcmk0T05ScXRWaFlXSWhyMXF5NTM2ZFBuMDhBd0xOSGp4NVNZUFovMXFkUEh4a0FlSTBZTVdLdVVxbThUNjhXNjkyNzl3Tm5CdmdkZzR3TW1MZUVXNHo1THpOeGRIVEUzcjE3WTBGQkFlcjFlbHl6WnMzOXBLU2t1UURnMWFncS9rOUtBb01IRDU2Wm5aMTlyN2k0R0V0TFMzSDQ4T0dNQkpnWEhQaUhEeCtPcGFXbFdGQlFnT25wNmZkNjllbzFrNEgvOFVoQTBhTkhqMG03ZCsrK2JUQVlzTFMwRkdmTm1vVUtoY0xrM1hEVzhoWmQ1cTNqcmNlVWx3cUZBbWZObW9XbHBhV28wV2h3K2ZMbHQyTmpZLy8xZDE0ejhEOEdDVWdCd0xWTm16YkRObTdjZUZHdjEyTnBhU211VzdjT1EwSkM2bjFCWkdON3h4N3psdkZPUS80TFRVTkNRbkRkdW5WWVVsS0NPVGs1dUhEaHdvc0JBUUhEQU1DVnJmbWZ3RjU5OVZXeHU3dTdvNGVIUjVldnZ2cXFYSzFXWTBsSkNlcDBPaHd6Wm96SkZlTU52U1dXa1FEenozTEdOeTcwaVVRaUhETm1ET3AwT2pRWURMaGp4dzc4NElNUHlsMWRYYnU0dWJrNU51cXR2ditSQkpyS1pMTFdFeWRPWEx0bno1NWFXaEo4OTkxMzZPdnIrMEJ0Z0NrQzVwL0hqRys4MXZmMTljWHZ2dnNPUzB0TFVhdlY0dXJWcTJ0SGpCaXhWaXFWdG5aemMydkt3UDgvMk9qUm8wVjkrdlN4QlFDdjZPam8xOWVzV1hOZW85RmdhV2twRmhVVjRSdHZ2TUVOenFQZUc4L0lnUGwvQW5yK2pFOTU1dWJtaG0rODhRWVdGUlZoY1hFeFptWm00c0tGQzgrSGhvYSsvbmV4ejdaUmR2ZzlxN3FBdTd1N282T2pZK1JiYjcyMVBUTXo4MzVSVVJIdTNic1hjM0p5Y09USWtTaVZTaDlZRmp3dUdUQlNZQzhpZlJqb2plVytWQ3JGa1NOSFlrNU9EdTdkdXhjMUdnMnVXYlBtL3VqUm83YzdPRGhFdXJtNU9mYnMyWk90OTUrMmpSbzFTaFFhR21vSEFGNmhvYUhKMzN6enpROUtwUktMaTRzNUluajU1WmROcmx0NkhESjRGQ2t3YjUyZVAvNFBBejM5LzVkZmZwa0R2bDZ2eHkxYnR1RHMyYk9QaDRTRWpBUUE3L2J0Mjl1OThzb3JiTlovbHBhUWtDRHg4UEJ3QUlDZ1BuMzZ6RXBOVGYwakx5K1BJNEs4dkR4OCsrMjMwZFhWbGFzUjhKY0hmREpvaUJTWXQwN1BIM2QrWGxDK09EbzZvcXVySzc3OTl0dVlsNWVIZS9mdXhjTENRdHkrZlR0KytlV1hmN3p3d2d1ekFDREkzZDNkb1dmUG5xeXQ5M24zREhoNGVEaloyZG0xN2QrLy8veVZLMWVleThuSlFZUEJnSHYzN3NWOSsvYmhOOTk4Z3dNSERrUjdlM3VPRElqUkd5S0Zoc2lCZVdIN2hzYVo4b0R5d3RIUkVlM3Q3WEhnd0lINHpUZmY0TDU5KzdDMHRCUjFPaDF1M2JvVkZ5NWNlSzVQbno3emJXMXQyM3A0ZURqMTd0MmI3ZTJiczBpWWxKUmtBd0RPTXBrc3VGdTNiaDhzWExqd2gxMjdkcUZPcDhQUzBsSk9ybjN4eFJjNGJOZ3dkSE56NHk0Zm9VRi9YRkpnWHRpZUQzYnljcmtjM2R6Y2NOaXdZZmpGRjErZ1hxL0h2WHYzY3VmMjE2OWZqM1BtekRuZXFWT25EMlF5V1RBQU9QZnAwOGRtNU1pUmdwYjdJbXNpZ2l0WHJraVBIajNhOU1LRkMwNGhJU0ZSblR0M0hoWWJHOXZIMWRYVjBjSEJBV3hzYkVBcy9yOGRtWFBuenNFdnYvd0N2Lzc2SzF5OWVoVk9uRGdCdDIvZmhtdlhyb0ZjTG9kYnQyNkJnNE1EM0xwMUMrUnlPZHk4ZVpONWdYb2FSd2NIQjdoNTh5WTRPenREczJiTklDUWtCRnhjWEtCTm16WVFIQndNM3Q3ZUFBQlFXMXNMZCsvZWhhdFhyOExWcTFkdmxKZVhhOHZMeTNmOThzc3Zoenc4UEs2SGg0Zi81ZXJxV3J0bHl4WVVPbTZzc2xpUmxKUWt2WGp4b3UyUkkwZWEyZGpZdUVaRVJIU1Bpb3JxMDc1OSszaFhWMWYzNXMyYmc1MmRIVWlsVWhDTHhSd3AxTmJXUW1WbEpWeTRjQUgrK3VzdnVISGpCbFJYVjhQdDI3ZkJ4c1lHN3QyN3g3ekFmTE5temNEVzFoWWNIUjJoYWRPbW9GQW93TlBURTZUUy95dlMxOVhWd2YzNzkrSGV2WHZ3MTE5L3djMmJOK0hxMWF1WGZ2cnBwN0lmZnZoQmUvVG8wZUo3OSs1ZGpZaUkrTlBkM2IxYW85SFVXaE5XckxwYU9YYnNXTkhSbzBlbEZ5OWV0S3Vzckd3S0FBNXQyN2J0NE9ucEdSY1ZGUlhwNStmWHJubno1aDUyZG5aZ2IyOFB0cmEySUpWS1FTS1JnRmdzQnBGSUJDS1JpQ01JWnNLeXVybzZRRVR1aThCZVUxTURkKzdjZ2J0MzcwSjFkVFhjdW5YcjR0bXpaMzg2ZHV6WTRjckt5djBuVHB3NERnQzNGQXJGWHdxRm9pb3NMS3gydzRZTmFJMHhhalRiRmErLy9ycm8wcVZMa2dzWEx0aWNQMy9lOXZ6NTgwMEF3TjdSMGRIWjM5Ky9wVnd1RDVUTDVmN0J3Y0dCenM3T2lpWk5talMzc2JGcGFtTmowMVFpa2RneU9BblRhbXRycSsvZHUvZFhkWFgxWDNmdTNQbnoyclZyRjA2ZE9uWDY1czJiWjIvZXZIbjY3Tm16LzdseDQ4WTFBTGpqNWVWMTE4dkxxMXFoVU54emQzZS92M2J0V3JUMitEVGEvY3FKRXllS0xseTRJSzZzckpTSVJDTHB1WFBucE9mT25aTUJnQzBBeUFCQUNnQ1N2NzlFalRsV0FqYjgrK3YrMzErMUFGQURBTlhlM3Q0MVBqNCt0WFYxZGJXZW5wNzNQVDA5NjlMUzByQ3hCWWdsTmM5U1VsSkVZckZZSkJLSlJQdjM3eGVKUkNKQVJCWXI0UklBQUFERXhjVWhJbUpkWFIwMlJxQXpZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpDelovai9lenYwRVZzRTBqd0FBQUFCSlJVNUVya0pnZ2c9PSc7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRvb2x0aXA7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleC5qc1wiKTtcbiIsIi8vIHJlcXVpcmUoJ2ZzJykucmVhZGRpclN5bmMoX19kaXJuYW1lICsgJy8nKS5mb3JFYWNoKGZ1bmN0aW9uKGZpbGUpIHtcbi8vICAgICBpZiAoZmlsZS5tYXRjaCgvLitcXC5qcy9nKSAhPT0gbnVsbCAmJiBmaWxlICE9PSBfX2ZpbGVuYW1lKSB7XG4vLyBcdHZhciBuYW1lID0gZmlsZS5yZXBsYWNlKCcuanMnLCAnJyk7XG4vLyBcdG1vZHVsZS5leHBvcnRzW25hbWVdID0gcmVxdWlyZSgnLi8nICsgZmlsZSk7XG4vLyAgICAgfVxuLy8gfSk7XG5cbi8vIFNhbWUgYXNcbnZhciB1dGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzLmpzXCIpO1xudXRpbHMucmVkdWNlID0gcmVxdWlyZShcIi4vcmVkdWNlLmpzXCIpO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdXRpbHM7XG4iLCJ2YXIgcmVkdWNlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzbW9vdGggPSA1O1xuICAgIHZhciB2YWx1ZSA9ICd2YWwnO1xuICAgIHZhciByZWR1bmRhbnQgPSBmdW5jdGlvbiAoYSwgYikge1xuXHRpZiAoYSA8IGIpIHtcblx0ICAgIHJldHVybiAoKGItYSkgPD0gKGIgKiAwLjIpKTtcblx0fVxuXHRyZXR1cm4gKChhLWIpIDw9IChhICogMC4yKSk7XG4gICAgfTtcbiAgICB2YXIgcGVyZm9ybV9yZWR1Y2UgPSBmdW5jdGlvbiAoYXJyKSB7cmV0dXJuIGFycjt9O1xuXG4gICAgdmFyIHJlZHVjZSA9IGZ1bmN0aW9uIChhcnIpIHtcblx0aWYgKCFhcnIubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gYXJyO1xuXHR9XG5cdHZhciBzbW9vdGhlZCA9IHBlcmZvcm1fc21vb3RoKGFycik7XG5cdHZhciByZWR1Y2VkICA9IHBlcmZvcm1fcmVkdWNlKHNtb290aGVkKTtcblx0cmV0dXJuIHJlZHVjZWQ7XG4gICAgfTtcblxuICAgIHZhciBtZWRpYW4gPSBmdW5jdGlvbiAodiwgYXJyKSB7XG5cdGFyci5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG5cdCAgICByZXR1cm4gYVt2YWx1ZV0gLSBiW3ZhbHVlXTtcblx0fSk7XG5cdGlmIChhcnIubGVuZ3RoICUgMikge1xuXHQgICAgdlt2YWx1ZV0gPSBhcnJbfn4oYXJyLmxlbmd0aCAvIDIpXVt2YWx1ZV07XHQgICAgXG5cdH0gZWxzZSB7XG5cdCAgICB2YXIgbiA9IH5+KGFyci5sZW5ndGggLyAyKSAtIDE7XG5cdCAgICB2W3ZhbHVlXSA9IChhcnJbbl1bdmFsdWVdICsgYXJyW24rMV1bdmFsdWVdKSAvIDI7XG5cdH1cblxuXHRyZXR1cm4gdjtcbiAgICB9O1xuXG4gICAgdmFyIGNsb25lID0gZnVuY3Rpb24gKHNvdXJjZSkge1xuXHR2YXIgdGFyZ2V0ID0ge307XG5cdGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG5cdCAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KHByb3ApKSB7XG5cdFx0dGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuXHQgICAgfVxuXHR9XG5cdHJldHVybiB0YXJnZXQ7XG4gICAgfTtcblxuICAgIHZhciBwZXJmb3JtX3Ntb290aCA9IGZ1bmN0aW9uIChhcnIpIHtcblx0aWYgKHNtb290aCA9PT0gMCkgeyAvLyBubyBzbW9vdGhcblx0ICAgIHJldHVybiBhcnI7XG5cdH1cblx0dmFyIHNtb290aF9hcnIgPSBbXTtcblx0Zm9yICh2YXIgaT0wOyBpPGFyci5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIGxvdyA9IChpIDwgc21vb3RoKSA/IDAgOiAoaSAtIHNtb290aCk7XG5cdCAgICB2YXIgaGlnaCA9IChpID4gKGFyci5sZW5ndGggLSBzbW9vdGgpKSA/IGFyci5sZW5ndGggOiAoaSArIHNtb290aCk7XG5cdCAgICBzbW9vdGhfYXJyW2ldID0gbWVkaWFuKGNsb25lKGFycltpXSksIGFyci5zbGljZShsb3csaGlnaCsxKSk7XG5cdH1cblx0cmV0dXJuIHNtb290aF9hcnI7XG4gICAgfTtcblxuICAgIHJlZHVjZS5yZWR1Y2VyID0gZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gcGVyZm9ybV9yZWR1Y2U7XG5cdH1cblx0cGVyZm9ybV9yZWR1Y2UgPSBjYmFrO1xuXHRyZXR1cm4gcmVkdWNlO1xuICAgIH07XG5cbiAgICByZWR1Y2UucmVkdW5kYW50ID0gZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gcmVkdW5kYW50O1xuXHR9XG5cdHJlZHVuZGFudCA9IGNiYWs7XG5cdHJldHVybiByZWR1Y2U7XG4gICAgfTtcblxuICAgIHJlZHVjZS52YWx1ZSA9IGZ1bmN0aW9uICh2YWwpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gdmFsdWU7XG5cdH1cblx0dmFsdWUgPSB2YWw7XG5cdHJldHVybiByZWR1Y2U7XG4gICAgfTtcblxuICAgIHJlZHVjZS5zbW9vdGggPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHNtb290aDtcblx0fVxuXHRzbW9vdGggPSB2YWw7XG5cdHJldHVybiByZWR1Y2U7XG4gICAgfTtcblxuICAgIHJldHVybiByZWR1Y2U7XG59O1xuXG52YXIgYmxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlZCA9IHJlZHVjZSgpXG5cdC52YWx1ZSgnc3RhcnQnKTtcblxuICAgIHZhciB2YWx1ZTIgPSAnZW5kJztcblxuICAgIHZhciBqb2luID0gZnVuY3Rpb24gKG9iajEsIG9iajIpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICdvYmplY3QnIDoge1xuICAgICAgICAgICAgICAgICdzdGFydCcgOiBvYmoxLm9iamVjdFtyZWQudmFsdWUoKV0sXG4gICAgICAgICAgICAgICAgJ2VuZCcgICA6IG9iajJbdmFsdWUyXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd2YWx1ZScgIDogb2JqMlt2YWx1ZTJdXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIC8vIHZhciBqb2luID0gZnVuY3Rpb24gKG9iajEsIG9iajIpIHsgcmV0dXJuIG9iajEgfTtcblxuICAgIHJlZC5yZWR1Y2VyKCBmdW5jdGlvbiAoYXJyKSB7XG5cdHZhciB2YWx1ZSA9IHJlZC52YWx1ZSgpO1xuXHR2YXIgcmVkdW5kYW50ID0gcmVkLnJlZHVuZGFudCgpO1xuXHR2YXIgcmVkdWNlZF9hcnIgPSBbXTtcblx0dmFyIGN1cnIgPSB7XG5cdCAgICAnb2JqZWN0JyA6IGFyclswXSxcblx0ICAgICd2YWx1ZScgIDogYXJyWzBdW3ZhbHVlMl1cblx0fTtcblx0Zm9yICh2YXIgaT0xOyBpPGFyci5sZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHJlZHVuZGFudCAoYXJyW2ldW3ZhbHVlXSwgY3Vyci52YWx1ZSkpIHtcblx0XHRjdXJyID0gam9pbihjdXJyLCBhcnJbaV0pO1xuXHRcdGNvbnRpbnVlO1xuXHQgICAgfVxuXHQgICAgcmVkdWNlZF9hcnIucHVzaCAoY3Vyci5vYmplY3QpO1xuXHQgICAgY3Vyci5vYmplY3QgPSBhcnJbaV07XG5cdCAgICBjdXJyLnZhbHVlID0gYXJyW2ldLmVuZDtcblx0fVxuXHRyZWR1Y2VkX2Fyci5wdXNoKGN1cnIub2JqZWN0KTtcblxuXHQvLyByZWR1Y2VkX2Fyci5wdXNoKGFyclthcnIubGVuZ3RoLTFdKTtcblx0cmV0dXJuIHJlZHVjZWRfYXJyO1xuICAgIH0pO1xuXG4gICAgcmVkdWNlLmpvaW4gPSBmdW5jdGlvbiAoY2Jhaykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBqb2luO1xuXHR9XG5cdGpvaW4gPSBjYmFrO1xuXHRyZXR1cm4gcmVkO1xuICAgIH07XG5cbiAgICByZWR1Y2UudmFsdWUyID0gZnVuY3Rpb24gKGZpZWxkKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHZhbHVlMjtcblx0fVxuXHR2YWx1ZTIgPSBmaWVsZDtcblx0cmV0dXJuIHJlZDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHJlZDtcbn07XG5cbnZhciBsaW5lID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZWQgPSByZWR1Y2UoKTtcblxuICAgIHJlZC5yZWR1Y2VyICggZnVuY3Rpb24gKGFycikge1xuXHR2YXIgcmVkdW5kYW50ID0gcmVkLnJlZHVuZGFudCgpO1xuXHR2YXIgdmFsdWUgPSByZWQudmFsdWUoKTtcblx0dmFyIHJlZHVjZWRfYXJyID0gW107XG5cdHZhciBjdXJyID0gYXJyWzBdO1xuXHRmb3IgKHZhciBpPTE7IGk8YXJyLmxlbmd0aC0xOyBpKyspIHtcblx0ICAgIGlmIChyZWR1bmRhbnQgKGFycltpXVt2YWx1ZV0sIGN1cnJbdmFsdWVdKSkge1xuXHRcdGNvbnRpbnVlO1xuXHQgICAgfVxuXHQgICAgcmVkdWNlZF9hcnIucHVzaCAoY3Vycik7XG5cdCAgICBjdXJyID0gYXJyW2ldO1xuXHR9XG5cdHJlZHVjZWRfYXJyLnB1c2goY3Vycik7XG5cdHJlZHVjZWRfYXJyLnB1c2goYXJyW2Fyci5sZW5ndGgtMV0pO1xuXHRyZXR1cm4gcmVkdWNlZF9hcnI7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVkO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlZHVjZTtcbm1vZHVsZS5leHBvcnRzLmxpbmUgPSBsaW5lO1xubW9kdWxlLmV4cG9ydHMuYmxvY2sgPSBibG9jaztcblxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpdGVyYXRvciA6IGZ1bmN0aW9uKGluaXRfdmFsKSB7XG5cdHZhciBpID0gaW5pdF92YWwgfHwgMDtcblx0dmFyIGl0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gaSsrO1xuXHR9O1xuXHRyZXR1cm4gaXRlcjtcbiAgICB9LFxuXG4gICAgc2NyaXB0X3BhdGggOiBmdW5jdGlvbiAoc2NyaXB0X25hbWUpIHsgLy8gc2NyaXB0X25hbWUgaXMgdGhlIGZpbGVuYW1lXG5cdHZhciBzY3JpcHRfc2NhcGVkID0gc2NyaXB0X25hbWUucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyk7XG5cdHZhciBzY3JpcHRfcmUgPSBuZXcgUmVnRXhwKHNjcmlwdF9zY2FwZWQgKyAnJCcpO1xuXHR2YXIgc2NyaXB0X3JlX3N1YiA9IG5ldyBSZWdFeHAoJyguKiknICsgc2NyaXB0X3NjYXBlZCArICckJyk7XG5cblx0Ly8gVE9ETzogVGhpcyByZXF1aXJlcyBwaGFudG9tLmpzIG9yIGEgc2ltaWxhciBoZWFkbGVzcyB3ZWJraXQgdG8gd29yayAoZG9jdW1lbnQpXG5cdHZhciBzY3JpcHRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpO1xuXHR2YXIgcGF0aCA9IFwiXCI7ICAvLyBEZWZhdWx0IHRvIGN1cnJlbnQgcGF0aFxuXHRpZihzY3JpcHRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGZvcih2YXIgaSBpbiBzY3JpcHRzKSB7XG5cdFx0aWYoc2NyaXB0c1tpXS5zcmMgJiYgc2NyaXB0c1tpXS5zcmMubWF0Y2goc2NyaXB0X3JlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2NyaXB0c1tpXS5zcmMucmVwbGFjZShzY3JpcHRfcmVfc3ViLCAnJDEnKTtcblx0XHR9XG4gICAgICAgICAgICB9XG5cdH1cblx0cmV0dXJuIHBhdGg7XG4gICAgfSxcblxuICAgIGRlZmVyX2NhbmNlbCA6IGZ1bmN0aW9uIChjYmFrLCB0aW1lKSB7XG5cdHZhciB0aWNrO1xuXG5cdHZhciBkZWZlcl9jYW5jZWwgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICBjbGVhclRpbWVvdXQodGljayk7XG5cdCAgICB0aWNrID0gc2V0VGltZW91dChjYmFrLCB0aW1lKTtcblx0fTtcblxuXHRyZXR1cm4gZGVmZXJfY2FuY2VsO1xuICAgIH1cbn07XG4iLCJ2YXIgdG50X2JvYXJkID0gcmVxdWlyZShcInRudC5ib2FyZFwiKTtcblxudmFyIHRudF9mZWF0dXJlX3RyYW5zY3JpcHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gTkFNRSBGRUFUVVJFXG4gICAgdmFyIG5hbWVGZWF0dXJlID0gdG50X2JvYXJkLnRyYWNrLmZlYXR1cmUoKVxuXHQuY3JlYXRlIChmdW5jdGlvbiAobmFtZSwgeFNjYWxlKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0aGlzO1xuXHQgICAgdmFyIGJhc2VsaW5lID0gKHRyYWNrLmhlaWdodCgpIC8gMikgKyA3O1xuXHQgICAgbmFtZVxuXHRcdC5hcHBlbmQoXCJ0ZXh0XCIpXG5cdFx0LmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0ICAgIHJldHVybiB4U2NhbGUoZC5wb3MpO1xuXHRcdH0pXG5cdFx0LmF0dHIoXCJ5XCIsIGJhc2VsaW5lKVxuXHRcdC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdCAgICByZXR1cm4gbmFtZUZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpO1xuXHRcdH0pXG5cdFx0LnRleHQoZnVuY3Rpb24gKGQpIHtcblx0XHQgICAgdmFyIGxhYmVsID0gZC5uYW1lO1xuXHRcdCAgICByZXR1cm4gZC5zdHJhbmQgPT09IDEgPyAoZC5uYW1lICsgXCI+XCIpIDogKFwiPFwiICsgZC5uYW1lKTtcblx0XHR9KTtcblx0fSlcblx0Lm1vdmVyIChmdW5jdGlvbiAoKSB7fSk7IC8vIE5vIG5lZWQgdG8gbW92ZSBzaW5jZSB0aGUgYm9hcmQgZG9lbnMndCBhbGxvdyBwYW5uaW5nIG9yIHpvb21pbmdcblxuICAgIC8vIElOVFJPTiBGRUFUVVJFXG4gICAgdmFyIGludHJvbkZlYXR1cmUgPSB0bnRfYm9hcmQudHJhY2suZmVhdHVyZSgpXG4gICAgICAgIC5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHQgICAgdmFyIHRyYWNrID0gdGhpcztcblxuXHQgICAgdmFyIGZlYXR1cmVCb3R0b20gPSAodHJhY2suaGVpZ2h0KCkgLyAyKSAqIDAuMjU7XG5cblx0ICAgIG5ld19lbGVtc1xuXHQgICAgICAgIC5hcHBlbmQoXCJwYXRoXCIpXG5cdFx0LmF0dHIoXCJzdHJva2VcIiwgaW50cm9uRmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdFx0LmF0dHIoXCJzdHJva2Utd2lkdGhcIiwgXCIxcHhcIilcblx0ICAgICAgICAuYXR0cihcImRcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHQgICAgdmFyIHBhdGggPSBcIk1cIiArIHhTY2FsZShkLnN0YXJ0KSArIFwiLFwiICsgZmVhdHVyZUJvdHRvbSArXG5cdFx0XHRcIkxcIiArICh4U2NhbGUoZC5zdGFydCkgKyAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSkvMikgICsgXCIsXCIgKyAwICtcblx0XHRcdFwiTFwiICsgKHhTY2FsZShkLmVuZCkpICsgXCIsXCIgKyBmZWF0dXJlQm90dG9tO1xuXHRcdCAgICByZXR1cm4gcGF0aDtcblx0XHR9KTtcblx0fSlcbiAgICAgICAgLm1vdmVyIChmdW5jdGlvbiAoKSB7fSk7IC8vIE5vIG5lZWQgdG8gbW92ZSBzaW5jZSB0aGUgYm9hcmQgZG9lc24ndCBhbGxvdyBwYW5uaW5nICYgem9vbWluZ1xuXG4gICAgLy8gRVhPTiBGRUFUVVJFXG4gICAgdmFyIGV4b25GZWF0dXJlID0gdG50X2JvYXJkLnRyYWNrLmZlYXR1cmUoKVxuICAgICAgICAuaW5kZXgoZnVuY3Rpb24gKG4pIHtcblx0ICAgIHJldHVybiBuLnN0YXJ0O1xuXHR9KVxuICAgICAgICAuY3JlYXRlIChmdW5jdGlvbiAobmV3X2VsZW1zLCB4U2NhbGUpIHtcblx0ICAgIHZhciB0cmFjayA9IHRoaXM7XG5cblx0ICAgIHZhciBmZWF0dXJlSGVpZ2h0ID0gKHRyYWNrLmhlaWdodCgpLzIpICogMC41O1xuXHQgICAgdmFyIHlPZmZzZXQgPSAodHJhY2suaGVpZ2h0KCkvMikgKiAwLjI1O1xuXG5cdCAgICBuZXdfZWxlbXNcblx0ICAgICAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdCAgICByZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHRcdH0pXG5cdCAgICAgICAgLmF0dHIoXCJ5XCIsIHlPZmZzZXQpXG5cdCAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdCAgICByZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuXHRcdH0pXG5cdCAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgZmVhdHVyZUhlaWdodClcblx0ICAgICAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuXHQgICAgICAgIC50cmFuc2l0aW9uKClcblx0ICAgICAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdCAgICBpZiAoIWQuY29kaW5nKSB7XG5cdFx0XHRyZXR1cm4gdHJhY2suYmFja2dyb3VuZF9jb2xvcigpO1xuXHRcdCAgICB9XG5cdFx0ICAgIC8vcmV0dXJuIHRyYWNrLmJhY2tncm91bmRfY29sb3IoKTtcblx0XHR9KVxuXHQgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIGV4b25GZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSk7XG5cdH0pXG4gICAgICAgIC5tb3ZlciAoZnVuY3Rpb24gKCkge30pOyAvLyBObyBuZWVkIHRvIG1vdmUgc2luY2UgdGhlIGJvYXJkIGRvZXNuJ3QgYWxsb3cgcGFubmluZyAmIHpvb21pbmdcblxuICAgIC8vIENPTVBPU0lURSBGRUFUVVJFXG4gICAgdmFyIGNvbXBvc2l0ZUZlYXR1cmUgPSB0bnRfYm9hcmQudHJhY2suZmVhdHVyZS5jb21wb3NpdGUoKVxuICAgICAgICAuYWRkIChcImV4b25zXCIsIGV4b25GZWF0dXJlKVxuICAgICAgICAuYWRkIChcImludHJvbnNcIiwgaW50cm9uRmVhdHVyZSlcbiAgICAgICAgLmFkZCAoXCJuYW1lXCIsIG5hbWVGZWF0dXJlKTtcblxuICAgIHJldHVybiBjb21wb3NpdGVGZWF0dXJlO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfZmVhdHVyZV90cmFuc2NyaXB0O1xuIiwidmFyIHRudF9ib2FyZCA9IHJlcXVpcmUoXCJ0bnQuYm9hcmRcIik7XG52YXIgZW5zZW1ibCA9IHJlcXVpcmUoXCJ0bnQuZW5zZW1ibFwiKTtcbnZhciB0cmFuc2NyaXB0RmVhdHVyZSA9IHJlcXVpcmUoXCIuL2ZlYXR1cmVcIik7XG5cbnRudF90cmFuc2NyaXB0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGNvbmYgPSB7XG5cdGRhdGEgOiB1bmRlZmluZWQsXG5cdGdlbmUgOiB1bmRlZmluZWQsXG5cdG9uX2NsaWNrIDogZnVuY3Rpb24gKCkge30sXG5cdG9uX2xvYWQgOiBmdW5jdGlvbiAoKSB7fSAvLyBleGVjdXRlZCB3aGVuIHRoZSB0cmFuc2NyaXB0IGRhdGEgYXJyaXZlc1xuICAgIH07XG4gICAgXG5cbiAgICAvLyB0cmFja3NcbiAgICB2YXIgYXhpc190cmFjayA9IHRudF9ib2FyZC50cmFjaygpXG5cdC5oZWlnaHQoMjApXG5cdC5iYWNrZ3JvdW5kX2NvbG9yKFwid2hpdGVcIilcblx0LmRpc3BsYXkodG50X2JvYXJkLnRyYWNrLmZlYXR1cmUuYXhpcygpXG5cdFx0IC5vcmllbnRhdGlvbihcInRvcFwiKVxuXHRcdCk7XG5cbiAgICB2YXIgdHJhbnNjcmlwdFZpZXdlciA9IHRudF9ib2FyZCgpXG5cdC5hbGxvd19kcmFnKGZhbHNlKVxuXHQuYWRkX3RyYWNrKGF4aXNfdHJhY2spO1xuXG4gICAgdHJhbnNjcmlwdFZpZXdlci5fc3RhcnQgPSB0cmFuc2NyaXB0Vmlld2VyLnN0YXJ0O1xuXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24gKCkge1xuXHRpZiAoIWNvbmYuZGF0YSAmJiBjb25mLmdlbmUpIHtcbiAgICBcdCAgICB2YXIgZW5zZW1ibFJlc3QgPSBlbnNlbWJsKCk7XG5cdCAgICB2YXIgZ2VuZV91cmwgPSBlbnNlbWJsUmVzdC51cmwuZ2VuZSh7XG5cdFx0aWQ6IGNvbmYuZ2VuZSxcblx0XHRleHBhbmQ6IDFcblx0ICAgIH0pO1xuXHQgICAgZW5zZW1ibFJlc3QuY2FsbChnZW5lX3VybClcblx0XHQudGhlbiAoZnVuY3Rpb24gKHJlc3ApIHtcblx0XHQgICAgZm9yICh2YXIgaT0wOyBpPHJlc3AuYm9keS5UcmFuc2NyaXB0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgdCA9IHJlc3AuYm9keS5UcmFuc2NyaXB0W2ldO1xuXHRcdFx0dHJhbnNjcmlwdFZpZXdlci5hZGRfdHJhY2soZ2V0VHJhbnNjcmlwdFRyYWNrKHQpKTtcblx0XHQgICAgfVxuXHRcdCAgICB0cmFuc2NyaXB0Vmlld2VyXG5cdFx0XHQuZnJvbShyZXNwLmJvZHkuc3RhcnQpXG5cdFx0XHQudG8ocmVzcC5ib2R5LmVuZClcblx0XHRcdC5yaWdodChyZXNwLmJvZHkuZW5kKVxuXHRcdFx0Lnpvb21fb3V0KHJlc3AuYm9keS5lbmQgLSByZXNwLmJvZHkuc3RhcnQpO1xuXHRcdCAgICBjb25mLm9uX2xvYWQocmVzcC5ib2R5LlRyYW5zY3JpcHQpO1xuXHRcdCAgICB0cmFuc2NyaXB0Vmlld2VyLl9zdGFydCgpO1xuXHRcdH0pO1xuXHR9XG5cdC8vIFRPRE86IFRoaXMgaXMgbm90IHdvcmtpbmcgeWV0LiBUaGUgaWRlYSBpcyB0byBiZSBhYmxlIHRvIHBhc3MgY3VzdG9tIGRhdGEgaW5zdGVhZCBvZlxuXHQvLyByZWx5aW5nIG9uIGVuc2VtYmwgZ2VuZSB0cmFuc2NyaXB0c1xuXHRpZiAoY29uZi5kYXRhKSB7XG5cdCAgICBjb25zb2xlLndhcm4gKFwiRGF0YSBmdWxseSBwYXNzZWQsIGxldHMgdHJ5IHRvIHZpc3VhbGl6ZSB0aGF0IChOb3RoaW5nIGZvciBub3cpXCIpO1xuXHR9XG4gICAgfTtcbiAgICB0cmFuc2NyaXB0Vmlld2VyLnN0YXJ0ID0gc3RhcnQ7XG5cbiAgICBmdW5jdGlvbiBleG9uc1RvRXhvbnNBbmRJbnRyb25zIChleG9ucywgdCkge1xuXHR2YXIgb2JqID0ge307XG5cdG9iai5leG9ucyA9IGV4b25zO1xuXHRvYmouaW50cm9ucyA9IFtdO1xuXHRmb3IgKHZhciBpPTA7IGk8ZXhvbnMubGVuZ3RoLTE7IGkrKykge1xuXHQgICAgdmFyIGludHJvbiA9IHtcblx0XHRzdGFydCA6IGV4b25zW2ldLnN0cmFuZCA9PT0gMSA/IGV4b25zW2ldLmVuZCA6IGV4b25zW2ldLnN0YXJ0LFxuXHRcdGVuZCAgIDogZXhvbnNbaV0uc3RyYW5kID09PSAxID8gZXhvbnNbaSsxXS5zdGFydCA6IGV4b25zW2krMV0uZW5kLFxuXHRcdHRyYW5zY3JpcHQgOiB0XG5cdCAgICB9O1xuXHQgICAgb2JqLmludHJvbnMucHVzaChpbnRyb24pO1xuXHR9XG5cdHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VHJhbnNjcmlwdFRyYWNrICh0cmFuc2NyaXB0KSB7XG5cdC8vIE5vbiBjb2Rpbmdcblx0dmFyIG5ld0V4b25zID0gW107XG5cdHZhciB0cmFuc2xhdGlvblN0YXJ0O1xuXHR2YXIgdHJhbnNsYXRpb25FbmQ7XG5cdGlmICh0cmFuc2NyaXB0LlRyYW5zbGF0aW9uICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIHRyYW5zbGF0aW9uU3RhcnQgPSB0cmFuc2NyaXB0LlRyYW5zbGF0aW9uLnN0YXJ0O1xuXHQgICAgdHJhbnNsYXRpb25FbmQgPSB0cmFuc2NyaXB0LlRyYW5zbGF0aW9uLmVuZDtcblx0fVxuXHR2YXIgZXhvbnMgPSB0cmFuc2NyaXB0LkV4b247XG5cdGZvciAodmFyIGk9MDsgaTxleG9ucy5sZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHRyYW5zY3JpcHQuVHJhbnNsYXRpb24gPT09IHVuZGVmaW5lZCkgeyAvLyBOTyBjb2RpbmcgdHJhbnNjcmlwdFxuXHRcdG5ld0V4b25zLnB1c2goe1xuXHRcdCAgICBzdGFydCAgIDogZXhvbnNbaV0uc3RhcnQsXG5cdFx0ICAgIGVuZCAgICAgOiBleG9uc1tpXS5lbmQsXG5cdFx0ICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuXHRcdCAgICBjb2RpbmcgIDogZmFsc2Vcblx0XHR9KTtcblx0ICAgIH0gZWxzZSB7XG5cdFx0aWYgKGV4b25zW2ldLnN0YXJ0IDwgdHJhbnNsYXRpb25TdGFydCkge1xuXHRcdCAgICAvLyA1J1xuXHRcdCAgICBpZiAoZXhvbnNbaV0uZW5kIDwgdHJhbnNsYXRpb25TdGFydCkge1xuXHRcdFx0Ly8gQ29tcGxldGVseSBub24gY29kaW5nXG5cdFx0XHRuZXdFeG9ucy5wdXNoKHtcblx0XHRcdCAgICBzdGFydCAgOiBleG9uc1tpXS5zdGFydCxcblx0XHRcdCAgICBlbmQgICAgOiBleG9uc1tpXS5lbmQsXG5cdFx0XHQgICAgdHJhbnNjcmlwdCA6IHRyYW5zY3JpcHQsXG5cdFx0XHQgICAgY29kaW5nIDogZmFsc2Vcblx0XHRcdH0pO1xuXHRcdCAgICB9IGVsc2Uge1xuXHRcdFx0Ly8gSGFzIDUnVVRSXG5cdFx0XHR2YXIgbmNFeG9uNSA9IHtcblx0XHRcdCAgICBzdGFydCAgOiBleG9uc1tpXS5zdGFydCxcblx0XHRcdCAgICBlbmQgICAgOiB0cmFuc2xhdGlvblN0YXJ0LFxuXHRcdFx0ICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuXHRcdFx0ICAgIGNvZGluZyA6IGZhbHNlXG5cdFx0XHR9O1xuXHRcdFx0dmFyIGNvZGluZ0V4b241ID0ge1xuXHRcdFx0ICAgIHN0YXJ0ICA6IHRyYW5zbGF0aW9uU3RhcnQsXG5cdFx0XHQgICAgZW5kICAgIDogZXhvbnNbaV0uZW5kLFxuXHRcdFx0ICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuXHRcdFx0ICAgIGNvZGluZyA6IHRydWVcblx0XHRcdH07XG5cdFx0XHRpZiAoZXhvbnNbaV0uc3RyYW5kID09PSAxKSB7XG5cdFx0XHQgICAgbmV3RXhvbnMucHVzaChuY0V4b241KTtcblx0XHRcdCAgICBuZXdFeG9ucy5wdXNoKGNvZGluZ0V4b241KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHQgICAgbmV3RXhvbnMucHVzaChjb2RpbmdFeG9uNSk7XG5cdFx0XHQgICAgbmV3RXhvbnMucHVzaChuY0V4b241KTtcblx0XHRcdH1cblx0XHQgICAgfVxuXHRcdH0gZWxzZSBpZiAoZXhvbnNbaV0uZW5kID4gdHJhbnNsYXRpb25FbmQpIHtcblx0XHQgICAgLy8gMydcblx0XHQgICAgaWYgKGV4b25zW2ldLnN0YXJ0ID4gdHJhbnNsYXRpb25FbmQpIHtcblx0XHRcdC8vIENvbXBsZXRlbHkgbm9uIGNvZGluZ1xuXHRcdFx0bmV3RXhvbnMucHVzaCh7XG5cdFx0XHQgICAgc3RhcnQgICA6IGV4b25zW2ldLnN0YXJ0LFxuXHRcdFx0ICAgIGVuZCAgICAgOiBleG9uc1tpXS5lbmQsXG5cdFx0XHQgICAgdHJhbnNjcmlwdCA6IHRyYW5zY3JpcHQsXG5cdFx0XHQgICAgY29kaW5nICA6IGZhbHNlXG5cdFx0XHR9KTtcblx0XHQgICAgfSBlbHNlIHtcblx0XHRcdC8vIEhhcyAzJ1VUUlxuXHRcdFx0dmFyIGNvZGluZ0V4b24zID0ge1xuXHRcdFx0ICAgIHN0YXJ0ICA6IGV4b25zW2ldLnN0YXJ0LFxuXHRcdFx0ICAgIGVuZCAgICA6IHRyYW5zbGF0aW9uRW5kLFxuXHRcdFx0ICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuXHRcdFx0ICAgIGNvZGluZyA6IHRydWVcblx0XHRcdH07XG5cdFx0XHR2YXIgbmNFeG9uMyA9IHtcblx0XHRcdCAgICBzdGFydCAgOiB0cmFuc2xhdGlvbkVuZCxcblx0XHRcdCAgICBlbmQgICAgOiBleG9uc1tpXS5lbmQsXG5cdFx0XHQgICAgdHJhbnNjcmlwdCA6IHRyYW5zY3JpcHQsXG5cdFx0XHQgICAgY29kaW5nIDogZmFsc2Vcblx0XHRcdH07XG5cdFx0XHRpZiAoZXhvbnNbaV0uc3RyYW5kID09PSAxKSB7XG5cdFx0XHQgICAgbmV3RXhvbnMucHVzaChjb2RpbmdFeG9uMyk7XG5cdFx0XHQgICAgbmV3RXhvbnMucHVzaChuY0V4b24zKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHQgICAgbmV3RXhvbnMucHVzaChuY0V4b24zKTtcblx0XHRcdCAgICBuZXdFeG9ucy5wdXNoKGNvZGluZ0V4b24zKTtcblx0XHRcdH1cblx0XHQgICAgfVxuXHRcdH0gZWxzZSB7XG5cdFx0ICAgIC8vIGNvZGluZyBleG9uXG5cdFx0ICAgIG5ld0V4b25zLnB1c2goe1xuXHRcdFx0c3RhcnQgIDogZXhvbnNbaV0uc3RhcnQsXG5cdFx0XHRlbmQgICAgOiBleG9uc1tpXS5lbmQsXG5cdFx0XHR0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcblx0XHRcdGNvZGluZyA6IHRydWVcblx0XHQgICAgfSk7XG5cdFx0fVxuXHQgICAgfVxuXHR9XG5cdHJldHVybiB0bnRfYm9hcmQudHJhY2soKVxuXHQgICAgLmhlaWdodCgzMClcblx0ICAgIC5iYWNrZ3JvdW5kX2NvbG9yIChcIndoaXRlXCIpXG5cdCAgICAuZGlzcGxheSh0cmFuc2NyaXB0RmVhdHVyZSgpXG5cdFx0ICAgICAvLy5mb3JlZ3JvdW5kX2NvbG9yKFwiI0EwMDAwMFwiKVxuXHRcdCAgICAgLm9uX2NsaWNrKGNvbmYub25fY2xpY2spXG5cdFx0ICAgIClcblx0ICAgIC5kYXRhKHRudF9ib2FyZC50cmFjay5kYXRhKClcblx0XHQgIC51cGRhdGUodG50X2JvYXJkLnRyYWNrLmRhdGEucmV0cmlldmVyLnN5bmMoKVxuXHRcdFx0ICAucmV0cmlldmVyIChmdW5jdGlvbiAoKSB7XG5cdFx0XHQgICAgICB2YXIgb2JqID0gZXhvbnNUb0V4b25zQW5kSW50cm9ucyAobmV3RXhvbnMsIHRyYW5zY3JpcHQpO1xuXHRcdFx0ICAgICAgb2JqLm5hbWUgPSBbe1xuXHRcdFx0XHQgIHBvczogdHJhbnNjcmlwdC5zdGFydCxcblx0XHRcdFx0ICBuYW1lOiB0cmFuc2NyaXB0LmRpc3BsYXlfbmFtZSxcblx0XHRcdFx0ICBzdHJhbmQ6IHRyYW5zY3JpcHQuc3RyYW5kLFxuXHRcdFx0XHQgIHRyYW5zY3JpcHQ6IHRyYW5zY3JpcHRcblx0XHRcdCAgICAgIH1dO1xuXHRcdFx0ICAgICAgcmV0dXJuIG9iajtcblx0XHRcdCAgfSlcblx0XHRcdCApXG5cdFx0ICk7XG4gICAgfVxuXG4gICAgdHJhbnNjcmlwdFZpZXdlci5vbl9jbGljayA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGNvbmYub25fY2xpY2s7XG5cdH1cblx0Y29uZi5vbl9jbGljayA9IGNiYWs7XG5cdHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgdHJhbnNjcmlwdFZpZXdlci5kYXRhID0gZnVuY3Rpb24gKGQpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gY29uZi5kYXRhO1xuXHR9XG5cdGNvbmYuZGF0YSA9IGQ7XG5cdHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICB0cmFuc2NyaXB0Vmlld2VyLmdlbmUgPSBmdW5jdGlvbiAoZykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBjb25mLmdlbmU7XG5cdH1cblx0Y29uZi5nZW5lID0gZztcblx0cmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHRyYW5zY3JpcHRWaWV3ZXIub25fbG9hZCA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGNvbmYuY2Jhaztcblx0fVxuXHRjb25mLm9uX2xvYWQgPSBjYmFrO1xuXHRyZXR1cm4gdGhpcztcbiAgICB9O1xuICAgXG4gICAgcmV0dXJuIHRyYW5zY3JpcHRWaWV3ZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfdHJhbnNjcmlwdDtcbiJdfQ==
