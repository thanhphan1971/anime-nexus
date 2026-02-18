import fs from "fs";
import path from "path";
import sharp from "sharp";

const dir = "attached_assets/generated_images";
const quality = 75;

if (!fs.existsSync(dir)) {
  console.error("Directory not found:", dir);
  process.exit(1);
}

const files = fs
  .readdirSync(dir)
  .filter((f) => f.toLowerCase().endsWith(".png"));

if (files.length === 0) {
  console.log("No PNG files found in", dir);
  process.exit(0);
}

for (const file of files) {
  const input = path.join(dir, file);
  const output = path.join(dir, file.replace(/\.png$/i, ".webp"));

  console.log("Converting:", file);

  await sharp(input)
    .webp({ quality })
    .toFile(output);
}

console.log("\nDone. WebP quality =", quality);
