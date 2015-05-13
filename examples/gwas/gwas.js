var gwasViewerTheme = function () {

    // Colors for biotypes
    var colors = {
	"protein_coding" : d3.rgb("#A00000"),
	"nonsense_mediated_decay" : d3.rgb("#3a99d7"),
	"retained_intron" : d3.rgb("#039933")
    };

    var theme = function (tv, div) {

	// TOOLTIPS
	var tooltip = function (data) {
	    var t = data.transcript;
	    var obj = {};
	    obj.header = t.display_name;

	    obj.rows = [];
	    obj.rows.push({
		"label" : "Location",
		"value" : "Chromosome " + t.seq_region_name + ": " + t.start + " - " + t.end
	    });
	    obj.rows.push({
		"label" : "Type",
		"value" : t.biotype
	    });
	    obj.rows.push({
		"label" : "Strand",
		"value" : t.strand === 1 ? "Forward" : "Reverse"
	    });
	    
	    var t = tnt.tooltip.table()
		.width(200)
		.id(1)
		.call(this, obj);
	};

	// TRANSCRIPT TYPE LEGEND
	var createLegend = function (t) {
	    var legend_div = d3.select(div)
		.append("div")
		.attr("class", "tnt_legend_div")

	    legend_div
		.append("text")
		.text("Transcript type:");

	    var biotypes_arr = t.map(function (e) {
		return e.biotype;
	    });
	    var biotypes_hash = {};
	    for (var i=0; i<biotypes_arr.length; i++) {
		biotypes_hash[biotypes_arr[i]] = 1;
	    }
	    var biotypes = Object.keys(biotypes_hash);
	    var biotypes_legend = legend_div.selectAll(".tnt_biotype_legend")
		.data(biotypes, function (d) { return d })
		.enter()
		.append("div")
		.attr("class", "tnt_biotype_legend")
		.style("display", "inline");
	    biotypes_legend
		.append("div")
		.style("display", "inline-block")
		.style("margin", "0px 2px 0px 15px")
		.style("width", "10px")
		.style("height", "10px")
		.style("border", "1px solid #000")
		.style("background", function (d) { return colors[d] || "black"; })
	    biotypes_legend
		.append("text")
		.text(function (d) {return d});
	    // Re-color all the transcript!
	};

	// seq track
	var seq_track = tnt.board.track()
	    .height(20)
	    .background_color("white")
	    .display(tnt.board.track.feature.genome.sequence())
	    .data(tnt.board.track.data.genome.sequence()
		  .limit(150));
	
	// gwas track
	var gwas_track = tnt.board.track()
	    .height(30)
	    .background_color("white")
	    .display(tnt.board.track.feature.pin()
		     .domain([0,1])
		    )
	    .data(tnt.board.track.data()
		  .update(
		      tnt.board.track.data.retriever.sync()
			  .retriever (function () {
			      return [
				  {
				      pos: 140719327,
				      val: 0.8
				  }
			      ]
			  })
		  )
		 );
	tv
	    .add_track(gwas_track)
	    .add_track(seq_track);

	tv
	    .species("human")  // Needed to retrieve the sequence
	    .chr(7)     // Needed to retrieve the sequence
	    .gene("ENSG00000157764")
	    .width(1000)
	    .extend_canvas({
		left : 20,
		right: 20
	    })
	    .on_load (function (t) {
		var tracks = tv.tracks();
		for (var i=3; i<tracks.length; i++) { // the first two tracks are axis and sequence
		    var composite = tracks[i].display();
		    var displays = composite.displays();
		    for (var j=0; j<displays.length; j++) {
			displays[j]
			    .foreground_color(colors[t[i-3].biotype] || "black")
			    .on_click(tooltip);
		    }
		}
		createLegend(t);
	    });
	tv(div);
	tv.start();

    };

    return theme;
};
