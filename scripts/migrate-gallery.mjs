import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const recordsDirectory = path.join(root, "gallery/photos");

async function migrateGallery() {
  await fs.mkdir(recordsDirectory, { recursive: true });

  const existingImages = new Set();

  for (const filename of await fs.readdir(recordsDirectory)) {
    if (!/\.ya?ml$/i.test(filename)) continue;

    const source = await fs.readFile(
      path.join(recordsDirectory, filename),
      "utf8"
    );

    const record = yaml.load(source, {
      schema: yaml.CORE_SCHEMA
    });

    if (typeof record?.image === "string") {
      existingImages.add(record.image.trim());
    }
  }

  const manifest = JSON.parse(
    await fs.readFile(
      path.join(root, "gallery/photos.json"),
      "utf8"
    )
  );

  if (!Array.isArray(manifest)) {
    throw new Error("gallery/photos.json must contain an array.");
  }

  // Validate the filenames before creating any records.
  for (const photo of manifest) {
    if (
      typeof photo?.file !== "string" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(jpe?g|png|webp)$/i.test(
        photo.file
      )
    ) {
      throw new Error(`Unsupported photo filename: ${photo?.file}`);
    }
  }

  let created = 0;
  let skipped = 0;

  for (const photo of manifest) {
    const image = `/assets/gallery/${photo.file}`;

    // Preserve records already created through Pages CMS.
    if (existingImages.has(image)) {
      skipped++;
      continue;
    }

    const record = {
      title: `Gallery photo ${photo.file}`,
      image,
      alt: typeof photo.alt === "string" ? photo.alt : "",
      caption: typeof photo.caption === "string" ? photo.caption : "",
      photographer: "",
      use_on_homepage: false,
      published: true
    };

    // Include the image extension to avoid collisions between
    // photographs such as concert.jpg and concert.png.
    const destination = path.join(
      recordsDirectory,
      `${photo.file}.yml`
    );

    await fs.writeFile(
      destination,
      yaml.dump(record, {
        lineWidth: -1,
        noRefs: true
      }),
      { flag: "wx" }
    );

    existingImages.add(image);
    created++;
  }

  console.log(
    `Created ${created} photo records; skipped ${skipped} existing records.`
  );
}

migrateGallery().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});