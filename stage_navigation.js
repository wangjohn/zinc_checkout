var StageNavigation = (function(){

  var initialize = function(selector) {
    $(selector).on("stage_navigation_change", function(e) {
      var previousStage = e.data["previous_stage"];
      var nextStage = e.data["next_stage"];


    });
  };

  var storeCardStage = function() {
    var shippingAddressData = createSelectorData("#shipping-methods-form input,select", addressDataAttributes);
    shippingAddressData["country"] = "US";
    $("body").data("shipping_address_data", shippingAddressData);
    populateBillingAddress('#store-card-form .card-billing-address', true);
    populateCreditCardName('#store-card-form .billing-address-name');
    showSection(".store-card");

    makeZincRequest({
      url: zincUrl + "shipping_methods",
      data: {
        "retailer": $("body").data("variant_options_response")["retailer"],
        "products": populateProducts("#shipping-methods-form .variant-product-info input.product-id"),
        "shipping_address": shippingAddressData
      },
      callback: handleZincResponse(function(data) {
        $("body").data("shipping_methods_response", data);

        if ($("body").data("store_card_data")) {
          placeStoreCardAndReviewOrderCall();
        } else {
          $("#store-card-form").on("submit", valPassingCall(function(e) {
            placeStoreCardAndReviewOrderCall();
          }));
        }
      })
    });
  };

  return {
    initialize: initialize
  };
})();
