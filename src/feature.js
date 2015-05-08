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
