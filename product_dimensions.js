var createProductDropdowns = function(selector, variantOptions) {
  var productDimensions = _getProductDimensions(variantOptions);
  $(selector).append(
    Handlebars.partials["_variant_option_results"](productDimensions["dimensionNames"])
  );

  // Listeners for the product dimensions
  for (var i in productDimensions["dimensionNames"]) {
    var currentName = productDimensions["dimensionNames"][i];
    _dimensionSelectElement(selector, currentName).change(function() {
      var self = this;
      var productDimensionList = _getProductDimensionList(selector, currentName, productDimensions);
      var html = Handlebars.partials["_variant_options_dimension_select"](productDimensionList);
      _clearSelectionsAfter(selector, currentName, productDimensions);
      self.html(html);
    });
  }
};

var _clearSelectionsAfter = function(selector, name, productDimensions) {
  var index = productDimensions["namesToIndices"][name];
  var dimensionsToClear = [];
  for (var i=index+1; i<productDimensions["dimensionNames"].length, i++) {
    var currentName = productDimensions["dimensionNames"][i];
    _dimensionSelectElement(selector, currentName).html();
  }
};

var _dimensionSelectElement = function(selector, name) {
  return $(selector).find("." + name);
};

var _getPrevDimensionValues = function(selector, name, dimensionNames) {
  var count = 0;
  var prevValues = [];

  while (count < dimensionNames.length && dimensionNames[count] != name) {
    count += 1;
    var val = _dimensionSelectElement(selector, dimensionNames[count]).val();
    prevValues.push(val);
  }

  return prevValues
};

var _getProductDimensionList = function(selector, name, productDimensions) {
  var prevDimensionValues = _getPrevDimensionValues(selector, name productDimensions["dimensionNames"]);
  var dimenHash = productDimensions["dimensions"];
  for (var i in prevDimensionValues) {
    dimenHash = dimenHash[prevDimensionValues[i]];
  }

  var result = [];
  for (var property in dimenHash) {
    if (dimenHash.hasOwnProperty(property)) {
      result.push(property);
    }
  }
  return result;
};

var _getProductDimensions = function(variantOptions) {
  var dimensionNames = {};
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
