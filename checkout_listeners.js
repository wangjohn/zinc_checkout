$(function() {
  /**
   * Constants
   */

  var addressDataAttributes = [
    "first_name",
    "last_name",
    "address_line1",
    "address_line2",
    "zip_code",
    "city",
    "state"
  ];


  /**
   * Main helper functions
   * ----------------------------------------------------------------------------
   */

  var zincUrl = "https://api.zinc.io/v0/";

  var showError = function(data) {
    $('.error-handling .error-message').html(
      Handlebars.partials["_error_messages"](data)
    );
    $(".error-handling").alert();
    $(".spinner-wrapper").hide();
    $(".error-handling").show();
    parent.postMessage("zinc-error", "*");
    triggerResizeEvent();
  };

  var showMajorError = function(data) {
    showError(data);
    $(".zinc-view").children().hide();
  };

  var clearErrors = function() {
    $("body").find(".has-error").removeClass("has-error");
    $(".error-handling .error-message").html("");
    $(".error-handling").hide();
  };

  var showSection = function(section) {
    clearErrors();
    $(".zinc-view").children().hide();
    $(".spinner-wrapper").hide();
    $(section).show();
    $(".stage-navigation").find("li.active").removeClass("active");
    $(".stage-navigation").find(section + "-nav").addClass("active");
    triggerResizeEvent();
  };

  var showLoadingScreen = function(message) {
    clearErrors();
    $(".zinc-view").children().hide();
    $(".spinner-wrapper").show();
    $(".spinner-wrapper .spinner-text").text(message);
    triggerResizeEvent();
  };

  var handleZincResponse = function(func) {
    return function(data) {
      if (data['_type'] === 'error') {
        showMajorError({"major_error": data["message"]});
      } else {
        func(data);
      }
    }
  };

  var valPassingCall = function(cb) {
    return function(e) {
      e.preventDefault();
      cb(e);
    }
  };

  var makeZincRequest = function(options) {
    var data = options["data"];
    data["client_token"] = "zinc_monkey";

    $.ajax({
      url: options['url'],
      type: "POST",
      dataType: "json",
      data: JSON.stringify(data)
    }).done(function(data){
      waitForResult(options['url'], data['request_id'], options['callback']);
    }).fail(function(jqXhr, textStatus){
      showMajorError({"major_error": "Oops, it seems like we weren't able to reach the Zinc server."});
    });
  };

  var waitForResult = function(url, requestId, callback) {
    $.ajax({
      url: url + "/" + requestId,
      type: "GET",
    }).done(function(data) {
      if (data['_type'] === "error" && data['code'] === "request_processing") {
        setTimeout(function() {
          waitForResult(url, requestId, callback)
        }, 1000);
      } else if (data['_type'] === "error" && ['code'] !== 'request_processing') {
        showMajorError({"major_error": data["message"]});
      } else {
        callback(data);
      }
    }).fail(function(jqXhr, textStatus){
      showMajorError({"major_error": "Oops, it seems like we weren't able to reach the Zinc server."});
    });
  };

  var triggerResizeEvent = function() {
    var headerHeight = $("#content-wrapper .modal-header").outerHeight(true);
    var bodyElement = $("#content-wrapper .modal-body");
    var height = headerHeight + bodyElement.outerHeight(true);
    parent.postMessage("zinc-resize-height=" + height, "*");
  };

  var initializeHandlebars = function() {
    $('.shipping-methods').append(
      Handlebars.templates['shipping_methods']({'name': true})
    );
    $('.store-card').append(Handlebars.templates['store_card']());
    $('.modal-header').append(Handlebars.templates['stage_navigation']());

    Handlebars.registerHelper("capitalize", function(string, options) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    });

    Handlebars.registerHelper("displayDollars", function(cents, options) {
      return (parseInt(cents, 10) / 100).toFixed(2);
    });

    Handlebars.registerHelper("sanitizeName", function(name) {
      return name.replace(/\s/, "-");
    });
  };

  var _convertToSelector = function(attribute) {
    return "." + attribute.replace(/_/, "-");
  };

  var parseUrlParameters = function(url) {
    var parameterSplit = url.split("?");
    var paramString = parameterSplit.slice(1).join("?");

    if (parameterSplit.length > 1) {
      var result = {};
      var match = /product_url=(.*)&retailer=(.*)/.exec(paramString);
      if (match.length >= 3) {
        result["product_url"] = decodeURIComponent(match[1]);
        result["retailer"] = decodeURIComponent(match[2]);
      }
      return result;
    }
  };

  /**
   * API Call specific functions
   * ----------------------------------------------------------------------------
   */

  var displayReviewOrder = function(selector) {
    var productsData = $("body").data("products");
    var variants = $("body").data("variant_options_response")["variant_options"];
    var selectedProducts = [];

    for (var i=0; i<productsData.length; i++) {
      for (var j=0; j<variants.length; j++) {
        if (variants[j].product_id === productsData[i].product_id) {
          // TODO: this actually mutates variants[j], but for now it doesn't matter
          // Just a note for the future
          variants[j].quantity = productsData[i].quantity;
          selectedProducts.push(variants[j]);
        }
      }
    }
    $("body").data("products_display_data", selectedProducts);

    var data = {
      retailer: $("body").data("variant_options_response")["retailer"],
      products: selectedProducts,
      product_url: $("body").data("variant_options_response")["product_url"],
      shipping_address: $("body").data("shipping_address_data"),
      billing_address: $("body").data("store_card_data")["billing_address"],
      product_name: $("body").data("product_name_response")["product_name"],
      payment_method: $("body").data("store_card_response"),
      price_components: $("body").data("review_order_response")["price_components"]
    };

    $(selector).append(
      Handlebars.templates["review_order"](data)
    );
  }

  var populateBillingAddress = function(selector, isChecked) {
    var shippingAddressData = $("body").data("shipping_address_data");
    for (var i=0; i<addressDataAttributes.length; i++) {
      var attribute = addressDataAttributes[i];
      var attributeValue = "";
      if (isChecked) {
        attributeValue = shippingAddressData[attribute];
      }
      $(selector).find(_convertToSelector(attribute)).val(attributeValue);
    }
  }

  var populateCreditCardName = function(selector) {
    var shippingAddressData = $("body").data("shipping_address_data");
    var name = shippingAddressData["first_name"] + " " + shippingAddressData["last_name"];
    $(selector).val(name);
  };

  var getShippingMethodId = function() {
    var shippingMethods = $("body").data("shipping_methods_response")["shipping_methods"];
    var shippingMethodId, minPrice;
    for (var i=0; i<shippingMethods.length; i++) {
      if (minPrice === undefined || shippingMethods[i]["price"] < minPrice) {
        shippingMethodId = shippingMethods[i]["shipping_method_id"];
        minPrice = shippingMethods[i]["price"];
      }
    }
    return shippingMethodId;
  };

  var shippingResponseCallback = function(eventData) {
    if ($("body").data("variant_options_response") &&
        $("body").data("product_name_response")) {
      $("#shipping-methods-form .product-name a").text(
          $("body").data("product_name_response")["product_name"]);
      $("#shipping-methods-form .product-name a").attr('href', eventData["product_url"]);
      $("#shipping-methods-form .spinner").hide();
      ProductDimensions.createProductDropdowns(
        "#shipping-methods-form .product-results",
        "#shipping-methods-form .variant-product-info",
        $("body").data("variant_options_response")["variant_options"]);
      $("#shipping-methods-form button.submit-shipping-methods").attr("disabled", false);
    }
  };

  /**
   * Initializers
   * ----------------------------------------------------------------------------
   */

  initializeHandlebars();

  $('.shipping-methods .product-results').on('click', 'input.variant-checkbox', function(e) {
    $(this).closest('.variant').toggleClass('checked');
  });

  $('.store-card').delegate('input.use-shipping-address', 'click', function(e) {
    var isChecked = $(".store-card input.use-shipping-address").is(":checked");
    populateBillingAddress('#store-card-form .card-billing-address', isChecked);
  });

  CreditCard.initialize(
      '#store-card-form .expiration-month-and-year',
      '#store-card-form .credit-card-number',
      '#store-card-form .security-code');

  $('body').on('zinc_client_validation_error', function(e, data) {
    clearErrors();
    for (var i=0; i<data["selectors"].length; i++) {
      $(data["selectors"][i]).closest(".control-group").addClass("has-error");
    }
    showError(data);
  });

  /**
   * Main logic for listeners
   * ----------------------------------------------------------------------------
   */

  $(window).load(function(e) {
    eventData = parseUrlParameters(window.location.href);
    if (eventData) {
      showSection(".shipping-methods");
      makeZincRequest({
        url: zincUrl + "variant_options",
        data: {
          "retailer": eventData["retailer"],
          "product_url": eventData["product_url"]
        },
        callback: handleZincResponse(function(data) {
          $("body").data("variant_options_response", data);
          shippingResponseCallback(eventData);
        })
      });
      makeZincRequest({
        url: zincUrl + "get_product_name",
        data: {
          "retailer": eventData["retailer"],
          "product_url": eventData["product_url"]
        },
        callback: handleZincResponse(function(data) {
          $("body").data("product_name_response", data);
          shippingResponseCallback(eventData);
        })
      });
    }
  });

  $("#shipping-methods-form").on("submit", valPassingCall(function(e) {
    var shippingMethodsData = Validation.validateShippingMethodsForm();

    if (shippingMethodsData) {
      shippingMethodsData["shipping_address"]["country"] = "US";
      shippingMethodsData["retailer"] = $("body").data("variant_options_response")["retailer"],
      $("body").data("shipping_address_data", shippingMethodsData["shipping_address"]);
      $("body").data("products", shippingMethodsData["products"]);

      // Get ready to show things in the store card form
      populateBillingAddress('#store-card-form .card-billing-address', true);
      populateCreditCardName('#store-card-form .billing-address-name');
      showSection(".store-card");

      makeZincRequest({
        url: zincUrl + "shipping_methods",
        data: shippingMethodsData,
        callback: handleZincResponse(function(data) {
          $("body").data("shipping_methods_response", data);

          if ($("body").data("store_card_data")) {
            placeStoreCardAndReviewOrderCall();
          } else {
            $("#store-card-form").on("submit", valPassingCall(function(e) {
              if ($("body").data("store_card_data")) {
                placeStoreCardAndReviewOrderCall();
              }
            }));
          }
        })
      });
    }
  }));

  $("#store-card-form").on("submit", function(e) {
    e.preventDefault();
    var validatedData = Validation.validateStoreCardForm();
    if (validatedData) {
      $("body").data("review_order_data", validatedData["review_order"]);
      var storeCardData = validatedData["store_card"];
      storeCardData["billing_address"]["country"] = "US";
      $("body").data("store_card_data", storeCardData);

      showLoadingScreen();
    }
  });

  var placeStoreCardAndReviewOrderCall = function() {
    makeZincRequest({
      url: zincUrl + "store_card",
      data: $("body").data("store_card_data"),
      callback: handleZincResponse(function(data) {
        $("body").data("store_card_response", data);
        var reviewOrderData = $("body").data("review_order_data");

        // Make a review_order request immediately after the store_card request
        makeZincRequest({
          url: zincUrl + "review_order",
          data: {
            "retailer": $("body").data("variant_options_response")["retailer"],
            "products": $("body").data("products"),
            "shipping_address": $("body").data("shipping_address_data"),
            "is_gift": reviewOrderData["is_gift"],
            "shipping_method_id": getShippingMethodId(),
            "payment_method": {
              "security_code": reviewOrderData["payment_method"]["security_code"],
              "cc_token": $("body").data("store_card_response")["cc_token"],
            },
            "customer_email": reviewOrderData["customer_email"]
          },
          callback: handleZincResponse(function(data) {
            $("body").data("review_order_response", data);
            displayReviewOrder(".review-order");
            showSection(".review-order");
          })
        });
      })
    });
  };

  $(".review-order").on("submit", "#place-order-form", valPassingCall(function(e) {
    showLoadingScreen();

    makeZincRequest({
      url: zincUrl + "place_order",
      data: {
        "place_order_key": $("body").data("review_order_response")["place_order_key"]
      },
      callback: handleZincResponse(function(data) {
        data["products"] = $("body").data("products_display_data");
        data["billing_address"] = $("body").data("store_card_data")["billing_address"];
        data["payment_method"] = $("body").data("store_card_response");
        data["product_name"] = $("body").data("product_name_response")["product_name"];
        data["product_url"] = $("body").data("variant_options_response")["product_url"];
        $(".completed-order").append(Handlebars.templates["completed_order"](data));
        showSection(".completed-order");
      })
    });
  }));

  // FIXME: This is a hack around the DOM loading on the iframe. We need to fix this.
  var originalBodyHeight = $(".modal-body").outerHeight();
  var resizeOnHandlebarsLoad = function() {
    var currentHeight = $(".modal-body").outerHeight();
    if (originalBodyHeight === currentHeight ||
        (!$(".variant-product-info").is(":visible"))) {
      setTimeout(resizeOnHandlebarsLoad, 50);
    } else {
      triggerResizeEvent();
    }
  }
  resizeOnHandlebarsLoad();
});
