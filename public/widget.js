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
  // currentScript es null cuando el anfitrión inyecta el script (GTM, un
  // CMS): caer al último tag que apunte a este archivo.
  var script = document.currentScript;
  if (!script) {
    var tags = document.querySelectorAll('script[src*="widget.js"]');
    script = tags[tags.length - 1];
  }
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

  // Si el script terminó en el <head> (React y algunos gestores de tags
  // lo mueven ahí), un iframe al lado no se ve: va al body.
  var destino = script.parentNode;
  if (!destino || destino === document.head) {
    document.body.appendChild(iframe);
  } else {
    destino.insertBefore(iframe, script);
  }
})();
