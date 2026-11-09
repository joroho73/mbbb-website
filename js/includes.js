// This script dynamically loads the header and footer includes into the page.
async function loadIncludes() {
  const includes = [
    ["#site-header", "/includes/header.html"],
    ["#site-footer", "/includes/footer.html"]
  ];

  try {
    for (const [selector, path] of includes) {
      const placeholder = document.querySelector(selector);

      if (!placeholder) {
        throw new Error(`Placeholder not found: ${selector}`);
      }

      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(`Could not load ${path}: ${response.status}`);
      }

      placeholder.outerHTML = await response.text();
    }
  } catch (error) {
    console.error("Could not load the shared page includes:", error);
  }
}

// Menu toggle functionality
async function setupMenuToggle() {
  const menuToggle = document.querySelector(".menu-toggle");
  const siteHeader = document.querySelector(".site-header");

  if (!menuToggle || !siteHeader) {
    console.error("Menu button or site header not found.");
    return;
  }

  menuToggle.addEventListener("click", () => {
    const isOpen = siteHeader.classList.toggle("menu-open");
    menuToggle.setAttribute("aria-expanded", isOpen);
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });

  siteHeader.querySelectorAll("#main-navigation a, .header-cta").forEach((link) => {
  link.addEventListener("click", () => {
    siteHeader.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
  });
});
}

function updateActiveNavigation() {
  const normalisePath = path =>
    path.replace(/\/index\.html$/, "/").replace(/\/+$/, "") || "/";

  const currentPath = normalisePath(window.location.pathname);
  const currentHash = window.location.hash;

  document.querySelectorAll(".site-header nav a").forEach(link => {
    const destination = new URL(link.href, window.location.href);

    link.removeAttribute("aria-current");

    if (
      destination.origin !== window.location.origin ||
      normalisePath(destination.pathname) !== currentPath
    ) {
      return;
    }

    if (destination.hash) {
      if (destination.hash === currentHash) {
        link.setAttribute("aria-current", "location");
      }
    } else if (
      currentPath !== "/" ||
      !currentHash ||
      currentHash === "#top" ||
      currentHash === "#home"
    ) {
      link.setAttribute("aria-current", "page");
    }
  });
}

loadIncludes().then(() => {
  setupMenuToggle();
  updateActiveNavigation();
});

window.addEventListener("hashchange", updateActiveNavigation);
