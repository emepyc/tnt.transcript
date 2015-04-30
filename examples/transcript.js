var transcriptViewerTheme = function () {

    // var ensemblRest = tnt.eRest();
    // var gene_url = ensemblRest.url.gene({
    // 	id: "ENSG00000139618",
    // 	expand: 1
    // });
    // console.log(gene_url);

    var theme = function (tv, div) {
	tv.gene("ENSG00000132963")
	tv(div);
    };

    return theme;
};
