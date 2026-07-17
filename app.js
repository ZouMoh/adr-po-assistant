(() => {
  "use strict";
  const KEY = "adr_po_assistant_v10";
  const OLD = [
    "adr_po_assistant_v9",
    "adr_po_assistant_v8",
    "adr_po_assistant_v7",
    "adr_po_assistant_v6",
    "adr_po_assistant_v5",
    "adr_po_assistant_v4",
    "adr_po_assistant_v3",
    "po_assistant_v4",
  ];
  const empty = {
    topics: [
      {
        id: "traductions",
        name: "Gestion des traductions",
        description: "Suivi du processus de traduction du portail modulaire.",
        tags: ["Portail", "Traductions"],
        adrs: [],
      },
      {
        id: "portail",
        name: "Portail Modulaire",
        description: "Décisions et ateliers liés au portail modulaire.",
        tags: ["Portail", "Module"],
        adrs: [],
      },
      {
        id: "tracabilite",
        name: "Traçabilité / EDI",
        description: "Sujets INCO, EDI, traçabilité et tables WMS.",
        tags: ["EDI", "WMS"],
        adrs: [],
      },
      {
        id: "mobilog",
        name: "Mobilog",
        description: "Sujets Mobilog, cariste, missions et localisation.",
        tags: ["Mobilog"],
        adrs: [],
      },
    ],
  };
  let data = loadData();
  let currentTopicId = data.topics[0]?.id || "traductions",
    editIndex = null,
    selectedVersion = null;
  function $(id) {
    return document.getElementById(id);
  }
  function val(id) {
    return $(id)?.value || "";
  }
  function setVal(id, v) {
    if ($(id)) $(id).value = v || "";
  }
  function makeId() {
    return "adr_" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }
  function makeTopicId(name) {
    return (
      String(name || "sujet")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "") || "topic_" + Date.now()
    );
  }
  function esc(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function fmt(v) {
    try {
      return new Date(v).toLocaleString("fr-FR");
    } catch {
      return v || "";
    }
  }
  function lines(id) {
    return val(id)
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  function cleanJson(v) {
    return String(v || "")
      .trim()
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();
  }
  function loadData() {
    const cur = localStorage.getItem(KEY);
    if (cur) {
      try {
        return normalizeData(JSON.parse(cur));
      } catch (e) {}
    }
    for (const k of OLD) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          return normalizeData(JSON.parse(raw));
        } catch (e) {}
      }
    }
    return normalizeData(JSON.parse(JSON.stringify(empty)));
  }
  function save() {
    localStorage.setItem(KEY, JSON.stringify(data));
  }
  function topic() {
    return data.topics.find((t) => t.id === currentTopicId) || data.topics[0];
  }
  function normalizeData(raw) {
    if (raw.subjects && !raw.topics) {
      raw = {
        topics: raw.subjects.map((s) => ({
          id: s.id || makeTopicId(s.name),
          name: s.name || "Sujet sans nom",
          description: s.summary || s.description || "",
          tags: s.tags || [],
          adrs: convertV4(s.adr || s.adrs || []),
          cr: s.cr || [],
        })),
      };
    }
    if (!raw.topics) raw.topics = [];
    raw.topics = raw.topics.map((t) => {
      const adrs = t.adrs || t.adr || t.meetings || [];
      return {
        id: t.id || makeTopicId(t.name),
        name: t.name || "Sujet sans nom",
        description: t.description || t.summary || "",
        tags: t.tags || t.badges || [],
        adrs: Array.isArray(adrs) ? convertList(adrs) : [],
        cr: t.cr || [],
      };
    });
    return raw;
  }
  function convertV4(list) {
    if (!list.length) return [];
    const groups = {};
    list.forEach((a) => {
      const key = (a.titre || a.title || "ADR").trim().toLowerCase();
      (groups[key] = groups[key] || []).push(a);
    });
    return Object.values(groups).map((arr) => {
      const normalized = arr.map((a, i) =>
        normalizeAdr({ ...a, version: i + 1 }),
      );
      const active = normalized[normalized.length - 1];
      active.version = normalized.length;
      active.versions = normalized
        .slice(0, -1)
        .reverse()
        .map((v) => {
          const c = JSON.parse(JSON.stringify(v));
          delete c.versions;
          c.archivedAt = new Date().toISOString();
          return c;
        });
      return active;
    });
  }
  function convertList(list) {
    return list.map((a) => normalizeAdr(a));
  }
  function normalizeAdr(a) {
    return {
      id: a.id || makeId(),
      titre: a.titre || a.title || "ADR sans titre",
      date: a.date || new Date().toISOString().slice(0, 10),
      participants: Array.isArray(a.participants)
        ? a.participants
        : a.participants
          ? String(a.participants)
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean)
          : [],
      objectif: a.objectif || "",
      pointsAbordes: a.pointsAbordes || a.points_abordes || [],
      compteRendu: a.compteRendu || a.cr || a.synthese || "",
      divergences: a.divergences || a.pointsDivergence || [],
      decisions: a.decisions || [],
      actions: a.actions || [],
      risques: a.risques || a.risks || [],
      questionsOuvertes: a.questionsOuvertes || a.questions || [],
      motsCles: a.motsCles || a.keywords || [],
      version: a.version || 1,
      versions: a.versions || [],
      createdAt: a.createdAt || new Date().toISOString(),
      statutValidation: a.statutValidation || "Brouillon",
      valideLe: a.valideLe || "",
      updatedAt: new Date().toISOString(),
    };
  }
  function archiveActive(t, i) {
    const a = t.adrs[i];
    const v = JSON.parse(JSON.stringify(a));
    delete v.versions;
    v.archivedAt = new Date().toISOString();
    a.versions = a.versions || [];
    a.versions.unshift(v);
  }
  function render() {
    renderTopics();
    renderCurrent();
    renderSearch();
    syncSelectors();
    save();
  }
  function renderTopics() {
    const q = val("topicSearch").toLowerCase();
    $("topicList").innerHTML = data.topics
      .filter((t) => t.name.toLowerCase().includes(q))
      .map((t) => {
        const vc = (t.adrs || []).reduce(
          (s, a) => s + (a.versions || []).length,
          0,
        );
        return `<div class="topic ${t.id === currentTopicId ? "active" : ""}" data-topic="${esc(t.id)}"><strong>${esc(t.name)}</strong><br><small>${(t.adrs || []).length} ADR · ${vc} versions</small></div>`;
      })
      .join("");
    document.querySelectorAll("[data-topic]").forEach((el) =>
      el.addEventListener("click", () => {
        currentTopicId = el.dataset.topic;
        render();
      }),
    );
  }
  function renderCurrent() {
    const t = topic(),
      adrs = t.adrs || [],
      vers = adrs.flatMap((a) => a.versions || []),
      dec = adrs.flatMap((a) => a.decisions || []),
      act = adrs.flatMap((a) => a.actions || []),
      div = adrs.flatMap((a) => a.divergences || []),
      ris = adrs.flatMap((a) => a.risques || []);
    $("topicTitle").textContent = t.name;
    $("topicDesc").textContent = t.description || "";
    $("topicTags").innerHTML = (t.tags || [])
      .map((x) => `<span class="tag">${esc(x)}</span>`)
      .join("");
    $("kAdr").textContent = adrs.length;
    $("kVer").textContent = vers.length;
    $("kDec").textContent = dec.length;
    $("kAct").textContent = act.length;
    $("kDiv").textContent = div.length;
    $("kRisk").textContent = ris.length;
    $("timeline").innerHTML = adrs.length
      ? adrs
          .map(
            (a, i) =>
              `<div class="item" data-adr="${i}"><h3>${esc(a.date)} — ${esc(a.titre)}</h3><div class="meta">Active v${a.version} · ${(a.versions || []).length} ancienne(s) version(s) · <b>${esc(a.statutValidation || "Brouillon")}</b></div><p>${esc((a.objectif || a.compteRendu || "").slice(0, 430))}</p><div>${(a.motsCles || []).map((k) => `<span class="pill">${esc(k)}</span>`).join("")}</div><div class="meta">${(a.decisions || []).length} décisions · ${(a.actions || []).length} actions · ${(a.divergences || []).length} divergences · ${(a.risques || []).length} risques</div></div>`,
          )
          .join("")
      : "<p>Aucun ADR.</p>";
    document
      .querySelectorAll("[data-adr]")
      .forEach((el) =>
        el.addEventListener("click", () => openAdr(Number(el.dataset.adr))),
      );
    renderVersions();
    $("decisions").innerHTML = table(
      ["ADR", "Décision", "Impact", "Statut"],
      adrs.flatMap((a) =>
        (a.decisions || []).map((d) => [
          a.titre,
          d.decision || d,
          d.impact || "",
          d.statut || "",
        ]),
      ),
    );
    $("actions").innerHTML = table(
      ["ADR", "Action", "Responsable", "Échéance", "Priorité", "Statut"],
      adrs.flatMap((a) =>
        (a.actions || []).map((x) => [
          a.titre,
          x.action || x,
          x.responsable || "",
          x.echeance || "",
          x.priorite || "",
          x.statut || "À faire",
        ]),
      ),
    );
    $("divergences").innerHTML = table(
      ["ADR", "Point à travailler"],
      adrs.flatMap((a) => (a.divergences || []).map((x) => [a.titre, x])),
    );
    $("risks").innerHTML = table(
      ["ADR", "Risque", "Impact", "Statut"],
      adrs.flatMap((a) =>
        (a.risques || []).map((r) => [
          a.titre,
          r.risque || r,
          r.impact || "",
          r.statut || "",
        ]),
      ),
    );
  }
  function renderVersions() {
    const out = [];
    topic().adrs.forEach((a, ai) =>
      (a.versions || []).forEach((v, vi) =>
        out.push(
          `<div class="version" data-version="${ai}:${vi}"><strong>${esc(a.titre)} — ancienne v${esc(v.version)}</strong><br><small>Archivée le ${esc(fmt(v.archivedAt))}</small><p>${esc((v.objectif || v.compteRendu || "").slice(0, 260))}</p></div>`,
        ),
      ),
    );
    $("versions").innerHTML = out.length
      ? out.join("")
      : "<p>Aucune version historisée.</p>";
    document.querySelectorAll("[data-version]").forEach((el) =>
      el.addEventListener("click", () => {
        const [ai, vi] = el.dataset.version.split(":").map(Number);
        openVersion(ai, vi);
      }),
    );
  }
  function table(headers, rows) {
    if (!rows.length) return "<p>Aucun élément.</p>";
    return `<table><tr>${headers.map((x) => `<th>${esc(x)}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c || "")}</td>`).join("")}</tr>`).join("")}</table>`;
  }
  function switchTab(name, btn) {
    document
      .querySelectorAll(".panel")
      .forEach((p) => p.classList.remove("active"));
    document
      .querySelectorAll(".tabs button")
      .forEach((x) => x.classList.remove("active"));
    $("tab-" + name).classList.add("active");
    btn.classList.add("active");
  }
  function newTopic() {
    const name = prompt("Nom du sujet :");
    if (!name) return;
    const tid = makeTopicId(name) + "_" + Date.now();
    data.topics.push({
      id: tid,
      name,
      description: "",
      tags: ["ADR"],
      adrs: [],
    });
    currentTopicId = tid;
    render();
  }
  function editTopic() {
    const t = topic();
    const d = prompt("Description du sujet :", t.description || "");
    if (d !== null) {
      t.description = d;
      render();
    }
  }
  function openAnalyzer() {
    syncSelectors();
    $("analyzer").classList.remove("hidden");
  }
  function closeAnalyzer() {
    $("analyzer").classList.add("hidden");
  }
  function syncSelectors() {
    const opts = data.topics
      .map(
        (t) =>
          `<option value="${esc(t.id)}" ${t.id === currentTopicId ? "selected" : ""}>${esc(t.name)}</option>`,
      )
      .join("");
    if ($("anTopic")) $("anTopic").innerHTML = opts;
    if ($("saveTopic")) $("saveTopic").innerHTML = opts;
    if ($("mailSelect"))
      $("mailSelect").innerHTML = (topic().adrs || [])
        .map(
          (a, i) =>
            `<option value="${i}">${esc(a.date)} - ${esc(a.titre)} v${a.version}</option>`,
        )
        .join("");
  }
  function makePrompt() {
    const selected = data.topics.find((t) => t.id === val("anTopic"));
    const st = selected?.name || topic().name,
      ti = val("anTitle") || "Non précisé",
      tr = val("transcript");
    if (!tr.trim()) {
      alert("Collez d'abord la transcription à analyser.");
      return;
    }
    setVal(
      "prompt",
      `Analyse cette transcription Teams et retourne uniquement un JSON valide, sans markdown.

