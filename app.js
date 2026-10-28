const DEMO_ITEMS = [
  { videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", creator: "Sample video", caption: "Demo clip — connect an authorized feed API in Feed settings.", source: "demo" },
  { videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", creator: "Sample video", caption: "This is placeholder content to test the vertical scrolling feed.", source: "demo" }
];

const feedEl = document.querySelector("#feed");
const statusEl = document.querySelector("#status");
const settingsPanel = document.querySelector("#settingsPanel");
const endpointInput = document.querySelector("#endpointInput");
let items = [];
let saved = new Set(JSON.parse(localStorage.getItem("reelflow-saved") || "[]"));
let mode = "feed";

function esc(value="") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function normalizeItems(data) {
  const list = Array.isArray(data) ? data : (data.items || data.data || []);
  return list.map(x => ({
    videoUrl: x.videoUrl || x.video_url || x.url || "",
    embedUrl: x.embedUrl || x.embed_url || "",
    creator: x.creator || x.username || x.author || "Public video",
    caption: x.caption || x.title || "",
    source: x.source || "api",
    id: String(x.id || x.videoUrl || x.url || x.embedUrl || Math.random())
  })).filter(x => x.videoUrl.startsWith("https://") || x.embedUrl.startsWith("https://"));
}
async function loadFeed() {
  mode = "feed";
  feedEl.innerHTML = "";
  statusEl.textContent = "Loading feed…";
  const endpoint = localStorage.getItem("reelflow-endpoint") || "";
  endpointInput.value = endpoint;
  if (endpoint) {
    try {
      const response = await fetch(endpoint, { headers: { "Accept": "application/json" } });
      if (!response.ok) throw new Error("Feed API returned " + response.status);
      items = normalizeItems(await response.json());
      if (!items.length) throw new Error("No usable videos found in the API response.");
      document.querySelector("#setupNotice").classList.add("hidden");
      renderFeed(items);
      statusEl.textContent = `Loaded ${items.length} video(s).`;
      return;
    } catch (err) {
      statusEl.textContent = "Could not load the configured API: " + err.message + " — showing sample videos.";
    }
  } else {
    statusEl.textContent = "Demo mode — showing sample videos.";
  }
  items = DEMO_ITEMS.map((x, i) => ({ ...x, id: "demo-" + i }));
  document.querySelector("#setupNotice").classList.remove("hidden");
  renderFeed(items);
}
function renderFeed(list) {
  feedEl.innerHTML = "";
  if (!list.length) {
    feedEl.innerHTML = '<div class="empty">No videos here yet.</div>';
    return;
  }
  list.forEach((item, i) => {
    const card = document.createElement("article");
    card.className = "video-card";
    const isSaved = saved.has(item.id);
    const media = item.embedUrl
      ? `<iframe src="${esc(item.embedUrl)}" title="Embedded public video" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
      : `<video src="${esc(item.videoUrl)}" playsinline muted loop controls preload="metadata"></video>`;
    card.innerHTML = `${media}
      <div class="shade"></div>
      <div class="video-meta"><div class="creator">@${esc(item.creator)}</div><div class="caption">${esc(item.caption)}</div><span class="tag">${item.source === "demo" ? "DEMO VIDEO" : "PUBLIC VIDEO"}</span></div>
      <div class="actions"><button class="action-btn ${isSaved ? "saved" : ""}" aria-label="Save video">${isSaved ? "♥" : "♡"}</button><span class="action-label">${isSaved ? "Saved" : "Save"}</span></div>`;
    const saveBtn = card.querySelector(".action-btn");
    saveBtn.addEventListener("click", () => {
      if (saved.has(item.id)) saved.delete(item.id); else saved.add(item.id);
      localStorage.setItem("reelflow-saved", JSON.stringify([...saved]));
      saveBtn.classList.toggle("saved", saved.has(item.id));
      saveBtn.textContent = saved.has(item.id) ? "♥" : "♡";
      card.querySelector(".action-label").textContent = saved.has(item.id) ? "Saved" : "Save";
    });
    feedEl.appendChild(card);
  });
  setupAutoplay();
}
function setupAutoplay() {
  const videos = [...feedEl.querySelectorAll("video")];
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio > .65) video.play().catch(()=>{});
      else video.pause();
    });
  }, { threshold: [.2, .65, .9] });
  videos.forEach(v => observer.observe(v));
}
document.querySelector("#settingsBtn").addEventListener("click", () => settingsPanel.classList.toggle("hidden"));
document.querySelector("#closeSettings").addEventListener("click", () => settingsPanel.classList.add("hidden"));
document.querySelector("#saveEndpoint").addEventListener("click", () => {
  const value = endpointInput.value.trim();
  if (value && !value.startsWith("https://")) {
    alert("Please use an HTTPS endpoint.");
    return;
  }
  if (value) localStorage.setItem("reelflow-endpoint", value);
  else localStorage.removeItem("reelflow-endpoint");
  settingsPanel.classList.add("hidden");
  loadFeed();
});
document.querySelector("#refreshBtn").addEventListener("click", loadFeed);
document.querySelector("#savedNav").addEventListener("click", () => {
  mode = "saved";
  const list = items.filter(x => saved.has(x.id));
  renderFeed(list);
  statusEl.textContent = list.length ? "Your saved videos." : "Save a video using the heart icon to see it here.";
  document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
  document.querySelector("#savedNav").classList.add("active");
});
document.querySelector("#aboutNav").addEventListener("click", () => {
  alert("ReelFlow is an independent demo. It does not access Instagram's private APIs or reproduce Instagram's recommendation algorithm. To load videos automatically, configure a server endpoint that you are authorized to use.");
});
document.querySelector(".nav-item").addEventListener("click", () => {
  document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
  document.querySelector(".nav-item").classList.add("active");
  loadFeed();
});
loadFeed();
