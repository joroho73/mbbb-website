async function loadFeaturedTestimonials() {
  const section = document.querySelector("#testimonials");
  const container = document.querySelector("#featured-testimonial");

  if (!section || !container) return;

  const quote = document.querySelector("#featured-testimonial-text");
  const reviewer = document.querySelector("#featured-testimonial-reviewer");
  const fullLink = document.querySelector("#featured-testimonial-link");

  try {
    const contentBase = await window.getContentBase();
    const manifestResponse = await fetch(
      `${contentBase}/testimonials/testimonials.json`
    );

    if (!manifestResponse.ok) {
      throw new Error(`Could not load manifest: ${manifestResponse.status}`);
    }

    const filenames = await manifestResponse.json();

    if (
      !Array.isArray(filenames) ||
      !filenames.every((filename) => typeof filename === "string")
    ) {
      throw new Error("The testimonials manifest must be a list of filenames.");
    }

    const records = await Promise.all(
      filenames.map(async (filename) => {
        const response = await fetch(
          `${contentBase}/testimonials/${encodeURIComponent(filename)}`
        );

        if (!response.ok) {
          throw new Error(`Could not load ${filename}: ${response.status}`);
        }

        const review = jsyaml.load(await response.text(), {
          schema: jsyaml.CORE_SCHEMA
        });

        return { filename, review };
      })
    );

    const featured = records.filter(({ review }) =>
      review &&
      review.published === true &&
      review.featured === true &&
      typeof review.review_text === "string" &&
      review.review_text.trim() &&
      typeof review.reviewer === "string" &&
      review.reviewer.trim()
    );

    // The "View all testimonials" link remains if there are no featured reviews.
    if (!featured.length) return;

    const currentIndex = Math.floor(Math.random() * featured.length);

       function showTestimonial(index) {
      const { filename, review } = featured[index];

      const firstParagraph = review.review_text
        .trim()
        .split(/\r?\n\s*\r?\n/)[0]
        .replace(/\s+/g, " ")
        .trim();

      quote.textContent = firstParagraph;
      reviewer.textContent = review.reviewer;

      const anchor = filename.replace(/\.ya?ml$/i, "");

      fullLink.href = `/testimonials/#${encodeURIComponent(anchor)}`;
      fullLink.setAttribute(
        "aria-label",
        `Read the full testimonial from ${review.reviewer}`
      );
    }

    showTestimonial(Math.floor(Math.random() * featured.length));
    container.hidden = false;

  } catch (error) {
    console.error("Could not load featured testimonials:", error);
  }
}

loadFeaturedTestimonials();