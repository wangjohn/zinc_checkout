(function(){

  var zincUrl = "https://dl.dropboxusercontent.com/spa/qjopb1dsqoaxdqh/zinc_checkout/";
  //var zincUrl = "http://localhost:8888/";

  var iframeSource = zincUrl + "modal.html";
  var defaultButtonText = "Checkout";

  var resourceLoading = {
    "jquery": {
      "url": zincUrl + "assets/jquery-1.10.2.min.js",
      "skipLoad": function() {
        return (window.jQuery && window.jQuery && 
          validVersion("1.7", window.jQuery.fn.jquery)
          );
      }
    },
    "bootstrap-js": {
      "url": zincUrl + "assets/bootstrap-modal.js",
      "skipLoad": function() { return false }
    },
    "button-css": {
      "url": zincUrl + "button.css",
      "skipLoad": function() { return false }
    }
  };

  var retailerRegex = /amazon|amzn/;

  var scriptElementId = "zinc-checkout";
  var zincIframeId = "zinc-checkout-iframe";
  var zincModalId = "zinc-checkout-modal";
  var zincModalContentId = "zinc-checkout-modal-content";

  var validVersion = function(targetVersion, versionNumber) {
    var targetVersionSplit = targetVersion.split(".");
    var versionNumberSplit = versionNumber.split(".");

    for (var i=0; i<targetVersionSplit.length; i++) {
      if (i > (versionNumberSplit.length - 1)) {
        return false;
      } else if (versionNumberSplit[i] > targetVersionSplit[i]) {
        return true;
      } else if (versionNumberSplit[i] < targetVersionSplit[i]) {
        return false;
      }
    }
    return true;
  };

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
        if (!$) $ = window.jQuery;
        loadScript(resourceLoading["bootstrap-js"], function() {
          var scriptElement = findScriptElement();
          var modal = createModalElement();

          document.getElementsByTagName('body')[0].appendChild(modal);
          var lastSeenSource = '';

          $(function() {
            retargetAffiliateLinks(scriptElement);
            $("#" + zincModalId).zincModal({
              show: false
            });

            var iframe = document.getElementById(zincIframeId);
            $("#" + zincModalId).on("zinc_modal_event", function(e, data) {
              var source = _variantOptionsRequestSource(data);
              if (source !== lastSeenSource) {
                iframe.setAttribute("src", source);
                lastSeenSource = source;
              }
              $(this).zincModal('show');
            });

            dynamicResizeIFrame();
            listenToIFrameErrors();

            $("body").delegate(".zinc-modal-backdrop", "click", function(e) {
              $("#" + zincModalId).zincModal('hide');
            });
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
    if (scriptElement !== null && scriptElement.getAttribute("zinc-selector")) {
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
    if (data) {
      $("#" + zincModalId).trigger("zinc_modal_event", data);
      return false;
    }
  };

  var _parseVariantRequestData = function(e) {
    var url = e.currentTarget.href;
    // TODO: have a better way of parsing out retailers from the url
    var retailerList = retailerRegex.exec(url);
    if (retailerList === null) {
      return false;
    }

    var retailer;
    if (retailerList[0] === "amzn") {
      retailer = "amazon";
    } else {
      retailer = retailerList[0];
    }

    return {
      "retailer": retailer,
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
      if (match !== null && match.length > 1) {
        resizeModal(match[1]);
      }
    });
  };

  var listenToIFrameErrors = function() {
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    eventer(messageEvent, function(e) {
      if (/zinc-error/.test(e.data)) {
        shakeModal(2);
      }
    });
  };

  var shakeAnimationTime = 130;
  var shakeModal = function(count) {
    if (count > 0) {
      $("#" + zincModalId).animate({'left': '-20px'}, shakeAnimationTime, function() {
        $("#" + zincModalId).animate({'left': '20px'}, shakeAnimationTime, function() {
          shakeModal(count-1);
        });
      });
    } else {
      $("#" + zincModalId).animate({'left': '0px'}, shakeAnimationTime);
    }
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
    modal.className = "zinc-modal fade";
    modal.id = zincModalId;
    modal.setAttribute("tab-index", "-1");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-labelledby", "zinc-checkout-modal-label");
    modal.setAttribute("aria-hidden", "true");

    var modalDialog = document.createElement("div");
    modalDialog.className = "zinc-modal-dialog";

    var modalContent = document.createElement("div");
    modalContent.className = "zinc-modal-content";
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
    iframe.className = "zinc-modal-body";
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
