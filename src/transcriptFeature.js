var tnt_board = require("tnt.board");
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

    var seq_track = tnt_board.track()
	.height(20)
	.background_color("white")
	.display(tnt_board.track.feature.sequence()
		 .sequence (function (d) {
		     return d.nt;
		 }))
	.data(tnt_board.track.data()
	      .update(tnt_board.track.data.retriever.sync()
		     .retriever (function () {
			 return [{
			     pos: 140740000,
			     nt : 'T'
			 }];
		     })
		    )
	     );
    
    var transcriptViewer = tnt_board()
	.allow_drag(true)
	.add_track(axis_track)
    	.add_track(seq_track);

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
