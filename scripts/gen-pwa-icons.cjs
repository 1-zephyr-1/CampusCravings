// Generate PWA PNG icons from public/icon.svg using sharp (already in node_modules).
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "..", "public");
const svgPath = path.join(publicDir, "icon.svg");

const targets = [
  { out: "icon-192.png", size: 192 },
  { out: "icon-512.png", size: 512 },
  { out: "apple-touch-icon.png", size: 180 },
];

(async () => {
  const svg = fs.readFileSync(svgPath);
  for (const { out, size } of targets) {
    const outPath = path.join(publicDir, out);
    await sharp(svg)
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`Wrote ${out} (${size}x${size}) — ${stat.size} bytes`);
  }
})().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
