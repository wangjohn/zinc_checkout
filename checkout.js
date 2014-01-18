(function(){

  var zincUrl = "http://localhost:8888/"

  var iframeSource = zincUrl + "modal.html";
  var defaultButtonText = "Checkout";

  var resourceLoading = {
    "jquery": {
      "url": zincUrl + "assets/jquery-1.10.2.min.js",
      "skipLoad": function() {
        return (window.jQuery);
      }
    },
    "bootstrap-js": {
      "url": zincUrl + "assets/bootstrap.js",
      "skipLoad": function() {
        return (typeof $().modal == 'function');
      }
    },
    "button-css": {
      "url": zincUrl + "button.css",
      "skipLoad": function() { false }
    }
  };

  var retailerRegex = /amazon|macys|jcrew/;

  var scriptElementId = "zinc-checkout";
  var zincIframeId = "zinc-checkout-iframe";
  var zincModalId = "zinc-checkout-modal";
  var zincModalContentId = "zinc-checkout-modal-content";

  var loadScript = function(scriptData, callback) {
    var url = scriptData["url"];
    var skipLoad = scriptData["skipLoad"];

    if (skipLoad()) {
      callback();
    } else {
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
    }
  };

  var initialize = function(){
    loadScript(resourceLoading["button-css"], function() {
      loadScript(resourceLoading["jquery"], function() {
        loadScript(resourceLoading["bootstrap-js"], function() {
          var scriptElement = findScriptElement();
          var modal = createModalElement();

          document.getElementsByTagName('body')[0].appendChild(modal);

          $(function() {
            retargetAffiliateLinks(scriptElement);
            $("#" + zincModalId).modal({
              show: false
            });

            var iframe = document.getElementById(zincIframeId);
            $("#" + zincModalId).on("zinc_modal_event", function(e, data) {
              iframe.setAttribute("src", _variantOptionsRequestSource(data));
              $(this).modal('show');
            });

            dynamicResizeIFrame();
          });
        });
      });
    });
  };

  var _variantOptionsRequestSource = function(data) {
    var queryStringArray = [
      encodeURIComponent("product_url") + "=" + encodeURIComponent(data["product_url"]),
      encodeURIComponent("retailer") + "=" + encodeURIComponent(data["retailer"])
    ];
    var queryString = queryStringArray.join("&");

    return (iframeSource + "?" + queryString);
  };

  var retargetAffiliateLinks = function(scriptElement) {
    if (scriptElement.getAttribute("zinc-selector")) {
      // If the user specified a selector to use, we should use it.
      var selector = scriptElement.getAttribute("zinc-selector");
      $("body").on("click", selector, retargetToModal);
    } else {
      // Otherwise, we're going to go look for things that look like affiliate links.
      $("body").on("click", "a", function(e) {
        if (retailerRegex.test(e.currentTarget.href)) {
          return retargetToModal(e);
        }
      });
    }
  };

  var retargetToModal = function(e) {
    var data = _parseVariantRequestData(e);
    $("#" + zincModalId).trigger("zinc_modal_event", data);
    return false;
  };

  var _parseVariantRequestData = function(e) {
    var url = e.currentTarget.href;
    // TODO: have a better way of parsing out retailers from the url
    var retailerList = retailerRegex.exec(url);

    return {
      "retailer": retailerList[0],
      "product_url": url
    };
  };

  var dynamicResizeIFrame = function() {
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    // Listen to message from child window
    eventer(messageEvent, function(e) {
      var match = /zinc-resize-height=(.*)/.exec(e.data);
      if (match.length > 1) {
        console.log(match[1]);
        resizeModal(match[1]);
      }
    });
  };

  var resizeModal = function(height) {
    $("#" + zincModalContentId).height(height);
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
    modal.id = zincModalId;
    modal.setAttribute("tab-index", "-1");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-labelledby", "zinc-checkout-modal-label");
    modal.setAttribute("aria-hidden", "true");

    var modalDialog = document.createElement("div");
    modalDialog.className = "modal-dialog";

    var modalContent = document.createElement("div");
    modalContent.className = "modal-content";
    modalContent.id = zincModalContentId;

    modalContent.appendChild(createModalHeader());
    modalContent.appendChild(createIFrameElement());
    modalDialog.appendChild(modalContent);
    modal.appendChild(modalDialog);

    return modal;
  };

  var createModalHeader = function() {
    var modalHeader = document.createElement("div");
    return modalHeader;
  };

  var createIFrameElement = function() {
    var iframe = document.createElement("iframe");
    iframe.className = "modal-body";
    iframe.id = zincIframeId;
    iframe.setAttribute("src", iframeSource);

    // Styling the iframe
    iframe.style.border = "0px none transparent";
    iframe.style.padding = "0px";
    iframe.style.position = "relative";
    iframe.style.width = "100%";
    iframe.style.height = "100%";

    return iframe;
  };

  initialize();
})();
