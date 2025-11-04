console.log("✅ search.js loaded");

import { initSearchBar } from "./common.js";

const API_BASE_URL =
  location.hostname.includes("localhost") || location.hostname.includes("127.0.0.1")
    ? "http://localhost:8081"
    : "https://rapidstay-api.onrender.com";

const params = new URLSearchParams(window.location.search);
const city = params.get("city") || "Seoul";
const checkIn = params.get("checkIn") || "2025-11-01";
const checkOut = params.get("checkOut") || "2025-11-03";
document.title = `${city} 호텔 검색 | RapidStay – 실시간 숙소 비교`;

/* ===============================
   🔍 초기 로드
=============================== */
window.addEventListener("DOMContentLoaded", async () => {
  const mapWrapper = document.getElementById("mapWrapper");
  mapWrapper.style.display = "none";

  // ✅ header-search.html 내 검색창과 연결
  initSearchBar(async (payload) => {
    await handleSearch(payload.city, payload.checkIn, payload.checkOut, payload.rooms);
  });

  const hasResult = await handleSearch(city, checkIn, checkOut);
  mapWrapper.style.display = hasResult ? "block" : "none";
});

/* ===============================
   🏨 검색 함수
=============================== */
export async function handleSearch(city, checkIn, checkOut, rooms) {
  const target = document.getElementById("hotel-list");
  target.innerHTML = "<p style='text-align:center;color:#666;'>검색 중...</p>";

  // ✅ 객실 정보 불러오기 (없으면 기본값)
  const storedRooms =
    rooms ||
    JSON.parse(sessionStorage.getItem("searchRooms") || '[{"adults":2,"children":0,"childAges":[]}]');

  const payload = {
    city,
    checkIn,
    checkOut,
    rooms: storedRooms,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/hotels/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const hasResult = renderHotels(data.hotels || []);
    return hasResult;
  } catch (err) {
    console.error("❌ 검색 실패:", err);
    target.innerHTML = "<p class='empty'>호텔 데이터를 불러오는 중 문제가 발생했습니다.</p>";
    return false;
  }
}

/* ===============================
   🖼️ 렌더링
=============================== */
function renderHotels(hotels) {
  const validHotels = hotels.filter((h) => h.id != null);
  const list = document.getElementById("hotel-list");
  const mapSection = document.getElementById("mapSection");

  if (validHotels.length === 0) {
    list.innerHTML = `<p class="empty">검색 결과가 없습니다.</p>`;
    mapSection.style.display = "none"; // 지도 버튼 숨김
    return false;
  }

  mapSection.style.display = "block"; // ✅ 결과 있을 때만 지도 버튼 표시
  list.innerHTML = validHotels
    .map(
      (h) => `
      <div class="hotel-card" data-id="${h.id}" data-expedia="${h.expediaUrl || ""}">
        <img src="https://picsum.photos/seed/${h.name}/400/250" alt="${h.name}">
        <div class="hotel-info">
          <h3>${h.name}</h3>
          <p>📍 ${h.address || h.city}</p>
          <p>⭐ ${h.rating?.toFixed(1) || "4.5"} / 5.0</p>
          <p class="price">💰 ${h.lowestPrice ? `${h.lowestPrice}원~` : "요금 확인 불가"}</p>
        </div>
      </div>`
    )
    .join("");

  // 카드 클릭 이동 이벤트
  document.querySelectorAll(".hotel-card").forEach((card) => {
    card.addEventListener("click", () => {
      const expediaUrl = card.dataset.expedia || "https://www.expedia.com/";
      sessionStorage.setItem("expediaRedirectUrl", expediaUrl);
      window.location.href = "loading.html";
    });
  });

  window.currentHotels = validHotels;
  return true;
}

/* ===============================
   🗺️ 지도 모달
=============================== */
const openMapBtn = document.getElementById("openMapBtn");
const mapModal = document.getElementById("mapModal");

if (openMapBtn) {
  openMapBtn.addEventListener("click", () => {
    if (!window.currentHotels || window.currentHotels.length === 0) {
      alert("표시할 숙소가 없습니다.");
      return;
    }
    mapModal.style.display = "flex";
    initMap();
  });
}

window.closeMap = function () {
  mapModal.style.display = "none";
};

/* ===============================
   🧭 지도 초기화
=============================== */
function initMap() {
  const mapEl = document.getElementById("googleMap");
  if (!mapEl) return;

  const map = new google.maps.Map(mapEl, {
    zoom: 12,
    center: { lat: 37.5665, lng: 126.978 },
  });

  (window.currentHotels || []).forEach((hotel) => {
    if (hotel.latitude && hotel.longitude) {
      new google.maps.Marker({
        position: { lat: hotel.latitude, lng: hotel.longitude },
        map,
        title: hotel.name,
      });
    }
  });
}
