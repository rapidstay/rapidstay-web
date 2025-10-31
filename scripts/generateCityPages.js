/**
 * RapidStay - 도시별 추천 페이지 + SEO 메타 자동 생성
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
    lowestPrice: (70000 + Math.random() * 100000).toFixed(0),
    image: `https://picsum.photos/seed/${city}-${i}/400/250`,
    amenities: i % 2 === 0 ? "Family, WiFi" : "Pet Friendly, Pool",
  }));
}

// === JSON 생성 ==========================
async function generateJson(city, hotels) {
  const topRated = hotels.slice(0, 5);
  const petFriendly = hotels.filter(h => h.amenities.includes("Pet")).slice(0, 5);
  const family = hotels.filter(h => h.amenities.includes("Family")).slice(0, 5);
  const data = { topRated, petFriendly, family };

  const jsonPath = path.join(OUTPUT_JSON_DIR, `${city.toLowerCase()}-top5.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`💾 ${jsonPath} 저장 완료`);
}

// === HTML 생성 ==========================
function generateHtml(city, display) {
  let template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const headerHTML = fs.existsSync(HEADER_PATH)
    ? fs.readFileSync(HEADER_PATH, "utf8")
    : "<header>🏨 RapidStay Hotel Search</header>";

  const canonicalUrl = `https://rapidstay.link/city/${city.toLowerCase()}.html`;
  const title = `${display} 호텔 추천 | RapidStay`;
  const description = `${display} 인기 호텔, 가족 여행, 반려동물 동반 숙소 모음`;
  const imageUrl = `https://rapidstay.link/assets/og/${city.toLowerCase()}.jpg`;

  template = template
    .replace(/{{cityName}}/g, display)
    .replace(/{{title}}/g, title)
    .replace(/{{description}}/g, description)
    .replace(/{{imageUrl}}/g, imageUrl)
    .replace(/{{canonicalUrl}}/g, canonicalUrl)
    .replace(/{{date}}/g, new Date().toISOString().split("T")[0])
    .replace("{{HEADER_SEARCH}}", headerHTML);

  const htmlPath = path.join(OUTPUT_HTML_DIR, `${city.toLowerCase()}.html`);
  fs.writeFileSync(htmlPath, template);
  console.log(`📝 ${htmlPath} 생성 완료`);
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

  console.log("✅ 모든 도시 페이지 생성 완료!");
})();