Contexte :
- Je suis Product Owner / Chef de projet IT.
- Sujet cible : ${st}
- Titre optionnel : ${ti}

Structure JSON attendue :
{
  "titre": "",
  "date": "",
  "participants": [],
  "objectif": "",
  "pointsAbordes": [],
  "compteRendu": "",
  "divergences": [],
  "decisions": [{"decision":"","impact":"","statut":"Validée ou À confirmer"}],
  "actions": [{"action":"","responsable":"","echeance":"","priorite":"Haute/Moyenne/Basse","statut":"À faire"}],
  "risques": [{"risque":"","impact":"","statut":"À surveiller ou À traiter"}],
  "questionsOuvertes": [],
  "motsCles": []
}

Règles :
- Ne pas inventer.
- Si une information n'est pas identifiable, écrire "Non précisé".
- Reformuler professionnellement.
- Faire ressortir les divergences et points à travailler au prochain atelier.
- Le compteRendu doit être prêt à envoyer par mail.

Transcription :
${tr}`,
    );
  }
  async function copyPrompt() {
    const content = val("prompt");
    if (!content) {
      alert("Générez d'abord le prompt.");
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      alert("Prompt copié.");
    } catch {
      $("prompt").focus();
      $("prompt").select();
      alert("Le prompt est sélectionné. Utilisez Ctrl+C pour le copier.");
    }
  }
  function saveJson() {
    try {
      const parsed = JSON.parse(cleanJson(val("jsonInput")));
      parsed.statutValidation = "Brouillon";
      parsed.valideLe = "";
      const a = normalizeAdr(parsed);
      const t = data.topics.find((x) => x.id === val("saveTopic")) || topic();
      const mode = val("saveMode");
      if (mode === "new" || !t.adrs.length) t.adrs.unshift(a);
      else if (mode === "replace") {
        a.id = t.adrs[0].id;
        a.version = t.adrs[0].version;
        a.versions = t.adrs[0].versions || [];
        t.adrs[0] = a;
      } else {
        archiveActive(t, 0);
        a.id = t.adrs[0].id;
        a.version = (t.adrs[0].version || 1) + 1;
        a.versions = t.adrs[0].versions || [];
        t.adrs[0] = a;
      }
      currentTopicId = t.id;
      closeAnalyzer();
      render();
      alert("Brouillon enregistré. Vérifiez-le puis validez le compte rendu avant toute diffusion.");
    } catch (e) {
      alert("JSON invalide : " + e.message);
    }
  }
  function openAdr(i = null) {
    editIndex = i;
    const a =
      i === null
        ? normalizeAdr({
            titre: "",
            date: new Date().toISOString().slice(0, 10),
          })
        : topic().adrs[i];
    $("adrTitle").textContent = i === null ? "Nouvel ADR" : "Modifier ADR";
    $("versionNote").textContent =
      i === null
        ? "Nouvel ADR"
        : `Version active v${a.version}. Anciennes versions : ${(a.versions || []).length}.`;
    fillEditor(a);
    $("adrModal").classList.remove("hidden");
  }
  function closeAdr() {
    editIndex = null;
    $("adrModal").classList.add("hidden");
  }
  function fillEditor(a) {
    setVal("eTitle", a.titre);
    setVal("eDate", a.date);
    setVal("eParticipants", (a.participants || []).join(", "));
    setVal("eObjective", a.objectif);
    setVal("ePoints", (a.pointsAbordes || []).join("\n"));
    setVal("eSummary", a.compteRendu);
    setVal("eDivergences", (a.divergences || []).join("\n"));
    setVal(
      "eDecisions",
      (a.decisions || []).map((d) => d.decision || d).join("\n"),
    );
    setVal("eActions", (a.actions || []).map((x) => x.action || x).join("\n"));
    setVal("eRisks", (a.risques || []).map((r) => r.risque || r).join("\n"));
    setVal("eQuestions", (a.questionsOuvertes || []).join("\n"));
  }
  function readEditor() {
    const old = editIndex === null ? null : topic().adrs[editIndex];
    return normalizeAdr({
      id: old?.id,
      titre: val("eTitle"),
      date: val("eDate"),
      participants: val("eParticipants"),
      objectif: val("eObjective"),
      pointsAbordes: lines("ePoints"),
      compteRendu: val("eSummary"),
      divergences: lines("eDivergences"),
      decisions: lines("eDecisions").map((x) => ({
        decision: x,
        impact: "",
        statut: "",
      })),
      actions: lines("eActions").map((x) => ({
        action: x,
        responsable: "",
        echeance: "",
        priorite: "",
        statut: "À faire",
      })),
      risques: lines("eRisks").map((x) => ({
        risque: x,
        impact: "",
        statut: "À surveiller",
      })),
      questionsOuvertes: lines("eQuestions"),
      version: editIndex === null ? 1 : old.version,
      versions: editIndex === null ? [] : old.versions || [],
    });
  }
  function saveAdr() {
    const a = readEditor();
    a.statutValidation = "Brouillon";
    a.valideLe = "";
    if (editIndex === null) topic().adrs.unshift(a);
    else topic().adrs[editIndex] = a;
    closeAdr();
    render();
  }
  function validateAdr() {
    if (editIndex === null) {
      alert("Enregistrez d'abord le brouillon.");
      return;
    }
    const a = readEditor();
    a.statutValidation = "Validé";
    a.valideLe = new Date().toISOString();
    a.versions = topic().adrs[editIndex].versions || [];
    topic().adrs[editIndex] = a;
    closeAdr();
    render();
    alert("Compte rendu validé. La génération du mail est maintenant autorisée.");
  }
  function saveVersion() {
    const t = topic(),
      a = readEditor();
    a.statutValidation = "Brouillon";
    a.valideLe = "";
    if (editIndex !== null) {
      archiveActive(t, editIndex);
      a.version = (t.adrs[editIndex].version || 1) + 1;
      a.versions = t.adrs[editIndex].versions || [];
      t.adrs[editIndex] = a;
    } else t.adrs.unshift(a);
    closeAdr();
    render();
  }
  function deleteAdr() {
    if (
      editIndex !== null &&
      confirm("Supprimer cet ADR actif et son historique ?")
    ) {
      topic().adrs.splice(editIndex, 1);
      closeAdr();
      render();
    }
  }
  function openVersion(ai, vi) {
    selectedVersion = { ai, vi };
    const v = topic().adrs[ai].versions[vi];
    $("versionDetail").innerHTML =
      `<h3>${esc(v.titre)} — v${esc(v.version)}</h3><p><b>Date :</b> ${esc(v.date)}</p><p><b>Objectif :</b> ${esc(v.objectif)}</p><h4>Compte rendu</h4><p>${esc(v.compteRendu)}</p><h4>Divergences</h4>${table(
        ["Point"],
        (v.divergences || []).map((x) => [x]),
      )}<h4>Décisions</h4>${table(
        ["Décision"],
        (v.decisions || []).map((d) => [d.decision || d]),
      )}`;
    $("versionModal").classList.remove("hidden");
  }
  function closeVersion() {
    selectedVersion = null;
    $("versionModal").classList.add("hidden");
  }
  function restoreVersion() {
    if (!selectedVersion) return;
    const t = topic(),
      active = t.adrs[selectedVersion.ai],
      old = active.versions[selectedVersion.vi];
    archiveActive(t, selectedVersion.ai);
    const r = normalizeAdr(old);
    r.id = active.id;
    r.version = (active.version || 1) + 1;
    r.versions = active.versions || [];
    t.adrs[selectedVersion.ai] = r;
    closeVersion();
    render();
  }
  function openMail() {
    syncSelectors();
    $("mailModal").classList.remove("hidden");
  }
  function closeMail() {
    $("mailModal").classList.add("hidden");
  }
  function makeMail() {
    const a = topic().adrs[Number(val("mailSelect") || 0)];
    if (!a) {
      setVal("mailOutput", "Aucun ADR sélectionné.");
      return;
    }
    if (a.statutValidation !== "Validé") {
      setVal("mailOutput", "DIFFUSION BLOQUÉE — Ce compte rendu est encore en brouillon. Ouvrez l’ADR et cliquez sur « Valider le compte rendu » après relecture.");
      return;
    }
    setVal(
      "mailOutput",
      `Bonjour à tous,

