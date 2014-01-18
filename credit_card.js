var CreditCard = (function() {
  var getInputValue = function(e, selector) {
    var inputValue = $.trim($(selector).val());
    inputValue = inputValue + String.fromCharCode(e.keyCode);
    return inputValue.replace(/[^\d]/g, "");
  };

  var reachedMaximumLength = function(e, maximumLength, selector) {
    return getInputValue(e, selector).length > maximumLength;
  };

  // Backspace, delete, tab, escape, enter, ., Ctrl+a, Ctrl+c, Ctrl+v, home, end, left, right
  var isEscapedKeyStroke = function(e) {
    return ( $.inArray(e.keyCode,[46,8,9,27,13,190]) !== -1 ||
      (e.keyCode == 65 && e.ctrlKey === true) || 
      (e.keyCode == 67 && e.ctrlKey === true) || 
      (e.keyCode == 86 && e.ctrlKey === true) || 
      (e.keyCode >= 35 && e.keyCode <= 39));
  };

  var onlyAllowNumeric = function(e, maximumLength, selector) {
    e.preventDefault();
    // Ensure that it is a number and stop the keypress
    if (reachedMaximumLength(e, maximumLength, selector) || e.shiftKey || (e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
      return false;
    }
    return true;
  };

  var isAmericanExpress = function(number) {
    return number.match("^(34|37)");
  };

  var shouldProcessInput = function(e, maximumLength, selector) {
     return (!isEscapedKeyStroke(e)) && onlyAllowNumeric(e, maximumLength, selector);
  };

  var CvvInput = (function() {
    var selector;

    var createCvvInput = function(mainSelector) {
      selector = mainSelector;

      var getMaximumLength(isAmericanExpressCard) {
        if (isAmericanExpressCard) {
          return 4;
        } else {
          return 3;
        }
      };

      $(selector).keydown(function(e) {
        var number = getInputValue(e, selector);
        var isAmericanExpressCard = isAmericanExpress(number);
        var maximumLength = getMaximumLength(isAmericanExpressCard);
        if (shouldProcessInput(e, maximumLength, selector)) {
          $(selector).val(number);
        }
      });
    };

    return {
      createCvvInput: createCvvInput
    };
  })();

  var NumberInput = (function() {
    var selector;
    var americanExpressSpaces = [4, 10, 15];
    var defaultSpaces = [4, 8, 12, 16];

    var getMaximumLength = function(isAmericanExpressCard) {
      if (isAmericanExpressCard) {
        return 15;
      } else {
        return 16;
      }
    };

    var createNumberInput = function(mainSelector) {
      selector = mainSelector;
      $(selector).keydown(function(e) {
        var number = getInputValue(e, selector);
        var isAmericanExpressCard = isAmericanExpress(number);
        var maximumLength = getMaximumLength(isAmericanExpressCard);
        if (shouldProcessInput(e, maximumLength, selector)) {
          var newInput;
          if (isAmericanExpressCard) {
            newInput = addSpaces(number, americanExpressSpaces);
          } else {
            newInput = addSpaces(number, defaultSpaces);
          }

          $(selector).val(newInput);
        }
      });
    };

    var addSpaces = function(number, spaces) {
      console.log(number);
      var parts = []
      var j = 0;
      for (var i=0; i<spaces.length; i++) {
        if (number.length > spaces[i]) {
          parts.push(number.slice(j, spaces[i]));
          j = spaces[i];
        } else {
          if (i < spaces.length) {
            parts.push(number.slice(j, spaces[i]));
          } else {
            parts.push(number.slice(j));
          }
          break;
        }
      }
      console.log(parts);

      if (parts.length > 0) {
        return parts.join(" ");
      } else {
        return number;
      }
    };

    return {
      createNumberInput: createNumberInput
    };
  })();

  var ExpirationInput = (function() {
    var maximumLength = 6;
    var selector;

    var createExpirationInput = function(mainSelector) {
      selector = mainSelector
      $(selector).keydown(function(e) {
        if (shouldProcessInput(e, maximumLength, selector)) {
          var inputValue = getInputValue(e, selector);
          if (inputValue.length >= 2) {
            var newInput = inputValue.slice(0, 2) + " / " + inputValue.slice(2);
            $(selector).val(newInput);
          } else {
            $(selector).val(inputValue);
          }
        }
      });
    };

    return {
      createExpirationInput: createExpirationInput
    };
  })();

  return {
    createExpirationInput: ExpirationInput.createExpirationInput,
    createNumberInput: NumberInput.createNumberInput,
    createCvvInput: createCvvInput
  };

})();
