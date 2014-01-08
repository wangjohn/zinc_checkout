(function(){

  var iframeSource = "modal.html";
  var scriptElementId = "zinc-checkout";
  var defaultButtonText = "Checkout";

  var jqueryUrl = "assets/jquery-1.10.2.min.js";
  var bootstrapJsUrl = "assets/bootstrap.js";
  var buttonCssUrl = "button.css";

  var loadScript = function(url, callback) {
    if (/.css/.test(url)) {
      script = document.createElement('link');
      script.rel = "stylesheet";
      script.type = "text/css";
      script.href = url;
    } else {
      var script = document.createElement('script');
      script.src = url;
    }
    script.async = true;

    var entry = document.getElementsByTagName('script')[0];
    entry.parentNode.insertBefore(script, entry);

    script.onload = script.onreadstatechange = function() {
      var rdyState = script.readyState;

      if (!rdyState || /complete|loaded/.test(script.readyState)) {
        callback();

        script.onload = null;
        script.onreadystatechange = null;
      }
    };
  };

  var initialize = function(){
    loadScript(buttonCssUrl, function() {
      loadScript(jqueryUrl, function() {
        loadScript(bootstrapJsUrl, function() {
          var scriptElement = findScriptElement();
          var modal = createModalElement();
          var button = createButtonElement(defaultButtonText);

          document.body.insertBefore(button, scriptElement);
          document.body.insertBefore(modal, scriptElement);

          $(function() {
            $("#zinc-checkout-modal").modal({
              show: false
            });
          });
        });
      });
    });
  };

  var findScriptElement = function() {
    return document.getElementById(scriptElementId);
  };

  var _scriptClassNameMatches = function(className) {
    return classNameRegex.test(className);
  };

  var createModalElement = function() {
    var modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "zinc-checkout-modal";
    modal.setAttribute("tab-index", "-1");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-labelledby", "zinc-checkout-modal-label");
    modal.setAttribute("aria-hidden", "true");

    var modalDialog = document.createElement("div");
    modalDialog.className = "modal-dialog";

    var modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    modalContent.appendChild(createModalHeader());
    modalContent.appendChild(createIFrameElement());
    modalDialog.appendChild(modalContent);
    modal.appendChild(modalDialog);

    return modal;
  };

  var createModalHeader = function() {
    var modalHeader = document.createElement("div");
    modalHeader.className = "checkout-dismiss";
    modalHeader.style.height = "0px";
    modalHeader.style.width = "0px";
    modalHeader.style.float = "right";

    var dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "close";
    dismiss.setAttribute("data-dismiss", "modal");
    dismiss.setAttribute("aria-hidden", "true");
    dismiss.style.position = "relative";
    dismiss.style.zIndex = "1";
    dismiss.style.margin = "25px 40px 0";
    dismiss.innerHTML = "&times;";

    modalHeader.appendChild(dismiss);
    return modalHeader;
  };

  var createIFrameElement = function() {
    var iframe = document.createElement("iframe");
    iframe.className = "modal-body";
    iframe.setAttribute("src", iframeSource);

    // Styling the iframe
    iframe.style.border = "0px none transparent";
    iframe.style.padding = "0px";
    iframe.style.position = "relative";
    iframe.style.width = "100%";
    iframe.style.height = "80%";

    return iframe;
  };

  var createButtonElement = function(buttonText) {
    var button = document.createElement("button");
    button.className = "zinc-button-el";
    button.setAttribute("data-toggle", "modal");
    button.setAttribute("data-target", "#zinc-checkout-modal");
    button.style.visibility = "visible";

    var buttonSpan = document.createElement("span");
    buttonSpan.innerHTML = buttonText;
    button.style.display = "block";
    button.style.minHeight = "30px";

    button.appendChild(buttonSpan);
    return button;
  };

  initialize();
  return function() {
    console.log("Asdf");
    initialize()
  };
})();
