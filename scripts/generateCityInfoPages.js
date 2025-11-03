/**
 * RapidStay - 도시 정보 페이지 자동 생성 (v1.1)
 * ---------------------------------------------------
 * 실행: npm run generate:info
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === 경로 설정 ==========================
const TEMPLATE_PATH = "./public/templates/city-info-template.html";
const HEADER_PATH = "./public/partials/header-search.html";
const CITY_MAP_PATH = "./public/city-data/city-map.json";
const OUTPUT_HTML_DIR = "./public/city-info";
const PUBLIC_DIR = path.join(__dirname, "../public");
const BASE_URL = "https://rapidstay-c7f8e.web.app"; // ✅ 실제 배포 주소

// === 유틸 ==========================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// === city-map.json 불러오기 ==========================
const cityMap = JSON.parse(fs.readFileSync(CITY_MAP_PATH, "utf8"));

// === HTML 생성 ==========================
function generateHtml(city) {
  let template = fs.readFileSync(TEMPLATE_PATH, "utf8");

  // ✅ 헤더 병합
  let headerHTML = "<div class='fallback-header'>🌍 RapidStay City Info</div>";
  if (fs.existsSync(HEADER_PATH)) {
    let rawHeader = fs.readFileSync(HEADER_PATH, "utf8");
    rawHeader = rawHeader.replace(/^\uFEFF/, "").trim();
    headerHTML = rawHeader;
  }

  const canonicalUrl = `${BASE_URL}/city-info/${city.name.toLowerCase()}.html`;
  const title = `${city.display} 여행 정보 | RapidStay`;
  const description = `${city.display}의 주요 관광지, 맛집, 숙소 정보를 한눈에 확인하세요.`;
  const date = new Date().toISOString().split("T")[0];
  const robots = process.env.PROD === "true" ? "index,follow" : "noindex,nofollow";

  const imageUrl = city.image.startsWith("http")
  ? city.image
  : city.image.startsWith("/images/")
  ? city.image // ✅ 로컬 상대경로 유지
  : `/images/city/${city.name.toLowerCase()}-main.jpg`;

  // ✅ 템플릿 변수 치환
  template = template
    .replace(/{{cityName}}/g, city.display)
    .replace(/{{title}}/g, title)
    .replace(/{{description}}/g, description)
    .replace(/{{imageUrl}}/g, imageUrl)
    .replace(/{{canonicalUrl}}/g, canonicalUrl)
    .replace(/{{date}}/g, date)
    .replace(/{{ROBOTS}}/g, robots)
    .replace("{{HEADER_SEARCH}}", headerHTML);

  const htmlPath = path.join(OUTPUT_HTML_DIR, `${city.name.toLowerCase()}.html`);
  fs.writeFileSync(htmlPath, template);

  console.log(`📄 ${city.display} (${htmlPath}) 생성 완료`);
}

// === sitemap.xml 업데이트 ==========================
function updateSitemap() {
  const htmlFiles = [];

  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith(".html")) {
        // ✅ 내부 템플릿 / partials 제외
        if (fullPath.includes("/partials/") || fullPath.includes("/templates/")) continue;
        const relPath = fullPath
          .replace(PUBLIC_DIR, "")
          .replace(/\\/g, "/")
          .replace(/^\/+/, "");
        htmlFiles.push(`${BASE_URL}/${relPath}`);
      }
    }
  }

  walk(PUBLIC_DIR);

  const now = new Date().toISOString();
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${htmlFiles
  .map(
    (url) => `
  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.includes("/city-info/") ? "0.6" : "0.8"}</priority>
  </url>`
  )
  .join("")}
</urlset>`;

  const sitemapPath = path.join(PUBLIC_DIR, "sitemap.xml");
  fs.writeFileSync(sitemapPath, sitemap);
  console.log(`🌐 sitemap.xml 갱신 완료 (${htmlFiles.length}개 URL 포함)`);
}

// === 실행 ==========================
(async () => {
  ensureDir(OUTPUT_HTML_DIR);

  for (const city of cityMap) {
    generateHtml(city);
  }

  updateSitemap();
  console.log("✅ 모든 도시 정보 페이지(city-info) 생성 완료!");
  console.log(`📁 출력 경로: ${path.resolve(OUTPUT_HTML_DIR)}`);
})();
