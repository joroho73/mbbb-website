(() => {
  "use strict";

  const hero = document.getElementById("homepage-hero-image");
  if (!hero) return;

  async function loadHomepageImage() {
    try {
      const response = await fetch("/gallery/photos.json", {
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
        /^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(jpe?g|png|webp)$/i.test(photo.file) &&
        typeof photo.alt === "string" &&
        photo.alt.trim()
      );

      if (!candidates.length) return;

      const selected = candidates[
        Math.floor(Math.random() * candidates.length)
      ];

      const source =
        `/assets/gallery/${encodeURIComponent(selected.file)}`;

      // Download and decode before replacing the fallback photograph.
      const preload = new Image();
      preload.src = source;
      await preload.decode();

      hero.alt = selected.alt.trim();
      hero.src = source;
    } catch (error) {
      // Leave the original hero photograph in place.
      console.warn("Could not load a homepage photograph:", error);
    }
  }

  loadHomepageImage();
})();