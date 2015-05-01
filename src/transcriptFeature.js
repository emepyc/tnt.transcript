var tnt_board = require("tnt.board");
var ensembl = require("tnt.ensembl");

tnt_feature_transcript = function () {

    var conf = {
	data : undefined,
	gene : undefined
    };
    
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
		    if (d.coding) {
			return "#A00000";
		    }
		    return track.background_color();
		})
		.attr("stroke", function (d) {
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
		    transcriptViewer.from(resp.body.start)
			.to(resp.body.end)
			.right(resp.body.end)
			.zoom_out(resp.body.end - resp.body.start);
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

    function exonsToExonsAndIntrons (exons) {
	var obj = {};
	obj.exons = exons;
	obj.introns = [];
	for (var i=0; i<exons.length-1; i++) {
	    var intron = {
		start : exons[i].strand === 1 ? exons[i].end : exons[i].start,
		end   : exons[i].strand === 1 ? exons[i+1].start : exons[i+1].end,
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
			    coding : false
			});
		    } else {
			// Has 5'UTR
			var ncExon5 = {
			    start  : exons[i].start,
			    end    : translationStart,
			    coding : false
			};
			var codingExon5 = {
			    start  : translationStart,
			    end    : exons[i].end,
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
			    coding  : false
			});
		    } else {
			// Has 3'UTR
			var codingExon3 = {
			    start  : exons[i].start,
			    end    : translationEnd,
			    coding : true
			};
			var ncExon3 = {
			    start  : translationEnd,
			    end    : exons[i].end,
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
			coding : true
		    });
		}
	    }
	}
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
			      var obj = exonsToExonsAndIntrons (newExons);
			      obj.name = [{
				  pos: transcript.start,
				  name: transcript.display_name,
				  strand: transcript.strand
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
    
    return transcriptViewer;
};

module.exports = exports = tnt_feature_transcript;
