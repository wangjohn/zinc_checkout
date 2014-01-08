/**
 * Main helper functions
 * ----------------------------------------------------------------------------
 */

var showError = function(data) {
  $(".zinc-view").children().hide();
  $(".spinner").hide();
  $(".error-message").html(data['message']);
  $(".error-handling").alert();
  $(".error-handling").show();
};

var updateProgressBar = function(completion) {
  $(".progress-bar").css("width", completion);
};

var loadingSpinner = function(spinnerText) {
  $(".zinc-view").children().hide();
  $(".spinner").show();
  $(".spinner .spinner-text").text(spinnerText);
};

var showSection = function(section) {
  $(".spinner").hide();
  $(section).show();
  $(".stage-navigation").find("li.active").removeClass("active");
  $(".stage-navigation").find(section + "-nav").addClass("active");
};

var handleZincResponse = function(func) {
  return function(data) {
    if (data['_type'] == 'error') {
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
  $.ajax({
    url: options['url'],
    type: "POST",
    dataType: "json",
    beforeSend: function() {
      loadingSpinner("Making request to '" + options['url'] + "'");
    },
    data: JSON.stringify(options['data'])
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
    beforeSend: function(){
      loadingSpinner('Waiting for response to request_id: ' + requestId);
    },
  }).done(function(data) {
    if (data['_type'] == "error" && data['code'] == "request_processing") {
      console.log('waiting');
      setTimeout(function() {
        waitForResult(url, requestId, callback)
      }, 1000);
    } else if (data['_type'] == "error") {
      showError(data);
    } else {
      callback(data);
    }
  }).fail(function(jqXhr, textStatus){
    showError({ "message": "Oops, it seems like we weren't able to reach the Zinc server." });
  });
};

var initializeHandlebars = function() {
  $('.variant-options').append(Handlebars.templates['variant_options']());
  $('.shipping-methods').append(
    Handlebars.templates['shipping_methods']({ phone_number: true })
  );
  $('.store-card').append(Handlebars.templates['store_card']());
  $('.completed-order').append(Handlebars.templates['completed_order']());
  $('.modal-footer').append(Handlebars.templates['stage_navigation']());

  Handlebars.registerHelper("capitalize", function(string, options) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  });

  Handlebars.registerHelper("displayDollars", function(cents, options) {
    return "$" + (parseInt(cents) / 100).toString();
  });
};

var _convertToSelector = function(attribute) {
  return "." + attribute.replace(/_/, "-");
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


/**
 * Main logic for listeners
 * ----------------------------------------------------------------------------
 */

$(function() {
  initializeHandlebars();

  var addressDataAttributes = [
    "first_name",
    "last_name",
    "address_line1",
    "address_line2",
    "zip_code",
    "city",
    "state",
    "country"
  ];

  $("input,select,textarea").not("[type=submit]").jqBootstrapValidation({
    filter: function () {
      return $(this).is(":visible");
    }
  });

  $('.shipping-methods .product-results').on('click', 'input.variant-checkbox', function(e) {
    $(this).closest('.variant').toggleClass('checked');
  });

  $('.store-card .billing-address').on('click', '.use-shipping-address', function(e) {
    $(".billing-address-information").toggle();
  });

  $("#variant-options-form").on("submit", valPassingCall(function(e) {
    makeZincRequest({
      url: "https://demotwo.zinc.io/v0/variant_options",
      data: {
        "retailer": $("#variant-options-form select.retailer").val(),
        "product_url": $("#variant-options-form input.product-url").val()
      },
      callback: handleZincResponse(function(data) {
        $("body").data("variant_options_response", data);
        ProductDimensions.createProductDropdowns(
          "#shipping-methods-form .product-results", data["variant_options"]);

        updateProgressBar("40%");
        showSection(".shipping-methods");
      })
    });
  }));

  $("#shipping-methods-form").on("submit", valPassingCall(function(e) {
    var shippingAddressData = createSelectorData("#shipping-methods-form input", addressDataAttributes.concat("phone_number"));
    $("body").data("shipping_address_data", shippingAddressData);

    makeZincRequest({
      url: "https://demotwo.zinc.io/v0/shipping_methods",
      data: {
        "retailer": $("body").data("variant_options_response")["retailer"],
        "products": populateProducts("#shipping-methods-form .variant-product-info input.product-id"),
        "shipping_address": shippingAddressData
      },
      callback: handleZincResponse(function(data) {
        $("body").data("shipping_methods_response", data);
        $("#store-card-form .shipping-method-results").append(
          Handlebars.partials["_shipping_method_results"](data)
        );

        updateProgressBar("60%");
        showSection(".store-card");
      })
    });
  }));

  $("#store-card-form").on("submit", valPassingCall(function(e) {
    $("body").data("security_code", $("#store-card-form input.security-code").val());
    $("body").data("shipping_method_id",
      $(".shipping-method-results input.shipping-result-radio:checked").attr("shipping-method-id")
    );

    makeZincRequest({
      url: "https://demotwo.zinc.io/v0/store_card",
      data: {
        "number": $("#store-card-form input.number").val(),
        "expiration_month": $("#store-card-form select.expiration-month").val(),
        "expiration_year": $("#store-card-form select.expiration-year").val(),
        "billing_address": fetchBillingAddressData("input.use-shipping-address", ".card-billing-address input", addressDataAttributes)
      },
      callback: handleZincResponse(function(data) {
        $("body").data("store_card_response", data);

        // Make a review_order request immediately after the store_card request
        makeZincRequest({
          url: "https://demotwo.zinc.io/v0/review_order",
          data: {
            "retailer": $("body").data("variant_options_response")["retailer"],
            "products": $("body").data("products"),
            "shipping_address": $("body").data("shipping_address_data"),
            "is_gift": $("#store-card-form input.is-gift").attr(":checked") !== undefined,
            "shipping_method_id": $("body").data("shipping_method_id"),
            "payment_method": {
              "security_code": $("body").data("security_code"),
              "cc_token": $("body").data("store_card_response")["cc_token"],
            },
            "customer_email": $("#store-card-form input.email-address").val()
          },
          callback: handleZincResponse(function(data) {
            $("body").data("review_order_response", data);
            displayReviewOrder(".review-order");
            updateProgressBar("100%");
            showSection(".review-order");
          })
        });
      })
    });
  }));

  $(".review-order").on("submit", "#place-order-form", valPassingCall(function(e) {
    console.log("placing order");
    makeZincRequest({
      url: "https://demotwo.zinc.io/v0/place_order",
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