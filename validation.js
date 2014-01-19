Validation = (function(){
  var Validators = (function() {
    var emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var required = function(value, fieldName) {
      var isValid = ($.trim(value) === "");
      var message = "The " + fieldName + " field is required"
      return {
        "is_valid": isValid,
        "message": message
      }
    };

    var email = function(value) {
      var email = $.trim(value);
      var isValid = emailRegex.test(email);
      return {
        "is_valid": isValid,
        "message": "Invalid email address"
      }
    };

    var creditCard = function(number, securityCode) {
      var number = $.trim(number).replace(/\D/g, "");
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
      email: email
    }
  })();

  var ValidationErrorHolder = (function() {
    var errorsPayload = [];

    var addError = function(selector, message) {
      var payload = {
        "selector": selector,
        "message": message
      }
      errorsPayload.push(payload);
    };

    var triggerErrorMessage = function() {
      $("body").trigger("zinc_client_validation_error", errorsPayload);
    };

    return {
      addError: addError,
      triggerErrorMessage: triggerErrorMessage
    };
  });

  var validate = function(selectorValidatorMap) {
    var errorHolder = ValidationErrorHolder();
    for (var selector in selectorValidatorMap) {
      if (selectorValidatorMap.hasOwnProperty(selector)) {
        var value = $(selector).val();
        var validatorType = selectorValidatorMap[selector];
        var validatorResults = Validators[validatorType](value);

        if (!(validatorResults["is_valid"])) {
          errorHolder.addError(selector, validatorResults["message"]);
        }
      }
    }
    errorHolder.triggerErrorMessage();
  };

  return {
    validate: validate
  };
})();
