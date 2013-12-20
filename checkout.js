/**
 * Main helper functions
 * ----------------------------------------------------------------------------
 */

var showError = function(data) {
  $(".zinc-view").children().hide();
  $(".error-handling").html(data['message']);
  $(".error-handling").show();
};

var loadingSpinner = function(spinnerText) {
  $(".zinc-view").children().hide();
  $(".spinner").show();
  $(".spinner .spinner-text").text(spinnerText);
};

var showSection = function(section) {
  $(".spinner").hide();
  $(section).show();
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
  });
};

var initializeHandlebars = function() {
  $('.variant-options').append(Handlebars.templates['variant_options']());
  $('.shipping-methods').append(
    Handlebars.templates['shipping_methods']({ phone_number: true })
  );
  $('.store-card').append(Handlebars.templates['store_card']());
  $('.review-order').append(Handlebars.templates['review_order']());
};

var _convertToSelector = function(attribute) {
  return "." + attribute.replace(/_/, "-");
};

/**
 * API Call specific functions
 * ----------------------------------------------------------------------------
 */

var populateProducts = function(selector) {
  var products = [];
  $(selector).each(function(index, value){
    selectedObj = $(value)
    products.push({
      "product_id": selectedObj.attr('name'),
      "quantity": selectedObj.next().val()
    });
  });

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
        selectedProducts.push(variants[j]);
      }
    }
  }

  var data = {
    retailer: $("body").data("variant_options_response")["retailer"],
    products: selectedProducts,
    shipping_address: $("body").data("shipping_address_data"),
    payment_method: $("body").data("store_card_response")
  };

  $(selector).append(
    Handlebars.partials["review_order"](data)
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
    "state",
    "country"
  ];

  $('.shipping-methods .product-results').on('click', 'input.variant-checkbox', function(e) {
    var obj = $(this);
    if (obj.is(':checked')) {
      obj.next().show();
    } else {
      obj.next().hide();
    }
  });

  $('.store-card .billing-address').on('click', '.use-shipping-address', function(e) {
    var obj = $(this);
    if (obj.is(':checked')) {
      obj.next().hide();
    } else {
      obj.next().show();
    }
  });

  $("#variant-options-form").submit(function(e) {
    e.preventDefault();

    makeZincRequest({
      url: "https://demotwo.zinc.io/v0/variant_options",
      data: {
        "retailer": $("#variant-options-form select.retailer").val(),
        "product_url": $("#variant-options-form input.product-url").val()
      },
      callback: handleZincResponse(function(data) {
        $("body").data("variant_options_response", data);
        $("#shipping-methods-form .product-results").append(
          Handlebars.partials["_variant_option_results"](data)
        );

        showSection(".shipping-methods");
      })
    });
  });

  $("#shipping-methods-form").submit(function(e) {
    e.preventDefault();

    var shippingAddressData = createSelectorData("#shipping-methods-form input", addressDataAttributes.concat("phone_number"));
    $("body").data("shipping_address_data", shippingAddressData);

    makeZincRequest({
      url: "https://demotwo.zinc.io/v0/shipping_methods",
      data: {
        "retailer": $("body").data("retailer"),
        "products": populateProducts("#shipping-methods-form input.variant-checkbox:checked"),
        "shipping_address": shippingAddressData
      },
      callback: handleZincResponse(function(data) {
        $("body").data("shipping_methods_response", data);
        $("#store-card-form .shipping-method-results").append(
          Handlebars.partials["_shipping_method_results"](data)
        );

        showSection(".store-card");
      })
    });
  });

  $("#store-card-form").submit(function(e) {
    e.preventDefault();

    makeZincRequest({
      url: "https://demotwo.zinc.io/v0/store_card",
      data: {
        "number": $("#store-card-form input.number").val(),
        "expiration_month": $("#store-card-form input.expiration-month").val(),
        "expiration_year": $("#store-card-form input.expiration-year").val(),
        "billing_address": fetchBillingAddressData("input.use-shipping-address", ".card-billing-address input", addressDataAttributes)
      },
      callback: handleZincResponse(function(data) {
        $("body").data("store_card_response", data);
        displayReviewOrder(".review-order");

        showSection(".review-order");
      })
    });
  });
});
