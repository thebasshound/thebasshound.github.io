(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lang = document.documentElement.lang === "en" ? "en" : "es";
  const D = (window.DATA || {})[lang] || {}, UI = D.ui || {}, CFG = window.CONFIG || {};
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  async function copy(text, btn) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {}
    if (!ok) { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand("copy"); } catch {} ta.remove(); }
    if (btn) { const old = btn.textContent; btn.textContent = ok ? UI.copied : UI.copyFail; setTimeout(() => (btn.textContent = old), 1600); }
  }

  // tema
  const root = document.documentElement, saved = store.get("tema");
  if (saved) root.dataset.theme = saved;
  $("#theme")?.addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : !matchMedia("(prefers-color-scheme: light)").matches;
    root.dataset.theme = dark ? "light" : "dark"; store.set("tema", root.dataset.theme);
  });

  // encuesta y analítica (assets/config.js)
  $$("[data-survey]").forEach((a) => { if (CFG.encuesta) a.href = CFG.encuesta; else { a.removeAttribute("href"); a.setAttribute("aria-disabled", "true"); a.classList.add("off"); a.textContent = UI.surveySoon; } });
  if (CFG.goatcounter) { const s = document.createElement("script"); s.async = true; s.src = "https://gc.zgo.at/count.js"; s.dataset.goatcounter = "https://" + CFG.goatcounter + ".goatcounter.com/count"; document.head.appendChild(s); }

  // inicio: línea de comando
  const typed = $("#typed");
  if (typed) { const cmd = typed.dataset.cmd; if (reduce) typed.textContent = cmd; else { let i = 0; const t = setInterval(() => { typed.textContent = cmd.slice(0, ++i); if (i >= cmd.length) clearInterval(t); }, 55); } }
  // inicio: vista auditor / atacante
  $$(".switch button").forEach((b) => b.addEventListener("click", () => { document.body.dataset.view = b.dataset.view; $$(".switch button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
  // inicio: factura
  const inv = $("#invoice"), rb = $("#reveal");
  rb?.addEventListener("click", () => {
    const on = inv.classList.toggle("revealed");
    rb.setAttribute("aria-pressed", String(on)); rb.textContent = on ? rb.dataset.off : rb.dataset.on;
    $("#hidden").setAttribute("aria-hidden", String(!on)); $("#reveal-note").textContent = on ? rb.dataset.note : "";
  });
  // inicio: cuerdas
  let audio = null, sound = false; const sbtn = $("#sound");
  sbtn?.addEventListener("click", () => { sound = !sound; sbtn.setAttribute("aria-pressed", String(sound)); sbtn.textContent = sound ? sbtn.dataset.on : sbtn.dataset.off; });
  function pluck(hz) {
    if (!sound) return;
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); const o = audio.createOscillator(), g = audio.createGain(), now = audio.currentTime;
      o.type = "triangle"; o.frequency.value = hz * 2; g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.25, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      o.connect(g).connect(audio.destination); o.start(now); o.stop(now + 1.25); } catch {}
  }
  $$(".string").forEach((el) => {
    const path = $("path", el); let raf = 0;
    const vibrate = () => { pluck(Number(el.dataset.hz)); if (reduce) return; cancelAnimationFrame(raf); const t0 = performance.now();
      const step = (t) => { const s = (t - t0) / 1000, amp = 16 * Math.exp(-3.2 * s) * Math.cos(s * 38); path.setAttribute("d", `M0 27Q200 ${27 + amp * 2} 400 27`); if (s < 1.4) raf = requestAnimationFrame(step); else path.setAttribute("d", "M0 27H400"); };
      raf = requestAnimationFrame(step); };
    el.addEventListener("pointerenter", vibrate); el.addEventListener("focus", vibrate);
  });

  // botones de copiar genéricos
  $$("[data-copy]").forEach((b) => b.addEventListener("click", () => copy($(b.dataset.copy).innerText, b)));

  // generador de prompts: [campo] editable, \[texto\] literal
  const gen = $("#gen");
  if (gen && D.prompts) {
    const phases = [...new Set(D.prompts.map((p) => p.phase))];
    gen.innerHTML = `<div class="tabs" role="tablist">${phases.map((ph, i) => `<button role="tab" type="button" aria-selected="${i === 0}" data-ph="${i}">${esc(ph)}</button>`).join("")}</div><div id="gen-list"></div>`;
    const parse = (t) => t.split(/(\\\[.*?\\\]|\[[^\]]+\])/g).filter(Boolean).map((seg) => seg.startsWith("\\[") ? { lit: "[" + seg.slice(2, -2) + "]" } : seg.startsWith("[") ? { field: seg.slice(1, -1) } : { lit: seg });
    const show = (pi) => {
      $$(".tabs button", gen).forEach((b, i) => b.setAttribute("aria-selected", String(i === pi)));
      $("#gen-list").innerHTML = D.prompts.filter((p) => p.phase === phases[pi]).map((p) => {
        const parts = parse(p.text), fields = parts.filter((x) => x.field);
        return `<article class="cedula" data-n="${p.n}"><header><span class="folio">P-${String(p.n).padStart(2, "0")}</span><h3>${esc(p.title)}</h3><span class="tag ${p.own ? "own" : ""}">${p.own ? UI.own : "IIA"}</span></header>
          ${fields.length ? `<div class="fields">${fields.map((f, i) => `<label>${esc(f.field)}<input type="text" id="f-${p.n}-${i}" data-i="${i}" placeholder="${esc(f.field)}" autocomplete="off"></label>`).join("")}</div>` : ""}
          <p class="out" id="out-${p.n}"></p><button class="btn small" type="button" data-cp="${p.n}">${UI.copy}</button></article>`;
      }).join("");
      $$(".cedula", gen).forEach((card) => {
        const p = D.prompts.find((x) => x.n === Number(card.dataset.n)), parts = parse(p.text), out = $(".out", card);
        const render = () => { let fi = 0; out.innerHTML = parts.map((x) => { if (x.lit !== undefined) return esc(x.lit); const v = $(`[data-i="${fi++}"]`, card).value.trim(); return v ? `<mark>${esc(v)}</mark>` : `<span class="hole">[${esc(x.field)}]</span>`; }).join(""); };
        $$("input", card).forEach((i) => i.addEventListener("input", render)); render();
        $("[data-cp]", card).addEventListener("click", (e) => copy(out.innerText, e.currentTarget));
      });
    };
    gen.addEventListener("click", (e) => { const b = e.target.closest("[data-ph]"); if (b) show(Number(b.dataset.ph)); });
    show(0);
  }

  // autodiagnóstico
  const quiz = $("#quiz");
  if (quiz) {
    const upd = () => { const n = $$("input:checked", quiz).length, lv = n <= 1 ? 0 : n <= 3 ? 1 : n <= 5 ? 2 : 3; $("#quiz-out").innerHTML = `<b>${n}/6 · ${esc(D.levels[lv][0])}</b><br>${esc(D.levels[lv][1])}`; };
    quiz.addEventListener("change", upd); upd();
  }

  // evaluador de casos de uso de IA
  const tri = $("#triage");
  if (tri && D.triage) {
    const Q = D.triage.q;
    tri.innerHTML = `<label class="tname">${UI.caseName}<input type="text" id="tri-name" placeholder="${esc(UI.casePh)}"></label>` + Q.map((q, i) => `<fieldset><legend>${i + 1}. ${esc(q.t)}</legend>${q.o.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}"> ${esc(o[0])}</label>`).join("")}</fieldset>`).join("");
    const out = $("#triage-out");
    const upd = () => {
      const a = Q.map((q, i) => { const c = $(`input[name=q${i}]:checked`, tri); return c ? Number(c.value) : null; });
      const done = a.filter((x) => x !== null).length;
      if (done < Q.length) { out.innerHTML = `<p class="dim">${UI.triPending.replace("{n}", Q.length - done)}</p>`; return; }
      const pts = a.map((v, i) => Q[i].o[v][1]), total = pts.reduce((x, y) => x + y, 0);
      const forced = pts[2] === 3 || (pts[1] === 3 && pts[3] >= 2);
      const tier = forced || total >= 14 ? 2 : total >= 7 ? 1 : 0, T = D.triage.tiers[tier];
      const ctrl = [...D.triage.base]; pts.forEach((p, i) => { if (p >= 2 && Q[i].c) ctrl.push(Q[i].c); });
      const name = $("#tri-name").value.trim() || UI.caseDefault;
      out.innerHTML = `<div class="tier t${tier}"><span class="eyebrow">${UI.triResult} · ${total}/24</span><h3>${esc(T.name)}</h3><p>${esc(T.desc)}</p></div>
        <div id="ficha" class="ficha"><p><b>${UI.fCase}:</b> ${esc(name)}</p><p><b>${UI.fTier}:</b> ${esc(T.name)} (${total}/24${forced ? "; " + UI.fForced : ""})</p><p><b>${UI.fAuto}:</b> ${esc(T.auto)}</p>
        <p><b>${UI.fCtrl}:</b></p><ul>${ctrl.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><p><b>${UI.fAsk}:</b></p><ul>${T.ask.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
        <p><b>${UI.fAns}:</b></p><ul>${Q.map((q, i) => `<li>${esc(q.t)} ${esc(q.o[a[i]][0])}</li>`).join("")}</ul></div>
        <button class="btn small" type="button" id="tri-copy">${UI.copyFicha}</button>`;
      $("#tri-copy").addEventListener("click", (e) => copy($("#ficha").innerText, e.currentTarget));
    };
    tri.addEventListener("change", upd); tri.addEventListener("input", upd); upd();
  }

  // formulario de contacto
  const form = $("#contact");
  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault(); const st = $("#contact-status");
    if (!form.reportValidity()) return;
    if (!CFG.formspree) { st.textContent = UI.formOff; return; }
    st.textContent = UI.formSending;
    try { const r = await fetch("https://formspree.io/f/" + CFG.formspree, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) }); if (!r.ok) throw 0; form.reset(); st.textContent = UI.formOk; }
    catch { st.textContent = UI.formErr; }
  });
})();
