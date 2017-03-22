require([
 'modules/jquery-mozu',
 'hyprlive',
 "hyprlivecontext",
 'underscore',
 'modules/api',
 'modules/backbone-mozu',
 'modules/models-product',
 'modules/models-cart',
 'modules/cart-monitor',
 'shim!vendor/jquery/owl.carousel.min[modules/jquery-mozu=jQuery]>jQuery'
 //'vendor/jquery/jquery-ui'
],
function($, Hypr, HyprLiveContext, _, api,Backbone, ProductModels, CartModels, CartMonitor) {
//Page-wide configurations, currently set by configuration widget:
var mainConfig = require.mozuData('modelconfig');
var includeSiteId = mainConfig.includeSiteId;
var includeTenantId = mainConfig.includeTenantId;
var isConfigged = mainConfig.isConfigged;
var jsInject = mainConfig.javascriptInjection;

//CustomerId, customerCode, and pagetype are all variables used by the
//whole page, but are right now being set by each individual display widget.
//It's possible that the user could accidentally set the pagetype differently in
//the each display widget. So we're going to go with the info that is in the first one
//on the page.

var firstDisplay = $('.recommended-product-container').first();
var secondaryConfig = firstDisplay.data('mzRtiRecommendedProducts');
var customerId = secondaryConfig.customerId;
var customerCode = secondaryConfig.customerCode;
var pageType = secondaryConfig.pageType;

var pageContext = require.mozuData('pagecontext');
var siteContext = require.mozuData('sitecontext');

/*
containerList holds data about all of the widgets we're going to make.
*/
var containerList = [];

/*
The following loop acts as cleanup; it populates containerList with the needed data,
ignoring and delegitimizing any divs on the page with duplicate placeholder names.
*/
$('.recommended-product-container').each(function(a, b){
 if (!$(this).hasClass('ignore')){
   var configData = $(this).data('mzRtiRecommendedProducts');
   var container = {config: configData};
   var selector = '.recommended-product-container.'+configData.placeholder;

   if($(selector).length>1){
     $(selector).each(function(index, element){
       if (index>0){
         /*
         We don't want to add the data from accidental duplicates to
         our nice, clean containerList. We also don't want those duplicates to
         accidentally render. So for all but the first element with this
         class name, we strip all classes, add 'ignore' so the .each we're in
         right now ignores the duplicates, hide the div, and add a message
         in edit mode so the user knows what happened.
         */
         $(element).removeClass();
         $(element).addClass('ignore');
         if (pageContext.isEditMode){
             $("<p>Error: duplicate placeholder name.</p>").insertBefore($(element));
         }
         $(element).hide();
       }
     });
   }
   containerList.push(container);
}
});



/*Recommended Product Code Starts*/
 var eFlag = 0;
 var ProductModelColor = Backbone.MozuModel.extend({
     mozuType: 'products'
 });

 var GridView = Backbone.MozuView.extend({
   templateName: 'modules/product/product-list-tiled',
   initialize: function(){
    var self = this;

   },
   render: function(placeholder){
     console.log('render got called...');
     var elSelector = ".rti-recommended-products."+placeholder;
     var self = this;
     Backbone.MozuView.prototype.render.apply(this, arguments);

   }
 });
 var ProductListView = Backbone.MozuView.extend({
     templateName: 'Widgets/RTI/rti-product-tiles',
     additionalEvents: {
         "click .next": "next",
         "click .previous": "previous",
         "click a.wishlist-button": "addToWishlist",
         "touchstart a.wishlist-button": "addToWishlist"
     },
     initialize: function() {
         // this.owl = null;
         var self = this;
         var isUserAnonymous = require.mozuData('user').isAnonymous;

         if (isUserAnonymous === false) {
             self.addedToWishlist();
         }
     },
     render: function(placeholder) {
         var elSelector = ".rti-recommended-products."+placeholder;
         var self = this;
         var owlItems = 1;
             if(pageContext.isDesktop) {
                 owlItems = 4;
             }
             else if(pageContext.isTablet) {
                 owlItems = 3;
             }
             else {
                 owlItems = 2;
             }
             Backbone.MozuView.prototype.render.apply(this, arguments);
             this.colorSwatchingRecommend();

             //this.priceFunction();
             var catTitle = '';
             $('[data-toolstip="toolstip"]').tooltip();

               var owl = $(elSelector+" .related-prod-owl-carousel");
               owl.owlCarousel({
                   loop: false,
                   responsiveClass:true,
                   responsive:{
                       0 : {
                           items: 2,
                           nav:false
                       },
                       480 : {
                           items: 3,
                           nav:false
                       },
                       1025 : {
                           items: 4,
                           nav:false
                       }
                   }
               });

               owl.on('changed.owl.carousel', function(e) {
                   if( e.item.index >= 1)
                       $(elSelector).find('.previous').show();
                   else
                       $(elSelector).find('.previous').hide();
                   if( e.item.index === e.item.count-owlItems)
                       $(elSelector).find('.next').hide();
                   else
                       $(elSelector).find('.next').show();
               });

               if(owl.find('.owl-item').length <= owlItems)
                   $(elSelector).find('.next').hide();

               $(elSelector+" .related-prod-owl-carousel > .owl-item").addClass("mz-productlist-item");
               $('.rti-recommended-products.'+placeholder+' .next').on('click', function() {
                   owl.trigger('next.owl.carousel');
               });
               $('.rti-recommended-products.'+placeholder+' .previous').on('click', function() {
                   owl.trigger('prev.owl.carousel');
               });

               var owlItemTotal3 = $(elSelector+" .owl-item").length;
               if(pageContext.isDesktop && owlItemTotal3 >= 5 ) {
                 $(elSelector).css("border-right", "none");
               }
               if(pageContext.isTablet && owlItemTotal3 >= 3) {
                 $(elSelector).css("border-right", "none");
               }
               if(pageContext.isMobile && owlItemTotal3 >= 2 ) {
                 $(elSelector).css("border-right", "none");
               }
               //this.colorSelected();
               this.manageBlocksHeight();


         },
         colorSwatchingRecommend: function(e) {
         $('[data-mz-swatch]').on("click", function(e){
            e.preventDefault();
             if (eFlag === 0) {
                 eFlag = 1;
                 var $currentEvtSource = $(e.currentTarget);
                 //$currentEvtSource.closest('.ig-related-products').find('input').css({'border': 'none'});
                 $currentEvtSource.closest('.owl-item').find('input').css({'border': 'none'});
                 $currentEvtSource.css({'border': '2px solid #4a4a4a'});
                 var productCode = $currentEvtSource.closest('.mz-productlisting').data('mz-product');

                 var swatchCol = $currentEvtSource.attr('value').toLowerCase();
                 var swatchColor = $currentEvtSource.attr('value');

                 var mainImage = $currentEvtSource.closest('.mz-productlisting').find('.mz-subcategory-image').attr("data-main-image-src");

                 var url = window.location.origin;
                 $currentEvtSource.closest('.mz-productlisting').find('.mz-subcategory-image').removeClass('active');
                 $currentEvtSource.closest('.mz-productlisting').find('.mainImageContainer2').addClass('active');
                 var CurrentProductModel = new ProductModelColor();
                 CurrentProductModel.set('filter', 'productCode eq '+productCode);

                 CurrentProductModel.fetch().then(function(responseObject) {
                     var prodContent = responseObject.apiModel.data.items;
                     var prodImg = null, prodImgAltText = null, ImgAltText = null;
                     var flag = 0;

                     _.each(prodContent, function(productImages) {
                         prodImg = _.findWhere(productImages.content.productImages, {altText: swatchColor || swatchCol});
                     });
                     if (prodImg) {
                         var prodImage = prodImg.imageUrl;
                         $currentEvtSource.closest('.mz-productlisting').find('.mz-subcategory-image').attr({"srcset": prodImage+"?max=400", "alt": ImgAltText, "style":""}).addClass('active');
                         $currentEvtSource.closest('.mz-productlisting').find('.mainImageContainer2').removeClass('active');
                         eFlag = 0;
                     } else {
                         $currentEvtSource.closest('.mz-productlisting').find('.mz-subcategory-image').attr({"srcset": mainImage+"?max=400", "style":""}).addClass('active');
                         $currentEvtSource.closest('.mz-productlisting').find('.mainImageContainer2').removeClass('active');
                         eFlag = 0;
                     }
                 });
             }
         });
     },
     addToWishlist: function(e) {
         e.preventDefault();
         var qvProductCode = $(e.currentTarget).data("listing-prod-code");
         var currentWishListBtn = e.currentTarget;

         if($(currentWishListBtn).hasClass('addedToWishlist')) {

         } else {
             $(currentWishListBtn).addClass('clicked');
         }
         var newPromise = api.createSync('wishlist').getOrCreate(require.mozuData('user').accountId).then(function(wishlist) {
             return wishlist.data;
         }).then(function(wishlistItems) {
             var proceed = true;
             for (var i = 0; i < wishlistItems.items.length; i++) {
                 if (wishlistItems.items[i].product.productCode == qvProductCode) {
                     proceed = false;
                 }
             }

             if (proceed) {
                 var product = new ProductModels.Product({ productCode: qvProductCode} );
                 product.addToWishlist({ quantity: 1});

                 try {
                     product.on('addedtowishlist', function(wishlistitem) {
                         $(currentWishListBtn).attr('disabled', 'disabled');
                         $(currentWishListBtn).addClass("addedToWishlist");
                     });
                 } catch (err) {
                     console.log("Error Obj:" + err);
                 }
             }
         });
     },

     addedToWishlist: function () {

         var productCodesShown = [];
         var productsWishlistBtns = [];
         var productCodesShownIndex = 0;

         $('.owl-item').each(function() {
             var wishlistBtn = $(this).find("a.wishlist-button");
             var listingProductCode = $(wishlistBtn).data("listing-prod-code");
             productCodesShown[productCodesShownIndex] = listingProductCode;
             productsWishlistBtns[productCodesShownIndex] = wishlistBtn;
             productCodesShownIndex++;
         });
         var isUserAnonymous = require.mozuData('user').isAnonymous;
         if (isUserAnonymous === false) {
             var newPromise = api.createSync('wishlist').getOrCreate(require.mozuData('user').accountId).then(function(wishlist) {
                 return wishlist.data;
             }).then(function(wishlistItems) {
                 for (var j = 0; j < productCodesShown.length; j++) {
                     for (var i = 0; i < wishlistItems.items.length; i++) {
                         if (wishlistItems.items[i].product.productCode == productCodesShown[j]) {
                             $(productsWishlistBtns[j]).prop('disabled', 'disabled');
                             $(productsWishlistBtns[j]).addClass("addedToWishlist");
                         }
                     }
                 }
             });
         }
     },

     getMaxHeight: function(selector) {
         return Math.max.apply(null, $("" + selector).map(function ()
         {
             return $(this).height();
         }).get());
     },
     manageBlocksHeight: function() {
         try {
             var self = this;
         } catch (err) {
             /*ignore*/
         }
     },
     priceFunction: function() {
         $('.mz-price').each(function() {
             var amountText = $(this).data("total-amount");
             var amountString = amountText.toString();
             var amountDollar = amountString.charAt(0);
             var totalp = amountString.split(amountDollar);
             var decimal = totalp[1].split('.');
             var afterDecimal = decimal[1];
             if(afterDecimal == '00') {
                 $(this).html('<span class="dollar">'+amountDollar+'</span>'+decimal[0]);
             } else {
                 $(this).html('<span class="dollar">'+amountDollar+'</span>'+'<span class="interger">'+decimal[0]+'</span>'+'<sup>'+decimal[1]+'</sup>');
             }
         });
     }
 });

 var buildProductUrl = function(pageType){
   var firstPart = '//' + customerId + '-' + customerCode + '.baynote.net/recs/1/' + customerId + '_' + customerCode + '?';
   var requiredParams = '&attrs=Price&attrs=ProductId&attrs=ThumbUrl&attrs=Title&attrs=url';

   var bnExtUserId = require.mozuData('user').userId;
   var userId = getCookie('bn_u');


   var userIdQuery = "&userId="+userId;
   var bnExtUserIdQuery = "&User.bnExtUserId="+bnExtUserId;


   var source = window.location.href;
   if (source.startsWith("http://")){
     source = "https://" + source.slice(7);
   }
   var sourceQuery = "&source="+source;

   var tenantIdQuery = "&tenantId=";
   var siteIdQuery = "&siteId=";

   if (includeTenantId){
     tenantIdQuery +=siteContext.tenantId;
   }
   if (includeSiteId){
     siteIdQuery +=siteContext.siteId;
   }

   //The queries stored in pageDependentSection vary between page types
   //Right now the only difference configured is that if pageType is cart,
   //We add productIds to the query.

   var pageDependentSection = "";
   if (pageType=="Home"){

   } else if (pageType=="ProductDetail") {

   } else if (pageType=="Cart"){

     var cart = require.mozuData('cart');
     if (!cart.isEmpty){
       for(var i=0; i<cart.items.length; i++){
         var productId = cart.items[i].id;
         var productQuery = "&productId="+productId;
         pageDependentSection += productQuery;
       }
     }
   }

   //Finally, we're going to let the user inject here
   //Whatever javascript they need to gather their custom cookies.
   //We will expect the user to append whatever they need into
   //the variable "inject".


   var inject = "";

   //if the user has entered anything in the js injection box...
   if (jsInject){
     //We'll attempt to run it
     try {
       eval(jsInject); // jshint ignore:line

     } catch(e) {
       console.log("There was a problem with your javascript injection.");
       console.log(e);
     }
   } else {
     inject = "&query=&Override=&Product.Override=";
   }


   var url = firstPart +
    requiredParams +
     userIdQuery +
      bnExtUserIdQuery +
        sourceQuery + //Current page URL
         pageDependentSection +
          tenantIdQuery + //From checkbox
           siteIdQuery + //From checkbox
            inject; //From javascript field in config editor



     url += "&format=json";
     return url;

 };

 var getRecommendedProducts = function(callback) {
   var url = buildProductUrl(pageType);
   return $.get(url, callback);
 };

 var productItems = new Backbone.Collection();
 var productItem = Backbone.MozuModel.extend({
     defaults: {
         data: {}
     }
 });

  var getProducts =function(rtiProductList){
     var deferred = api.defer();
     var numReqs = rtiProductList.length;
     var productList = [];
     _.each(rtiProductList, function(attrs) {
         var op = api.get('product', attrs.ProductId);
         op.then(function(data) {
             data.data.rtiRank = attrs.rank;
             productList.push(data.data);
             if (--numReqs === 0) {
                 _.defer(function() {
                     deferred.resolve(productList);
                 });
             }
         }, function(reason){
             if (--numReqs === 0) {
                 _.defer(function() {
                     deferred.resolve(productList);
                 });
             }
         });
     });

     return deferred.promise;
 };


 var renderData = function(data) {

     _.each(containerList, function(container){

       var placeholder = container.config.placeholder;
       var numberOfItems = container.config.numberOfItems;
       var configTitle = container.config.title;
       //var displayType = container.config.displayType;

       /*
       Our data will contain information about lots of different possible widgets.
       First we want to reduce that data to only the placeholderName we're dealing with.
       */
       var widgetResults = $.grep(data.widgetResults, function(e){ return e.placeholderName == placeholder; });
       /*
       We should at this point have a list of results with the correct placeholderName,
       and that last should only be 1 item long.
       If that first item doesn't exist, there was a problem.
       */
       if (!widgetResults[0]){
         if (pageContext.isEditMode){
           $('.recommended-product-container.'+placeholder).text("Found no data for products to display for that placeholder.");
         }
       } else {
         //We have the data for our widget now. Time to fill it up.

         var displayName;
         //if configTitle has a value, the user entered a title to
         //override the title set in RTI.
         if (configTitle){
           displayName = configTitle;
         } else {
           //if configTitle has no value, we get the title from the
           //product results call
           displayName = widgetResults[0].displayName;
         }
         //Our data should have a list of slotResults in it with product details.
         //Prune slotResults list in widgetResults for "products" that don't contain any data.
         //This is unlikely but can happen if RTI isn't configured correctly.
         var productSlots = widgetResults[0].slotResults.filter(function(product){
          return product.url;
        });
         //If the pruned list contains anything, we can continue.
         if (productSlots.length){
           var productIdList = [];
               _.each(productSlots, function(prod, key){
                   var attrs = [];
                   _.each(prod.attrs, function(attr, key, list){
                       attrs[attr.name] = attr.values[0];
                   });
                   attrs.rank = prod.rank;
                   productIdList.push(attrs);
               });

               if(productIdList.length !== 0) {
                   getProducts(productIdList).then(function(products){
                       if(products.length !== 0) {
                           var productsByRank = _.sortBy(products, 'rtiRank');
                           if (productsByRank.length>numberOfItems){
                             productsByRank = productsByRank.slice(0, numberOfItems);
                           }
                           var prodColl = new ProductModels.ProductCollection();
                           prodColl.set('items', productsByRank);


                          var displayType = container.config.displayType;
                          if (!displayType){
                            displayType = "carousel";
                          }
                          if (displayType == "carousel"){
                            var productListView = new ProductListView({
                                 el: $('[data-rti-recommended-products='+placeholder+']'),
                                 model: prodColl
                             });
                            $("."+placeholder+".slider-title").text(displayName);
                            productListView.render(placeholder);
                            return;
                          } else if (displayType == "grid"){
                            var gridListView = new GridView({
                               el: $('[data-rti-recommended-products='+placeholder+']'),
                               model: prodColl
                            });
                            $("."+placeholder+".slider-title").text(displayName);
                            console.log("found grid");
                            console.log(prodColl.toJSON());
                            gridListView.render(placeholder);
                            return;
                          }
                       }
                       $('.recommended-product-container .'+placeholder+'.slider-title').hide();
                       $('.recommended-product-container .rti-recommended-products.'+placeholder+'.carousel-parent').hide();
                       $('.recommended-product-container.'+placeholder).removeClass('hidden');
                   });
               }
         } else {
           if (pageContext.isEditMode){
             $('.recommended-product-container.'+placeholder).text("An RTI recommendations widget is dropped but there are no products to display.");
           }
         }
       }
     });
 };

/*
getCookie is used when building the product call URL.
*/
 var getCookie = function(cname){
   var name = cname + "=";
   var decodedCookie = decodeURIComponent(document.cookie);
   var ca = decodedCookie.split(';');
   for(var i = 0; i <ca.length; i++) {
       var c = ca[i];
       while (c.charAt(0) == ' ') {
           c = c.substring(1);
       }
       if (c.indexOf(name) === 0) {
           return c.substring(name.length, c.length);
       }
   }
   return "";
};

 try {
     getRecommendedProducts(function(data) {
         renderData(data);
     }, function() {
         var productsFound = {};
         productsFound.data = {};
         productsFound.data.items = [];
         renderData(productsFound);
     });
 } catch(err) {}
 /*Recommended Product Code Ends*/

});
