// deployToFirebase.js
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const __dirname = path.resolve();
// 날짜 폴더 제거 (현재 구조에 맞춤)
const src = path.join(__dirname, "seo-batch", "output");
const dest = path.join(__dirname, "public", "seo");

// 1. 기존 seo 폴더 비우기
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

// 2. output 폴더 내 파일 복사
if (!fs.existsSync(src)) {
  console.error(`❌ Source folder not found: ${src}`);
  process.exit(1);
}

const files = fs.readdirSync(src);
if (files.length === 0) {
  console.error(`⚠️ No files found in ${src}`);
  process.exit(1);
}

for (const file of files) {
  const srcPath = path.join(src, file);
  const destPath = path.join(dest, file);
  if (fs.lstatSync(srcPath).isDirectory()) {
    execSync(`cp -r "${srcPath}" "${destPath}"`);
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
}

console.log("✅ SEO 폴더 갱신 완료");

// 3. Firebase 배포
try {
  execSync("firebase deploy --only hosting", { stdio: "inherit" });
  console.log("🚀 Firebase 배포 완료");
} catch (err) {
  console.error("배포 중 오류 발생:", err.message);
}
