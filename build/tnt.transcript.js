(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if (typeof tnt === "undefined") {
    module.exports = tnt = {};
}
// tnt.board = require("./index.js");
// tnt.utils = require("tnt.utils");
// tnt.tooltip = require("tnt.tooltip");

tnt.transcript = require("./index.js");
tnt.genome = require("tnt.genome");
tnt.tooltip = require("tnt.tooltip");
tnt.board = require("tnt.board");
tnt.ensembl = require("tnt.ensembl");


},{"./index.js":2,"tnt.board":6,"tnt.ensembl":15,"tnt.genome":31,"tnt.tooltip":37}],2:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
module.exports = require("./src/transcriptFeature.js");


},{"./src/transcriptFeature.js":44}],3:[function(require,module,exports){
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
module.exports = require("./src/api.js");

},{"./src/api.js":5}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
// tnt.utils = require("tnt.utils");
// tnt.tooltip = require("tnt.tooltip");
// tnt.board = require("./src/index.js");

module.exports = require("./src/index");

},{"./src/index":12}],7:[function(require,module,exports){
module.exports=require(4)
},{"./src/api.js":8}],8:[function(require,module,exports){
module.exports=require(5)
},{}],9:[function(require,module,exports){
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
		    .attr("transform", "translate(" + exports.extend_canvas.left + "," + h + ")");
	    } else {
		track.g
		    .attr("transform", "translate(" + exports.extend_canvas.left + "," + h + ")");
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

},{"tnt.api":7,"tnt.utils":39}],10:[function(require,module,exports){
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
    // label is not used at the moment
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

},{"tnt.api":7}],11:[function(require,module,exports){
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

tnt_feature.pin = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    var yScale = d3.scale.linear()
	.domain([0,0])
	.range([0,0]);

    var opts = {
	pos : d3.functor("pos"),
	val : d3.functor("val"),
	domain : [0,0]
    };
    
    apijs(feature)
	.getset(opts);

    
    feature.create (function (new_pins, xScale) {
	var track = this;
	yScale
	    .domain(feature.domain())
	    .range([0, track.height()]);
	
	// pins are composed of lines and circles
	new_pins
	    .append("line")
	    .attr("x1", function (d, i) {
	    	return xScale(d[opts.pos(d, i)])
	    })
	    .attr("y1", function (d) {
	    	return track.height();
	    })
	    .attr("x2", function (d,i) {
	    	return xScale(d[opts.pos(d, i)]);
	    })
	    .attr("y2", function (d, i) {
	    	return track.height() - yScale(d[opts.val(d, i)]);
	    })
	    .attr("stroke", feature.foreground_color());

	new_pins
	    .append("circle")
	    .attr("cx", function (d, i) {
		return xScale(d[opts.pos(d, i)]);
	    })
	    .attr("cy", function (d, i) {
		return track.height() - yScale(d[opts.val(d, i)]);
	    })
	    .attr("r", 5)
	    .attr("fill", feature.foreground_color());
    });

    feature.mover(function (pins, xScale) {
	var track = this;
	pins
	    //.each(position_pin_line)
	    .select("line")
	    .attr("x1", function (d, i) {
		return xScale(d[opts.pos(d, i)])
	    })
	    .attr("y1", function (d) {
		return track.height();
	    })
	    .attr("x2", function (d,i) {
		return xScale(d[opts.pos(d, i)]);
	    })
	    .attr("y2", function (d, i) {
		return track.height() - yScale(d[opts.val(d, i)]);
	    });

	pins
	    .select("circle")
	    .attr("cx", function (d, i) {
		return xScale(d[opts.pos(d, i)]);
	    })
	    .attr("cy", function (d, i) {
		return track.height() - yScale(d[opts.val(d, i)]);
	    });

    });

    feature.guider (function (width) {
	var track = this;
	track.g
	    .append("line")
	    .attr("x1", 0)
	    .attr("x2", width)
	    .attr("y1", track.height())
	    .attr("y2", track.height())
	    .style("stroke", "black")
	    .style("stroke-with", "1px");
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

},{"./layout.js":13,"tnt.api":7}],12:[function(require,module,exports){
var board = require ("./board.js");
board.track = require ("./track");
board.track.data = require ("./data.js");
board.track.layout = require ("./layout.js");
board.track.feature = require ("./feature.js");

module.exports = exports = board;

},{"./board.js":9,"./data.js":10,"./feature.js":11,"./layout.js":13,"./track":14}],13:[function(require,module,exports){
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

},{"tnt.api":7}],14:[function(require,module,exports){
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

},{"tnt.api":7,"tnt.utils":39}],15:[function(require,module,exports){
module.exports = tnt_ensembl = require("./src/rest.js");

},{"./src/rest.js":30}],16:[function(require,module,exports){
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
},{"IrXUsu":3}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{"./response":21}],19:[function(require,module,exports){
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

},{"../plugins/cleanurl":26,"./error":18,"./request":20,"./response":21,"./utils/delay":22,"./utils/once":23,"./xhr":24,"xtend":25}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{"./request":20}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
module.exports = window.XMLHttpRequest;

},{}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
'use strict';

module.exports = {
    processRequest: function (req) {
        req.url = req.url.replace(/[^%]+/g, function (s) {
            return encodeURI(s);
        });
    }
};

},{}],27:[function(require,module,exports){
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

},{"./jsonrequest":28,"./jsonresponse":29}],28:[function(require,module,exports){
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

},{}],29:[function(require,module,exports){
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
    var prefix_sequence = prefix + "/sequence/region/";
    var prefix_variation = prefix + "/variation/";

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
    api.method ('call', function (myurl, data) {
	if (data) {
	    return http.post({
		"url": myurl,
		"body" : data
	    })
	}
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

    url_api.method ('sequence', function (obj) {
	return prefix_sequence +
	    obj.species +
	    '/' +
	    obj.chr +
	    ':' +
	    obj.from +
	    '..' +
	    obj.to +
	    '?content-type=application/json';
    });

    url_api.method ('variation', function (obj) {
	// For now, only post requests are included
	return prefix_variation +
	    obj.species;
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

},{"es6-promise":16,"httpplease":19,"httpplease-promises":17,"httpplease/plugins/json":27,"tnt.api":4}],31:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
module.exports = require("./src/index.js");


},{"./src/index.js":35}],32:[function(require,module,exports){
var board = require("tnt.board");
var apijs = require("tnt.api");
var ensemblRestAPI = require("tnt.ensembl");

board.track.data.retriever.ensembl = function () {
    var success = [function () {}];
    var ignore = function () { return false };
    var endpoint;
    var eRest = ensemblRestAPI();
    var update_track = function (obj) {
	var data_parent = this;
	// Object has loc and a plug-in defined callback
	var loc = obj.loc;
	var plugin_cbak = obj.on_success;
	var url = eRest.url[update_track.endpoint()](loc);
	if (ignore (loc)) {
	    data_parent.elements([]);
	    plugin_cbak();
	} else {
	    eRest.call(url)
		.then (function (resp) {
		    // User defined
		    for (var i=0; i<success.length; i++) {
			var mod = success[i](resp.body);
			if (mod) {
			    resp.body = mod;
			}
		    }

		    data_parent.elements(resp.body);

		    // plug-in defined
		    plugin_cbak();
		});
	} 
    };
    apijs (update_track)
	.getset ('endpoint');

    // TODO: We don't have a way of resetting the success array
    // TODO: Should this also be included in the sync retriever?
    // Still not sure this is the best option to support more than one callback
    update_track.success = function (cb) {
	if (!arguments.length) {
	    return success;
	}
	success.push (cb);
	return update_track;
    };

    update_track.ignore = function (cb) {
	if (!arguments.length) {
	    return ignore;
	}
	ignore = cb;
	return update_track;
    };

    return update_track;
};


// A predefined track for sequences
var data_sequence = function () {
    var limit = 150;
    var track_data = board.track.data();

    var updater = board.track.data.retriever.ensembl()
	.ignore (function (loc) {
	    return (loc.to - loc.from) > limit;
	})
	.endpoint("sequence")
	.success (function (resp) {
	    // Get the coordinates
	    var fields = resp.id.split(":");
	    var from = fields[3];
	    var nts = [];
	    for (var i=0; i<resp.seq.length; i++) {
		nts.push({
		    pos: +from + i,
		    sequence: resp.seq[i]
		});
	    }
	    return nts;
	});

    track_data.limit = function (newlim) {
	if (!arguments.length) {
	    return limit;
	}
	limit = newlim;
	return this;
    };

    return track_data.update(updater); 
};

// A predefined track for genes
var data_gene = function () {
//board.track.data.gene = function () {
    
    var updater = board.track.data.retriever.ensembl()
        .endpoint("region")
    // TODO: If success is defined here, means that it can't be user-defined
    // is that good? enough? API?
    // UPDATE: Now success is backed up by an array. Still don't know if this is the best option
        .success(function(genes) {
	    for (var i = 0; i < genes.length; i++) {
		if (genes[i].strand === -1) {
		    genes[i].display_label = "<" + genes[i].external_name;
		} else {
		    genes[i].display_label = genes[i].external_name + ">";
		}
	    }
	});
    return board.track.data().update(updater);
}

var genome_data = {
    gene : data_gene,
    sequence : data_sequence
};

module.exports = exports = genome_data;

},{"tnt.api":4,"tnt.board":6,"tnt.ensembl":15}],33:[function(require,module,exports){
var apijs = require ("tnt.api");
var layout = require("./layout.js");
var board = require("tnt.board");

tnt_feature_sequence = function () {

    var config = {
	fontsize : 10,
	sequence : function (d) {
	    return d.sequence;
	}
    };

        // 'Inherit' from tnt.track.feature
    var feature = board.track.feature()
	.index (function (d) {
	    return d.pos;
	});
    
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
	    .style("font-family", '"Lucida Console", Monaco, monospace')
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

tnt_feature_gene = function () {

    // 'Inherit' from tnt.track.feature
    var feature = board.track.feature()
	.layout(board.track.layout.feature())
	.index(function (d) {
	    return d.id;
	});

    // var tooltip = function () {
    //     var tooltip = board.tooltip.table();
    //     var gene_tooltip = function(gene) {
    //         var obj = {};
    //         obj.header = {
    //             label : "HGNC Symbol",
    //             value : gene.external_name
    //         };
    //         obj.rows = [];
    //         obj.rows.push( {
    //             label : "Name",
    //             value : "<a href=''>" + gene.ID  + "</a>"
    //         });
    //         obj.rows.push( {
    //             label : "Gene Type",
    //             value : gene.biotype
    //         });
    //         obj.rows.push( {
    //             label : "Location",
    //             value : "<a href=''>" + gene.seq_region_name + ":" + gene.start + "-" + gene.end  + "</a>"
    //         });
    //         obj.rows.push( {
    //             label : "Strand",
    //             value : (gene.strand === 1 ? "Forward" : "Reverse")
    //         });
    //         obj.rows.push( {
    //             label : "Description",
    //             value : gene.description
    //         });

    //         tooltip.call(this, obj);
    //     };

    //     return gene_tooltip;
    // };


    feature.create(function (new_elems, xScale) {
	var track = this;

	new_elems
	    .append("rect")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("y", function (d) {
		return feature.layout().gene_slot().slot_height * d.slot;
	    })
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    })
	    .attr("height", feature.layout().gene_slot().gene_height)
	    .attr("fill", track.background_color())
	    .transition()
	    .duration(500)
	    .attr("fill", function (d) {
		if (d.color === undefined) {
		    return feature.foreground_color();
		} else {
		    return d.color
		}
	    });

	new_elems
	    .append("text")
	    .attr("class", "tnt_name")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("y", function (d) {
		return (feature.layout().gene_slot().slot_height * d.slot) + 25;
	    })
	    .attr("fill", track.background_color())
	    .text(function (d) {
		if (feature.layout().gene_slot().show_label) {
		    return d.display_label
		} else {
		    return ""
		}
	    })
	    .style("font-weight", "normal")
	    .transition()
	    .duration(500)
	    .attr("fill", function() {
		return feature.foreground_color();
	    });	    
    });

    feature.updater(function (genes) {
	var track = this;
	genes
	    .select("rect")
	    .transition()
	    .duration(500)
	    .attr("y", function (d) {
		return (feature.layout().gene_slot().slot_height * d.slot);
	    })
	    .attr("height", feature.layout().gene_slot().gene_height);

	genes
	    .select("text")
	    .transition()
	    .duration(500)
	    .attr("y", function (d) {
		return (feature.layout().gene_slot().slot_height * d.slot) + 25;
	    })
	    .text(function (d) {
                if (feature.layout().gene_slot().show_label) {
		    return d.display_label;
                } else {
		    return "";
                }
	    });
    });

    feature.mover(function (genes, xScale) {
	genes.select("rect")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    });

	genes.select("text")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
    });

    // apijs (feature)
    // 	.method ({
    // 	    tooltip : tooltip
    // 	});


    return feature;
};

var genome_features = {
    gene : tnt_feature_gene,
    sequence : tnt_feature_sequence
};
module.exports = exports = genome_features;

},{"./layout.js":36,"tnt.api":4,"tnt.board":6}],34:[function(require,module,exports){
var tnt_rest = require("tnt.ensembl");
var apijs = require("tnt.api");
var tnt_board = require("tnt.board");
tnt_board.track.layout.gene = require("./layout.js");
tnt_board.track.feature.gene = require("./feature.js");

tnt_board_genome = function() {
    "use strict"

    // Private vars
    var ens_re = /^ENS\w+\d+$/;
    var eRest = tnt_rest();
    var chr_length;
    
    // Vars exposed in the API
    var conf = {
	gene           : undefined,
	xref_search    : function () {},
	ensgene_search : function () {},
	context        : 0
    };

    var gene;
    var limits = {
        left : 0,
	right : undefined,
	zoom_out : eRest.limits.region,
	zoom_in  : 200
    };

    // We "inherit" from board
    var genome_browser = tnt_board();

    // The location and axis track
    var location_track = tnt_board.track()
	.height(20)
	.background_color("white")
	.data(tnt_board.track.data.empty())
	.display(tnt_board.track.feature.location());

    var axis_track = tnt_board.track()
	.height(20)
	.background_color("white")
	.data(tnt_board.track.data.empty())
	.display(tnt_board.track.feature.axis());

    genome_browser
	.add_track(location_track)
	.add_track(axis_track);

    // Default location:
    genome_browser
	.species("human")
	.chr(7)
	.from(139424940)
	.to(141784100);

    // We save the start method of the 'parent' object
    genome_browser._start = genome_browser.start;

    // We hijack parent's start method
    var start = function (where) {
	if (where !== undefined) {
	    if (where.gene !== undefined) {
		get_gene(where);
		return;
	    } else {
		if (where.species === undefined) {
		    where.species = genome_browser.species();
		} else {
		    genome_browser.species(where.species);
		}
		if (where.chr === undefined) {
		    where.chr = genome_browser.chr();
		} else {
		    genome_browser.chr(where.chr);
		}
		if (where.from === undefined) {
		    where.from = genome_browser.from();
		} else {
		    genome_browser.from(where.from)
		}
		if (where.to === undefined) {
		    where.to = genome_browser.to();
		} else {
		    genome_browser.to(where.to);
		}
	    }
	} else { // "where" is undef so look for gene or loc
	    if (genome_browser.gene() !== undefined) {
		get_gene({ species : genome_browser.species(),
			   gene    : genome_browser.gene()
			 });
		return;
	    } else {
		where = {};
		where.species = genome_browser.species(),
		where.chr     = genome_browser.chr(),
		where.from    = genome_browser.from(),
		where.to      = genome_browser.to()
	    }
	}

	genome_browser.right (function (done) {
	    // Get the chromosome length and use it as the 'right' limit
	    genome_browser.zoom_in (limits.zoom_in);
	    genome_browser.zoom_out (limits.zoom_out);

	    var url = eRest.url.chr_info ({
		species : where.species,
		chr     : where.chr
	    });

	    eRest.call (url)
		.then( function (resp) {
		    done(resp.body.length);
		});
	});
	genome_browser._start();
    };

    var homologues = function (ensGene, callback)  {
	var url = eRest.url.homologues ({id : ensGene})
	eRest.call(url)
	    .then (function(resp) {
		var homologues = resp.body.data[0].homologies;
		if (callback !== undefined) {
		    var homologues_obj = split_homologues(homologues)
		    callback(homologues_obj);
		}
	    });
    }

    var isEnsemblGene = function(term) {
	if (term.match(ens_re)) {
            return true;
        } else {
            return false;
        }
    };

    var get_gene = function (where) {
	if (isEnsemblGene(where.gene)) {
	    get_ensGene(where.gene)
	} else {
	    var url = eRest.url.xref ({
		species : where.species,
		name    : where.gene 
	    });
	    eRest.call(url)
		.then (function(resp) {
		    var data = resp.body;
		    data = data.filter(function(d) {
			return !d.id.indexOf("ENS");
		    });
		    if (data[0] !== undefined) {
			conf.xref_search(resp);
			get_ensGene(data[0].id)
		    } else {
			genome_browser.start();
		    }
		});
	}
    };

    var get_ensGene = function (id) {
	var url = eRest.url.gene ({id : id})
	eRest.call(url)
	    .then (function(resp) {
		var data = resp.body;
		conf.ensgene_search(data);
		var extra = ~~((data.end - data.start) * (conf.context/100));
		console.log(data);
		genome_browser
		    .species(data.species)
		    .chr(data.seq_region_name)
		    .from(data.start - extra)
		    .to(data.end + extra);

		genome_browser.start( { species : data.species,
					chr     : data.seq_region_name,
					from    : data.start - extra,
					to      : data.end + extra
				      } );
	    });
    };

    var split_homologues = function (homologues) {
	var orthoPatt = /ortholog/;
	var paraPatt = /paralog/;

	var orthologues = homologues.filter(function(d){return d.type.match(orthoPatt)});
	var paralogues  = homologues.filter(function(d){return d.type.match(paraPatt)});

	return {'orthologues' : orthologues,
		'paralogues'  : paralogues};
    };

    var api = apijs(genome_browser)
	.getset (conf)
	.method("zoom_in", function (v) {
	    if (!arguments.length) {
		return limits.zoom_in;
	    }
	    limits.zoom_in = v;
	    return this;
	});

    api.method ({
	start      : start,
	homologues : homologues
    });

    return genome_browser;
};

module.exports = exports = tnt_board_genome;

},{"./feature.js":33,"./layout.js":36,"tnt.api":4,"tnt.board":6,"tnt.ensembl":15}],35:[function(require,module,exports){
var board = require("tnt.board");
board.genome = require("./genome");
board.track.layout.feature = require("./layout");
board.track.feature.genome = require("./feature");
board.track.data.genome = require("./data");

module.exports = exports = board;


},{"./data":32,"./feature":33,"./genome":34,"./layout":36,"tnt.board":6}],36:[function(require,module,exports){
var apijs = require ("tnt.api");

// The overlap detector used for genes
var gene_layout = function() {
    // Private vars
    var max_slots;

    // vars exposed in the API:
    var conf = {
	height   : 150,
	scale    : undefined
    };

    var conf_ro = {
	elements : []
    };

    var slot_types = {
	'expanded'   : {
	    slot_height : 30,
	    gene_height : 10,
	    show_label  : true
	},
	'collapsed' : {
	    slot_height : 10,
	    gene_height : 7,
	    show_label  : false
	}
    };
    var current_slot_type = 'expanded';

    // The returned closure / object
    var genes_layout = function (new_genes, scale) {

	// We make sure that the genes have name
	for (var i = 0; i < new_genes.length; i++) {
	    if (new_genes[i].external_name === null) {
		new_genes[i].external_name = "";
	    }
	}

	max_slots = ~~(conf.height / slot_types.expanded.slot_height) - 1;

	if (scale !== undefined) {
	    genes_layout.scale(scale);
	}

	slot_keeper(new_genes, conf_ro.elements);
	var needed_slots = collition_detector(new_genes);
	if (needed_slots > max_slots) {
	    current_slot_type = 'collapsed';
	} else {
	    current_slot_type = 'expanded';
	}

	conf_ro.elements = new_genes;
    };

    var gene_slot = function () {
	return slot_types[current_slot_type];
    };

    var collition_detector = function (genes) {
	var genes_placed = [];
	var genes_to_place = genes;
	var needed_slots = 0;
	for (var i = 0; i < genes.length; i++) {
            if (genes[i].slot > needed_slots && genes[i].slot < max_slots) {
		needed_slots = genes[i].slot
            }
	}

	for (var i = 0; i < genes_to_place.length; i++) {
            var genes_by_slot = sort_genes_by_slot(genes_placed);
	    var this_gene = genes_to_place[i];
	    if (this_gene.slot !== undefined && this_gene.slot < max_slots) {
		if (slot_has_space(this_gene, genes_by_slot[this_gene.slot])) {
		    genes_placed.push(this_gene);
		    continue;
		}
	    }
            var slot = 0;
            OUTER: while (true) {
		if (slot_has_space(this_gene, genes_by_slot[slot])) {
		    this_gene.slot = slot;
		    genes_placed.push(this_gene);
		    if (slot > needed_slots) {
			needed_slots = slot;
		    }
		    break;
		}
		slot++;
	    }
	}
	return needed_slots + 1;
    };

    var slot_has_space = function (query_gene, genes_in_this_slot) {
	if (genes_in_this_slot === undefined) {
	    return true;
	}
	for (var j = 0; j < genes_in_this_slot.length; j++) {
            var subj_gene = genes_in_this_slot[j];
	    if (query_gene.id === subj_gene.id) {
		continue;
	    }
            var y_label_end = subj_gene.display_label.length * 8 + conf.scale(subj_gene.start); // TODO: It may be better to have a fixed font size (instead of the hardcoded 16)?
            var y1  = conf.scale(subj_gene.start);
            var y2  = conf.scale(subj_gene.end) > y_label_end ? conf.scale(subj_gene.end) : y_label_end;
	    var x_label_end = query_gene.display_label.length * 8 + conf.scale(query_gene.start);
            var x1 = conf.scale(query_gene.start);
            var x2 = conf.scale(query_gene.end) > x_label_end ? conf.scale(query_gene.end) : x_label_end;
            if ( ((x1 < y1) && (x2 > y1)) ||
		 ((x1 > y1) && (x1 < y2)) ) {
		return false;
            }
	}
	return true;
    };

    var slot_keeper = function (genes, prev_genes) {
	var prev_genes_slots = genes2slots(prev_genes);

	for (var i = 0; i < genes.length; i++) {
            if (prev_genes_slots[genes[i].id] !== undefined) {
		genes[i].slot = prev_genes_slots[genes[i].id];
            }
	}
    };

    var genes2slots = function (genes_array) {
	var hash = {};
	for (var i = 0; i < genes_array.length; i++) {
            var gene = genes_array[i];
            hash[gene.id] = gene.slot;
	}
	return hash;
    }

    var sort_genes_by_slot = function (genes) {
	var slots = [];
	for (var i = 0; i < genes.length; i++) {
            if (slots[genes[i].slot] === undefined) {
		slots[genes[i].slot] = [];
            }
            slots[genes[i].slot].push(genes[i]);
	}
	return slots;
    };

    // API
    var api = apijs (genes_layout)
	.getset (conf)
	.get (conf_ro)
	.method ({
	    gene_slot : gene_slot
	});

    return genes_layout;
};

module.exports = exports = gene_layout;

},{"tnt.api":4}],37:[function(require,module,exports){
module.exports = tooltip = require("./src/tooltip.js");

},{"./src/tooltip.js":38}],38:[function(require,module,exports){
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
	var d3mouse = d3.mouse(containerElem);
	d3.event = null;

	var offset = 0;
	if (conf.position === "left") {
	    offset = conf.width;
	}
	
	tooltip_div.attr("id", "tnt_tooltip_" + conf.id);
	
	// We place the tooltip
	tooltip_div
	    .style("left", (d3mouse[0]) + "px")
	    .style("top", (d3mouse[1]) + "px");

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

tooltip.list = function () {
    // list tooltip is based on general tooltips
    var t = tooltip();
    var width = 180;

    t.fill (function (obj) {
	var tooltip_div = this;
	var obj_info_list = tooltip_div
	    .append("table")
	    .attr("class", "tnt_zmenu")
	    .attr("border", "solid")
	    .style("width", t.width() + "px");

	// Tooltip header
	obj_info_list
	    .append("tr")
	    .attr("class", "tnt_zmenu_header")
	    .append("th")
	    .text(obj.header);

	// Tooltip rows
	var table_rows = obj_info_list.selectAll(".tnt_zmenu_row")
	    .data(obj.rows)
	    .enter()
	    .append("tr")
	    .attr("class", "tnt_zmenu_row");

	table_rows
	    .append("td")
	    .style("text-align", "center")
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
	    .attr("colspan", function (d, i) {
		if (d.value === "") {
		    return 2;
		}
		return 1;
	    })
	    .attr("class", function (d) {
		if (d.value === "") {
		    return "tnt_zmenu_inner_header";
		}
		return "tnt_zmenu_cell";
	    })
	    .html(function(d,i) {
		return obj.rows[i].label;
	    });

	table_rows
	    .append("td")
	    .html(function(d,i) {
		if (typeof obj.rows[i].value === 'function') {
		    obj.rows[i].value.call(this, d);
		} else {
		    return obj.rows[i].value;
		}
	    })
	    .each(function (d) {
		if (d.value === "") {
		    d3.select(this).remove();
		}
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

},{"tnt.api":4}],39:[function(require,module,exports){
module.exports = require("./src/index.js");

},{"./src/index.js":40}],40:[function(require,module,exports){
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

},{"./reduce.js":41,"./utils.js":42}],41:[function(require,module,exports){
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


},{}],42:[function(require,module,exports){

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

},{}],43:[function(require,module,exports){
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
	.mover (function (name, xScale) {
	    name
		.select("text")
		.attr("x", function (d) {
		    return xScale(d.pos);
		});
	});
	//.mover (function () {}); // No need to move since the board doens't allow panning or zooming

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
	.mover (function (intron, xScale) {
	    var track = this;
	    var featureBottom = (track.height() / 2) * 0.25;
	    intron
		.select("path")
		.attr("d", function (d) {
		    var path = "M" + xScale(d.start) + "," + featureBottom +
			"L" + (xScale(d.start) + (xScale(d.end) - xScale(d.start))/2)  + "," + 0 +
			"L" + (xScale(d.end)) + "," + featureBottom;
		    return path;
		});
	});
        //.mover (function () {}); // No need to move since the board doesn't allow panning & zooming

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
	        .transition()
	        .duration(500)
	        .attr("fill", function (d) {
		    if (d.coding) {
			return exonFeature.foreground_color();
		    }
		    return track.background_color();
		})
	        .attr("stroke", exonFeature.foreground_color());
	})
	.mover (function (exon, xScale) {
	    exon
		.select("rect")
		.attr("x", function (d) {
		    return xScale(d.start);
		})
		.attr("width", function (d) {
		    return (xScale(d.end) - xScale(d.start));
		});
	});
        //.mover (function () {}); // No need to move since the board doesn't allow panning & zooming

    // COMPOSITE FEATURE
    var compositeFeature = tnt_board.track.feature.composite()
        .add ("exons", exonFeature)
        .add ("introns", intronFeature)
        .add ("name", nameFeature);

    return compositeFeature;

};

module.exports = exports = tnt_feature_transcript;

},{"tnt.board":6}],44:[function(require,module,exports){
var tnt_board = require("tnt.genome");
var ensembl = require("tnt.ensembl");
var transcriptFeature = require("./feature");

tnt_transcript = function () {

    var conf = {
	data : undefined,
	gene : undefined,
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
	.allow_drag(true)
	.add_track(axis_track);

    transcriptViewer._start = transcriptViewer.start;

    var start = function (loc) {
	if (loc && loc.from && loc.to) {
	    transcriptViewer
		.from(loc.from)
		.to(loc.to);
	    transcriptViewer._start();
	    return;
	}
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
			.left(resp.body.start)
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
		start : exons[i].transcript.strand === 1 ? exons[i].end : exons[i].start,
		end   : exons[i].transcript.strand === 1 ? exons[i+1].start : exons[i+1].end,
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
	    .display(transcriptFeature())
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

},{"./feature":43,"tnt.ensembl":15,"tnt.genome":31}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvZmFrZV9iZTI4ZDJiNi5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5hcGkvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5hcGkvc3JjL2FwaS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmJvYXJkL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2JvYXJkLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2RhdGEuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvZmVhdHVyZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvdHJhY2suanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9lczYtcHJvbWlzZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UtcHJvbWlzZXMvaHR0cHBsZWFzZS1wcm9taXNlcy5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL2Vycm9yLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi9yZXF1ZXN0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIvcmVzcG9uc2UuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi91dGlscy9kZWxheS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3V0aWxzL29uY2UuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi94aHItYnJvd3Nlci5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2Uvbm9kZV9tb2R1bGVzL3h0ZW5kL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9wbHVnaW5zL2NsZWFudXJsLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9wbHVnaW5zL2pzb24uanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL3BsdWdpbnMvanNvbnJlcXVlc3QuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL3BsdWdpbnMvanNvbnJlc3BvbnNlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9zcmMvcmVzdC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50Lmdlbm9tZS9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50Lmdlbm9tZS9zcmMvZGF0YS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50Lmdlbm9tZS9zcmMvZmVhdHVyZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50Lmdlbm9tZS9zcmMvZ2Vub21lLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQuZ2Vub21lL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50Lmdlbm9tZS9zcmMvbGF5b3V0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC50cmFuc2NyaXB0L25vZGVfbW9kdWxlcy90bnQudG9vbHRpcC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LnRvb2x0aXAvc3JjL3Rvb2x0aXAuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC51dGlscy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LnV0aWxzL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQudHJhbnNjcmlwdC9ub2RlX21vZHVsZXMvdG50LnV0aWxzL3NyYy9yZWR1Y2UuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvbm9kZV9tb2R1bGVzL3RudC51dGlscy9zcmMvdXRpbHMuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvc3JjL2ZlYXR1cmUuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50LnRyYW5zY3JpcHQvc3JjL3RyYW5zY3JpcHRGZWF0dXJlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyaUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbHZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy83QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fTtcbn1cbi8vIHRudC5ib2FyZCA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpO1xuLy8gdG50LnV0aWxzID0gcmVxdWlyZShcInRudC51dGlsc1wiKTtcbi8vIHRudC50b29sdGlwID0gcmVxdWlyZShcInRudC50b29sdGlwXCIpO1xuXG50bnQudHJhbnNjcmlwdCA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpO1xudG50Lmdlbm9tZSA9IHJlcXVpcmUoXCJ0bnQuZ2Vub21lXCIpO1xudG50LnRvb2x0aXAgPSByZXF1aXJlKFwidG50LnRvb2x0aXBcIik7XG50bnQuYm9hcmQgPSByZXF1aXJlKFwidG50LmJvYXJkXCIpO1xudG50LmVuc2VtYmwgPSByZXF1aXJlKFwidG50LmVuc2VtYmxcIik7XG5cbiIsIi8vIGlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4vLyAgICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fVxuLy8gfVxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvdHJhbnNjcmlwdEZlYXR1cmUuanNcIik7XG5cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvYXBpLmpzXCIpO1xuIiwidmFyIGFwaSA9IGZ1bmN0aW9uICh3aG8pIHtcblxuICAgIHZhciBfbWV0aG9kcyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIG0gPSBbXTtcblxuXHRtLmFkZF9iYXRjaCA9IGZ1bmN0aW9uIChvYmopIHtcblx0ICAgIG0udW5zaGlmdChvYmopO1xuXHR9O1xuXG5cdG0udXBkYXRlID0gZnVuY3Rpb24gKG1ldGhvZCwgdmFsdWUpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtLmxlbmd0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgcCBpbiBtW2ldKSB7XG5cdFx0ICAgIGlmIChwID09PSBtZXRob2QpIHtcblx0XHRcdG1baV1bcF0gPSB2YWx1ZTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdCAgICB9XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgcmV0dXJuIGZhbHNlO1xuXHR9O1xuXG5cdG0uYWRkID0gZnVuY3Rpb24gKG1ldGhvZCwgdmFsdWUpIHtcblx0ICAgIGlmIChtLnVwZGF0ZSAobWV0aG9kLCB2YWx1ZSkgKSB7XG5cdCAgICB9IGVsc2Uge1xuXHRcdHZhciByZWcgPSB7fTtcblx0XHRyZWdbbWV0aG9kXSA9IHZhbHVlO1xuXHRcdG0uYWRkX2JhdGNoIChyZWcpO1xuXHQgICAgfVxuXHR9O1xuXG5cdG0uZ2V0ID0gZnVuY3Rpb24gKG1ldGhvZCkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG0ubGVuZ3RoOyBpKyspIHtcblx0XHRmb3IgKHZhciBwIGluIG1baV0pIHtcblx0XHQgICAgaWYgKHAgPT09IG1ldGhvZCkge1xuXHRcdFx0cmV0dXJuIG1baV1bcF07XG5cdFx0ICAgIH1cblx0XHR9XG5cdCAgICB9XG5cdH07XG5cblx0cmV0dXJuIG07XG4gICAgfTtcblxuICAgIHZhciBtZXRob2RzICAgID0gX21ldGhvZHMoKTtcbiAgICB2YXIgYXBpID0gZnVuY3Rpb24gKCkge307XG5cbiAgICBhcGkuY2hlY2sgPSBmdW5jdGlvbiAobWV0aG9kLCBjaGVjaywgbXNnKSB7XG5cdGlmIChtZXRob2QgaW5zdGFuY2VvZiBBcnJheSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG1ldGhvZC5sZW5ndGg7IGkrKykge1xuXHRcdGFwaS5jaGVjayhtZXRob2RbaV0sIGNoZWNrLCBtc2cpO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuO1xuXHR9XG5cblx0aWYgKHR5cGVvZiAobWV0aG9kKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgbWV0aG9kLmNoZWNrKGNoZWNrLCBtc2cpO1xuXHR9IGVsc2Uge1xuXHQgICAgd2hvW21ldGhvZF0uY2hlY2soY2hlY2ssIG1zZyk7XG5cdH1cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChtZXRob2QsIGNiYWspIHtcblx0aWYgKG1ldGhvZCBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bWV0aG9kLmxlbmd0aDsgaSsrKSB7XG5cdFx0YXBpLnRyYW5zZm9ybSAobWV0aG9kW2ldLCBjYmFrKTtcblx0ICAgIH1cblx0ICAgIHJldHVybjtcblx0fVxuXG5cdGlmICh0eXBlb2YgKG1ldGhvZCkgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIG1ldGhvZC50cmFuc2Zvcm0gKGNiYWspO1xuXHR9IGVsc2Uge1xuXHQgICAgd2hvW21ldGhvZF0udHJhbnNmb3JtKGNiYWspO1xuXHR9XG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIHZhciBhdHRhY2hfbWV0aG9kID0gZnVuY3Rpb24gKG1ldGhvZCwgb3B0cykge1xuXHR2YXIgY2hlY2tzID0gW107XG5cdHZhciB0cmFuc2Zvcm1zID0gW107XG5cblx0dmFyIGdldHRlciA9IG9wdHMub25fZ2V0dGVyIHx8IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiBtZXRob2RzLmdldChtZXRob2QpO1xuXHR9O1xuXG5cdHZhciBzZXR0ZXIgPSBvcHRzLm9uX3NldHRlciB8fCBmdW5jdGlvbiAoeCkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPHRyYW5zZm9ybXMubGVuZ3RoOyBpKyspIHtcblx0XHR4ID0gdHJhbnNmb3Jtc1tpXSh4KTtcblx0ICAgIH1cblxuXHQgICAgZm9yICh2YXIgaj0wOyBqPGNoZWNrcy5sZW5ndGg7IGorKykge1xuXHRcdGlmICghY2hlY2tzW2pdLmNoZWNrKHgpKSB7XG5cdFx0ICAgIHZhciBtc2cgPSBjaGVja3Nbal0ubXNnIHx8IFxuXHRcdFx0KFwiVmFsdWUgXCIgKyB4ICsgXCIgZG9lc24ndCBzZWVtIHRvIGJlIHZhbGlkIGZvciB0aGlzIG1ldGhvZFwiKTtcblx0XHQgICAgdGhyb3cgKG1zZyk7XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgbWV0aG9kcy5hZGQobWV0aG9kLCB4KTtcblx0fTtcblxuXHR2YXIgbmV3X21ldGhvZCA9IGZ1bmN0aW9uIChuZXdfdmFsKSB7XG5cdCAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gZ2V0dGVyKCk7XG5cdCAgICB9XG5cdCAgICBzZXR0ZXIobmV3X3ZhbCk7XG5cdCAgICByZXR1cm4gd2hvOyAvLyBSZXR1cm4gdGhpcz9cblx0fTtcblx0bmV3X21ldGhvZC5jaGVjayA9IGZ1bmN0aW9uIChjYmFrLCBtc2cpIHtcblx0ICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdHJldHVybiBjaGVja3M7XG5cdCAgICB9XG5cdCAgICBjaGVja3MucHVzaCAoe2NoZWNrIDogY2Jhayxcblx0XHRcdCAgbXNnICAgOiBtc2d9KTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHR9O1xuXHRuZXdfbWV0aG9kLnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdCAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdHJhbnNmb3Jtcztcblx0ICAgIH1cblx0ICAgIHRyYW5zZm9ybXMucHVzaChjYmFrKTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdHdob1ttZXRob2RdID0gbmV3X21ldGhvZDtcbiAgICB9O1xuXG4gICAgdmFyIGdldHNldCA9IGZ1bmN0aW9uIChwYXJhbSwgb3B0cykge1xuXHRpZiAodHlwZW9mIChwYXJhbSkgPT09ICdvYmplY3QnKSB7XG5cdCAgICBtZXRob2RzLmFkZF9iYXRjaCAocGFyYW0pO1xuXHQgICAgZm9yICh2YXIgcCBpbiBwYXJhbSkge1xuXHRcdGF0dGFjaF9tZXRob2QgKHAsIG9wdHMpO1xuXHQgICAgfVxuXHR9IGVsc2Uge1xuXHQgICAgbWV0aG9kcy5hZGQgKHBhcmFtLCBvcHRzLmRlZmF1bHRfdmFsdWUpO1xuXHQgICAgYXR0YWNoX21ldGhvZCAocGFyYW0sIG9wdHMpO1xuXHR9XG4gICAgfTtcblxuICAgIGFwaS5nZXRzZXQgPSBmdW5jdGlvbiAocGFyYW0sIGRlZikge1xuXHRnZXRzZXQocGFyYW0sIHtkZWZhdWx0X3ZhbHVlIDogZGVmfSk7XG5cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLmdldCA9IGZ1bmN0aW9uIChwYXJhbSwgZGVmKSB7XG5cdHZhciBvbl9zZXR0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aHJvdyAoXCJNZXRob2QgZGVmaW5lZCBvbmx5IGFzIGEgZ2V0dGVyICh5b3UgYXJlIHRyeWluZyB0byB1c2UgaXQgYXMgYSBzZXR0ZXJcIik7XG5cdH07XG5cblx0Z2V0c2V0KHBhcmFtLCB7ZGVmYXVsdF92YWx1ZSA6IGRlZixcblx0XHQgICAgICAgb25fc2V0dGVyIDogb25fc2V0dGVyfVxuXHQgICAgICApO1xuXG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS5zZXQgPSBmdW5jdGlvbiAocGFyYW0sIGRlZikge1xuXHR2YXIgb25fZ2V0dGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgdGhyb3cgKFwiTWV0aG9kIGRlZmluZWQgb25seSBhcyBhIHNldHRlciAoeW91IGFyZSB0cnlpbmcgdG8gdXNlIGl0IGFzIGEgZ2V0dGVyXCIpO1xuXHR9O1xuXG5cdGdldHNldChwYXJhbSwge2RlZmF1bHRfdmFsdWUgOiBkZWYsXG5cdFx0ICAgICAgIG9uX2dldHRlciA6IG9uX2dldHRlcn1cblx0ICAgICAgKTtcblxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkubWV0aG9kID0gZnVuY3Rpb24gKG5hbWUsIGNiYWspIHtcblx0aWYgKHR5cGVvZiAobmFtZSkgPT09ICdvYmplY3QnKSB7XG5cdCAgICBmb3IgKHZhciBwIGluIG5hbWUpIHtcblx0XHR3aG9bcF0gPSBuYW1lW3BdO1xuXHQgICAgfVxuXHR9IGVsc2Uge1xuXHQgICAgd2hvW25hbWVdID0gY2Jhaztcblx0fVxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICByZXR1cm4gYXBpO1xuICAgIFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gYXBpOyIsIi8vIGlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4vLyAgICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fVxuLy8gfVxuLy8gdG50LnV0aWxzID0gcmVxdWlyZShcInRudC51dGlsc1wiKTtcbi8vIHRudC50b29sdGlwID0gcmVxdWlyZShcInRudC50b29sdGlwXCIpO1xuLy8gdG50LmJvYXJkID0gcmVxdWlyZShcIi4vc3JjL2luZGV4LmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleFwiKTtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcbnZhciBkZWZlckNhbmNlbCA9IHJlcXVpcmUgKFwidG50LnV0aWxzXCIpLmRlZmVyX2NhbmNlbDtcblxudmFyIGJvYXJkID0gZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgXG4gICAgLy8vLyBQcml2YXRlIHZhcnNcbiAgICB2YXIgc3ZnO1xuICAgIHZhciBkaXZfaWQ7XG4gICAgdmFyIHRyYWNrcyA9IFtdO1xuICAgIHZhciBtaW5fd2lkdGggPSA1MDtcbiAgICB2YXIgaGVpZ2h0ICAgID0gMDsgICAgLy8gVGhpcyBpcyB0aGUgZ2xvYmFsIGhlaWdodCBpbmNsdWRpbmcgYWxsIHRoZSB0cmFja3NcbiAgICB2YXIgd2lkdGggICAgID0gOTIwO1xuICAgIHZhciBoZWlnaHRfb2Zmc2V0ID0gMjA7XG4gICAgdmFyIGxvYyA9IHtcblx0c3BlY2llcyAgOiB1bmRlZmluZWQsXG5cdGNociAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICBmcm9tICAgICA6IDAsXG4gICAgICAgIHRvICAgICAgIDogNTAwXG4gICAgfTtcblxuICAgIC8vIFRPRE86IFdlIGhhdmUgbm93IGJhY2tncm91bmQgY29sb3IgaW4gdGhlIHRyYWNrcy4gQ2FuIHRoaXMgYmUgcmVtb3ZlZD9cbiAgICAvLyBJdCBsb29rcyBsaWtlIGl0IGlzIHVzZWQgaW4gdGhlIHRvby13aWRlIHBhbmUgZXRjLCBidXQgaXQgbWF5IG5vdCBiZSBuZWVkZWQgYW55bW9yZVxuICAgIHZhciBiZ0NvbG9yICAgPSBkMy5yZ2IoJyNGOEZCRUYnKTsgLy8jRjhGQkVGXG4gICAgdmFyIHBhbmU7IC8vIERyYWdnYWJsZSBwYW5lXG4gICAgdmFyIHN2Z19nO1xuICAgIHZhciB4U2NhbGU7XG4gICAgdmFyIHpvb21FdmVudEhhbmRsZXIgPSBkMy5iZWhhdmlvci56b29tKCk7XG4gICAgdmFyIGxpbWl0cyA9IHtcblx0bGVmdCA6IDAsXG5cdHJpZ2h0IDogMTAwMCxcblx0em9vbV9vdXQgOiAxMDAwLFxuXHR6b29tX2luICA6IDEwMFxuICAgIH07XG4gICAgdmFyIGNhcF93aWR0aCA9IDM7XG4gICAgdmFyIGR1ciA9IDUwMDtcbiAgICB2YXIgZHJhZ19hbGxvd2VkID0gdHJ1ZTtcblxuICAgIHZhciBleHBvcnRzID0ge1xuXHRlYXNlICAgICAgICAgIDogZDMuZWFzZShcImN1YmljLWluLW91dFwiKSxcblx0ZXh0ZW5kX2NhbnZhcyA6IHtcblx0ICAgIGxlZnQgOiAwLFxuXHQgICAgcmlnaHQgOiAwXG5cdH0sXG5cdHNob3dfZnJhbWUgOiB0cnVlXG5cdC8vIGxpbWl0cyAgICAgICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJUaGUgbGltaXRzIG1ldGhvZCBzaG91bGQgYmUgZGVmaW5lZFwifVx0XG4gICAgfTtcblxuICAgIC8vIFRoZSByZXR1cm5lZCBjbG9zdXJlIC8gb2JqZWN0XG4gICAgdmFyIHRyYWNrX3ZpcyA9IGZ1bmN0aW9uKGRpdikge1xuXHRkaXZfaWQgPSBkMy5zZWxlY3QoZGl2KS5hdHRyKFwiaWRcIik7XG5cblx0Ly8gVGhlIG9yaWdpbmFsIGRpdiBpcyBjbGFzc2VkIHdpdGggdGhlIHRudCBjbGFzc1xuXHRkMy5zZWxlY3QoZGl2KVxuXHQgICAgLmNsYXNzZWQoXCJ0bnRcIiwgdHJ1ZSk7XG5cblx0Ly8gVE9ETzogTW92ZSB0aGUgc3R5bGluZyB0byB0aGUgc2Nzcz9cblx0dmFyIGJyb3dzZXJEaXYgPSBkMy5zZWxlY3QoZGl2KVxuXHQgICAgLmFwcGVuZChcImRpdlwiKVxuXHQgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZClcblx0ICAgIC5zdHlsZShcInBvc2l0aW9uXCIsIFwicmVsYXRpdmVcIilcblx0ICAgIC5jbGFzc2VkKFwidG50X2ZyYW1lZFwiLCBleHBvcnRzLnNob3dfZnJhbWUgPyB0cnVlIDogZmFsc2UpXG5cdCAgICAuc3R5bGUoXCJ3aWR0aFwiLCAod2lkdGggKyBjYXBfd2lkdGgqMiArIGV4cG9ydHMuZXh0ZW5kX2NhbnZhcy5yaWdodCArIGV4cG9ydHMuZXh0ZW5kX2NhbnZhcy5sZWZ0KSArIFwicHhcIilcblxuXHR2YXIgZ3JvdXBEaXYgPSBicm93c2VyRGl2XG5cdCAgICAuYXBwZW5kKFwiZGl2XCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2dyb3VwRGl2XCIpO1xuXG5cdC8vIFRoZSBTVkdcblx0c3ZnID0gZ3JvdXBEaXZcblx0ICAgIC5hcHBlbmQoXCJzdmdcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfc3ZnXCIpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuXHQgICAgLmF0dHIoXCJwb2ludGVyLWV2ZW50c1wiLCBcImFsbFwiKTtcblxuXHRzdmdfZyA9IHN2Z1xuXHQgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMjApXCIpXG4gICAgICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9nXCIpO1xuXG5cdC8vIGNhcHNcblx0c3ZnX2dcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcImlkXCIsIFwidG50X1wiICsgZGl2X2lkICsgXCJfNXBjYXBcIilcblx0ICAgIC5hdHRyKFwieFwiLCAwKVxuXHQgICAgLmF0dHIoXCJ5XCIsIDApXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIDApXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG5cdCAgICAuYXR0cihcImZpbGxcIiwgXCJyZWRcIik7XG5cdHN2Z19nXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZCArIFwiXzNwY2FwXCIpXG5cdCAgICAuYXR0cihcInhcIiwgd2lkdGgtY2FwX3dpZHRoKVxuXHQgICAgLmF0dHIoXCJ5XCIsIDApXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIDApXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG5cdCAgICAuYXR0cihcImZpbGxcIiwgXCJyZWRcIik7XG5cblx0Ly8gVGhlIFpvb21pbmcvUGFubmluZyBQYW5lXG5cdHBhbmUgPSBzdmdfZ1xuXHQgICAgLmFwcGVuZChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfcGFuZVwiKVxuXHQgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZCArIFwiX3BhbmVcIilcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG5cdCAgICAuc3R5bGUoXCJmaWxsXCIsIGJnQ29sb3IpO1xuXG5cdC8vICoqIFRPRE86IFdvdWxkbid0IGJlIGJldHRlciB0byBoYXZlIHRoZXNlIG1lc3NhZ2VzIGJ5IHRyYWNrP1xuXHQvLyB2YXIgdG9vV2lkZV90ZXh0ID0gc3ZnX2dcblx0Ly8gICAgIC5hcHBlbmQoXCJ0ZXh0XCIpXG5cdC8vICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3dpZGVPS190ZXh0XCIpXG5cdC8vICAgICAuYXR0cihcImlkXCIsIFwidG50X1wiICsgZGl2X2lkICsgXCJfdG9vV2lkZVwiKVxuXHQvLyAgICAgLmF0dHIoXCJmaWxsXCIsIGJnQ29sb3IpXG5cdC8vICAgICAudGV4dChcIlJlZ2lvbiB0b28gd2lkZVwiKTtcblxuXHQvLyBUT0RPOiBJIGRvbid0IGtub3cgaWYgdGhpcyBpcyB0aGUgYmVzdCB3YXkgKGFuZCBwb3J0YWJsZSkgd2F5XG5cdC8vIG9mIGNlbnRlcmluZyB0aGUgdGV4dCBpbiB0aGUgdGV4dCBhcmVhXG5cdC8vIHZhciBiYiA9IHRvb1dpZGVfdGV4dFswXVswXS5nZXRCQm94KCk7XG5cdC8vIHRvb1dpZGVfdGV4dFxuXHQvLyAgICAgLmF0dHIoXCJ4XCIsIH5+KHdpZHRoLzIgLSBiYi53aWR0aC8yKSlcblx0Ly8gICAgIC5hdHRyKFwieVwiLCB+fihoZWlnaHQvMiAtIGJiLmhlaWdodC8yKSk7XG4gICAgfTtcblxuICAgIC8vIEFQSVxuICAgIHZhciBhcGkgPSBhcGlqcyAodHJhY2tfdmlzKVxuXHQuZ2V0c2V0IChleHBvcnRzKVxuXHQuZ2V0c2V0IChsaW1pdHMpXG5cdC5nZXRzZXQgKGxvYyk7XG5cbiAgICBhcGkudHJhbnNmb3JtICh0cmFja192aXMuZXh0ZW5kX2NhbnZhcywgZnVuY3Rpb24gKHZhbCkge1xuXHR2YXIgcHJldl92YWwgPSB0cmFja192aXMuZXh0ZW5kX2NhbnZhcygpO1xuXHR2YWwubGVmdCA9IHZhbC5sZWZ0IHx8IHByZXZfdmFsLmxlZnQ7XG5cdHZhbC5yaWdodCA9IHZhbC5yaWdodCB8fCBwcmV2X3ZhbC5yaWdodDtcblx0cmV0dXJuIHZhbDtcbiAgICB9KTtcblxuICAgIC8vIHRyYWNrX3ZpcyBhbHdheXMgc3RhcnRzIG9uIGxvYy5mcm9tICYgbG9jLnRvXG4gICAgYXBpLm1ldGhvZCAoJ3N0YXJ0JywgZnVuY3Rpb24gKCkge1xuXG5cdC8vIFJlc2V0IHRoZSB0cmFja3Ncblx0Zm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHRyYWNrc1tpXS5nKSB7XG5cdFx0dHJhY2tzW2ldLmRpc3BsYXkoKS5yZXNldC5jYWxsKHRyYWNrc1tpXSk7XG5cdCAgICB9XG5cdCAgICBfaW5pdF90cmFjayh0cmFja3NbaV0pO1xuXHR9XG5cblx0X3BsYWNlX3RyYWNrcygpO1xuXG5cdC8vIFRoZSBjb250aW51YXRpb24gY2FsbGJhY2tcblx0dmFyIGNvbnQgPSBmdW5jdGlvbiAocmVzcCkge1xuXHQgICAgbGltaXRzLnJpZ2h0ID0gcmVzcDtcblxuXHQgICAgLy8gem9vbUV2ZW50SGFuZGxlci54RXh0ZW50KFtsaW1pdHMubGVmdCwgbGltaXRzLnJpZ2h0XSk7XG5cdCAgICBpZiAoKGxvYy50byAtIGxvYy5mcm9tKSA8IGxpbWl0cy56b29tX2luKSB7XG5cdFx0aWYgKChsb2MuZnJvbSArIGxpbWl0cy56b29tX2luKSA+IGxpbWl0cy56b29tX2luKSB7XG5cdFx0ICAgIGxvYy50byA9IGxpbWl0cy5yaWdodDtcblx0XHR9IGVsc2Uge1xuXHRcdCAgICBsb2MudG8gPSBsb2MuZnJvbSArIGxpbWl0cy56b29tX2luO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIHBsb3QoKTtcblxuXHQgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHRcdF91cGRhdGVfdHJhY2sodHJhY2tzW2ldLCBsb2MpO1xuXHQgICAgfVxuXHR9O1xuXG5cdC8vIElmIGxpbWl0cy5yaWdodCBpcyBhIGZ1bmN0aW9uLCB3ZSBoYXZlIHRvIGNhbGwgaXQgYXN5bmNocm9ub3VzbHkgYW5kXG5cdC8vIHRoZW4gc3RhcnRpbmcgdGhlIHBsb3Qgb25jZSB3ZSBoYXZlIHNldCB0aGUgcmlnaHQgbGltaXQgKHBsb3QpXG5cdC8vIElmIG5vdCwgd2UgYXNzdW1lIHRoYXQgaXQgaXMgYW4gb2JqZXQgd2l0aCBuZXcgKG1heWJlIHBhcnRpYWxseSBkZWZpbmVkKVxuXHQvLyBkZWZpbml0aW9ucyBvZiB0aGUgbGltaXRzIGFuZCB3ZSBjYW4gcGxvdCBkaXJlY3RseVxuXHQvLyBUT0RPOiBSaWdodCBub3csIG9ubHkgcmlnaHQgY2FuIGJlIGNhbGxlZCBhcyBhbiBhc3luYyBmdW5jdGlvbiB3aGljaCBpcyB3ZWFrXG5cdGlmICh0eXBlb2YgKGxpbWl0cy5yaWdodCkgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIGxpbWl0cy5yaWdodChjb250KTtcblx0fSBlbHNlIHtcblx0ICAgIGNvbnQobGltaXRzLnJpZ2h0KTtcblx0fVxuXG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgndXBkYXRlJywgZnVuY3Rpb24gKCkge1xuXHRmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBfdXBkYXRlX3RyYWNrICh0cmFja3NbaV0pO1xuXHR9XG5cbiAgICB9KTtcblxuICAgIHZhciBfdXBkYXRlX3RyYWNrID0gZnVuY3Rpb24gKHRyYWNrLCB3aGVyZSkge1xuXHRpZiAodHJhY2suZGF0YSgpKSB7XG5cdCAgICB2YXIgdHJhY2tfZGF0YSA9IHRyYWNrLmRhdGEoKTtcblx0ICAgIHZhciBkYXRhX3VwZGF0ZXIgPSB0cmFja19kYXRhLnVwZGF0ZSgpO1xuXHQgICAgLy92YXIgZGF0YV91cGRhdGVyID0gdHJhY2suZGF0YSgpLnVwZGF0ZSgpO1xuXHQgICAgZGF0YV91cGRhdGVyLmNhbGwodHJhY2tfZGF0YSwge1xuXHRcdCdsb2MnIDogd2hlcmUsXG5cdFx0J29uX3N1Y2Nlc3MnIDogZnVuY3Rpb24gKCkge1xuXHRcdCAgICB0cmFjay5kaXNwbGF5KCkudXBkYXRlLmNhbGwodHJhY2ssIHhTY2FsZSk7XG5cdFx0fVxuXHQgICAgfSk7XG5cdH1cbiAgICB9O1xuXG4gICAgdmFyIHBsb3QgPSBmdW5jdGlvbigpIHtcblxuXHR4U2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuXHQgICAgLmRvbWFpbihbbG9jLmZyb20sIGxvYy50b10pXG5cdCAgICAucmFuZ2UoWzAsIHdpZHRoXSk7XG5cblx0aWYgKGRyYWdfYWxsb3dlZCkge1xuXHQgICAgc3ZnX2cuY2FsbCggem9vbUV2ZW50SGFuZGxlclxuXHRcdCAgICAgICAueCh4U2NhbGUpXG5cdFx0ICAgICAgIC5zY2FsZUV4dGVudChbKGxvYy50by1sb2MuZnJvbSkvKGxpbWl0cy56b29tX291dC0xKSwgKGxvYy50by1sb2MuZnJvbSkvbGltaXRzLnpvb21faW5dKVxuXHRcdCAgICAgICAub24oXCJ6b29tXCIsIF9tb3ZlKVxuXHRcdCAgICAgKTtcblx0fVxuXG4gICAgfTtcblxuICAgIC8vIHJpZ2h0L2xlZnQvem9vbSBwYW5zIG9yIHpvb21zIHRoZSB0cmFjay4gVGhlc2UgbWV0aG9kcyBhcmUgZXhwb3NlZCB0byBhbGxvdyBleHRlcm5hbCBidXR0b25zLCBldGMgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgdHJhY2tzLiBUaGUgYXJndW1lbnQgaXMgdGhlIGFtb3VudCBvZiBwYW5uaW5nL3pvb21pbmcgKGllLiAxLjIgbWVhbnMgMjAlIHBhbm5pbmcpIFdpdGggbGVmdC9yaWdodCBvbmx5IHBvc2l0aXZlIG51bWJlcnMgYXJlIGFsbG93ZWQuXG4gICAgYXBpLm1ldGhvZCAoJ21vdmVfcmlnaHQnLCBmdW5jdGlvbiAoZmFjdG9yKSB7XG5cdGlmIChmYWN0b3IgPiAwKSB7XG5cdCAgICBfbWFudWFsX21vdmUoZmFjdG9yLCAxKTtcblx0fVxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ21vdmVfbGVmdCcsIGZ1bmN0aW9uIChmYWN0b3IpIHtcblx0aWYgKGZhY3RvciA+IDApIHtcblx0ICAgIF9tYW51YWxfbW92ZShmYWN0b3IsIC0xKTtcblx0fVxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3pvb20nLCBmdW5jdGlvbiAoZmFjdG9yKSB7XG5cdF9tYW51YWxfbW92ZShmYWN0b3IsIDApO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2ZpbmRfdHJhY2tfYnlfaWQnLCBmdW5jdGlvbiAoaWQpIHtcblx0Zm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHRyYWNrc1tpXS5pZCgpID09PSBpZCkge1xuXHRcdHJldHVybiB0cmFja3NbaV07XG5cdCAgICB9XG5cdH1cbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdyZW9yZGVyJywgZnVuY3Rpb24gKG5ld190cmFja3MpIHtcblx0Ly8gVE9ETzogVGhpcyBpcyBkZWZpbmluZyBhIG5ldyBoZWlnaHQsIGJ1dCB0aGUgZ2xvYmFsIGhlaWdodCBpcyB1c2VkIHRvIGRlZmluZSB0aGUgc2l6ZSBvZiBzZXZlcmFsXG5cdC8vIHBhcnRzLiBXZSBzaG91bGQgZG8gdGhpcyBkeW5hbWljYWxseVxuXG5cdGZvciAodmFyIGo9MDsgajxuZXdfdHJhY2tzLmxlbmd0aDsgaisrKSB7XG5cdCAgICB2YXIgZm91bmQgPSBmYWxzZTtcblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0XHRpZiAodHJhY2tzW2ldLmlkKCkgPT09IG5ld190cmFja3Nbal0uaWQoKSkge1xuXHRcdCAgICBmb3VuZCA9IHRydWU7XG5cdFx0ICAgIHRyYWNrcy5zcGxpY2UoaSwxKTtcblx0XHQgICAgYnJlYWs7XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgaWYgKCFmb3VuZCkge1xuXHRcdF9pbml0X3RyYWNrKG5ld190cmFja3Nbal0pO1xuXHRcdF91cGRhdGVfdHJhY2sobmV3X3RyYWNrc1tqXSwge2Zyb20gOiBsb2MuZnJvbSwgdG8gOiBsb2MudG99KTtcblx0ICAgIH1cblx0fVxuXG5cdGZvciAodmFyIHg9MDsgeDx0cmFja3MubGVuZ3RoOyB4KyspIHtcblx0ICAgIHRyYWNrc1t4XS5nLnJlbW92ZSgpO1xuXHR9XG5cblx0dHJhY2tzID0gbmV3X3RyYWNrcztcblx0X3BsYWNlX3RyYWNrcygpO1xuXG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgncmVtb3ZlX3RyYWNrJywgZnVuY3Rpb24gKHRyYWNrKSB7XG5cdHRyYWNrLmcucmVtb3ZlKCk7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnYWRkX3RyYWNrJywgZnVuY3Rpb24gKHRyYWNrKSB7XG5cdGlmICh0cmFjayBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8dHJhY2subGVuZ3RoOyBpKyspIHtcblx0XHR0cmFja192aXMuYWRkX3RyYWNrICh0cmFja1tpXSk7XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdHJhY2tfdmlzO1xuXHR9XG5cdHRyYWNrcy5wdXNoKHRyYWNrKTtcblx0cmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QoJ3RyYWNrcycsIGZ1bmN0aW9uIChuZXdfdHJhY2tzKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHRyYWNrc1xuXHR9XG5cdHRyYWNrcyA9IG5ld190cmFja3M7XG5cdHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICAvLyBcbiAgICBhcGkubWV0aG9kICgnd2lkdGgnLCBmdW5jdGlvbiAodykge1xuXHQvLyBUT0RPOiBBbGxvdyBzdWZmaXhlcyBsaWtlIFwiMTAwMHB4XCI/XG5cdC8vIFRPRE86IFRlc3Qgd3JvbmcgZm9ybWF0c1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB3aWR0aDtcblx0fVxuXHQvLyBBdCBsZWFzdCBtaW4td2lkdGhcblx0aWYgKHcgPCBtaW5fd2lkdGgpIHtcblx0ICAgIHcgPSBtaW5fd2lkdGhcblx0fVxuXG5cdC8vIFdlIGFyZSByZXNpemluZ1xuXHRpZiAoZGl2X2lkICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwid2lkdGhcIiwgdyk7XG5cdCAgICAvLyBSZXNpemUgdGhlIHpvb21pbmcvcGFubmluZyBwYW5lXG5cdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkKS5zdHlsZShcIndpZHRoXCIsIChwYXJzZUludCh3KSArIGNhcF93aWR0aCoyKSArIFwicHhcIik7XG5cdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfcGFuZVwiKS5hdHRyKFwid2lkdGhcIiwgdyk7XG5cblx0ICAgIC8vIFJlcGxvdFxuXHQgICAgd2lkdGggPSB3O1xuXHQgICAgcGxvdCgpO1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHRcdHRyYWNrc1tpXS5nLnNlbGVjdChcInJlY3RcIikuYXR0cihcIndpZHRoXCIsIHcpO1xuXHRcdHRyYWNrc1tpXS5kaXNwbGF5KCkucmVzZXQuY2FsbCh0cmFja3NbaV0pO1xuXHRcdHRyYWNrc1tpXS5kaXNwbGF5KCkudXBkYXRlLmNhbGwodHJhY2tzW2ldLHhTY2FsZSk7XG5cdCAgICB9XG5cdCAgICBcblx0fSBlbHNlIHtcblx0ICAgIHdpZHRoID0gdztcblx0fVxuXHRcblx0cmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QoJ2FsbG93X2RyYWcnLCBmdW5jdGlvbihiKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGRyYWdfYWxsb3dlZDtcblx0fVxuXHRkcmFnX2FsbG93ZWQgPSBiO1xuXHRpZiAoZHJhZ19hbGxvd2VkKSB7XG5cdCAgICAvLyBXaGVuIHRoaXMgbWV0aG9kIGlzIGNhbGxlZCBvbiB0aGUgb2JqZWN0IGJlZm9yZSBzdGFydGluZyB0aGUgc2ltdWxhdGlvbiwgd2UgZG9uJ3QgaGF2ZSBkZWZpbmVkIHhTY2FsZVxuXHQgICAgaWYgKHhTY2FsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0c3ZnX2cuY2FsbCggem9vbUV2ZW50SGFuZGxlci54KHhTY2FsZSlcblx0XHRcdCAgIC8vIC54RXh0ZW50KFswLCBsaW1pdHMucmlnaHRdKVxuXHRcdFx0ICAgLnNjYWxlRXh0ZW50KFsobG9jLnRvLWxvYy5mcm9tKS8obGltaXRzLnpvb21fb3V0LTEpLCAobG9jLnRvLWxvYy5mcm9tKS9saW1pdHMuem9vbV9pbl0pXG5cdFx0XHQgICAub24oXCJ6b29tXCIsIF9tb3ZlKSApO1xuXHQgICAgfVxuXHR9IGVsc2Uge1xuXHQgICAgLy8gV2UgY3JlYXRlIGEgbmV3IGR1bW15IHNjYWxlIGluIHggdG8gYXZvaWQgZHJhZ2dpbmcgdGhlIHByZXZpb3VzIG9uZVxuXHQgICAgLy8gVE9ETzogVGhlcmUgbWF5IGJlIGEgY2hlYXBlciB3YXkgb2YgZG9pbmcgdGhpcz9cblx0ICAgIHpvb21FdmVudEhhbmRsZXIueChkMy5zY2FsZS5saW5lYXIoKSkub24oXCJ6b29tXCIsIG51bGwpO1xuXHR9XG5cdHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICB2YXIgX3BsYWNlX3RyYWNrcyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGggPSAwO1xuXHRmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0cmFja3NbaV07XG5cdCAgICBpZiAodHJhY2suZy5hdHRyKFwidHJhbnNmb3JtXCIpKSB7XG5cdFx0dHJhY2suZ1xuXHRcdCAgICAudHJhbnNpdGlvbigpXG5cdFx0ICAgIC5kdXJhdGlvbihkdXIpXG5cdFx0ICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgZXhwb3J0cy5leHRlbmRfY2FudmFzLmxlZnQgKyBcIixcIiArIGggKyBcIilcIik7XG5cdCAgICB9IGVsc2Uge1xuXHRcdHRyYWNrLmdcblx0XHQgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBleHBvcnRzLmV4dGVuZF9jYW52YXMubGVmdCArIFwiLFwiICsgaCArIFwiKVwiKTtcblx0ICAgIH1cblxuXHQgICAgaCArPSB0cmFjay5oZWlnaHQoKTtcblx0fVxuXG5cdC8vIHN2Z1xuXHRzdmcuYXR0cihcImhlaWdodFwiLCBoICsgaGVpZ2h0X29mZnNldCk7XG5cblx0Ly8gZGl2XG5cdGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQpXG5cdCAgICAuc3R5bGUoXCJoZWlnaHRcIiwgKGggKyAxMCArIGhlaWdodF9vZmZzZXQpICsgXCJweFwiKTtcblxuXHQvLyBjYXBzXG5cdGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQgKyBcIl81cGNhcFwiKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaClcblx0ICAgIC8vIC5tb3ZlX3RvX2Zyb250KClcblx0ICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG5cdFx0bW92ZV90b19mcm9udCh0aGlzKTtcblx0ICAgIH0pXG5cdGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQgKyBcIl8zcGNhcFwiKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaClcblx0Ly8ubW92ZV90b19mcm9udCgpXG5cdCAgICAuZWFjaCAoZnVuY3Rpb24gKGQpIHtcblx0XHRtb3ZlX3RvX2Zyb250KHRoaXMpO1xuXHQgICAgfSk7XG5cdFxuXG5cdC8vIHBhbmVcblx0cGFuZVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaCArIGhlaWdodF9vZmZzZXQpO1xuXG5cdC8vIHRvb1dpZGVfdGV4dC4gVE9ETzogSXMgdGhpcyBzdGlsbCBuZWVkZWQ/XG5cdC8vIHZhciB0b29XaWRlX3RleHQgPSBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfdG9vV2lkZVwiKTtcblx0Ly8gdmFyIGJiID0gdG9vV2lkZV90ZXh0WzBdWzBdLmdldEJCb3goKTtcblx0Ly8gdG9vV2lkZV90ZXh0XG5cdC8vICAgICAuYXR0cihcInlcIiwgfn4oaC8yKSAtIGJiLmhlaWdodC8yKTtcblxuXHRyZXR1cm4gdHJhY2tfdmlzO1xuICAgIH1cblxuICAgIHZhciBfaW5pdF90cmFjayA9IGZ1bmN0aW9uICh0cmFjaykge1xuXHR0cmFjay5nID0gc3ZnLnNlbGVjdChcImdcIikuc2VsZWN0KFwiZ1wiKVxuXHQgICAgLmFwcGVuZChcImdcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfdHJhY2tcIilcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRyYWNrLmhlaWdodCgpKTtcblxuXHQvLyBSZWN0IGZvciB0aGUgYmFja2dyb3VuZCBjb2xvclxuXHR0cmFjay5nXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIDApXG5cdCAgICAuYXR0cihcInlcIiwgMClcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgdHJhY2tfdmlzLndpZHRoKCkpXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSlcblx0ICAgIC5zdHlsZShcImZpbGxcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuXHQgICAgLnN0eWxlKFwicG9pbnRlci1ldmVudHNcIiwgXCJub25lXCIpO1xuXG5cdGlmICh0cmFjay5kaXNwbGF5KCkpIHtcblx0ICAgIHRyYWNrLmRpc3BsYXkoKS5pbml0LmNhbGwodHJhY2ssIHdpZHRoKTtcblx0fVxuXHRcblx0cmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9O1xuXG4gICAgdmFyIF9tYW51YWxfbW92ZSA9IGZ1bmN0aW9uIChmYWN0b3IsIGRpcmVjdGlvbikge1xuXHR2YXIgb2xkRG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuXG5cdHZhciBzcGFuID0gb2xkRG9tYWluWzFdIC0gb2xkRG9tYWluWzBdO1xuXHR2YXIgb2Zmc2V0ID0gKHNwYW4gKiBmYWN0b3IpIC0gc3BhbjtcblxuXHR2YXIgbmV3RG9tYWluO1xuXHRzd2l0Y2ggKGRpcmVjdGlvbikge1xuXHRjYXNlIC0xIDpcblx0ICAgIG5ld0RvbWFpbiA9IFsofn5vbGREb21haW5bMF0gLSBvZmZzZXQpLCB+fihvbGREb21haW5bMV0gLSBvZmZzZXQpXTtcblx0ICAgIGJyZWFrO1xuXHRjYXNlIDEgOlxuXHQgICAgbmV3RG9tYWluID0gWyh+fm9sZERvbWFpblswXSArIG9mZnNldCksIH5+KG9sZERvbWFpblsxXSAtIG9mZnNldCldO1xuXHQgICAgYnJlYWs7XG5cdGNhc2UgMCA6XG5cdCAgICBuZXdEb21haW4gPSBbb2xkRG9tYWluWzBdIC0gfn4ob2Zmc2V0LzIpLCBvbGREb21haW5bMV0gKyAofn5vZmZzZXQvMildO1xuXHR9XG5cblx0dmFyIGludGVycG9sYXRvciA9IGQzLmludGVycG9sYXRlTnVtYmVyKG9sZERvbWFpblswXSwgbmV3RG9tYWluWzBdKTtcblx0dmFyIGVhc2UgPSBleHBvcnRzLmVhc2U7XG5cblx0dmFyIHggPSAwO1xuXHRkMy50aW1lcihmdW5jdGlvbigpIHtcblx0ICAgIHZhciBjdXJyX3N0YXJ0ID0gaW50ZXJwb2xhdG9yKGVhc2UoeCkpO1xuXHQgICAgdmFyIGN1cnJfZW5kO1xuXHQgICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcblx0ICAgIGNhc2UgLTEgOlxuXHRcdGN1cnJfZW5kID0gY3Vycl9zdGFydCArIHNwYW47XG5cdFx0YnJlYWs7XG5cdCAgICBjYXNlIDEgOlxuXHRcdGN1cnJfZW5kID0gY3Vycl9zdGFydCArIHNwYW47XG5cdFx0YnJlYWs7XG5cdCAgICBjYXNlIDAgOlxuXHRcdGN1cnJfZW5kID0gb2xkRG9tYWluWzFdICsgb2xkRG9tYWluWzBdIC0gY3Vycl9zdGFydDtcblx0XHRicmVhaztcblx0ICAgIH1cblxuXHQgICAgdmFyIGN1cnJEb21haW4gPSBbY3Vycl9zdGFydCwgY3Vycl9lbmRdO1xuXHQgICAgeFNjYWxlLmRvbWFpbihjdXJyRG9tYWluKTtcblx0ICAgIF9tb3ZlKHhTY2FsZSk7XG5cdCAgICB4Kz0wLjAyO1xuXHQgICAgcmV0dXJuIHg+MTtcblx0fSk7XG4gICAgfTtcblxuXG4gICAgdmFyIF9tb3ZlX2NiYWsgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBjdXJyRG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuXHR0cmFja192aXMuZnJvbSh+fmN1cnJEb21haW5bMF0pO1xuXHR0cmFja192aXMudG8ofn5jdXJyRG9tYWluWzFdKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIHRyYWNrID0gdHJhY2tzW2ldO1xuXHQgICAgX3VwZGF0ZV90cmFjayh0cmFjaywgbG9jKTtcblx0fVxuICAgIH07XG4gICAgLy8gVGhlIGRlZmVycmVkX2NiYWsgaXMgZGVmZXJyZWQgYXQgbGVhc3QgdGhpcyBhbW91bnQgb2YgdGltZSBvciByZS1zY2hlZHVsZWQgaWYgZGVmZXJyZWQgaXMgY2FsbGVkIGJlZm9yZVxuICAgIHZhciBfZGVmZXJyZWQgPSBkZWZlckNhbmNlbChfbW92ZV9jYmFrLCAzMDApO1xuXG4gICAgLy8gYXBpLm1ldGhvZCgndXBkYXRlJywgZnVuY3Rpb24gKCkge1xuICAgIC8vIFx0X21vdmUoKTtcbiAgICAvLyB9KTtcblxuICAgIHZhciBfbW92ZSA9IGZ1bmN0aW9uIChuZXdfeFNjYWxlKSB7XG5cdGlmIChuZXdfeFNjYWxlICE9PSB1bmRlZmluZWQgJiYgZHJhZ19hbGxvd2VkKSB7XG5cdCAgICB6b29tRXZlbnRIYW5kbGVyLngobmV3X3hTY2FsZSk7XG5cdH1cblxuXHQvLyBTaG93IHRoZSByZWQgYmFycyBhdCB0aGUgbGltaXRzXG5cdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG5cdGlmIChkb21haW5bMF0gPD0gNSkge1xuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzVwY2FwXCIpXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCBjYXBfd2lkdGgpXG5cdFx0LnRyYW5zaXRpb24oKVxuXHRcdC5kdXJhdGlvbigyMDApXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCAwKTtcblx0fVxuXG5cdGlmIChkb21haW5bMV0gPj0gKGxpbWl0cy5yaWdodCktNSkge1xuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzNwY2FwXCIpXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCBjYXBfd2lkdGgpXG5cdFx0LnRyYW5zaXRpb24oKVxuXHRcdC5kdXJhdGlvbigyMDApXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCAwKTtcblx0fVxuXG5cblx0Ly8gQXZvaWQgbW92aW5nIHBhc3QgdGhlIGxpbWl0c1xuXHRpZiAoZG9tYWluWzBdIDwgbGltaXRzLmxlZnQpIHtcblx0ICAgIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKFt6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzBdIC0geFNjYWxlKGxpbWl0cy5sZWZ0KSArIHhTY2FsZS5yYW5nZSgpWzBdLCB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzFdXSk7XG5cdH0gZWxzZSBpZiAoZG9tYWluWzFdID4gbGltaXRzLnJpZ2h0KSB7XG5cdCAgICB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZShbem9vbUV2ZW50SGFuZGxlci50cmFuc2xhdGUoKVswXSAtIHhTY2FsZShsaW1pdHMucmlnaHQpICsgeFNjYWxlLnJhbmdlKClbMV0sIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKClbMV1dKTtcblx0fVxuXG5cdF9kZWZlcnJlZCgpO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0cmFja3NbaV07XG5cdCAgICB0cmFjay5kaXNwbGF5KCkubW92ZS5jYWxsKHRyYWNrLHhTY2FsZSk7XG5cdH1cbiAgICB9O1xuXG4gICAgLy8gYXBpLm1ldGhvZCh7XG4gICAgLy8gXHRhbGxvd19kcmFnIDogYXBpX2FsbG93X2RyYWcsXG4gICAgLy8gXHR3aWR0aCAgICAgIDogYXBpX3dpZHRoLFxuICAgIC8vIFx0YWRkX3RyYWNrICA6IGFwaV9hZGRfdHJhY2ssXG4gICAgLy8gXHRyZW9yZGVyICAgIDogYXBpX3Jlb3JkZXIsXG4gICAgLy8gXHR6b29tICAgICAgIDogYXBpX3pvb20sXG4gICAgLy8gXHRsZWZ0ICAgICAgIDogYXBpX2xlZnQsXG4gICAgLy8gXHRyaWdodCAgICAgIDogYXBpX3JpZ2h0LFxuICAgIC8vIFx0c3RhcnQgICAgICA6IGFwaV9zdGFydFxuICAgIC8vIH0pO1xuXG4gICAgLy8gQXV4aWxpYXIgZnVuY3Rpb25zXG4gICAgZnVuY3Rpb24gbW92ZV90b19mcm9udCAoZWxlbSkge1xuXHRlbGVtLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0cmFja192aXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBib2FyZDtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcbi8vIHZhciBlbnNlbWJsUmVzdEFQSSA9IHJlcXVpcmUoXCJ0bnQuZW5zZW1ibFwiKTtcblxuLy8gdmFyIGJvYXJkID0ge307XG4vLyBib2FyZC50cmFjayA9IHt9O1xuXG52YXIgZGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBfID0gZnVuY3Rpb24gKCkge1xuICAgIH07XG5cbiAgICAvLyBHZXR0ZXJzIC8gU2V0dGVyc1xuICAgIGFwaWpzIChfKVxuICAgIC8vIGxhYmVsIGlzIG5vdCB1c2VkIGF0IHRoZSBtb21lbnRcblx0LmdldHNldCAoJ2xhYmVsJywgXCJcIilcblx0LmdldHNldCAoJ2VsZW1lbnRzJywgW10pXG5cdC5nZXRzZXQgKCd1cGRhdGUnLCBmdW5jdGlvbiAoKSB7fSk7XG5cbiAgICByZXR1cm4gXztcbn07XG5cbi8vIFRoZSByZXRyaWV2ZXJzLiBUaGV5IG5lZWQgdG8gYWNjZXNzICdlbGVtZW50cydcbmRhdGEucmV0cmlldmVyID0ge307XG5cbmRhdGEucmV0cmlldmVyLnN5bmMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdXBkYXRlX3RyYWNrID0gZnVuY3Rpb24ob2JqKSB7XG5cdC8vIFwidGhpc1wiIGlzIHNldCB0byB0aGUgZGF0YSBvYmpcbiAgICAgICAgdGhpcy5lbGVtZW50cyh1cGRhdGVfdHJhY2sucmV0cmlldmVyKCkob2JqLmxvYykpO1xuICAgICAgICBvYmoub25fc3VjY2VzcygpO1xuICAgIH07XG5cbiAgICBhcGlqcyAodXBkYXRlX3RyYWNrKVxuXHQuZ2V0c2V0ICgncmV0cmlldmVyJywgZnVuY3Rpb24gKCkge30pXG5cbiAgICByZXR1cm4gdXBkYXRlX3RyYWNrO1xufTtcblxuZGF0YS5yZXRyaWV2ZXIuYXN5bmMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHVybCA9ICcnO1xuXG4gICAgLy8gXCJ0aGlzXCIgaXMgc2V0IHRvIHRoZSBkYXRhIG9ialxuICAgIHZhciBkYXRhX29iaiA9IHRoaXM7XG4gICAgdmFyIHVwZGF0ZV90cmFjayA9IGZ1bmN0aW9uIChvYmopIHtcblx0ZDMuanNvbih1cmwsIGZ1bmN0aW9uIChlcnIsIHJlc3ApIHtcblx0ICAgIGRhdGFfb2JqLmVsZW1lbnRzKHJlc3ApO1xuXHQgICAgb2JqLm9uX3N1Y2Nlc3MoKTtcblx0fSk7IFxuICAgIH07XG5cbiAgICBhcGlqcyAodXBkYXRlX3RyYWNrKVxuXHQuZ2V0c2V0ICgndXJsJywgJycpO1xuXG4gICAgcmV0dXJuIHVwZGF0ZV90cmFjaztcbn07XG5cblxuXG4vLyBBIHByZWRlZmluZWQgdHJhY2sgZm9yIGdlbmVzXG4vLyB0bnQudHJhY2suZGF0YS5nZW5lID0gZnVuY3Rpb24gKCkge1xuLy8gICAgIHZhciB0cmFjayA9IHRudC50cmFjay5kYXRhKCk7XG4vLyBcdC8vIC5pbmRleChcIklEXCIpO1xuXG4vLyAgICAgdmFyIHVwZGF0ZXIgPSB0bnQudHJhY2sucmV0cmlldmVyLmVuc2VtYmwoKVxuLy8gXHQuZW5kcG9pbnQoXCJyZWdpb25cIilcbi8vICAgICAvLyBUT0RPOiBJZiBzdWNjZXNzIGlzIGRlZmluZWQgaGVyZSwgbWVhbnMgdGhhdCBpdCBjYW4ndCBiZSB1c2VyLWRlZmluZWRcbi8vICAgICAvLyBpcyB0aGF0IGdvb2Q/IGVub3VnaD8gQVBJP1xuLy8gICAgIC8vIFVQREFURTogTm93IHN1Y2Nlc3MgaXMgYmFja2VkIHVwIGJ5IGFuIGFycmF5LiBTdGlsbCBkb24ndCBrbm93IGlmIHRoaXMgaXMgdGhlIGJlc3Qgb3B0aW9uXG4vLyBcdC5zdWNjZXNzKGZ1bmN0aW9uKGdlbmVzKSB7XG4vLyBcdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlbmVzLmxlbmd0aDsgaSsrKSB7XG4vLyBcdFx0aWYgKGdlbmVzW2ldLnN0cmFuZCA9PT0gLTEpIHsgIFxuLy8gXHRcdCAgICBnZW5lc1tpXS5kaXNwbGF5X2xhYmVsID0gXCI8XCIgKyBnZW5lc1tpXS5leHRlcm5hbF9uYW1lO1xuLy8gXHRcdH0gZWxzZSB7XG4vLyBcdFx0ICAgIGdlbmVzW2ldLmRpc3BsYXlfbGFiZWwgPSBnZW5lc1tpXS5leHRlcm5hbF9uYW1lICsgXCI+XCI7XG4vLyBcdFx0fVxuLy8gXHQgICAgfVxuLy8gXHR9KTtcblxuLy8gICAgIHJldHVybiB0cmFjay51cGRhdGUodXBkYXRlcik7XG4vLyB9XG5cbi8vIEEgcHJlZGVmaW5lZCB0cmFjayBkaXNwbGF5aW5nIG5vIGV4dGVybmFsIGRhdGFcbi8vIGl0IGlzIHVzZWQgZm9yIGxvY2F0aW9uIGFuZCBheGlzIHRyYWNrcyBmb3IgZXhhbXBsZVxuZGF0YS5lbXB0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdHJhY2sgPSBkYXRhKCk7XG4gICAgdmFyIHVwZGF0ZXIgPSBkYXRhLnJldHJpZXZlci5zeW5jKCk7XG4gICAgdHJhY2sudXBkYXRlKHVwZGF0ZXIpO1xuXG4gICAgcmV0dXJuIHRyYWNrO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZGF0YTtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcbnZhciBsYXlvdXQgPSByZXF1aXJlKFwiLi9sYXlvdXQuanNcIik7XG5cbi8vIEZFQVRVUkUgVklTXG4vLyB2YXIgYm9hcmQgPSB7fTtcbi8vIGJvYXJkLnRyYWNrID0ge307XG52YXIgdG50X2ZlYXR1cmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8vLy8vIFZhcnMgZXhwb3NlZCBpbiB0aGUgQVBJXG4gICAgdmFyIGV4cG9ydHMgPSB7XG5cdGNyZWF0ZSAgIDogZnVuY3Rpb24gKCkge3Rocm93IFwiY3JlYXRlX2VsZW0gaXMgbm90IGRlZmluZWQgaW4gdGhlIGJhc2UgZmVhdHVyZSBvYmplY3RcIjt9LFxuXHRtb3ZlciAgICA6IGZ1bmN0aW9uICgpIHt0aHJvdyBcIm1vdmVfZWxlbSBpcyBub3QgZGVmaW5lZCBpbiB0aGUgYmFzZSBmZWF0dXJlIG9iamVjdFwiO30sXG5cdHVwZGF0ZXIgIDogZnVuY3Rpb24gKCkge30sXG5cdG9uX2NsaWNrIDogZnVuY3Rpb24gKCkge30sXG5cdG9uX21vdXNlb3ZlciA6IGZ1bmN0aW9uICgpIHt9LFxuXHRndWlkZXIgICA6IGZ1bmN0aW9uICgpIHt9LFxuXHRpbmRleCAgICA6IHVuZGVmaW5lZCxcblx0bGF5b3V0ICAgOiBsYXlvdXQuaWRlbnRpdHkoKSxcblx0Zm9yZWdyb3VuZF9jb2xvciA6ICcjMDAwJ1xuICAgIH07XG5cblxuICAgIC8vIFRoZSByZXR1cm5lZCBvYmplY3RcbiAgICB2YXIgZmVhdHVyZSA9IHt9O1xuXG4gICAgdmFyIHJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpLnJlbW92ZSgpO1xuXHR0cmFjay5nLnNlbGVjdEFsbChcIi50bnRfZ3VpZGVyXCIpLnJlbW92ZSgpO1xuICAgIH07XG5cbiAgICB2YXIgaW5pdCA9IGZ1bmN0aW9uICh3aWR0aCkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRleHBvcnRzLmd1aWRlci5jYWxsKHRyYWNrLCB3aWR0aCk7XG4gICAgfTtcblxuICAgIHZhciBwbG90ID0gZnVuY3Rpb24gKG5ld19lbGVtcywgdHJhY2ssIHhTY2FsZSkge1xuXHRuZXdfZWxlbXMub24oXCJjbGlja1wiLCBleHBvcnRzLm9uX2NsaWNrKTtcblx0bmV3X2VsZW1zLm9uKFwibW91c2VvdmVyXCIsIGV4cG9ydHMub25fbW91c2VvdmVyKTtcblx0Ly8gbmV3X2VsZW0gaXMgYSBnIGVsZW1lbnQgd2hlcmUgdGhlIGZlYXR1cmUgaXMgaW5zZXJ0ZWRcblx0ZXhwb3J0cy5jcmVhdGUuY2FsbCh0cmFjaywgbmV3X2VsZW1zLCB4U2NhbGUpO1xuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSwgZmllbGQpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIHN2Z19nID0gdHJhY2suZztcblx0dmFyIGxheW91dCA9IGV4cG9ydHMubGF5b3V0O1xuXG5cdHZhciBlbGVtZW50cyA9IHRyYWNrLmRhdGEoKS5lbGVtZW50cygpO1xuXG5cdGlmIChmaWVsZCAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBlbGVtZW50cyA9IGVsZW1lbnRzW2ZpZWxkXTtcblx0fVxuXG5cdGxheW91dChlbGVtZW50cywgeFNjYWxlKTtcblx0dmFyIGRhdGFfZWxlbXMgPSBsYXlvdXQuZWxlbWVudHMoKTtcblxuXHR2YXIgdmlzX3NlbDtcblx0dmFyIHZpc19lbGVtcztcblx0aWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIHZpc19zZWwgPSBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1fXCIgKyBmaWVsZCk7XG5cdH0gZWxzZSB7XG5cdCAgICB2aXNfc2VsID0gc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpO1xuXHR9XG5cblx0aWYgKGV4cG9ydHMuaW5kZXgpIHsgLy8gSW5kZXhpbmcgYnkgZmllbGRcblx0ICAgIHZpc19lbGVtcyA9IHZpc19zZWxcblx0XHQuZGF0YShkYXRhX2VsZW1zLCBmdW5jdGlvbiAoZCkge1xuXHRcdCAgICBpZiAoZCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm4gZXhwb3J0cy5pbmRleChkKTtcblx0XHQgICAgfVxuXHRcdH0pO1xuXHR9IGVsc2UgeyAvLyBJbmRleGluZyBieSBwb3NpdGlvbiBpbiBhcnJheVxuXHQgICAgdmlzX2VsZW1zID0gdmlzX3NlbFxuXHRcdC5kYXRhKGRhdGFfZWxlbXMpO1xuXHR9XG5cblx0ZXhwb3J0cy51cGRhdGVyLmNhbGwodHJhY2ssIHZpc19lbGVtcywgeFNjYWxlKTtcblxuXHR2YXIgbmV3X2VsZW0gPSB2aXNfZWxlbXNcblx0ICAgIC5lbnRlcigpO1xuXG5cdG5ld19lbGVtXG5cdCAgICAuYXBwZW5kKFwiZ1wiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9lbGVtXCIpXG5cdCAgICAuY2xhc3NlZChcInRudF9lbGVtX1wiICsgZmllbGQsIGZpZWxkKVxuXHQgICAgLmNhbGwoZmVhdHVyZS5wbG90LCB0cmFjaywgeFNjYWxlKTtcblxuXHR2aXNfZWxlbXNcblx0ICAgIC5leGl0KClcblx0ICAgIC5yZW1vdmUoKTtcbiAgICB9O1xuXG4gICAgdmFyIG1vdmUgPSBmdW5jdGlvbiAoeFNjYWxlLCBmaWVsZCkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHR2YXIgc3ZnX2cgPSB0cmFjay5nO1xuXHR2YXIgZWxlbXM7XG5cdC8vIFRPRE86IElzIHNlbGVjdGluZyB0aGUgZWxlbWVudHMgdG8gbW92ZSB0b28gc2xvdz9cblx0Ly8gSXQgd291bGQgYmUgbmljZSB0byBwcm9maWxlXG5cdGlmIChmaWVsZCAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBlbGVtcyA9IHN2Z19nLnNlbGVjdEFsbChcIi50bnRfZWxlbV9cIiArIGZpZWxkKTtcblx0fSBlbHNlIHtcblx0ICAgIGVsZW1zID0gc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpO1xuXHR9XG5cblx0ZXhwb3J0cy5tb3Zlci5jYWxsKHRoaXMsIGVsZW1zLCB4U2NhbGUpO1xuICAgIH07XG5cbiAgICB2YXIgbXRmID0gZnVuY3Rpb24gKGVsZW0pIHtcblx0ZWxlbS5wYXJlbnROb2RlLmFwcGVuZENoaWxkKGVsZW0pO1xuICAgIH07XG4gICAgXG4gICAgdmFyIG1vdmVfdG9fZnJvbnQgPSBmdW5jdGlvbiAoZmllbGQpIHtcblx0aWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIHZhciB0cmFjayA9IHRoaXM7XG5cdCAgICB2YXIgc3ZnX2cgPSB0cmFjay5nO1xuXHQgICAgc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtX1wiICsgZmllbGQpXG5cdCAgICAgICAgLmVhY2goIGZ1bmN0aW9uICgpIHtcblx0XHQgICAgbXRmKHRoaXMpO1xuXHRcdH0pO1xuXHR9XG4gICAgfTtcblxuICAgIC8vIEFQSVxuICAgIGFwaWpzIChmZWF0dXJlKVxuXHQuZ2V0c2V0IChleHBvcnRzKVxuXHQubWV0aG9kICh7XG5cdCAgICByZXNldCAgOiByZXNldCxcblx0ICAgIHBsb3QgICA6IHBsb3QsXG5cdCAgICB1cGRhdGUgOiB1cGRhdGUsXG5cdCAgICBtb3ZlICAgOiBtb3ZlLFxuXHQgICAgaW5pdCAgIDogaW5pdCxcblx0ICAgIG1vdmVfdG9fZnJvbnQgOiBtb3ZlX3RvX2Zyb250XG5cdH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5jb21wb3NpdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRpc3BsYXlzID0ge307XG4gICAgdmFyIGRpc3BsYXlfb3JkZXIgPSBbXTtcblxuICAgIHZhciBmZWF0dXJlcyA9IHt9O1xuXG4gICAgdmFyIHJlc2V0ID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRmb3IgKHZhciBpPTA7IGk8ZGlzcGxheXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGRpc3BsYXlzW2ldLnJlc2V0LmNhbGwodHJhY2spO1xuXHR9XG4gICAgfTtcblxuICAgIHZhciBpbml0ID0gZnVuY3Rpb24gKHdpZHRoKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG4gXHRmb3IgKHZhciBkaXNwbGF5IGluIGRpc3BsYXlzKSB7XG5cdCAgICBpZiAoZGlzcGxheXMuaGFzT3duUHJvcGVydHkoZGlzcGxheSkpIHtcblx0XHRkaXNwbGF5c1tkaXNwbGF5XS5pbml0LmNhbGwodHJhY2ssIHdpZHRoKTtcblx0ICAgIH1cblx0fVxuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRmb3IgKHZhciBpPTA7IGk8ZGlzcGxheV9vcmRlci5sZW5ndGg7IGkrKykge1xuXHQgICAgZGlzcGxheXNbZGlzcGxheV9vcmRlcltpXV0udXBkYXRlLmNhbGwodHJhY2ssIHhTY2FsZSwgZGlzcGxheV9vcmRlcltpXSk7XG5cdCAgICBkaXNwbGF5c1tkaXNwbGF5X29yZGVyW2ldXS5tb3ZlX3RvX2Zyb250LmNhbGwodHJhY2ssIGRpc3BsYXlfb3JkZXJbaV0pO1xuXHR9XG5cdC8vIGZvciAodmFyIGRpc3BsYXkgaW4gZGlzcGxheXMpIHtcblx0Ly8gICAgIGlmIChkaXNwbGF5cy5oYXNPd25Qcm9wZXJ0eShkaXNwbGF5KSkge1xuXHQvLyBcdGRpc3BsYXlzW2Rpc3BsYXldLnVwZGF0ZS5jYWxsKHRyYWNrLCB4U2NhbGUsIGRpc3BsYXkpO1xuXHQvLyAgICAgfVxuXHQvLyB9XG4gICAgfTtcblxuICAgIHZhciBtb3ZlID0gZnVuY3Rpb24gKHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRmb3IgKHZhciBkaXNwbGF5IGluIGRpc3BsYXlzKSB7XG5cdCAgICBpZiAoZGlzcGxheXMuaGFzT3duUHJvcGVydHkoZGlzcGxheSkpIHtcblx0XHRkaXNwbGF5c1tkaXNwbGF5XS5tb3ZlLmNhbGwodHJhY2ssIHhTY2FsZSwgZGlzcGxheSk7XG5cdCAgICB9XG5cdH1cbiAgICB9O1xuXG4gICAgdmFyIGFkZCA9IGZ1bmN0aW9uIChrZXksIGRpc3BsYXkpIHtcblx0ZGlzcGxheXNba2V5XSA9IGRpc3BsYXk7XG5cdGRpc3BsYXlfb3JkZXIucHVzaChrZXkpO1xuXHRyZXR1cm4gZmVhdHVyZXM7XG4gICAgfTtcblxuICAgIHZhciBvbl9jbGljayA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGZvciAodmFyIGRpc3BsYXkgaW4gZGlzcGxheXMpIHtcblx0ICAgIGlmIChkaXNwbGF5cy5oYXNPd25Qcm9wZXJ0eShkaXNwbGF5KSkge1xuXHRcdGRpc3BsYXlzW2Rpc3BsYXldLm9uX2NsaWNrKGNiYWspO1xuXHQgICAgfVxuXHR9XG5cdHJldHVybiBmZWF0dXJlcztcbiAgICB9O1xuXG4gICAgdmFyIGdldF9kaXNwbGF5cyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGRzID0gW107XG5cdGZvciAodmFyIGk9MDsgaTxkaXNwbGF5X29yZGVyLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBkcy5wdXNoKGRpc3BsYXlzW2Rpc3BsYXlfb3JkZXJbaV1dKTtcblx0fVxuXHRyZXR1cm4gZHM7XG4gICAgfTtcbiAgICBcbiAgICAvLyBBUElcbiAgICBhcGlqcyAoZmVhdHVyZXMpXG5cdC5tZXRob2QgKHtcblx0ICAgIHJlc2V0ICA6IHJlc2V0LFxuXHQgICAgdXBkYXRlIDogdXBkYXRlLFxuXHQgICAgbW92ZSAgIDogbW92ZSxcblx0ICAgIGluaXQgICA6IGluaXQsXG5cdCAgICBhZGQgICAgOiBhZGQsXG5cdCAgICBvbl9jbGljayA6IG9uX2NsaWNrLFxuXHQgICAgZGlzcGxheXMgOiBnZXRfZGlzcGxheXNcblx0fSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZXM7XG59O1xuXG50bnRfZmVhdHVyZS5hcmVhID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBmZWF0dXJlID0gdG50X2ZlYXR1cmUubGluZSgpO1xuICAgIHZhciBsaW5lID0gdG50X2ZlYXR1cmUubGluZSgpO1xuXG4gICAgdmFyIGFyZWEgPSBkMy5zdmcuYXJlYSgpXG5cdC5pbnRlcnBvbGF0ZShsaW5lLmludGVycG9sYXRlKCkpXG5cdC50ZW5zaW9uKGZlYXR1cmUudGVuc2lvbigpKTtcblxuICAgIHZhciBkYXRhX3BvaW50cztcblxuICAgIHZhciBsaW5lX2NyZWF0ZSA9IGZlYXR1cmUuY3JlYXRlKCk7IC8vIFdlICdzYXZlJyBsaW5lIGNyZWF0aW9uXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChwb2ludHMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG5cdGlmIChkYXRhX3BvaW50cyAhPT0gdW5kZWZpbmVkKSB7XG4vL1x0ICAgICByZXR1cm47XG5cdCAgICB0cmFjay5nLnNlbGVjdChcInBhdGhcIikucmVtb3ZlKCk7XG5cdH1cblxuXHRsaW5lX2NyZWF0ZS5jYWxsKHRyYWNrLCBwb2ludHMsIHhTY2FsZSk7XG5cblx0YXJlYVxuXHQgICAgLngobGluZS54KCkpXG5cdCAgICAueTEobGluZS55KCkpXG5cdCAgICAueTAodHJhY2suaGVpZ2h0KCkpO1xuXG5cdGRhdGFfcG9pbnRzID0gcG9pbnRzLmRhdGEoKTtcblx0cG9pbnRzLnJlbW92ZSgpO1xuXG5cdHRyYWNrLmdcblx0ICAgIC5hcHBlbmQoXCJwYXRoXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2FyZWFcIilcblx0ICAgIC5jbGFzc2VkKFwidG50X2VsZW1cIiwgdHJ1ZSlcblx0ICAgIC5kYXR1bShkYXRhX3BvaW50cylcblx0ICAgIC5hdHRyKFwiZFwiLCBhcmVhKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGQzLnJnYihmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSkuYnJpZ2h0ZXIoKSk7XG5cdFxuICAgIH0pO1xuXG4gICAgdmFyIGxpbmVfbW92ZXIgPSBmZWF0dXJlLm1vdmVyKCk7XG4gICAgZmVhdHVyZS5tb3ZlciAoZnVuY3Rpb24gKHBhdGgsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRsaW5lX21vdmVyLmNhbGwodHJhY2ssIHBhdGgsIHhTY2FsZSk7XG5cblx0YXJlYS54KGxpbmUueCgpKTtcblx0dHJhY2suZ1xuXHQgICAgLnNlbGVjdChcIi50bnRfYXJlYVwiKVxuXHQgICAgLmRhdHVtKGRhdGFfcG9pbnRzKVxuXHQgICAgLmF0dHIoXCJkXCIsIGFyZWEpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG5cbn07XG5cbnRudF9mZWF0dXJlLmxpbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgdmFyIHggPSBmdW5jdGlvbiAoZCkge1xuXHRyZXR1cm4gZC5wb3M7XG4gICAgfTtcbiAgICB2YXIgeSA9IGZ1bmN0aW9uIChkKSB7XG5cdHJldHVybiBkLnZhbDtcbiAgICB9O1xuICAgIHZhciB0ZW5zaW9uID0gMC43O1xuICAgIHZhciB5U2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKTtcbiAgICB2YXIgbGluZSA9IGQzLnN2Zy5saW5lKClcblx0LmludGVycG9sYXRlKFwiYmFzaXNcIik7XG5cbiAgICAvLyBsaW5lIGdldHRlci4gVE9ETzogU2V0dGVyP1xuICAgIGZlYXR1cmUubGluZSA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIGxpbmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUueCA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHg7XG5cdH1cblx0eCA9IGNiYWs7XG5cdHJldHVybiBmZWF0dXJlO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLnkgPSBmdW5jdGlvbiAoY2Jhaykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB5O1xuXHR9XG5cdHkgPSBjYmFrO1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS50ZW5zaW9uID0gZnVuY3Rpb24gKHQpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gdGVuc2lvbjtcblx0fVxuXHR0ZW5zaW9uID0gdDtcblx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIHZhciBkYXRhX3BvaW50cztcblxuICAgIC8vIEZvciBub3csIGNyZWF0ZSBpcyBhIG9uZS1vZmYgZXZlbnRcbiAgICAvLyBUT0RPOiBNYWtlIGl0IHdvcmsgd2l0aCBwYXJ0aWFsIHBhdGhzLCBpZS4gY3JlYXRpbmcgYW5kIGRpc3BsYXlpbmcgb25seSB0aGUgcGF0aCB0aGF0IGlzIGJlaW5nIGRpc3BsYXllZFxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAocG9pbnRzLCB4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblxuXHRpZiAoZGF0YV9wb2ludHMgIT09IHVuZGVmaW5lZCkge1xuXHQgICAgLy8gcmV0dXJuO1xuXHQgICAgdHJhY2suZy5zZWxlY3QoXCJwYXRoXCIpLnJlbW92ZSgpO1xuXHR9XG5cblx0bGluZVxuXHQgICAgLnRlbnNpb24odGVuc2lvbilcblx0ICAgIC54KGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZSh4KGQpKTtcblx0ICAgIH0pXG5cdCAgICAueShmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiB0cmFjay5oZWlnaHQoKSAtIHlTY2FsZSh5KGQpKTtcblx0ICAgIH0pXG5cblx0ZGF0YV9wb2ludHMgPSBwb2ludHMuZGF0YSgpO1xuXHRwb2ludHMucmVtb3ZlKCk7XG5cblx0eVNjYWxlXG5cdCAgICAuZG9tYWluKFswLCAxXSlcblx0ICAgIC8vIC5kb21haW4oWzAsIGQzLm1heChkYXRhX3BvaW50cywgZnVuY3Rpb24gKGQpIHtcblx0ICAgIC8vIFx0cmV0dXJuIHkoZCk7XG5cdCAgICAvLyB9KV0pXG5cdCAgICAucmFuZ2UoWzAsIHRyYWNrLmhlaWdodCgpIC0gMl0pO1xuXHRcblx0dHJhY2suZ1xuXHQgICAgLmFwcGVuZChcInBhdGhcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZWxlbVwiKVxuXHQgICAgLmF0dHIoXCJkXCIsIGxpbmUoZGF0YV9wb2ludHMpKVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlXCIsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIDQpXG5cdCAgICAuc3R5bGUoXCJmaWxsXCIsIFwibm9uZVwiKTtcblxuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlciAoZnVuY3Rpb24gKHBhdGgsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG5cdGxpbmUueChmdW5jdGlvbiAoZCkge1xuXHQgICAgcmV0dXJuIHhTY2FsZSh4KGQpKVxuXHR9KTtcblx0dHJhY2suZy5zZWxlY3QoXCJwYXRoXCIpXG5cdCAgICAuYXR0cihcImRcIiwgbGluZShkYXRhX3BvaW50cykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5jb25zZXJ2YXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gJ0luaGVyaXQnIGZyb20gZmVhdHVyZS5hcmVhXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZS5hcmVhKCk7XG5cbiAgICB2YXIgYXJlYV9jcmVhdGUgPSBmZWF0dXJlLmNyZWF0ZSgpOyAvLyBXZSAnc2F2ZScgYXJlYSBjcmVhdGlvblxuICAgIGZlYXR1cmUuY3JlYXRlICAoZnVuY3Rpb24gKHBvaW50cywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0YXJlYV9jcmVhdGUuY2FsbCh0cmFjaywgZDMuc2VsZWN0KHBvaW50c1swXVswXSksIHhTY2FsZSlcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudG50X2ZlYXR1cmUuZW5zZW1ibCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBib2FyZC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgdmFyIGZvcmVncm91bmRfY29sb3IyID0gXCIjN0ZGRjAwXCI7XG4gICAgdmFyIGZvcmVncm91bmRfY29sb3IzID0gXCIjMDBCQjAwXCI7XG5cbiAgICBmZWF0dXJlLmd1aWRlciAoZnVuY3Rpb24gKHdpZHRoKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdHZhciBoZWlnaHRfb2Zmc2V0ID0gfn4odHJhY2suaGVpZ2h0KCkgLSAodHJhY2suaGVpZ2h0KCkgICogMC44KSkgLyAyO1xuXG5cdHRyYWNrLmdcblx0ICAgIC5hcHBlbmQoXCJsaW5lXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2d1aWRlclwiKVxuXHQgICAgLmF0dHIoXCJ4MVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ4MlwiLCB3aWR0aClcblx0ICAgIC5hdHRyKFwieTFcIiwgaGVpZ2h0X29mZnNldClcblx0ICAgIC5hdHRyKFwieTJcIiwgaGVpZ2h0X29mZnNldClcblx0ICAgIC5zdHlsZShcInN0cm9rZVwiLCBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSlcblx0ICAgIC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCAxKTtcblxuXHR0cmFjay5nXG5cdCAgICAuYXBwZW5kKFwibGluZVwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9ndWlkZXJcIilcblx0ICAgIC5hdHRyKFwieDFcIiwgMClcblx0ICAgIC5hdHRyKFwieDJcIiwgd2lkdGgpXG5cdCAgICAuYXR0cihcInkxXCIsIHRyYWNrLmhlaWdodCgpIC0gaGVpZ2h0X29mZnNldClcblx0ICAgIC5hdHRyKFwieTJcIiwgdHJhY2suaGVpZ2h0KCkgLSBoZWlnaHRfb2Zmc2V0KVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlXCIsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIDEpO1xuXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKG5ld19lbGVtcywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0dmFyIGhlaWdodF9vZmZzZXQgPSB+fih0cmFjay5oZWlnaHQoKSAtICh0cmFjay5oZWlnaHQoKSAgKiAwLjgpKSAvIDI7XG5cblx0bmV3X2VsZW1zXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZSAoZC5zdGFydCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ5XCIsIGhlaWdodF9vZmZzZXQpXG4vLyBcdCAgICAuYXR0cihcInJ4XCIsIDMpXG4vLyBcdCAgICAuYXR0cihcInJ5XCIsIDMpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSAtIH5+KGhlaWdodF9vZmZzZXQgKiAyKSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7IFxuXHRcdGlmIChkLnR5cGUgPT09ICdoaWdoJykge1xuXHRcdCAgICByZXR1cm4gZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKTtcblx0XHR9XG5cdFx0aWYgKGQudHlwZSA9PT0gJ2xvdycpIHtcblx0XHQgICAgcmV0dXJuIGQzLnJnYihmZWF0dXJlLmZvcmVncm91bmRfY29sb3IyKCkpO1xuXHRcdH1cblx0XHRyZXR1cm4gZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcjMoKSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUudXBkYXRlciAoZnVuY3Rpb24gKGJsb2NrcywgeFNjYWxlKSB7XG5cdGJsb2Nrc1xuXHQgICAgLnNlbGVjdChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpXG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uIChibG9ja3MsIHhTY2FsZSkge1xuXHRibG9ja3Ncblx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IyID0gZnVuY3Rpb24gKGNvbCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBmb3JlZ3JvdW5kX2NvbG9yMjtcblx0fVxuXHRmb3JlZ3JvdW5kX2NvbG9yMiA9IGNvbDtcblx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcjMgPSBmdW5jdGlvbiAoY29sKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGZvcmVncm91bmRfY29sb3IzO1xuXHR9XG5cdGZvcmVncm91bmRfY29sb3IzID0gY29sO1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS52bGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBmZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRuZXdfZWxlbXNcblx0ICAgIC5hcHBlbmQgKFwibGluZVwiKVxuXHQgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdC8vIFRPRE86IFNob3VsZCB1c2UgdGhlIGluZGV4IHZhbHVlP1xuXHRcdHJldHVybiB4U2NhbGUoZmVhdHVyZS5pbmRleCgpKGQpKVxuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSlcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInkxXCIsIDApXG5cdCAgICAuYXR0cihcInkyXCIsIHRyYWNrLmhlaWdodCgpKVxuXHQgICAgLmF0dHIoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAxKTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uICh2bGluZXMsIHhTY2FsZSkge1xuXHR2bGluZXNcblx0ICAgIC5zZWxlY3QoXCJsaW5lXCIpXG5cdCAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShmZWF0dXJlLmluZGV4KCkoZCkpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xuXG59O1xuXG50bnRfZmVhdHVyZS5waW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gJ0luaGVyaXQnIGZyb20gYm9hcmQudHJhY2suZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0gdG50X2ZlYXR1cmUoKTtcblxuICAgIHZhciB5U2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuXHQuZG9tYWluKFswLDBdKVxuXHQucmFuZ2UoWzAsMF0pO1xuXG4gICAgdmFyIG9wdHMgPSB7XG5cdHBvcyA6IGQzLmZ1bmN0b3IoXCJwb3NcIiksXG5cdHZhbCA6IGQzLmZ1bmN0b3IoXCJ2YWxcIiksXG5cdGRvbWFpbiA6IFswLDBdXG4gICAgfTtcbiAgICBcbiAgICBhcGlqcyhmZWF0dXJlKVxuXHQuZ2V0c2V0KG9wdHMpO1xuXG4gICAgXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfcGlucywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdHlTY2FsZVxuXHQgICAgLmRvbWFpbihmZWF0dXJlLmRvbWFpbigpKVxuXHQgICAgLnJhbmdlKFswLCB0cmFjay5oZWlnaHQoKV0pO1xuXHRcblx0Ly8gcGlucyBhcmUgY29tcG9zZWQgb2YgbGluZXMgYW5kIGNpcmNsZXNcblx0bmV3X3BpbnNcblx0ICAgIC5hcHBlbmQoXCJsaW5lXCIpXG5cdCAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uIChkLCBpKSB7XG5cdCAgICBcdHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pXG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ5MVwiLCBmdW5jdGlvbiAoZCkge1xuXHQgICAgXHRyZXR1cm4gdHJhY2suaGVpZ2h0KCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbiAoZCxpKSB7XG5cdCAgICBcdHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieTJcIiwgZnVuY3Rpb24gKGQsIGkpIHtcblx0ICAgIFx0cmV0dXJuIHRyYWNrLmhlaWdodCgpIC0geVNjYWxlKGRbb3B0cy52YWwoZCwgaSldKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInN0cm9rZVwiLCBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSk7XG5cblx0bmV3X3BpbnNcblx0ICAgIC5hcHBlbmQoXCJjaXJjbGVcIilcblx0ICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24gKGQsIGkpIHtcblx0XHRyZXR1cm4geFNjYWxlKGRbb3B0cy5wb3MoZCwgaSldKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImN5XCIsIGZ1bmN0aW9uIChkLCBpKSB7XG5cdFx0cmV0dXJuIHRyYWNrLmhlaWdodCgpIC0geVNjYWxlKGRbb3B0cy52YWwoZCwgaSldKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInJcIiwgNSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmVyKGZ1bmN0aW9uIChwaW5zLCB4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0cGluc1xuXHQgICAgLy8uZWFjaChwb3NpdGlvbl9waW5fbGluZSlcblx0ICAgIC5zZWxlY3QoXCJsaW5lXCIpXG5cdCAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uIChkLCBpKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShkW29wdHMucG9zKGQsIGkpXSlcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInkxXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHRyYWNrLmhlaWdodCgpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQsaSkge1xuXHRcdHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieTJcIiwgZnVuY3Rpb24gKGQsIGkpIHtcblx0XHRyZXR1cm4gdHJhY2suaGVpZ2h0KCkgLSB5U2NhbGUoZFtvcHRzLnZhbChkLCBpKV0pO1xuXHQgICAgfSk7XG5cblx0cGluc1xuXHQgICAgLnNlbGVjdChcImNpcmNsZVwiKVxuXHQgICAgLmF0dHIoXCJjeFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuXHRcdHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwiY3lcIiwgZnVuY3Rpb24gKGQsIGkpIHtcblx0XHRyZXR1cm4gdHJhY2suaGVpZ2h0KCkgLSB5U2NhbGUoZFtvcHRzLnZhbChkLCBpKV0pO1xuXHQgICAgfSk7XG5cbiAgICB9KTtcblxuICAgIGZlYXR1cmUuZ3VpZGVyIChmdW5jdGlvbiAod2lkdGgpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dHJhY2suZ1xuXHQgICAgLmFwcGVuZChcImxpbmVcIilcblx0ICAgIC5hdHRyKFwieDFcIiwgMClcblx0ICAgIC5hdHRyKFwieDJcIiwgd2lkdGgpXG5cdCAgICAuYXR0cihcInkxXCIsIHRyYWNrLmhlaWdodCgpKVxuXHQgICAgLmF0dHIoXCJ5MlwiLCB0cmFjay5oZWlnaHQoKSlcblx0ICAgIC5zdHlsZShcInN0cm9rZVwiLCBcImJsYWNrXCIpXG5cdCAgICAuc3R5bGUoXCJzdHJva2Utd2l0aFwiLCBcIjFweFwiKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudG50X2ZlYXR1cmUuYmxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gJ0luaGVyaXQnIGZyb20gYm9hcmQudHJhY2suZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0gdG50X2ZlYXR1cmUoKTtcbiAgICBcbiAgICBhcGlqcyhmZWF0dXJlKVxuXHQuZ2V0c2V0KCdmcm9tJywgZnVuY3Rpb24gKGQpIHtcblx0ICAgIHJldHVybiBkLnN0YXJ0O1xuXHR9KVxuXHQuZ2V0c2V0KCd0bycsIGZ1bmN0aW9uIChkKSB7XG5cdCAgICByZXR1cm4gZC5lbmQ7XG5cdH0pO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUoZnVuY3Rpb24gKG5ld19lbGVtcywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdG5ld19lbGVtc1xuXHQgICAgLmFwcGVuZChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuXHRcdC8vIFRPRE86IHN0YXJ0LCBlbmQgc2hvdWxkIGJlIGFkanVzdGFibGUgdmlhIHRoZSB0cmFja3MgQVBJXG5cdFx0cmV0dXJuIHhTY2FsZShmZWF0dXJlLmZyb20oKShkLCBpKSk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ5XCIsIDApXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkLCBpKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZmVhdHVyZS50bygpKGQsIGkpKSAtIHhTY2FsZShmZWF0dXJlLmZyb20oKShkLCBpKSkpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRyYWNrLmhlaWdodCgpKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmJhY2tncm91bmRfY29sb3IoKSlcblx0ICAgIC50cmFuc2l0aW9uKClcblx0ICAgIC5kdXJhdGlvbig1MDApXG5cdCAgICAuYXR0cihcImZpbGxcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRpZiAoZC5jb2xvciA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0ICAgIHJldHVybiBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKTtcblx0XHR9IGVsc2Uge1xuXHRcdCAgICByZXR1cm4gZC5jb2xvcjtcblx0XHR9XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUudXBkYXRlcihmdW5jdGlvbiAoZWxlbXMsIHhTY2FsZSkge1xuXHRlbGVtc1xuXHQgICAgLnNlbGVjdChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmVyKGZ1bmN0aW9uIChibG9ja3MsIHhTY2FsZSkge1xuXHRibG9ja3Ncblx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcblxufTtcblxudG50X2ZlYXR1cmUuYXhpcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgeEF4aXM7XG4gICAgdmFyIG9yaWVudGF0aW9uID0gXCJ0b3BcIjtcblxuICAgIC8vIEF4aXMgZG9lc24ndCBpbmhlcml0IGZyb20gZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0ge307XG4gICAgZmVhdHVyZS5yZXNldCA9IGZ1bmN0aW9uICgpIHtcblx0eEF4aXMgPSB1bmRlZmluZWQ7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdHRyYWNrLmcuc2VsZWN0QWxsKFwicmVjdFwiKS5yZW1vdmUoKTtcblx0dHJhY2suZy5zZWxlY3RBbGwoXCIudGlja1wiKS5yZW1vdmUoKTtcbiAgICB9O1xuICAgIGZlYXR1cmUucGxvdCA9IGZ1bmN0aW9uICgpIHt9O1xuICAgIGZlYXR1cmUubW92ZSA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIHN2Z19nID0gdHJhY2suZztcblx0c3ZnX2cuY2FsbCh4QXhpcyk7XG4gICAgfVxuICAgIFxuICAgIGZlYXR1cmUuaW5pdCA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgZmVhdHVyZS51cGRhdGUgPSBmdW5jdGlvbiAoeFNjYWxlKSB7XG5cdC8vIENyZWF0ZSBBeGlzIGlmIGl0IGRvZXNuJ3QgZXhpc3Rcblx0aWYgKHhBeGlzID09PSB1bmRlZmluZWQpIHtcblx0ICAgIHhBeGlzID0gZDMuc3ZnLmF4aXMoKVxuXHRcdC5zY2FsZSh4U2NhbGUpXG5cdFx0Lm9yaWVudChvcmllbnRhdGlvbik7XG5cdH1cblxuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHR2YXIgc3ZnX2cgPSB0cmFjay5nO1xuXHRzdmdfZy5jYWxsKHhBeGlzKTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS5vcmllbnRhdGlvbiA9IGZ1bmN0aW9uIChwb3MpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gb3JpZW50YXRpb247XG5cdH1cblx0b3JpZW50YXRpb24gPSBwb3M7XG5cdHJldHVybiBmZWF0dXJlO1xuICAgIH07XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLmxvY2F0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByb3c7XG5cbiAgICB2YXIgZmVhdHVyZSA9IHt9O1xuICAgIGZlYXR1cmUucmVzZXQgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICBmZWF0dXJlLnBsb3QgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICBmZWF0dXJlLmluaXQgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICBmZWF0dXJlLm1vdmUgPSBmdW5jdGlvbih4U2NhbGUpIHtcblx0dmFyIGRvbWFpbiA9IHhTY2FsZS5kb21haW4oKTtcblx0cm93LnNlbGVjdChcInRleHRcIilcblx0ICAgIC50ZXh0KFwiTG9jYXRpb246IFwiICsgfn5kb21haW5bMF0gKyBcIi1cIiArIH5+ZG9tYWluWzFdKTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS51cGRhdGUgPSBmdW5jdGlvbiAoeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdHZhciBzdmdfZyA9IHRyYWNrLmc7XG5cdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG5cdGlmIChyb3cgPT09IHVuZGVmaW5lZCkge1xuXHQgICAgcm93ID0gc3ZnX2c7XG5cdCAgICByb3dcblx0XHQuYXBwZW5kKFwidGV4dFwiKVxuXHRcdC50ZXh0KFwiTG9jYXRpb246IFwiICsgfn5kb21haW5bMF0gKyBcIi1cIiArIH5+ZG9tYWluWzFdKTtcblx0fVxuICAgIH07XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRudF9mZWF0dXJlO1xuIiwidmFyIGJvYXJkID0gcmVxdWlyZSAoXCIuL2JvYXJkLmpzXCIpO1xuYm9hcmQudHJhY2sgPSByZXF1aXJlIChcIi4vdHJhY2tcIik7XG5ib2FyZC50cmFjay5kYXRhID0gcmVxdWlyZSAoXCIuL2RhdGEuanNcIik7XG5ib2FyZC50cmFjay5sYXlvdXQgPSByZXF1aXJlIChcIi4vbGF5b3V0LmpzXCIpO1xuYm9hcmQudHJhY2suZmVhdHVyZSA9IHJlcXVpcmUgKFwiLi9mZWF0dXJlLmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBib2FyZDtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcblxuLy8gdmFyIGJvYXJkID0ge307XG4vLyBib2FyZC50cmFjayA9IHt9O1xubGF5b3V0ID0ge307XG5cbmxheW91dC5pZGVudGl0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyB2YXJzIGV4cG9zZWQgaW4gdGhlIEFQSTpcbiAgICB2YXIgZWxlbWVudHM7XG5cbiAgICAvLyBUaGUgcmV0dXJuZWQgY2xvc3VyZSAvIG9iamVjdFxuICAgIHZhciBsID0gZnVuY3Rpb24gKG5ld19lbGVtZW50cykge1xuXHRlbGVtZW50cyA9IG5ld19lbGVtZW50cztcbiAgICB9XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGwpXG5cdC5tZXRob2QgKHtcblx0ICAgIGhlaWdodCAgIDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBlbGVtZW50cyA6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gZWxlbWVudHM7XG5cdCAgICB9XG5cdH0pO1xuXG4gICAgcmV0dXJuIGw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBsYXlvdXQ7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG52YXIgaXRlcmF0b3IgPSByZXF1aXJlKFwidG50LnV0aWxzXCIpLml0ZXJhdG9yO1xuXG4vL3ZhciBib2FyZCA9IHt9O1xuXG52YXIgdHJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgcmVhZF9jb25mID0ge1xuXHQvLyBVbmlxdWUgSUQgZm9yIHRoaXMgdHJhY2tcblx0aWQgOiB0cmFjay5pZCgpXG4gICAgfTtcblxuICAgIHZhciBkaXNwbGF5O1xuXG4gICAgdmFyIGNvbmYgPSB7XG5cdC8vIGZvcmVncm91bmRfY29sb3IgOiBkMy5yZ2IoJyMwMDAwMDAnKSxcblx0YmFja2dyb3VuZF9jb2xvciA6IGQzLnJnYignI0NDQ0NDQycpLFxuXHRoZWlnaHQgICAgICAgICAgIDogMjUwLFxuXHQvLyBkYXRhIGlzIHRoZSBvYmplY3QgKG5vcm1hbGx5IGEgdG50LnRyYWNrLmRhdGEgb2JqZWN0KSB1c2VkIHRvIHJldHJpZXZlIGFuZCB1cGRhdGUgZGF0YSBmb3IgdGhlIHRyYWNrXG5cdGRhdGEgICAgICAgICAgICAgOiB0cmFjay5kYXRhLmVtcHR5KClcbiAgICB9O1xuXG4gICAgLy8gVGhlIHJldHVybmVkIG9iamVjdCAvIGNsb3N1cmVcbiAgICB2YXIgXyA9IGZ1bmN0aW9uKCkge1xuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICB2YXIgYXBpID0gYXBpanMgKF8pXG5cdC5nZXRzZXQgKGNvbmYpXG5cdC5nZXQgKHJlYWRfY29uZik7XG5cbiAgICAvLyBUT0RPOiBUaGlzIG1lYW5zIHRoYXQgaGVpZ2h0IHNob3VsZCBiZSBkZWZpbmVkIGJlZm9yZSBkaXNwbGF5XG4gICAgLy8gd2Ugc2hvdWxkbid0IHJlbHkgb24gdGhpc1xuICAgIF8uZGlzcGxheSA9IGZ1bmN0aW9uIChuZXdfcGxvdHRlcikge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBkaXNwbGF5O1xuXHR9XG5cdGRpc3BsYXkgPSBuZXdfcGxvdHRlcjtcblx0aWYgKHR5cGVvZiAoZGlzcGxheSkgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIGRpc3BsYXkubGF5b3V0ICYmIGRpc3BsYXkubGF5b3V0KCkuaGVpZ2h0KGNvbmYuaGVpZ2h0KTtcdCAgICBcblx0fSBlbHNlIHtcblx0ICAgIGZvciAodmFyIGtleSBpbiBkaXNwbGF5KSB7XG5cdFx0aWYgKGRpc3BsYXkuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdCAgICBkaXNwbGF5W2tleV0ubGF5b3V0ICYmIGRpc3BsYXlba2V5XS5sYXlvdXQoKS5oZWlnaHQoY29uZi5oZWlnaHQpO1xuXHRcdH1cblx0ICAgIH1cblx0fVxuXG5cdHJldHVybiBfO1xuICAgIH07XG5cbiAgICByZXR1cm4gXztcblxufTtcblxudHJhY2suaWQgPSBpdGVyYXRvcigxKTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdHJhY2s7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRudF9lbnNlbWJsID0gcmVxdWlyZShcIi4vc3JjL3Jlc3QuanNcIik7XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbi8qIVxuICogQG92ZXJ2aWV3IGVzNi1wcm9taXNlIC0gYSB0aW55IGltcGxlbWVudGF0aW9uIG9mIFByb21pc2VzL0ErLlxuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgKGMpIDIwMTQgWWVodWRhIEthdHosIFRvbSBEYWxlLCBTdGVmYW4gUGVubmVyIGFuZCBjb250cmlidXRvcnMgKENvbnZlcnNpb24gdG8gRVM2IEFQSSBieSBKYWtlIEFyY2hpYmFsZClcbiAqIEBsaWNlbnNlICAgTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqICAgICAgICAgICAgU2VlIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9qYWtlYXJjaGliYWxkL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIDIuMS4xXG4gKi9cblxuKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicgfHwgKHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNNYXliZVRoZW5hYmxlKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgeCAhPT0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHV0aWxzJCRfaXNBcnJheTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkpIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGliJGVzNiRwcm9taXNlJHV0aWxzJCRfaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG4gICAgfVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNBcnJheSA9IGxpYiRlczYkcHJvbWlzZSR1dGlscyQkX2lzQXJyYXk7XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRsZW4gPSAwO1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkdG9TdHJpbmcgPSB7fS50b1N0cmluZztcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJHZlcnR4TmV4dDtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWVbbGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbl0gPSBjYWxsYmFjaztcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRxdWV1ZVtsaWIkZXM2JHByb21pc2UkYXNhcCQkbGVuICsgMV0gPSBhcmc7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkbGVuICs9IDI7XG4gICAgICBpZiAobGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbiA9PT0gMikge1xuICAgICAgICAvLyBJZiBsZW4gaXMgMiwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgICAgIC8vIElmIGFkZGl0aW9uYWwgY2FsbGJhY2tzIGFyZSBxdWV1ZWQgYmVmb3JlIHRoZSBxdWV1ZSBpcyBmbHVzaGVkLCB0aGV5XG4gICAgICAgIC8vIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IHRoaXMgZmx1c2ggdGhhdCB3ZSBhcmUgc2NoZWR1bGluZy5cbiAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2goKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkYXNhcDtcblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkYnJvd3NlcldpbmRvdyA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgPyB3aW5kb3cgOiB1bmRlZmluZWQ7XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRicm93c2VyR2xvYmFsID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJGJyb3dzZXJXaW5kb3cgfHwge307XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRicm93c2VyR2xvYmFsLk11dGF0aW9uT2JzZXJ2ZXIgfHwgbGliJGVzNiRwcm9taXNlJGFzYXAkJGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJGlzTm9kZSA9IHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXSc7XG5cbiAgICAvLyB0ZXN0IGZvciB3ZWIgd29ya2VyIGJ1dCBub3QgaW4gSUUxMFxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2YgaW1wb3J0U2NyaXB0cyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gJ3VuZGVmaW5lZCc7XG5cbiAgICAvLyBub2RlXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZU5leHRUaWNrKCkge1xuICAgICAgdmFyIG5leHRUaWNrID0gcHJvY2Vzcy5uZXh0VGljaztcbiAgICAgIC8vIG5vZGUgdmVyc2lvbiAwLjEwLnggZGlzcGxheXMgYSBkZXByZWNhdGlvbiB3YXJuaW5nIHdoZW4gbmV4dFRpY2sgaXMgdXNlZCByZWN1cnNpdmVseVxuICAgICAgLy8gc2V0SW1tZWRpYXRlIHNob3VsZCBiZSB1c2VkIGluc3RlYWQgaW5zdGVhZFxuICAgICAgdmFyIHZlcnNpb24gPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUubWF0Y2goL14oPzooXFxkKylcXC4pPyg/OihcXGQrKVxcLik/KFxcKnxcXGQrKSQvKTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZlcnNpb24pICYmIHZlcnNpb25bMV0gPT09ICcwJyAmJiB2ZXJzaW9uWzJdID09PSAnMTAnKSB7XG4gICAgICAgIG5leHRUaWNrID0gc2V0SW1tZWRpYXRlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBuZXh0VGljayhsaWIkZXM2JHByb21pc2UkYXNhcCQkZmx1c2gpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyB2ZXJ0eFxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VWZXJ0eFRpbWVyKCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkdmVydHhOZXh0KGxpYiRlczYkcHJvbWlzZSRhc2FwJCRmbHVzaCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgdmFyIG9ic2VydmVyID0gbmV3IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlcihsaWIkZXM2JHByb21pc2UkYXNhcCQkZmx1c2gpO1xuICAgICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBub2RlLmRhdGEgPSAoaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDIpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyB3ZWIgd29ya2VyXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZU1lc3NhZ2VDaGFubmVsKCkge1xuICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJGZsdXNoO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZVNldFRpbWVvdXQoKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHNldFRpbWVvdXQobGliJGVzNiRwcm9taXNlJGFzYXAkJGZsdXNoLCAxKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRxdWV1ZSA9IG5ldyBBcnJheSgxMDAwKTtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkZmx1c2goKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRsZW47IGkrPTIpIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJHF1ZXVlW2ldO1xuICAgICAgICB2YXIgYXJnID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJHF1ZXVlW2krMV07XG5cbiAgICAgICAgY2FsbGJhY2soYXJnKTtcblxuICAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWVbaV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRxdWV1ZVtpKzFdID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkbGVuID0gMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkYXR0ZW1wdFZlcnRleCgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciByID0gcmVxdWlyZTtcbiAgICAgICAgdmFyIHZlcnR4ID0gcigndmVydHgnKTtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHZlcnR4TmV4dCA9IHZlcnR4LnJ1bk9uTG9vcCB8fCB2ZXJ0eC5ydW5PbkNvbnRleHQ7XG4gICAgICAgIHJldHVybiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlVmVydHhUaW1lcigpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlU2V0VGltZW91dCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkc2NoZWR1bGVGbHVzaDtcbiAgICAvLyBEZWNpZGUgd2hhdCBhc3luYyBtZXRob2QgdG8gdXNlIHRvIHRyaWdnZXJpbmcgcHJvY2Vzc2luZyBvZiBxdWV1ZWQgY2FsbGJhY2tzOlxuICAgIGlmIChsaWIkZXM2JHByb21pc2UkYXNhcCQkaXNOb2RlKSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkc2NoZWR1bGVGbHVzaCA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VOZXh0VGljaygpO1xuICAgIH0gZWxzZSBpZiAobGliJGVzNiRwcm9taXNlJGFzYXAkJEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkc2NoZWR1bGVGbHVzaCA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG4gICAgfSBlbHNlIGlmIChsaWIkZXM2JHByb21pc2UkYXNhcCQkaXNXb3JrZXIpIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZU1lc3NhZ2VDaGFubmVsKCk7XG4gICAgfSBlbHNlIGlmIChsaWIkZXM2JHByb21pc2UkYXNhcCQkYnJvd3NlcldpbmRvdyA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkc2NoZWR1bGVGbHVzaCA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRhdHRlbXB0VmVydGV4KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZVNldFRpbWVvdXQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRub29wKCkge31cblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HICAgPSB2b2lkIDA7XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEZVTEZJTExFRCA9IDE7XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFJFSkVDVEVEICA9IDI7XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IgPSBuZXcgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKTtcblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHNlbGZGdWxsZmlsbG1lbnQoKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVFcnJvcihcIllvdSBjYW5ub3QgcmVzb2x2ZSBhIHByb21pc2Ugd2l0aCBpdHNlbGZcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoJ0EgcHJvbWlzZXMgY2FsbGJhY2sgY2Fubm90IHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS4nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRnZXRUaGVuKHByb21pc2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBwcm9taXNlLnRoZW47XG4gICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SLmVycm9yID0gZXJyb3I7XG4gICAgICAgIHJldHVybiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCR0cnlUaGVuKHRoZW4sIHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoZW4uY2FsbCh2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRoYW5kbGVGb3JlaWduVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUsIHRoZW4pIHtcbiAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkZGVmYXVsdChmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgICAgIHZhciBzZWFsZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIGVycm9yID0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB0aGVuYWJsZSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBpZiAoc2VhbGVkKSB7IHJldHVybjsgfVxuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICAgICAgaWYgKHRoZW5hYmxlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuXG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0sICdTZXR0bGU6ICcgKyAocHJvbWlzZS5fbGFiZWwgfHwgJyB1bmtub3duIHByb21pc2UnKSk7XG5cbiAgICAgICAgaWYgKCFzZWFsZWQgJiYgZXJyb3IpIHtcbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH0sIHByb21pc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gICAgICBpZiAodGhlbmFibGUuX3N0YXRlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRGVUxGSUxMRUQpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSBpZiAodGhlbmFibGUuX3N0YXRlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRzdWJzY3JpYmUodGhlbmFibGUsIHVuZGVmaW5lZCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSkge1xuICAgICAgaWYgKG1heWJlVGhlbmFibGUuY29uc3RydWN0b3IgPT09IHByb21pc2UuY29uc3RydWN0b3IpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGhlbiA9IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGdldFRoZW4obWF5YmVUaGVuYWJsZSk7XG5cbiAgICAgICAgaWYgKHRoZW4gPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGVuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgICB9IGVsc2UgaWYgKGxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNGdW5jdGlvbih0aGVuKSkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRzZWxmRnVsbGZpbGxtZW50KCkpO1xuICAgICAgfSBlbHNlIGlmIChsaWIkZXM2JHByb21pc2UkdXRpbHMkJG9iamVjdE9yRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcHVibGlzaFJlamVjdGlvbihwcm9taXNlKSB7XG4gICAgICBpZiAocHJvbWlzZS5fb25lcnJvcikge1xuICAgICAgICBwcm9taXNlLl9vbmVycm9yKHByb21pc2UuX3Jlc3VsdCk7XG4gICAgICB9XG5cbiAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HKSB7IHJldHVybjsgfVxuXG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSB2YWx1ZTtcbiAgICAgIHByb21pc2UuX3N0YXRlID0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRkZWZhdWx0KGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHB1Ymxpc2gsIHByb21pc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUEVORElORykgeyByZXR1cm47IH1cbiAgICAgIHByb21pc2UuX3N0YXRlID0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQ7XG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSByZWFzb247XG5cbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRkZWZhdWx0KGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHB1Ymxpc2hSZWplY3Rpb24sIHByb21pc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgICAgIHZhciBsZW5ndGggPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICAgIHBhcmVudC5fb25lcnJvciA9IG51bGw7XG5cbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEZVTEZJTExFRF0gPSBvbkZ1bGZpbGxtZW50O1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURURdICA9IG9uUmVqZWN0aW9uO1xuXG4gICAgICBpZiAobGVuZ3RoID09PSAwICYmIHBhcmVudC5fc3RhdGUpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGRlZmF1bHQobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcHVibGlzaCwgcGFyZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRwdWJsaXNoKHByb21pc2UpIHtcbiAgICAgIHZhciBzdWJzY3JpYmVycyA9IHByb21pc2UuX3N1YnNjcmliZXJzO1xuICAgICAgdmFyIHNldHRsZWQgPSBwcm9taXNlLl9zdGF0ZTtcblxuICAgICAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm47IH1cblxuICAgICAgdmFyIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsID0gcHJvbWlzZS5fcmVzdWx0O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmliZXJzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIGNoaWxkID0gc3Vic2NyaWJlcnNbaV07XG4gICAgICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgICAgIGlmIChjaGlsZCkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKSB7XG4gICAgICB0aGlzLmVycm9yID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SID0gbmV3IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCR0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZGV0YWlsKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBlO1xuICAgICAgICByZXR1cm4gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgICAgIHZhciBoYXNDYWxsYmFjayA9IGxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNGdW5jdGlvbihjYWxsYmFjayksXG4gICAgICAgICAgdmFsdWUsIGVycm9yLCBzdWNjZWVkZWQsIGZhaWxlZDtcblxuICAgICAgaWYgKGhhc0NhbGxiYWNrKSB7XG4gICAgICAgIHZhbHVlID0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICAgICAgaWYgKHZhbHVlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IpIHtcbiAgICAgICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgICAgIGVycm9yID0gdmFsdWUuZXJyb3I7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIC8vIG5vb3BcbiAgICAgIH0gZWxzZSBpZiAoaGFzQ2FsbGJhY2sgJiYgc3VjY2VlZGVkKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChmYWlsZWQpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGluaXRpYWxpemVQcm9taXNlKHByb21pc2UsIHJlc29sdmVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlcihmdW5jdGlvbiByZXNvbHZlUHJvbWlzZSh2YWx1ZSl7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvcihDb25zdHJ1Y3RvciwgaW5wdXQpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgICAgZW51bWVyYXRvci5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgICAgZW51bWVyYXRvci5wcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3ApO1xuXG4gICAgICBpZiAoZW51bWVyYXRvci5fdmFsaWRhdGVJbnB1dChpbnB1dCkpIHtcbiAgICAgICAgZW51bWVyYXRvci5faW5wdXQgICAgID0gaW5wdXQ7XG4gICAgICAgIGVudW1lcmF0b3IubGVuZ3RoICAgICA9IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgZW51bWVyYXRvci5fcmVtYWluaW5nID0gaW5wdXQubGVuZ3RoO1xuXG4gICAgICAgIGVudW1lcmF0b3IuX2luaXQoKTtcblxuICAgICAgICBpZiAoZW51bWVyYXRvci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKGVudW1lcmF0b3IucHJvbWlzZSwgZW51bWVyYXRvci5fcmVzdWx0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbnVtZXJhdG9yLmxlbmd0aCA9IGVudW1lcmF0b3IubGVuZ3RoIHx8IDA7XG4gICAgICAgICAgZW51bWVyYXRvci5fZW51bWVyYXRlKCk7XG4gICAgICAgICAgaWYgKGVudW1lcmF0b3IuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChlbnVtZXJhdG9yLnByb21pc2UsIGVudW1lcmF0b3IuX3Jlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QoZW51bWVyYXRvci5wcm9taXNlLCBlbnVtZXJhdG9yLl92YWxpZGF0aW9uRXJyb3IoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl92YWxpZGF0ZUlucHV0ID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiBsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzQXJyYXkoaW5wdXQpO1xuICAgIH07XG5cbiAgICBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRpb25FcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcignQXJyYXkgTWV0aG9kcyBtdXN0IGJlIHByb3ZpZGVkIGFuIEFycmF5Jyk7XG4gICAgfTtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fcmVzdWx0ID0gbmV3IEFycmF5KHRoaXMubGVuZ3RoKTtcbiAgICB9O1xuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRkZWZhdWx0ID0gbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJEVudW1lcmF0b3I7XG5cbiAgICBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX2VudW1lcmF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGVudW1lcmF0b3IgPSB0aGlzO1xuXG4gICAgICB2YXIgbGVuZ3RoICA9IGVudW1lcmF0b3IubGVuZ3RoO1xuICAgICAgdmFyIHByb21pc2UgPSBlbnVtZXJhdG9yLnByb21pc2U7XG4gICAgICB2YXIgaW5wdXQgICA9IGVudW1lcmF0b3IuX2lucHV0O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcgJiYgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX2VhY2hFbnRyeShpbnB1dFtpXSwgaSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZWFjaEVudHJ5ID0gZnVuY3Rpb24oZW50cnksIGkpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcbiAgICAgIHZhciBjID0gZW51bWVyYXRvci5faW5zdGFuY2VDb25zdHJ1Y3RvcjtcblxuICAgICAgaWYgKGxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNNYXliZVRoZW5hYmxlKGVudHJ5KSkge1xuICAgICAgICBpZiAoZW50cnkuY29uc3RydWN0b3IgPT09IGMgJiYgZW50cnkuX3N0YXRlICE9PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgICAgZW50cnkuX29uZXJyb3IgPSBudWxsO1xuICAgICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdChlbnRyeS5fc3RhdGUsIGksIGVudHJ5Ll9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVudW1lcmF0b3IuX3dpbGxTZXR0bGVBdChjLnJlc29sdmUoZW50cnkpLCBpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW51bWVyYXRvci5fcmVtYWluaW5nLS07XG4gICAgICAgIGVudW1lcmF0b3IuX3Jlc3VsdFtpXSA9IGVudHJ5O1xuICAgICAgfVxuICAgIH07XG5cbiAgICBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3NldHRsZWRBdCA9IGZ1bmN0aW9uKHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgICAgdmFyIGVudW1lcmF0b3IgPSB0aGlzO1xuICAgICAgdmFyIHByb21pc2UgPSBlbnVtZXJhdG9yLnByb21pc2U7XG5cbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICBlbnVtZXJhdG9yLl9yZW1haW5pbmctLTtcblxuICAgICAgICBpZiAoc3RhdGUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbnVtZXJhdG9yLl9yZXN1bHRbaV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZW51bWVyYXRvci5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgZW51bWVyYXRvci5fcmVzdWx0KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl93aWxsU2V0dGxlQXQgPSBmdW5jdGlvbihwcm9taXNlLCBpKSB7XG4gICAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHN1YnNjcmliZShwcm9taXNlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdChsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRGVUxGSUxMRUQsIGksIHZhbHVlKTtcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICBlbnVtZXJhdG9yLl9zZXR0bGVkQXQobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQsIGksIHJlYXNvbik7XG4gICAgICB9KTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJGFsbCQkYWxsKGVudHJpZXMpIHtcbiAgICAgIHJldHVybiBuZXcgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJGRlZmF1bHQodGhpcywgZW50cmllcykucHJvbWlzZTtcbiAgICB9XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJGFsbCQkZGVmYXVsdCA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJGFsbCQkYWxsO1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJhY2UkJHJhY2UoZW50cmllcykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3ApO1xuXG4gICAgICBpZiAoIWxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNBcnJheShlbnRyaWVzKSkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9XG5cbiAgICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcblxuICAgICAgZnVuY3Rpb24gb25GdWxmaWxsbWVudCh2YWx1ZSkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gb25SZWplY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcgJiYgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHN1YnNjcmliZShDb25zdHJ1Y3Rvci5yZXNvbHZlKGVudHJpZXNbaV0pLCB1bmRlZmluZWQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyYWNlJCRkZWZhdWx0ID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmFjZSQkcmFjZTtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZXNvbHZlJCRyZXNvbHZlKG9iamVjdCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgICAgIGlmIChvYmplY3QgJiYgdHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcgJiYgb2JqZWN0LmNvbnN0cnVjdG9yID09PSBDb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgfVxuXG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcihsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRub29wKTtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgb2JqZWN0KTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVzb2x2ZSQkZGVmYXVsdCA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlc29sdmUkJHJlc29sdmU7XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVqZWN0JCRyZWplY3QocmVhc29uKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3ApO1xuICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlamVjdCQkZGVmYXVsdCA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlamVjdCQkcmVqZWN0O1xuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRjb3VudGVyID0gMDtcblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc1Jlc29sdmVyKCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc05ldygpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdQcm9taXNlJzogUGxlYXNlIHVzZSB0aGUgJ25ldycgb3BlcmF0b3IsIHRoaXMgb2JqZWN0IGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBjYWxsZWQgYXMgYSBmdW5jdGlvbi5cIik7XG4gICAgfVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0ID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2U7XG4gICAgLyoqXG4gICAgICBQcm9taXNlIG9iamVjdHMgcmVwcmVzZW50IHRoZSBldmVudHVhbCByZXN1bHQgb2YgYW4gYXN5bmNocm9ub3VzIG9wZXJhdGlvbi4gVGhlXG4gICAgICBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLCB3aGljaFxuICAgICAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2XigJlzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZSByZWFzb25cbiAgICAgIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBUZXJtaW5vbG9neVxuICAgICAgLS0tLS0tLS0tLS1cblxuICAgICAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgICAgIC0gYHRoZW5hYmxlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIGEgYHRoZW5gIG1ldGhvZC5cbiAgICAgIC0gYHZhbHVlYCBpcyBhbnkgbGVnYWwgSmF2YVNjcmlwdCB2YWx1ZSAoaW5jbHVkaW5nIHVuZGVmaW5lZCwgYSB0aGVuYWJsZSwgb3IgYSBwcm9taXNlKS5cbiAgICAgIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAgICAgLSBgcmVhc29uYCBpcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIHdoeSBhIHByb21pc2Ugd2FzIHJlamVjdGVkLlxuICAgICAgLSBgc2V0dGxlZGAgdGhlIGZpbmFsIHJlc3Rpbmcgc3RhdGUgb2YgYSBwcm9taXNlLCBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG5cbiAgICAgIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICAgICAgUHJvbWlzZXMgdGhhdCBhcmUgZnVsZmlsbGVkIGhhdmUgYSBmdWxmaWxsbWVudCB2YWx1ZSBhbmQgYXJlIGluIHRoZSBmdWxmaWxsZWRcbiAgICAgIHN0YXRlLiAgUHJvbWlzZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaGF2ZSBhIHJlamVjdGlvbiByZWFzb24gYW5kIGFyZSBpbiB0aGVcbiAgICAgIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gICAgICBQcm9taXNlcyBjYW4gYWxzbyBiZSBzYWlkIHRvICpyZXNvbHZlKiBhIHZhbHVlLiAgSWYgdGhpcyB2YWx1ZSBpcyBhbHNvIGFcbiAgICAgIHByb21pc2UsIHRoZW4gdGhlIG9yaWdpbmFsIHByb21pc2UncyBzZXR0bGVkIHN0YXRlIHdpbGwgbWF0Y2ggdGhlIHZhbHVlJ3NcbiAgICAgIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICAgICAgaXRzZWxmIHJlamVjdCwgYW5kIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgd2lsbFxuICAgICAgaXRzZWxmIGZ1bGZpbGwuXG5cblxuICAgICAgQmFzaWMgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgYGBganNcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIC8vIG9uIHN1Y2Nlc3NcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gb24gZmFpbHVyZVxuICAgICAgICByZWplY3QocmVhc29uKTtcbiAgICAgIH0pO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAvLyBvbiByZWplY3Rpb25cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIFVzYWdlOlxuICAgICAgLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFByb21pc2VzIHNoaW5lIHdoZW4gYWJzdHJhY3RpbmcgYXdheSBhc3luY2hyb25vdXMgaW50ZXJhY3Rpb25zIHN1Y2ggYXNcbiAgICAgIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdqc29uJztcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gaGFuZGxlcigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuRE9ORSkge1xuICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICAgICAgYGBganNcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgICAgIGdldEpTT04oJy9jb21tZW50cycpXG4gICAgICBdKS50aGVuKGZ1bmN0aW9uKHZhbHVlcyl7XG4gICAgICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICAgICAgdmFsdWVzWzFdIC8vID0+IGNvbW1lbnRzSlNPTlxuXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAY2xhc3MgUHJvbWlzZVxuICAgICAgQHBhcmFtIHtmdW5jdGlvbn0gcmVzb2x2ZXJcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEBjb25zdHJ1Y3RvclxuICAgICovXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICAgIHRoaXMuX2lkID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJGNvdW50ZXIrKztcbiAgICAgIHRoaXMuX3N0YXRlID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fcmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgICAgaWYgKGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3AgIT09IHJlc29sdmVyKSB7XG4gICAgICAgIGlmICghbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0Z1bmN0aW9uKHJlc29sdmVyKSkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc1Jlc29sdmVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UpKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCk7XG4gICAgICAgIH1cblxuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRpbml0aWFsaXplUHJvbWlzZSh0aGlzLCByZXNvbHZlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UuYWxsID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkYWxsJCRkZWZhdWx0O1xuICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJhY2UgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyYWNlJCRkZWZhdWx0O1xuICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlc29sdmUgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0O1xuICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlamVjdCA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlamVjdCQkZGVmYXVsdDtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnByb3RvdHlwZSA9IHtcbiAgICAgIGNvbnN0cnVjdG9yOiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSxcblxuICAgIC8qKlxuICAgICAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gICAgICB3aGljaCByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZVxuICAgICAgcmVhc29uIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gdXNlciBpcyB1bmF2YWlsYWJsZSwgYW5kIHlvdSBhcmUgZ2l2ZW4gdGhlIHJlYXNvbiB3aHlcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIENoYWluaW5nXG4gICAgICAtLS0tLS0tLVxuXG4gICAgICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICAgICAgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZpcnN0IHByb21pc2UncyBmdWxmaWxsbWVudFxuICAgICAgb3IgcmVqZWN0aW9uIGhhbmRsZXIsIG9yIHJlamVjdGVkIGlmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgcmV0dXJuICdkZWZhdWx0IG5hbWUnO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGB1c2VyTmFtZWAgd2lsbCBiZSB0aGUgdXNlcidzIG5hbWUsIG90aGVyd2lzZSBpdFxuICAgICAgICAvLyB3aWxsIGJlIGAnZGVmYXVsdCBuYW1lJ2BcbiAgICAgIH0pO1xuXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCByZWplY3RlZCwgYHJlYXNvbmAgd2lsbCBiZSAnYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScuXG4gICAgICB9KTtcbiAgICAgIGBgYFxuICAgICAgSWYgdGhlIGRvd25zdHJlYW0gcHJvbWlzZSBkb2VzIG5vdCBzcGVjaWZ5IGEgcmVqZWN0aW9uIGhhbmRsZXIsIHJlamVjdGlvbiByZWFzb25zIHdpbGwgYmUgcHJvcGFnYXRlZCBmdXJ0aGVyIGRvd25zdHJlYW0uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBlZGFnb2dpY2FsRXhjZXB0aW9uKCdVcHN0cmVhbSBlcnJvcicpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBUaGUgYFBlZGdhZ29jaWFsRXhjZXB0aW9uYCBpcyBwcm9wYWdhdGVkIGFsbCB0aGUgd2F5IGRvd24gdG8gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQXNzaW1pbGF0aW9uXG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgICAgIHJldHJpZXZlZCBhc3luY2hyb25vdXNseS4gVGhpcyBjYW4gYmUgYWNoaWV2ZWQgYnkgcmV0dXJuaW5nIGEgcHJvbWlzZSBpbiB0aGVcbiAgICAgIGZ1bGZpbGxtZW50IG9yIHJlamVjdGlvbiBoYW5kbGVyLiBUaGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgdGhlbiBiZSBwZW5kaW5nXG4gICAgICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBJZiB0aGUgYXNzaW1saWF0ZWQgcHJvbWlzZSByZWplY3RzLCB0aGVuIHRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCBhbHNvIHJlamVjdC5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIGZ1bGZpbGxzLCB3ZSdsbCBoYXZlIHRoZSB2YWx1ZSBoZXJlXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFNpbXBsZSBFeGFtcGxlXG4gICAgICAtLS0tLS0tLS0tLS0tLVxuXG4gICAgICBTeW5jaHJvbm91cyBFeGFtcGxlXG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGZpbmRSZXN1bHQoKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFJlc3VsdChmdW5jdGlvbihyZXN1bHQsIGVycil7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRSZXN1bHQoKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIGF1dGhvciwgYm9va3M7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICAgICAgYm9va3MgID0gZmluZEJvb2tzQnlBdXRob3IoYXV0aG9yKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuXG4gICAgICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG5cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmFpbHVyZShyZWFzb24pIHtcblxuICAgICAgfVxuXG4gICAgICBmaW5kQXV0aG9yKGZ1bmN0aW9uKGF1dGhvciwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZpbmRCb29va3NCeUF1dGhvcihhdXRob3IsIGZ1bmN0aW9uKGJvb2tzLCBlcnIpIHtcbiAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgZm91bmRCb29rcyhib29rcyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRBdXRob3IoKS5cbiAgICAgICAgdGhlbihmaW5kQm9va3NCeUF1dGhvcikuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYm9va3Mpe1xuICAgICAgICAgIC8vIGZvdW5kIGJvb2tzXG4gICAgICB9KS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCB0aGVuXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvbkZ1bGZpbGxlZFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3RlZFxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgdGhlbjogZnVuY3Rpb24ob25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBzdGF0ZSA9IHBhcmVudC5fc3RhdGU7XG5cbiAgICAgICAgaWYgKHN0YXRlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRGVUxGSUxMRUQgJiYgIW9uRnVsZmlsbG1lbnQgfHwgc3RhdGUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFJFSkVDVEVEICYmICFvblJlamVjdGlvbikge1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNoaWxkID0gbmV3IHRoaXMuY29uc3RydWN0b3IobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbm9vcCk7XG4gICAgICAgIHZhciByZXN1bHQgPSBwYXJlbnQuX3Jlc3VsdDtcblxuICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbc3RhdGUgLSAxXTtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkZGVmYXVsdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc3RhdGUsIGNoaWxkLCBjYWxsYmFjaywgcmVzdWx0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSxcblxuICAgIC8qKlxuICAgICAgYGNhdGNoYCBpcyBzaW1wbHkgc3VnYXIgZm9yIGB0aGVuKHVuZGVmaW5lZCwgb25SZWplY3Rpb24pYCB3aGljaCBtYWtlcyBpdCB0aGUgc2FtZVxuICAgICAgYXMgdGhlIGNhdGNoIGJsb2NrIG9mIGEgdHJ5L2NhdGNoIHN0YXRlbWVudC5cblxuICAgICAgYGBganNcbiAgICAgIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIHN5bmNocm9ub3VzXG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQXV0aG9yKCk7XG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfVxuXG4gICAgICAvLyBhc3luYyB3aXRoIHByb21pc2VzXG4gICAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgY2F0Y2hcbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0aW9uXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAgICovXG4gICAgICAnY2F0Y2gnOiBmdW5jdGlvbihvblJlamVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0aW9uKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkcG9seWZpbGwoKSB7XG4gICAgICB2YXIgbG9jYWw7XG5cbiAgICAgIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIGxvY2FsID0gZ2xvYmFsO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBsb2NhbCA9IHNlbGY7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGxvY2FsID0gRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncG9seWZpbGwgZmFpbGVkIGJlY2F1c2UgZ2xvYmFsIG9iamVjdCBpcyB1bmF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50Jyk7XG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgUCA9IGxvY2FsLlByb21pc2U7XG5cbiAgICAgIGlmIChQICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChQLnJlc29sdmUoKSkgPT09ICdbb2JqZWN0IFByb21pc2VdJyAmJiAhUC5jYXN0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbG9jYWwuUHJvbWlzZSA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0O1xuICAgIH1cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0ID0gbGliJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRwb2x5ZmlsbDtcblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlID0ge1xuICAgICAgJ1Byb21pc2UnOiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdCxcbiAgICAgICdwb2x5ZmlsbCc6IGxpYiRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkZGVmYXVsdFxuICAgIH07XG5cbiAgICAvKiBnbG9iYWwgZGVmaW5lOnRydWUgbW9kdWxlOnRydWUgd2luZG93OiB0cnVlICovXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lWydhbWQnXSkge1xuICAgICAgZGVmaW5lKGZ1bmN0aW9uKCkgeyByZXR1cm4gbGliJGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTsgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGVbJ2V4cG9ydHMnXSkge1xuICAgICAgbW9kdWxlWydleHBvcnRzJ10gPSBsaWIkZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzWydFUzZQcm9taXNlJ10gPSBsaWIkZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlO1xuICAgIH1cblxuICAgIGxpYiRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkZGVmYXVsdCgpO1xufSkuY2FsbCh0aGlzKTtcblxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIklyWFVzdVwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiLypnbG9iYWxzIGRlZmluZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAocm9vdC5odHRwcGxlYXNlcHJvbWlzZXMgPSBmYWN0b3J5KHJvb3QpKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJvb3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3QuaHR0cHBsZWFzZXByb21pc2VzID0gZmFjdG9yeShyb290KTtcbiAgICB9XG59KHRoaXMsIGZ1bmN0aW9uIChyb290KSB7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgIHJldHVybiBmdW5jdGlvbiAoUHJvbWlzZSkge1xuICAgICAgICBQcm9taXNlID0gUHJvbWlzZSB8fCByb290ICYmIHJvb3QuUHJvbWlzZTtcbiAgICAgICAgaWYgKCFQcm9taXNlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIFByb21pc2UgaW1wbGVtZW50YXRpb24gZm91bmQuJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHByb2Nlc3NSZXF1ZXN0OiBmdW5jdGlvbiAocmVxKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc29sdmUsIHJlamVjdCxcbiAgICAgICAgICAgICAgICAgICAgb2xkT25sb2FkID0gcmVxLm9ubG9hZCxcbiAgICAgICAgICAgICAgICAgICAgb2xkT25lcnJvciA9IHJlcS5vbmVycm9yLFxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUgPSBhO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0ID0gYjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVxLm9ubG9hZCA9IGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9sZE9ubG9hZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gb2xkT25sb2FkLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvbGRPbmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBvbGRPbmVycm9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXEudGhlbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbi5hcHBseShwcm9taXNlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxWydjYXRjaCddID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZVsnY2F0Y2gnXS5hcHBseShwcm9taXNlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfTtcbn0pKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlc3BvbnNlID0gcmVxdWlyZSgnLi9yZXNwb25zZScpO1xuXG5mdW5jdGlvbiBSZXF1ZXN0RXJyb3IobWVzc2FnZSwgcHJvcHMpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgIGVyci5uYW1lID0gJ1JlcXVlc3RFcnJvcic7XG4gICAgdGhpcy5uYW1lID0gZXJyLm5hbWU7XG4gICAgdGhpcy5tZXNzYWdlID0gZXJyLm1lc3NhZ2U7XG4gICAgaWYgKGVyci5zdGFjaykge1xuICAgICAgICB0aGlzLnN0YWNrID0gZXJyLnN0YWNrO1xuICAgIH1cblxuICAgIHRoaXMudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2U7XG4gICAgfTtcblxuICAgIGZvciAodmFyIGsgaW4gcHJvcHMpIHtcbiAgICAgICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICB0aGlzW2tdID0gcHJvcHNba107XG4gICAgICAgIH1cbiAgICB9XG59XG5cblJlcXVlc3RFcnJvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGU7XG5cblJlcXVlc3RFcnJvci5jcmVhdGUgPSBmdW5jdGlvbiAobWVzc2FnZSwgcmVxLCBwcm9wcykge1xuICAgIHZhciBlcnIgPSBuZXcgUmVxdWVzdEVycm9yKG1lc3NhZ2UsIHByb3BzKTtcbiAgICBSZXNwb25zZS5jYWxsKGVyciwgcmVxKTtcbiAgICByZXR1cm4gZXJyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0RXJyb3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpLFxuICAgIGNsZWFuVVJMID0gcmVxdWlyZSgnLi4vcGx1Z2lucy9jbGVhbnVybCcpLFxuICAgIFhIUiA9IHJlcXVpcmUoJy4veGhyJyksXG4gICAgZGVsYXkgPSByZXF1aXJlKCcuL3V0aWxzL2RlbGF5JyksXG4gICAgY3JlYXRlRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJykuY3JlYXRlLFxuICAgIFJlc3BvbnNlID0gcmVxdWlyZSgnLi9yZXNwb25zZScpLFxuICAgIFJlcXVlc3QgPSByZXF1aXJlKCcuL3JlcXVlc3QnKSxcbiAgICBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpLFxuICAgIG9uY2UgPSByZXF1aXJlKCcuL3V0aWxzL29uY2UnKTtcblxuZnVuY3Rpb24gZmFjdG9yeShkZWZhdWx0cywgcGx1Z2lucykge1xuICAgIGRlZmF1bHRzID0gZGVmYXVsdHMgfHwge307XG4gICAgcGx1Z2lucyA9IHBsdWdpbnMgfHwgW107XG5cbiAgICBmdW5jdGlvbiBodHRwKHJlcSwgY2IpIHtcbiAgICAgICAgdmFyIHhociwgcGx1Z2luLCBkb25lLCBrLCB0aW1lb3V0SWQ7XG5cbiAgICAgICAgcmVxID0gbmV3IFJlcXVlc3QoZXh0ZW5kKGRlZmF1bHRzLCByZXEpKTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcGx1Z2luID0gcGx1Z2luc1tpXTtcbiAgICAgICAgICAgIGlmIChwbHVnaW4ucHJvY2Vzc1JlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICBwbHVnaW4ucHJvY2Vzc1JlcXVlc3QocmVxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdpdmUgdGhlIHBsdWdpbnMgYSBjaGFuY2UgdG8gY3JlYXRlIHRoZSBYSFIgb2JqZWN0XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwbHVnaW4gPSBwbHVnaW5zW2ldO1xuICAgICAgICAgICAgaWYgKHBsdWdpbi5jcmVhdGVYSFIpIHtcbiAgICAgICAgICAgICAgICB4aHIgPSBwbHVnaW4uY3JlYXRlWEhSKHJlcSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7IC8vIEZpcnN0IGNvbWUsIGZpcnN0IHNlcnZlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgeGhyID0geGhyIHx8IG5ldyBYSFIoKTtcblxuICAgICAgICByZXEueGhyID0geGhyO1xuXG4gICAgICAgIC8vIEJlY2F1c2UgWEhSIGNhbiBiZSBhbiBYTUxIdHRwUmVxdWVzdCBvciBhbiBYRG9tYWluUmVxdWVzdCwgd2UgYWRkXG4gICAgICAgIC8vIGBvbnJlYWR5c3RhdGVjaGFuZ2VgLCBgb25sb2FkYCwgYW5kIGBvbmVycm9yYCBjYWxsYmFja3MuIFdlIHVzZSB0aGVcbiAgICAgICAgLy8gYG9uY2VgIHV0aWwgdG8gbWFrZSBzdXJlIHRoYXQgb25seSBvbmUgaXMgY2FsbGVkIChhbmQgaXQncyBvbmx5IGNhbGxlZFxuICAgICAgICAvLyBvbmUgdGltZSkuXG4gICAgICAgIGRvbmUgPSBvbmNlKGRlbGF5KGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgeGhyLm9ubG9hZCA9IHhoci5vbmVycm9yID0geGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IHhoci5vbnRpbWVvdXQgPSB4aHIub25wcm9ncmVzcyA9IG51bGw7XG4gICAgICAgICAgICB2YXIgcmVzID0gZXJyICYmIGVyci5pc0h0dHBFcnJvciA/IGVyciA6IG5ldyBSZXNwb25zZShyZXEpO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwbHVnaW4gPSBwbHVnaW5zW2ldO1xuICAgICAgICAgICAgICAgIGlmIChwbHVnaW4ucHJvY2Vzc1Jlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHBsdWdpbi5wcm9jZXNzUmVzcG9uc2UocmVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlcS5vbmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAocmVxLm9ubG9hZCkge1xuICAgICAgICAgICAgICAgICAgICByZXEub25sb2FkKHJlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNiKSB7XG4gICAgICAgICAgICAgICAgY2IoZXJyLCByZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG5cbiAgICAgICAgLy8gV2hlbiB0aGUgcmVxdWVzdCBjb21wbGV0ZXMsIGNvbnRpbnVlLlxuICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHJlcS50aW1lZE91dCkgcmV0dXJuO1xuXG4gICAgICAgICAgICBpZiAocmVxLmFib3J0ZWQpIHtcbiAgICAgICAgICAgICAgICBkb25lKGNyZWF0ZUVycm9yKCdSZXF1ZXN0IGFib3J0ZWQnLCByZXEsIHtuYW1lOiAnQWJvcnQnfSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gTWF0aC5mbG9vcih4aHIuc3RhdHVzIC8gMTAwKTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gMikge1xuICAgICAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh4aHIuc3RhdHVzID09PSA0MDQgJiYgIXJlcS5lcnJvck9uNDA0KSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIga2luZDtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2luZCA9ICdDbGllbnQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQgPSAnU2VydmVyJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2luZCA9ICdIVFRQJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgbXNnID0ga2luZCArICcgRXJyb3I6ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1RoZSBzZXJ2ZXIgcmV0dXJuZWQgYSBzdGF0dXMgb2YgJyArIHhoci5zdGF0dXMgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyBmb3IgdGhlIHJlcXVlc3QgXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5tZXRob2QudG9VcHBlckNhc2UoKSArICcgJyArIHJlcS51cmwgKyAnXCInO1xuICAgICAgICAgICAgICAgICAgICBkb25lKGNyZWF0ZUVycm9yKG1zZywgcmVxKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGBvbmxvYWRgIGlzIG9ubHkgY2FsbGVkIG9uIHN1Y2Nlc3MgYW5kLCBpbiBJRSwgd2lsbCBiZSBjYWxsZWQgd2l0aG91dFxuICAgICAgICAvLyBgeGhyLnN0YXR1c2AgaGF2aW5nIGJlZW4gc2V0LCBzbyB3ZSBkb24ndCBjaGVjayBpdC5cbiAgICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHsgZG9uZSgpOyB9O1xuXG4gICAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZG9uZShjcmVhdGVFcnJvcignSW50ZXJuYWwgWEhSIEVycm9yJywgcmVxKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSUUgc29tZXRpbWVzIGZhaWxzIGlmIHlvdSBkb24ndCBzcGVjaWZ5IGV2ZXJ5IGhhbmRsZXIuXG4gICAgICAgIC8vIFNlZSBodHRwOi8vc29jaWFsLm1zZG4ubWljcm9zb2Z0LmNvbS9Gb3J1bXMvaWUvZW4tVVMvMzBlZjNhZGQtNzY3Yy00NDM2LWI4YTktZjFjYTE5YjQ4MTJlL2llOS1ydG0teGRvbWFpbnJlcXVlc3QtaXNzdWVkLXJlcXVlc3RzLW1heS1hYm9ydC1pZi1hbGwtZXZlbnQtaGFuZGxlcnMtbm90LXNwZWNpZmllZD9mb3J1bT1pZXdlYmRldmVsb3BtZW50XG4gICAgICAgIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbiAoKSB7IC8qIG5vb3AgKi8gfTtcbiAgICAgICAgeGhyLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbiAoKSB7IC8qIG5vb3AgKi8gfTtcblxuICAgICAgICB4aHIub3BlbihyZXEubWV0aG9kLCByZXEudXJsKTtcblxuICAgICAgICBpZiAocmVxLnRpbWVvdXQpIHtcbiAgICAgICAgICAgIC8vIElmIHdlIHVzZSB0aGUgbm9ybWFsIFhIUiB0aW1lb3V0IG1lY2hhbmlzbSAoYHhoci50aW1lb3V0YCBhbmRcbiAgICAgICAgICAgIC8vIGB4aHIub250aW1lb3V0YCksIGBvbnJlYWR5c3RhdGVjaGFuZ2VgIHdpbGwgYmUgdHJpZ2dlcmVkIGJlZm9yZVxuICAgICAgICAgICAgLy8gYG9udGltZW91dGAuIFRoZXJlJ3Mgbm8gd2F5IHRvIHJlY29nbml6ZSB0aGF0IGl0IHdhcyB0cmlnZ2VyZWQgYnlcbiAgICAgICAgICAgIC8vIGEgdGltZW91dCwgYW5kIHdlJ2QgYmUgdW5hYmxlIHRvIGRpc3BhdGNoIHRoZSByaWdodCBlcnJvci5cbiAgICAgICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlcS50aW1lZE91dCA9IHRydWU7XG4gICAgICAgICAgICAgICAgZG9uZShjcmVhdGVFcnJvcignUmVxdWVzdCB0aW1lb3V0JywgcmVxLCB7bmFtZTogJ1RpbWVvdXQnfSkpO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHhoci5hYm9ydCgpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge31cbiAgICAgICAgICAgIH0sIHJlcS50aW1lb3V0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoayBpbiByZXEuaGVhZGVycykge1xuICAgICAgICAgICAgaWYgKHJlcS5oZWFkZXJzLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoaywgcmVxLmhlYWRlcnNba10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgeGhyLnNlbmQocmVxLmJvZHkpO1xuXG4gICAgICAgIHJldHVybiByZXE7XG4gICAgfVxuXG4gICAgdmFyIG1ldGhvZCxcbiAgICAgICAgbWV0aG9kcyA9IFsnZ2V0JywgJ3Bvc3QnLCAncHV0JywgJ2hlYWQnLCAncGF0Y2gnLCAnZGVsZXRlJ10sXG4gICAgICAgIHZlcmIgPSBmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHJlcSwgY2IpIHtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgUmVxdWVzdChyZXEpO1xuICAgICAgICAgICAgICAgIHJlcS5tZXRob2QgPSBtZXRob2Q7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0dHAocmVxLCBjYik7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgIGZvciAoaSA9IDA7IGkgPCBtZXRob2RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG1ldGhvZCA9IG1ldGhvZHNbaV07XG4gICAgICAgIGh0dHBbbWV0aG9kXSA9IHZlcmIobWV0aG9kKTtcbiAgICB9XG5cbiAgICBodHRwLnBsdWdpbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBwbHVnaW5zO1xuICAgIH07XG5cbiAgICBodHRwLmRlZmF1bHRzID0gZnVuY3Rpb24gKG5ld1ZhbHVlcykge1xuICAgICAgICBpZiAobmV3VmFsdWVzKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFjdG9yeShleHRlbmQoZGVmYXVsdHMsIG5ld1ZhbHVlcyksIHBsdWdpbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZhdWx0cztcbiAgICB9O1xuXG4gICAgaHR0cC51c2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBuZXdQbHVnaW5zID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICAgICAgcmV0dXJuIGZhY3RvcnkoZGVmYXVsdHMsIHBsdWdpbnMuY29uY2F0KG5ld1BsdWdpbnMpKTtcbiAgICB9O1xuXG4gICAgaHR0cC5iYXJlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFjdG9yeSgpO1xuICAgIH07XG5cbiAgICBodHRwLlJlcXVlc3QgPSBSZXF1ZXN0O1xuICAgIGh0dHAuUmVzcG9uc2UgPSBSZXNwb25zZTtcblxuICAgIHJldHVybiBodHRwO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkoe30sIFtjbGVhblVSTF0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBSZXF1ZXN0KG9wdHNPclVybCkge1xuICAgIHZhciBvcHRzID0gdHlwZW9mIG9wdHNPclVybCA9PT0gJ3N0cmluZycgPyB7dXJsOiBvcHRzT3JVcmx9IDogb3B0c09yVXJsIHx8IHt9O1xuICAgIHRoaXMubWV0aG9kID0gb3B0cy5tZXRob2QgPyBvcHRzLm1ldGhvZC50b1VwcGVyQ2FzZSgpIDogJ0dFVCc7XG4gICAgdGhpcy51cmwgPSBvcHRzLnVybDtcbiAgICB0aGlzLmhlYWRlcnMgPSBvcHRzLmhlYWRlcnMgfHwge307XG4gICAgdGhpcy5ib2R5ID0gb3B0cy5ib2R5O1xuICAgIHRoaXMudGltZW91dCA9IG9wdHMudGltZW91dCB8fCAwO1xuICAgIHRoaXMuZXJyb3JPbjQwNCA9IG9wdHMuZXJyb3JPbjQwNCAhPSBudWxsID8gb3B0cy5lcnJvck9uNDA0IDogdHJ1ZTtcbiAgICB0aGlzLm9ubG9hZCA9IG9wdHMub25sb2FkO1xuICAgIHRoaXMub25lcnJvciA9IG9wdHMub25lcnJvcjtcbn1cblxuUmVxdWVzdC5wcm90b3R5cGUuYWJvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuYWJvcnRlZCkgcmV0dXJuO1xuICAgIHRoaXMuYWJvcnRlZCA9IHRydWU7XG4gICAgdGhpcy54aHIuYWJvcnQoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLmhlYWRlciA9IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuICAgIHZhciBrO1xuICAgIGZvciAoayBpbiB0aGlzLmhlYWRlcnMpIHtcbiAgICAgICAgaWYgKHRoaXMuaGVhZGVycy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgaWYgKG5hbWUudG9Mb3dlckNhc2UoKSA9PT0gay50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGVhZGVyc1trXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5oZWFkZXJzW2tdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuaGVhZGVyc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcXVlc3Q7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZXF1ZXN0ID0gcmVxdWlyZSgnLi9yZXF1ZXN0Jyk7XG5cblxuZnVuY3Rpb24gUmVzcG9uc2UocmVxKSB7XG4gICAgdmFyIGksIGxpbmVzLCBtLFxuICAgICAgICB4aHIgPSByZXEueGhyO1xuICAgIHRoaXMucmVxdWVzdCA9IHJlcTtcbiAgICB0aGlzLnhociA9IHhocjtcbiAgICB0aGlzLmhlYWRlcnMgPSB7fTtcblxuICAgIC8vIEJyb3dzZXJzIGRvbid0IGxpa2UgeW91IHRyeWluZyB0byByZWFkIFhIUiBwcm9wZXJ0aWVzIHdoZW4geW91IGFib3J0IHRoZVxuICAgIC8vIHJlcXVlc3QsIHNvIHdlIGRvbid0LlxuICAgIGlmIChyZXEuYWJvcnRlZCB8fCByZXEudGltZWRPdXQpIHJldHVybjtcblxuICAgIHRoaXMuc3RhdHVzID0geGhyLnN0YXR1cyB8fCAwO1xuICAgIHRoaXMudGV4dCA9IHhoci5yZXNwb25zZVRleHQ7XG4gICAgdGhpcy5ib2R5ID0geGhyLnJlc3BvbnNlIHx8IHhoci5yZXNwb25zZVRleHQ7XG4gICAgdGhpcy5jb250ZW50VHlwZSA9IHhoci5jb250ZW50VHlwZSB8fCAoeGhyLmdldFJlc3BvbnNlSGVhZGVyICYmIHhoci5nZXRSZXNwb25zZUhlYWRlcignQ29udGVudC1UeXBlJykpO1xuXG4gICAgaWYgKHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMpIHtcbiAgICAgICAgbGluZXMgPSB4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkuc3BsaXQoJ1xcbicpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICgobSA9IGxpbmVzW2ldLm1hdGNoKC9cXHMqKFteXFxzXSspOlxccysoW15cXHNdKykvKSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhlYWRlcnNbbVsxXV0gPSBtWzJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5pc0h0dHBFcnJvciA9IHRoaXMuc3RhdHVzID49IDQwMDtcbn1cblxuUmVzcG9uc2UucHJvdG90eXBlLmhlYWRlciA9IFJlcXVlc3QucHJvdG90eXBlLmhlYWRlcjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlc3BvbnNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBXcmFwIGEgZnVuY3Rpb24gaW4gYSBgc2V0VGltZW91dGAgY2FsbC4gVGhpcyBpcyB1c2VkIHRvIGd1YXJhbnRlZSBhc3luY1xuLy8gYmVoYXZpb3IsIHdoaWNoIGNhbiBhdm9pZCB1bmV4cGVjdGVkIGVycm9ycy5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXJcbiAgICAgICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApLFxuICAgICAgICAgICAgbmV3RnVuYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICBzZXRUaW1lb3V0KG5ld0Z1bmMsIDApO1xuICAgIH07XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBBIFwib25jZVwiIHV0aWxpdHkuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciByZXN1bHQsIGNhbGxlZCA9IGZhbHNlO1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghY2FsbGVkKSB7XG4gICAgICAgICAgICBjYWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgcmVzdWx0ID0gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB3aW5kb3cuWE1MSHR0cFJlcXVlc3Q7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4dGVuZFxuXG5mdW5jdGlvbiBleHRlbmQoKSB7XG4gICAgdmFyIHRhcmdldCA9IHt9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldXG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcm9jZXNzUmVxdWVzdDogZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICByZXEudXJsID0gcmVxLnVybC5yZXBsYWNlKC9bXiVdKy9nLCBmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgcmV0dXJuIGVuY29kZVVSSShzKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGpzb25yZXF1ZXN0ID0gcmVxdWlyZSgnLi9qc29ucmVxdWVzdCcpLFxuICAgIGpzb25yZXNwb25zZSA9IHJlcXVpcmUoJy4vanNvbnJlc3BvbnNlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByb2Nlc3NSZXF1ZXN0OiBmdW5jdGlvbiAocmVxKSB7XG4gICAgICAgIGpzb25yZXF1ZXN0LnByb2Nlc3NSZXF1ZXN0LmNhbGwodGhpcywgcmVxKTtcbiAgICAgICAganNvbnJlc3BvbnNlLnByb2Nlc3NSZXF1ZXN0LmNhbGwodGhpcywgcmVxKTtcbiAgICB9LFxuICAgIHByb2Nlc3NSZXNwb25zZTogZnVuY3Rpb24gKHJlcykge1xuICAgICAgICBqc29ucmVzcG9uc2UucHJvY2Vzc1Jlc3BvbnNlLmNhbGwodGhpcywgcmVzKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcm9jZXNzUmVxdWVzdDogZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICB2YXJcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlID0gcmVxLmhlYWRlcignQ29udGVudC1UeXBlJyksXG4gICAgICAgICAgICBoYXNKc29uQ29udGVudFR5cGUgPSBjb250ZW50VHlwZSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudFR5cGUuaW5kZXhPZignYXBwbGljYXRpb24vanNvbicpICE9PSAtMTtcblxuICAgICAgICBpZiAoY29udGVudFR5cGUgIT0gbnVsbCAmJiAhaGFzSnNvbkNvbnRlbnRUeXBlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVxLmJvZHkpIHtcbiAgICAgICAgICAgIGlmICghY29udGVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICByZXEuaGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXEuYm9keSA9IEpTT04uc3RyaW5naWZ5KHJlcS5ib2R5KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByb2Nlc3NSZXF1ZXN0OiBmdW5jdGlvbiAocmVxKSB7XG4gICAgICAgIHZhciBhY2NlcHQgPSByZXEuaGVhZGVyKCdBY2NlcHQnKTtcbiAgICAgICAgaWYgKGFjY2VwdCA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXEuaGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBwcm9jZXNzUmVzcG9uc2U6IGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoZSBjb250ZW50eXBlIGlzIFwic29tZXRoaW5nL2pzb25cIiBvclxuICAgICAgICAvLyBcInNvbWV0aGluZy9zb21ldGhpbmdlbHNlK2pzb25cIlxuICAgICAgICBpZiAocmVzLmNvbnRlbnRUeXBlICYmIC9eLipcXC8oPzouKlxcKyk/anNvbig7fCQpL2kudGVzdChyZXMuY29udGVudFR5cGUpKSB7XG4gICAgICAgICAgICB2YXIgcmF3ID0gdHlwZW9mIHJlcy5ib2R5ID09PSAnc3RyaW5nJyA/IHJlcy5ib2R5IDogcmVzLnRleHQ7XG4gICAgICAgICAgICBpZiAocmF3KSB7XG4gICAgICAgICAgICAgICAgcmVzLmJvZHkgPSBKU09OLnBhcnNlKHJhdyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwidmFyIGh0dHAgPSByZXF1aXJlKFwiaHR0cHBsZWFzZVwiKTtcbnZhciBhcGlqcyA9IHJlcXVpcmUoXCJ0bnQuYXBpXCIpO1xudmFyIHByb21pc2VzID0gcmVxdWlyZSgnaHR0cHBsZWFzZS1wcm9taXNlcycpO1xudmFyIFByb21pc2UgPSByZXF1aXJlKCdlczYtcHJvbWlzZScpLlByb21pc2U7XG52YXIganNvbiA9IHJlcXVpcmUoXCJodHRwcGxlYXNlL3BsdWdpbnMvanNvblwiKTtcbmh0dHAgPSBodHRwLnVzZShqc29uKS51c2UocHJvbWlzZXMoUHJvbWlzZSkpO1xuXG50bnRfZVJlc3QgPSBmdW5jdGlvbigpIHtcblxuICAgIC8vIFByZWZpeGVzIHRvIHVzZSB0aGUgUkVTVCBBUEkuXG4gICAgLy8gVGhlc2UgYXJlIG1vZGlmaWVkIGluIHRoZSBsb2NhbFJFU1Qgc2V0dGVyXG4gICAgdmFyIHByZWZpeCA9IFwiaHR0cHM6Ly9yZXN0LmVuc2VtYmwub3JnXCI7XG4gICAgdmFyIHByZWZpeF9yZWdpb24gPSBwcmVmaXggKyBcIi9vdmVybGFwL3JlZ2lvbi9cIjtcbiAgICB2YXIgcHJlZml4X2Vuc2dlbmUgPSBwcmVmaXggKyBcIi9sb29rdXAvaWQvXCI7XG4gICAgdmFyIHByZWZpeF94cmVmID0gcHJlZml4ICsgXCIveHJlZnMvc3ltYm9sL1wiO1xuICAgIHZhciBwcmVmaXhfaG9tb2xvZ3VlcyA9IHByZWZpeCArIFwiL2hvbW9sb2d5L2lkL1wiO1xuICAgIHZhciBwcmVmaXhfY2hyX2luZm8gPSBwcmVmaXggKyBcIi9pbmZvL2Fzc2VtYmx5L1wiO1xuICAgIHZhciBwcmVmaXhfYWxuX3JlZ2lvbiA9IHByZWZpeCArIFwiL2FsaWdubWVudC9yZWdpb24vXCI7XG4gICAgdmFyIHByZWZpeF9nZW5lX3RyZWUgPSBwcmVmaXggKyBcIi9nZW5ldHJlZS9pZC9cIjtcbiAgICB2YXIgcHJlZml4X2Fzc2VtYmx5ID0gcHJlZml4ICsgXCIvaW5mby9hc3NlbWJseS9cIjtcbiAgICB2YXIgcHJlZml4X3NlcXVlbmNlID0gcHJlZml4ICsgXCIvc2VxdWVuY2UvcmVnaW9uL1wiO1xuICAgIHZhciBwcmVmaXhfdmFyaWF0aW9uID0gcHJlZml4ICsgXCIvdmFyaWF0aW9uL1wiO1xuXG4gICAgLy8gTnVtYmVyIG9mIGNvbm5lY3Rpb25zIG1hZGUgdG8gdGhlIGRhdGFiYXNlXG4gICAgdmFyIGNvbm5lY3Rpb25zID0gMDtcblxuICAgIHZhciBlUmVzdCA9IGZ1bmN0aW9uKCkge1xuICAgIH07XG5cbiAgICAvLyBMaW1pdHMgaW1wb3NlZCBieSB0aGUgZW5zZW1ibCBSRVNUIEFQSVxuICAgIGVSZXN0LmxpbWl0cyA9IHtcblx0cmVnaW9uIDogNTAwMDAwMFxuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGVSZXN0KTtcblxuXG4gICAgLyoqIDxzdHJvbmc+bG9jYWxSRVNUPC9zdHJvbmc+IHBvaW50cyB0aGUgcXVlcmllcyB0byBhIGxvY2FsIFJFU1Qgc2VydmljZSB0byBkZWJ1Zy5cblx0VE9ETzogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIHJlbW92ZWQgaW4gXCJwcm9kdWN0aW9uXCJcbiAgICAqL1xuICAgIGFwaS5tZXRob2QgKCdsb2NhbFJFU1QnLCBmdW5jdGlvbigpIHtcblx0cHJlZml4ID0gXCJodHRwOi8vMTI3LjAuMC4xOjMwMDBcIjtcblx0cHJlZml4X3JlZ2lvbiA9IHByZWZpeCArIFwiL292ZXJsYXAvcmVnaW9uL1wiO1xuXHRwcmVmaXhfZW5zZ2VuZSA9IHByZWZpeCArIFwiL2xvb2t1cC9pZC9cIjtcblx0cHJlZml4X3hyZWYgPSBwcmVmaXggKyBcIi94cmVmcy9zeW1ib2wvXCI7XG5cdHByZWZpeF9ob21vbG9ndWVzID0gcHJlZml4ICsgXCIvaG9tb2xvZ3kvaWQvXCI7XG5cblx0cmV0dXJuIGVSZXN0O1xuICAgIH0pO1xuXG4gICAgLyoqIDxzdHJvbmc+Y2FsbDwvc3Ryb25nPiBtYWtlcyBhbiBhc3luY2hyb25vdXMgY2FsbCB0byB0aGUgZW5zZW1ibCBSRVNUIHNlcnZpY2UuXG5cdEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBBIGxpdGVyYWwgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGZvbGxvd2luZyBmaWVsZHM6XG5cdDx1bD5cblx0PGxpPnVybCA9PiBUaGUgcmVzdCBVUkwuIFRoaXMgaXMgcmV0dXJuZWQgYnkge0BsaW5rIGVSZXN0LnVybH08L2xpPlxuXHQ8bGk+c3VjY2VzcyA9PiBBIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBSRVNUIHF1ZXJ5IGlzIHN1Y2Nlc3NmdWwgKGkuZS4gdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBpcyBhIGRlZmluZWQgdmFsdWUgYW5kIG5vIGVycm9yIGhhcyBiZWVuIHJldHVybmVkKTwvbGk+XG5cdDxsaT5lcnJvciA9PiBBIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBSRVNUIHF1ZXJ5IHJldHVybnMgYW4gZXJyb3Jcblx0PC91bD5cbiAgICAqL1xuICAgIGFwaS5tZXRob2QgKCdjYWxsJywgZnVuY3Rpb24gKG15dXJsLCBkYXRhKSB7XG5cdGlmIChkYXRhKSB7XG5cdCAgICByZXR1cm4gaHR0cC5wb3N0KHtcblx0XHRcInVybFwiOiBteXVybCxcblx0XHRcImJvZHlcIiA6IGRhdGFcblx0ICAgIH0pXG5cdH1cblx0cmV0dXJuIGh0dHAuZ2V0KHtcblx0ICAgIFwidXJsXCI6IG15dXJsXG5cdH0pO1xuICAgIH0pO1xuICAgIC8vIGFwaS5tZXRob2QgKCdjYWxsJywgZnVuY3Rpb24gKG9iaikge1xuICAgIC8vIFx0dmFyIHVybCA9IG9iai51cmw7XG4gICAgLy8gXHR2YXIgb25fc3VjY2VzcyA9IG9iai5zdWNjZXNzO1xuICAgIC8vIFx0dmFyIG9uX2Vycm9yICAgPSBvYmouZXJyb3I7XG4gICAgLy8gXHRjb25uZWN0aW9ucysrO1xuICAgIC8vIFx0aHR0cC5nZXQoe1xuICAgIC8vIFx0ICAgIFwidXJsXCIgOiB1cmxcbiAgICAvLyBcdH0sIGZ1bmN0aW9uIChlcnJvciwgcmVzcCkge1xuICAgIC8vIFx0ICAgIGlmIChyZXNwICE9PSB1bmRlZmluZWQgJiYgZXJyb3IgPT0gbnVsbCAmJiBvbl9zdWNjZXNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBcdFx0b25fc3VjY2VzcyhKU09OLnBhcnNlKHJlc3AuYm9keSkpO1xuICAgIC8vIFx0ICAgIH1cbiAgICAvLyBcdCAgICBpZiAoZXJyb3IgIT09IG51bGwgJiYgb25fZXJyb3IgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIFx0XHRvbl9lcnJvcihlcnJvcik7XG4gICAgLy8gXHQgICAgfVxuICAgIC8vIFx0fSk7XG4gICAgLy8gfSk7XG5cblxuICAgIGVSZXN0LnVybCA9IHt9O1xuICAgIHZhciB1cmxfYXBpID0gYXBpanMgKGVSZXN0LnVybCk7XG5cdC8qKiBlUmVzdC51cmwuPHN0cm9uZz5yZWdpb248L3N0cm9uZz4gcmV0dXJucyB0aGUgZW5zZW1ibCBSRVNUIHVybCB0byByZXRyaWV2ZSB0aGUgZ2VuZXMgaW5jbHVkZWQgaW4gdGhlIHNwZWNpZmllZCByZWdpb25cblx0ICAgIEBwYXJhbSB7b2JqZWN0fSBvYmogLSBBbiBvYmplY3QgbGl0ZXJhbCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOjxiciAvPlxuPHVsPlxuPGxpPnNwZWNpZXMgOiBUaGUgc3BlY2llcyB0aGUgcmVnaW9uIHJlZmVycyB0bzwvbGk+XG48bGk+Y2hyICAgICA6IFRoZSBjaHIgKG9yIHNlcV9yZWdpb24gbmFtZSk8L2xpPlxuPGxpPmZyb20gICAgOiBUaGUgc3RhcnQgcG9zaXRpb24gb2YgdGhlIHJlZ2lvbiBpbiB0aGUgY2hyPC9saT5cbjxsaT50byAgICAgIDogVGhlIGVuZCBwb3NpdGlvbiBvZiB0aGUgcmVnaW9uIChmcm9tIDwgdG8gYWx3YXlzKTwvbGk+XG48L3VsPlxuICAgICAgICAgICAgQHJldHVybnMge3N0cmluZ30gLSBUaGUgdXJsIHRvIHF1ZXJ5IHRoZSBFbnNlbWJsIFJFU1Qgc2VydmVyLiBGb3IgYW4gZXhhbXBsZSBvZiBvdXRwdXQgb2YgdGhlc2UgdXJscyBzZWUgdGhlIHtAbGluayBodHRwOi8vYmV0YS5yZXN0LmVuc2VtYmwub3JnL2ZlYXR1cmUvcmVnaW9uL2hvbW9fc2FwaWVucy8xMzozMjg4OTYxMS0zMjk3MzgwNS5qc29uP2ZlYXR1cmU9Z2VuZXxFbnNlbWJsIFJFU1QgQVBJIGV4YW1wbGV9XG5cdCAgICBAZXhhbXBsZVxuZVJlc3QuY2FsbCAoIHVybCAgICAgOiBlUmVzdC51cmwucmVnaW9uICh7IHNwZWNpZXMgOiBcImhvbW9fc2FwaWVuc1wiLCBjaHIgOiBcIjEzXCIsIGZyb20gOiAzMjg4OTYxMSwgdG8gOiAzMjk3MzgwNSB9KSxcbiAgICAgICAgICAgICBzdWNjZXNzIDogY2FsbGJhY2ssXG4gICAgICAgICAgICAgZXJyb3IgICA6IGNhbGxiYWNrXG5cdCAgICk7XG5cdCAqL1xuICAgIHVybF9hcGkubWV0aG9kICgncmVnaW9uJywgZnVuY3Rpb24ob2JqKSB7XG5cdHJldHVybiBwcmVmaXhfcmVnaW9uICtcblx0ICAgIG9iai5zcGVjaWVzICtcblx0ICAgIFwiL1wiICtcblx0ICAgIG9iai5jaHIgK1xuXHQgICAgXCI6XCIgKyBcblx0ICAgIG9iai5mcm9tICsgXG5cdCAgICBcIi1cIiArIG9iai50byArIFxuXHQgICAgXCIuanNvbj9mZWF0dXJlPWdlbmVcIjtcbiAgICB9KTtcblxuXHQvKiogZVJlc3QudXJsLjxzdHJvbmc+c3BlY2llc19nZW5lPC9zdHJvbmc+IHJldHVybnMgdGhlIGVuc2VtYmwgUkVTVCB1cmwgdG8gcmV0cmlldmUgdGhlIGVuc2VtYmwgZ2VuZSBhc3NvY2lhdGVkIHdpdGhcblx0ICAgIHRoZSBnaXZlbiBuYW1lIGluIHRoZSBzcGVjaWZpZWQgc3BlY2llcy5cblx0ICAgIEBwYXJhbSB7b2JqZWN0fSBvYmogLSBBbiBvYmplY3QgbGl0ZXJhbCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOjxiciAvPlxuPHVsPlxuPGxpPnNwZWNpZXMgICA6IFRoZSBzcGVjaWVzIHRoZSByZWdpb24gcmVmZXJzIHRvPC9saT5cbjxsaT5nZW5lX25hbWUgOiBUaGUgbmFtZSBvZiB0aGUgZ2VuZTwvbGk+XG48L3VsPlxuICAgICAgICAgICAgQHJldHVybnMge3N0cmluZ30gLSBUaGUgdXJsIHRvIHF1ZXJ5IHRoZSBFbnNlbWJsIFJFU1Qgc2VydmVyLiBGb3IgYW4gZXhhbXBsZSBvZiBvdXRwdXQgb2YgdGhlc2UgdXJscyBzZWUgdGhlIHtAbGluayBodHRwOi8vYmV0YS5yZXN0LmVuc2VtYmwub3JnL3hyZWZzL3N5bWJvbC9odW1hbi9CUkNBMi5qc29uP29iamVjdF90eXBlPWdlbmV8RW5zZW1ibCBSRVNUIEFQSSBleGFtcGxlfVxuXHQgICAgQGV4YW1wbGVcbmVSZXN0LmNhbGwgKCB1cmwgICAgIDogZVJlc3QudXJsLnNwZWNpZXNfZ2VuZSAoeyBzcGVjaWVzIDogXCJodW1hblwiLCBnZW5lX25hbWUgOiBcIkJSQ0EyXCIgfSksXG4gICAgICAgICAgICAgc3VjY2VzcyA6IGNhbGxiYWNrLFxuICAgICAgICAgICAgIGVycm9yICAgOiBjYWxsYmFja1xuXHQgICApO1xuXHQgKi9cbiAgICB1cmxfYXBpLm1ldGhvZCAoJ3hyZWYnLCBmdW5jdGlvbiAob2JqKSB7XG5cdHJldHVybiBwcmVmaXhfeHJlZiArXG5cdCAgICBvYmouc3BlY2llcyAgK1xuXHQgICAgXCIvXCIgK1xuXHQgICAgb2JqLm5hbWUgK1xuXHQgICAgXCIuanNvbj9vYmplY3RfdHlwZT1nZW5lXCI7XG4gICAgfSk7XG5cblx0LyoqIGVSZXN0LnVybC48c3Ryb25nPmhvbW9sb2d1ZXM8L3N0cm9uZz4gcmV0dXJucyB0aGUgZW5zZW1ibCBSRVNUIHVybCB0byByZXRyaWV2ZSB0aGUgaG9tb2xvZ3VlcyAob3J0aG9sb2d1ZXMgKyBwYXJhbG9ndWVzKSBvZiB0aGUgZ2l2ZW4gZW5zZW1ibCBJRC5cblx0ICAgIEBwYXJhbSB7b2JqZWN0fSBvYmogLSBBbiBvYmplY3QgbGl0ZXJhbCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOjxiciAvPlxuPHVsPlxuPGxpPmlkIDogVGhlIEVuc2VtYmwgSUQgb2YgdGhlIGdlbmU8L2xpPlxuPC91bD5cbiAgICAgICAgICAgIEByZXR1cm5zIHtzdHJpbmd9IC0gVGhlIHVybCB0byBxdWVyeSB0aGUgRW5zZW1ibCBSRVNUIHNlcnZlci4gRm9yIGFuIGV4YW1wbGUgb2Ygb3V0cHV0IG9mIHRoZXNlIHVybHMgc2VlIHRoZSB7QGxpbmsgaHR0cDovL2JldGEucmVzdC5lbnNlbWJsLm9yZy9ob21vbG9neS9pZC9FTlNHMDAwMDAxMzk2MTguanNvbj9mb3JtYXQ9Y29uZGVuc2VkO3NlcXVlbmNlPW5vbmU7dHlwZT1hbGx8RW5zZW1ibCBSRVNUIEFQSSBleGFtcGxlfVxuXHQgICAgQGV4YW1wbGVcbmVSZXN0LmNhbGwgKCB1cmwgICAgIDogZVJlc3QudXJsLmhvbW9sb2d1ZXMgKHsgaWQgOiBcIkVOU0cwMDAwMDEzOTYxOFwiIH0pLFxuICAgICAgICAgICAgIHN1Y2Nlc3MgOiBjYWxsYmFjayxcbiAgICAgICAgICAgICBlcnJvciAgIDogY2FsbGJhY2tcblx0ICAgKTtcblx0ICovXG4gICAgdXJsX2FwaS5tZXRob2QgKCdob21vbG9ndWVzJywgZnVuY3Rpb24ob2JqKSB7XG5cdHJldHVybiBwcmVmaXhfaG9tb2xvZ3VlcyArXG5cdCAgICBvYmouaWQgKyBcblx0ICAgIFwiLmpzb24/Zm9ybWF0PWNvbmRlbnNlZDtzZXF1ZW5jZT1ub25lO3R5cGU9YWxsXCI7XG4gICAgfSk7XG5cblx0LyoqIGVSZXN0LnVybC48c3Ryb25nPmdlbmU8L3N0cm9uZz4gcmV0dXJucyB0aGUgZW5zZW1ibCBSRVNUIHVybCB0byByZXRyaWV2ZSB0aGUgZW5zZW1ibCBnZW5lIGFzc29jaWF0ZWQgd2l0aFxuXHQgICAgdGhlIGdpdmVuIElEXG5cdCAgICBAcGFyYW0ge29iamVjdH0gb2JqIC0gQW4gb2JqZWN0IGxpdGVyYWwgd2l0aCB0aGUgZm9sbG93aW5nIGZpZWxkczo8YnIgLz5cbjx1bD5cbjxsaT5pZCA6IFRoZSBuYW1lIG9mIHRoZSBnZW5lPC9saT5cbjxsaT5leHBhbmQgOiBpZiB0cmFuc2NyaXB0cyBzaG91bGQgYmUgaW5jbHVkZWQgaW4gdGhlIHJlc3BvbnNlIChkZWZhdWx0IHRvIDApPC9saT5cbjwvdWw+XG4gICAgICAgICAgICBAcmV0dXJucyB7c3RyaW5nfSAtIFRoZSB1cmwgdG8gcXVlcnkgdGhlIEVuc2VtYmwgUkVTVCBzZXJ2ZXIuIEZvciBhbiBleGFtcGxlIG9mIG91dHB1dCBvZiB0aGVzZSB1cmxzIHNlZSB0aGUge0BsaW5rIGh0dHA6Ly9iZXRhLnJlc3QuZW5zZW1ibC5vcmcvbG9va3VwL0VOU0cwMDAwMDEzOTYxOC5qc29uP2Zvcm1hdD1mdWxsfEVuc2VtYmwgUkVTVCBBUEkgZXhhbXBsZX1cblx0ICAgIEBleGFtcGxlXG5lUmVzdC5jYWxsICggdXJsICAgICA6IGVSZXN0LnVybC5nZW5lICh7IGlkIDogXCJFTlNHMDAwMDAxMzk2MThcIiB9KSxcbiAgICAgICAgICAgICBzdWNjZXNzIDogY2FsbGJhY2ssXG4gICAgICAgICAgICAgZXJyb3IgICA6IGNhbGxiYWNrXG5cdCAgICk7XG5cdCAqL1xuICAgIHVybF9hcGkubWV0aG9kICgnZ2VuZScsIGZ1bmN0aW9uKG9iaikge1xuXHR2YXIgdXJsID0gcHJlZml4X2Vuc2dlbmUgKyBvYmouaWQgKyBcIi5qc29uP2Zvcm1hdD1mdWxsXCI7XG5cdGlmIChvYmouZXhwYW5kICYmIG9iai5leHBhbmQgPT09IDEpIHtcblx0ICAgIHVybCA9IHVybCArIFwiJmV4cGFuZD0xXCI7XG5cdH1cblx0cmV0dXJuIHVybDtcbiAgICB9KTtcblxuXHQvKiogZVJlc3QudXJsLjxzdHJvbmc+Y2hyX2luZm88L3N0cm9uZz4gcmV0dXJucyB0aGUgZW5zZW1ibCBSRVNUIHVybCB0byByZXRyaWV2ZSB0aGUgaW5mb3JtYXRpb24gYXNzb2NpYXRlZCB3aXRoIHRoZSBjaHJvbW9zb21lIChzZXFfcmVnaW9uIGluIEVuc2VtYmwgbm9tZW5jbGF0dXJlKS5cblx0ICAgIEBwYXJhbSB7b2JqZWN0fSBvYmogLSBBbiBvYmplY3QgbGl0ZXJhbCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOjxiciAvPlxuPHVsPlxuPGxpPnNwZWNpZXMgOiBUaGUgc3BlY2llcyB0aGUgY2hyIChvciBzZXFfcmVnaW9uKSBiZWxvbmdzIHRvXG48bGk+Y2hyICAgICA6IFRoZSBuYW1lIG9mIHRoZSBjaHIgKG9yIHNlcV9yZWdpb24pPC9saT5cbjwvdWw+XG4gICAgICAgICAgICBAcmV0dXJucyB7c3RyaW5nfSAtIFRoZSB1cmwgdG8gcXVlcnkgdGhlIEVuc2VtYmwgUkVTVCBzZXJ2ZXIuIEZvciBhbiBleGFtcGxlIG9mIG91dHB1dCBvZiB0aGVzZSB1cmxzIHNlZSB0aGUge0BsaW5rIGh0dHA6Ly9iZXRhLnJlc3QuZW5zZW1ibC5vcmcvYXNzZW1ibHkvaW5mby9ob21vX3NhcGllbnMvMTMuanNvbj9mb3JtYXQ9ZnVsbHxFbnNlbWJsIFJFU1QgQVBJIGV4YW1wbGV9XG5cdCAgICBAZXhhbXBsZVxuZVJlc3QuY2FsbCAoIHVybCAgICAgOiBlUmVzdC51cmwuY2hyX2luZm8gKHsgc3BlY2llcyA6IFwiaG9tb19zYXBpZW5zXCIsIGNociA6IFwiMTNcIiB9KSxcbiAgICAgICAgICAgICBzdWNjZXNzIDogY2FsbGJhY2ssXG4gICAgICAgICAgICAgZXJyb3IgICA6IGNhbGxiYWNrXG5cdCAgICk7XG5cdCAqL1xuICAgIHVybF9hcGkubWV0aG9kICgnY2hyX2luZm8nLCBmdW5jdGlvbihvYmopIHtcblx0cmV0dXJuIHByZWZpeF9jaHJfaW5mbyArXG5cdCAgICBvYmouc3BlY2llcyArXG5cdCAgICBcIi9cIiArXG5cdCAgICBvYmouY2hyICtcblx0ICAgIFwiLmpzb24/Zm9ybWF0PWZ1bGxcIjtcbiAgICB9KTtcblxuXHQvLyBUT0RPOiBGb3Igbm93LCBpdCBvbmx5IHdvcmtzIHdpdGggc3BlY2llc19zZXQgYW5kIG5vdCBzcGVjaWVzX3NldF9ncm91cHNcblx0Ly8gU2hvdWxkIGJlIGV4dGVuZGVkIGZvciB3aWRlciB1c2VcbiAgICB1cmxfYXBpLm1ldGhvZCAoJ2Fsbl9ibG9jaycsIGZ1bmN0aW9uIChvYmopIHtcblx0dmFyIHVybCA9IHByZWZpeF9hbG5fcmVnaW9uICsgXG5cdCAgICBvYmouc3BlY2llcyArXG5cdCAgICBcIi9cIiArXG5cdCAgICBvYmouY2hyICtcblx0ICAgIFwiOlwiICtcblx0ICAgIG9iai5mcm9tICtcblx0ICAgIFwiLVwiICtcblx0ICAgIG9iai50byArXG5cdCAgICBcIi5qc29uP21ldGhvZD1cIiArXG5cdCAgICBvYmoubWV0aG9kO1xuXG5cdGZvciAodmFyIGk9MDsgaTxvYmouc3BlY2llc19zZXQubGVuZ3RoOyBpKyspIHtcblx0ICAgIHVybCArPSBcIiZzcGVjaWVzX3NldD1cIiArIG9iai5zcGVjaWVzX3NldFtpXTtcblx0fVxuXG5cdHJldHVybiB1cmw7XG4gICAgfSk7XG5cbiAgICB1cmxfYXBpLm1ldGhvZCAoJ3NlcXVlbmNlJywgZnVuY3Rpb24gKG9iaikge1xuXHRyZXR1cm4gcHJlZml4X3NlcXVlbmNlICtcblx0ICAgIG9iai5zcGVjaWVzICtcblx0ICAgICcvJyArXG5cdCAgICBvYmouY2hyICtcblx0ICAgICc6JyArXG5cdCAgICBvYmouZnJvbSArXG5cdCAgICAnLi4nICtcblx0ICAgIG9iai50byArXG5cdCAgICAnP2NvbnRlbnQtdHlwZT1hcHBsaWNhdGlvbi9qc29uJztcbiAgICB9KTtcblxuICAgIHVybF9hcGkubWV0aG9kICgndmFyaWF0aW9uJywgZnVuY3Rpb24gKG9iaikge1xuXHQvLyBGb3Igbm93LCBvbmx5IHBvc3QgcmVxdWVzdHMgYXJlIGluY2x1ZGVkXG5cdHJldHVybiBwcmVmaXhfdmFyaWF0aW9uICtcblx0ICAgIG9iai5zcGVjaWVzO1xuICAgIH0pO1xuICAgIFxuICAgIHVybF9hcGkubWV0aG9kICgnZ2VuZV90cmVlJywgZnVuY3Rpb24gKG9iaikge1xuXHRyZXR1cm4gcHJlZml4X2dlbmVfdHJlZSArXG5cdCAgICBvYmouaWQgKyBcblx0ICAgIFwiLmpzb24/c2VxdWVuY2U9XCIgK1xuXHQgICAgKChvYmouc2VxdWVuY2UgfHwgb2JqLmFsaWduZWQpID8gMSA6IFwibm9uZVwiKSArXG5cdCAgICAob2JqLmFsaWduZWQgPyAnJmFsaWduZWQ9MScgOiAnJyk7XG4gICAgfSk7XG5cbiAgICB1cmxfYXBpLm1ldGhvZCgnYXNzZW1ibHknLCBmdW5jdGlvbiAob2JqKSB7XG5cdHJldHVybiBwcmVmaXhfYXNzZW1ibHkgKyBcblx0ICAgIG9iai5zcGVjaWVzICtcblx0ICAgIFwiLmpzb25cIjtcbiAgICB9KTtcblxuXG4gICAgYXBpLm1ldGhvZCAoJ2Nvbm5lY3Rpb25zJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiBjb25uZWN0aW9ucztcbiAgICB9KTtcblxuICAgIHJldHVybiBlUmVzdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRudF9lUmVzdDtcbiIsIi8vIGlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4vLyAgICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fVxuLy8gfVxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXguanNcIik7XG5cbiIsInZhciBib2FyZCA9IHJlcXVpcmUoXCJ0bnQuYm9hcmRcIik7XG52YXIgYXBpanMgPSByZXF1aXJlKFwidG50LmFwaVwiKTtcbnZhciBlbnNlbWJsUmVzdEFQSSA9IHJlcXVpcmUoXCJ0bnQuZW5zZW1ibFwiKTtcblxuYm9hcmQudHJhY2suZGF0YS5yZXRyaWV2ZXIuZW5zZW1ibCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3VjY2VzcyA9IFtmdW5jdGlvbiAoKSB7fV07XG4gICAgdmFyIGlnbm9yZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlIH07XG4gICAgdmFyIGVuZHBvaW50O1xuICAgIHZhciBlUmVzdCA9IGVuc2VtYmxSZXN0QVBJKCk7XG4gICAgdmFyIHVwZGF0ZV90cmFjayA9IGZ1bmN0aW9uIChvYmopIHtcblx0dmFyIGRhdGFfcGFyZW50ID0gdGhpcztcblx0Ly8gT2JqZWN0IGhhcyBsb2MgYW5kIGEgcGx1Zy1pbiBkZWZpbmVkIGNhbGxiYWNrXG5cdHZhciBsb2MgPSBvYmoubG9jO1xuXHR2YXIgcGx1Z2luX2NiYWsgPSBvYmoub25fc3VjY2Vzcztcblx0dmFyIHVybCA9IGVSZXN0LnVybFt1cGRhdGVfdHJhY2suZW5kcG9pbnQoKV0obG9jKTtcblx0aWYgKGlnbm9yZSAobG9jKSkge1xuXHQgICAgZGF0YV9wYXJlbnQuZWxlbWVudHMoW10pO1xuXHQgICAgcGx1Z2luX2NiYWsoKTtcblx0fSBlbHNlIHtcblx0ICAgIGVSZXN0LmNhbGwodXJsKVxuXHRcdC50aGVuIChmdW5jdGlvbiAocmVzcCkge1xuXHRcdCAgICAvLyBVc2VyIGRlZmluZWRcblx0XHQgICAgZm9yICh2YXIgaT0wOyBpPHN1Y2Nlc3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBtb2QgPSBzdWNjZXNzW2ldKHJlc3AuYm9keSk7XG5cdFx0XHRpZiAobW9kKSB7XG5cdFx0XHQgICAgcmVzcC5ib2R5ID0gbW9kO1xuXHRcdFx0fVxuXHRcdCAgICB9XG5cblx0XHQgICAgZGF0YV9wYXJlbnQuZWxlbWVudHMocmVzcC5ib2R5KTtcblxuXHRcdCAgICAvLyBwbHVnLWluIGRlZmluZWRcblx0XHQgICAgcGx1Z2luX2NiYWsoKTtcblx0XHR9KTtcblx0fSBcbiAgICB9O1xuICAgIGFwaWpzICh1cGRhdGVfdHJhY2spXG5cdC5nZXRzZXQgKCdlbmRwb2ludCcpO1xuXG4gICAgLy8gVE9ETzogV2UgZG9uJ3QgaGF2ZSBhIHdheSBvZiByZXNldHRpbmcgdGhlIHN1Y2Nlc3MgYXJyYXlcbiAgICAvLyBUT0RPOiBTaG91bGQgdGhpcyBhbHNvIGJlIGluY2x1ZGVkIGluIHRoZSBzeW5jIHJldHJpZXZlcj9cbiAgICAvLyBTdGlsbCBub3Qgc3VyZSB0aGlzIGlzIHRoZSBiZXN0IG9wdGlvbiB0byBzdXBwb3J0IG1vcmUgdGhhbiBvbmUgY2FsbGJhY2tcbiAgICB1cGRhdGVfdHJhY2suc3VjY2VzcyA9IGZ1bmN0aW9uIChjYikge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBzdWNjZXNzO1xuXHR9XG5cdHN1Y2Nlc3MucHVzaCAoY2IpO1xuXHRyZXR1cm4gdXBkYXRlX3RyYWNrO1xuICAgIH07XG5cbiAgICB1cGRhdGVfdHJhY2suaWdub3JlID0gZnVuY3Rpb24gKGNiKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGlnbm9yZTtcblx0fVxuXHRpZ25vcmUgPSBjYjtcblx0cmV0dXJuIHVwZGF0ZV90cmFjaztcbiAgICB9O1xuXG4gICAgcmV0dXJuIHVwZGF0ZV90cmFjaztcbn07XG5cblxuLy8gQSBwcmVkZWZpbmVkIHRyYWNrIGZvciBzZXF1ZW5jZXNcbnZhciBkYXRhX3NlcXVlbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBsaW1pdCA9IDE1MDtcbiAgICB2YXIgdHJhY2tfZGF0YSA9IGJvYXJkLnRyYWNrLmRhdGEoKTtcblxuICAgIHZhciB1cGRhdGVyID0gYm9hcmQudHJhY2suZGF0YS5yZXRyaWV2ZXIuZW5zZW1ibCgpXG5cdC5pZ25vcmUgKGZ1bmN0aW9uIChsb2MpIHtcblx0ICAgIHJldHVybiAobG9jLnRvIC0gbG9jLmZyb20pID4gbGltaXQ7XG5cdH0pXG5cdC5lbmRwb2ludChcInNlcXVlbmNlXCIpXG5cdC5zdWNjZXNzIChmdW5jdGlvbiAocmVzcCkge1xuXHQgICAgLy8gR2V0IHRoZSBjb29yZGluYXRlc1xuXHQgICAgdmFyIGZpZWxkcyA9IHJlc3AuaWQuc3BsaXQoXCI6XCIpO1xuXHQgICAgdmFyIGZyb20gPSBmaWVsZHNbM107XG5cdCAgICB2YXIgbnRzID0gW107XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8cmVzcC5zZXEubGVuZ3RoOyBpKyspIHtcblx0XHRudHMucHVzaCh7XG5cdFx0ICAgIHBvczogK2Zyb20gKyBpLFxuXHRcdCAgICBzZXF1ZW5jZTogcmVzcC5zZXFbaV1cblx0XHR9KTtcblx0ICAgIH1cblx0ICAgIHJldHVybiBudHM7XG5cdH0pO1xuXG4gICAgdHJhY2tfZGF0YS5saW1pdCA9IGZ1bmN0aW9uIChuZXdsaW0pIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gbGltaXQ7XG5cdH1cblx0bGltaXQgPSBuZXdsaW07XG5cdHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICByZXR1cm4gdHJhY2tfZGF0YS51cGRhdGUodXBkYXRlcik7IFxufTtcblxuLy8gQSBwcmVkZWZpbmVkIHRyYWNrIGZvciBnZW5lc1xudmFyIGRhdGFfZ2VuZSA9IGZ1bmN0aW9uICgpIHtcbi8vYm9hcmQudHJhY2suZGF0YS5nZW5lID0gZnVuY3Rpb24gKCkge1xuICAgIFxuICAgIHZhciB1cGRhdGVyID0gYm9hcmQudHJhY2suZGF0YS5yZXRyaWV2ZXIuZW5zZW1ibCgpXG4gICAgICAgIC5lbmRwb2ludChcInJlZ2lvblwiKVxuICAgIC8vIFRPRE86IElmIHN1Y2Nlc3MgaXMgZGVmaW5lZCBoZXJlLCBtZWFucyB0aGF0IGl0IGNhbid0IGJlIHVzZXItZGVmaW5lZFxuICAgIC8vIGlzIHRoYXQgZ29vZD8gZW5vdWdoPyBBUEk/XG4gICAgLy8gVVBEQVRFOiBOb3cgc3VjY2VzcyBpcyBiYWNrZWQgdXAgYnkgYW4gYXJyYXkuIFN0aWxsIGRvbid0IGtub3cgaWYgdGhpcyBpcyB0aGUgYmVzdCBvcHRpb25cbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oZ2VuZXMpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXMubGVuZ3RoOyBpKyspIHtcblx0XHRpZiAoZ2VuZXNbaV0uc3RyYW5kID09PSAtMSkge1xuXHRcdCAgICBnZW5lc1tpXS5kaXNwbGF5X2xhYmVsID0gXCI8XCIgKyBnZW5lc1tpXS5leHRlcm5hbF9uYW1lO1xuXHRcdH0gZWxzZSB7XG5cdFx0ICAgIGdlbmVzW2ldLmRpc3BsYXlfbGFiZWwgPSBnZW5lc1tpXS5leHRlcm5hbF9uYW1lICsgXCI+XCI7XG5cdFx0fVxuXHQgICAgfVxuXHR9KTtcbiAgICByZXR1cm4gYm9hcmQudHJhY2suZGF0YSgpLnVwZGF0ZSh1cGRhdGVyKTtcbn1cblxudmFyIGdlbm9tZV9kYXRhID0ge1xuICAgIGdlbmUgOiBkYXRhX2dlbmUsXG4gICAgc2VxdWVuY2UgOiBkYXRhX3NlcXVlbmNlXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBnZW5vbWVfZGF0YTtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcbnZhciBsYXlvdXQgPSByZXF1aXJlKFwiLi9sYXlvdXQuanNcIik7XG52YXIgYm9hcmQgPSByZXF1aXJlKFwidG50LmJvYXJkXCIpO1xuXG50bnRfZmVhdHVyZV9zZXF1ZW5jZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBjb25maWcgPSB7XG5cdGZvbnRzaXplIDogMTAsXG5cdHNlcXVlbmNlIDogZnVuY3Rpb24gKGQpIHtcblx0ICAgIHJldHVybiBkLnNlcXVlbmNlO1xuXHR9XG4gICAgfTtcblxuICAgICAgICAvLyAnSW5oZXJpdCcgZnJvbSB0bnQudHJhY2suZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0gYm9hcmQudHJhY2suZmVhdHVyZSgpXG5cdC5pbmRleCAoZnVuY3Rpb24gKGQpIHtcblx0ICAgIHJldHVybiBkLnBvcztcblx0fSk7XG4gICAgXG4gICAgdmFyIGFwaSA9IGFwaWpzIChmZWF0dXJlKVxuXHQuZ2V0c2V0IChjb25maWcpO1xuXG5cbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKG5ld19udHMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG5cdG5ld19udHNcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuICAgICAgICAgICAgLnN0eWxlKCdmb250LXNpemUnLCBjb25maWcuZm9udHNpemUgKyBcInB4XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlIChkLnBvcyk7XG5cdCAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIH5+KHRyYWNrLmhlaWdodCgpIC8gMikgKyA1O1xuXHQgICAgfSlcblx0ICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsICdcIkx1Y2lkYSBDb25zb2xlXCIsIE1vbmFjbywgbW9ub3NwYWNlJylcbiAgICAgICAgICAgIC50ZXh0KGNvbmZpZy5zZXF1ZW5jZSlcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbig1MDApXG4gICAgICAgICAgICAuYXR0cignZmlsbCcsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uIChudHMsIHhTY2FsZSkge1xuXHRudHMuc2VsZWN0IChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiB4U2NhbGUoZC5wb3MpO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlX2dlbmUgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyAnSW5oZXJpdCcgZnJvbSB0bnQudHJhY2suZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0gYm9hcmQudHJhY2suZmVhdHVyZSgpXG5cdC5sYXlvdXQoYm9hcmQudHJhY2subGF5b3V0LmZlYXR1cmUoKSlcblx0LmluZGV4KGZ1bmN0aW9uIChkKSB7XG5cdCAgICByZXR1cm4gZC5pZDtcblx0fSk7XG5cbiAgICAvLyB2YXIgdG9vbHRpcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAgICAgdmFyIHRvb2x0aXAgPSBib2FyZC50b29sdGlwLnRhYmxlKCk7XG4gICAgLy8gICAgIHZhciBnZW5lX3Rvb2x0aXAgPSBmdW5jdGlvbihnZW5lKSB7XG4gICAgLy8gICAgICAgICB2YXIgb2JqID0ge307XG4gICAgLy8gICAgICAgICBvYmouaGVhZGVyID0ge1xuICAgIC8vICAgICAgICAgICAgIGxhYmVsIDogXCJIR05DIFN5bWJvbFwiLFxuICAgIC8vICAgICAgICAgICAgIHZhbHVlIDogZ2VuZS5leHRlcm5hbF9uYW1lXG4gICAgLy8gICAgICAgICB9O1xuICAgIC8vICAgICAgICAgb2JqLnJvd3MgPSBbXTtcbiAgICAvLyAgICAgICAgIG9iai5yb3dzLnB1c2goIHtcbiAgICAvLyAgICAgICAgICAgICBsYWJlbCA6IFwiTmFtZVwiLFxuICAgIC8vICAgICAgICAgICAgIHZhbHVlIDogXCI8YSBocmVmPScnPlwiICsgZ2VuZS5JRCAgKyBcIjwvYT5cIlxuICAgIC8vICAgICAgICAgfSk7XG4gICAgLy8gICAgICAgICBvYmoucm93cy5wdXNoKCB7XG4gICAgLy8gICAgICAgICAgICAgbGFiZWwgOiBcIkdlbmUgVHlwZVwiLFxuICAgIC8vICAgICAgICAgICAgIHZhbHVlIDogZ2VuZS5iaW90eXBlXG4gICAgLy8gICAgICAgICB9KTtcbiAgICAvLyAgICAgICAgIG9iai5yb3dzLnB1c2goIHtcbiAgICAvLyAgICAgICAgICAgICBsYWJlbCA6IFwiTG9jYXRpb25cIixcbiAgICAvLyAgICAgICAgICAgICB2YWx1ZSA6IFwiPGEgaHJlZj0nJz5cIiArIGdlbmUuc2VxX3JlZ2lvbl9uYW1lICsgXCI6XCIgKyBnZW5lLnN0YXJ0ICsgXCItXCIgKyBnZW5lLmVuZCAgKyBcIjwvYT5cIlxuICAgIC8vICAgICAgICAgfSk7XG4gICAgLy8gICAgICAgICBvYmoucm93cy5wdXNoKCB7XG4gICAgLy8gICAgICAgICAgICAgbGFiZWwgOiBcIlN0cmFuZFwiLFxuICAgIC8vICAgICAgICAgICAgIHZhbHVlIDogKGdlbmUuc3RyYW5kID09PSAxID8gXCJGb3J3YXJkXCIgOiBcIlJldmVyc2VcIilcbiAgICAvLyAgICAgICAgIH0pO1xuICAgIC8vICAgICAgICAgb2JqLnJvd3MucHVzaCgge1xuICAgIC8vICAgICAgICAgICAgIGxhYmVsIDogXCJEZXNjcmlwdGlvblwiLFxuICAgIC8vICAgICAgICAgICAgIHZhbHVlIDogZ2VuZS5kZXNjcmlwdGlvblxuICAgIC8vICAgICAgICAgfSk7XG5cbiAgICAvLyAgICAgICAgIHRvb2x0aXAuY2FsbCh0aGlzLCBvYmopO1xuICAgIC8vICAgICB9O1xuXG4gICAgLy8gICAgIHJldHVybiBnZW5lX3Rvb2x0aXA7XG4gICAgLy8gfTtcblxuXG4gICAgZmVhdHVyZS5jcmVhdGUoZnVuY3Rpb24gKG5ld19lbGVtcywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0bmV3X2VsZW1zXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zbG90X2hlaWdodCAqIGQuc2xvdDtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCBmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0KVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmJhY2tncm91bmRfY29sb3IoKSlcblx0ICAgIC50cmFuc2l0aW9uKClcblx0ICAgIC5kdXJhdGlvbig1MDApXG5cdCAgICAuYXR0cihcImZpbGxcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRpZiAoZC5jb2xvciA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0ICAgIHJldHVybiBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKTtcblx0XHR9IGVsc2Uge1xuXHRcdCAgICByZXR1cm4gZC5jb2xvclxuXHRcdH1cblx0ICAgIH0pO1xuXG5cdG5ld19lbGVtc1xuXHQgICAgLmFwcGVuZChcInRleHRcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfbmFtZVwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2xvdF9oZWlnaHQgKiBkLnNsb3QpICsgMjU7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmJhY2tncm91bmRfY29sb3IoKSlcblx0ICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG5cdFx0aWYgKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2hvd19sYWJlbCkge1xuXHRcdCAgICByZXR1cm4gZC5kaXNwbGF5X2xhYmVsXG5cdFx0fSBlbHNlIHtcblx0XHQgICAgcmV0dXJuIFwiXCJcblx0XHR9XG5cdCAgICB9KVxuXHQgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJub3JtYWxcIilcblx0ICAgIC50cmFuc2l0aW9uKClcblx0ICAgIC5kdXJhdGlvbig1MDApXG5cdCAgICAuYXR0cihcImZpbGxcIiwgZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpO1xuXHQgICAgfSk7XHQgICAgXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLnVwZGF0ZXIoZnVuY3Rpb24gKGdlbmVzKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdGdlbmVzXG5cdCAgICAuc2VsZWN0KFwicmVjdFwiKVxuXHQgICAgLnRyYW5zaXRpb24oKVxuXHQgICAgLmR1cmF0aW9uKDUwMClcblx0ICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zbG90X2hlaWdodCAqIGQuc2xvdCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5nZW5lX2hlaWdodCk7XG5cblx0Z2VuZXNcblx0ICAgIC5zZWxlY3QoXCJ0ZXh0XCIpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNsb3RfaGVpZ2h0ICogZC5zbG90KSArIDI1O1xuXHQgICAgfSlcblx0ICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2hvd19sYWJlbCkge1xuXHRcdCAgICByZXR1cm4gZC5kaXNwbGF5X2xhYmVsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cdFx0ICAgIHJldHVybiBcIlwiO1xuICAgICAgICAgICAgICAgIH1cblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlcihmdW5jdGlvbiAoZ2VuZXMsIHhTY2FsZSkge1xuXHRnZW5lcy5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuXHQgICAgfSk7XG5cblx0Z2VuZXMuc2VsZWN0KFwidGV4dFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcblx0ICAgIH0pXG4gICAgfSk7XG5cbiAgICAvLyBhcGlqcyAoZmVhdHVyZSlcbiAgICAvLyBcdC5tZXRob2QgKHtcbiAgICAvLyBcdCAgICB0b29sdGlwIDogdG9vbHRpcFxuICAgIC8vIFx0fSk7XG5cblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudmFyIGdlbm9tZV9mZWF0dXJlcyA9IHtcbiAgICBnZW5lIDogdG50X2ZlYXR1cmVfZ2VuZSxcbiAgICBzZXF1ZW5jZSA6IHRudF9mZWF0dXJlX3NlcXVlbmNlXG59O1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZ2Vub21lX2ZlYXR1cmVzO1xuIiwidmFyIHRudF9yZXN0ID0gcmVxdWlyZShcInRudC5lbnNlbWJsXCIpO1xudmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG52YXIgdG50X2JvYXJkID0gcmVxdWlyZShcInRudC5ib2FyZFwiKTtcbnRudF9ib2FyZC50cmFjay5sYXlvdXQuZ2VuZSA9IHJlcXVpcmUoXCIuL2xheW91dC5qc1wiKTtcbnRudF9ib2FyZC50cmFjay5mZWF0dXJlLmdlbmUgPSByZXF1aXJlKFwiLi9mZWF0dXJlLmpzXCIpO1xuXG50bnRfYm9hcmRfZ2Vub21lID0gZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCJcblxuICAgIC8vIFByaXZhdGUgdmFyc1xuICAgIHZhciBlbnNfcmUgPSAvXkVOU1xcdytcXGQrJC87XG4gICAgdmFyIGVSZXN0ID0gdG50X3Jlc3QoKTtcbiAgICB2YXIgY2hyX2xlbmd0aDtcbiAgICBcbiAgICAvLyBWYXJzIGV4cG9zZWQgaW4gdGhlIEFQSVxuICAgIHZhciBjb25mID0ge1xuXHRnZW5lICAgICAgICAgICA6IHVuZGVmaW5lZCxcblx0eHJlZl9zZWFyY2ggICAgOiBmdW5jdGlvbiAoKSB7fSxcblx0ZW5zZ2VuZV9zZWFyY2ggOiBmdW5jdGlvbiAoKSB7fSxcblx0Y29udGV4dCAgICAgICAgOiAwXG4gICAgfTtcblxuICAgIHZhciBnZW5lO1xuICAgIHZhciBsaW1pdHMgPSB7XG4gICAgICAgIGxlZnQgOiAwLFxuXHRyaWdodCA6IHVuZGVmaW5lZCxcblx0em9vbV9vdXQgOiBlUmVzdC5saW1pdHMucmVnaW9uLFxuXHR6b29tX2luICA6IDIwMFxuICAgIH07XG5cbiAgICAvLyBXZSBcImluaGVyaXRcIiBmcm9tIGJvYXJkXG4gICAgdmFyIGdlbm9tZV9icm93c2VyID0gdG50X2JvYXJkKCk7XG5cbiAgICAvLyBUaGUgbG9jYXRpb24gYW5kIGF4aXMgdHJhY2tcbiAgICB2YXIgbG9jYXRpb25fdHJhY2sgPSB0bnRfYm9hcmQudHJhY2soKVxuXHQuaGVpZ2h0KDIwKVxuXHQuYmFja2dyb3VuZF9jb2xvcihcIndoaXRlXCIpXG5cdC5kYXRhKHRudF9ib2FyZC50cmFjay5kYXRhLmVtcHR5KCkpXG5cdC5kaXNwbGF5KHRudF9ib2FyZC50cmFjay5mZWF0dXJlLmxvY2F0aW9uKCkpO1xuXG4gICAgdmFyIGF4aXNfdHJhY2sgPSB0bnRfYm9hcmQudHJhY2soKVxuXHQuaGVpZ2h0KDIwKVxuXHQuYmFja2dyb3VuZF9jb2xvcihcIndoaXRlXCIpXG5cdC5kYXRhKHRudF9ib2FyZC50cmFjay5kYXRhLmVtcHR5KCkpXG5cdC5kaXNwbGF5KHRudF9ib2FyZC50cmFjay5mZWF0dXJlLmF4aXMoKSk7XG5cbiAgICBnZW5vbWVfYnJvd3NlclxuXHQuYWRkX3RyYWNrKGxvY2F0aW9uX3RyYWNrKVxuXHQuYWRkX3RyYWNrKGF4aXNfdHJhY2spO1xuXG4gICAgLy8gRGVmYXVsdCBsb2NhdGlvbjpcbiAgICBnZW5vbWVfYnJvd3NlclxuXHQuc3BlY2llcyhcImh1bWFuXCIpXG5cdC5jaHIoNylcblx0LmZyb20oMTM5NDI0OTQwKVxuXHQudG8oMTQxNzg0MTAwKTtcblxuICAgIC8vIFdlIHNhdmUgdGhlIHN0YXJ0IG1ldGhvZCBvZiB0aGUgJ3BhcmVudCcgb2JqZWN0XG4gICAgZ2Vub21lX2Jyb3dzZXIuX3N0YXJ0ID0gZ2Vub21lX2Jyb3dzZXIuc3RhcnQ7XG5cbiAgICAvLyBXZSBoaWphY2sgcGFyZW50J3Mgc3RhcnQgbWV0aG9kXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24gKHdoZXJlKSB7XG5cdGlmICh3aGVyZSAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBpZiAod2hlcmUuZ2VuZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Z2V0X2dlbmUod2hlcmUpO1xuXHRcdHJldHVybjtcblx0ICAgIH0gZWxzZSB7XG5cdFx0aWYgKHdoZXJlLnNwZWNpZXMgPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICB3aGVyZS5zcGVjaWVzID0gZ2Vub21lX2Jyb3dzZXIuc3BlY2llcygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0ICAgIGdlbm9tZV9icm93c2VyLnNwZWNpZXMod2hlcmUuc3BlY2llcyk7XG5cdFx0fVxuXHRcdGlmICh3aGVyZS5jaHIgPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICB3aGVyZS5jaHIgPSBnZW5vbWVfYnJvd3Nlci5jaHIoKTtcblx0XHR9IGVsc2Uge1xuXHRcdCAgICBnZW5vbWVfYnJvd3Nlci5jaHIod2hlcmUuY2hyKTtcblx0XHR9XG5cdFx0aWYgKHdoZXJlLmZyb20gPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICB3aGVyZS5mcm9tID0gZ2Vub21lX2Jyb3dzZXIuZnJvbSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0ICAgIGdlbm9tZV9icm93c2VyLmZyb20od2hlcmUuZnJvbSlcblx0XHR9XG5cdFx0aWYgKHdoZXJlLnRvID09PSB1bmRlZmluZWQpIHtcblx0XHQgICAgd2hlcmUudG8gPSBnZW5vbWVfYnJvd3Nlci50bygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0ICAgIGdlbm9tZV9icm93c2VyLnRvKHdoZXJlLnRvKTtcblx0XHR9XG5cdCAgICB9XG5cdH0gZWxzZSB7IC8vIFwid2hlcmVcIiBpcyB1bmRlZiBzbyBsb29rIGZvciBnZW5lIG9yIGxvY1xuXHQgICAgaWYgKGdlbm9tZV9icm93c2VyLmdlbmUoKSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Z2V0X2dlbmUoeyBzcGVjaWVzIDogZ2Vub21lX2Jyb3dzZXIuc3BlY2llcygpLFxuXHRcdFx0ICAgZ2VuZSAgICA6IGdlbm9tZV9icm93c2VyLmdlbmUoKVxuXHRcdFx0IH0pO1xuXHRcdHJldHVybjtcblx0ICAgIH0gZWxzZSB7XG5cdFx0d2hlcmUgPSB7fTtcblx0XHR3aGVyZS5zcGVjaWVzID0gZ2Vub21lX2Jyb3dzZXIuc3BlY2llcygpLFxuXHRcdHdoZXJlLmNociAgICAgPSBnZW5vbWVfYnJvd3Nlci5jaHIoKSxcblx0XHR3aGVyZS5mcm9tICAgID0gZ2Vub21lX2Jyb3dzZXIuZnJvbSgpLFxuXHRcdHdoZXJlLnRvICAgICAgPSBnZW5vbWVfYnJvd3Nlci50bygpXG5cdCAgICB9XG5cdH1cblxuXHRnZW5vbWVfYnJvd3Nlci5yaWdodCAoZnVuY3Rpb24gKGRvbmUpIHtcblx0ICAgIC8vIEdldCB0aGUgY2hyb21vc29tZSBsZW5ndGggYW5kIHVzZSBpdCBhcyB0aGUgJ3JpZ2h0JyBsaW1pdFxuXHQgICAgZ2Vub21lX2Jyb3dzZXIuem9vbV9pbiAobGltaXRzLnpvb21faW4pO1xuXHQgICAgZ2Vub21lX2Jyb3dzZXIuem9vbV9vdXQgKGxpbWl0cy56b29tX291dCk7XG5cblx0ICAgIHZhciB1cmwgPSBlUmVzdC51cmwuY2hyX2luZm8gKHtcblx0XHRzcGVjaWVzIDogd2hlcmUuc3BlY2llcyxcblx0XHRjaHIgICAgIDogd2hlcmUuY2hyXG5cdCAgICB9KTtcblxuXHQgICAgZVJlc3QuY2FsbCAodXJsKVxuXHRcdC50aGVuKCBmdW5jdGlvbiAocmVzcCkge1xuXHRcdCAgICBkb25lKHJlc3AuYm9keS5sZW5ndGgpO1xuXHRcdH0pO1xuXHR9KTtcblx0Z2Vub21lX2Jyb3dzZXIuX3N0YXJ0KCk7XG4gICAgfTtcblxuICAgIHZhciBob21vbG9ndWVzID0gZnVuY3Rpb24gKGVuc0dlbmUsIGNhbGxiYWNrKSAge1xuXHR2YXIgdXJsID0gZVJlc3QudXJsLmhvbW9sb2d1ZXMgKHtpZCA6IGVuc0dlbmV9KVxuXHRlUmVzdC5jYWxsKHVybClcblx0ICAgIC50aGVuIChmdW5jdGlvbihyZXNwKSB7XG5cdFx0dmFyIGhvbW9sb2d1ZXMgPSByZXNwLmJvZHkuZGF0YVswXS5ob21vbG9naWVzO1xuXHRcdGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0ICAgIHZhciBob21vbG9ndWVzX29iaiA9IHNwbGl0X2hvbW9sb2d1ZXMoaG9tb2xvZ3Vlcylcblx0XHQgICAgY2FsbGJhY2soaG9tb2xvZ3Vlc19vYmopO1xuXHRcdH1cblx0ICAgIH0pO1xuICAgIH1cblxuICAgIHZhciBpc0Vuc2VtYmxHZW5lID0gZnVuY3Rpb24odGVybSkge1xuXHRpZiAodGVybS5tYXRjaChlbnNfcmUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZ2V0X2dlbmUgPSBmdW5jdGlvbiAod2hlcmUpIHtcblx0aWYgKGlzRW5zZW1ibEdlbmUod2hlcmUuZ2VuZSkpIHtcblx0ICAgIGdldF9lbnNHZW5lKHdoZXJlLmdlbmUpXG5cdH0gZWxzZSB7XG5cdCAgICB2YXIgdXJsID0gZVJlc3QudXJsLnhyZWYgKHtcblx0XHRzcGVjaWVzIDogd2hlcmUuc3BlY2llcyxcblx0XHRuYW1lICAgIDogd2hlcmUuZ2VuZSBcblx0ICAgIH0pO1xuXHQgICAgZVJlc3QuY2FsbCh1cmwpXG5cdFx0LnRoZW4gKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHQgICAgdmFyIGRhdGEgPSByZXNwLmJvZHk7XG5cdFx0ICAgIGRhdGEgPSBkYXRhLmZpbHRlcihmdW5jdGlvbihkKSB7XG5cdFx0XHRyZXR1cm4gIWQuaWQuaW5kZXhPZihcIkVOU1wiKTtcblx0XHQgICAgfSk7XG5cdFx0ICAgIGlmIChkYXRhWzBdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGNvbmYueHJlZl9zZWFyY2gocmVzcCk7XG5cdFx0XHRnZXRfZW5zR2VuZShkYXRhWzBdLmlkKVxuXHRcdCAgICB9IGVsc2Uge1xuXHRcdFx0Z2Vub21lX2Jyb3dzZXIuc3RhcnQoKTtcblx0XHQgICAgfVxuXHRcdH0pO1xuXHR9XG4gICAgfTtcblxuICAgIHZhciBnZXRfZW5zR2VuZSA9IGZ1bmN0aW9uIChpZCkge1xuXHR2YXIgdXJsID0gZVJlc3QudXJsLmdlbmUgKHtpZCA6IGlkfSlcblx0ZVJlc3QuY2FsbCh1cmwpXG5cdCAgICAudGhlbiAoZnVuY3Rpb24ocmVzcCkge1xuXHRcdHZhciBkYXRhID0gcmVzcC5ib2R5O1xuXHRcdGNvbmYuZW5zZ2VuZV9zZWFyY2goZGF0YSk7XG5cdFx0dmFyIGV4dHJhID0gfn4oKGRhdGEuZW5kIC0gZGF0YS5zdGFydCkgKiAoY29uZi5jb250ZXh0LzEwMCkpO1xuXHRcdGNvbnNvbGUubG9nKGRhdGEpO1xuXHRcdGdlbm9tZV9icm93c2VyXG5cdFx0ICAgIC5zcGVjaWVzKGRhdGEuc3BlY2llcylcblx0XHQgICAgLmNocihkYXRhLnNlcV9yZWdpb25fbmFtZSlcblx0XHQgICAgLmZyb20oZGF0YS5zdGFydCAtIGV4dHJhKVxuXHRcdCAgICAudG8oZGF0YS5lbmQgKyBleHRyYSk7XG5cblx0XHRnZW5vbWVfYnJvd3Nlci5zdGFydCggeyBzcGVjaWVzIDogZGF0YS5zcGVjaWVzLFxuXHRcdFx0XHRcdGNociAgICAgOiBkYXRhLnNlcV9yZWdpb25fbmFtZSxcblx0XHRcdFx0XHRmcm9tICAgIDogZGF0YS5zdGFydCAtIGV4dHJhLFxuXHRcdFx0XHRcdHRvICAgICAgOiBkYXRhLmVuZCArIGV4dHJhXG5cdFx0XHRcdCAgICAgIH0gKTtcblx0ICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgc3BsaXRfaG9tb2xvZ3VlcyA9IGZ1bmN0aW9uIChob21vbG9ndWVzKSB7XG5cdHZhciBvcnRob1BhdHQgPSAvb3J0aG9sb2cvO1xuXHR2YXIgcGFyYVBhdHQgPSAvcGFyYWxvZy87XG5cblx0dmFyIG9ydGhvbG9ndWVzID0gaG9tb2xvZ3Vlcy5maWx0ZXIoZnVuY3Rpb24oZCl7cmV0dXJuIGQudHlwZS5tYXRjaChvcnRob1BhdHQpfSk7XG5cdHZhciBwYXJhbG9ndWVzICA9IGhvbW9sb2d1ZXMuZmlsdGVyKGZ1bmN0aW9uKGQpe3JldHVybiBkLnR5cGUubWF0Y2gocGFyYVBhdHQpfSk7XG5cblx0cmV0dXJuIHsnb3J0aG9sb2d1ZXMnIDogb3J0aG9sb2d1ZXMsXG5cdFx0J3BhcmFsb2d1ZXMnICA6IHBhcmFsb2d1ZXN9O1xuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMoZ2Vub21lX2Jyb3dzZXIpXG5cdC5nZXRzZXQgKGNvbmYpXG5cdC5tZXRob2QoXCJ6b29tX2luXCIsIGZ1bmN0aW9uICh2KSB7XG5cdCAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gbGltaXRzLnpvb21faW47XG5cdCAgICB9XG5cdCAgICBsaW1pdHMuem9vbV9pbiA9IHY7XG5cdCAgICByZXR1cm4gdGhpcztcblx0fSk7XG5cbiAgICBhcGkubWV0aG9kICh7XG5cdHN0YXJ0ICAgICAgOiBzdGFydCxcblx0aG9tb2xvZ3VlcyA6IGhvbW9sb2d1ZXNcbiAgICB9KTtcblxuICAgIHJldHVybiBnZW5vbWVfYnJvd3Nlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRudF9ib2FyZF9nZW5vbWU7XG4iLCJ2YXIgYm9hcmQgPSByZXF1aXJlKFwidG50LmJvYXJkXCIpO1xuYm9hcmQuZ2Vub21lID0gcmVxdWlyZShcIi4vZ2Vub21lXCIpO1xuYm9hcmQudHJhY2subGF5b3V0LmZlYXR1cmUgPSByZXF1aXJlKFwiLi9sYXlvdXRcIik7XG5ib2FyZC50cmFjay5mZWF0dXJlLmdlbm9tZSA9IHJlcXVpcmUoXCIuL2ZlYXR1cmVcIik7XG5ib2FyZC50cmFjay5kYXRhLmdlbm9tZSA9IHJlcXVpcmUoXCIuL2RhdGFcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGJvYXJkO1xuXG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG5cbi8vIFRoZSBvdmVybGFwIGRldGVjdG9yIHVzZWQgZm9yIGdlbmVzXG52YXIgZ2VuZV9sYXlvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBQcml2YXRlIHZhcnNcbiAgICB2YXIgbWF4X3Nsb3RzO1xuXG4gICAgLy8gdmFycyBleHBvc2VkIGluIHRoZSBBUEk6XG4gICAgdmFyIGNvbmYgPSB7XG5cdGhlaWdodCAgIDogMTUwLFxuXHRzY2FsZSAgICA6IHVuZGVmaW5lZFxuICAgIH07XG5cbiAgICB2YXIgY29uZl9ybyA9IHtcblx0ZWxlbWVudHMgOiBbXVxuICAgIH07XG5cbiAgICB2YXIgc2xvdF90eXBlcyA9IHtcblx0J2V4cGFuZGVkJyAgIDoge1xuXHQgICAgc2xvdF9oZWlnaHQgOiAzMCxcblx0ICAgIGdlbmVfaGVpZ2h0IDogMTAsXG5cdCAgICBzaG93X2xhYmVsICA6IHRydWVcblx0fSxcblx0J2NvbGxhcHNlZCcgOiB7XG5cdCAgICBzbG90X2hlaWdodCA6IDEwLFxuXHQgICAgZ2VuZV9oZWlnaHQgOiA3LFxuXHQgICAgc2hvd19sYWJlbCAgOiBmYWxzZVxuXHR9XG4gICAgfTtcbiAgICB2YXIgY3VycmVudF9zbG90X3R5cGUgPSAnZXhwYW5kZWQnO1xuXG4gICAgLy8gVGhlIHJldHVybmVkIGNsb3N1cmUgLyBvYmplY3RcbiAgICB2YXIgZ2VuZXNfbGF5b3V0ID0gZnVuY3Rpb24gKG5ld19nZW5lcywgc2NhbGUpIHtcblxuXHQvLyBXZSBtYWtlIHN1cmUgdGhhdCB0aGUgZ2VuZXMgaGF2ZSBuYW1lXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbmV3X2dlbmVzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAobmV3X2dlbmVzW2ldLmV4dGVybmFsX25hbWUgPT09IG51bGwpIHtcblx0XHRuZXdfZ2VuZXNbaV0uZXh0ZXJuYWxfbmFtZSA9IFwiXCI7XG5cdCAgICB9XG5cdH1cblxuXHRtYXhfc2xvdHMgPSB+fihjb25mLmhlaWdodCAvIHNsb3RfdHlwZXMuZXhwYW5kZWQuc2xvdF9oZWlnaHQpIC0gMTtcblxuXHRpZiAoc2NhbGUgIT09IHVuZGVmaW5lZCkge1xuXHQgICAgZ2VuZXNfbGF5b3V0LnNjYWxlKHNjYWxlKTtcblx0fVxuXG5cdHNsb3Rfa2VlcGVyKG5ld19nZW5lcywgY29uZl9yby5lbGVtZW50cyk7XG5cdHZhciBuZWVkZWRfc2xvdHMgPSBjb2xsaXRpb25fZGV0ZWN0b3IobmV3X2dlbmVzKTtcblx0aWYgKG5lZWRlZF9zbG90cyA+IG1heF9zbG90cykge1xuXHQgICAgY3VycmVudF9zbG90X3R5cGUgPSAnY29sbGFwc2VkJztcblx0fSBlbHNlIHtcblx0ICAgIGN1cnJlbnRfc2xvdF90eXBlID0gJ2V4cGFuZGVkJztcblx0fVxuXG5cdGNvbmZfcm8uZWxlbWVudHMgPSBuZXdfZ2VuZXM7XG4gICAgfTtcblxuICAgIHZhciBnZW5lX3Nsb3QgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiBzbG90X3R5cGVzW2N1cnJlbnRfc2xvdF90eXBlXTtcbiAgICB9O1xuXG4gICAgdmFyIGNvbGxpdGlvbl9kZXRlY3RvciA9IGZ1bmN0aW9uIChnZW5lcykge1xuXHR2YXIgZ2VuZXNfcGxhY2VkID0gW107XG5cdHZhciBnZW5lc190b19wbGFjZSA9IGdlbmVzO1xuXHR2YXIgbmVlZGVkX3Nsb3RzID0gMDtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBnZW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGdlbmVzW2ldLnNsb3QgPiBuZWVkZWRfc2xvdHMgJiYgZ2VuZXNbaV0uc2xvdCA8IG1heF9zbG90cykge1xuXHRcdG5lZWRlZF9zbG90cyA9IGdlbmVzW2ldLnNsb3RcbiAgICAgICAgICAgIH1cblx0fVxuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXNfdG9fcGxhY2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBnZW5lc19ieV9zbG90ID0gc29ydF9nZW5lc19ieV9zbG90KGdlbmVzX3BsYWNlZCk7XG5cdCAgICB2YXIgdGhpc19nZW5lID0gZ2VuZXNfdG9fcGxhY2VbaV07XG5cdCAgICBpZiAodGhpc19nZW5lLnNsb3QgIT09IHVuZGVmaW5lZCAmJiB0aGlzX2dlbmUuc2xvdCA8IG1heF9zbG90cykge1xuXHRcdGlmIChzbG90X2hhc19zcGFjZSh0aGlzX2dlbmUsIGdlbmVzX2J5X3Nsb3RbdGhpc19nZW5lLnNsb3RdKSkge1xuXHRcdCAgICBnZW5lc19wbGFjZWQucHVzaCh0aGlzX2dlbmUpO1xuXHRcdCAgICBjb250aW51ZTtcblx0XHR9XG5cdCAgICB9XG4gICAgICAgICAgICB2YXIgc2xvdCA9IDA7XG4gICAgICAgICAgICBPVVRFUjogd2hpbGUgKHRydWUpIHtcblx0XHRpZiAoc2xvdF9oYXNfc3BhY2UodGhpc19nZW5lLCBnZW5lc19ieV9zbG90W3Nsb3RdKSkge1xuXHRcdCAgICB0aGlzX2dlbmUuc2xvdCA9IHNsb3Q7XG5cdFx0ICAgIGdlbmVzX3BsYWNlZC5wdXNoKHRoaXNfZ2VuZSk7XG5cdFx0ICAgIGlmIChzbG90ID4gbmVlZGVkX3Nsb3RzKSB7XG5cdFx0XHRuZWVkZWRfc2xvdHMgPSBzbG90O1xuXHRcdCAgICB9XG5cdFx0ICAgIGJyZWFrO1xuXHRcdH1cblx0XHRzbG90Kys7XG5cdCAgICB9XG5cdH1cblx0cmV0dXJuIG5lZWRlZF9zbG90cyArIDE7XG4gICAgfTtcblxuICAgIHZhciBzbG90X2hhc19zcGFjZSA9IGZ1bmN0aW9uIChxdWVyeV9nZW5lLCBnZW5lc19pbl90aGlzX3Nsb3QpIHtcblx0aWYgKGdlbmVzX2luX3RoaXNfc2xvdCA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICByZXR1cm4gdHJ1ZTtcblx0fVxuXHRmb3IgKHZhciBqID0gMDsgaiA8IGdlbmVzX2luX3RoaXNfc2xvdC5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgdmFyIHN1YmpfZ2VuZSA9IGdlbmVzX2luX3RoaXNfc2xvdFtqXTtcblx0ICAgIGlmIChxdWVyeV9nZW5lLmlkID09PSBzdWJqX2dlbmUuaWQpIHtcblx0XHRjb250aW51ZTtcblx0ICAgIH1cbiAgICAgICAgICAgIHZhciB5X2xhYmVsX2VuZCA9IHN1YmpfZ2VuZS5kaXNwbGF5X2xhYmVsLmxlbmd0aCAqIDggKyBjb25mLnNjYWxlKHN1YmpfZ2VuZS5zdGFydCk7IC8vIFRPRE86IEl0IG1heSBiZSBiZXR0ZXIgdG8gaGF2ZSBhIGZpeGVkIGZvbnQgc2l6ZSAoaW5zdGVhZCBvZiB0aGUgaGFyZGNvZGVkIDE2KT9cbiAgICAgICAgICAgIHZhciB5MSAgPSBjb25mLnNjYWxlKHN1YmpfZ2VuZS5zdGFydCk7XG4gICAgICAgICAgICB2YXIgeTIgID0gY29uZi5zY2FsZShzdWJqX2dlbmUuZW5kKSA+IHlfbGFiZWxfZW5kID8gY29uZi5zY2FsZShzdWJqX2dlbmUuZW5kKSA6IHlfbGFiZWxfZW5kO1xuXHQgICAgdmFyIHhfbGFiZWxfZW5kID0gcXVlcnlfZ2VuZS5kaXNwbGF5X2xhYmVsLmxlbmd0aCAqIDggKyBjb25mLnNjYWxlKHF1ZXJ5X2dlbmUuc3RhcnQpO1xuICAgICAgICAgICAgdmFyIHgxID0gY29uZi5zY2FsZShxdWVyeV9nZW5lLnN0YXJ0KTtcbiAgICAgICAgICAgIHZhciB4MiA9IGNvbmYuc2NhbGUocXVlcnlfZ2VuZS5lbmQpID4geF9sYWJlbF9lbmQgPyBjb25mLnNjYWxlKHF1ZXJ5X2dlbmUuZW5kKSA6IHhfbGFiZWxfZW5kO1xuICAgICAgICAgICAgaWYgKCAoKHgxIDwgeTEpICYmICh4MiA+IHkxKSkgfHxcblx0XHQgKCh4MSA+IHkxKSAmJiAoeDEgPCB5MikpICkge1xuXHRcdHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblx0fVxuXHRyZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgdmFyIHNsb3Rfa2VlcGVyID0gZnVuY3Rpb24gKGdlbmVzLCBwcmV2X2dlbmVzKSB7XG5cdHZhciBwcmV2X2dlbmVzX3Nsb3RzID0gZ2VuZXMyc2xvdHMocHJldl9nZW5lcyk7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBnZW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHByZXZfZ2VuZXNfc2xvdHNbZ2VuZXNbaV0uaWRdICE9PSB1bmRlZmluZWQpIHtcblx0XHRnZW5lc1tpXS5zbG90ID0gcHJldl9nZW5lc19zbG90c1tnZW5lc1tpXS5pZF07XG4gICAgICAgICAgICB9XG5cdH1cbiAgICB9O1xuXG4gICAgdmFyIGdlbmVzMnNsb3RzID0gZnVuY3Rpb24gKGdlbmVzX2FycmF5KSB7XG5cdHZhciBoYXNoID0ge307XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXNfYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBnZW5lID0gZ2VuZXNfYXJyYXlbaV07XG4gICAgICAgICAgICBoYXNoW2dlbmUuaWRdID0gZ2VuZS5zbG90O1xuXHR9XG5cdHJldHVybiBoYXNoO1xuICAgIH1cblxuICAgIHZhciBzb3J0X2dlbmVzX2J5X3Nsb3QgPSBmdW5jdGlvbiAoZ2VuZXMpIHtcblx0dmFyIHNsb3RzID0gW107XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChzbG90c1tnZW5lc1tpXS5zbG90XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0c2xvdHNbZ2VuZXNbaV0uc2xvdF0gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNsb3RzW2dlbmVzW2ldLnNsb3RdLnB1c2goZ2VuZXNbaV0pO1xuXHR9XG5cdHJldHVybiBzbG90cztcbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzIChnZW5lc19sYXlvdXQpXG5cdC5nZXRzZXQgKGNvbmYpXG5cdC5nZXQgKGNvbmZfcm8pXG5cdC5tZXRob2QgKHtcblx0ICAgIGdlbmVfc2xvdCA6IGdlbmVfc2xvdFxuXHR9KTtcblxuICAgIHJldHVybiBnZW5lc19sYXlvdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBnZW5lX2xheW91dDtcbiIsIm1vZHVsZS5leHBvcnRzID0gdG9vbHRpcCA9IHJlcXVpcmUoXCIuL3NyYy90b29sdGlwLmpzXCIpO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG5cbnZhciB0b29sdGlwID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIGRyYWcgPSBkMy5iZWhhdmlvci5kcmFnKCk7XG4gICAgdmFyIHRvb2x0aXBfZGl2O1xuXG4gICAgdmFyIGNvbmYgPSB7XG5cdGJhY2tncm91bmRfY29sb3IgOiBcIndoaXRlXCIsXG5cdGZvcmVncm91bmRfY29sb3IgOiBcImJsYWNrXCIsXG5cdHBvc2l0aW9uIDogXCJyaWdodFwiLFxuXHRhbGxvd19kcmFnIDogdHJ1ZSxcblx0c2hvd19jbG9zZXIgOiB0cnVlLFxuXHRmaWxsIDogZnVuY3Rpb24gKCkgeyB0aHJvdyBcImZpbGwgaXMgbm90IGRlZmluZWQgaW4gdGhlIGJhc2Ugb2JqZWN0XCI7IH0sXG5cdHdpZHRoIDogMTgwLFxuXHRpZCA6IDFcbiAgICB9O1xuXG4gICAgdmFyIHQgPSBmdW5jdGlvbiAoZGF0YSwgZXZlbnQpIHtcblx0ZHJhZ1xuXHQgICAgLm9yaWdpbihmdW5jdGlvbigpe1xuXHRcdHJldHVybiB7eDpwYXJzZUludChkMy5zZWxlY3QodGhpcykuc3R5bGUoXCJsZWZ0XCIpKSxcblx0XHRcdHk6cGFyc2VJbnQoZDMuc2VsZWN0KHRoaXMpLnN0eWxlKFwidG9wXCIpKVxuXHRcdCAgICAgICB9O1xuXHQgICAgfSlcblx0ICAgIC5vbihcImRyYWdcIiwgZnVuY3Rpb24oKSB7XG5cdFx0aWYgKGNvbmYuYWxsb3dfZHJhZykge1xuXHRcdCAgICBkMy5zZWxlY3QodGhpcylcblx0XHRcdC5zdHlsZShcImxlZnRcIiwgZDMuZXZlbnQueCArIFwicHhcIilcblx0XHRcdC5zdHlsZShcInRvcFwiLCBkMy5ldmVudC55ICsgXCJweFwiKTtcblx0XHR9XG5cdCAgICB9KTtcblxuXHQvLyBUT0RPOiBXaHkgZG8gd2UgbmVlZCB0aGUgZGl2IGVsZW1lbnQ/XG5cdC8vIEl0IGxvb2tzIGxpa2UgaWYgd2UgYW5jaG9yIHRoZSB0b29sdGlwIGluIHRoZSBcImJvZHlcIlxuXHQvLyBUaGUgdG9vbHRpcCBpcyBub3QgbG9jYXRlZCBpbiB0aGUgcmlnaHQgcGxhY2UgKGFwcGVhcnMgYXQgdGhlIGJvdHRvbSlcblx0Ly8gU2VlIGNsaWVudHMvdG9vbHRpcHNfdGVzdC5odG1sIGZvciBhbiBleGFtcGxlXG5cdHZhciBjb250YWluZXJFbGVtID0gc2VsZWN0QW5jZXN0b3IgKHRoaXMsIFwiZGl2XCIpO1xuXHRpZiAoY29udGFpbmVyRWxlbSA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICAvLyBXZSByZXF1aXJlIGEgZGl2IGVsZW1lbnQgYXQgc29tZSBwb2ludCB0byBhbmNob3IgdGhlIHRvb2x0aXBcblx0ICAgIHJldHVybjtcblx0fVxuXG5cdHRvb2x0aXBfZGl2ID0gZDMuc2VsZWN0KGNvbnRhaW5lckVsZW0pXG5cdCAgICAuYXBwZW5kKFwiZGl2XCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3Rvb2x0aXBcIilcblx0ICAgIC5jbGFzc2VkKFwidG50X3Rvb2x0aXBfYWN0aXZlXCIsIHRydWUpICAvLyBUT0RPOiBJcyB0aGlzIG5lZWRlZC91c2VkPz8/XG5cdCAgICAuY2FsbChkcmFnKTtcblxuXHQvLyBwcmV2IHRvb2x0aXBzIHdpdGggdGhlIHNhbWUgaGVhZGVyXG5cdGQzLnNlbGVjdChcIiN0bnRfdG9vbHRpcF9cIiArIGNvbmYuaWQpLnJlbW92ZSgpO1xuXG5cdGlmICgoZDMuZXZlbnQgPT09IG51bGwpICYmIChldmVudCkpIHtcblx0ICAgIGQzLmV2ZW50ID0gZXZlbnQ7XG5cdH1cblx0dmFyIGQzbW91c2UgPSBkMy5tb3VzZShjb250YWluZXJFbGVtKTtcblx0ZDMuZXZlbnQgPSBudWxsO1xuXG5cdHZhciBvZmZzZXQgPSAwO1xuXHRpZiAoY29uZi5wb3NpdGlvbiA9PT0gXCJsZWZ0XCIpIHtcblx0ICAgIG9mZnNldCA9IGNvbmYud2lkdGg7XG5cdH1cblx0XG5cdHRvb2x0aXBfZGl2LmF0dHIoXCJpZFwiLCBcInRudF90b29sdGlwX1wiICsgY29uZi5pZCk7XG5cdFxuXHQvLyBXZSBwbGFjZSB0aGUgdG9vbHRpcFxuXHR0b29sdGlwX2RpdlxuXHQgICAgLnN0eWxlKFwibGVmdFwiLCAoZDNtb3VzZVswXSkgKyBcInB4XCIpXG5cdCAgICAuc3R5bGUoXCJ0b3BcIiwgKGQzbW91c2VbMV0pICsgXCJweFwiKTtcblxuXHQvLyBDbG9zZVxuXHRpZiAoY29uZi5zaG93X2Nsb3Nlcikge1xuXHQgICAgdG9vbHRpcF9kaXYuYXBwZW5kKFwic3BhblwiKVxuXHRcdC5zdHlsZShcInBvc2l0aW9uXCIsIFwiYWJzb2x1dGVcIilcblx0XHQuc3R5bGUoXCJyaWdodFwiLCBcIi0xMHB4XCIpXG5cdFx0LnN0eWxlKFwidG9wXCIsIFwiLTEwcHhcIilcblx0XHQuYXBwZW5kKFwiaW1nXCIpXG5cdFx0LmF0dHIoXCJzcmNcIiwgdG9vbHRpcC5pbWFnZXMuY2xvc2UpXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCBcIjIwcHhcIilcblx0XHQuYXR0cihcImhlaWdodFwiLCBcIjIwcHhcIilcblx0XHQub24oXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XG5cdFx0ICAgIHQuY2xvc2UoKTtcblx0XHR9KTtcblx0fVxuXG5cdGNvbmYuZmlsbC5jYWxsKHRvb2x0aXBfZGl2LCBkYXRhKTtcblxuXHQvLyByZXR1cm4gdGhpcyBoZXJlP1xuXHRyZXR1cm4gdDtcbiAgICB9O1xuXG4gICAgLy8gZ2V0cyB0aGUgZmlyc3QgYW5jZXN0b3Igb2YgZWxlbSBoYXZpbmcgdGFnbmFtZSBcInR5cGVcIlxuICAgIC8vIGV4YW1wbGUgOiB2YXIgbXlkaXYgPSBzZWxlY3RBbmNlc3RvcihteWVsZW0sIFwiZGl2XCIpO1xuICAgIGZ1bmN0aW9uIHNlbGVjdEFuY2VzdG9yIChlbGVtLCB0eXBlKSB7XG5cdHR5cGUgPSB0eXBlLnRvTG93ZXJDYXNlKCk7XG5cdGlmIChlbGVtLnBhcmVudE5vZGUgPT09IG51bGwpIHtcblx0ICAgIGNvbnNvbGUubG9nKFwiTm8gbW9yZSBwYXJlbnRzXCIpO1xuXHQgICAgcmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXHR2YXIgdGFnTmFtZSA9IGVsZW0ucGFyZW50Tm9kZS50YWdOYW1lO1xuXG5cdGlmICgodGFnTmFtZSAhPT0gdW5kZWZpbmVkKSAmJiAodGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSB0eXBlKSkge1xuXHQgICAgcmV0dXJuIGVsZW0ucGFyZW50Tm9kZTtcblx0fSBlbHNlIHtcblx0ICAgIHJldHVybiBzZWxlY3RBbmNlc3RvciAoZWxlbS5wYXJlbnROb2RlLCB0eXBlKTtcblx0fVxuICAgIH1cbiAgICBcbiAgICB2YXIgYXBpID0gYXBpanModClcblx0LmdldHNldChjb25mKTtcbiAgICBhcGkuY2hlY2soJ3Bvc2l0aW9uJywgZnVuY3Rpb24gKHZhbCkge1xuXHRyZXR1cm4gKHZhbCA9PT0gJ2xlZnQnKSB8fCAodmFsID09PSAncmlnaHQnKTtcbiAgICB9LCBcIk9ubHkgJ2xlZnQnIG9yICdyaWdodCcgdmFsdWVzIGFyZSBhbGxvd2VkIGZvciBwb3NpdGlvblwiKTtcblxuICAgIGFwaS5tZXRob2QoJ2Nsb3NlJywgZnVuY3Rpb24gKCkge1xuXHR0b29sdGlwX2Rpdi5yZW1vdmUoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0O1xufTtcblxudG9vbHRpcC5saXN0ID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGxpc3QgdG9vbHRpcCBpcyBiYXNlZCBvbiBnZW5lcmFsIHRvb2x0aXBzXG4gICAgdmFyIHQgPSB0b29sdGlwKCk7XG4gICAgdmFyIHdpZHRoID0gMTgwO1xuXG4gICAgdC5maWxsIChmdW5jdGlvbiAob2JqKSB7XG5cdHZhciB0b29sdGlwX2RpdiA9IHRoaXM7XG5cdHZhciBvYmpfaW5mb19saXN0ID0gdG9vbHRpcF9kaXZcblx0ICAgIC5hcHBlbmQoXCJ0YWJsZVwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudVwiKVxuXHQgICAgLmF0dHIoXCJib3JkZXJcIiwgXCJzb2xpZFwiKVxuXHQgICAgLnN0eWxlKFwid2lkdGhcIiwgdC53aWR0aCgpICsgXCJweFwiKTtcblxuXHQvLyBUb29sdGlwIGhlYWRlclxuXHRvYmpfaW5mb19saXN0XG5cdCAgICAuYXBwZW5kKFwidHJcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfaGVhZGVyXCIpXG5cdCAgICAuYXBwZW5kKFwidGhcIilcblx0ICAgIC50ZXh0KG9iai5oZWFkZXIpO1xuXG5cdC8vIFRvb2x0aXAgcm93c1xuXHR2YXIgdGFibGVfcm93cyA9IG9ial9pbmZvX2xpc3Quc2VsZWN0QWxsKFwiLnRudF96bWVudV9yb3dcIilcblx0ICAgIC5kYXRhKG9iai5yb3dzKVxuXHQgICAgLmVudGVyKClcblx0ICAgIC5hcHBlbmQoXCJ0clwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9yb3dcIik7XG5cblx0dGFibGVfcm93c1xuXHQgICAgLmFwcGVuZChcInRkXCIpXG5cdCAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsIFwiY2VudGVyXCIpXG5cdCAgICAuaHRtbChmdW5jdGlvbihkLGkpIHtcblx0XHRyZXR1cm4gb2JqLnJvd3NbaV0udmFsdWU7XG5cdCAgICB9KVxuXHQgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcblx0XHRpZiAoZC5saW5rID09PSB1bmRlZmluZWQpIHtcblx0XHQgICAgcmV0dXJuO1xuXHRcdH1cblx0XHRkMy5zZWxlY3QodGhpcylcblx0XHQgICAgLmNsYXNzZWQoXCJsaW5rXCIsIDEpXG5cdFx0ICAgIC5vbignY2xpY2snLCBmdW5jdGlvbiAoZCkge1xuXHRcdFx0ZC5saW5rKGQub2JqKTtcblx0XHRcdHQuY2xvc2UuY2FsbCh0aGlzKTtcblx0XHQgICAgfSk7XG5cdCAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gdDtcbn07XG5cbnRvb2x0aXAudGFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gdGFibGUgdG9vbHRpcHMgYXJlIGJhc2VkIG9uIGdlbmVyYWwgdG9vbHRpcHNcbiAgICB2YXIgdCA9IHRvb2x0aXAoKTtcbiAgICBcbiAgICB2YXIgd2lkdGggPSAxODA7XG5cbiAgICB0LmZpbGwgKGZ1bmN0aW9uIChvYmopIHtcblx0dmFyIHRvb2x0aXBfZGl2ID0gdGhpcztcblxuXHR2YXIgb2JqX2luZm9fdGFibGUgPSB0b29sdGlwX2RpdlxuXHQgICAgLmFwcGVuZChcInRhYmxlXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51XCIpXG5cdCAgICAuYXR0cihcImJvcmRlclwiLCBcInNvbGlkXCIpXG5cdCAgICAuc3R5bGUoXCJ3aWR0aFwiLCB0LndpZHRoKCkgKyBcInB4XCIpO1xuXG5cdC8vIFRvb2x0aXAgaGVhZGVyXG5cdG9ial9pbmZvX3RhYmxlXG5cdCAgICAuYXBwZW5kKFwidHJcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfaGVhZGVyXCIpXG5cdCAgICAuYXBwZW5kKFwidGhcIilcblx0ICAgIC5hdHRyKFwiY29sc3BhblwiLCAyKVxuXHQgICAgLnRleHQob2JqLmhlYWRlcik7XG5cblx0Ly8gVG9vbHRpcCByb3dzXG5cdHZhciB0YWJsZV9yb3dzID0gb2JqX2luZm9fdGFibGUuc2VsZWN0QWxsKFwiLnRudF96bWVudV9yb3dcIilcblx0ICAgIC5kYXRhKG9iai5yb3dzKVxuXHQgICAgLmVudGVyKClcblx0ICAgIC5hcHBlbmQoXCJ0clwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9yb3dcIik7XG5cblx0dGFibGVfcm93c1xuXHQgICAgLmFwcGVuZChcInRoXCIpXG5cdCAgICAuYXR0cihcImNvbHNwYW5cIiwgZnVuY3Rpb24gKGQsIGkpIHtcblx0XHRpZiAoZC52YWx1ZSA9PT0gXCJcIikge1xuXHRcdCAgICByZXR1cm4gMjtcblx0XHR9XG5cdFx0cmV0dXJuIDE7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbiAoZCkge1xuXHRcdGlmIChkLnZhbHVlID09PSBcIlwiKSB7XG5cdFx0ICAgIHJldHVybiBcInRudF96bWVudV9pbm5lcl9oZWFkZXJcIjtcblx0XHR9XG5cdFx0cmV0dXJuIFwidG50X3ptZW51X2NlbGxcIjtcblx0ICAgIH0pXG5cdCAgICAuaHRtbChmdW5jdGlvbihkLGkpIHtcblx0XHRyZXR1cm4gb2JqLnJvd3NbaV0ubGFiZWw7XG5cdCAgICB9KTtcblxuXHR0YWJsZV9yb3dzXG5cdCAgICAuYXBwZW5kKFwidGRcIilcblx0ICAgIC5odG1sKGZ1bmN0aW9uKGQsaSkge1xuXHRcdGlmICh0eXBlb2Ygb2JqLnJvd3NbaV0udmFsdWUgPT09ICdmdW5jdGlvbicpIHtcblx0XHQgICAgb2JqLnJvd3NbaV0udmFsdWUuY2FsbCh0aGlzLCBkKTtcblx0XHR9IGVsc2Uge1xuXHRcdCAgICByZXR1cm4gb2JqLnJvd3NbaV0udmFsdWU7XG5cdFx0fVxuXHQgICAgfSlcblx0ICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG5cdFx0aWYgKGQudmFsdWUgPT09IFwiXCIpIHtcblx0XHQgICAgZDMuc2VsZWN0KHRoaXMpLnJlbW92ZSgpO1xuXHRcdH1cblx0ICAgIH0pXG5cdCAgICAuZWFjaChmdW5jdGlvbiAoZCkge1xuXHRcdGlmIChkLmxpbmsgPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICByZXR1cm47XG5cdFx0fVxuXHRcdGQzLnNlbGVjdCh0aGlzKVxuXHRcdCAgICAuY2xhc3NlZChcImxpbmtcIiwgMSlcblx0XHQgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uIChkKSB7XG5cdFx0XHRkLmxpbmsoZC5vYmopO1xuXHRcdFx0dC5jbG9zZS5jYWxsKHRoaXMpO1xuXHRcdCAgICB9KTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHQ7XG59O1xuXG50b29sdGlwLnBsYWluID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIHBsYWluIHRvb2x0aXBzIGFyZSBiYXNlZCBvbiBnZW5lcmFsIHRvb2x0aXBzXG4gICAgdmFyIHQgPSB0b29sdGlwKCk7XG5cbiAgICB0LmZpbGwgKGZ1bmN0aW9uIChvYmopIHtcblx0dmFyIHRvb2x0aXBfZGl2ID0gdGhpcztcblxuXHR2YXIgb2JqX2luZm9fdGFibGUgPSB0b29sdGlwX2RpdlxuXHQgICAgLmFwcGVuZChcInRhYmxlXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51XCIpXG5cdCAgICAuYXR0cihcImJvcmRlclwiLCBcInNvbGlkXCIpXG5cdCAgICAuc3R5bGUoXCJ3aWR0aFwiLCB0LndpZHRoKCkgKyBcInB4XCIpO1xuXG5cdG9ial9pbmZvX3RhYmxlXG5cdCAgICAuYXBwZW5kKFwidHJcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfaGVhZGVyXCIpXG5cdCAgICAuYXBwZW5kKFwidGhcIilcblx0ICAgIC50ZXh0KG9iai5oZWFkZXIpO1xuXG5cdG9ial9pbmZvX3RhYmxlXG5cdCAgICAuYXBwZW5kKFwidHJcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfcm93XCIpXG5cdCAgICAuYXBwZW5kKFwidGRcIilcblx0ICAgIC5zdHlsZShcInRleHQtYWxpZ25cIiwgXCJjZW50ZXJcIilcblx0ICAgIC5odG1sKG9iai5ib2R5KTtcblxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHQ7XG59O1xuXG4vLyBUT0RPOiBUaGlzIHNob3VsZG4ndCBiZSBleHBvc2VkIGluIHRoZSBBUEkuIEl0IHdvdWxkIGJlIGJldHRlciB0byBoYXZlIGFzIGEgbG9jYWwgdmFyaWFibGVcbi8vIG9yIGFsdGVybmF0aXZlbHkgaGF2ZSB0aGUgaW1hZ2VzIHNvbWV3aGVyZSBlbHNlIChhbHRob3VnaCB0aGUgbnVtYmVyIG9mIGhhcmRjb2RlZCBpbWFnZXMgc2hvdWxkIGJlIGxlZnQgYXQgYSBtaW5pbXVtKVxudG9vbHRpcC5pbWFnZXMgPSB7fTtcbnRvb2x0aXAuaW1hZ2VzLmNsb3NlID0gJ2RhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBUUFBQUFFQUNBWUFBQUJjY3FobUFBQUtRMmxEUTFCSlEwTWdjSEp2Wm1sc1pRQUFlTnFkVTNkWWsvY1dQdC8zWlE5V1F0andzWmRzZ1FBaUk2d0l5QkJab2hDU0FHR0VFQkpBeFlXSUNsWVVGUkdjU0ZYRWd0VUtTSjJJNHFBb3VHZEJpb2hhaTFWY09PNGYzS2UxZlhydjdlMzcxL3U4NTV6bi9NNTV6dytBRVJJbWtlYWlhZ0E1VW9VOE90Z2ZqMDlJeE1tOWdBSVZTT0FFSUJEbXk4Sm5CY1VBQVBBRGVYaCtkTEEvL0FHdmJ3QUNBSERWTGlRU3grSC9nN3BRSmxjQUlKRUE0Q0lTNXdzQmtGSUF5QzVVeUJRQXlCZ0FzRk96WkFvQWxBQUFiSGw4UWlJQXFnMEE3UFJKUGdVQTJLbVQzQmNBMktJY3FRZ0FqUUVBbVNoSEpBSkF1d0JnVllGU0xBTEF3Z0NnckVBaUxnVEFyZ0dBV2JZeVJ3S0F2UVVBZG81WWtBOUFZQUNBbVVJc3pBQWdPQUlBUXg0VHpRTWdUQU9nTU5LLzRLbGZjSVc0U0FFQXdNdVZ6WmRMMGpNVXVKWFFHbmZ5OE9EaUllTENiTEZDWVJjcEVHWUo1Q0tjbDVzakUwam5BMHpPREFBQUd2blJ3ZjQ0UDVEbjV1VGg1bWJuYk8vMHhhTCthL0J2SWo0aDhkLyt2SXdDQkFBUVRzL3YybC9sNWRZRGNNY0JzSFcvYTZsYkFOcFdBR2pmK1YwejJ3bWdXZ3JRZXZtTGVUajhRQjZlb1ZESVBCMGNDZ3NMN1NWaW9iMHc0NHMrL3pQaGIrQ0xmdmI4UUI3KzIzcndBSEdhUUptdHdLT0QvWEZoYm5hdVVvN255d1JDTVc3MzV5UCt4NFYvL1k0cDBlSTBzVndzRllyeFdJbTRVQ0pOeDNtNVVwRkVJY21WNGhMcGZ6THhINWI5Q1pOM0RRQ3Noay9BVHJZSHRjdHN3SDd1QVFLTERsalNkZ0JBZnZNdGpCb0xrUUFRWnpReWVmY0FBSk8vK1k5QUt3RUF6WmVrNHdBQXZPZ1lYS2lVRjB6R0NBQUFSS0NCS3JCQkJ3ekJGS3pBRHB6QkhiekFGd0poQmtSQURDVEFQQkJDQnVTQUhBcWhHSlpCR1ZUQU90Z0V0YkFER3FBUm11RVF0TUV4T0EzbjRCSmNnZXR3RndaZ0dKN0NHTHlHQ1FSQnlBZ1RZU0U2aUJGaWp0Z2l6Z2dYbVk0RUltRklOSktBcENEcGlCUlJJc1hJY3FRQ3FVSnFrVjFJSS9JdGNoUTVqVnhBK3BEYnlDQXlpdnlLdkVjeGxJR3lVUVBVQW5WQXVhZ2ZHb3JHb0hQUmREUVBYWUNXb212UkdyUWVQWUMyb3FmUlMraDFkQUI5aW81amdORXhEbWFNMldGY2pJZEZZSWxZR2liSEZtUGxXRFZXanpWakhWZzNkaFVid0o1aDd3Z2tBb3VBRSt3SVhvUVF3bXlDa0pCSFdFeFlRNmdsN0NPMEVyb0lWd21EaERIQ0p5S1RxRSswSlhvUytjUjRZanF4a0ZoR3JDYnVJUjRobmlWZUp3NFRYNU5JSkE3Smt1Uk9DaUVsa0RKSkMwbHJTTnRJTGFSVHBEN1NFR21jVENicmtHM0ozdVFJc29Dc0lKZVJ0NUFQa0UrUys4bkQ1TGNVT3NXSTRrd0pvaVJTcEpRU1NqVmxQK1VFcFo4eVFwbWdxbEhOcVo3VUNLcUlPcDlhU1cyZ2RsQXZVNGVwRXpSMW1pWE5teFpEeTZRdG85WFFtbWxuYWZkb0wrbDB1Z25kZ3g1Rmw5Q1gwbXZvQitubjZZUDBkd3dOaGcyRHgwaGlLQmxyR1hzWnB4aTNHUytaVEtZRjA1ZVp5RlF3MXpJYm1XZVlENWh2VlZncTlpcDhGWkhLRXBVNmxWYVZmcFhucWxSVmMxVS8xWG1xQzFTclZRK3JYbFo5cGtaVnMxRGpxUW5VRnF2VnFSMVZ1NmsycnM1U2QxS1BVTTlSWDZPK1gvMkMrbU1Oc29hRlJxQ0dTS05VWTdmR0dZMGhGc1l5WmZGWVF0WnlWZ1ByTEd1WVRXSmJzdm5zVEhZRit4dDJMM3RNVTBOenFtYXNacEZtbmVaeHpRRU94ckhnOERuWm5Fck9JYzROem5zdEF5MC9MYkhXYXExbXJYNnROOXA2MnI3YVl1MXk3UmJ0NjlydmRYQ2RRSjBzbmZVNmJUcjNkUW02TnJwUnVvVzYyM1hQNmo3VFkrdDU2UW4xeXZVTzZkM1JSL1Z0OUtQMUYrcnYxdS9SSHpjd05BZzJrQmxzTVRoajhNeVFZK2hybUdtNDBmQ0U0YWdSeTJpNmtjUm9vOUZKb3llNEp1NkhaK00xZUJjK1pxeHZIR0tzTk41bDNHczhZV0pwTXR1a3hLVEY1TDRwelpScm1tYTYwYlRUZE16TXlDemNyTmlzeWV5T09kV2NhNTVodnRtODIveU5oYVZGbk1WS2l6YUx4NWJhbG56TEJaWk5sdmVzbUZZK1ZubFc5VmJYckVuV1hPc3M2MjNXVjJ4UUcxZWJESnM2bTh1MnFLMmJyY1IybTIzZkZPSVVqeW5TS2ZWVGJ0b3g3UHpzQ3V5YTdBYnRPZlpoOWlYMmJmYlBIY3djRWgzV08zUTdmSEowZGN4MmJIQzg2NlRoTk1PcHhLbkQ2VmRuRzJlaGM1M3pOUmVtUzVETEVwZDJseGRUYmFlS3AyNmZlc3VWNVJydXV0SzEwL1dqbTd1YjNLM1piZFRkekQzRmZhdjdUUzZiRzhsZHd6M3ZRZlR3OTFqaWNjempuYWVicDhMemtPY3ZYblplV1Y3N3ZSNVBzNXdtbnRZd2JjamJ4RnZndmN0N1lEbytQV1g2enVrRFBzWStBcDk2bjRlK3ByNGkzejIrSTM3V2ZwbCtCL3llK3p2NnkvMlArTC9oZWZJVzhVNEZZQUhCQWVVQnZZRWFnYk1EYXdNZkJKa0VwUWMxQlkwRnV3WXZERDRWUWd3SkRWa2ZjcE52d0JmeUcvbGpNOXhuTEpyUkZjb0luUlZhRy9vd3pDWk1IdFlSam9iUENOOFFmbSttK1V6cHpMWUlpT0JIYklpNEgya1ptUmY1ZlJRcEtqS3FMdXBSdEZOMGNYVDNMTmFzNUZuN1o3Mk84WStwakxrNzIycTJjblpuckdwc1VteGo3SnU0Z0xpcXVJRjRoL2hGOFpjU2RCTWtDZTJKNU1UWXhEMko0M01DNTJ5YU01emttbFNXZEdPdTVkeWl1UmZtNmM3TG5uYzhXVFZaa0h3NGhaZ1NsN0kvNVlNZ1FsQXZHRS9scDI1TkhSUHloSnVGVDBXK29vMmlVYkczdUVvOGt1YWRWcFgyT04wN2ZVUDZhSVpQUm5YR013bFBVaXQ1a1JtU3VTUHpUVlpFMXQ2c3o5bHgyUzA1bEp5VW5LTlNEV21XdEN2WE1MY290MDltS3l1VERlUjU1bTNLRzVPSHl2ZmtJL2x6ODlzVmJJVk0wYU8wVXE1UURoWk1MNmdyZUZzWVczaTRTTDFJV3RRejMyYis2dmtqQzRJV2ZMMlFzRkM0c0xQWXVIaFo4ZUFpdjBXN0ZpT0xVeGQzTGpGZFVycGtlR253MG4zTGFNdXlsdjFRNGxoU1ZmSnFlZHp5amxLRDBxV2xReXVDVnpTVnFaVEp5MjZ1OUZxNVl4VmhsV1JWNzJxWDFWdFdmeW9YbFYrc2NLeW9ydml3UnJqbTRsZE9YOVY4OVhsdDJ0cmVTcmZLN2V0STY2VHJicXozV2IrdlNyMXFRZFhRaHZBTnJSdnhqZVViWDIxSzNuU2hlbXIxanMyMHpjck5BelZoTmUxYnpMYXMyL0toTnFQMmVwMS9YY3RXL2EycnQ3N1pKdHJXdjkxM2UvTU9neDBWTzk3dmxPeTh0U3Q0VjJ1OVJYMzFidEx1Z3QyUEdtSWJ1ci9tZnQyNFIzZFB4WjZQZTZWN0IvWkY3K3RxZEc5czNLKy92N0lKYlZJMmpSNUlPbkRsbTRCdjJwdnRtbmUxY0ZvcURzSkI1Y0VuMzZaOGUrTlE2S0hPdzl6RHpkK1pmN2YxQ090SWVTdlNPcjkxckMyamJhQTlvYjN2Nkl5am5SMWVIVWUrdC85Kzd6SGpZM1hITlk5WG5xQ2RLRDN4K2VTQ2srT25aS2VlblU0L1BkU1ozSG4zVFB5WmExMVJYYjFuUTgrZVB4ZDA3a3kzWC9mSjg5N25qMTN3dkhEMEl2ZGkyeVczUzYwOXJqMUhmbkQ5NFVpdlcyL3JaZmZMN1ZjOHJuVDBUZXM3MGUvVGYvcHF3TlZ6MS9qWExsMmZlYjN2eHV3YnQyNG0zUnk0SmJyMStIYjI3UmQzQ3U1TTNGMTZqM2l2L0w3YS9lb0grZy9xZjdUK3NXWEFiZUQ0WU1CZ3o4TlpEKzhPQ1llZS9wVC8wNGZoMGtmTVI5VWpSaU9OajUwZkh4c05HcjN5Wk02VDRhZXlweFBQeW41Vy8zbnJjNnZuMy8zaSswdlBXUHpZOEF2NWk4Ky9ybm1wODNMdnE2bXZPc2NqeHgrOHpuazk4YWI4cmM3YmZlKzQ3N3JmeDcwZm1TajhRUDVRODlINlk4ZW4wRS8zUHVkOC92d3Y5NFR6KzRBNUpSRUFBQUFHWWt0SFJBRC9BUDhBLzZDOXA1TUFBQUFKY0VoWmN3QUFDeE1BQUFzVEFRQ2FuQmdBQUFBSGRFbE5SUWZkQ3dNVUVnYU5xZVhrQUFBZ0FFbEVRVlI0MnUxOWVWaVVaZmYvbVEwUWxXRm4yQVZjd0lVZEFkZGNFRFJOelNWUk15MlZ5cmMwVTN2VE1sT3pzc1UxQmR6M0ZRUUdtSTJCQWZTSFNtNVpXZm9tK3BiaXZtVUtncHpmSDkvT2M4MDhna3V2T3ZNTTk3a3Vybk5aTFBPYyszdys5K2MrOTdudkI0QVpNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGanhvd1pNMmJNbURGalpuNFRzUkNZMmhkZmZDRkNSRkZkWFoyb29xSUNLaW9xUkFBQWlDaENSQllnSVNXM1NJUWlrUWhhdEdpQkFRRUI5RytjT1hNbUc4akdUZ0R6NTg4WFZWUlVpQ3NxS2lRQUlEMTkrclQwekprek1nQ3dCUUFaQUVnQlFBSUE0cisvR0ZrS3p4QUE2djcrdWc4QXRRQlFBd0RWTFZxMHFBa0lDS2dGZ0ZwL2YvLzdnWUdCZGJObnowWkdBRlpxYytmT0ZaMDVjMFpTVVZFaFBYMzZ0TzNaczJmdEFhQ3BwNmVuYzF4Y1hFdUZRaEhvNmVucDM2VkxsMEEzTnplRnJhMXRNeHNibTJZU2ljUldMQlkzWlZnU0lQb1JvYWFtNWk4QXFLNnFxcnBkVlZWMSs5S2xTeGYrMy8vN2Y2Y3JLeXZQWHJodzRYUjVlZmwvS2lzcnJ3SEFYMzUrZm5jQ0FnS3EvZjM5YS8zOS9lL1BtemNQR1FFSTJPYk1tU002YythTTlNeVpNN1lHZzZFcEFEVHYyTEZqWUV4TVRIeGlZbUxIME5EUVNCc2JHMFZOVFExVVYxZkR2WHYzb0thbUJ1cnE2cUN1cmc0UWtmdGlKbHdUaThVZ0VvbEFKQktCV0N3R2lVUUNNcGtNYkd4c1FDcVZ3dDI3ZHk4Y1AzNzhpRTZuTzNENDhPR3lRNGNPblFhQVA3dDI3Zm9YQUZSMzdkcTFkc0dDQmNnSVFDQTJac3dZeWRtelorMktpNHViMmRuWk9ROFpNcVJiLy83OUV6dDI3Qmh0WjJmbmUrZk9IYmh6NXc3VTFOUkFiVzB0OTNPMXRiVnc3dHc1dUgzN05sUldWb0pVS29YS3lrcG8wcVFKWEw1OEdkemQzZUhTcFV2TUM4Uzd1Ym5CM2J0M3dkUFRFMnByYThIVDB4T2FOV3NHM3Q3ZUlKVktUUWhDS3BXQ3JhMHQyTm5ad1owN2QvNG9MeTh2VjZsVTJweWNuSkxxNnVxclhicDB1ZTNuNTFlMWRldlcrNHhTTGRBKy9QQkQwYXV2dmlyejkvZDNCSUNBWHIxNkRWbTFhdFgyMzMvLy9lcVpNMmZ3K1BIaldGNWVqdnYzNzhleXNqSlVxVlQ0NmFlZjR0U3BVN0Y3OSs3WXUzZHZ0TE96dzdDd01KUktwUmdSRVlGU3FSUWpJeU5SSnBOaFZGVFVRMzEwZERUelp2Q1BHcGZJeUVpVDhRd0xDME03T3p2czNiczNkdS9lSGFkT25ZcHo1c3hCbFVxRlpXVmxXRlpXaGdjUEhzVERody9qenovL2pDZE9uTGkrWk1tU0hkMjZkUnNDQUFHK3ZyNk95Y25Kc3VuVHA3T2FrQ1hZQng5OElCbzFhcFNObjUrZnM1MmRYZkQ0OGVPbi8vREREOGZPblR1SFAvMzBFNWFYbDJOWldSa1dGaGJpaWhVcmNPalFvWmlRa0lCU3FSVER3OE5SS3BWeXlSUWJHNHN5bVF6ajQrTlJKcE5ocDA2ZFVDYVRZZWZPbmRIR3hxWkIzNlZMRitiTjZCODJQc2JqU09OSzR4d2RIVzJTQndrSkNUaGt5QkJjc1dJRkZoWVdZbGxaR2U3ZnZ4OFBIejZNSjA2Y3dKS1NraDlHalJvMTNkYldOdGpYMTlkNXhJZ1JOdSsvL3o0akFuTlpjbkt5ek5mWDE4bmUzajVreG93WmN5c3FLdjQ0YytZTUhqbHloSnZwMDlMU01Da3BDV05pWWt4bWRFcUNUcDA2b1kyTkRYYnQyaFZ0Ykd6d2hSZGVRQnNiRyt6Um93ZmEydHBpejU0OTYvVzlldlZpM2dKOVErUFZvMGNQay9HbDhTWnlvSHlJaW9wQ3FWU0tNVEV4MktkUEgweE5UZVdVUVhsNU9SNC9maHdQSFRyMHg2UkprK1kyYWRJa3hNZkh4Mm5Zc0dFeWhzYm5hTU9IRDVmNCtQZzRBRURRTysrOE0vUDA2ZE8vbno1OUdnOGRPb1JsWldXbzBXaHd3b1FKMkxWclY1UktwWndjakl1TFE1bE1aZ0oyNCtSSlNFaEFXMXRiVEV4TVJGdGJXMHhLU21MZWlqeU5LNDB6alR1ZkZDaFBpQXk2ZHUySzQ4ZVBSNDFHZzJWbFpYamd3QUU4ZHV3WWxwZVgvejUrL1BpWkFCRGs3ZTN0OFBMTEwwc1lPcCtoVFowNlZSUWZIMjhIQUY1SlNVbkpSNDRjT1hybXpCazhmUGd3bHBXVllYWjJOazZhTkFudDdlMjVtVDR1THM1a2NHbG01NE85YjkrK2FHdHJpeSsrK0tLSjc5Ky9QK2Z0N095WUY1QTNIai8rdU5KNDgwbUJsQUtmRENJakk5SGUzaDRuVFpxRTJkblpYSzNnaHg5K1FJMUdjN1I3OSs3SkFPRFZzV05IdTBtVEpyRmx3ZE8yb1VPSFNyeTl2UjBWQ2tYa3VuWHJ0cDgvZjc3MjJMRmp1SC8vZmxTcFZEaGt5QkNNaUloQW1VeUdIVHQyUkpsTXhxMFIrYUNuR2FGZnYzNG00QjR3WUFEYTJkbmhTeSs5Wk9JSERoekl2SUE5Znp4cG5Ja2NLQThvTC9oazBLVkxGNU84aW9pSXdDRkRobkNGdy9MeWN2emhoeDlxdi83NjYrMXVibTZSWGw1ZWpvTUdEWkl5MUQ0Rm16SmxpbWpvMEtHMkFPRFZ2My8vY1dmT25EbC84dVJKUEhqd0lCb01CcHc1Y3lZMmJkcVVtL0ZwVFUveW5nYlRlSWF2RCt3TkpjK2dRWU9ZdHdML0tIS2dmT0FyQk1vZldpWlF6U0F5TWhLYk5tMktNMmZPUklQQndCVUx5OHJLemlja0pJd0RBSytCQXdmYXZ2WFdXMHdOL0EvZ0YzdDdlemUxczdOcnZXTEZpdFhuenAyclBYTGtDTzdidHcrWExWdUd2WHIxUXBsTWhqRXhNU2F5amRaMnhPaVBBdjNqSnRIZ3dZT1pGNUIvVW5Kb2lBd29qM3IxNm1XU1p6RXhNU2lUeWJCWHIxNjRkT2xTM0xkdkgrN2Z2eCtQSERsU08yL2V2RFcydHJhdFBUMDltNzcxMWx0aWh1Wi9CbjdIb0tDZ3p2djI3VHZ3MjIrLzRZRURCMUN2MStPSUVTTXdMQ3lNMjlwNTJJeFA4cjZobVo3TmtNdy9UQm5RTXFFaFJVQmJpMkZoWVRoaXhBalU2L1ZZVmxhR2h3NGR3bDI3ZGgzMDgvUHI3T25wNmZqbW0yOHlFbmlDOWI0VUFGemo0K09IVmxSVVZQNzAwMDlZVmxhRzI3ZHZ4NENBQUc2dFQvdTl0TlhEWm56bW42Y2k2Tm16cDBtL1FVUkVCTFpvMFFLM2JkdUcrL2J0dzRNSEQySkpTVWxsZUhqNFVBQndmZW1sbDFoZDRESEFMd01BeFd1dnZUYnBqei8rdUgzMDZGSGN0MjhmZnYzMTF5aVh5ekVxS29xVFliYTJ0dGk3ZCsvSG12RVp5Sm4vSitUd0tFVkErVWZMZ3Fpb0tKVEw1ZmoxMTE5elM0SURCdzdjSGp4NDhMOEFRREZnd0FEV00vQUk4SHRObXpadDVybHo1KzRkT25RSTkrM2JoKysrKzY3SldyOTc5KzRtY3F4ZnYzNG1UTTFBei95ekpBUEtNOW85b0R6czNyMjdTVzNnM1hmZjVVaWd2THo4M3JoeDQyWUNnQmNqZ1llQS8rT1BQNTc3KysrLzN6OTQ4Q0FXRkJUZzJMRmp1UzBZWS9EMzZkUEhCUHhzcmMvODg2NE5HSk1BNVNPUkFHMFpqaDA3RmdzS0NtaEpjUC9OTjkrYysvZU9GaU1Cc2lGRGhrZ0J3UFBERHovOGhNQ3YxV3B4K1BEaFhKdW1jYUdQbWpmNGEzMjJsY2Y4ODl4QzVOY0dLQytwUUVqdHhjT0hEMGV0Vmt0cTRQNzQ4ZU0vQVFEUC92MzdzNXJBMEtGREpRRGcvczQ3NzB6Ly9mZmZhd2o4Z3djUE51bmtvMlllS3NDd0daOTVTOXd0b1B5a0ppTHFKQnc4ZUxBeENkUWtKeWRQQndEMy92MzdOOTcyNGNtVEo0dTl2YjJkazVLU3h2eisrKzlWQnc4ZVJKMU9oME9IRGpXWitmbmdwNW1mZGV3eGIwa2RodnhkQWlJQlVnSkRodzVGblU2SCsvYnR3OUxTMHFvdVhicThwbEFvbkNkT25OajR0Z2pmZmZkZGtiZTN0ME9IRGgzNm5qMTc5dnFoUTRld3NMQVFrNU9UNndWL1E3S2ZnWjk1U3lDQmhwWURmQkpJVGs3R3dzSkMzTGR2SCtyMSt1c3RXN2JzcTFBb0hDWk1tTkM0T2daalkyT2J1TG01aFI4N2R1emswYU5Ic2JTMEZGTlNVdGpNejd6Vks0R1VsQlFzTFMzRnZYdjM0dTdkdTArNnVMaUVSMFpHTm1sTVJUOFpBUGhuWkdTb2Z2NzVaeXd0TGNXNWMrZWFWUHNmdGVabjRHZmVra21nb1pvQTdRN01uVHNYUzB0TGNkKytmZmpWVjErcEFNQy9VZXdNVEo0OFdRd0FidE9uVDU5OSt2UnAzTHQzTDY1YXRRcHRiVzI1ZmY1SFZmc2JPclhIUFBQbTlQejhiR2gzSUNZbUJtMXRiWEhWcWxWWVdscUtwYVdsT0hyMDZFOEF3RzNDaEFuV1hRL3c5dlp1RmhvYTJ2Zk1tVE8zRHh3NGdFcWxFbDFjWERBNk9wcmI1N2V4c1hua21wOTU1b1ZBQnNZa1lKemYwZEhSNk9MaWdqazVPVmhhV29vNm5lNzIzL1dBWnRiZTdCTm9NQmdPSGoxNkZFdEtTakFtSm9ZN3l0dXRXemUwc2JIaG1pcll6TSs4TlNtQlBuMzZvSTJORFhicjFvMDdVaHdkSFkwbEpTVllVbEtDNmVucEJ3RWcwQ283QmYrVy9xN1RwMC8vOU5TcFUxaGFXb3BUcDA3bFR2WFI1UjM4OWw3K1pSM01NeThreis4WVRFaElNTGxrSkN3c0RLZE9uWW9sSlNWb01CaHc5T2pSY3dIQTFlcTJCdVBqNDV2NCtmbkYvZmJiYjlmMzc5K1BtWm1aM0cyOGRJa0hIYXhnNEdmZW1rbWdkKy9lSnBlTFJFZEhZMlptSnBhVWxHQnVidTUxRHcrUHVPam9hT3ZaRlhqLy9mZkZBT0NWbnA2Ky9mang0MWhjWEl5dnZQS0tTYWNmWGVMUnQyOWZUall4RW1EZVdzQlArVXluQ09seUVlb1VmT1dWVjdDNHVCZ05CZ1ArKzkvLzNnNEFYbFp6a1VpblRwMmFSa2RIdjNqNjlPbDdlL2Z1eFJVclZuQlhML08zL0l5RHhTY0I1cGtYb3Vmbk0zOXJrSzZzLys2Nzc3QzR1QmpWYXZXOTRPRGdGMk5pWW9UL1RzcnAwNmRMQU1CbisvYnQrVWVPSE1IaTRtSnMyYklsUmtaR21wenVTMHhNNUdRU0F6L3oxa29DbE4rMHkwVzdBcEdSa2RpeVpVdE9CY3liTnk4ZkFId21UWm9rN0xNQ25UdDNiaG9mSC8vU2I3LzlWbHRhV29xZmZ2b3Bob2FHMWx2NGEwaitNOCs4TlpHQThmVml4Z1hCME5CUS9QVFRUMGtGMUxacjErNGxRYXVBR1RObWlBSEFhLzM2OVZtSER4OUdnOEdBUFh2Mk5Mbkx6L2dDei9vVUFQUE1XNU9uL09aZk5FcDNDL2JzMlJNTkJnTVdGaGJpckZtenNnREFhOUtrU1dLaHp2NTJyVnExNm5icTFLbTdwYVdsdUhqeFlwUktwZlcyK3pMd005OVlTY0M0VFZncWxlTGl4WXZSWURDZ1VxbTg2K1BqMHkwbUpzWk9jT0NmTm0yYUNBQmM1OHlacytMWXNXTm9NQmd3TkRRVUl5SWlUTzcwNjlPbkR5ZUxqSVBEUFBQVzdDbmZxZW1ON2hTTWlJakEwTkJRTkJnTVdGQlFnT1BHalZzQkFLNkNlOXZReUpFalpSS0pwUFVQUC96d3g5NjllM0g5K3ZYWXZuMTdrOXQ4NlpYY2ZBWEFQUE9Od1ZQZVUxOEEzUzdjdm4xN1hMOStQUllWRmVIbXpadi9FSXZGclFjUEhpeXM3a0JmWDk5bVE0WU1tWERpeEFrc0tpcDY0S2l2OFZYZVRBRXczMWdWQVArS2NlTWp3MFZGUmFoU3FiQnIxNjRUdkx5OGhITkc0SU1QUGhBQmdHTFZxbFZaNWVYbHFOVnFVUzZYY3ozL3RQVkI4b2VDUU5WUjVwbHZESjd5bnM0SWRPL2VuVHNqNE9EZ2dGcXRGZ3NLQ25ENjlPbFpBS0Q0MTcvK0pZeGx3S2hSbzJTMnRyWnRmL3JwcDJzbEpTVTRiOTQ4N05DaHd3UHluNEdmZVVZQ1NTYnR3YlFNNk5DaEE4NmJOdzhMQ3d0eDI3WnQxMlF5V1Z2QkxBTzZkdTNhZE9EQWdlTisvUEZITEN3c3hERmp4cUJVS20zd21pK2hrOEEvZlY4OUEwSGpqaU45L3ZxdUQ1TktwVGhtekJnc0xDekUzTnhjN05TcDA3aU9IVHMyRllyOGQxdXdZTUg2OHZKeTFPbDBKdksvVzdkdUppOVQ0Sk9BVUR4OWJ2SzBuQ0ZQejBlZS8vLzVQeSswNTJkeGZMclBUODluZkZSWUxwZWpUcWREclZhTDQ4ZVBYdzhBYnUrODg0NWxMd05telpvbEFZQ0FBd2NPbkN3dExjVnZ2LzJXcS83VHFUOXEvaEhhb0RXVXJMU2NvZWVpQWlmZjAvK243MitzWk1EaVdIODhxQ21JVGdtMmI5OGV2LzMyVzlUcjlaaWVubjRTQUFMZWZmZGR5MjRON3RhdG00MjN0M2ZzVHovOVZGTllXSWlUSjA4Mk9makRmNHN2ZjlBczFmTm5KRXBDV3M1UVlaUDJjNm5ObVR6OWR6cjdRRDlIdjRjL3d3a2xMaXlPVDhmejN6cE1CNFFtVDU2TWVyMGVkKzNhVmVQaTRoSWJHeHRyWStrRTBHellzR0Z2SFR0MkRQVjZQWWFIaDV0YyttSE0zRUpQVnJyQmlBcWJkTFNaT2gzNW52NC9mVDh0aDZ5ZERGZ2NIODhUTG93dkN3a1BEMGU5WG84NU9Ubll0V3ZYdHpwMjdHangyNEV1NzcvLy9zcURCdytpWHEvbndNOS93NCtsRHdwZmxwTDhwQm1LbGpQMElzakl5RWhzMHFRSkppUWtZSHg4UEw3MjJtczRhTkFnSER0MkxIYnExQWtURWhMUTN0NmVlN1U1S1NMNlBUU2owZDk1bEx3Vkd2aWZOSTU5K3ZUQitQaDRIRFZxRkE0YU5BaEhqUnFGY1hGeG1KQ1FnSFoyZGx4TnlWcmlTSitQLzBhaDBOQlExR3ExcUZhcmNlalFvU3NCd01WaWtUOXo1a3dSQUhobFpXVVpTa3BLY1BQbXpTaVZTcm5CNHIvU20xL1FzUlRQbjZsSWx0R01RMWM3UjBSRVlIUjBOSDc0NFllNGRPbFNWS3ZWV0ZCUTBPQ1hScVBCNWN1WDQ4eVpNekUyTnBhTEM4MXM5UHRwbWRUUVRDWVUveVJ4N05peDQyUEhVYVZTNGFKRmkzRDY5T2tZRVJIQmthclE0Mmo4cW5FaVE2bFVpcHMzYjBhTlJvUHo1czB6QUlEWDVNbVRMYk1RK1BISEgwc0FJR2ovL3Yxbmk0cUtjUGJzMlZ3Qk1ENCszb1NaaFpLME5GUFI2Y1dvcUNoMGQzZkhqejc2Q0hmdjNzMVZhZlB5OG5EUG5qMjRkZXRXWEw5K1BhNWV2UnJUMDlOeDdkcTF1SEhqUnR5NWN5ZG1aMmVqU3FWQ25VNkhCUVVGbUptWmliTm56MFovZjMvdWZnVDZPL3laVEdna1FKK1hQK1BUODBWR1JtSkFRQURPbmowYk16SXk2bzNqaGcwYmNNMmFOYmhxMVNwY3QyNGRGOGVjbkJ4VXE5VmNISGZ1M0lrZmZ2Z2h1cm01WVZSVVZMMXhGQW9KVUx6b2RHRDc5dTF4OXV6WnFOUHBNQzB0N1N3QUJFMlpNa1ZpcWV0L21WZ3NibnZzMkxFcXZWNlBNMmJNUUtsVWFuTGx0ekhUOGJkNHpPM3BjOUV5aFFwT05GUEZ4OGZqOU9uVFVhUFJvRmFyUmFWU2lSczNic1NsUzVkV2YvamhoMGRmZXVtbDlaMDdkLzQ0UER6ODliWnQydzV0MGFKRllraEl5TkN3c0xCeG5UcDErbmpBZ0FGclAvcm9vOE9wcWFsVk8zZnV4UHo4Zk5UcGRLalQ2WERtekpsY0V3ak5aS1NZNlBOWWF0eWVOSTZkTzNmR0R6LzhrQU45VGs0T3hiR0s0dGlwVTZlUHdzUEQzK2pRb2NQSUZpMWFKSWFHaG82S2lJZ1kzNmxUcDQ5ZmZ2bmxUWFBuenYxcDFhcFY5M2J2M3MyUnFscXR4dmZlZTQ5cnA2VytFNG9qZjFsZ3FYRXp2anBjS3BYaWpCa3pzS0NnQURkdjNsd2xGb3ZieHNYRnlTeVZBR3dqSXlON0h6bHlCSFU2SFE0WU1JQzcvS056NTg3MU1yR2xKaTFWbldsdE9uNzhlTXpJeUVDdFZvdDc5dXpCMU5SVW5EWnRXbm1uVHAwK2RuQnc2QWdBL2tWRlJiM3hJVlpVVk5RYkFQeWJOMjhlM2JsejU1bXpaczNhdjNuejVycmMzRnpVNlhTWWxaV0ZiNy85dHNuYWxncW5EUlc0TE0zekMzejhPTDc5OXR1NFo4OGUxR3ExbUptWmlTdFdyTGcvZGVyVS9mSHg4UjgxYjk0ODVuSGlPSFhxMU5ZQTBNTEp5YWxUMTY1ZDUzejY2YWRIdG16WmdubDVlYWpUNlhEMzd0MDRkdXhZa3pnS2hVd3BmalFaaElhRzRvQUJBMUNuMCtHT0hUdXdaY3VXdmVQaTRtd3RsUUNhRGhnd1lOejMzMytQT3AwT0J3MGFaTElGeUpkak5Bam05c1pKYTd5R2pJNk9SaWNuSjF5NGNDRTM0NmVucCtNNzc3eXpOemc0ZUNRQUJOVFcxbGJnUDdEYTJ0b0tBR2dSSEJ3OGJOcTBhVVhidDI5SGxVcUZXcTBXbHl4WmdpNHVMcHljcFFJWHJhSDVNNW1sZURyUVFwK1RQbmRVVkJRNk96dmpraVZMdURpbXBhWGhXMis5WlFnS0Nob0tBQzMrYVJ5cnFxb01BQkFZR2hyNjZzY2ZmM3hnNTg2ZDNQSmd3WUlGS0pmTE9RVks0OG9uVTB2TFExSUF0QlU0YU5BZ2p0aGlZMlBIeGNiR1dtWkhZTmV1WFpzbkp5ZFBwOWQ4dDJyVml0c0ZvT0JiV3ZJMkJQNm9xQ2gwYzNQRFRaczJvVWFqd1IwN2R1Qm5uMzEyTVNvcWFqSUFCT0JUTkFEd2o0Nk9mdk83Nzc0N3AxUXFVYXZWNHViTm05SFQwNU1yRkZvNkNkUUhmaXBrS1JRS3JwQzFmZnQybkRkdjN2bXdzTEMzQWFERlU0NWpZUGZ1M2FlbHA2ZGZ5YzNOUmExV2l4czJiREFoVTBzbkFZb2pLWUN3c0RCczFhb1Y2blE2M0xObkQzYnYzbjE2eDQ0ZG0xc2tBZmo1K1RtT0hUdDJmbGxaR2VwME9veUxpN05vQmRCUWRUb3FLZ29WQ2dWdTI3WU4xV28xYnRpd0FTZE5tbFRxNHVMUytmYnQyK3Z4R1ZoVlZaWEIyZG01NHdjZmZGQ1FsWldGV3EwV2QrM2FoWDUrZmx5VjI3aXdaVXdDNW9xbmNjZWU4ZWVpQWxaRVJBVDYrdnJpcmwyN1VLMVc0N3AxNnpBbEpVWHY1T1FVVzFWVlpYZ1djYnh5NWNxbjd1N3UzZWJPbmJzL096dWJJMVBqQW1GRHV3U1dxZ0RpNHVKUXA5TmhUazRPSmlRa3pQZnk4bkswMUoxQXAvSGp4eThxTFMzbGpnRHpGUUNmZWMzbENUejFnZC9GeFFVM2JkcUVLcFVLVjY5ZWpjbkp5YnNrRWtscmZBNG1Gb3RiVHB3NGNXTm1aaWFxMVdyY3VYTW4rdm41WVhoNGVMMGtZTzU0a25MaWd6ODhQQng5ZlgxeHg0NGRtSitmajZ0V3JjTGh3NGR2RW9sRUxaOUhIR1V5V2ZEa3laT3o5dXpaZ3hxTkJqZHUzRml2RWlBUzRKT3B1ZU5wckFEa2NqbFhMRTFNVEZ3RUFFNldTZ0RPRXlkT1hGbFNVb0phclJiYnQyOXZjZ2NnWHdGWVNyQ3BVQlVkSFkxTm1qVEI5UFIwVktsVXVIYnRXaHcrZlBpbXB5MzVIMFBLK3IzMjJtdkxMSjBFSGhmODZlbnBPSERnd09VQTRQK2M0eGo0emp2djdNek96a2FOUm9PcHFhbllwRWtUcmlaQTQyNHBreEpmQWRBZGdlM2J0K2RxSjBsSlNTc0F3TmxpQ1NBbEpXVzF3V0JBclZhTFVxbTBRUVhRMEVHUDUrWDU0S2NxOWV6WnMxR2owZUNXTFZ0dzNMaHh1UUFRaUdZd0FQQ3Rqd1Q0blpYVVJzdWZ5WjYxSitWRWY1ODYxOExDd2hvQ3Y2ODU0aWlWU2x2Tm1qVkxrNXViaXhxTkJxZFBuLzdBN29BbDVxV3hBcEJLcGFqVmFqRTNOeGY3OWV1MzJwSUp3Q1VsSldWMVVWRVJhalFhREE0T05sRUExTE50Q1VFMjdrR24vZW5FeEVSVXE5V1lrWkdCSDM3NDRTLzI5dmFoYUVZakVzakl5RUNWU29VN2R1eEFYMTlmczVQQW84Qy9mZnQyek12THc3UzBOSHpwcFpmTUJuNnk1czJiaDZXbXB2NmFuNStQYXJVYUV4TVRUZm90K0djSnpKMmZ4bmtwbFVveE9EZ1lOUm9OS3BWSzdOdTM3MnBMYmdjMklRQmpCV0JjeFRZT3RyazhCWm1hUmtKRFEzSEpraVdZbDVlSFM1Y3VyZkx4OFJtSUZtQ1BJZ0hqWnBmNlRzazliYzgvclVmeHMxVHdrN1Z1M1hwUVZsWldsVnF0eGtXTEZuRTNWRkg4K0NSZ0xzL2ZSU0VGSUVnQ0lBVkFjc3RTZ3N4dlN3MFBEK2RtL3kxYnR1RExMNys4QmdBODBVTE1Va2hBcU9EL080YWU3N3p6enJyOC9IelVhRFRZdTNkdjdvcDZmdHV3cFV4T3RBc2dLQVV3Y2VMRTFZV0ZoYWhXcXprRllCeGtjeXVBK3FyK01wa01OMjdjaUxtNXVmamxsMTllc2JlM2owQUxNejRKYk4rK0hYMTlmYmxPUzVLelZOTjQyc2xNNEtmZlQ4dW0wTkJRRS9DbnBxWmFIUGpKbkp5Y292ZnMyWE5kclZaamVubzZ5bVN5Qm5jRnpKMmZoQmRTQUdxMUduTnljb1JGQUczYXRERTVDMER0bUJSa2MzbWF3YWp3TjJEQUFGU3BWTGgxNjFaODhjVVhseitxRmRXY0pEQm16SmhsdTNmdnh2ejgvTWNtZ2Y4MVhvOEMvN1p0MnpBM054ZFRVMU54d0lBQkZnbCthaUdlTkdsU21rcWxRclZhalVsSlNmVzJDMXRLZnRKWmdEWnQyZ2lUQUtSU0tZYUdodFlyczh3VlhIN2hxa09IRGpoNThtVE16OC9IWmN1V1ZUazVPWFZHQzdiblRRTFdBbjR5WDEvZjdtcTF1a2FsVXVIYmI3L054YzI0b0dyTy9PUXZUME5EUTYxSEFWQVNrY3g1M3Q3NEVncnFWSk5LcGJoanh3N015c3JDOTk1N3I5alNFL2hoSkVDRkxUNEpHTzhTUEltbm4rT0R2ME9IRG9JRVAvVllyRnExYXI5YXJjYXRXN2VhM0ZkaGZLbUlPZlBVdUM5RmtBcEFyOWVqU3FWQ2lVVENNU3kvZWNYY3dTWDUzNzE3ZDFTcFZMaGx5eGJzMHFYTHAvLzBVSXE1U0dEWHJsMllsNWVIMjdadGU2b2s4RGpnVnlxVnVITGxTc0dBSHhHeHVycmFNR3pZc004MEdnMnFWQ3J1K2kxK3ZNdzlTVkZUVldob0tFb2tFbFNwVkppZG5ZMUpTVW5DSVlEV3JWdWpWQ3A5b05CQ0QvbThQYTJ0ak9WL1VsSVM1dWZuNDVvMWF6QXdNTEFmQ3NnZVJRSzB0cVc0Rys4U1BFNmM2T2VJTEJzQS96S2hnSjhzSmlabUlMMTJxM2Z2M2x5OCtIMFY1c3BUNHdLMVZDckYxcTFiQzVNQUpCS0p4UWFYcmx1YU9YTW01dVhsNGJKbHkyNENRREFLeko0MkNWZzcrUDgrYjlHMnNMRHdqa3FsNGk2dG9SdVp6RDFKMVZlakVxUUN5TS9QNXhRQUJaZldXUFNRejl2ejVXeTdkdTF3L3Z6NXFGUXE4YlBQUGp2eHZIditueVlKdlBycXF4d0piTjI2RlgxOWZibnIyS2dHUS9Ibkx3djQ4YUh2aTQ2TzVxNmw4dlgxeGExYnR3b2UvSFJHSURjMzl6ZTFXbzJmZlBJSnRtdlg3cUhMcHVmdEtmNDBTYlZ1M1JyejgvTXhLeXRMR0FSUVVGQ0ErZm41SmdxQTM2eGlydUFhSDFpUlNxVzRhdFVxek03T3hsbXpadTBEQUI4VXFCRUo3Tnk1RTNOemN4K2JCUGozN3o4TS9EazVPYmhpeFFyczM3Ky9ZTUZQc2RxK2ZmdCtqVWFEYVdscEtKVktIemhvWmE3ODVEZFprUUlRSkFHMGF0VUtwVkxwQXgxWDlKRFAyeHZmOUNPVHlUQWtKQVRYcmwyTDJkblpPRzNhTkIwQWVLR0FyU0VTb0JtT2YyRW14WU84OGNXbnBKQ3NEZngveDhsNzQ4YU5lcTFXaTZ0WHI4YVFrQkFUa3VRdmw1NjNwM0dnWGFwV3JWb0pWd0hRRE1TWFYrWUtydkhCRmFsVWloczJiTURzN0d6ODk3Ly9yUmM2QVR3SkNWQk5obVo4K3JlMWc1OElZTnUyYlFhZFRvZnIxcTB6T2JOQ2NUQlhmdktYcWUzYnR4ZVdBcGd3WWNKcW5VNkhlWGw1RFNvQS91dWVucGMzdnFPT0ZNQ3laY3N3T3pzYjU4eVpVMllOeVcxTUFqdDI3RUNsVW9sYnRtd3hJUUdxeWRDeWpEenRoeFA0dDJ6Wmd0bloyZmpkZDkvaGl5Kyt1TXlhNHJObno1NkRHbzBHRnk5ZS9JQUM0QytUbnJldlR3SFFkZW1DSWdDSlJNSWxIYjhhYmE3Z0doOWdrVXFsK00wMzM2QlNxY1N2di81YXNFWEFKeUdCdG0zYmNrMVFwQWlNLzkyMmJWdXJCajhWQVFzTEMwOXFOQnBjdUhDaGlRSWdNalJYZnZKM1g5cTFhNGNTaVVTWUJOQ3laVXV1d0ZMZk85MmV0K2V2Y1VOQ1F2RHR0OS9HM054Y1hMMTY5UTBoYmdNK0tRbjQrUGh3TXg0MWFaRVBDUWxCSHg4ZnF3Yi8zM0ZwZStqUW9kc3FsUW9uVHB6NGdBSm9xRWJ5dkR6aGhBclZMVnUyRkI0QjVPYm1va1FpNFdZY0tyeVJ2REpYY1BrS1lQVG8wZHhhdVdYTGxuM1J5b3hQQXBzM2IwWWZIeDl1aXpZa0pJVGJhdkx4OGNITm16ZGJOZmdSRVR0MzdqencwS0ZEbUp1Ymk4bkp5ZlVxQUhQbEo3V3BFMTdhdG0yTEVva0VjM056TVRNekV4TVRFeTJmQU9qNkltTUZZQnhjSW9IbjdXa0wwRGk0dnI2K21KdWJpeGtaR2RpN2QrODVRbWtGZmxJU0dEMTY5TEx0MjdkalRrNE9idHEwQ1gxOGZEQXdNQkNsVWlrR0JnYWlqNDhQYnRxMENiT3lzbkQ1OHVWV0MvN3E2bXJENjYrL1ByK3NyQXh6YzNOUm9WQnd5MVRLQzFJQTVzcFRtcVNNRllBZ0NjQllBWkRzdHJUZ3RtclZDamR1M0lnNU9UbjR5U2VmR0t3eDZSc2lBVzl2Yi9UeDhVRnZiKzlHQVg2S1EwNU96bDY5WG85cjE2N2xDdFdXTmtrUlhnU3RBSUtDZ2t6a0ZXMEZFZ2s4YjA5cksyTDZEaDA2b0ZRcXhWbXpadEV5b01yRnhTVWVyZFQ0SkxCeDQwYU1qbzdHalJzM05ncndJeUw2K3ZwMk9YNzhlSFYrZnA3YUFDa0FBQ0FBU1VSQlZENSs4TUVIS0pWS3VXWTFxZ0ZRbnBnclQya0xrSmFwUVVGQndpTUFwVktKRW9tRUs3QVFvMWxLY0dtTEpUZzRHRU5EUTFHcFZHSldWaFlPSHo1ODBXKy8vZlo2WXlFQmV1N0dBUDZpb3FMZXMyZlBYbjdnd0FGVUtwWFlybDA3cmdiQ2Y4VzRPU2NwWTd5RWhJU2dSQ0pCcFZLSkdSa1p3aUlBVWdCVVphYXRRSE1GbHp4dHNSRER0bXJWQ3RQVDAxR3BWT0tHRFJzdU5tL2VQQnl0MklnRXRtM2JocG1abWJoczJUS3JCejhpb3JPemM4VHg0OGV2MERzQ1NQNlRRclcwL0tUTFFJS0Nnb1JKQU1ZS2dKcE1hSTFGU3VCNWUySjRZbGg2ZWNtb1VhTlFxVlJpZG5ZMmpoOC9QaFVBUEJvQkNTeFp0R2dSOXUvZmY0bTFneDhBRkY5ODhVVmFlWGs1S3BWS0hERmlCUGZTRGVNT1Njb1BjK1VuMWFnSUw0SldBRlJsYm1pTlpTNVBERXZMZ0xadDI2SlVLc1hseTVlalVxbkUzYnQzM3drSUNPaVBWbTRBNEJFVkZkWFAyc2tPRVRFc0xHekFyNy8rZWtlbFV1SHk1Y3ROeHAza1B5a0FjK2NudjBZVkdCZ29YQVVRSEJ4czBtbEdETXR2UTMxZW52NCtCWmxrVnV2V3JiRk5temFvVkNveE56Y1gwOUxTZm1yYXRHbDdaQ1o0azh2bEhRNGVQUGhMU1VrSktwVktiTk9tRGRjSFFmS2ZKaWRMeUU5anZBUUhCd3RMQVl3ZlAzNjFScVBCbkp3Y1RnSHdaWmE1Z2t1ZW1KNWtGakZ0eTVZdE1TVWxCWE55Y2pBM054Yy8rdWlqSEd0cUQyNk1CZ0FCbXpadHl2NysrKzlScVZSaVNrb0sxNTlDeXBUT1JsQmVtRHMvK2N2VHdNQkF6TW5Kd2QyN2QyT2ZQbjJFUXdBU2lZUzdHSlQyV1VsK0U5T1p5NU1Db0dVQTlWeTNidDBhdi9ycUs4ekp5Y0g4L0h4ODc3MzMxc0p6ZnFrbHM2Y0dmdi9seTVldk8zNzhPT2JsNWVIQ2hRdXhWYXRXM0JrVlkvbFArV0R1dkNSOFVKOUttelp0VUNLUkNKTUFBZ0lDSGxBQWxoQms4dlI1S05qVWROR2hRd2RjdVhJbEtwVktWS2xVT0dYS2xGUUE4R09RRWhUNC9SWXZYcHo2ODg4L1kzNStQcTVjdVpLN1hJUFcvalFwV1dwZWtnSUlDQWdRcmdLb2I2MWx6SFRtOHZRNWFCbEF0UUJhYzBWR1J1S3FWYXRRcVZTaVdxMW1KQ0JBOEo4NGNRTHo4L054MWFwVkdCRVJ3ZFdralBPUnh0L1M4cEsycUZ1M2JpMWNCZENpUlF0T1hoc0gyOXhCSms5TXl5Y0JrbDBSRVJHTUJLd0kvTFFjcGI0VUduZktBMHZKUytON0dhUlNLYlpvMFVKWUJLQldxekU3Ty91aENzQlNQUDg4UE1rdVl0NklpQWhNVDAvSG5Kd2NWS2xVT0hueVpFWUNBcEQ5ZVhsNW1KNmV6b0dmOHBBS2YvejdFQ3d0TC9rS0lEczdHM2Z0MmlVc0FpQUZ3TCtFd3RLQ1RZeExhMEkrQ1lTSGh6TVNFQ0Q0dzhQRFRjQlB0U2dhWjc3OHR4UnZmRGtMS1FCQkVvQkVJdUhhTFVsMkVlTmFtcWVnRS9PUy9LS3FNU01CWVlLZjhvL0drNVFvWHdGWW1xZmxLT1dmVlNnQWZ0WFZVanpOQkk4aWdiQ3dNRVlDQWdCL1dGallZNEdmWHdPd0ZFODRzUW9GVUYvVGhTVjdDajR4TUEwQ0l3RmhncC9HanhRb1gvNWJxamR1VGhPY0FsQ3BWSmlWbFlYKy92N2N0Vk0wczFweTBHbG1hSWdFYURDSUJMS3pzekUvUDUrUmdJV0JueWFkaHNEUFZ3Q1c1Z2tuZEZUWjM5OGZzN0t5Y09mT25jSWlBT1BCb0FLTXBRZWZrWUN3d0orYm0ydFY0T2Z2UmxHK0NaSUEvUHo4Nm0yK29JZTBWRS9KUXArWDVCZ2R6YVJCQ1EwTlpTUmdBZUNuVjJqVHVORE1TY3RPR2tjK0NWaXFweG9VTmFYNStma0pWd0hRcFNEVURDU1VRWGdVQ1FRRkJURVNzQ0R3MDNnSUhmejBPYWx3U2M4bGFBWEE3OENpaDdSMFQ4bERuNXRrR1RFekl3SExBajhwVFZwdTByanhTY0RTUGI4ajFTb1ZBQ01CWmd6OERYdXJVQUMrdnI0bUNvQXZ5NFRpS1pubzg5UGdFRU1IQmdaeXB3Z1pDVHg3OE5PcFBvbzc1UmROTWpST2ZCSVFpcWZsSnVXWHI2K3ZjQlVBWFFwQ3pVQkNHd3hHQWd6ODV2QzBpMEhQS1JnQ2VPT05OMWJuNStmam5qMTdPQVhBNzhYbXY1Tk9LSjZTaTU2REJvbk9EQVFFQkhBa2tKYVdobGxaV1ppWGw4ZEk0Q21BUHkwdGpRTS94Wm55aWlZWEdoYytDUWpOODgraStQcjY0cDQ5ZTNESGpoMllrSkFnSEFLZ3dUSnVCaExxb0R3cENiUnYzOTZFQk41OTkxMUdBazhJL3A5KytnbVZTaVdtcGFWaCsvYnRHd1g0alYvVVNwZUJTQ1FTWVJLQWo0L1BBejNaeG9Na1ZFL0pSczlqL0lKTlJnTFBEL3cwcWRBNDhFbEFxSjUvQnNYSHgwZjRDb0J1QnhiNjREQVNZT0IvSHA1Mk5heEtBWkJjczNZU0lPWnUwYUlGSTRHbkFINktJK1dSdFlPZmZ3Qk4wQXFBamdSVHRaWUtITmJpU2E3Um9CRnpHNU9BV0N4bUpQQVB3QzhXaXg4QVA4V1g0azN4dDdhOElyelE4d3VTQUx5OXZVME9hTkFNMmRoSXdOL2ZIOFZpTWJacjE0NlJ3R09BdjEyN2RpZ1dpOUhmMzc5UmdwOXdRbWNidkwyOWhhc0E2RWd3cmQxbzBLek5VMUxTNEZHeTBpRDYrZm1oV0N6R2tKQVFSZ0lQQVg5SVNBaUt4V0t1alp3bUQ0b254WmRQQXRibUNTOUVnb0lrQUM4dkw1TjJZQnJFeGtJQ0pPT29uZFBIeHdmRllqRzJhZE9tUGhMd2JXVGc5K1dEdjAyYk5pZ1dpN25hRWVVTnhiR3hnSjl3UW5uajVlVWxYQVhnNStkbndtZzBlTmJ1YVJEcHVhbWE2K25waVdLeEdJT0NnamdTeU1yS3dva1RKeTVwVEFUd3pUZmZMUG54eHg4NThBY0ZCYUZZTEVaUFQwK1QzU09LSDEvK1c3dW41eVlsWkZVS29MR1JBSDhaNE9ibWhwNmVucmhtelJyY3ZYczNMbG15QkFjTkd2UlZZeUtBTjk5ODg2dXRXN2RpUmtZR3JsbXpCajA5UGRITnplMmg4cit4NVkxVktBQmZYMSt1SUdZczQ2emRHeGNDamF1NUNvVUN2Ynk4T1BBdlhyd1krL1hydHhRQWZCclpFc0JuNU1pUlN6ZHYzc3lSZ0plWEZ5b1VDcFBkSTM0QnNMSGtEejAzdGRNTGtnQkl6dEdCSVA1YXJyR0FudzUwZUhsNW9aZVhGNjVkdTVZRGY5KytmWmMxdHZXL2NSMGdPVGw1R1pIQTJyVnJ1UmdaNTAxakl3SENDZVdOcDZlbjhCVUFYODVacTZmQm82U2x0YitQanc4RC94T1FBQlVDcVJaQThhVDRXbnNlRVY2c1FnRTBWTkJoNEcvYzRHY2tVTCt2cjNBc1dBWGc0K1BERlRTc2VmQVkrQmtKUE0wOElyelE4d3VTQUl3TE9zWWRYZlNRMXVLSnNhbnpqOER2N2UzTndQOFVTSUE2U2ltdWxFY1VkMnZMSi81WkVvVkNJVXdDZUZoVEJ3TS9NMFlDRFh0Kzg1Z2dDY0REdzROckJ6YmUxNlZCRTdxbkpLUjlmZ2IrNTBzQ2xFOThNaEM2cDN3aTNIaDRlQWhYQWRDZzBaWU9Bejh6UmdLUDlyUUY2TzN0TFh3RlFKMWR0QXlnd1JLcXA2UWptVVpyTmJiUC8zejdCQ2p1bEZkOE1oQ3FwN3dpM0FoS0FSamZDbXlzQVBoVlhHc0YvN3AxNnpBakl3T1hMRm1DL2ZyMVkrQi9DaVF3Y3VUSVpWdTJiTUhNekV4Y3QyNWRveUFCWTBVcEZvdUZlUzI0dTd1N1ZTa0FTaTZTWjdSR1krQTNMd25RT05BeVUrZ2t3RmNBN3U3dXdpUUFzVmhzd3RUR2d5TTBUK1RGQjcrbnB5Y0R2eGxKZ0pyTitDVEFWd1JDODhiSzBtb1VBSitoR2ZpWk1SSjQwRk9lV1lVQ01CNGM0MEVSaXFka29qVVpEUXFkNm1QZ3R3d1NvS1l6R2grcU9mSEpRQ2plZUpJUnJBSndjM1BqRGdRWkR3b0RQek5HQWcxN3lqZkNqWnViRzFNQURQek1HaE1KV0kwQ01HNEhKakJSbGROU1BhM0JxQkREQi8vYXRXc1orQzJRQktoUGdFOENOSTQwcnBhZWY4WUh5ZWdHS1VFUmdGcXR4dXpzN0FjVWdCQUc0VkhnWDdkdUhXWm1adUxTcFVzWitDMkVCRWFOR3JWczY5YXR1R2ZQbmdhVmdGQklvTDVDczFnc3h1enNiTnkxYTVld0NNRFYxZFdrR1lnL0NKYm1pWGtwK0xRR1krQVhOZ25RT05LNDBqaGJhaDRTVHFnSnlOWFZWWmdFWUt3QWpOZGtEUHpNR0FrOFBBOEpMMWFsQVBqQnR4UlBqTXZBYjUwa1FHZFMrQ1JBNDI1cCtVaWZ6eW9VQUorQkxTM29mUEJUd2RMRHc0T0Izd3BKZ01iWFVrbUFQby94Sk1RVWdCbG1mazlQVHdaK0t5SUJUMC9QQnBjRGxrWUNnbGNBR28wR2MzSnlVQ3dXUDVKNXplMXByVVdmVDZGUW9MT3pNNjVac3diMzdObUR5NVl0WStBWE1BbHMyN1lOczdLeWNNMmFOZWpzN015UkFJMDNmNWZBM0w0K0pTb1dpekVuSndkMzc5NHRMQUp3Y1hFeE9SQms2Y0ZXS0JSb1oyZUhTNVlzd1QxNzl1Q0tGU3Z3cFpkZVNnZjJHbStoa29EZjJMRmowM2JzMklIWjJkbTRaTWtTdExPemU0QUVMSFZTb29OQUxpNHV3aVFBUzFZQWZObFAxZFlwVTZaZ2RuWTJybDY5R3BPVGt6TUJJSUJCU2RBa0VQRHV1KzltN042OUc3T3pzM0hLbENrbXUxTU5MUWVZQW5pS0NxQ2hZSnZMRThQeXdSOFRFNFBaMmRtNGRldFdmTys5OTQ3YjJOaTBaUkFTdnRuWjJiVmR0R2pSOFQxNzltQk9UZzdHeE1TWUtGUEtBOG9MYytjblB5OEZyUURvU0RBVkFpMHR5SlFFN3U3dXVHVEpFc3pNek1TdnZ2cnFqa0toNk5jSVprZEZjbkx5WUFCUVdQdXp0bWpSb3QvMjdkdnZaR2RuNDdmZmZzc2RWT09UZ0tWTVRvUVhkM2QzWVNtQUNSTW1yTlpxdGFoVUtodFVBUFNRNXZMME9ZeUQzTGR2WDh6SnljRzFhOWRpLy83OVZ3S0FoN1d2ajVjdVhicnkxMTkveGZmZmYzK2x0ZGM1QU1CajRzU0pxVmxaV1ppVGs0TUpDUWtQVEU2V2xwL0dDa0NwVkdKR1JnWW1KaVkrVlFLUVBrczJ1SDc5T3JpNHVNREZpeGRCb1ZEQStmUG53Y3ZMQzg2ZE93ZmUzdDVtOFY1ZVhuRCsvSGxRS0JSUVdWa0pycTZ1Y09YS0ZSZzJiQmpVMXRiQ0gzLzhjVkduMDYxQXhBdGdwU1lTaWZ3WEwxNDhNeUVoSWFXaW9nSVNFaExldkgvL3ZrZ2tFdmtqNGxscmZHWkV2T0RnNEJEUm8wZVBsNXMyYmVyMnlpdXZnRjZ2QnpjM042aXNyQVJQVDArTHlrOFBEdys0Y09FQ3VMaTR3TldyVjU5WlhNVFBNdWhPVGs1dzllcFZjSGQzaHdzWExuQkJObGR3dmIyOTRmejU4K0RwNlFtVmxaWGc3dTRPVjY1Y2djNmRPNE9ycXl2Y3VuVUxpb3VMTi8vODg4OHgxZzcreE1URWxETm56a0JOVFEzVTF0WkNVbEpTeXBRcFUyYUtSQ0ovYTMzMm5Kd2NWNjFXdXgwQXdNUERBK0xpNHVEeTVjdmc3dTV1UWdLV2tKOFhMbHdBZDNkM3VIcjFLamc1T1FtVEFFZ0JYTHAwaVp0eGlXSE41UW44Q29VQ0xsMjZCTTdPemhBUkVRR0lDTmV1WGJ0NzZOQ2gzWUdCZ1dzYUEvalBuVHNIYytiTWdRc1hMalFLRW5qaGhSZDBlWGw1MndIZ0hpSkNlSGc0T0RzN20rU25wNmVuV2ZQVHk4dkxKRDlkWEZ6Zyt2WHJ3aU1Ba1VqRUtRQTNOemNUQlVBeXh4eStzcktTazFldXJxNXc3ZG8xaUkyTmhacWFHdmpQZi82ei84YU5HMzlZSy9pWExGa3lNeWtwS2VYczJiTncvdng1bUQ5L1BodytmQmptejU4UEZ5OWVoUHYzNzBQZnZuMVQzbnZ2UGFzbGdVdVhMdjMrMy8vKzk0QllMSWJZMkZpNGR1MGF1THE2d29VTEY4RER3NE9icE15WnA2UUEzTnpjT0FVZ0VvbEFKQklKVXdGY3ZuelpJb043NWNvVmFOdTJMY2psY3JoejV3NGNQWHEwdUxhMnR0UmF3Vzg4ODMvMjJXZHc5dXhaY0hCd2dMTm56OEpubjMxbW9nU3NsUVNxcTZzM0dReUdFb2xFQWk0dUx0QzZkV3U0Y3VXS1JVNVNseTlmRnE0Q01LNEJ1TG01bVJRQ0tjam04TWJCZFhaMkJtOXZiMEJFcUtxcWduUG56aDJRU0NRdHJCMzhDeFlzZ0lxS0NuQnljb0pidDI2Qms1TVRWRlJVd0lJRkM2eWVCR3hzYkxxZlBuMzZvRXdtQXdBQWIyOXZjSFoyaHN1WEw1c3NBOHlacHdxRkFpNWV2R2lpQUFSYkE2RGdHaGNDS2NqbThCNGVIbkR4NGtWTy9vZUVoQUFpd3AwN2QyNmVQWHYyVEdNQS8rblRwOEhaMlJsdTNMZ0JMaTR1Y09QR0RYQjJkb2JUcDA4M0NoSTRmUGp3ZnhEeEx3Q0FrSkNRZXBjQjVzeFRLZ0RTSkNVNEJVQnJGVWRIUnk2NC9FS0xPYnd4czE2NWNnV2NuSnpBMWRVVkVCSCsvUFBQOHdCUWJZM2dQM3YyTEp3N2R3NCsvL3h6cUtpbzRKS0tTTkRWMVpVajY0cUtDdmo4ODg4NUVyRFNta0RWblR0M3pvdkZZbkJ4Y1FFbkp5ZHVHVUJLMWR4NWV1blNKVzU4SEIwZG4xa2dwTTh3QWJtWjVjcVZLeGFsQUl6M1Y1MmNuR2dKY0JNQWFxd1ovRFR6RStncDZTOWZ2c3o5bTVUQTU1OS9Eak5uemdTRlFnRjkrL1pOK2JzSVpTMTlBalhWMWRVM2JHMXRPZktqV3BWQ29iQ0lQSFYzZCtkMnFhNWR1OFlWQVo5MklmQ1pOZ0xKNWZKNkZZQzV2TEg4SndWZ2EydEx4YUcvQUtET0dzRlBzdC9KeWNrRS9DUXpLZG1NNDBMTEFTS0JwS1NrRlByOVZrQUNkZmZ1M2JzakVvbEFKcE54dFNwWFYxZTRlUEVpdHd3d1o1N1NMdFdWSzFkQUxwY0xUd0VBQU55OGViTmVlWFhod2dXemVYZDNkN2g0OFNMSHJCS0poSUNEMWc1K2t2M1VuR1VNZnZwM1l5RUJpVVFpRW9sRUlCYUx1ZVhQbFN0WHVFbkMzSGxLeW96R1RUQTFBR09wSXBmTHVhU2pyVUJ6QnRYRHc4TmtiZVhrNUFSMzd0d0JzVmdNOXZiMjlzKzZLUG84d0orVWxKVHkzLy8rRjg2ZlAvL0U0S2ZPTTVMRnhpUmczQ2N3ZGVwVW9kY0VKSCtQTjl5NWM4ZEVHVjI2ZE1raThwVEkrUHIxNnlDWHk1OVpIOEJ6VndBVVhITjRLZ0FhcjYxdTNib0ZZckVZNUhLNUN3REloQTUrbXZrLysreXplc0ZQejI4TWZtUFByd2tRQ1h6MjJXY3dhOVlzcmlZZ2NDVWdsY3ZsenRYVjFYRHIxaTBUQlVBSzBSTHlWSkFLZ0Y4RE1DNndHQWZYSE41WTVwSUNPSHYyTEloRUluQjBkUFFDQUR0ckFQLzgrZk5Od0U4RlQwcXFoc0JQOGFIOVoycENJUktZUDMrK3llNkFVSldBV0N4dTByeDVjMDlFaFAvKzk3OG1Dc0NTOHBUaUwvZ2FBTWxLa2xmbURDN05nQVNLOCtmUGcwZ2tnaVpObWpRUERnNE9zZ2J3VTVNUGdmL2F0V3NQZ1A5aHlXZXNCSXgzU3lvcUttRCsvUG53MFVjZkNWb0pkT3ZXTFZna0VqV3BxNnVEYytmT2NYRWlCV0FKZVdxc3dBVFpCMkJjQXpBT3JxVW9BRXJxNzcvL0hrUWlFZGpiMjRPZm4xL0hlL2Z1RlF0MXpmKy9ncDlxSk1aSzROcTFheVpLZ0VpQWFnTDkrdlZMZWYvOTl3V2pCRzdmdnIwaE9EaTQ0NzE3OTBBa0VrRjVlYm5KSkVXMUtuUG42WlVyVjB3VXdMT3FBVHh0YzVrNGNlSnF2VjZQS3BVS1JTSVJkeWtJM1d4Q2x4eVl5OU1kYTNSbHVaT1RFMjdhdEFuejgvTnh3WUlGKzBBQUYyTUFnTitTSlV0U2YvMzFWOVRwZExoKy9Yb01DZ295aVRlOW1KV2VsKzZYZjl3NDBmZlR6OVB2YzNGeFFaRkloRUZCUWJoKy9YcFVxOVZZVUZDQTc3Ly9mcXBBWXVldjBXZ09GQlVWNFpvMWE5REp5Y2trSCtoNXpaMm5oQmVLdDBxbHd1enNiRXhLU3JMc0c0R01DY0RSMGRFa3VFK2FoTThqdUhRUnFFcWx3aDA3ZHR4VEtCVGRHanY0clprRVdyWnMyZVBubjMrdTBXZzArSzkvL2Nza0R5eGxrcUs0RTI0Y0hSMkZSUUNGaFlVV3F3QW91TWJKSEJJU2dpcVZDbk56YzNIczJMRXJwMDZkMnRxU3dYL3k1TWxuRG41ckpBRUE4UGo4ODg5WEh6eDRFRlVxRmJadTNmcUJ1Rm5pSkNVNEJWQllXSWhxdGRwaUZVQjl5NEJseTVhaFdxM0diZHUyWFhWMGRJeXlaUEFYRkJUZ2hnMGJuam40bjRRRU5tellnQnFOQnZWNnZjV1NnSmVYVit5SkV5ZXVGeFFVNExmZmZtdXg4cjgrQmFCV3F6RW5Kd2Y3OXUwckhBSVFpVVRvN094Y0w4T2EyeHNuc1Znc3h2NzkrNk5hclVhVlNvV1RKazFhQndDZVFnQS94WmVTaFdZT1BnbjhyNTUrSC8xKytudk96czZDSUFFQThGcTJiTm1XUTRjT29WcXR4bjc5K3BtTXY2WG1KOFZYa0FRZ2w4dE5ndnkway9KL1RXWktZcHJKRmkxYVJJR3VhdE9temNzTS9OWkRBdkh4OGNOT25UcDFUNmZUNFZkZmZmVll5c25jK1VtZlR5NlhDNGNBVWxKU1ZoY1ZGYUZHbzdGb0JjQlBZaWNuSnd3S0NrS1ZTb1ZhclJZM2JkcjBIN2xjSG00SjREOTE2aFRxOVhxemd2OUpTVUNyMVdKaFlTRk9temJON0NUZzRlRVI5Y01QUDFUczI3Y1A4L1B6c1VXTEZnL0lmM29lUzFVQTlLNE5TeWNBNTRrVEozSUVZS2tLb0NFU2NIUjB4TkdqUjZOR28wR2RUb2VmZi82NVJpd1d0N1FrOEZOU21BUDhqME1DWXJIWW9raEFKcE8xenNuSktUeHk1QWhxTkJwTVRrNjJlUER6RllDVGt4TnFOQm9xQXFZQmdMUEZFc0Q0OGVOWEVnSFkyTmcwV0dpeEZNK3ZCVGc1T2VIWFgzL055ZGlQUC81NEJ3QUVQbWZ3dDFpNmRHbWFNZmdEQXdPNXoxZmYydFdTNGljV2l6RXdNTkNFQktaUG41NEdBQzJlWnh3bEVrbkxUWnMyWmZ6NDQ0OUU2RnhoMmxMaTE1QTNWcVoyZG5ZY0FTUW1KbjVueVFUZ05HN2N1RVVHZ3dHMVdpM0hhUHl0UUVzSk1uOEdvOC9wN2UyTjZlbnBxTlZxc2Fpb0NELy8vUE1zR3h1YjRPZVV0SzNXckZtejdlVEprMWhZV0lnYk4yNThKUGpORlZmNnV3OGpnWTBiTjZKT3AwT0R3WUJ6NXN6WkpoYUxXejJQT05yYjI0ZnMyclVyNzhTSkUxaFFVSURwNmVrbWI5dDltSUt5bEx5a3o2bFFLRkNyMVdKV1ZoWW1KQ1FzQWdBbmkwUy9yNit2NDZ1dnZqcS91TGdZdFZvdHVybTVQWkMwbHFvQStETFcxOWNYVjY5ZWpWcXRGZzBHQTI3WXNHRy9uNTlmdDZ0WHIzNzZMQkwycjcvK1d0K2lSWXRPR28ybStNU0pFNmpYNjNIanhvMmM3TGMwOEQ4dUNRUUZCWm1Rd09yVnEwdTh2YjA3Mzc1OWUvMnppT052di8zMmVwczJiWHFVbHBaKy8rT1BQM0xnOS9IeHFYZjVaS2tLd0RpT2JtNXVxTlZxTVNNakEzdjI3RG5mMDlQVDBTSUpvRXVYTHMySERSczJ2YVNrQkxWYUxYYm8wTUVrNkpiR3RJOGlBUjhmSDB4TlRlV1VRRkZSMGVVUkkwWk1lOXBMQWdBSUdEMTY5THYvK2M5L0xodytmQmgxT2gybXA2ZWpuNStmUllQL2NVbkF6OCtQVTFRR2d3RUxDd3N2RGhvMGFESTg1VmV2QTBEUXYvNzFyNWxuenB5NTl2MzMzNk5PcDhNVksxYWd0N2Uzb01CUDhhVFBHeG9haWxxdEZuZnUzSWxkdW5TWkhoTVQwOXhTQ2FCcDM3NTl4KzNkdXhlMVdpMUdSMGMvc09ZU0dnbDRlSGpndEduVFVLdlZvbDZ2eC8zNzkrT3VYYnNPSkNRa2pBR0F3T3JxYXNNL1NkYmEydG9LQUFqbzI3ZnZ5TUxDd3RMZmZ2c045KzdkaXpxZERqLzU1Qk91S2NUU3dmKzRKT0RwNllrelo4N2s0bmpnd0FIY3ZuMzd2cDQ5ZTQ0R2dJQi9Hc2UvL3ZwclBRQUVEaGt5NUkzOSsvY2ZPblhxRk5JRU5IbnlaTzd6Q1EzOEZEOUhSMGVNam81R3JWYUwyN1p0dytqbzZIRWRPM1pzYXFrRVlCc2FHdHE3ckt3TWRUb2REaGt5cE42dFFFc0wrcU5JUUM2WFk4K2VQWEgzN3QyY2xEMTA2QkJxdGRwajQ4YU5tK3Z0N2QwSkFGcE1uVHExZFcxdGJVVkR5VHAxNnRUV0FOREN5OHNyOXMwMzMvems0TUdEMzU4NWN3WVBIanlJQlFVRm1KbVppUU1HRE9CMlQranZXenI0SDBVQ3huRk1URXpFakl3TTFPbDBXRnhjakg4MzVod2VOMjdjbk1lSjQ5L0U2UUVBZ1FFQkFWMm5USm15NE5peFl6K2VQbjBhOSsvZmp3VUZCVFJUUGhCSFN3Yy9QdzlwQzNESWtDR28xV3B4NDhhTkdCQVEwTHRqeDQ2MlQrMVU2ZE1rZ002ZE84c09IRGpRMm1Bd0hMcDc5Njd0amgwN1lQZnUzZHpMSitobUd1UGJhQzNOMC9sM3VqSEkwZEVSYnR5NEFRNE9EbEJUVXdOdnZ2a205T3JWQzJReUdVaWxVbWphdENuWTI5dlgzTHg1ODFScGFlbXhpb3FLVTlldVhUdFhVMU56NThhTkczODZPVGsxbDhsa2RzN096cDR0Vzdac25aQ1FFTzdvNk5qNjl1M2JOamR1M0lDN2QrOUNUVTBOR0F3R1NFMU5CWkZJQkxkdTNlTCtMbjBPK2x5V0hqLzZmQStMWTExZEhhU2twRURQbmoxQktwV0NUQ1lEZTN0N2t6aWVPWFBtdDJ2WHJwMjdkKy9lWDRoNFh5d1dTK3pzN0pxNXVMajRCQWNIdCt6Um8wZDRzMmJOQW0vZHVpVzllZk1tVkZWVndkMjdkeUUvUHg4MmJOZ0FOalkyRDQyanBjZVA4T0xnNEFCRGh3NkY0Y09IdzVrelo2cFRVbElpTzNic2VPckFnUU5QNVFacjZWTW1nTHA5Ky9aVjNiNTkrNkpVS3ZYejlmV0ZtemR2Z3FPam84bTlBSllhL0laSWdBWkRMcGZEb2tXTFlNZU9IZENyVnkvbzE2OGZPRHM3dzYxYnQyUVNpYVJ0bHk1ZDJ2YnUzUnRzYlcxQktwV0NXQ3dHUkFSRWhKcWFHcWlxcW9LYk4yL0NsU3RYb0s2dURtN2N1QUVhalFhMFdpMzg4Y2NmNE9EZ1lFS1dRZ1AvbzBqQU9JN2ZmUE1ON05peEF4SVNFaUF4TVpIZVVzVEZzVmV2WHZYRzhkNjllMUJWVlFWWHJseUJ5c3BLUUVTNGZQa3k1T2ZuUTFGUkVWUldWb0pjTHVjdW82a3Zqa0xKUDdsY0RqZHUzQUJmWDErb3E2dURQLy84OHlJaVZzZkV4TlFkT0hEQThtNEVxcTJ0clFPQXFrdVhMbFg0K1BqNCtmajRnSU9Ed3dNM0ExbHk4QitIQk02ZlB3OVpXVm13Y2VOR2lJbUpnVFp0MmtCa1pDUzBhdFVLN093YXZsV3N1cm9hVHAwNkJZY1BINGFUSjAvQ3dZTUhvWG56NXZEbm4zOCtNbW1GQXY0bklZRS8vdmdEZHUvZURXdlhybjJpT042NWN3ZCsrZVVYT0hMa0NKdzhlUklPSHo0TWNya2NidDI2SlhqdzE2Y0FmSHg4b0s2dURpNWZ2bHdCQUZWMWRYVVdmWDI5eTF0dnZiV3lzTEFRdFZvdDJ0blpOZGg1WmFscnNJWnFBdncxTFQyWG82TWppa1FpbE12bDZPbnBpWjA3ZDhhNHVEZ2NNR0FBeHNYRllaY3VYZERIeHdlZG5KeTQ3elArZWY1YW43OVdGVXE4SGxVVGVKSTRlbmg0WUtkT25UQXVMZzU3OSs2TmNYRnhHQjhmajI1dWJpaVh5MUVrRW5FRjVzZU5vMURpVlY4VFVGWldGZzRZTUNEVmt0dUFhUm5RckgvLy9tOFhGeGRqUVVFQnhzYkdtZ3lPVUFhRFR3SlBrc1FQODQrYnJFS0xFNHZqMHk4QWlzVmlqSTJOeFlLQ0F0eTJiUnQyN05qeDdlam82R1lXVFFEeDhmRTJDb1VpdHFTa3BMYWdvQUNUazVNZk9CTWd0Qm1OUDVNOUtva2Y1ZW43K2RWOW9jLzQ1b3BqUTZBWGFwNFpud0pNVGs1R25VNkhxMWV2cm5WMmRvNk5pb3F5c1dnQ21ESmxpZ1FBQXJLenMwL3E5WHBjdkhneGlrUWlqckdGT3JQUjREd3FpZm5KekUvU1J5V3J0WUtmeGZISkZBQXRGeGN2WG94cXRSby8vL3p6a3dBUU1ISGlSSWxGRThDa1NaTkVBT0EyZmZyMERWUUg0RE9iME5lMGowcml4L1VOL1Q1ckJUK0w0NU1wQUhkM2Q5UnF0WmlkblkzRGh3L2ZBQUJ1NDhlUHQveXJnV05qWTV2MTZkUG5EWVBCZ0hxOUhudjE2dlhBOVdCQ1QvYUdrdTZmZW1zSFBZdmpreFVBSFIwZHNWZXZYbGhRVUlDYk4yL0dpSWlJMXlNakk1dUJFS3hqeDQ0eWUzdjdkbHF0OXJwZXI4Y0ZDeGJVdXd5d2x1Um5vR2R4ZkpxMUVaTC9DeFlzUUoxT2gwdVhMcjF1WTJQVE5pSWlRaGl2cm52cnJiZEVBT0M1WU1HQ0xMb2VqSC9LeWRxcTNNd3ovelR2VmZEdzhFQzFXbzFLcFJMZmVPT05MQUR3ZlAzMTEwVWdGUFB5OG1xZW1KZzRzYWlvQ1BWNlBmYnYzOS9xbGdITU0vK3M1SC8vL3YxUnI5Zmo1czJiTVNvcWFxSkNvV2dPUXJLQkF3Zkt4R0p4Njl6YzNNckN3a0pNUzBzeldRWXdFbUNlK2ZxYmYwUWlFYWFscGFGV3E4V3Z2LzY2VWlRU3RVNUtTaExXbTZzblRKZ2dBZ0RYZDk1NUo3V3dzQkNMaW9vd0ppYUdMUU9ZWi80UjhqOG1KZ1lMQ3dzeEl5TURCdzhlbkFvQXJtUEdqQkdCMEN3Nk90ck96OCt2dTFhcnJTb3NMTVI1OCtZSnZpbUllZWFmZGZQUHZIbnpzS0NnQUZldVhGbmw3dTdlUFN3c1RIQ3ZyUWNBZ0lrVEo0b0J3R3YrL1BsWmVyMGVpNHFLME4vZm45VUNtR2UrZ2JXL3Y3OC9GaFVWWVhaMk5oWC92TWFNR1NNR29WcFVWRlRUc0xDd2dRVUZCYlZGUlVVNGYvNzh4N3JYbm5ubUd4UDRhNnV5UWdBQUNtdEpSRUZVNmZLUCtmUG5vMTZ2eDlXclY5Y0dCZ1lPREFzTGF3cEN0bjc5K2trQXdHZmh3b1dxd3NKQ05CZ00zRjJCUXJucGhubm1uOGZOU1IwNmRFQ0R3WUE1T1RuNDVwdHZxZ0RBSnlFaFFRSkN0OGpJeUtadDI3YnRyOUZvN2hVVkZlR1hYMzc1UUMyQUZRU1piOHlGUDdsY2psOSsrU1hxOVhwTVMwdTc1Ky92M3o4ME5MUXBXSU85L3ZycllnRHdtalZyMWs2OVhvOEdnd0hqNCtNRmMyRW84OHcvNjRzLzQrUGowV0F3WUdabUpvNFpNMlluQUhpTkdqVktETlppRVJFUlRUdzhQT0tWU3VWMWVsQjdlM3ZXRjhCOG85LzN0N2UzeDh6TVROVHBkTGg0OGVMcnpzN084ZTNidDI4QzFtUmp4NDRWQTREcnFGR2o1aFlVRktEQllNQVpNMmF3Z2lEempiN3dOMlBHREN3cUtzSXRXN1pnUWtMQ1hBQndIVEZpaEJpc3pmN3VaZ3BNVFUwdEx5d3N4T0xpWXV6U3BRc3JDRExmYUF0L1hicDBRWVBCZ0VxbEVtZk1tRkVPQUlFOWUvYVVnYldhaDRkSHM2Q2dvTDVLcGZLMndXREFqSXdNN3MwdGpBU1liMHpnOS9iMnhveU1EQ3dvS01EbHk1ZmY5dmIyN3V2bTV0WU1yTm4rWGdxNGpSZ3hZZzY5SEdMeDRzV0Nld2tHODh6L3J5OUxXYng0TVJvTUJ0eTBhUk1tSkNUTUFRQzNWMTU1UlF6V2JvbUppVElBOEo4N2Q2NnFvS0FBaTR1TGNjS0VDUTF1RFRJU1lONmF3QytYeTNIQ2hBbFlYRnlNR1JrWm1KS1NvZ0lBL3g0OWVzaWdzVmhZV0ZnVEp5ZW44UFhyMTU4cUxDekVrcElTSERCZ2dHRGVoY2M4OC8vMFhZa0RCZ3pBNHVKaXpNdkx3MDgvL2ZTVWc0TkRlTHQyN1pwQVk3SXhZOGFJUER3OEhBSUNBdnBsWkdSYy8vdXRzZGk1YzJkR0FzeGJMZmc3ZCs2TWVyMGVOUm9OTGxxMDZMcVhsMWMvTnpjM2grSERoNHVnc2RscnI3MG05dkR3Y0k2TmpSMmJtNXRiVlZ4Y2pEcWREcU9qb3hrSk1HOTE0S2UzL09yMWVreE5UYTFxMzc3OU9EYzNOK2RHc2U1L1NEMUFBZ0R1TDczMDB2VGMzTnlhNHVKaTFHZzBHQkVSd1VpQWVhc0JmMFJFQkdvMEd1Nmd6d3N2dkRBREFOeDc5T2doZ2NadWlZbUpVZ0R3SEQ1OCtDZDVlWG4zaTR1TFVhdlZZbHhjSENNQjVnVVAvcmk0T05ScXRWaFlXSWhyMXF5NTM2ZFBuMDhBd0xOSGp4NVNZUFovMXFkUEh4a0FlSTBZTVdLdVVxbThUNjhXNjkyNzl3Tm5CdmdkZzR3TW1MZUVXNHo1THpOeGRIVEUzcjE3WTBGQkFlcjFlbHl6WnMzOXBLU2t1UURnMWFncS9rOUtBb01IRDU2Wm5aMTlyN2k0R0V0TFMzSDQ4T0dNQkpnWEhQaUhEeCtPcGFXbFdGQlFnT25wNmZkNjllbzFrNEgvOFVoQTBhTkhqMG03ZCsrK2JUQVlzTFMwRkdmTm1vVUtoY0xrM1hEVzhoWmQ1cTNqcmNlVWx3cUZBbWZObW9XbHBhV28wV2h3K2ZMbHQyTmpZLy8xZDE0ejhEOEdDVWdCd0xWTm16YkRObTdjZUZHdjEyTnBhU211VzdjT1EwSkM2bjFCWkdON3h4N3psdkZPUS80TFRVTkNRbkRkdW5WWVVsS0NPVGs1dUhEaHdvc0JBUUhEQU1DVnJmbWZ3RjU5OVZXeHU3dTdvNGVIUjVldnZ2cXFYSzFXWTBsSkNlcDBPaHd6Wm96SkZlTU52U1dXa1FEenozTEdOeTcwaVVRaUhETm1ET3AwT2pRWURMaGp4dzc4NElNUHlsMWRYYnU0dWJrNU51cXR2ditSQkpyS1pMTFdFeWRPWEx0bno1NWFXaEo4OTkxMzZPdnIrMEJ0Z0NrQzVwL0hqRys4MXZmMTljWHZ2dnNPUzB0TFVhdlY0dXJWcTJ0SGpCaXhWaXFWdG5aemMydkt3UDgvMk9qUm8wVjkrdlN4QlFDdjZPam8xOWVzV1hOZW85RmdhV2twRmhVVjRSdHZ2TUVOenFQZUc4L0lnUGwvQW5yK2pFOTU1dWJtaG0rODhRWVdGUlZoY1hFeFptWm00c0tGQzgrSGhvYSsvbmV4ejdaUmR2ZzlxN3FBdTd1N282T2pZK1JiYjcyMVBUTXo4MzVSVVJIdTNic1hjM0p5Y09USWtTaVZTaDlZRmp3dUdUQlNZQzhpZlJqb2plVytWQ3JGa1NOSFlrNU9EdTdkdXhjMUdnMnVXYlBtL3VqUm83YzdPRGhFdXJtNU9mYnMyWk90OTUrMmpSbzFTaFFhR21vSEFGNmhvYUhKMzN6enpROUtwUktMaTRzNUluajU1WmROcmx0NkhESjRGQ2t3YjUyZVAvNFBBejM5LzVkZmZwa0R2bDZ2eHkxYnR1RHMyYk9QaDRTRWpBUUE3L2J0Mjl1OThzb3JiTlovbHBhUWtDRHg4UEJ3QUlDZ1BuMzZ6RXBOVGYwakx5K1BJNEs4dkR4OCsrMjMwZFhWbGFzUjhKY0hmREpvaUJTWXQwN1BIM2QrWGxDK09EbzZvcXVySzc3OTl0dVlsNWVIZS9mdXhjTENRdHkrZlR0KytlV1hmN3p3d2d1ekFDREkzZDNkb1dmUG5xeXQ5M24zREhoNGVEaloyZG0xN2QrLy8veVZLMWVleThuSlFZUEJnSHYzN3NWOSsvYmhOOTk4Z3dNSERrUjdlM3VPRElqUkd5S0Zoc2lCZVdIN2hzYVo4b0R5d3RIUkVlM3Q3WEhnd0lINHpUZmY0TDU5KzdDMHRCUjFPaDF1M2JvVkZ5NWNlSzVQbno3emJXMXQyM3A0ZURqMTd0MmI3ZTJiczBpWWxKUmtBd0RPTXBrc3VGdTNiaDhzWExqd2gxMjdkcUZPcDhQUzBsSk9ybjN4eFJjNGJOZ3dkSE56NHk0Zm9VRi9YRkpnWHRpZUQzYnljcmtjM2R6Y2NOaXdZZmpGRjErZ1hxL0h2WHYzY3VmMjE2OWZqM1BtekRuZXFWT25EMlF5V1RBQU9QZnAwOGRtNU1pUmdwYjdJbXNpZ2l0WHJraVBIajNhOU1LRkMwNGhJU0ZSblR0M0hoWWJHOXZIMWRYVjBjSEJBV3hzYkVBcy9yOGRtWFBuenNFdnYvd0N2Lzc2SzF5OWVoVk9uRGdCdDIvZmhtdlhyb0ZjTG9kYnQyNkJnNE1EM0xwMUMrUnlPZHk4ZVpONWdYb2FSd2NIQjdoNTh5WTRPenREczJiTklDUWtCRnhjWEtCTm16WVFIQndNM3Q3ZUFBQlFXMXNMZCsvZWhhdFhyOExWcTFkdmxKZVhhOHZMeTNmOThzc3Zoenc4UEs2SGg0Zi81ZXJxV3J0bHl4WVVPbTZzc2xpUmxKUWt2WGp4b3UyUkkwZWEyZGpZdUVaRVJIU1Bpb3JxMDc1OSszaFhWMWYzNXMyYmc1MmRIVWlsVWhDTHhSd3AxTmJXUW1WbEpWeTRjQUgrK3VzdnVISGpCbFJYVjhQdDI3ZkJ4c1lHN3QyN3g3ekFmTE5temNEVzFoWWNIUjJoYWRPbW9GQW93TlBURTZUUy95dlMxOVhWd2YzNzkrSGV2WHZ3MTE5L3djMmJOK0hxMWF1WGZ2cnBwN0lmZnZoQmUvVG8wZUo3OSs1ZGpZaUkrTlBkM2IxYW85SFVXaE5XckxwYU9YYnNXTkhSbzBlbEZ5OWV0S3Vzckd3S0FBNXQyN2J0NE9ucEdSY1ZGUlhwNStmWHJubno1aDUyZG5aZ2IyOFB0cmEySUpWS1FTS1JnRmdzQnBGSUJDS1JpQ01JWnNLeXVybzZRRVR1aThCZVUxTURkKzdjZ2J0MzcwSjFkVFhjdW5YcjR0bXpaMzg2ZHV6WTRjckt5djBuVHB3NERnQzNGQXJGWHdxRm9pb3NMS3gydzRZTmFJMHhhalRiRmErLy9ycm8wcVZMa2dzWEx0aWNQMy9lOXZ6NTgwMEF3TjdSMGRIWjM5Ky9wVnd1RDVUTDVmN0J3Y0dCenM3T2lpWk5talMzc2JGcGFtTmowMVFpa2RneU9BblRhbXRycSsvZHUvZFhkWFgxWDNmdTNQbnoyclZyRjA2ZE9uWDY1czJiWjIvZXZIbjY3Tm16LzdseDQ4WTFBTGpqNWVWMTE4dkxxMXFoVU54emQzZS92M2J0V3JUMitEVGEvY3FKRXllS0xseTRJSzZzckpTSVJDTHB1WFBucE9mT25aTUJnQzBBeUFCQUNnQ1N2NzlFalRsV0FqYjgrK3YrMzErMUFGQURBTlhlM3Q0MVBqNCt0WFYxZGJXZW5wNzNQVDA5NjlMUzByQ3hCWWdsTmM5U1VsSkVZckZZSkJLSlJQdjM3eGVKUkNKQVJCWXI0UklBQUFERXhjVWhJbUpkWFIwMlJxQXpZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpKZ3hZOGFNR1RObXpDelovai9lenYwRVZzRTBqd0FBQUFCSlJVNUVya0pnZ2c9PSc7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRvb2x0aXA7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleC5qc1wiKTtcbiIsIi8vIHJlcXVpcmUoJ2ZzJykucmVhZGRpclN5bmMoX19kaXJuYW1lICsgJy8nKS5mb3JFYWNoKGZ1bmN0aW9uKGZpbGUpIHtcbi8vICAgICBpZiAoZmlsZS5tYXRjaCgvLitcXC5qcy9nKSAhPT0gbnVsbCAmJiBmaWxlICE9PSBfX2ZpbGVuYW1lKSB7XG4vLyBcdHZhciBuYW1lID0gZmlsZS5yZXBsYWNlKCcuanMnLCAnJyk7XG4vLyBcdG1vZHVsZS5leHBvcnRzW25hbWVdID0gcmVxdWlyZSgnLi8nICsgZmlsZSk7XG4vLyAgICAgfVxuLy8gfSk7XG5cbi8vIFNhbWUgYXNcbnZhciB1dGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzLmpzXCIpO1xudXRpbHMucmVkdWNlID0gcmVxdWlyZShcIi4vcmVkdWNlLmpzXCIpO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdXRpbHM7XG4iLCJ2YXIgcmVkdWNlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzbW9vdGggPSA1O1xuICAgIHZhciB2YWx1ZSA9ICd2YWwnO1xuICAgIHZhciByZWR1bmRhbnQgPSBmdW5jdGlvbiAoYSwgYikge1xuXHRpZiAoYSA8IGIpIHtcblx0ICAgIHJldHVybiAoKGItYSkgPD0gKGIgKiAwLjIpKTtcblx0fVxuXHRyZXR1cm4gKChhLWIpIDw9IChhICogMC4yKSk7XG4gICAgfTtcbiAgICB2YXIgcGVyZm9ybV9yZWR1Y2UgPSBmdW5jdGlvbiAoYXJyKSB7cmV0dXJuIGFycjt9O1xuXG4gICAgdmFyIHJlZHVjZSA9IGZ1bmN0aW9uIChhcnIpIHtcblx0aWYgKCFhcnIubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gYXJyO1xuXHR9XG5cdHZhciBzbW9vdGhlZCA9IHBlcmZvcm1fc21vb3RoKGFycik7XG5cdHZhciByZWR1Y2VkICA9IHBlcmZvcm1fcmVkdWNlKHNtb290aGVkKTtcblx0cmV0dXJuIHJlZHVjZWQ7XG4gICAgfTtcblxuICAgIHZhciBtZWRpYW4gPSBmdW5jdGlvbiAodiwgYXJyKSB7XG5cdGFyci5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG5cdCAgICByZXR1cm4gYVt2YWx1ZV0gLSBiW3ZhbHVlXTtcblx0fSk7XG5cdGlmIChhcnIubGVuZ3RoICUgMikge1xuXHQgICAgdlt2YWx1ZV0gPSBhcnJbfn4oYXJyLmxlbmd0aCAvIDIpXVt2YWx1ZV07XHQgICAgXG5cdH0gZWxzZSB7XG5cdCAgICB2YXIgbiA9IH5+KGFyci5sZW5ndGggLyAyKSAtIDE7XG5cdCAgICB2W3ZhbHVlXSA9IChhcnJbbl1bdmFsdWVdICsgYXJyW24rMV1bdmFsdWVdKSAvIDI7XG5cdH1cblxuXHRyZXR1cm4gdjtcbiAgICB9O1xuXG4gICAgdmFyIGNsb25lID0gZnVuY3Rpb24gKHNvdXJjZSkge1xuXHR2YXIgdGFyZ2V0ID0ge307XG5cdGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG5cdCAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KHByb3ApKSB7XG5cdFx0dGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuXHQgICAgfVxuXHR9XG5cdHJldHVybiB0YXJnZXQ7XG4gICAgfTtcblxuICAgIHZhciBwZXJmb3JtX3Ntb290aCA9IGZ1bmN0aW9uIChhcnIpIHtcblx0aWYgKHNtb290aCA9PT0gMCkgeyAvLyBubyBzbW9vdGhcblx0ICAgIHJldHVybiBhcnI7XG5cdH1cblx0dmFyIHNtb290aF9hcnIgPSBbXTtcblx0Zm9yICh2YXIgaT0wOyBpPGFyci5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIGxvdyA9IChpIDwgc21vb3RoKSA/IDAgOiAoaSAtIHNtb290aCk7XG5cdCAgICB2YXIgaGlnaCA9IChpID4gKGFyci5sZW5ndGggLSBzbW9vdGgpKSA/IGFyci5sZW5ndGggOiAoaSArIHNtb290aCk7XG5cdCAgICBzbW9vdGhfYXJyW2ldID0gbWVkaWFuKGNsb25lKGFycltpXSksIGFyci5zbGljZShsb3csaGlnaCsxKSk7XG5cdH1cblx0cmV0dXJuIHNtb290aF9hcnI7XG4gICAgfTtcblxuICAgIHJlZHVjZS5yZWR1Y2VyID0gZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gcGVyZm9ybV9yZWR1Y2U7XG5cdH1cblx0cGVyZm9ybV9yZWR1Y2UgPSBjYmFrO1xuXHRyZXR1cm4gcmVkdWNlO1xuICAgIH07XG5cbiAgICByZWR1Y2UucmVkdW5kYW50ID0gZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gcmVkdW5kYW50O1xuXHR9XG5cdHJlZHVuZGFudCA9IGNiYWs7XG5cdHJldHVybiByZWR1Y2U7XG4gICAgfTtcblxuICAgIHJlZHVjZS52YWx1ZSA9IGZ1bmN0aW9uICh2YWwpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gdmFsdWU7XG5cdH1cblx0dmFsdWUgPSB2YWw7XG5cdHJldHVybiByZWR1Y2U7XG4gICAgfTtcblxuICAgIHJlZHVjZS5zbW9vdGggPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHNtb290aDtcblx0fVxuXHRzbW9vdGggPSB2YWw7XG5cdHJldHVybiByZWR1Y2U7XG4gICAgfTtcblxuICAgIHJldHVybiByZWR1Y2U7XG59O1xuXG52YXIgYmxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlZCA9IHJlZHVjZSgpXG5cdC52YWx1ZSgnc3RhcnQnKTtcblxuICAgIHZhciB2YWx1ZTIgPSAnZW5kJztcblxuICAgIHZhciBqb2luID0gZnVuY3Rpb24gKG9iajEsIG9iajIpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICdvYmplY3QnIDoge1xuICAgICAgICAgICAgICAgICdzdGFydCcgOiBvYmoxLm9iamVjdFtyZWQudmFsdWUoKV0sXG4gICAgICAgICAgICAgICAgJ2VuZCcgICA6IG9iajJbdmFsdWUyXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd2YWx1ZScgIDogb2JqMlt2YWx1ZTJdXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIC8vIHZhciBqb2luID0gZnVuY3Rpb24gKG9iajEsIG9iajIpIHsgcmV0dXJuIG9iajEgfTtcblxuICAgIHJlZC5yZWR1Y2VyKCBmdW5jdGlvbiAoYXJyKSB7XG5cdHZhciB2YWx1ZSA9IHJlZC52YWx1ZSgpO1xuXHR2YXIgcmVkdW5kYW50ID0gcmVkLnJlZHVuZGFudCgpO1xuXHR2YXIgcmVkdWNlZF9hcnIgPSBbXTtcblx0dmFyIGN1cnIgPSB7XG5cdCAgICAnb2JqZWN0JyA6IGFyclswXSxcblx0ICAgICd2YWx1ZScgIDogYXJyWzBdW3ZhbHVlMl1cblx0fTtcblx0Zm9yICh2YXIgaT0xOyBpPGFyci5sZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHJlZHVuZGFudCAoYXJyW2ldW3ZhbHVlXSwgY3Vyci52YWx1ZSkpIHtcblx0XHRjdXJyID0gam9pbihjdXJyLCBhcnJbaV0pO1xuXHRcdGNvbnRpbnVlO1xuXHQgICAgfVxuXHQgICAgcmVkdWNlZF9hcnIucHVzaCAoY3Vyci5vYmplY3QpO1xuXHQgICAgY3Vyci5vYmplY3QgPSBhcnJbaV07XG5cdCAgICBjdXJyLnZhbHVlID0gYXJyW2ldLmVuZDtcblx0fVxuXHRyZWR1Y2VkX2Fyci5wdXNoKGN1cnIub2JqZWN0KTtcblxuXHQvLyByZWR1Y2VkX2Fyci5wdXNoKGFyclthcnIubGVuZ3RoLTFdKTtcblx0cmV0dXJuIHJlZHVjZWRfYXJyO1xuICAgIH0pO1xuXG4gICAgcmVkdWNlLmpvaW4gPSBmdW5jdGlvbiAoY2Jhaykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBqb2luO1xuXHR9XG5cdGpvaW4gPSBjYmFrO1xuXHRyZXR1cm4gcmVkO1xuICAgIH07XG5cbiAgICByZWR1Y2UudmFsdWUyID0gZnVuY3Rpb24gKGZpZWxkKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHZhbHVlMjtcblx0fVxuXHR2YWx1ZTIgPSBmaWVsZDtcblx0cmV0dXJuIHJlZDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHJlZDtcbn07XG5cbnZhciBsaW5lID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZWQgPSByZWR1Y2UoKTtcblxuICAgIHJlZC5yZWR1Y2VyICggZnVuY3Rpb24gKGFycikge1xuXHR2YXIgcmVkdW5kYW50ID0gcmVkLnJlZHVuZGFudCgpO1xuXHR2YXIgdmFsdWUgPSByZWQudmFsdWUoKTtcblx0dmFyIHJlZHVjZWRfYXJyID0gW107XG5cdHZhciBjdXJyID0gYXJyWzBdO1xuXHRmb3IgKHZhciBpPTE7IGk8YXJyLmxlbmd0aC0xOyBpKyspIHtcblx0ICAgIGlmIChyZWR1bmRhbnQgKGFycltpXVt2YWx1ZV0sIGN1cnJbdmFsdWVdKSkge1xuXHRcdGNvbnRpbnVlO1xuXHQgICAgfVxuXHQgICAgcmVkdWNlZF9hcnIucHVzaCAoY3Vycik7XG5cdCAgICBjdXJyID0gYXJyW2ldO1xuXHR9XG5cdHJlZHVjZWRfYXJyLnB1c2goY3Vycik7XG5cdHJlZHVjZWRfYXJyLnB1c2goYXJyW2Fyci5sZW5ndGgtMV0pO1xuXHRyZXR1cm4gcmVkdWNlZF9hcnI7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVkO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlZHVjZTtcbm1vZHVsZS5leHBvcnRzLmxpbmUgPSBsaW5lO1xubW9kdWxlLmV4cG9ydHMuYmxvY2sgPSBibG9jaztcblxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpdGVyYXRvciA6IGZ1bmN0aW9uKGluaXRfdmFsKSB7XG5cdHZhciBpID0gaW5pdF92YWwgfHwgMDtcblx0dmFyIGl0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gaSsrO1xuXHR9O1xuXHRyZXR1cm4gaXRlcjtcbiAgICB9LFxuXG4gICAgc2NyaXB0X3BhdGggOiBmdW5jdGlvbiAoc2NyaXB0X25hbWUpIHsgLy8gc2NyaXB0X25hbWUgaXMgdGhlIGZpbGVuYW1lXG5cdHZhciBzY3JpcHRfc2NhcGVkID0gc2NyaXB0X25hbWUucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyk7XG5cdHZhciBzY3JpcHRfcmUgPSBuZXcgUmVnRXhwKHNjcmlwdF9zY2FwZWQgKyAnJCcpO1xuXHR2YXIgc2NyaXB0X3JlX3N1YiA9IG5ldyBSZWdFeHAoJyguKiknICsgc2NyaXB0X3NjYXBlZCArICckJyk7XG5cblx0Ly8gVE9ETzogVGhpcyByZXF1aXJlcyBwaGFudG9tLmpzIG9yIGEgc2ltaWxhciBoZWFkbGVzcyB3ZWJraXQgdG8gd29yayAoZG9jdW1lbnQpXG5cdHZhciBzY3JpcHRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpO1xuXHR2YXIgcGF0aCA9IFwiXCI7ICAvLyBEZWZhdWx0IHRvIGN1cnJlbnQgcGF0aFxuXHRpZihzY3JpcHRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGZvcih2YXIgaSBpbiBzY3JpcHRzKSB7XG5cdFx0aWYoc2NyaXB0c1tpXS5zcmMgJiYgc2NyaXB0c1tpXS5zcmMubWF0Y2goc2NyaXB0X3JlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2NyaXB0c1tpXS5zcmMucmVwbGFjZShzY3JpcHRfcmVfc3ViLCAnJDEnKTtcblx0XHR9XG4gICAgICAgICAgICB9XG5cdH1cblx0cmV0dXJuIHBhdGg7XG4gICAgfSxcblxuICAgIGRlZmVyX2NhbmNlbCA6IGZ1bmN0aW9uIChjYmFrLCB0aW1lKSB7XG5cdHZhciB0aWNrO1xuXG5cdHZhciBkZWZlcl9jYW5jZWwgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICBjbGVhclRpbWVvdXQodGljayk7XG5cdCAgICB0aWNrID0gc2V0VGltZW91dChjYmFrLCB0aW1lKTtcblx0fTtcblxuXHRyZXR1cm4gZGVmZXJfY2FuY2VsO1xuICAgIH1cbn07XG4iLCJ2YXIgdG50X2JvYXJkID0gcmVxdWlyZShcInRudC5ib2FyZFwiKTtcblxudmFyIHRudF9mZWF0dXJlX3RyYW5zY3JpcHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gTkFNRSBGRUFUVVJFXG4gICAgdmFyIG5hbWVGZWF0dXJlID0gdG50X2JvYXJkLnRyYWNrLmZlYXR1cmUoKVxuXHQuY3JlYXRlIChmdW5jdGlvbiAobmFtZSwgeFNjYWxlKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0aGlzO1xuXHQgICAgdmFyIGJhc2VsaW5lID0gKHRyYWNrLmhlaWdodCgpIC8gMikgKyA3O1xuXHQgICAgbmFtZVxuXHRcdC5hcHBlbmQoXCJ0ZXh0XCIpXG5cdFx0LmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0ICAgIHJldHVybiB4U2NhbGUoZC5wb3MpO1xuXHRcdH0pXG5cdFx0LmF0dHIoXCJ5XCIsIGJhc2VsaW5lKVxuXHRcdC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdCAgICByZXR1cm4gbmFtZUZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpO1xuXHRcdH0pXG5cdFx0LnRleHQoZnVuY3Rpb24gKGQpIHtcblx0XHQgICAgdmFyIGxhYmVsID0gZC5uYW1lO1xuXHRcdCAgICByZXR1cm4gZC5zdHJhbmQgPT09IDEgPyAoZC5uYW1lICsgXCI+XCIpIDogKFwiPFwiICsgZC5uYW1lKTtcblx0XHR9KTtcblx0fSlcblx0Lm1vdmVyIChmdW5jdGlvbiAobmFtZSwgeFNjYWxlKSB7XG5cdCAgICBuYW1lXG5cdFx0LnNlbGVjdChcInRleHRcIilcblx0XHQuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHQgICAgcmV0dXJuIHhTY2FsZShkLnBvcyk7XG5cdFx0fSk7XG5cdH0pO1xuXHQvLy5tb3ZlciAoZnVuY3Rpb24gKCkge30pOyAvLyBObyBuZWVkIHRvIG1vdmUgc2luY2UgdGhlIGJvYXJkIGRvZW5zJ3QgYWxsb3cgcGFubmluZyBvciB6b29taW5nXG5cbiAgICAvLyBJTlRST04gRkVBVFVSRVxuICAgIHZhciBpbnRyb25GZWF0dXJlID0gdG50X2JvYXJkLnRyYWNrLmZlYXR1cmUoKVxuICAgICAgICAuY3JlYXRlIChmdW5jdGlvbiAobmV3X2VsZW1zLCB4U2NhbGUpIHtcblx0ICAgIHZhciB0cmFjayA9IHRoaXM7XG5cblx0ICAgIHZhciBmZWF0dXJlQm90dG9tID0gKHRyYWNrLmhlaWdodCgpIC8gMikgKiAwLjI1O1xuXG5cdCAgICBuZXdfZWxlbXNcblx0ICAgICAgICAuYXBwZW5kKFwicGF0aFwiKVxuXHRcdC5hdHRyKFwic3Ryb2tlXCIsIGludHJvbkZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKVxuXHRcdC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIFwiMXB4XCIpXG5cdCAgICAgICAgLmF0dHIoXCJkXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0ICAgIHZhciBwYXRoID0gXCJNXCIgKyB4U2NhbGUoZC5zdGFydCkgKyBcIixcIiArIGZlYXR1cmVCb3R0b20gK1xuXHRcdFx0XCJMXCIgKyAoeFNjYWxlKGQuc3RhcnQpICsgKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpLzIpICArIFwiLFwiICsgMCArXG5cdFx0XHRcIkxcIiArICh4U2NhbGUoZC5lbmQpKSArIFwiLFwiICsgZmVhdHVyZUJvdHRvbTtcblx0XHQgICAgcmV0dXJuIHBhdGg7XG5cdFx0fSk7XG5cdH0pXG5cdC5tb3ZlciAoZnVuY3Rpb24gKGludHJvbiwgeFNjYWxlKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0aGlzO1xuXHQgICAgdmFyIGZlYXR1cmVCb3R0b20gPSAodHJhY2suaGVpZ2h0KCkgLyAyKSAqIDAuMjU7XG5cdCAgICBpbnRyb25cblx0XHQuc2VsZWN0KFwicGF0aFwiKVxuXHRcdC5hdHRyKFwiZFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdCAgICB2YXIgcGF0aCA9IFwiTVwiICsgeFNjYWxlKGQuc3RhcnQpICsgXCIsXCIgKyBmZWF0dXJlQm90dG9tICtcblx0XHRcdFwiTFwiICsgKHhTY2FsZShkLnN0YXJ0KSArICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKS8yKSAgKyBcIixcIiArIDAgK1xuXHRcdFx0XCJMXCIgKyAoeFNjYWxlKGQuZW5kKSkgKyBcIixcIiArIGZlYXR1cmVCb3R0b207XG5cdFx0ICAgIHJldHVybiBwYXRoO1xuXHRcdH0pO1xuXHR9KTtcbiAgICAgICAgLy8ubW92ZXIgKGZ1bmN0aW9uICgpIHt9KTsgLy8gTm8gbmVlZCB0byBtb3ZlIHNpbmNlIHRoZSBib2FyZCBkb2Vzbid0IGFsbG93IHBhbm5pbmcgJiB6b29taW5nXG5cbiAgICAvLyBFWE9OIEZFQVRVUkVcbiAgICB2YXIgZXhvbkZlYXR1cmUgPSB0bnRfYm9hcmQudHJhY2suZmVhdHVyZSgpXG4gICAgICAgIC5pbmRleChmdW5jdGlvbiAobikge1xuXHQgICAgcmV0dXJuIG4uc3RhcnQ7XG5cdH0pXG4gICAgICAgIC5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHQgICAgdmFyIHRyYWNrID0gdGhpcztcblxuXHQgICAgdmFyIGZlYXR1cmVIZWlnaHQgPSAodHJhY2suaGVpZ2h0KCkvMikgKiAwLjU7XG5cdCAgICB2YXIgeU9mZnNldCA9ICh0cmFjay5oZWlnaHQoKS8yKSAqIDAuMjU7XG5cblx0ICAgIG5ld19lbGVtc1xuXHQgICAgICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0ICAgIHJldHVybiB4U2NhbGUoZC5zdGFydCk7XG5cdFx0fSlcblx0ICAgICAgICAuYXR0cihcInlcIiwgeU9mZnNldClcblx0ICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0ICAgIHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG5cdFx0fSlcblx0ICAgICAgICAuYXR0cihcImhlaWdodFwiLCBmZWF0dXJlSGVpZ2h0KVxuXHQgICAgICAgIC50cmFuc2l0aW9uKClcblx0ICAgICAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdCAgICBpZiAoZC5jb2RpbmcpIHtcblx0XHRcdHJldHVybiBleG9uRmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCk7XG5cdFx0ICAgIH1cblx0XHQgICAgcmV0dXJuIHRyYWNrLmJhY2tncm91bmRfY29sb3IoKTtcblx0XHR9KVxuXHQgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIGV4b25GZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSk7XG5cdH0pXG5cdC5tb3ZlciAoZnVuY3Rpb24gKGV4b24sIHhTY2FsZSkge1xuXHQgICAgZXhvblxuXHRcdC5zZWxlY3QoXCJyZWN0XCIpXG5cdFx0LmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0ICAgIHJldHVybiB4U2NhbGUoZC5zdGFydCk7XG5cdFx0fSlcblx0XHQuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0ICAgIHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG5cdFx0fSk7XG5cdH0pO1xuICAgICAgICAvLy5tb3ZlciAoZnVuY3Rpb24gKCkge30pOyAvLyBObyBuZWVkIHRvIG1vdmUgc2luY2UgdGhlIGJvYXJkIGRvZXNuJ3QgYWxsb3cgcGFubmluZyAmIHpvb21pbmdcblxuICAgIC8vIENPTVBPU0lURSBGRUFUVVJFXG4gICAgdmFyIGNvbXBvc2l0ZUZlYXR1cmUgPSB0bnRfYm9hcmQudHJhY2suZmVhdHVyZS5jb21wb3NpdGUoKVxuICAgICAgICAuYWRkIChcImV4b25zXCIsIGV4b25GZWF0dXJlKVxuICAgICAgICAuYWRkIChcImludHJvbnNcIiwgaW50cm9uRmVhdHVyZSlcbiAgICAgICAgLmFkZCAoXCJuYW1lXCIsIG5hbWVGZWF0dXJlKTtcblxuICAgIHJldHVybiBjb21wb3NpdGVGZWF0dXJlO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfZmVhdHVyZV90cmFuc2NyaXB0O1xuIiwidmFyIHRudF9ib2FyZCA9IHJlcXVpcmUoXCJ0bnQuZ2Vub21lXCIpO1xudmFyIGVuc2VtYmwgPSByZXF1aXJlKFwidG50LmVuc2VtYmxcIik7XG52YXIgdHJhbnNjcmlwdEZlYXR1cmUgPSByZXF1aXJlKFwiLi9mZWF0dXJlXCIpO1xuXG50bnRfdHJhbnNjcmlwdCA9IGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBjb25mID0ge1xuXHRkYXRhIDogdW5kZWZpbmVkLFxuXHRnZW5lIDogdW5kZWZpbmVkLFxuXHRvbl9sb2FkIDogZnVuY3Rpb24gKCkge30gLy8gZXhlY3V0ZWQgd2hlbiB0aGUgdHJhbnNjcmlwdCBkYXRhIGFycml2ZXNcbiAgICB9O1xuICAgIFxuXG4gICAgLy8gdHJhY2tzXG4gICAgdmFyIGF4aXNfdHJhY2sgPSB0bnRfYm9hcmQudHJhY2soKVxuXHQuaGVpZ2h0KDIwKVxuXHQuYmFja2dyb3VuZF9jb2xvcihcIndoaXRlXCIpXG5cdC5kaXNwbGF5KHRudF9ib2FyZC50cmFjay5mZWF0dXJlLmF4aXMoKVxuXHRcdCAub3JpZW50YXRpb24oXCJ0b3BcIilcblx0XHQpO1xuXG4gICAgdmFyIHRyYW5zY3JpcHRWaWV3ZXIgPSB0bnRfYm9hcmQoKVxuXHQuYWxsb3dfZHJhZyh0cnVlKVxuXHQuYWRkX3RyYWNrKGF4aXNfdHJhY2spO1xuXG4gICAgdHJhbnNjcmlwdFZpZXdlci5fc3RhcnQgPSB0cmFuc2NyaXB0Vmlld2VyLnN0YXJ0O1xuXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24gKGxvYykge1xuXHRpZiAobG9jICYmIGxvYy5mcm9tICYmIGxvYy50bykge1xuXHQgICAgdHJhbnNjcmlwdFZpZXdlclxuXHRcdC5mcm9tKGxvYy5mcm9tKVxuXHRcdC50byhsb2MudG8pO1xuXHQgICAgdHJhbnNjcmlwdFZpZXdlci5fc3RhcnQoKTtcblx0ICAgIHJldHVybjtcblx0fVxuXHRpZiAoIWNvbmYuZGF0YSAmJiBjb25mLmdlbmUpIHtcbiAgICBcdCAgICB2YXIgZW5zZW1ibFJlc3QgPSBlbnNlbWJsKCk7XG5cdCAgICB2YXIgZ2VuZV91cmwgPSBlbnNlbWJsUmVzdC51cmwuZ2VuZSh7XG5cdFx0aWQ6IGNvbmYuZ2VuZSxcblx0XHRleHBhbmQ6IDFcblx0ICAgIH0pO1xuXHQgICAgZW5zZW1ibFJlc3QuY2FsbChnZW5lX3VybClcblx0XHQudGhlbiAoZnVuY3Rpb24gKHJlc3ApIHtcblx0XHQgICAgZm9yICh2YXIgaT0wOyBpPHJlc3AuYm9keS5UcmFuc2NyaXB0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgdCA9IHJlc3AuYm9keS5UcmFuc2NyaXB0W2ldO1xuXHRcdFx0dHJhbnNjcmlwdFZpZXdlci5hZGRfdHJhY2soZ2V0VHJhbnNjcmlwdFRyYWNrKHQpKTtcblx0XHQgICAgfVxuXHRcdCAgICB0cmFuc2NyaXB0Vmlld2VyXG5cdFx0XHQuZnJvbShyZXNwLmJvZHkuc3RhcnQpXG5cdFx0XHQudG8ocmVzcC5ib2R5LmVuZClcblx0XHRcdC5yaWdodChyZXNwLmJvZHkuZW5kKVxuXHRcdFx0LmxlZnQocmVzcC5ib2R5LnN0YXJ0KVxuXHRcdFx0Lnpvb21fb3V0KHJlc3AuYm9keS5lbmQgLSByZXNwLmJvZHkuc3RhcnQpO1xuXHRcdCAgICBjb25mLm9uX2xvYWQocmVzcC5ib2R5LlRyYW5zY3JpcHQpO1xuXHRcdCAgICB0cmFuc2NyaXB0Vmlld2VyLl9zdGFydCgpO1xuXHRcdH0pO1xuXHR9XG5cdC8vIFRPRE86IFRoaXMgaXMgbm90IHdvcmtpbmcgeWV0LiBUaGUgaWRlYSBpcyB0byBiZSBhYmxlIHRvIHBhc3MgY3VzdG9tIGRhdGEgaW5zdGVhZCBvZlxuXHQvLyByZWx5aW5nIG9uIGVuc2VtYmwgZ2VuZSB0cmFuc2NyaXB0c1xuXHRpZiAoY29uZi5kYXRhKSB7XG5cdCAgICBjb25zb2xlLndhcm4gKFwiRGF0YSBmdWxseSBwYXNzZWQsIGxldHMgdHJ5IHRvIHZpc3VhbGl6ZSB0aGF0IChOb3RoaW5nIGZvciBub3cpXCIpO1xuXHR9XG4gICAgfTtcbiAgICB0cmFuc2NyaXB0Vmlld2VyLnN0YXJ0ID0gc3RhcnQ7XG5cbiAgICBmdW5jdGlvbiBleG9uc1RvRXhvbnNBbmRJbnRyb25zIChleG9ucywgdCkge1xuXHR2YXIgb2JqID0ge307XG5cdG9iai5leG9ucyA9IGV4b25zO1xuXHRvYmouaW50cm9ucyA9IFtdO1xuXHRmb3IgKHZhciBpPTA7IGk8ZXhvbnMubGVuZ3RoLTE7IGkrKykge1xuXHQgICAgdmFyIGludHJvbiA9IHtcblx0XHRzdGFydCA6IGV4b25zW2ldLnRyYW5zY3JpcHQuc3RyYW5kID09PSAxID8gZXhvbnNbaV0uZW5kIDogZXhvbnNbaV0uc3RhcnQsXG5cdFx0ZW5kICAgOiBleG9uc1tpXS50cmFuc2NyaXB0LnN0cmFuZCA9PT0gMSA/IGV4b25zW2krMV0uc3RhcnQgOiBleG9uc1tpKzFdLmVuZCxcblx0XHR0cmFuc2NyaXB0IDogdFxuXHQgICAgfTtcblx0ICAgIG9iai5pbnRyb25zLnB1c2goaW50cm9uKTtcblx0fVxuXHRyZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFRyYW5zY3JpcHRUcmFjayAodHJhbnNjcmlwdCkge1xuXHQvLyBOb24gY29kaW5nXG5cdHZhciBuZXdFeG9ucyA9IFtdO1xuXHR2YXIgdHJhbnNsYXRpb25TdGFydDtcblx0dmFyIHRyYW5zbGF0aW9uRW5kO1xuXHRpZiAodHJhbnNjcmlwdC5UcmFuc2xhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICB0cmFuc2xhdGlvblN0YXJ0ID0gdHJhbnNjcmlwdC5UcmFuc2xhdGlvbi5zdGFydDtcblx0ICAgIHRyYW5zbGF0aW9uRW5kID0gdHJhbnNjcmlwdC5UcmFuc2xhdGlvbi5lbmQ7XG5cdH1cblx0dmFyIGV4b25zID0gdHJhbnNjcmlwdC5FeG9uO1xuXHRmb3IgKHZhciBpPTA7IGk8ZXhvbnMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmICh0cmFuc2NyaXB0LlRyYW5zbGF0aW9uID09PSB1bmRlZmluZWQpIHsgLy8gTk8gY29kaW5nIHRyYW5zY3JpcHRcblx0XHRuZXdFeG9ucy5wdXNoKHtcblx0XHQgICAgc3RhcnQgICA6IGV4b25zW2ldLnN0YXJ0LFxuXHRcdCAgICBlbmQgICAgIDogZXhvbnNbaV0uZW5kLFxuXHRcdCAgICB0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcblx0XHQgICAgY29kaW5nICA6IGZhbHNlXG5cdFx0fSk7XG5cdCAgICB9IGVsc2Uge1xuXHRcdGlmIChleG9uc1tpXS5zdGFydCA8IHRyYW5zbGF0aW9uU3RhcnQpIHtcblx0XHQgICAgLy8gNSdcblx0XHQgICAgaWYgKGV4b25zW2ldLmVuZCA8IHRyYW5zbGF0aW9uU3RhcnQpIHtcblx0XHRcdC8vIENvbXBsZXRlbHkgbm9uIGNvZGluZ1xuXHRcdFx0bmV3RXhvbnMucHVzaCh7XG5cdFx0XHQgICAgc3RhcnQgIDogZXhvbnNbaV0uc3RhcnQsXG5cdFx0XHQgICAgZW5kICAgIDogZXhvbnNbaV0uZW5kLFxuXHRcdFx0ICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuXHRcdFx0ICAgIGNvZGluZyA6IGZhbHNlXG5cdFx0XHR9KTtcblx0XHQgICAgfSBlbHNlIHtcblx0XHRcdC8vIEhhcyA1J1VUUlxuXHRcdFx0dmFyIG5jRXhvbjUgPSB7XG5cdFx0XHQgICAgc3RhcnQgIDogZXhvbnNbaV0uc3RhcnQsXG5cdFx0XHQgICAgZW5kICAgIDogdHJhbnNsYXRpb25TdGFydCxcblx0XHRcdCAgICB0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcblx0XHRcdCAgICBjb2RpbmcgOiBmYWxzZVxuXHRcdFx0fTtcblx0XHRcdHZhciBjb2RpbmdFeG9uNSA9IHtcblx0XHRcdCAgICBzdGFydCAgOiB0cmFuc2xhdGlvblN0YXJ0LFxuXHRcdFx0ICAgIGVuZCAgICA6IGV4b25zW2ldLmVuZCxcblx0XHRcdCAgICB0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcblx0XHRcdCAgICBjb2RpbmcgOiB0cnVlXG5cdFx0XHR9O1xuXHRcdFx0aWYgKGV4b25zW2ldLnN0cmFuZCA9PT0gMSkge1xuXHRcdFx0ICAgIG5ld0V4b25zLnB1c2gobmNFeG9uNSk7XG5cdFx0XHQgICAgbmV3RXhvbnMucHVzaChjb2RpbmdFeG9uNSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0ICAgIG5ld0V4b25zLnB1c2goY29kaW5nRXhvbjUpO1xuXHRcdFx0ICAgIG5ld0V4b25zLnB1c2gobmNFeG9uNSk7XG5cdFx0XHR9XG5cdFx0ICAgIH1cblx0XHR9IGVsc2UgaWYgKGV4b25zW2ldLmVuZCA+IHRyYW5zbGF0aW9uRW5kKSB7XG5cdFx0ICAgIC8vIDMnXG5cdFx0ICAgIGlmIChleG9uc1tpXS5zdGFydCA+IHRyYW5zbGF0aW9uRW5kKSB7XG5cdFx0XHQvLyBDb21wbGV0ZWx5IG5vbiBjb2Rpbmdcblx0XHRcdG5ld0V4b25zLnB1c2goe1xuXHRcdFx0ICAgIHN0YXJ0ICAgOiBleG9uc1tpXS5zdGFydCxcblx0XHRcdCAgICBlbmQgICAgIDogZXhvbnNbaV0uZW5kLFxuXHRcdFx0ICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuXHRcdFx0ICAgIGNvZGluZyAgOiBmYWxzZVxuXHRcdFx0fSk7XG5cdFx0ICAgIH0gZWxzZSB7XG5cdFx0XHQvLyBIYXMgMydVVFJcblx0XHRcdHZhciBjb2RpbmdFeG9uMyA9IHtcblx0XHRcdCAgICBzdGFydCAgOiBleG9uc1tpXS5zdGFydCxcblx0XHRcdCAgICBlbmQgICAgOiB0cmFuc2xhdGlvbkVuZCxcblx0XHRcdCAgICB0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcblx0XHRcdCAgICBjb2RpbmcgOiB0cnVlXG5cdFx0XHR9O1xuXHRcdFx0dmFyIG5jRXhvbjMgPSB7XG5cdFx0XHQgICAgc3RhcnQgIDogdHJhbnNsYXRpb25FbmQsXG5cdFx0XHQgICAgZW5kICAgIDogZXhvbnNbaV0uZW5kLFxuXHRcdFx0ICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuXHRcdFx0ICAgIGNvZGluZyA6IGZhbHNlXG5cdFx0XHR9O1xuXHRcdFx0aWYgKGV4b25zW2ldLnN0cmFuZCA9PT0gMSkge1xuXHRcdFx0ICAgIG5ld0V4b25zLnB1c2goY29kaW5nRXhvbjMpO1xuXHRcdFx0ICAgIG5ld0V4b25zLnB1c2gobmNFeG9uMyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0ICAgIG5ld0V4b25zLnB1c2gobmNFeG9uMyk7XG5cdFx0XHQgICAgbmV3RXhvbnMucHVzaChjb2RpbmdFeG9uMyk7XG5cdFx0XHR9XG5cdFx0ICAgIH1cblx0XHR9IGVsc2Uge1xuXHRcdCAgICAvLyBjb2RpbmcgZXhvblxuXHRcdCAgICBuZXdFeG9ucy5wdXNoKHtcblx0XHRcdHN0YXJ0ICA6IGV4b25zW2ldLnN0YXJ0LFxuXHRcdFx0ZW5kICAgIDogZXhvbnNbaV0uZW5kLFxuXHRcdFx0dHJhbnNjcmlwdCA6IHRyYW5zY3JpcHQsXG5cdFx0XHRjb2RpbmcgOiB0cnVlXG5cdFx0ICAgIH0pO1xuXHRcdH1cblx0ICAgIH1cblx0fVxuXHRyZXR1cm4gdG50X2JvYXJkLnRyYWNrKClcblx0ICAgIC5oZWlnaHQoMzApXG5cdCAgICAuYmFja2dyb3VuZF9jb2xvciAoXCJ3aGl0ZVwiKVxuXHQgICAgLmRpc3BsYXkodHJhbnNjcmlwdEZlYXR1cmUoKSlcblx0ICAgIC5kYXRhKHRudF9ib2FyZC50cmFjay5kYXRhKClcblx0XHQgIC51cGRhdGUodG50X2JvYXJkLnRyYWNrLmRhdGEucmV0cmlldmVyLnN5bmMoKVxuXHRcdFx0ICAucmV0cmlldmVyIChmdW5jdGlvbiAoKSB7XG5cdFx0XHQgICAgICB2YXIgb2JqID0gZXhvbnNUb0V4b25zQW5kSW50cm9ucyAobmV3RXhvbnMsIHRyYW5zY3JpcHQpO1xuXHRcdFx0ICAgICAgb2JqLm5hbWUgPSBbe1xuXHRcdFx0XHQgIHBvczogdHJhbnNjcmlwdC5zdGFydCxcblx0XHRcdFx0ICBuYW1lOiB0cmFuc2NyaXB0LmRpc3BsYXlfbmFtZSxcblx0XHRcdFx0ICBzdHJhbmQ6IHRyYW5zY3JpcHQuc3RyYW5kLFxuXHRcdFx0XHQgIHRyYW5zY3JpcHQ6IHRyYW5zY3JpcHRcblx0XHRcdCAgICAgIH1dO1xuXHRcdFx0ICAgICAgcmV0dXJuIG9iajtcblx0XHRcdCAgfSlcblx0XHRcdCApXG5cdFx0ICk7XG4gICAgfVxuICAgIFxuICAgIHRyYW5zY3JpcHRWaWV3ZXIuZGF0YSA9IGZ1bmN0aW9uIChkKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGNvbmYuZGF0YTtcblx0fVxuXHRjb25mLmRhdGEgPSBkO1xuXHRyZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdHJhbnNjcmlwdFZpZXdlci5nZW5lID0gZnVuY3Rpb24gKGcpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gY29uZi5nZW5lO1xuXHR9XG5cdGNvbmYuZ2VuZSA9IGc7XG5cdHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICB0cmFuc2NyaXB0Vmlld2VyLm9uX2xvYWQgPSBmdW5jdGlvbiAoY2Jhaykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBjb25mLmNiYWs7XG5cdH1cblx0Y29uZi5vbl9sb2FkID0gY2Jhaztcblx0cmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgIFxuICAgIHJldHVybiB0cmFuc2NyaXB0Vmlld2VyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdG50X3RyYW5zY3JpcHQ7XG4iXX0=
