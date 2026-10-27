(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = {
    memories: [], summary: { people: [], motifs: [], memory_count: 0 },
    status: { models: [], ollama_online: false },
    selectedModel: "", person: "", motif: "", view: "archive", toastTimer: null,
  };
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function displayDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
    if (!value) return "A day kept close";
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      cache: "no-store",
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Local archive error (${response.status}).`);
    return data;
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove("visible"), 3100);
  }

  function initials(name) {
    return String(name).trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
  }

  function activeMemories() {
    const query = $("#memory-search").value.trim().toLocaleLowerCase();
    return state.memories.filter(memory => {
      const personMatch = !state.person || memory.person === state.person;
      const motifMatch = !state.motif || memory.tags.some(tag => tag.toLocaleLowerCase() === state.motif.toLocaleLowerCase()) || memory.body.toLocaleLowerCase().includes(state.motif.toLocaleLowerCase());
      const haystack = [memory.person, memory.relationship, memory.title, memory.body, memory.place, ...memory.tags].join(" ").toLocaleLowerCase();
      return personMatch && motifMatch && (!query || haystack.includes(query));
    });
  }

  function renderPeople() {
    const host = $("#people-list");
    const people = state.summary.people || [];
    $("#people-count").textContent = String(people.length).padStart(2, "0");
    host.innerHTML = `<button class="person-filter ${state.person ? "" : "selected"}" data-person=""><span class="person-avatar all-avatar">✳</span><span class="person-name">Everyone<small>The full family archive</small></span><span class="person-story-count">${state.memories.length}</span></button>` + people.map(person => `
      <button class="person-filter ${state.person === person.name ? "selected" : ""}" data-person="${escapeHtml(person.name)}">
        <span class="person-avatar">${escapeHtml(initials(person.name))}</span>
        <span class="person-name">${escapeHtml(person.name)}<small>${escapeHtml(person.relationship || "In the archive")}</small></span>
        <span class="person-story-count">${person.count}</span>
      </button>`).join("");
  }

  function renderFeatured() {
    const host = $("#featured-memory");
    const featured = state.memories.find(memory => memory.title === "The glass of water") || state.memories[0];
    if (!featured) {
      host.innerHTML = `<div class="feature-top"><span class="feature-label"><b>✳</b> A PLACE FOR WHAT COMES NEXT</span><span class="feature-type">YOUR ARCHIVE</span></div><div class="feature-copy"><p class="feature-quote">“A story can start with one small thing.”</p><p class="feature-description">Keep a name, an object, or a sentence. You can return to it whenever you are ready.</p></div><div class="feature-bottom"><span>Add something to begin.</span><button data-open-add>Keep the first memory →</button></div>`;
      return;
    }
    const quoteMatch = featured.body.match(/[“"]([^”"]{8,100})[”"]/);
    const quote = quoteMatch ? quoteMatch[1] : featured.title;
    const excerpt = featured.body.length > 140 ? `${featured.body.slice(0, 137).trimEnd()}…` : featured.body;
    host.innerHTML = `
      <div class="feature-top"><span class="feature-label"><b>✳</b> A STORY THAT STILL GLOWS</span><span class="feature-type">${escapeHtml(featured.relationship || "KEPT CLOSE")}</span></div>
      <div class="feature-copy"><p class="feature-quote">“${escapeHtml(quote)}”</p><p class="feature-description">${escapeHtml(excerpt)}</p></div>
      <div class="feature-bottom"><span class="feature-author"><span class="feature-avatar">${escapeHtml(initials(featured.person))}</span>${escapeHtml(featured.person)} <i>·</i> ${escapeHtml(displayDate(featured.date, { month: "long", year: "numeric" }))}</span><button data-open-memory="${featured.id}">Read this story <span>↗</span></button></div>`;
  }

  function memoryCard(memory, index) {
    const excerpt = memory.body.length > 103 ? `${memory.body.slice(0, 100).trimEnd()}…` : memory.body;
    const kind = memory.tags?.[0] || "A small detail";
    return `<article class="memory-card memory-tone-${index % colors.length}" tabindex="0" role="button" aria-label="Open ${escapeHtml(memory.title)}" data-open-memory="${memory.id}">
      <div class="memory-card-top"><span>${escapeHtml(displayDate(memory.date, { month: "short", year: "numeric" }).toLocaleUpperCase())}</span><span class="memory-kind">${escapeHtml(kind.toLocaleUpperCase())}</span></div>
      <h3>${escapeHtml(memory.title)}</h3><p class="memory-excerpt">${escapeHtml(excerpt)}</p>
      <div class="memory-card-bottom"><span class="memory-author">${escapeHtml(memory.person)} <i>·</i> ${escapeHtml(memory.place || "A place remembered")}</span><span class="memory-card-arrow">↗</span></div>
    </article>`;
  }

  function renderMemoryGrid() {
    const memories = activeMemories();
    $("#memory-total").textContent = String(state.memories.length).padStart(2, "0");
    $("#side-count").textContent = String(state.memories.length).padStart(2, "0");
    $("#ask-available-count").textContent = String(state.memories.length).padStart(2, "0");
    if (memories.length) {
      $("#memory-grid").innerHTML = memories.map(memoryCard).join("");
    } else {
      const message = state.memories.length ? "No story matches that search yet." : "The archive is ready for a first memory.";
      $("#memory-grid").innerHTML = `<div class="empty-state">${message}<br><button class="text-link" data-open-add>Keep a memory <span>→</span></button></div>`;
    }
  }

  function renderMotifs() {
    const motifs = state.summary.motifs || [];
    const top = motifs.slice(0, 12);
    $("#motif-cloud").innerHTML = top.length ? top.map(item => `<button class="motif-pill ${state.motif === item.name ? "selected" : ""}" data-motif="${escapeHtml(item.name)}">${escapeHtml(item.name)} <b>${item.count}</b></button>`).join("") : `<span class="panel-caption">Save a story and its details will start to gather here.</span>`;
    $("#motif-list").innerHTML = top.length ? top.map((item, index) => `<div class="motif-row-item" data-motif="${escapeHtml(item.name)}"><span class="motif-rank">${String(index + 1).padStart(2, "0")}</span><span class="motif-item-name">${escapeHtml(item.name)}</span><span class="motif-item-count">${item.count} ${item.count === 1 ? "story" : "stories"} →</span></div>`).join("") : `<p class="panel-caption">The first repeated detail will appear here.</p>`;
    $("#atlas-memory-count").textContent = String(state.memories.length).padStart(2, "0");
    $("#atlas-people-count").textContent = String(state.summary.people.length).padStart(2, "0");
    $("#atlas-motif-count").textContent = String(motifs.length).padStart(2, "0");
    renderConstellation(top.slice(0, 8));
  }

  function renderConstellation(motifs) {
    const host = $("#constellation-nodes");
    const svg = $("#constellation-lines");
    if (!host || !svg) return;
    const positions = [
      [16, 25], [39, 16], [67, 19], [85, 38], [79, 70], [56, 83], [28, 78], [13, 54],
    ];
    host.innerHTML = `<button class="atlas-node center-node" data-nav="archive"><strong>THE<br>FAMILY</strong><small>${state.memories.length} stories</small></button>` + motifs.map((motif, index) => {
      const [x, y] = positions[index];
      return `<button class="atlas-node orbit-${index + 1}" data-motif="${escapeHtml(motif.name)}"><strong>${escapeHtml(motif.name)}</strong><small>${motif.count} ${motif.count === 1 ? "story" : "stories"}</small></button>`;
    }).join("");
    const bounds = host.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    svg.innerHTML = motifs.map((_, index) => {
      const [x, y] = positions[index];
      return `<line x1="${bounds.width * x / 100}" y1="${bounds.height * y / 100}" x2="${bounds.width * .5}" y2="${bounds.height * .5}"></line>`;
    }).join("");
  }

  function renderStatus() {
    const pill = $("#model-pill");
    const label = $("#model-label");
    const select = $("#model-select");
    if (state.status.ollama_online) {
      pill.classList.add("online");
      label.textContent = `${state.selectedModel || state.status.models[0]} · on this device`;
      select.innerHTML = state.status.models.map(model => `<option value="${escapeHtml(model)}" ${model === state.selectedModel ? "selected" : ""}>${escapeHtml(model)}</option>`).join("");
      $("#model-help").textContent = "Questions and selected stories stay on this computer.";
    } else {
      pill.classList.remove("online");
      label.textContent = "Local preview · model offline";
      select.innerHTML = `<option value="">No Ollama model detected</option><option value="gemma3:1b" disabled>Install with: ollama pull gemma3:1b</option>`;
      $("#model-help").textContent = "Start Ollama and install a model to enable local reflections.";
    }
  }

  function updateDemoNotice() {
    const hasFictional = state.memories.some(memory => memory.fictional);
    $("#demo-banner").classList.toggle("hidden", !hasFictional);
    if (hasFictional) {
      $("#demo-banner").innerHTML = `<span class="demo-flower">✿</span><span><strong>Fictional starter stories</strong> — this archive still includes sample stories; no real family memories are included in them.</span><button id="demo-banner-dismiss" aria-label="Dismiss demo notice">×</button>`;
      $("#demo-banner-dismiss").addEventListener("click", () => $("#demo-banner").classList.add("hidden"));
    }
  }

  function renderAll() {
    renderPeople();
    renderFeatured();
    renderMemoryGrid();
    renderMotifs();
    renderStatus();
    updateDemoNotice();
  }

  async function refreshArchive() {
    const [memoryResult, summaryResult] = await Promise.all([api("/api/memories"), api("/api/summary")]);
    state.memories = memoryResult.memories || [];
    state.summary = summaryResult;
    if (state.person && !state.summary.people.some(person => person.name === state.person)) state.person = "";
    renderAll();
  }

  async function refreshStatus() {
    try {
      state.status = await api("/api/status");
      const saved = localStorage.getItem("afterlight.model");
      state.selectedModel = saved && state.status.models.includes(saved) ? saved : state.status.selected_model;
      renderStatus();
    } catch {
      state.status = { ollama_online: false, models: [] };
      renderStatus();
    }
  }

  function navigate(view) {
    state.view = view;
    $$(".view").forEach(section => section.classList.toggle("active", section.id === `${view}-view`));
    $$("[data-nav]").forEach(button => button.classList.toggle("active", button.dataset.nav === view));
    const label = { archive: "THE ARCHIVE", ask: "ASK THE ARCHIVE", connections: "THREADS WE KEEP", about: "HOW IT WORKS" }[view] || "THE ARCHIVE";
    $("#view-crumb").textContent = label;
    if (view === "connections") requestAnimationFrame(() => renderConstellation((state.summary.motifs || []).slice(0, 8)));
    if (view === "ask") setTimeout(() => $("#ask-input").focus({ preventScroll: true }), 80);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openMemory(id) {
    const memory = state.memories.find(item => item.id === Number(id));
    if (!memory) return;
    $("#detail-content").innerHTML = `<div class="detail-content">
      <div class="detail-top"><span>${escapeHtml(displayDate(memory.date, { month: "long", year: "numeric" }).toLocaleUpperCase())} <i>·</i> ${escapeHtml(memory.place || "A place remembered")}</span><button type="button" data-close-detail aria-label="Close">×</button></div>
      <h2 id="detail-title">${escapeHtml(memory.title)}</h2><p class="detail-byline">${escapeHtml(memory.person)} <i>·</i> ${escapeHtml(memory.relationship || "A person held close")}</p>
      <div class="detail-body">${escapeHtml(memory.body)}</div>
      <div class="detail-tags">${memory.tags.map(tag => `<span class="motif-pill">${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="detail-actions"><span class="detail-byline">${memory.fictional ? "Fictional starter memory" : "Kept in this local archive"}</span><button class="delete-button" data-delete-memory="${memory.id}">Remove this story</button></div>
    </div>`;
    $("#detail-dialog").showModal();
  }

  function openAddDialog() {
    $("#memory-dialog").showModal();
    setTimeout(() => $("#memory-form [name=person]").focus(), 50);
  }

  function setPrompt(prompt) {
    navigate("ask");
    $("#ask-input").value = prompt;
    setTimeout(() => $("#ask-input").focus({ preventScroll: true }), 90);
  }

  function renderReflection(result) {
    const mode = result.mode === "local-model" ? `LOCAL MODEL · ${result.model || state.selectedModel}` : "LOCAL INDEX PREVIEW · NO MODEL RUNNING";
    const sources = result.sources || [];
    const quotes = (result.quotes || []).map(quote => {
      const source = sources.find(item => item.body.includes(quote));
      return `<blockquote class="verified-quote">“${escapeHtml(quote)}”<small>VERIFIED AGAINST ${escapeHtml(source?.title || "SOURCE STORY")}</small></blockquote>`;
    }).join("");
    const motifs = (result.motifs || []).map(motif => `<span class="motif-pill">${escapeHtml(motif)}</span>`).join("");
    const sourceCards = sources.map((source, index) => `<div class="source-card"><span class="source-number">${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(source.title)}</strong><small>${escapeHtml(source.person)} <i>·</i> ${escapeHtml(displayDate(source.date, { month: "long", year: "numeric" }))}</small></div><button data-open-memory="${source.id}">Read source ↗</button></div>`).join("");
    $("#reflection-area").innerHTML = `<article class="reflection-card">
      <div class="reflection-card-head"><span class="reflection-label"><b>✳</b> A THREAD IN THE STORIES</span><span class="reflection-mode">${escapeHtml(mode)}</span></div>
      <div class="reflection-content"><h3>A small connection, held gently.</h3><p>${escapeHtml(result.reflection || "The archive did not find a reflection for this question.")}</p>
        ${motifs ? `<div class="motif-row">${motifs}</div>` : ""}${quotes}
        ${result.next_question ? `<div class="next-question"><b>A QUESTION TO CARRY WITH YOU</b>${escapeHtml(result.next_question)}</div>` : ""}
      </div>
      <div class="source-section"><p>THESE ORIGINAL STORIES WERE USED</p>${sourceCards || `<p class="panel-caption">No source story matched this question yet.</p>`}</div>
      <div class="grounding-note"><b>The story stays the source.</b> This ${result.mode === "local-model" ? "AI reflection is an interpretation" : "transparent preview used no AI"}; read the original memories and decide what feels true.</div>
    </article>`;
  }

  async function submitQuestion(event) {
    event.preventDefault();
    const input = $("#ask-input");
    const query = input.value.trim();
    if (!query) { input.focus(); showToast("Write a question first."); return; }
    const button = $("#ask-submit");
    button.disabled = true;
    button.innerHTML = "<span>✳</span> Listening…";
    $("#reflection-area").innerHTML = `<div class="loading-state"><span>✳</span>Looking through the stories you kept…</div>`;
    try {
      const result = await api("/api/ask", {
        method: "POST", body: JSON.stringify({ query, model: state.selectedModel }),
      });
      renderReflection(result);
    } catch (error) {
      $("#reflection-area").innerHTML = `<div class="empty-reflection"><span class="empty-ornament">✳</span><h3>The lantern could not<br>find its words.</h3><p>${escapeHtml(error.message)} Your saved stories are safe; try the question again in a moment.</p></div>`;
    } finally {
      button.disabled = false;
      button.innerHTML = "<span>✳</span> Find a thread";
    }
  }

  async function saveMemory(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    values.tags = values.tags.split(",").map(tag => tag.trim()).filter(Boolean);
    const button = $(".dialog-actions .button", form);
    button.disabled = true;
    try {
      const result = await api("/api/memories", { method: "POST", body: JSON.stringify(values) });
      await refreshArchive();
      form.reset();
      $("#memory-dialog").close();
      showToast("Your memory is safe in the archive.");
      openMemory(result.memory.id);
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
    }
  }

  async function deleteMemory(id) {
    const memory = state.memories.find(item => item.id === Number(id));
    if (!memory || !window.confirm(`Remove “${memory.title}” from this archive? This cannot be undone.`)) return;
    try {
      await api(`/api/memories/${memory.id}`, { method: "DELETE" });
      $("#detail-dialog").close();
      state.motif = "";
      await refreshArchive();
      showToast("That story has been removed from this device.");
    } catch (error) { showToast(error.message); }
  }

  async function importArchive(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || !Array.isArray(parsed.memories) || parsed.memories.length > 2000) throw new Error("Choose an Afterlight JSON archive with up to 2,000 memories.");
      if (!window.confirm(`Import ${parsed.memories.length} memories? This replaces the archive currently on this computer. Export a backup first if you need it.`)) return;
      const result = await api("/api/import", { method: "POST", body: JSON.stringify({ memories: parsed.memories }) });
      state.person = ""; state.motif = "";
      await refreshArchive();
      showToast(`${result.imported} memories imported to this device.`);
    } catch (error) { showToast(error.message || "That archive could not be read."); }
    finally { $("#import-file").value = ""; }
  }

  document.addEventListener("click", event => {
    const nav = event.target.closest("[data-nav]");
    if (nav) { event.preventDefault(); navigate(nav.dataset.nav); return; }
    const person = event.target.closest("[data-person]");
    if (person) {
      state.person = person.dataset.person;
      state.motif = "";
      renderPeople(); renderMemoryGrid();
      navigate("archive");
      return;
    }
    const prompt = event.target.closest("[data-prompt]");
    if (prompt) { setPrompt(prompt.dataset.prompt); return; }
    const motif = event.target.closest("[data-motif]");
    if (motif) {
      state.person = "";
      state.motif = state.motif === motif.dataset.motif ? "" : motif.dataset.motif;
      $("#memory-search").value = "";
      renderPeople(); renderMemoryGrid(); renderMotifs();
      navigate("archive");
      return;
    }
    const record = event.target.closest("[data-open-memory]");
    if (record) { openMemory(record.dataset.openMemory); return; }
    if (event.target.closest("[data-open-add]")) { openAddDialog(); return; }
    const deleteButton = event.target.closest("[data-delete-memory]");
    if (deleteButton) { deleteMemory(deleteButton.dataset.deleteMemory); return; }
    if (event.target.closest("[data-close-detail]")) $("#detail-dialog").close();
  });

  document.addEventListener("keydown", event => {
    const card = event.target.closest(".memory-card[role=button]");
    if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openMemory(card.dataset.openMemory); }
  });

  $("#ask-form").addEventListener("submit", submitQuestion);
  $("#memory-search").addEventListener("input", renderMemoryGrid);
  $("#add-memory-button").addEventListener("click", openAddDialog);
  $("#close-memory-dialog").addEventListener("click", () => $("#memory-dialog").close());
  $("#memory-form").addEventListener("submit", saveMemory);
  $("#export-button").addEventListener("click", () => { window.location.href = "/api/export"; showToast("A copy of your archive is ready to save."); });
  $("#import-button").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", event => importArchive(event.target.files[0]));
  $("#model-select").addEventListener("change", event => {
    state.selectedModel = event.target.value;
    if (state.selectedModel) localStorage.setItem("afterlight.model", state.selectedModel);
    renderStatus();
    showToast(state.selectedModel ? `${state.selectedModel} will hold the lantern.` : "The archive remains available without a model.");
  });
  $("#demo-banner-dismiss").addEventListener("click", () => $("#demo-banner").classList.add("hidden"));
  window.addEventListener("resize", () => {
    if (state.view === "connections") renderConstellation((state.summary.motifs || []).slice(0, 8));
  });

  Promise.all([refreshArchive(), refreshStatus()]).catch(error => {
    console.error("Afterlight could not load the local archive:", error);
    showToast("The local archive could not load. Restart Afterlight and try again.");
  });
})();
