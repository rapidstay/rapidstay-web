/**
 * RapidStay - 도시별 추천 페이지 + SEO 메타 + 구조화 데이터 + Sitemap 자동 생성 (v4.3)
 * ---------------------------------------------------
 * 실행: npm run generate
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === 설정 경로 ==========================
const TEMPLATE_PATH = "./public/city-template.html";
const HEADER_PATH = "./public/partials/header-search.html";
const OUTPUT_JSON_DIR = "./public/city-data";
const OUTPUT_HTML_DIR = "./public/city";
const PUBLIC_DIR = path.join(__dirname, "../public");
const BASE_URL = "https://rapidstay-c7f8e.web.app"; // ✅ 실제 배포 경로

// === cities.js 불러오기 ==========================
const citiesPath = path.join(__dirname, "../public/js/cities.js");
const citiesModule = await import(pathToFileURL(citiesPath).href);
const { TARGET_CITIES } = citiesModule;

// === 유틸 ==========================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// === 더미 데이터 ==========================
function createDummyHotels(city) {
  return Array.from({ length: 10 }).map((_, i) => ({
    name: `${city} Hotel ${i + 1}`,
    city,
    address: `${city} 중심가 ${i + 10}번지`,
    rating: (4 + Math.random() * 1).toFixed(1),
    lowestPrice: 70000 + Math.floor(Math.random() * 100000), // ✅ 숫자형으로 변경
    image: `https://picsum.photos/seed/${city}-${i}/400/250`,
    amenities: i % 2 === 0 ? "Family, WiFi" : "Pet Friendly, Pool",
  }));
}

// === JSON 생성 ==========================
async function generateJson(city, hotels) {
  const topRated = hotels.slice(0, 5);
  const petFriendly = hotels.filter((h) => h.amenities.includes("Pet")).slice(0, 5);
  const family = hotels.filter((h) => h.amenities.includes("Family")).slice(0, 5);
  const data = { topRated, petFriendly, family };

  const jsonPath = path.join(OUTPUT_JSON_DIR, `${city.toLowerCase()}-top5.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`💾 ${jsonPath} 저장 완료`);
}

// === JSON-LD 생성 ==========================
function makeJsonLd(hotels, display) {
  const items = hotels.slice(0, 5).map((h, idx) => ({
    "@type": "Hotel",
    name: h.name,
    address: h.address,
    image: h.image,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: h.rating,
      reviewCount: Math.floor(50 + Math.random() * 200),
    },
    priceRange: `₩${Number(h.lowestPrice).toLocaleString()}~`,
    url: h.expediaUrl,
    position: idx + 1,
  }));

  // ✅ 단일 ItemList 구조로 반환
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${display} 인기 호텔`,
      itemListElement: items,
    },
    null,
    2
  );
}

// === HTML 생성 ==========================
function generateHtml(city, display) {
  let template = fs.readFileSync(TEMPLATE_PATH, "utf8");

  // ✅ 헤더 중첩 방지 처리 (내부 <header> 제거)
  let headerHTML = "<div class='fallback-header'>🏨 RapidStay Hotel Search</div>";
  if (fs.existsSync(HEADER_PATH)) {
    let rawHeader = fs.readFileSync(HEADER_PATH, "utf8");
    rawHeader = rawHeader.replace(/^\uFEFF/, ""); // BOM 제거
    rawHeader = rawHeader.replace(/<\/?header[^>]*>/gi, "").trim();
    headerHTML = rawHeader;
  }

  // === SEO / OG 메타 정보 자동 생성 ===
  const canonicalUrl = `${BASE_URL}/city/${city.toLowerCase()}.html`;
  const title = `${display} 호텔 추천 | RapidStay`;
  const description = `${display}의 인기 호텔, 가족 여행, 반려동물 동반 숙소를 한눈에 비교하세요.`;
  const imageUrl = `${BASE_URL}/assets/og/${city.toLowerCase()}.jpg`;
  const date = new Date().toISOString().split("T")[0];

  // ✅ robots 메타 분기 (dev/test 환경은 noindex)
  const robots = process.env.PROD === "true" ? "index,follow" : "noindex,nofollow";

  // === 호텔 데이터 생성 및 JSON-LD 삽입 ===
  const hotels = createDummyHotels(display);
  const jsonLd = makeJsonLd(hotels, display);

  template = template
    .replace(/{{cityName}}/g, display)
    .replace(/{{title}}/g, title)
    .replace(/{{description}}/g, description)
    .replace(/{{imageUrl}}/g, imageUrl)
    .replace(/{{canonicalUrl}}/g, canonicalUrl)
    .replace(/{{date}}/g, date)
    .replace(/{{ROBOTS}}/g, robots)   // ✅ 추가된 라인
    .replace("{{HEADER_SEARCH}}", headerHTML)
    .replace("{{HOTEL_JSON}}", jsonLd);

  const htmlPath = path.join(OUTPUT_HTML_DIR, `${city.toLowerCase()}.html`);
  fs.writeFileSync(htmlPath, template);
  console.log(`📝 ${htmlPath} 생성 완료`);
}

// === sitemap.xml 자동 생성 ==========================
function generateSitemap() {
  const htmlFiles = new Set();

  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith(".html")) {

        // ✅ 내부 템플릿 / 오류 페이지 / partials 제외
        if (
          file === "404.html" ||
          file === "city-template.html" ||
          fullPath.includes("/partials/")
        ) {
          continue;
        }

        const relPath = fullPath
          .replace(PUBLIC_DIR, "")
          .replace(/\\/g, "/")
          .replace(/^\/+/, "");

        htmlFiles.add(`${BASE_URL}/${relPath}`);
      }
    }
  }

  walk(PUBLIC_DIR);

  const sortedUrls = [...htmlFiles].sort();
  const now = new Date().toISOString();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${sortedUrls
  .map(
    (url) => `
  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.includes("/city/") ? "0.8" : "1.0"}</priority>
  </url>`
  )
  .join("")}
</urlset>`;

  const sitemapPath = path.join(PUBLIC_DIR, "sitemap.xml");
  fs.writeFileSync(sitemapPath, sitemap);
  console.log(`🌐 sitemap.xml 갱신 완료 (${sortedUrls.length}개 URL 포함)`);
}



// === 실행 ==========================
(async () => {
  ensureDir(OUTPUT_JSON_DIR);
  ensureDir(OUTPUT_HTML_DIR);

  for (const c of TARGET_CITIES) {
    const hotels = createDummyHotels(c.name);
    await generateJson(c.name, hotels);
    generateHtml(c.name, c.display);
  }

  generateSitemap();
  console.log("✅ 모든 도시 페이지 생성 및 sitemap.xml 자동 갱신 완료!");
  console.log(`📁 출력 경로: ${path.resolve(OUTPUT_HTML_DIR)}`);
})();
