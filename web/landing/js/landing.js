function Landing(){
    this.ui = new UI();
}

Landing.prototype.initFAQ = function(){
   $.each(faq,function(key){
       var title = faq[key].label;
       var content = faq[key].descrip;
       land.ui.collapsible("faq",title,content);
   }) 
};

window.land = new Landing();


