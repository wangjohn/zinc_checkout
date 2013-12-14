/**
 * Main helper functions
 * ----------------------------------------------------------------------------
 */

var loadingSpinner = function(spinnerText) {
  $(".zinc-view").children().hide();
  $(".spinner").show();
  $(".spinner .spinner-text").text(spinnerText);
};

var showSection = function(section) {
  $(".spinner").hide();
  $(section).show();
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
    } else {
      callback(data);
    }
  });
};

/**
 * API Call specific functions
 * ----------------------------------------------------------------------------
 */

var populateVariantOptions = function(selector, variantOptions) {
  for (var i in variantOptions) {
    var currentOption = variantOptions[i];

    var dimensionsHtml = [];
    for (var j in currentOption.dimensions) {
      var currentDimension = currentOption.dimensions[j]
      dimensionsHtml.push(currentDimension.name + ": " + currentDimension.value);
    }

    var variantHtml = [];
    variantHtml.push("<div class='variant'>");
    variantHtml.push("<input type='checkbox' class='variant-checkbox' name='" + currentOption.product_id + "'>");
    variantHtml.push("<input class='variant-quantity' name='" + currentOption.product_id + "' style='display:none'>");
    variantHtml.push(dimensionsHtml.join(", "));
    variantHtml.push("</div>");

    $(selector).append(
      variantHtml.join("")
    );
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



/**
 * Main logic for listeners
 * ----------------------------------------------------------------------------
 */

$(function() {
  $('.shipping-methods .product-results').on('click', 'input.variant-checkbox', function(e) {
    var obj = $(this);
    if (obj.is(':checked')) {
      obj.next().show();
    } else {
      obj.next().hide();
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
      callback: function(data) {
        $("#shipping-methods-form .retailer").val(data['retailer']);
        populateVariantOptions("#shipping-methods-form .product-results", data['variant_options']);

        showSection(".shipping-methods");
        console.log(data);
      }
    });
  });

  $("#shipping-methods-form").submit(function(e) {
    e.preventDefault();

    makeZincRequest({
      url: "https://demotwo.zinc.io/v0/shipping_methods",
      data: {
        "retailer": $("#variant-options-form select.retailer").val(),
        "products": populateProducts("#shipping-methods-form input.variant-checkbox:checked"),
        "shipping_address": {
          "first_name": $("#shipping-methods-form input.first-name").val(),
          "last_name": $("#shipping-methods-form input.last-name").val(),
          "address_line1": $("#shipping-methods-form input.address-line1").val(),
          "address_line2": $("#shipping-methods-form input.address-line2").val(),
          "zip_code": $("#shipping-methods-form input.zip-code").val(),
          "state": $("#shipping-methods-form input.state").val(),
          "country": $("#shipping-methods-form input.country").val(),
          "phone_number": $("#shipping-methods-form input.phone-number").val()
        }
      },
      callback: function(data) {
        $("#shipping-methods-form .retailer").val(data['retailer']);
        populateVariantOptions("#shipping-methods-form .product-results", data['variant_options']);

        showSection(".store-card");
        console.log(data);
      }
    });
  });
});
