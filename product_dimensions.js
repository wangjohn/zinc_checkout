var ProductDimensions = (function() {
  var dimensionSelectTemplate = Handlebars.partials["_variant_options_dimension_select"];
  var dropdownTemplate = Handlebars.partials["_variant_option_results"];

  var createProductDropdowns = function(selector, variantOptions) {
    var productDimensions = _getProductDimensions(variantOptions);

    // Initialize the product dropdown html
    $(selector).append(
      dropdownTemplate(productDimensions)
    );
    _initializeStartingDropdowns(selector, productDimensions);


    // Listeners for the product dimensions
    for (var i=0; i<productDimensions["dimensionNames"].length; i++) {
      _dropdownChangeListener(i, productDimensions, selector)();
    }
  };

  var _dropdownChangeListener = function(i, productDimensions, selector) {
    return function() {
      var currentName = productDimensions["dimensionNames"][i];
      _dimensionSelectElement(selector, currentName).change(function() {
        if (i < productDimensions["dimensionNames"].length - 1) {
          var nextName = productDimensions["dimensionNames"][i+1];
          var productDimensionList = _getProductDimensionList(selector, nextName, productDimensions);
          var html = dimensionSelectTemplate({values: productDimensionList, name: nextName});
          _clearSelectionsAfter(selector, nextName, productDimensions);
          _dimensionSelectElement(selector, nextName).html(html);
        }
      });
    };
  };

  var _initializeStartingDropdowns = function(selector, productDimensions) {
    var dimensions = productDimensions["dimensions"];
    var dimensionNames = productDimensions["dimensionNames"];
    for (var i in dimensionNames) {
      dimensions = _initializeDropdown(selector, i, dimensionNames, dimensions)();
    }
  };

  var _initializeDropdown = function(selector, i, dimensionNames, dimensions) {
    return function() {
      var name = dimensionNames[i];
      var keys = _listOfKeys(dimensions);
      _dimensionSelectElement(selector, name).append(
        dimensionSelectTemplate({values: keys, name: name})
      );

      if (i < dimensionNames.length - 1) {
        return dimensions[keys[0]];
      }
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
    return $(selector).find(".variant-dimension").find("." + name);
  };

  var _getPrevDimensionValues = function(selector, name, productDimensions) {
    var index = productDimensions["namesToIndices"][name];
    var prevValues = [];

    for (var i=0; i<index; i++) {
      var val = $(selector).find("select." + productDimensions["dimensionNames"][i]).val();
      prevValues.push(val);
    }

    return prevValues
  };

  var _getProductDimensionList = function(selector, name, productDimensions) {
    var prevDimensionValues = _getPrevDimensionValues(selector, name, productDimensions);
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

    for (var i in variantOptions) {
      var currentDimensions = variantOptions[i]["dimensions"];
      currentDimensions.sort(function(a,b) { return a["name"].localeCompare(b["name"]) });

      for (var j in currentDimensions) {
        if (i == 0) {
          namesToIndices[currentDimensions[j]["name"]] = j;
          dimensionNames.push(currentDimensions[j]["name"]);
        }

        _insertLatestDimension(j, currentDimensions, dimensions);
      }
    };

    return {
      "namesToIndices": namesToIndices,
      "dimensionNames": dimensionNames,
      "dimensions": dimensions
    }
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

  return {
    createProductDropdowns: createProductDropdowns
  };

})();
