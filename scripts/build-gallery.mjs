import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const sourceDirectory = path.join(root, "gallery/photos");
const args = process.argv.slice(2);

if (
  args.length !== 0 &&
  !(args.length === 2 && args[0] === "--stage" && args[1])
) {
  throw new Error(
    "Usage: node scripts/build-gallery.mjs [--stage NEW_DIRECTORY]"
  );
}

const stageDirectory = args.length
  ? path.resolve(root, args[1])
  : null;

const destination = path.join(
  stageDirectory || root,
  "gallery/photos.json"
);

async function buildGallery() {
  const entries = await fs.readdir(sourceDirectory, {
    withFileTypes: true
  });

  const photos = [];
  const errors = [];

  for (const entry of entries.sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    if (!/\.ya?ml$/i.test(entry.name)) continue;

    try {
      if (!entry.isFile()) {
        throw new Error("Photo records must be regular files.");
      }

      const source = await fs.readFile(
        path.join(sourceDirectory, entry.name),
        "utf8"
      );

      const record = yaml.load(source, {
        schema: yaml.CORE_SCHEMA
      });

      if (!record || typeof record !== "object" ||
          Array.isArray(record)) {
        throw new Error("Expected a YAML record.");
      }

      if (typeof record.published !== "boolean") {
        throw new Error("published must be true or false.");
      }

      // Unpublished records do not appear in the generated manifest.
      if (!record.published) continue;

      for (const field of ["title", "image"]) {
        if (typeof record[field] !== "string" ||
            !record[field].trim()) {
          throw new Error(`${field} is required.`);
        }
      }

      if (typeof record.use_on_homepage !== "boolean") {
        throw new Error("use_on_homepage must be true or false.");
      }

      for (const field of ["caption", "photographer", "alt"]) {
        if (record[field] != null &&
            typeof record[field] !== "string") {
          throw new Error(`${field} must be text.`);
        }
      }

      const image = record.image.trim();

      // Accept an image directly inside our gallery image folder.
      const match = image.match(  
        /^\/assets\/gallery\/([a-zA-Z0-9][a-zA-Z0-9_. -]*\.(?:jpe?g|png|webp))$/i
      );

      if (!match) {
        throw new Error(
          "image must point to a JPG, PNG or WebP in /assets/gallery/."
        );
      }

      const imageFile = path.join(root, "assets/gallery", match[1]);
      const imageInfo = await fs.lstat(imageFile);

      if (!imageInfo.isFile()) {
        throw new Error("The selected image must be a regular file.");
      }

      // Prefer Description; preserve older records until they are updated.
      const description =
        record.caption?.trim() ||
        record.alt?.trim() ||
        record.title.trim();

      photos.push({
        title: record.title.trim(),
        file: match[1],
        alt: description,
        caption: description,
        photographer: (record.photographer ?? "").trim(),
        use_on_homepage: record.use_on_homepage,
        published: true
      });
    } catch (error) {
      errors.push(`${entry.name}: ${error.message}`);
    }
  }

  if (errors.length) {
    throw new Error(
      `Gallery validation failed:\n${errors.join("\n")}\n` +
      "No manifest was written."
    );
  }

  if (stageDirectory) {
  // Require a fresh directory so old photographs cannot remain.
  await fs.mkdir(stageDirectory);

  await fs.mkdir(path.join(stageDirectory, "gallery"));
  await fs.mkdir(
    path.join(stageDirectory, "assets/gallery"),
    { recursive: true }
  );

  // One image may be referenced by more than one photo record.
  const filenames = new Set(photos.map(photo => photo.file));

  for (const filename of filenames) {
    await fs.copyFile(
      path.join(root, "assets/gallery", filename),
      path.join(stageDirectory, "assets/gallery", filename)
    );
  }
}

  const temporary = `${destination}.tmp`;

  try {
    await fs.writeFile(
      temporary,
      JSON.stringify(photos, null, 2) + "\n"
    );

    await fs.rename(temporary, destination);
  } finally {
    await fs.rm(temporary, { force: true });
  }

  console.log(
    stageDirectory
      ? `Staged ${photos.length} published photographs in ${stageDirectory}. Nothing deployed.`
      : `Generated gallery/photos.json: ${photos.length} published photographs.`
  );
}

buildGallery().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});