(function(){

  var iframeSource = "modal.html";
  var defaultButtonText = "Checkout";

  var jqueryUrl = "assets/jquery-1.10.2.min.js";
  var bootstrapJsUrl = "assets/bootstrap.js";
  var buttonCssUrl = "button.css";

  var retailerRegex = /amazon|macys|jcrew/;

  var scriptElementId = "zinc-checkout";
  var zincIframeId = "zinc-checkout-iframe";
  var zincModalId = "zinc-checkout-modal";
  var zincModalContentId = "zinc-checkout-modal-content";

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

          document.body.insertBefore(modal, scriptElement);

          $(function() {
            retargetAffiliateLinks(scriptElement);
            $("#" + zincModalId).modal({
              show: false
            });

            var iframe = document.getElementById(zincIframeId);
            $("#" + zincModalId).on("zinc_modal_event", function(e, data) {
              iframe.contentWindow.$("#content-wrapper").trigger("variant_options_request", data);
              $(this).modal('show');
            });

            $("#" + zincModalId).on("shown.bs.modal", function(e) {
              resizeModal(iframe);
            });

            dynamicResizeIFrame();
          });
        });
      });
    });
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
          retargetToModal(e);
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
    var iframe = document.getElementById(zincIframeId);
    iframe.onload = function() {
      iframe.contentWindow.$("#content-wrapper").on("zinc-resize", function(e, data) {
        resizeModal(data);
      });
    };
  };

  var resizeModal = function(height) {
    if (height) {
      document.getElementById(zincModalContentId).style.height = height;
    }
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
    dismiss.style.margin = "15px 40px 0";
    dismiss.innerHTML = "&times;";

    modalHeader.appendChild(dismiss);
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
