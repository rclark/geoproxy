$(".dropdown-menu a").click(function (evt) {
    var value = $(evt.currentTarget).attr("id").replace("input-", "");
    $("#inFormat").val(value);
});