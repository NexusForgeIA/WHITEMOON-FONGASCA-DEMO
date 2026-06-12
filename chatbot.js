/*
 * Fon — asistente guiado de FONGASCA S.L.
 * Widget de captación de leads para la demo de servicio técnico
 * (gas, fontanería y calefacción en Majadahonda y Madrid).
 *
 * Al completar el flujo inserta el lead en Supabase (tabla leads_web)
 * usando la clave publishable (RLS: "Allow anonymous inserts").
 *
 * Sin dependencias. Se autoinyecta estilos y DOM.
 */
(function () {
  "use strict";
  if (window.__fonChatLoaded) return;
  window.__fonChatLoaded = true;

  /* ---------- Config ---------- */
  var SUPABASE_URL = "https://mlaqtniujnvfxcvcourm.supabase.co";
  var SUPABASE_KEY = "sb_publishable_6no6BuOgiA_2nonTJntAuQ_DTqEgrcV";
  var LEADS_TABLE = "leads_web";

  var ACCENT = "#E8742A";
  var URGENCIA_TEL = "916 395 206";

  /* ---------- Flujo de servicios ---------- */
  var SERVICES = {
    Gas: ["Avería / fuga", "Instalación nueva", "Certificación / boletín"],
    "Fontanería": ["Avería urgente", "Instalación", "Reforma baño / cocina"],
    "Calefacción": ["Avería caldera", "Instalación nueva", "Mantenimiento anual"]
  };
  var ZONAS = ["Majadahonda", "Las Rozas", "Boadilla", "Pozuelo", "Aravaca", "Otro Madrid"];

  /* ---------- Estado ---------- */
  var state = { flow: "", servicio: "", tipo: "", zona: "", nombre: "", telefono: "" };
  var els = {};

  /* ---------- Estilos ---------- */
  var css = "" +
    ".fon-fab{position:fixed;right:clamp(16px,3vw,28px);bottom:clamp(16px,3vw,28px);z-index:2147483000;" +
      "width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;" +
      "background:" + ACCENT + ";color:#160a02;box-shadow:0 14px 34px rgba(0,0,0,.5),0 0 0 6px rgba(232,116,42,.16);" +
      "transition:transform .15s ease}" +
    ".fon-fab:hover{transform:translateY(-2px)}" +
    ".fon-fab:active{transform:scale(.95)}" +
    ".fon-fab svg{width:28px;height:28px}" +
    ".fon-fab .fon-dot{position:absolute;top:-3px;right:-3px;width:16px;height:16px;border-radius:50%;background:#1f8f3a;border:2px solid #0d0d0d}" +
    ".fon-fab[aria-expanded=true]{transform:scale(.9);opacity:.85}" +

    ".fon-panel{position:fixed;right:clamp(16px,3vw,28px);bottom:calc(clamp(16px,3vw,28px) + 74px);z-index:2147483000;" +
      "width:min(380px,calc(100vw - 32px));height:min(580px,calc(100vh - 120px));" +
      "background:#0d0d0d;border:1px solid #2a2a2a;border-radius:18px;overflow:hidden;display:none;flex-direction:column;" +
      "font-family:'Sora',system-ui,-apple-system,sans-serif;color:#F5F5F5;" +
      "box-shadow:0 24px 60px rgba(0,0,0,.6);opacity:0;transform:translateY(14px) scale(.98);" +
      "transition:opacity .22s cubic-bezier(.2,.7,.2,1),transform .22s cubic-bezier(.2,.7,.2,1)}" +
    ".fon-panel.open{display:flex}" +
    ".fon-panel.in{opacity:1;transform:none}" +

    ".fon-head{display:flex;align-items:center;gap:12px;padding:16px 16px;background:#161616;border-bottom:1px solid #2a2a2a;flex:none}" +
    ".fon-ava{width:42px;height:42px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;" +
      "background:" + ACCENT + ";color:#160a02}" +
    ".fon-ava svg{width:22px;height:22px}" +
    ".fon-htxt b{display:block;font-size:15px;font-weight:700;letter-spacing:-.01em}" +
    ".fon-htxt span{display:flex;align-items:center;gap:6px;font-size:12px;color:#9a9a9a;margin-top:2px}" +
    ".fon-htxt span::before{content:'';width:7px;height:7px;border-radius:50%;background:#1f8f3a}" +
    ".fon-x{margin-left:auto;background:none;border:0;color:#9a9a9a;cursor:pointer;width:34px;height:34px;border-radius:9px;" +
      "display:flex;align-items:center;justify-content:center;transition:color .2s,background .2s}" +
    ".fon-x:hover{color:#F5F5F5;background:#1d1d1d}" +
    ".fon-x svg{width:20px;height:20px}" +

    ".fon-body{flex:1;overflow-y:auto;padding:18px 16px 8px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}" +
    ".fon-body::-webkit-scrollbar{width:8px}.fon-body::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:8px}" +

    ".fon-row{display:flex;gap:9px;align-items:flex-end;max-width:88%}" +
    ".fon-row.bot{align-self:flex-start}" +
    ".fon-row.user{align-self:flex-end;flex-direction:row-reverse}" +
    ".fon-mini{width:26px;height:26px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;" +
      "background:" + ACCENT + ";color:#160a02}" +
    ".fon-mini svg{width:15px;height:15px}" +
    ".fon-bub{padding:11px 14px;border-radius:14px;font-size:14.5px;line-height:1.5;border:1px solid transparent;text-wrap:pretty}" +
    ".fon-row.bot .fon-bub{background:#161616;border-color:#2a2a2a;border-bottom-left-radius:5px}" +
    ".fon-row.user .fon-bub{background:" + ACCENT + ";color:#160a02;font-weight:600;border-bottom-right-radius:5px}" +

    ".fon-opts{display:flex;flex-wrap:wrap;gap:9px;align-self:flex-start;max-width:96%;padding-left:35px;margin-top:-2px}" +
    ".fon-chip{background:#161616;border:1px solid #3a3a3a;color:#F5F5F5;font-family:inherit;font-size:14px;font-weight:500;" +
      "padding:10px 15px;border-radius:11px;cursor:pointer;min-height:42px;transition:border-color .18s,background .18s,transform .12s}" +
    ".fon-chip:hover{border-color:" + ACCENT + ";background:#1d1d1d}" +
    ".fon-chip:active{transform:scale(.97)}" +
    ".fon-chip.urg{border-color:" + ACCENT + ";color:" + ACCENT + ";font-weight:600}" +

    ".fon-foot{flex:none;border-top:1px solid #2a2a2a;padding:12px;background:#0d0d0d}" +
    ".fon-form{display:flex;gap:9px}" +
    ".fon-input{flex:1;background:#1d1d1d;border:1px solid #3a3a3a;color:#F5F5F5;border-radius:11px;padding:12px 14px;" +
      "font-family:inherit;font-size:15px;min-height:46px}" +
    ".fon-input::placeholder{color:#6f6f6f}" +
    ".fon-input:focus{outline:none;border-color:" + ACCENT + "}" +
    ".fon-send{flex:none;width:46px;height:46px;border-radius:11px;border:0;cursor:pointer;background:" + ACCENT + ";color:#160a02;" +
      "display:flex;align-items:center;justify-content:center;transition:transform .12s}" +
    ".fon-send:hover{transform:translateY(-1px)}.fon-send:active{transform:scale(.95)}" +
    ".fon-send svg{width:20px;height:20px}" +
    ".fon-err{color:#f0945a;font-size:12.5px;padding:6px 4px 0}" +
    ".fon-foot-note{text-align:center;font-size:11px;color:#6f6f6f;padding-top:9px}" +
    ".fon-cta{display:inline-flex;align-items:center;gap:8px;background:" + ACCENT + ";color:#160a02;font-weight:600;font-size:14px;" +
      "text-decoration:none;padding:11px 16px;border-radius:11px;align-self:flex-start;margin-left:35px}" +
    ".fon-cta svg{width:17px;height:17px}" +

    ".fon-typing{display:flex;gap:4px;padding:13px 14px}" +
    ".fon-typing i{width:7px;height:7px;border-radius:50%;background:#6f6f6f;animation:fon-bounce 1.2s infinite ease-in-out}" +
    ".fon-typing i:nth-child(2){animation-delay:.15s}.fon-typing i:nth-child(3){animation-delay:.3s}" +
    "@keyframes fon-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}" +

    "@media (prefers-reduced-motion: reduce){" +
      ".fon-panel,.fon-fab,.fon-chip,.fon-send{transition:none}" +
      ".fon-typing i{animation:none}.fon-body{scroll-behavior:auto}}" +
    "@media (max-width:600px){.fon-panel{right:8px;left:8px;width:auto;bottom:84px;height:min(70vh,560px)}}";

  /* ---------- Iconos ---------- */
  var WRENCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z"/></svg>';
  var CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  var PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

  /* ---------- Construcción del DOM ---------- */
  function build() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var fab = document.createElement("button");
    fab.className = "fon-fab";
    fab.id = "fon-toggle";
    fab.setAttribute("aria-label", "Abrir chat con Fon, asistente de FONGASCA");
    fab.setAttribute("aria-expanded", "false");
    fab.innerHTML = WRENCH + '<span class="fon-dot" aria-hidden="true"></span>';

    var panel = document.createElement("div");
    panel.className = "fon-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Chat con Fon, asistente de FONGASCA");
    panel.innerHTML =
      '<div class="fon-head">' +
        '<div class="fon-ava">' + WRENCH + '</div>' +
        '<div class="fon-htxt"><b>Fon</b><span>Asistente · FONGASCA</span></div>' +
        '<button class="fon-x" aria-label="Cerrar chat">' + CLOSE + '</button>' +
      '</div>' +
      '<div class="fon-body" id="fon-body" aria-live="polite"></div>' +
      '<div class="fon-foot" id="fon-foot" style="display:none">' +
        '<form class="fon-form" id="fon-form" autocomplete="on">' +
          '<input class="fon-input" id="fon-input" type="text" autocomplete="name">' +
          '<button class="fon-send" type="submit" aria-label="Enviar">' + SEND + '</button>' +
        '</form>' +
        '<div class="fon-err" id="fon-err" style="display:none"></div>' +
        '<div class="fon-foot-note">Demo · tus datos llegan al equipo de FONGASCA</div>' +
      '</div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    els.fab = fab;
    els.panel = panel;
    els.body = panel.querySelector("#fon-body");
    els.foot = panel.querySelector("#fon-foot");
    els.form = panel.querySelector("#fon-form");
    els.input = panel.querySelector("#fon-input");
    els.err = panel.querySelector("#fon-err");

    fab.addEventListener("click", toggle);
    panel.querySelector(".fon-x").addEventListener("click", close);
    els.form.addEventListener("submit", onSubmit);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("open")) close();
    });
  }

  /* ---------- Abrir / cerrar ---------- */
  var opened = false;
  function toggle() { panel().classList.contains("open") ? close() : open(); }
  function panel() { return els.panel; }

  function open() {
    els.panel.classList.add("open");
    els.fab.setAttribute("aria-expanded", "true");
    requestAnimationFrame(function () { els.panel.classList.add("in"); });
    if (!opened) { opened = true; startFlow(); }
  }
  function close() {
    els.panel.classList.remove("in");
    els.fab.setAttribute("aria-expanded", "false");
    setTimeout(function () { els.panel.classList.remove("open"); }, 220);
  }

  /* ---------- Render helpers ---------- */
  function scroll() { els.body.scrollTop = els.body.scrollHeight; }

  function botMsg(text, cb) {
    var typing = document.createElement("div");
    typing.className = "fon-row bot";
    typing.innerHTML = '<div class="fon-mini">' + WRENCH + '</div><div class="fon-bub"><div class="fon-typing"><i></i><i></i><i></i></div></div>';
    els.body.appendChild(typing);
    scroll();
    var delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 480;
    setTimeout(function () {
      typing.querySelector(".fon-bub").innerHTML = "";
      typing.querySelector(".fon-bub").textContent = text;
      scroll();
      if (cb) cb();
    }, delay);
  }

  function userMsg(text) {
    var row = document.createElement("div");
    row.className = "fon-row user";
    row.innerHTML = '<div class="fon-bub"></div>';
    row.querySelector(".fon-bub").textContent = text;
    els.body.appendChild(row);
    scroll();
  }

  function options(list, onPick, urgentLabel) {
    var wrap = document.createElement("div");
    wrap.className = "fon-opts";
    list.forEach(function (label) {
      var b = document.createElement("button");
      b.className = "fon-chip" + (label === urgentLabel ? " urg" : "");
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", function () {
        wrap.remove();
        userMsg(label);
        onPick(label);
      });
      wrap.appendChild(b);
    });
    els.body.appendChild(wrap);
    scroll();
    return wrap;
  }

  function showInput(placeholder, type, autocomplete) {
    els.foot.style.display = "block";
    els.input.value = "";
    els.input.placeholder = placeholder;
    els.input.type = type || "text";
    els.input.inputMode = type === "tel" ? "tel" : "text";
    els.input.setAttribute("autocomplete", autocomplete || "off");
    hideErr();
    setTimeout(function () { els.input.focus(); }, 60);
  }
  function hideInput() { els.foot.style.display = "none"; }
  function showErr(msg) { els.err.textContent = msg; els.err.style.display = "block"; }
  function hideErr() { els.err.style.display = "none"; }

  /* ---------- Máquina de estados ---------- */
  var step = "";

  function startFlow() {
    botMsg("Hola, soy Fon 👋 ¿En qué puedo ayudarte?", function () {
      step = "flow";
      options(["Gas", "Fontanería", "Calefacción", "Urgencia"], pickFlow, "Urgencia");
    });
  }

  function pickFlow(flow) {
    state.flow = flow;
    if (flow === "Urgencia") {
      state.tipo = "Urgencia";
      botMsg("Entendido, es una urgencia. Vamos rápido.", askZona);
      return;
    }
    botMsg("¿Qué necesitas?", function () {
      step = "servicio";
      options(SERVICES[flow], pickServicio);
    });
  }

  function pickServicio(servicio) {
    state.servicio = servicio;
    state.tipo = state.flow + " · " + servicio;
    askZona();
  }

  function askZona() {
    botMsg("¿En qué zona estás?", function () {
      step = "zona";
      options(ZONAS, pickZona);
    });
  }

  function pickZona(zona) {
    state.zona = zona;
    botMsg("¿Cuál es tu nombre?", function () {
      step = "nombre";
      showInput("Escribe tu nombre", "text", "name");
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    var val = els.input.value.trim();
    if (step === "nombre") {
      if (val.length < 2) { showErr("Dime tu nombre, por favor."); return; }
      state.nombre = val;
      userMsg(val);
      hideInput();
      botMsg("¿Y tu teléfono?", function () {
        step = "telefono";
        showInput("6XX XXX XXX", "tel", "tel");
      });
    } else if (step === "telefono") {
      var digits = val.replace(/\s+/g, "");
      if (!/^[6789]\d{8}$/.test(digits)) {
        showErr("Necesito un teléfono válido de 9 dígitos.");
        return;
      }
      state.telefono = digits;
      userMsg(val);
      hideInput();
      finish();
    }
  }

  function finish() {
    step = "done";
    saveLead();
    botMsg(
      "Perfecto " + state.nombre + ", te llamamos en breve. Urgencias: " + URGENCIA_TEL,
      function () {
        var a = document.createElement("a");
        a.className = "fon-cta";
        a.href = "tel:+34916395206";
        a.innerHTML = PHONE + "Llamar a urgencias ahora";
        els.body.appendChild(a);
        scroll();
      }
    );
  }

  /* ---------- Supabase ---------- */
  function saveLead() {
    var payload = {
      nombre: state.nombre,
      telefono: state.telefono,
      sector: "servicio-tecnico",
      interes: state.tipo,
      mensaje: "Servicio: " + state.tipo + " · Zona: " + state.zona,
      origen: "fongasca-demo"
    };
    try {
      fetch(SUPABASE_URL + "/rest/v1/" + LEADS_TABLE, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok) console.warn("[Fon] No se pudo guardar el lead:", r.status);
      }).catch(function (err) {
        console.warn("[Fon] Error de red al guardar el lead:", err);
      });
    } catch (err) {
      console.warn("[Fon] Excepción al guardar el lead:", err);
    }
  }

  /* ---------- Init ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
