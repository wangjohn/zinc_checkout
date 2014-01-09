var ProductDimensions = (function() {
  var dimensionSelectTemplate = Handlebars.partials["_variant_options_dimension_select"];
  var dropdownTemplate = Handlebars.partials["_variant_option_results"];
  var productInfoTemplate = Handlebars.partials["_variant_product_info"];

  var _dropdownChangeListener = function(i, productDimensions, selector) {
    return function() {
      var currentName = productDimensions["dimensionNames"][i];
      _dimensionSelectElement(selector, currentName).change(function() {
        if (i < productDimensions["dimensionNames"].length - 1) {
          var nextName = productDimensions["dimensionNames"][i+1];
          var productDimensionList = _getProductDimensionList(selector, nextName, productDimensions);
          var html = dimensionSelectTemplate({values: productDimensionList, name: nextName});
          $(selector).find(".variant-product-info").html();
          _clearSelectionsAfter(selector, nextName, productDimensions);
          _dimensionSelectElement(selector, nextName).html(html);
        } else {
          var values = _getPrevDimensionValues(selector,
            productDimensions["dimensionNames"].length, productDimensions);
          var productInfo = productDimensions["dimensionProductMap"](values);
          $(selector).find(".variant-product-info").html(
            productInfoTemplate(productInfo)
          );
        }
      });
    };
  };

  var _initializeStartingDropdowns = function(selector, productDimensions) {
    var dimensions = productDimensions["dimensions"];
    var dimensionNames = productDimensions["dimensionNames"];
    for (var i=0; i<dimensionNames.length; i++) {
      _initializeDropdown(selector, i, dimensionNames, dimensions)();
    }
  };

  var _initializeDropdown = function(selector, i, dimensionNames, dimensions) {
    return function() {
      var name = dimensionNames[i];
      var keys;
      if (i == 0){
        keys = _listOfKeys(dimensions);
      } else {
        keys = [];
      }
      _dimensionSelectElement(selector, name).append(
        dimensionSelectTemplate({values: keys, name: name})
      );
    };
  };

  var _clearSelectionsAfter = function(selector, name, productDimensions) {
    var index = productDimensions["namesToIndices"][name];
    for (var i=(index+1); i<productDimensions["dimensionNames"].length; i++) {
      var currentName = productDimensions["dimensionNames"][i];
      _dimensionSelectElement(selector, currentName).html();
    }
  };

  var _dimensionSelectElement = function(selector, name) {
    return $(selector).find(".variant-dimension").find("." + _sanitizeName(name));
  };

  var _sanitizeName = function(name) {
    return Handlebars.helpers.sanitizeName(name);
  };

  var _getPrevDimensionValues = function(selector, index, productDimensions) {
    var prevValues = [];

    for (var i=0; i<index; i++) {
      var val = $(selector).find("select." + 
          _sanitizeName(productDimensions["dimensionNames"][i])).val();
      prevValues.push(val);
    }

    return prevValues
  };

  var _getProductDimensionList = function(selector, name, productDimensions) {
    var index = productDimensions["namesToIndices"][name];
    var prevDimensionValues = _getPrevDimensionValues(selector, index, productDimensions);
    var dimenHash = productDimensions["dimensions"];
    for (var i in prevDimensionValues) {
      dimenHash = dimenHash[prevDimensionValues[i]];
    }

    return _listOfKeys(dimenHash);
  };

  var _listOfKeys = function(associative_array) {
    var result = [];
    for (var property in associative_array) {
      if (associative_array.hasOwnProperty(property)) {
        result.push(property);
      }
    }
    return result;
  };

  var _getProductDimensions = function(variantOptions) {
    var dimensionNames = [];
    var namesToIndices = {};
    var dimensions = {};
    var dimensionProductMap = {};

    for (var i=0; i<variantOptions.length; i++) {
      var currentDimensions = variantOptions[i]["dimensions"];
      currentDimensions.sort(function(a,b) { return a["name"].localeCompare(b["name"]) });
      var productMap = dimensionProductMap;

      for (var j=0; j<currentDimensions.length; j++) {
        if (i == 0) {
          namesToIndices[currentDimensions[j]["name"]] = j;
          dimensionNames.push(currentDimensions[j]["name"]);
        }

        productMap = _updateProductMap(j, productMap, currentDimensions);
        _insertLatestDimension(j, currentDimensions, dimensions);
      }

      productMap["product_id"] = variantOptions[i]["product_id"];
      productMap["unit_price"] = variantOptions[i]["unit_price"];
    };

    return {
      "dimensionProductMap": _getProductInfo(dimensionProductMap),
      "namesToIndices": namesToIndices,
      "dimensionNames": dimensionNames,
      "dimensions": dimensions
    }
  };

  var _getProductInfo = function(dimensionProductMap) {
    return function(values) {
      var map = dimensionProductMap;
      for (var i=0; i<values.length; i++) {
        map = map[values[i]];
      }
      return map;
    };
  };

  var _updateProductMap = function(j, productMap, currentDimensions) {
    if (!(currentDimensions[j]["value"] in productMap)) {
      productMap[currentDimensions[j]["value"]] = {};
    }
    return productMap[currentDimensions[j]["value"]];
  };

  var _insertLatestDimension = function(j, currentDimensions, dimensions) {
    var result = dimensions;
    for (var i=0; i<=j; i++) {
      var val = currentDimensions[i]["value"];
      if (val in result) {
        result = result[val];
      } else {
        result[val] = {};
        result = result[val];
      }
    }
  };

  var createProductDropdowns = function(selector, variantOptions) {
    var productDimensions = _getProductDimensions(variantOptions);
    $(selector).append(
      dropdownTemplate(productDimensions)
    );

    if (productDimensions["dimensionNames"].length === 0 &&
        variantOptions.length > 0) {
      var productInfo = {
        "product_id": variantOptions[0]["product_id"],
        "unit_price": variantOptions[0]["unit_price"]
      };
      $(selector).find(".variant-product-info").html(
        productInfoTemplate(productInfo)
      );
    } else {
      // Initialize the product dropdown html
      _initializeStartingDropdowns(selector, productDimensions);

      // Listeners for the product dimensions
      for (var i=0; i<productDimensions["dimensionNames"].length; i++) {
        _dropdownChangeListener(i, productDimensions, selector)();
      }
    }
  };


  return {
    createProductDropdowns: createProductDropdowns
  };

})();
