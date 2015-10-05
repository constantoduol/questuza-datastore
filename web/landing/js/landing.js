function Landing(){
    this.ui = new UI();
}

Landing.prototype.initFAQ = function(){
   $.each(faq,function(key){
       var title = faq[key].label;
       var content = faq[key].descrip;
       land.ui.collapsible("faq",title,content);
   }); 
};

Landing.prototype.initBilling = function(){
    var ranges = [];
    var pricesKes = [];
    var pricesUsd = [];
    var averageCust = [];
    $.each(billing,function(key){
        var range = billing[key].weighted_cpu[0] +" - " +billing[key].weighted_cpu[1];
        var priceKes = billing[key].weighted_cpu[2];
        var priceUsd = billing[key].weighted_cpu[3];
        ranges.push(range);
        pricesKes.push(priceKes);
        pricesUsd.push(priceUsd);
        averageCust.push(billing[key].average_customers_per_day);
    });
    land.ui.table({
        id_to_append: "billing",
        headers: ["Range(Weighted Seconds)*", "Price(KES)/Month","Price(USD)/Month","Daily Average Customers**"],
        values: [ranges, pricesKes,pricesUsd,averageCust],
        style: "margin-left:40px;width:95%",
        transform : {
            1 : function(value){
                return app.formatMoney(value);
            },
            3 : function(value){
                return app.formatMoney(value).replace(".00","");
            }
        }
    });
};

window.land = new Landing();


