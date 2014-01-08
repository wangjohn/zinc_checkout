var ZincCheckout = (function(){

  var iframeSource = "localhost:8888/modal.html";
  var defaultButtonText = "Checkout";

  var initialize = function(){
    var scriptElement = findScriptElement();
    var iframe = createIFrameElement();
    var button = createButtonElement(defaultButtonText);

    document.body.insertBefore(iframe, scriptElement);
    document.body.insertBefore(button, scriptElement);
  };

  var findScriptElement = function() {
    return document.getElementById("zinc-checkout");
  };

  var _scriptClassNameMatches = function(className) {
    return classNameRegex.test(className);
  };

  var createIFrameElement = function() {
    var iframe = document.createElement("iframe");
    iframe.setAttribute("src", iframeSource);

    // Styling the iframe
    iframe.style.z-index = 9999;
    iframe.style.display = "none";
    iframe.style.background-color = "transparent";
    iframe.style.border = "0px none transparent";
    iframe.style.overflow-x = "hidden";
    iframe.style.overflow-y = "auto";
    iframe.style.visibility = "visible";
    iframe.style.margin = "0px";
    iframe.style.padding = "0px";
    iframe.style.-webkit-tap-highlight-color = "transparent";
    iframe.style.position = "fixed";
    iframe.style.left = "0px";
    iframe.style.top = "0px";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
  };

  var createButtonElement = function(buttonText) {
    var button = document.createElement("button");
    button.className = "zinc-button-el";
    button.setAttribute("type", "submit");
    button.style.visibility = "visible";

    var buttonSpan = document.createElement("span");
    buttonSpan.innerHTML = buttonText;
    button.style.display = "block";
    button.style.min-height = "30px";

    button.appendChild(buttonSpan);
    return button;
  };

  return function() {
    

  };
})();
