(() => {
  "use strict";

  const requiredFields = [
    "title",
    "date",
    "start_time",
    "venue"
  ];

  const optionalFields = [
    "location",
    "running_time",
    "description",
    "ticket_url",
    "ticket_price"
  ];

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  }

  // Use the UK calendar date, regardless of the visitor's timezone.
  function getToday() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const values = Object.fromEntries(
      parts.map(part => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}`;
  }

  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T12:00:00Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }

  function validateGig(record, filename) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`${filename}: expected a YAML record.`);
    }

    if (typeof record.published !== "boolean") {
      throw new Error(`${filename}: published must be true or false.`);
    }

    // Unpublished drafts may contain incomplete information.
    if (!record.published) return null;

    const gig = { ...record };

    for (const field of requiredFields) {
      if (typeof gig[field] !== "string" || !gig[field].trim()) {
        throw new Error(`${filename}: ${field} is required.`);
      }

      gig[field] = gig[field].trim();
    }

    if (!isValidDate(gig.date)) {
      throw new Error(`${filename}: date must be a valid YYYY-MM-DD date.`);
    }

    for (const field of optionalFields) {
      if (gig[field] === undefined || gig[field] === null) {
        gig[field] = "";
      }

      if (typeof gig[field] !== "string") {
        throw new Error(`${filename}: ${field} must be text.`);
      }

      gig[field] = gig[field].trim();
    }

    if (gig.ticket_url) {
      let url;

      try {
        url = new URL(gig.ticket_url);
      } catch {
        throw new Error(`${filename}: ticket_url must be a complete URL.`);
      }

      if (!["https:", "http:"].includes(url.protocol)) {
        throw new Error(`${filename}: ticket_url must use HTTPS or HTTP.`);
      }
    }

    gig.anchor = filename.replace(/\.ya?ml$/i, "");

    return gig;
  }

  async function fetchFile(path, format) {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Could not load ${path}: ${response.status}`);
    }

    return format === "json" ? response.json() : response.text();
  }

  async function loadGigs() {
    if (!window.jsyaml) {
      throw new Error("The YAML parser has not loaded.");
    }

    const contentBase = await window.getContentBase();
    const filenames = await fetchFile(
      `${contentBase}/gigs/gigs.json`,
      "json"
    );

    if (
      !Array.isArray(filenames) ||
      !filenames.every(filename =>
        typeof filename === "string" &&
        /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.ya?ml$/i.test(filename)
      ) ||
      new Set(filenames).size !== filenames.length
    ) {
      throw new Error("gigs.json must contain a list of unique YAML filenames.");
    }

    const records = await Promise.all(
      filenames.map(async filename => {
        const yaml = await fetchFile(
          `${contentBase}/gigs/${encodeURIComponent(filename)}`,
          "text"
        );

        // Keeps dates as strings instead of converting them into Date objects.
        const record = window.jsyaml.load(yaml, {
          schema: window.jsyaml.CORE_SCHEMA
        });

        return validateGig(record, filename);
      })
    );

    return records
      .filter(Boolean)
      .sort((a, b) =>
        a.date.localeCompare(b.date) ||
        a.title.localeCompare(b.title) ||
        a.anchor.localeCompare(b.anchor)
      );
  }

  function createDate(gig) {
    const time = createElement("time");
    time.dateTime = gig.date;

    const date = new Date(`${gig.date}T12:00:00Z`);

    const month = new Intl.DateTimeFormat("en-GB", {
      month: "short",
      timeZone: "UTC"
    }).format(date);

    time.append(
      createElement("strong", "", String(Number(gig.date.slice(8, 10)))),
      createElement("span", "", `${month} · ${gig.date.slice(0, 4)}`)
    );

    return time;
  }

  function createFullCard(gig, isPast) {
    const article = createElement("article", "gig-card gig-card--full");
    article.id = gig.anchor;

    const details = createElement("div");

    details.append(
      createElement("h3", "", gig.title),
      createElement("p", "gig-venue", gig.venue),
      createElement("p", "gig-start-time", gig.start_time)
    );

    if (gig.location) {
      const address = createElement("p", "gig-location");
      const mapLink = createElement("a", "gig-map-link");

      mapLink.href =
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gig.location)}`;
      mapLink.target = "_blank";
      mapLink.rel = "noopener noreferrer";
      mapLink.setAttribute(
        "aria-label",
        `${gig.location} — view on Google Maps (opens in a new tab)`
      );

      const text = createElement("span", "", gig.location);
      const icon = createElement("span", "gig-map-icon", " ↗");
      icon.setAttribute("aria-hidden", "true");

      mapLink.append(text, icon);
      address.append(mapLink);
      details.append(address);
    }

    if (gig.description) {
      const description = createElement("div", "gig-description");

      for (const paragraph of gig.description.split(/\r?\n\s*\r?\n/)) {
        if (paragraph.trim()) {
          description.append(
            createElement("p", "", paragraph.trim())
          );
        }
      }

      details.append(description);
    }

    if (gig.running_time) {
      details.append(createElement("p", "gig-running-time", gig.running_time));
    }

    if (gig.ticket_price) {
      details.append(
        createElement("p", "gig-price", `Tickets: ${gig.ticket_price}`)
      );
    }

    // Keep historical details, but do not promote expired ticket links.
    if (gig.ticket_url && !isPast) {
      const link = createElement(
        "a",
        "button button-highlight gig-ticket-button",
        "Book tickets "
      );
      link.href = gig.ticket_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute(
        "aria-label",
        `Book tickets for ${gig.title} (opens in a new tab)`
      );

      const arrow = createElement("span", "", "↗");
      arrow.setAttribute("aria-hidden", "true");
      link.append(arrow);

      details.append(link);
      } else if (!isPast) {
      details.append(
        createElement("p", "gig-ticket-status", "Tickets coming soon")
      );
    }

    article.append(createDate(gig), details);

    return article;
  }

  function createHomeCard(gig) {
    const article = createElement("article", "gig-card");
    const details = createElement("div");
    const heading = createElement("h3");

    const href = `/gigs/#${encodeURIComponent(gig.anchor)}`;
    const titleLink = createElement("a", "", gig.title);
    titleLink.href = href;

    heading.append(titleLink);

    details.append(
      heading,
      createElement("p", "", gig.venue),
      createElement("p", "", gig.start_time)
    );

    const arrow = createElement("a", "circle-arrow", "↗");
    arrow.href = href;
    arrow.setAttribute("aria-label", `View details for ${gig.title}`);

    article.append(createDate(gig), details, arrow);

    return article;
  }

  function renderList(container, gigs, createCard, emptyMessage) {
    const content = document.createDocumentFragment();

    if (gigs.length) {
      gigs.forEach(gig => content.append(createCard(gig)));
    } else {
      content.append(createElement("p", "gig-message", emptyMessage));
    }

    container.replaceChildren(content);
  }

  function scrollToGig() {
    if (!window.location.hash) return;

    try {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = document.getElementById(id);

      if (target?.matches(".gig-card--full")) {
        requestAnimationFrame(() => {
          target.scrollIntoView({ block: "start" });
        });
      }
    } catch {
      // Ignore malformed URL fragments.
    }
  }

  async function initialiseGigs() {
    const upcomingContainer = document.getElementById("upcoming-gigs");
    const pastContainer = document.getElementById("past-gigs");
    const homeContainer = document.getElementById("homepage-gigs");

    const containers = [
      upcomingContainer,
      pastContainer,
      homeContainer
    ].filter(Boolean);

    if (!containers.length) return;

    try {
      const gigs = await loadGigs();
      const today = getToday();

      const upcoming = gigs.filter(gig => gig.date >= today);
      const past = gigs.filter(gig => gig.date < today).reverse();

      if (upcomingContainer) {
        renderList(
          upcomingContainer,
          upcoming,
          gig => createFullCard(gig, false),
          "New performances will be announced soon. Please check back."
        );
      }

      if (pastContainer) {
        renderList(
          pastContainer,
          past,
          gig => createFullCard(gig, true),
          "There are no past performances listed yet."
        );
      }

      if (homeContainer) {
        renderList(
          homeContainer,
          upcoming.slice(0, 3),
          createHomeCard,
          "New performances will be announced soon. Please check back."
        );
      }

      scrollToGig();
      window.addEventListener("hashchange", scrollToGig);
    } catch (error) {
      console.error("Could not load gigs:", error);

      containers.forEach(container => {
        container.replaceChildren(
          createElement(
            "p",
            "gig-message",
            "Performance details could not be loaded. Please refresh the page or contact us."
          )
        );
      });
    }
  }

  initialiseGigs();
})();