Suite à notre échange, vous trouverez ci-dessous la synthèse des points abordés concernant ${a.titre}.

Objectif
${a.objectif || "Non précisé"}

Points abordés
${(a.pointsAbordes || []).map((x) => "• " + x).join("\n")}

Décisions
${(a.decisions || []).map((d) => "• " + (d.decision || d)).join("\n")}

Points de divergence / à travailler
${(a.divergences || []).map((x) => "• " + x).join("\n") || "• Aucun point de divergence identifié."}

Actions
${(a.actions || []).map((x) => "• " + (x.action || x) + " — Responsable : " + (x.responsable || "Non précisé")).join("\n")}

N'hésitez pas à compléter ou corriger cette synthèse si nécessaire.

Bonne journée à tous.`,
    );
  }
  function copyMail() {
    navigator.clipboard.writeText(val("mailOutput"));
    alert("Mail copié.");
  }
  function renderSearch() {
    const q = val("globalSearch").toLowerCase();
    if (!q) {
      $("searchResults").innerHTML = "<p>Saisir un mot-clé.</p>";
      return;
    }
    const res = [];
    data.topics.forEach((t) =>
      t.adrs.forEach((a) => {
        if (JSON.stringify(a).toLowerCase().includes(q))
          res.push([
            t.name,
            a.date,
            a.titre,
            "Active v" + a.version,
            (a.compteRendu || a.objectif || "").slice(0, 220),
          ]);
        (a.versions || []).forEach((v) => {
          if (JSON.stringify(v).toLowerCase().includes(q))
            res.push([
              t.name,
              v.date,
              v.titre,
              "Historique v" + v.version,
              (v.compteRendu || v.objectif || "").slice(0, 220),
            ]);
        });
      }),
    );
    $("searchResults").innerHTML = table(
      ["Sujet", "Date", "ADR", "Version", "Extrait"],
      res,
    );
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "adr_po_assistant_sauvegarde_v10.json";
    a.click();
  }
  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        data = normalizeData(JSON.parse(e.target.result));
        currentTopicId = data.topics[0]?.id || currentTopicId;
        render();
        alert("Import réussi : historique converti.");
      } catch (err) {
        alert("Import impossible : " + err.message);
      }
    };
    reader.readAsText(file);
  }
  function bindEvents() {
    const bind = (id, ev, fn) => {
      $(id)?.addEventListener(ev, fn);
    };
    bind("btnOpenAnalyzer", "click", openAnalyzer);
    bind("btnOpenMail", "click", openMail);
    bind("btnExport", "click", exportData);
    bind("fileImport", "change", importData);
    bind("btnNewTopic", "click", newTopic);
    bind("topicSearch", "input", render);
    bind("globalSearch", "input", renderSearch);
    bind("btnOpenAdr", "click", () => openAdr());
    bind("btnEditTopic", "click", editTopic);
    document
      .querySelectorAll(".tabs button")
      .forEach((b) =>
        b.addEventListener("click", () => switchTab(b.dataset.tab, b)),
      );
    bind("btnMakePrompt", "click", makePrompt);
    bind("btnCopyPrompt", "click", copyPrompt);
    bind("btnSaveJson", "click", saveJson);
    bind("btnCloseAnalyzer", "click", closeAnalyzer);
    bind("btnSaveAdr", "click", saveAdr);
    bind("btnValidateAdr", "click", validateAdr);
    bind("btnSaveVersion", "click", saveVersion);
    bind("btnDeleteAdr", "click", deleteAdr);
    bind("btnCloseAdr", "click", closeAdr);
    bind("btnMakeMail", "click", makeMail);
    bind("btnCopyMail", "click", copyMail);
    bind("btnCloseMail", "click", closeMail);
    bind("btnRestoreVersion", "click", restoreVersion);
    bind("btnCloseVersion", "click", closeVersion);
  }
  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    render();
  });
})();
