async function loadTestimonials() {
  const container = document.querySelector("#testimonial-list");
  if (!container) return;

  try {
    // Read the list of YAML filenames.
    const contentBase = await window.getContentBase();
    const manifestResponse = await fetch(
      `${contentBase}/testimonials/testimonials.json`
    );

    if (!manifestResponse.ok) {
      throw new Error(
        `Could not load testimonials.json: ${manifestResponse.status}`
      );
    }

    const filenames = await manifestResponse.json();

    if (
      !Array.isArray(filenames) ||
      !filenames.every((name) => typeof name === "string")
    ) {
      throw new Error("testimonials.json must contain a list of filenames.");
    }

    // Load and parse each YAML file.
    const reviews = await Promise.all(
      filenames.map(async (filename) => {
        const response = await fetch(
          `${contentBase}/testimonials/${encodeURIComponent(filename)}`
        );

        if (!response.ok) {
          throw new Error(
            `Could not load ${filename}: ${response.status}`
          );
        }

        const review = jsyaml.load(await response.text(), {
          schema: jsyaml.CORE_SCHEMA
        });

        if (!review || typeof review.published !== "boolean") {
          throw new Error(`${filename}: published must be true or false.`);
        }

        if (review.published) {
          for (const field of ["reviewer", "review_text"]) {
            if (
              typeof review[field] !== "string" ||
              !review[field].trim()
            ) {
              throw new Error(`${filename}: ${field} is missing or empty.`);
            }
          }
        }

        return {
        ...review,
        anchor: filename.replace(/\.ya?ml$/i, "")
        };
      })
    );

    // Build everything before replacing the page content.
    const fragment = document.createDocumentFragment();

    for (const review of reviews.filter(
      (review) => review.published === true
    )) {
      const article = document.createElement("article");
      article.className = "testimonial";
      article.id = review.anchor;

      const blockquote = document.createElement("blockquote");

      // A blank line starts a new paragraph.
      const paragraphs = review.review_text
        .trim()
        .split(/\r?\n\s*\r?\n/);

      for (const paragraph of paragraphs) {
        const p = document.createElement("p");
        p.textContent = paragraph.trim();
        blockquote.appendChild(p);
      }

      const attribution = document.createElement("p");
      attribution.className = "testimonial-attribution";
      attribution.textContent = review.reviewer;

      article.append(blockquote, attribution);

      const metadata = [
        typeof review.source === "string" ? review.source.trim() : "",
        formatReviewDate(review.date)
      ].filter(Boolean);

      if (metadata.length) {
        const meta = document.createElement("p");
        meta.className = "testimonial-meta";
        meta.textContent = metadata.join(" · ");
        article.appendChild(meta);
      }

      fragment.appendChild(article);
    }

    if (!fragment.childElementCount) {
      const message = document.createElement("p");
      message.textContent = "No testimonials are available yet.";
      fragment.appendChild(message);
    }

    container.replaceChildren(fragment);

    // The testimonials load asynchronously, so scroll after they exist.
    if (window.location.hash) {
        const anchor = decodeURIComponent(window.location.hash.slice(1));
        const target = document.getElementById(anchor);

        if (target) {
            requestAnimationFrame(() => {
            target.scrollIntoView({ block: "start" });
            });
        }
    }

  } catch (error) {
    console.error("Could not load testimonials:", error);

    // Retain existing rendered reviews if a later reload fails.
    if (!container.querySelector(".testimonial")) {
      container.textContent =
        "Testimonials could not be loaded. Please try refreshing the page.";
    }
  }
}

function formatReviewDate(value) {
  if (!value) return "";

  // Accept YYYY-MM or YYYY-MM-DD; display only month and year.
  const match = String(value).match(
    /^(\d{4})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/
  );

  if (!match) {
    throw new Error(`Invalid testimonial date: ${value}`);
  }

  const date = new Date(`${match[1]}-${match[2]}-01T00:00:00Z`);

  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}

loadTestimonials();