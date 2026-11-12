#!/usr/bin/env python3
"""Package staged text content and gallery images for publication."""

import argparse
import base64
import json
import re
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--content", required=True)
    parser.add_argument("--gallery", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--sequence", required=True, type=int)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    if not re.fullmatch(r"[0-9a-f]{40}", args.commit):
        raise ValueError("Commit must be a full Git commit SHA.")

    if args.sequence < 1:
        raise ValueError("Sequence must be positive.")

    content = Path(args.content)
    gallery = Path(args.gallery)
    files = {}
    images = {}

    for collection in ("gigs", "testimonials"):
        manifest = f"{collection}/{collection}.json"
        text = (content / manifest).read_text(encoding="utf-8")
        names = json.loads(text)

        if not isinstance(names, list):
            raise ValueError(f"Invalid manifest: {manifest}")

        files[manifest] = text

        for name in names:
            if (
                not isinstance(name, str)
                or "/" in name
                or "\\" in name
                or not re.fullmatch(
                    r"[A-Za-z0-9][A-Za-z0-9_ &-]*\.ya?ml",
                    name,
                    re.IGNORECASE,
                )
            ):
                raise ValueError(f"Invalid YAML filename: {name}")

            relative = f"{collection}/{name}"
            files[relative] = (content / relative).read_text(
                encoding="utf-8"
            )

    gallery_manifest = "gallery/photos.json"
    text = (gallery / gallery_manifest).read_text(encoding="utf-8")
    photos = json.loads(text)

    if not isinstance(photos, list):
        raise ValueError("Gallery manifest must contain an array.")

    files[gallery_manifest] = text

    for photo in photos:
        if not isinstance(photo, dict):
            raise ValueError("Invalid gallery record.")

        filename = photo.get("file")

        if (
            not isinstance(filename, str)
            or not re.fullmatch(
                r"[A-Za-z0-9][A-Za-z0-9_. -]*\.(?:jpe?g|png|webp)",
                filename,
                re.IGNORECASE,
            )
        ):
            raise ValueError(f"Invalid image filename: {filename}")

        relative = f"assets/gallery/{filename}"
        image_path = gallery / relative

        if image_path.is_symlink() or not image_path.is_file():
            raise ValueError(f"Expected a regular image file: {relative}")

        data = image_path.read_bytes()

        if not data or len(data) > 5 * 1024 * 1024:
            raise ValueError(
                f"Image must be non-empty and at most 5 MiB: {filename}"
            )

        images[relative] = base64.b64encode(data).decode("ascii")

    bundle = {
        "version": 2,
        "commit": args.commit,
        "sequence": args.sequence,
        "files": files,
        "images": images,
    }

    payload = json.dumps(
        bundle, ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")

    if len(payload) > 32 * 1024 * 1024:
        raise ValueError("Upload package exceeds 32 MiB.")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(payload)

    print(
        f"Prepared {len(files)} text files and {len(images)} images."
    )
    print(f"Package size: {len(payload) / (1024 * 1024):.2f} MiB")
    print(f"Saved {output}. Nothing deployed.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        raise SystemExit(f"Packaging failed: {error}") from error