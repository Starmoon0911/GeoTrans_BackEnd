// bump-version.ts
import fs from "fs";
import path from "path";

const versionPath = path.resolve("version.json");
const versionData = JSON.parse(fs.readFileSync(versionPath, "utf-8"));

const [major, minor, patch] = versionData.version.split(".").map(Number);

const type = process.argv[2]; // "major" | "minor" | "patch"
if (!["major", "minor", "patch"].includes(type)) {
  console.error("請輸入版本類型：major、minor 或 patch");
  process.exit(1);
}

let newVersion = "";
if (type === "major") {
  newVersion = `${major + 1}.0.0`;
} else if (type === "minor") {
  newVersion = `${major}.${minor + 1}.0`;
} else {
  newVersion = `${major}.${minor}.${patch + 1}`;
}

versionData.version = newVersion;
versionData.changelog.unshift({
  version: newVersion,
  date: new Date().toISOString().slice(0, 10),
  description: "版本更新內容請補上"
});

fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2), "utf-8");
console.log(`版本已更新為 ${newVersion}`);
console.log("請至version.json補上更新內容")
