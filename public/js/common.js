import { TARGET_CITIES } from "./cities.js"; // ✅ 공통 도시목록 import

// ===============================
// 🔧 도시 정규화 + 슬러그 변환 유틸
// ===============================
function normalizeKrCity(kr) {
  if (!kr) return "";
  let s = kr.trim();
  s = s
    .replace(/대한민국$/, "")
    .replace(/특별시$/, "")
    .replace(/광역시$/, "")
    .replace(/자치시$/, "")
    .replace(/시$/, "")
    .replace(/도$/, "")
    .trim();

  const map = {
    "서울특별시": "서울",
    "서울시": "서울",
    "부산광역시": "부산",
    "인천광역시": "인천",
    "대구광역시": "대구",
    "대전광역시": "대전",
    "광주광역시": "광주",
    "울산광역시": "울산",
    "제주시": "제주",
    "서귀포시": "제주",
  };
  return map[kr] || s;
}

function toSlugFromAny(cityAny) {
  const kr = /[가-힣]/.test(cityAny) ? normalizeKrCity(cityAny) : cityAny;
  const hit = TARGET_CITIES.find(
    (c) => c.display === kr || c.name.toLowerCase() === String(cityAny).toLowerCase()
  );
  return (hit ? hit.name : kr).toLowerCase();
}

// ===============================
const API_BASE_URL =
  location.hostname.includes("localhost") || location.hostname.includes("127.0.0.1")
    ? "http://localhost:8081"
    : "https://rapidstay-api.onrender.com";

