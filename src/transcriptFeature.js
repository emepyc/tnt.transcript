var apijs = require ("tnt.api");
var layout = require("./layout.js");
var board = require("tnt.board");

tnt_feature_transcript = function () {

    // 'Inherit' from tnt.track.feature
    var exonFeature = board.track.feature();

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
		    return feature.foreground_color();
		} else {
		    return d.color
		}
	    });

    exonFeature.mover(function () {
    });

    return exonFeature;
};

module.exports = exports = tnt_feature_transcript;
