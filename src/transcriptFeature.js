var tnt_board = require("tnt.board");
var ensembl = require("tnt.ensembl");

tnt_feature_transcript = function () {

    var conf = {
	data : undefined,
	gene : undefined
    };


    // var fgColor = 
    
    // NAME FEATURE
    var nameFeature = tnt_board.track.feature()
	.create (function (name, xScale) {
	    var track = this;
	    var baseline = (track.height() / 2) + 5;
	    name
		.append("text")
		.attr("x", function (d) {
		    return xScale(d.pos);
		})
		.attr("y", baseline)
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
		    return "#A00000";
		});
	})
	.mover (function () {}); // No need to move since the board doesn't allow panning & zooming


    // tracks
    var axis_track = tnt_board.track()
	.height(20)
	.background_color("white")
	.display(tnt_board.track.feature.axis()
		 .orientation("top")
		);

    var board = tnt_board()
	.allow_drag(false)
	.add_track(axis_track);

    var _ = function (div) {
	board(div);

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
			board.add_track(getTranscriptTrack (t.display_name, resp.body.strand, t.Exon));
		    }
		    board.from(resp.body.start)
			.to(resp.body.end)
			.right(resp.body.end)
			.zoom_out(resp.body.end - resp.body.start);
		    board.start();
		});
	}
	if (conf.data) {
	    console.log ("Data fully passed, lets try to visualize that (Nothing for now)");
	}
    };

    function exonsToExonsAndIntrons (name, strand, exons) {
	var obj = {};
	obj.name = [{
	    pos: exons[0].start,
	    name: name,
	    strand: strand
	}];
	obj.exons = exons;
	obj.introns = [];
	for (var i=0; i<exons.length-1; i++) {
	    var intron = {
		start : exons[i].end,
		end   : exons[i+1].start
	    };
	    obj.introns.push(intron);
	}
	return obj;
    }
    
    function getTranscriptTrack (name, strand, exons) {

	var compositeFeature = tnt_board.track.feature.composite()
	    .add ("exons", exonFeature)
	    .add ("introns", intronFeature)
	    .add ("name", nameFeature);
	return tnt_board.track()
	    .height(30)
	    .background_color ("white")
	    .display(compositeFeature)
	    .data(tnt_board.track.data()
		  .update(tnt_board.track.data.retriever.sync()
			  .retriever (function () {
			      return exonsToExonsAndIntrons(name, strand, exons);
			  })
			 )
		 );
    }

    _.data = function (d) {
	if (!arguments.length) {
	    return conf.data;
	}
	conf.data = d;
	return this;
    };

    _.gene = function (g) {
	if (!arguments.length) {
	    return conf.gene;
	}
	conf.gene = g;
	return this;
    };
    
    return _;
};

module.exports = exports = tnt_feature_transcript;
