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
    $(".zinc-view").children().hide();
    $(".spinner").hide();
    $(".error-message").html(data['message']);
    $(".error-handling").alert();
    $(".error-handling").show();
    triggerResizeEvent();
  };

  var showSection = function(section) {
    $(".zinc-view").children().hide();
    $(".spinner-wrapper").hide();
    $(section).show();
    $(".stage-navigation").find("li.active").removeClass("active");
    $(".stage-navigation").find(section + "-nav").addClass("active");
    triggerResizeEvent();
  };

  var showLoadingScreen = function(message) {
    $(".zinc-view").children().hide();
    $(".spinner-wrapper").show();
    $(".spinner-wrapper .spinner-text").text(message);
    triggerResizeEvent();
  };

  var handleZincResponse = function(func) {
    return function(data) {
      if (data['_type'] === 'error') {
        showError(data);
      } else {
        func(data);
      }
    }
  };

  var createSelectorData = function(selector, attributes) {
    var result = {};
    var jqSelector = $(selector);
    for (var i in attributes) {
      var attr = attributes[i];
      result[attr] = jqSelector.filter(_convertToSelector(attr)).val();
    }

    return result;
  };

  var valPassingCall = function(cb) {
    return function(e) {
      e.preventDefault();

      if (!$(e.currentTarget).hasClass("has-validation-error")) {
        cb(e);
      }
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
      showError({ "message": "Oops, it seems like we weren't able to reach the Zinc server." });
    });
  };

  var waitForResult = function(url, requestId, callback) {
    $.ajax({
      url: url + "/" + requestId,
      type: "GET",
    }).done(function(data) {
      if (data['_type'] === "error" && data['code'] === "request_processing") {
        console.log('waiting');
        setTimeout(function() {
          waitForResult(url, requestId, callback)
        }, 1000);
      } else if (data['_type'] === "error") {
        showError(data);
      } else {
        callback(data);
      }
    }).fail(function(jqXhr, textStatus){
      showError({ "message": "Oops, it seems like we weren't able to reach the Zinc server." });
    });
  };

  var triggerResizeEvent = function() {
    var headerHeight = $("#content-wrapper .modal-header").outerHeight();
    var bodyHeight = $("#content-wrapper .modal-body").outerHeight();
    console.log($("#content-wrapper .modal-body"));
    var height = headerHeight + bodyHeight;
    console.log("computed height: " + headerHeight + "; " + bodyHeight + "; " + height);
    parent.postMessage("zinc-resize-height=" + height, "*");
  };

  var initializeHandlebars = function() {
    $('.shipping-methods').append(
      Handlebars.templates['shipping_methods']({'name': true})
    );
    $('.store-card').append(Handlebars.templates['store_card']());
    $('.completed-order').append(Handlebars.templates['completed_order']());
    $('.modal-header').append(Handlebars.templates['stage_navigation']());

    Handlebars.registerHelper("capitalize", function(string, options) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    });

    Handlebars.registerHelper("displayDollars", function(cents, options) {
      return (parseInt(cents) / 100).toString();
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
    var result = {};

    if (parameterSplit.length > 1) {
      var match = /product_url=(.*)&retailer=(.*)/.exec(paramString);
      if (match.length >= 3) {
        result["product_url"] = decodeURIComponent(match[1]);
        result["retailer"] = decodeURIComponent(match[2]);
      }
    }

    return result;
  };

  /**
   * API Call specific functions
   * ----------------------------------------------------------------------------
   */

  var populateProducts = function(selector) {
    var products = [{
      "product_id": $(selector).val(),
      "quantity": 1
    }];

    $('body').data("products", products);
    return products;
  };

  var fetchBillingAddressData = function(checkbox_selector, selector, attributes) {
    if ($(checkbox_selector).is(":checked")) {
      var data = $("body").data("shipping_address_data");
      var result = {};
      for (var i in attributes) {
        result[attributes[i]] = data[attributes[i]];
      }

      return result;
    } else {
      return createSelectorData(selector, attributes);
    }
  };

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

    var data = {
      retailer: $("body").data("variant_options_response")["retailer"],
      products: selectedProducts,
      product_url: $("body").data("variant_options_response")["product_url"],
      shipping_address: $("body").data("shipping_address_data"),
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

  /**
   * Main logic for listeners
   * ----------------------------------------------------------------------------
   */

  initializeHandlebars();

  $("input,select,textarea").not("[type=submit]").jqBootstrapValidation({
    filter: function () {
      return $(this).is(":visible");
    }
  });

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

  $(window).load(function(e) {
    eventData = parseUrlParameters(window.location.href);
    $("#shipping-methods-form select.dimension-values").jqBootstrapValidation();
    showSection(".shipping-methods");
    makeZincRequest({
      url: zincUrl + "variant_options",
      data: {
        "retailer": eventData["retailer"],
        "product_url": eventData["product_url"]
      },
      callback: handleZincResponse(function(data) {
        $("body").data("variant_options_response", data);
        $("#shipping-methods-form .spinner").hide();
        ProductDimensions.createProductDropdowns(
          "#shipping-methods-form .product-results",
          "#shipping-methods-form .variant-product-info",
          data["variant_options"]);
        $("#shipping-methods-form button.submit-shipping-methods").attr("disabled", false);
      })
    });
    triggerResizeEvent();
  });

  $("#store-card-form").on("submit", function(e) {
    e.preventDefault();
    $("body").data("security_code", $("#store-card-form input.security-code").val());
    var billing_address = fetchBillingAddressData("input.use-shipping-address",
      ".card-billing-address input", addressDataAttributes);
    billing_address["country"] = "US";
    var expirationData = CreditCard.parseExpirationInput("#store-card-form input.expiration-month-and-year");

    var storeCardData = {
      "number": $("#store-card-form input.credit-card-number").val(),
      "expiration_month": expirationData["month"],
      "expiration_year": expirationData["year"],
      "billing_address": billing_address
    };
    $("body").data("store_card_data", storeCardData);

    showLoadingScreen();
  });

  var placeStoreCardAndReviewOrderCall = function() {
    makeZincRequest({
      url: zincUrl + "store_card",
      data: $("body").data("store_card_data"),
      callback: handleZincResponse(function(data) {
        $("body").data("store_card_response", data);

        // Make a review_order request immediately after the store_card request
        makeZincRequest({
          url: zincUrl + "review_order",
          data: {
            "retailer": $("body").data("variant_options_response")["retailer"],
            "products": $("body").data("products"),
            "shipping_address": $("body").data("shipping_address_data"),
            "is_gift": $("#store-card-form input.is-gift").attr(":checked") !== undefined,
            "shipping_method_id": getShippingMethodId(),
            "payment_method": {
              "security_code": $("body").data("security_code"),
              "cc_token": $("body").data("store_card_response")["cc_token"],
            },
            "customer_email": $("#store-card-form input.email-address").val()
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

  $("#shipping-methods-form").on("submit", valPassingCall(function(e) {
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
  }));

  $(".review-order").on("submit", "#place-order-form", valPassingCall(function(e) {
    console.log("placing order");
    makeZincRequest({
      url: zincUrl + "place_order",
      data: {
        "place_order_key": $("body").data("review_order_response")["place_order_key"]
      },
      callback: handleZincResponse(function(data) {
        $(".completed-order .order-confirmation").append(
          Handlebars.partials["_completed_order"](data)
        );
        showSection(".completed-order");
      })
    });
  }));
});
