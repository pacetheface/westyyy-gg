(function () {
  const config = window.SITE_CONFIG;
  if (!config) {
    document.documentElement.dataset.ready = "true";
    return;
  }

  const handlePattern = /^[A-Za-z0-9_]{2,32}$/;
  const basePattern = /^https:\/\/[a-z0-9.-]+\/@?$/;

  if (Array.isArray(config.social)) {
    for (const item of config.social) {
      if (!item || typeof item.id !== "string") continue;
      const link = document.querySelector('[data-social="' + item.id + '"]');
      if (!link) continue;
      if (typeof item.handle !== "string" || !handlePattern.test(item.handle)) continue;
      if (typeof item.base !== "string" || !basePattern.test(item.base)) continue;
      link.href = item.base + item.handle;
      const handleNode = link.querySelector("[data-handle]");
      if (handleNode) handleNode.textContent = item.handle;
    }
  }

  const email = typeof config.email === "string" ? config.email.trim() : "";
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    document.querySelectorAll("[data-email]").forEach(function (node) {
      node.textContent = email;
      if (node.tagName === "A") node.href = "mailto:" + email;
    });
  }

  document.documentElement.dataset.ready = "true";
})();
