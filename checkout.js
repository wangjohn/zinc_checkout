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

var populateHtmlOptions = function(options, attributes) {
  var htmlList = [];

  if (options instanceof Array) {
    for (i in options) {
      var newOptions = options[i];
      var subHtmlList = [];
      for (var j in attributes) {
        subHtmlList.push(newOptions[attributes[j]]);
      }
      htmlList.push(subHtmlList.join(": "));
    }
  } else {
    for (var j in attributes) {
      htmlList.push(options[attributes[j]]);
    }
  }

  return htmlList.join(", ");
};

var _populateOptions = function(options, attributes, htmlList) {
  for (var i in attributes) {
    var attr = attributes[i];
    htmlList.push(options[attr]);
  }
};

var _convertToSelector = function(attribute) {
  return "." + attribute.replace(/_/, "-");
};

/**
 * API Call specific functions
 * ----------------------------------------------------------------------------
 */

var populateShippingResults = function(selector, shippingResults) {
  for (var i in shippingResults) {
    var currentResult = shippingResults[i];

    var resultHtml = [
      "<div class='shipping-result'>",
      "<input type='radio' name='shipping-result-checkbox' shipping-method-id='" + currentResult.shipping_method_id + "'>",
      populateHtmlOptions(currentResult, ['name', 'description', 'price']),
      "</div>"
    ];

    $(selector).append(resultHtml.join(""));
  }
};

var populateProducts = function(selector) {
  var products = [];
  $(selector).each(function(index, value){
    selectedObj = $(value)
    products.push({
      "product_id": selectedObj.attr('name'),
      "quantity": selectedObj.next().val()
    });
  });

  return products;
};

var populateReviewOrder = function(selector) {
  var obj = $(selector);

  obj.find(".retailer").html($("body").data("retailer"));
  obj.find(".products");

  // Shipping-address display
  var shippingData = $("body").data("shipping_address_data");
  var shippingHtmlList = [];
  for (var attribute in shippingData) {
    if (shippingData.hasOwnProperty(attribute)) {
      shippingHtmlList.push("<div class='attribute'>" + attribute + "</div>");
      shippingHtmlList.push("<div class='value'>" + shippingData[attribute] + "</div>");
    }
  }
  var shippingHtml = shippingHtmlList.join("");
  obj.find(".shipping-address").html(shippingHtml);
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


/**
 * Main logic for listeners
 * ----------------------------------------------------------------------------
 */

$(function() {
  // Initialize the handlebars templates
  $('.variant-options').append(Handlebars.templates['variant_options']());
  $('.shipping-methods').append(Handlebars.templates['shipping_methods']());
  $('.store-card').append(Handlebars.templates['store_card']());
  $('.review-order').append(Handlebars.templates['review_order']());

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
        $("body").data("retailer", data["retailer"]);
        $("#shipping-methods-form .product-results").append(
          Handlebars.partials["_variant_options"](data)
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
        populateShippingResults("#store-card-form .shipping-method-results", data['shipping_methods']);

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
        populateReviewOrder(".review-order");
        showSection(".review-order");
      })
    });
  });
});
