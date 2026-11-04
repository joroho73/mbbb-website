(() => {
  "use strict";

  let contentBasePromise;

  window.getContentBase = function () {
    if (!contentBasePromise) {
      contentBasePromise = resolveContentBase();
    }

    return contentBasePromise;
  };

  async function resolveContentBase() {
    const localHosts = ["localhost", "127.0.0.1", "[::1]"];

    // Live Server uses the YAML files in your local repository.
    if (localHosts.includes(window.location.hostname)) {
      return "";
    }

    const response = await fetch("/content/current.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Could not load the current content release: ${response.status}`
      );
    }

    const metadata = await response.json();

    if (
      !metadata ||
      typeof metadata.release !== "string" ||
      !/^[1-9]\d*-[a-f0-9]{40}$/.test(metadata.release)
    ) {
      throw new Error("Invalid content release identifier.");
    }

    return `/content/releases/${metadata.release}`;
  }
})();