// ===============================
export function initSearchBar(onSearch) {
  const cityInput = document.querySelector("#city");
  const checkInInput = document.querySelector("#checkIn");
  const checkOutInput = document.querySelector("#checkOut");
  const searchBtn = document.querySelector("#searchBtn");

  if (!cityInput || !searchBtn) {
    console.warn("검색바 요소를 찾을 수 없습니다. initSearchBar 실행 시점을 확인하세요.");
    return;
  }

  // ✅ 날짜 기본값 자동 세팅
  const today = new Date();
  const ci = new Date(today);
  ci.setDate(today.getDate() + 1);
  const co = new Date(today);
  co.setDate(today.getDate() + 2);
  const fmt = (d) => d.toISOString().split("T")[0];

  const params = new URLSearchParams(location.search);
  cityInput.value = params.get("city") || cityInput.value || "";
  if (!checkInInput.value) checkInInput.value = params.get("checkIn") || fmt(ci);
  if (!checkOutInput.value) checkOutInput.value = params.get("checkOut") || fmt(co);

  // ✅ 달력 제약 조건 (오늘 이전 막기 + 최소 1일 간격 유지)
  const todayStr = today.toISOString().split("T")[0];
  checkInInput.min = todayStr;
  checkOutInput.min = todayStr;

  checkInInput.addEventListener("change", () => {
    const checkInDate = new Date(checkInInput.value);
    if (isNaN(checkInDate)) return;

    const nextDay = new Date(checkInDate);
    nextDay.setDate(checkInDate.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split("T")[0];
    checkOutInput.min = nextDayStr;

    // 종료일이 체크인보다 빠르면 자동 보정
    if (!checkOutInput.value || checkOutInput.value <= checkInInput.value) {
      checkOutInput.value = nextDayStr;
    }
  });

  checkOutInput.addEventListener("change", () => {
    if (checkOutInput.value <= checkInInput.value) {
      alert("체크아웃 날짜는 체크인 다음날 이후여야 합니다.");
      const newOut = new Date(checkInInput.value);
      newOut.setDate(newOut.getDate() + 1);
      checkOutInput.value = newOut.toISOString().split("T")[0];
    }
  });

  /* ======================================
     ✅ 객실 선택 드롭다운 (rooms)
     ====================================== */
  const roomBtn = document.getElementById("roomBtn");
  const dropdown = document.getElementById("roomDropdown");
  const roomSelector = document.querySelector(".room-selector");

  // ✅ 세션 저장된 객실 정보 복원 (있으면 그대로, 없으면 기본값)
  let rooms = [];
  try {
    const saved = JSON.parse(sessionStorage.getItem("searchRooms") || "[]");
    if (Array.isArray(saved) && saved.length > 0) {
      rooms = saved;
    } else {
      rooms = [{ adults: 2, children: 0, childAges: [] }];
    }
  } catch {
    rooms = [{ adults: 2, children: 0, childAges: [] }];
  }

  // ✅ 페이지 로드 시 버튼 텍스트 업데이트
  const updateRoomBtnText = () => {
    const totalAdults = rooms.reduce((a, r) => a + r.adults, 0);
    const totalChildren = rooms.reduce((a, r) => a + r.children, 0);
    roomBtn.textContent = `객실 ${rooms.length}개, 성인 ${totalAdults}명${
      totalChildren ? `, 아동 ${totalChildren}명` : ""
    }`;
  };
  if (roomBtn) updateRoomBtnText();

  if (roomBtn && dropdown && roomSelector) {
    let isOpen = false;

    const openDropdown = () => {
      dropdown.style.display = "block";
      isOpen = true;
    };
    const closeDropdown = () => {
      dropdown.style.display = "none";
      isOpen = false;
    };

    if (window.__rsRoomsOutsideHandler) {
      window.removeEventListener("pointerdown", window.__rsRoomsOutsideHandler, true);
    }

    window.__rsRoomsOutsideHandler = function (e) {
      const inside = e.target.closest(".room-selector");
      if (!inside && isOpen) closeDropdown();
    };
    window.addEventListener("pointerdown", window.__rsRoomsOutsideHandler, true);

    roomBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      isOpen ? closeDropdown() : openDropdown();
    });

    ["pointerdown", "mousedown", "click", "focusin", "change"].forEach((evt) => {
      dropdown.addEventListener(evt, (e) => e.stopPropagation());
    });

    dropdown.addEventListener("pointerdown", (e) => {
      if (e.target.tagName === "SELECT" || e.target.closest("select")) e.stopPropagation();
    });

    const renderRooms = () => {
      const roomList = document.getElementById("roomList");
      const wasOpen = isOpen;
      roomList.innerHTML = rooms
        .map(
          (r, i) => `
        <div class="room-item" data-index="${i}">
          <div class="room-header">객실 ${i + 1}</div>
          <div class="room-row">
            <span>성인</span>
            <div class="counter">
              <button type="button" class="minus adult">−</button>
              <span class="count adult-count">${r.adults}</span>
              <button type="button" class="plus adult">＋</button>
            </div>
          </div>
          <div class="room-row">
            <span>아동</span>
            <div class="counter">
              <button type="button" class="minus child">−</button>
              <span class="count child-count">${r.children}</span>
              <button type="button" class="plus child">＋</button>
            </div>
            <div class="child-ages">
              ${r.childAges
                .map(
                  (age, j) =>
                    `<select data-room="${i}" data-child="${j}">
                      ${Array.from({ length: 18 }, (_, n) =>
                        `<option value="${n}" ${n === age ? "selected" : ""}>${n}세</option>`
                      ).join("")}
                    </select>`
                )
                .join("")}
            </div>
          </div>
        </div>`
        )
        .join("");

      if (wasOpen) openDropdown();

      roomList.querySelectorAll("select").forEach((sel) => {
        ["pointerdown", "mousedown", "click", "focus"].forEach((evt) => {
          sel.addEventListener(evt, (e) => e.stopPropagation());
        });
      });
    };

    renderRooms();

    dropdown.addEventListener("click", (e) => {
      const roomEl = e.target.closest(".room-item");
      if (!roomEl) return;
      const idx = parseInt(roomEl.dataset.index, 10);

      if (e.target.classList.contains("plus")) {
        if (e.target.classList.contains("adult")) rooms[idx].adults++;
        else if (e.target.classList.contains("child")) {
          rooms[idx].children++;
          rooms[idx].childAges.push(0);
        }
      } else if (e.target.classList.contains("minus")) {
        if (e.target.classList.contains("adult") && rooms[idx].adults > 1) rooms[idx].adults--;
        else if (e.target.classList.contains("child") && rooms[idx].children > 0) {
          rooms[idx].children--;
          rooms[idx].childAges.pop();
        }
      }
      renderRooms();
    });

    dropdown.addEventListener("change", (e) => {
      if (e.target.tagName === "SELECT") {
        const r = parseInt(e.target.dataset.room);
        const c = parseInt(e.target.dataset.child);
        rooms[r].childAges[c] = parseInt(e.target.value);
      }
    });

    document.getElementById("addRoom")?.addEventListener("click", () => {
      rooms.push({ adults: 2, children: 0, childAges: [] });
      renderRooms();
    });
    document.getElementById("removeRoom")?.addEventListener("click", () => {
      if (rooms.length > 1) rooms.pop();
      renderRooms();
    });

    document.getElementById("applyRooms")?.addEventListener("click", () => {
      closeDropdown();
      updateRoomBtnText();
      sessionStorage.setItem("searchRooms", JSON.stringify(rooms));
    });
  }

  // ✅ 검색 버튼 클릭 시
  searchBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    const checkIn = checkInInput.value;
    const checkOut = checkOutInput.value;
    if (!city) return alert("도시명을 입력하세요.");

    const currentRooms = JSON.parse(JSON.stringify(rooms));
    sessionStorage.setItem("searchRooms", JSON.stringify(currentRooms));

    const payload = { city, checkIn, checkOut, rooms: currentRooms };
    const q = new URLSearchParams({ city, checkIn, checkOut }).toString();

    if (window.location.pathname.includes("/search.html")) {
      onSearch?.(payload);
    } else {
      const base = window.location.pathname.includes("/city") || window.location.pathname.includes("/city-hotel")
        ? ".."
        : ".";
      setTimeout(() => {
        location.href = `${base}/search.html?${q}`;
      }, 100);
    }
  });

  // ===========================
  // 🔠 자동완성
  // ===========================
  let autoBox = document.getElementById("autocompletelist");
  if (!autoBox) {
    autoBox = document.createElement("div");
    autoBox.id = "autocompletelist";
    autoBox.className = "autocomplete-box";

    const parent = cityInput.parentElement;
    if (parent) {
      parent.style.position = "relative";
      parent.appendChild(autoBox);
    } else {
      document.body.appendChild(autoBox);
    }
  }

  let timer;
  cityInput.addEventListener("input", () => {
    const kw = cityInput.value.trim();
    if (kw.length < 2) {
      autoBox.style.display = "none";
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cities/search?query=${encodeURIComponent(kw)}`);
        const list = await res.json();
        if (!list?.length) {
          autoBox.style.display = "none";
          return;
        }

        autoBox.innerHTML = list
          .map(
            (c) => `
          <div class="auto-item" data-city="${c.cityNameKr || c.cityName}">
            ${c.cityNameKr || c.cityName}
            <span style="color:#888;font-size:13px;">${c.country || ""}</span>
          </div>`
          )
          .join("");

        autoBox.style.position = "absolute";
        autoBox.style.left = "0";
        autoBox.style.top = `${cityInput.offsetHeight + 4}px`;
        autoBox.style.width = "100%";
        autoBox.style.background = "#fff";
        autoBox.style.border = "1px solid #ccc";
        autoBox.style.borderRadius = "4px";
        autoBox.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
        autoBox.style.zIndex = "1000";
        autoBox.style.display = "block";
      } catch (err) {
        console.error("도시 자동완성 실패:", err);
      }
    }, 300);
  });

  autoBox.addEventListener("click", (e) => {
    const item = e.target.closest(".auto-item");
    if (!item) return;
    const picked = item.dataset.city;
    cityInput.value = normalizeKrCity(picked);
    autoBox.style.display = "none";
    cityInput.focus();
  });

  // ===========================
  // 🏙️ 인기 여행지 버튼
  // ===========================
  const BASE_PATH = window.location.pathname.includes("/city/") || window.location.pathname.includes("/city-hotel") ? ".." : ".";
  document.querySelectorAll(".cityQuick").forEach((b) => {
    b.addEventListener("click", () => {
      const raw = b.dataset.city || b.textContent.trim();
      const cityName = normalizeKrCity(raw);
      const ci = new Date();
      ci.setDate(ci.getDate() + 1);
      const co = new Date();
      co.setDate(co.getDate() + 2);
      const fmt = (d) => d.toISOString().split("T")[0];
      location.href = `${BASE_PATH}/search.html?city=${encodeURIComponent(
        cityName
      )}&checkIn=${fmt(ci)}&checkOut=${fmt(co)}`;
    });
  });
}

/** ===========================
 *  📦 호텔 목록 렌더링
 *  =========================== */
export async function fetchAndRenderHotels(city, checkIn, checkOut, roomsParam) {
  const target = document.getElementById("hotelList") || document.getElementById("hotel-list");
  if (!target) return false;

  const match = TARGET_CITIES.find(
    (c) => c.display === city || c.name.toLowerCase() === city.toLowerCase()
  );
  const slug = match ? match.name : city;
  const BASE_PATH = window.location.pathname.includes("/city/") || window.location.pathname.includes("/city-hotel") ? ".." : ".";
  
  let hotels = [];
  let useMock = true;

  try {
    const storedRooms =
      roomsParam || JSON.parse(sessionStorage.getItem("searchRooms") || '[{"adults":2,"children":0,"childAges":[]}]');

    const payload = { city: slug, checkIn, checkOut, rooms: storedRooms };
    const apiRes = await fetch(`${API_BASE_URL}/api/hotels/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (apiData?.hotels?.length) {
        hotels = apiData.hotels;
        useMock = false;
      }
    } else {
      console.warn("API 응답 실패:", apiRes.status);
    }
  } catch (e) {
    console.warn("API 호출 실패, mock 데이터로 대체:", e);
  }

  if (useMock) {
    try {
      const res = await fetch(`${BASE_PATH}/city-data/${slug.toLowerCase()}-top5.json`);
      const data = await res.json();
      hotels = data.topRated || [];
    } catch (e) {
      console.error("mock 데이터 로드 실패:", e);
    }
  }

  if (!hotels.length) {
    target.innerHTML = "<p style='text-align:center;color:#777;'>표시할 숙소가 없습니다.</p>";
    return false;
  }

  target.innerHTML = hotels
    .map(
      (h) => `
    <div class="hotel-card">
      <img loading="lazy" src="${h.image || "https://picsum.photos/seed/" + h.name + "/400/250"}" alt="${h.name}">
      <div class="hotel-info">
        <h3>${h.name}</h3>
        <p>📍 ${h.address || h.city}</p>
        <p>⭐ ${h.rating || "4.5"} / 5.0</p>
        <p class="price">💰 ${h.lowestPrice ? h.lowestPrice + "원~" : "요금 확인 불가"}</p>
      </div>
    </div>`
    )
    .join("");

  return true;
}

/** ===========================
 *  🧩 Partial Loader
 *  =========================== */
export async function loadPartial(targetId, path, callback) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    const html = await res.text();
    const el = document.getElementById(targetId);
    if (el) el.innerHTML = html;
    if (callback) callback();
  } catch (err) {
    console.error("❌ partial load failed:", path, err);
  }
}

/** ===========================
 *  📍 city-map.json 자동 로드
 *  =========================== */
const cityMapPath = window.location.pathname.includes("/city/") || window.location.pathname.includes("/city-hotel")
  ? "../city-data/city-map.json"
  : "./city-data/city-map.json";

fetch(cityMapPath)
  .then((res) => res.json())
  .then((list) => {
    window.citySlugMap = Object.fromEntries(
      list.map((c) => [c.display, c.name.toLowerCase()])
    );
  })
  .catch((err) => console.warn("city-map.json 로드 실패:", err));
