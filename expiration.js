var ExpirationInput = (function() {
  var maximumLength = 6;
  var reachedMaximumLength = false;
  var selector;

  var createExpirationInput = function(mainSelector) {
    selector = mainSelector
    $(selector).keydown(function(e) {
      if ((!isEscapedKeyStroke(e)) && onlyAllowNumeric(e)) {
        var inputValue = getInputValue(e);
        if (inputValue.length >= 2) {
          var newInput = inputValue.slice(0, 2) + " / " + inputValue.slice(2);
          $(selector).val(newInput);
        } else {
          $(selector).val(inputValue);
        }
      }
    });
  };

  var getInputValue = function(e) {
    var inputValue = $.trim($(selector).val());
    inputValue = inputValue + String.fromCharCode(e.keyCode);
    return inputValue.replace(/[^\d]/g, "");
  };

  var reachedMaximumLength = function(e) {
    return getInputValue(e).length > maximumLength;
  };

  // Backspace, delete, tab, escape, enter, ., Ctrl+A, home, end, left, right
  var isEscapedKeyStroke = function(e) {
    return ( $.inArray(e.keyCode,[46,8,9,27,13,190]) !== -1 ||
      (e.keyCode == 65 && e.ctrlKey === true) || 
      (e.keyCode >= 35 && e.keyCode <= 39));
  };

  var onlyAllowNumeric = function(e) {
    e.preventDefault();
    // Ensure that it is a number and stop the keypress
    if (reachedMaximumLength(e) || e.shiftKey || (e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
      return false;
    }
    return true;
  };

  return {
    createExpirationInput: createExpirationInput
  };
})();
