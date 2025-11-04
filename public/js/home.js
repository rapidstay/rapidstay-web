/**
 * RapidStay - 홈 전용 JS (검색 + 주요 도시 미리보기)
 * ---------------------------------------------------
 * /public/index.html 전용
 */

import { initSearchBar } from "./common.js";

const API_BASE_URL =
  location.hostname.includes("localhost") || location.hostname.includes("127.0.0.1")
    ? "http://localhost:8081"
    : "https://rapidstay-api.onrender.com";

document.addEventListener("DOMContentLoaded", async () => {
  // ✅ 1. 주요 도시 미리보기 먼저 로드
  await loadCityPreview();

  // ✅ 2. 검색바 초기화
  setTimeout(() => {
    try {
      initSearchBar();
    } catch (err) {
      console.error("검색바 초기화 실패:", err);
    }
  }, 100);
});

/** ===============================
 *  🌍 주요 도시 미리보기
 *  =============================== */
async function loadCityPreview() {
  const cityContainer = document.getElementById("cityContainer");
  if (!cityContainer) return;

  const cityList = [
    { name: "Seoul", display: "서울" },
    { name: "Busan", display: "부산" },
    { name: "Jeju", display: "제주" },
    { name: "Tokyo", display: "도쿄" },
    { name: "Bangkok", display: "방콕" },
    { name: "Paris", display: "파리" },
  ];

  for (const c of cityList) {
    try {
      const res = await fetch(`./city-data/${c.name.toLowerCase()}-top5.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const hotels = (data.topRated || []).slice(0, 5);
      const cards = hotels
        .map(
          (h) => `
          <div class="hotel-card">
            <img src="${h.image || "https://picsum.photos/seed/" + h.name + "/400/250"}" alt="${h.name}">
            <div class="hotel-info">
              <strong>${h.name}</strong>
              <p>📍 ${h.address || h.city}</p>
              <p>⭐ ${h.rating || "4.5"} / 5.0</p>
            </div>
          </div>`
        )
        .join("");

      cityContainer.insertAdjacentHTML(
        "beforeend",
        `
        <section class="city-section">
          <h3><span class="city-name">${c.display}</span> 인기 숙소</h3>
          <div class="scroll-wrapper">
            <button class="scroll-btn left">‹</button>
            <div class="horizontal-scroll">${cards}</div>
            <button class="scroll-btn right">›</button>
          </div>
          <div class="city-more">
            <a href="./city-hotel/${c.name.toLowerCase()}.html">${c.display} 주요 숙소 보기 ▶</a>
          </div>
        </section>
      `
      );
    } catch (err) {
      console.warn(`${c.display} 미리보기 로드 실패:`, err);
    }
  }

  // ✅ 스크롤 버튼 이벤트
  document.querySelectorAll(".scroll-wrapper").forEach((wrap) => {
    const scrollArea = wrap.querySelector(".horizontal-scroll");
    wrap.querySelector(".scroll-btn.left")?.addEventListener("click", () => {
      scrollArea.scrollBy({ left: -300, behavior: "smooth" });
    });
    wrap.querySelector(".scroll-btn.right")?.addEventListener("click", () => {
      scrollArea.scrollBy({ left: 300, behavior: "smooth" });
    });
  });
}
