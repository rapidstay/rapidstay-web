/**
 * RapidStay - 도시별 추천 페이지 및 sitemap 자동 생성 스크립트
 * ---------------------------------------------------
 * 실행 방법:
 *   npm run generate
 *
 * 전제:
 *   - Node.js 환경
 *   - public/city-data, public/city 폴더 존재
 *   - (옵션) fetch 지원을 위해 node-fetch 설치
 *     npm install node-fetch@3
 */

import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// === 설정 ==========================
const API_BASE_URL = "http://localhost:8081"; // 배포 시 변경 가능
const OUTPUT_JSON_DIR = "./public/city-data";
const OUTPUT_HTML_DIR = "./public/city";
const TARGET_CITIES = [
  { name: "Seoul", display: "서울" },
  { name: "Busan", display: "부산" },
  { name: "Jeju", display: "제주" }
];

// === 헬퍼 함수 ======================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getDates() {
  const today = new Date();
  const ci = new Date(today);
  ci.setDate(today.getDate() + 1);
  const co = new Date(today);
  co.setDate(today.getDate() + 2);
  const fmt = (d) => d.toISOString().split("T")[0];
  return { checkIn: fmt(ci), checkOut: fmt(co) };
}

async function fetchHotelData(city) {
  const { checkIn, checkOut } = getDates();
  const payload = {
    city,
    checkIn,
    checkOut,
    rooms: [{ adults: 2, children: 0, childAges: [] }]
  };

  const res = await fetch(`${API_BASE_URL}/api/hotels/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.error(`❌ ${city} 데이터 요청 실패: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// === JSON 생성 로직 =================
async function generateJson(city, hotels) {
  const topRated = [...hotels]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  const petFriendly = hotels
    .filter((h) => (h.amenities || "").toLowerCase().includes("pet"))
    .slice(0, 5);

  const family = hotels
    .filter((h) => (h.amenities || "").toLowerCase().includes("family"))
    .slice(0, 5);

  const jsonData = { topRated, petFriendly, family };
  const jsonPath = path.join(
    OUTPUT_JSON_DIR,
    `${city.toLowerCase()}-top5.json`
  );
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  console.log(`✅ ${jsonPath} 생성 완료`);
}

// === HTML 생성 로직 =================
function generateHtml(city, display) {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${display} 호텔 추천 TOP5 | RapidStay</title>
  <meta name="description" content="${display} 인기 호텔, 애견 동반, 가족 여행 추천 숙소 TOP5를 RapidStay에서 한눈에 확인하세요.">
  <meta name="keywords" content="${display}호텔,${display}숙소,${display}추천호텔,가족여행,애견호텔,RapidStay,익스피디아">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://rapidstay.link/city/${city.toLowerCase()}.html" />
  <style>
    body { font-family: "Noto Sans KR", sans-serif; margin: 0; background: #fafafa; color:#333; }
    header { background: #222; color:#fff; padding: 18px 24px; font-size: 22px; }
    h2 { margin: 40px 0 20px; text-align:center; color:#222; }
    .section { max-width: 900px; margin: 0 auto; padding: 0 20px; }
    .hotel-card {
      display: flex; gap:16px; align-items:center;
      background:#fff; border-radius:8px;
      box-shadow:0 2px 6px rgba(0,0,0,0.1);
      padding:12px; margin:10px 0;
      transition:transform 0.2s ease, box-shadow 0.2s ease;
    }
    .hotel-card:hover { transform:translateY(-4px); box-shadow:0 6px 18px rgba(0,0,0,0.15); }
    .hotel-card img { width:180px; height:130px; border-radius:6px; object-fit:cover; }
    .hotel-info h3 { margin:0 0 4px; font-size:18px; color:#111; }
    .hotel-info p { margin:0 0 3px; font-size:14px; color:#555; }
    .hotel-info .price { font-weight:bold; color:#e53935; margin-top:4px; }
    footer { margin:60px 0 40px; text-align:center; color:#777; font-size:13px; }
  </style>
</head>
<body>
  <header>🏨 ${display} 인기 호텔 추천 | RapidStay</header>

  <div class="section" id="topRated"></div>
  <div class="section" id="petFriendly"></div>
  <div class="section" id="family"></div>

  <footer>ⓒ 2025 RapidStay | Expedia Partner Data 기반</footer>

  <script>
  fetch('/city-data/${city.toLowerCase()}-top5.json')
    .then(res => res.json())
    .then(data => {
      render('topRated', data.topRated, '⭐ 평점 높은 숙소 TOP5');
      render('petFriendly', data.petFriendly, '🐶 반려동물 동반 가능 숙소');
      render('family', data.family, '👨‍👩‍👧 가족 여행 추천 숙소');
    });

  function render(target, hotels, title) {
    const el = document.getElementById(target);
    el.innerHTML = '<h2>' + title + '</h2>' + hotels.map(h => \`
      <div class="hotel-card">
        <img src="\${h.image || 'https://picsum.photos/seed/' + h.name + '/400/250'}" alt="\${h.name}">
        <div class="hotel-info">
          <h3>\${h.name}</h3>
          <p>📍 \${h.address || h.city}</p>
          <p>⭐ \${h.rating || '4.5'} / 5.0</p>
          <p class="price">💰 \${h.lowestPrice ? h.lowestPrice + '원~' : '요금 확인 불가'}</p>
        </div>
      </div>
    \`).join('');
  }
  </script>
</body>
</html>`;
  const htmlPath = path.join(OUTPUT_HTML_DIR, `${city.toLowerCase()}.html`);
  fs.writeFileSync(htmlPath, html);
  console.log(`✅ ${htmlPath} 생성 완료`);
}

// === 실행 (sitemap 포함) ==========================
(async () => {
  ensureDir(OUTPUT_JSON_DIR);
  ensureDir(OUTPUT_HTML_DIR);

  const today = new Date().toISOString().split("T")[0];
  const sitemapEntries = [];

  for (const c of TARGET_CITIES) {
    console.log(`▶ ${c.display} 데이터 생성 중...`);
    const hotels = await fetchHotelData(c.name);
    await generateJson(c.name, hotels);
    generateHtml(c.name, c.display);

    sitemapEntries.push(`
    <url>
      <loc>https://rapidstay-c7f8e.web.app/city/${c.name.toLowerCase()}.html</loc>
      <lastmod>${today}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`);
  }

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join("\n")}
</urlset>`;

  fs.writeFileSync("./public/sitemap.xml", sitemapContent);
  console.log("🗺️  sitemap.xml 생성 완료");
  console.log("\n🚀 모든 도시 페이지 생성 완료!");
})();
