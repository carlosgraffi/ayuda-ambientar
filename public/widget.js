/**
 * Widget embebible de ayuda.ambient.ar.
 *
 *   <script src="https://ayuda.ambient.ar/widget.js"
 *           data-event="incendio-comarca-2026" data-province="Chubut"></script>
 *
 * Crea un iframe con el listado. La atribución vive DENTRO del iframe:
 * el sitio anfitrión no puede taparla ni configurarla — es el trato de
 * usar los datos.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var origen = new URL(script.src).origin;
  var params = new URLSearchParams();
  if (script.dataset.event) params.set("event", script.dataset.event);
  if (script.dataset.province) params.set("province", script.dataset.province);

  var iframe = document.createElement("iframe");
  iframe.src = origen + "/widget/?" + params.toString();
  iframe.title = "Dónde donar — ayuda.ambient.ar";
  iframe.style.cssText =
    "width:100%;border:0;border-radius:16px;min-height:420px;display:block";
  iframe.loading = "lazy";

  // El iframe reporta su altura para que no haya doble scroll.
  window.addEventListener("message", function (e) {
    if (e.origin === origen && e.data && e.data.ayudaWidgetHeight) {
      iframe.style.height = e.data.ayudaWidgetHeight + "px";
    }
  });

  script.parentNode.insertBefore(iframe, script);
})();
