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

  var validate = function(selectorValidatorMap) {
    var errorHolder = ValidationErrorHolder();
    var anyErrors = false;
    for (var selector in selectorValidatorMap) {
      if (selectorValidatorMap.hasOwnProperty(selector)) {
        var validatorType = selectorValidatorMap[selector]["type"];
        var fieldName = selectorValidatorMap[selector]["name"];
        var validatorResults = Validators[validatorType](selector, fieldName);

        if (!(validatorResults["is_valid"])) {
          errorHolder.addError(selector, validatorResults);
          anyErrors = true;
        }
      }
    }
    errorHolder.triggerErrorMessage();
    return anyErrors;
  };

  return {
    validate: validate
  };
})();
