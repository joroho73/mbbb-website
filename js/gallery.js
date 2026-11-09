/* Manifest: [{ "file": "photo.jpg", "alt": "Description", "caption": "Optional caption" }]
   Optional "thumbnail" names a smaller image in /assets/photos/.
   Order in the manifest determines gallery order. */
(() => {
  "use strict";

  const grid = document.getElementById("gallery-grid");
  const status = document.getElementById("gallery-status");
  const dialog = document.getElementById("gallery-lightbox");
  if (!grid || !status || !dialog) return;

  const fullImage = document.getElementById("gallery-full-image");
  const caption = document.getElementById("gallery-caption");
  const counter = document.getElementById("gallery-counter");
  const previous = document.getElementById("gallery-previous");
  const next = document.getElementById("gallery-next");
  const close = dialog.querySelector(".gallery-close");
  let photos = [];
  let current = 0;
  let opener = null;

  function imagePath(filename, contentBase) {
    if (typeof filename !== "string" || !filename.trim() ||
        /[\\/]/.test(filename) || !/\.(jpe?g|png|webp|avif|gif)$/i.test(filename)) {
      throw new Error("Each image must have a filename, such as band.jpg, without a folder path.");
    }
    return `${contentBase}/assets/gallery/${encodeURIComponent(filename)}`;
  }

  function showPhoto(index) {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    fullImage.alt = photo.alt;
    caption.textContent = photo.caption;
    counter.textContent = `${current + 1} of ${photos.length}`;
    fullImage.src = photo.src;
    previous.disabled = next.disabled = photos.length < 2;
  }

  fullImage.addEventListener("error", () => {
    caption.textContent = "This photograph could not be loaded. Please try another photograph.";
  });

  close.addEventListener("click", () => dialog.close());
  previous.addEventListener("click", () => showPhoto(current - 1));
  next.addEventListener("click", () => showPhoto(current + 1));
  dialog.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showPhoto(current + (event.key === "ArrowLeft" ? -1 : 1));
    }
    // Escape and focus containment are supplied by the native modal dialog.
  });
  dialog.addEventListener("click", event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog &&
        (event.clientX < bounds.left || event.clientX > bounds.right ||
         event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.documentElement.classList.remove("gallery-is-open");
    opener?.focus();
  });

  async function loadGallery() {
    try {
      const contentBase = await window.getContentBase();
      const response = await fetch(`${contentBase}/gallery/photos.json`);
      if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
      const records = await response.json();
      if (!Array.isArray(records)) throw new Error("photos.json must contain an array.");
      photos = records.map((record, index) => {
        if (!record || typeof record !== "object" || Array.isArray(record)) {
          throw new Error(`Invalid photo record ${index + 1}.`);
        }
        if (typeof record.alt !== "string" || !record.alt.trim()) {
          throw new Error(`Photo ${index + 1} needs an alt description.`);
        }
        return {
          src: imagePath(record.file, contentBase),
          thumbnail: imagePath(record.thumbnail || record.file, contentBase),
          alt: record.alt.trim(),
          caption: [
            typeof record.caption === "string" ? record.caption.trim() : "",
            typeof record.photographer === "string" && record.photographer.trim()
              ? `Photo: ${record.photographer.trim()}`
              : ""
          ].filter(Boolean).join(" — ")
        };
      });

      // Shuffle photographs each time the gallery loads.
      for (let i = photos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [photos[i], photos[j]] = [photos[j], photos[i]];
      }

      const fragment = document.createDocumentFragment();

      photos.forEach((photo, index) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.className = "gallery-thumbnail";
        link.href = photo.src;
        link.setAttribute("aria-label", `Enlarge photograph: ${photo.alt}`);
        const img = document.createElement("img");
        img.src = photo.thumbnail;
        img.alt = photo.alt;
        img.loading = "lazy";
        img.decoding = "async";
        img.addEventListener("error", () => {
          const message = document.createElement("span");
          message.className = "gallery-image-error";
          message.textContent = `Photograph unavailable: ${photo.alt}`;
          img.replaceWith(message);
        }, { once: true });
        link.append(img);
        link.addEventListener("click", event => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
              typeof dialog.showModal !== "function") return;
          event.preventDefault();
          opener = link;
          showPhoto(index);
          dialog.showModal();
          document.documentElement.classList.add("gallery-is-open");
        });
        item.append(link);
        fragment.append(item);
      });
      grid.replaceChildren(fragment);
      status.textContent = photos.length ? "" : "Photographs will be added soon.";
      status.hidden = photos.length > 0;
    } catch (error) {
      console.error("Could not load the photo gallery:", error);
      status.hidden = false;
      status.textContent = "The photographs could not be loaded. Please try again later.";
    }
  }
  loadGallery();
})();
