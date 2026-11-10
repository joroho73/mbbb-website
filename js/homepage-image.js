(() => {
  "use strict";

  const hero = document.getElementById("homepage-hero-image");
  if (!hero) return;

  async function loadHomepageImage() {
    try {
      const contentBase = await window.getContentBase();

      const response = await fetch(`${contentBase}/gallery/photos.json`, {
        cache: "no-cache"
      });

      if (!response.ok) {
        throw new Error(`Photo manifest request failed: ${response.status}`);
      }

      const records = await response.json();

      if (!Array.isArray(records)) {
        throw new Error("Photo manifest must contain an array.");
      }

      const candidates = records.filter(photo =>
        photo &&
        photo.published === true &&
        photo.use_on_homepage === true &&
        typeof photo.file === "string" &&
        /^[a-zA-Z0-9][a-zA-Z0-9_. -]*\.(jpe?g|png|webp)$/i.test(photo.file) &&
        typeof photo.alt === "string" &&
        photo.alt.trim()
      );

      if (!candidates.length) return;

      const selected = candidates[
        Math.floor(Math.random() * candidates.length)
      ];

      const source = `${contentBase}/assets/gallery/${encodeURIComponent(selected.file)}`;

      // Download and decode before replacing the fallback photograph.
      const preload = new Image();
      preload.src = source;
      await preload.decode();

      // If the fallback is already visible, keep it for this page load.
      if (!document.documentElement.classList.contains("homepage-image-pending")) {
        return;
      }

      hero.alt = selected.alt.trim();
      hero.src = source;
    } catch (error) {
      console.warn("Could not load a homepage photograph:", error);
    } finally {
      document.documentElement.classList.remove("homepage-image-pending");
    }
  }

  loadHomepageImage();
})();