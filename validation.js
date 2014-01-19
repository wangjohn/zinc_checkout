Validation = (function(){
  var Validators = (function() {
    var emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    var required = function(selector, fieldName) {
      var value = $(selector).val()
      var isValid = ($.trim(value) === "");
      var message = "The " + fieldName + " field is required"
      return {
        "is_valid": isValid,
        "message": message
      }
    };

    var multipleRequired = function(selector) {
      var invalidSelectors = []
      $(selector).each(function(index, element) {
        var isValid = ($.trim($(element).val()) === "");
        if (!isValid) {
          invalidSelectors.push(element);
        }
      });

      return {
        "is_valid": (invalidSelectors.length === 0),
        "message": "Please select a product",
        "selectors": invalidSelectors
      }
    };

    var email = function(selector) {
      var value = $(selector).val()
      var email = $.trim(value);
      var isValid = emailRegex.test(email);
      return {
        "is_valid": isValid,
        "message": "Invalid email address"
      }
    };

    var creditCard = function(selector) {
      var number = $(selector).find("input.credit-card-number");
      var number = $.trim(number).replace(/\D/g, "");
      var securityCode = $(selector).find("input.security-code");
      var securityCode = $.trim(securityCode).replace(/\D/g, "");
      var message, isValid, errorType;

      if (isValidCreditCardNumber(number)) {
        if (isAmericanExpres(number)) {
          isValid = (securityCode.length == 4);
        } else {
          isValid = (securityCode.length == 3);
        }
        if (!isValid) {
          message = "Invalid security code";
        }
      } else {
        message = "Invalid credit card number";
      }

      return {
        "is_valid": isValid,
        "message": message
      };
    };

    var isAmericanExpress = function(number) {
      return (number.length == 15);
    }

    // Luhn Algorithm.
    var isValidCreditCardNumber = function(value) {
      // accept only digits, dashes or spaces
      if (/[^0-9-\s]+/.test(value)) return false;

      var nCheck = 0, nDigit = 0, bEven = false;
      for (var n = value.length - 1; n >= 0; n--) {
        var cDigit = value.charAt(n);
        var nDigit = parseInt(cDigit, 10);
        if (bEven) {
          if ((nDigit *= 2) > 9) nDigit -= 9;
        }
        nCheck += nDigit;
        bEven = !bEven;
      }
      return (nCheck % 10) == 0;
    }

    return {
      required: required,
      creditCard: creditCard,
      multipleRequired: multipleRequired,
      email: email
    }
  })();

  var ValidationErrorHolder = (function() {
    var errorMessages = [];
    var selectors = [];

    var addError = function(selector, validatorResults) {
      if (validatorResults.hasOwnProperty("selectors")) {
        selectors = selectors.concat(validatorResults["selectors"]);
      } else {
        selectors.push(selector)
      }

      errorMessages.push(validatorResults["message"]);
    };

    var triggerErrorMessage = function() {
      var errorsPayload = {
        "selectors": selectors,
        "messages": errorMessages
      };
      $("body").trigger("zinc_client_validation_error", errorsPayload);
    };

    return {
      addError: addError,
      triggerErrorMessage: triggerErrorMessage
    };
  });

  var ValidationOutputHolder = (function() {
    var output = {};

    var addOutput = function(outputName, value) {
      var outputParts = outputName.split(".");
      var currentPart = output;
      for (var i=0; i<outputParts.length; i++) {
        if (!output.hasOwnProperty(outputParts[i])) {
          currentPart[outputParts[i]] = {};
        }

        // Either place the value into the output, or continue going down the
        // search space.
        if (i === outputParts.length-1) {
          currentPart[outputParts[i]] = value
        } else {
          currentPart = currentPart[outputParts[i]];
        }
      }
    };

    var getOutput = function() {
      return output;
    };

    return {
      addOutput: addOutput,
      getOuput: getOuput
    }
  });

  var validate = function(selectorValidatorMap) {
    var errorHolder = ValidationErrorHolder();
    var outputHolder = ValidationOuputHolder();
    var anyErrors = false;
    for (var selector in selectorValidatorMap) {
      if (selectorValidatorMap.hasOwnProperty(selector)) {
        var currentMapping = selectorValidatorMap[selector];
        var validatorType = currentMapping["type"];
        var fieldName = currentMapping["name"];
        var validatorResults = Validators[validatorType](selector, fieldName);

        if (validatorResults["is_valid"]) {
          outputHolder.addOutput(currentMapping["output_name"], validatorResults["output_value"]);
        } else {
          errorHolder.addError(selector, validatorResults);
          anyErrors = true;
        }
      }
    }

    if (anyErrors) {
      errorHolder.triggerErrorMessage();
      return false;
    } else {
      return outputHolder.getOutput();
    }
  };

  return {
    validate: validate
  };
})();

  var validateShippingMethodsForm = function() {
    var selectorValidatorTypeMap = {
      "#shipping-methods-form input.first-name": {
        "type": "required",
        "name": "first name",
        "output_name": "shipping_methods.first_name",
      },
      "#shipping-methods-form input.last-name": {
        "type": "required",
        "name": "last name",
        "output_name": "shipping_methods.last_name",
      },
      "#shipping-methods-form input.address-line1": {
        "type": "required",
        "name": "address",
        "output_name": "shipping_methods.address_line1",
      },
      "#shipping-methods-form input.address-line1": {
        "type": "none",
        "name": "address",
        "output_name": "shipping_methods.address_line2",
      },
      "#shipping-methods-form input.city": {
        "type": "required",
        "name": "city",
        "output_name": "shipping_methods.city",
      },
      "#shipping-methods-form input.state": {
        "type": "required",
        "name": "state",
        "output_name": "shipping_methods.state",
      },
      "#shipping-methods-form input.zip-code": {
        "type": "required",
        "name": "zip code",
        "output_name": "shipping_methods.zip_code",
      },
      "#shipping-methods-form select.dimension-values": {
        "type": "multipleRequired",
        "name": "product variants",
        "output_name": "products",
      },
    }
    return Validation.validate(selectorValidatorTypeMap);
  };

