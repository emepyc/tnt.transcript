var apijs = require ("tnt.api");
var tnt_board = require("tnt.board");
var ensembl = require("tnt.ensembl");

tnt_feature_transcript = function () {

    var conf = {
	data : undefined,
	gene : undefined
    };


    // 'Inherit' from tnt.track.feature
    var exonFeature = tnt_board.track.feature();

    exonFeature.create(function (new_elems, xScale) {
	var track = this;

	var featureHeight = track.height() * 0.5;
	var yOffset = track.height() * 0.25;

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
		if (d.color === undefined) {
		    return exonFeature.foreground_color();
		} else {
		    return d.color;
		}
	    });	
    });
    exonFeature.mover(function () {
    });


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
			board.add_track(getTranscriptTrack (resp.body.Transcript[i].Exon));
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

    function getTranscriptTrack (exons) {
	return tnt_board.track()
	    .height(50)
	    .background_color ("white")
	    .display(exonFeature)
	    .data(tnt_board.track.data()
		  .update(tnt_board.track.data.retriever.sync()
			  .retriever (function () {
			      return exons;
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
