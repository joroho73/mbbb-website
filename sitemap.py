import subprocess
from pathlib import Path
import xml.etree.ElementTree as ET

pages = [
    ("/",              "weekly",  ["index.html", "gigs/*.yml", "testimonials/*.yml"]),
    ("/gigs/",         "weekly",  ["gigs/index.html", "gigs/*.yml"]),
    ("/gallery/",      "weekly",  ["gallery/index.html", "gallery/photos/*.yml", "assets/gallery/"]),
    ("/testimonials/", "monthly", ["testimonials/index.html", "testimonials/*.yml"]),
    ("/privacy.html",  "yearly",  ["privacy.html"]),
    ("/terms.html",    "yearly",  ["terms.html"]),
]

root = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

for path, frequency, files in pages:
    lastmod = subprocess.check_output(
        ["git", "log", "-1", "--format=%cs", "--", *files], text=True
    ).strip()
    if not lastmod:
        raise SystemExit(f"No Git date found for {path}; sitemap was not written.")

    url = ET.SubElement(root, "url")
    ET.SubElement(url, "loc").text = "https://www.mbbb.co.uk" + path
    ET.SubElement(url, "lastmod").text = lastmod
    ET.SubElement(url, "changefreq").text = frequency

ET.indent(root, space="  ")
xml = ET.tostring(root, encoding="utf-8", xml_declaration=True)
Path("sitemap.xml").write_bytes(xml + b"\n")
print('sitemap.xml written successfully.')