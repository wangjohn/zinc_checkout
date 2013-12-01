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
    variantHtml.push("<input class='variant' name='" + currentOption.product_id + "'>");
    variantHtml.push(dimensionsHtml.join(", "));
    variantHtml.push("</div>");

    $(selector).append(
      variantHtml.join("")
    );
  }
};

$(function() {
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
        populateVariantOptions("#shipping-methods-form .products", data['variant_options']);

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
        "product_url": $("#variant-options-form input.product-url").val()
      },
      callback: function(data) {
        console.log(data);
      }
    });
  });
});
