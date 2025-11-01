# 🧭 RapidStay SEO / 배포 가이드

## 1️⃣ 개요
RapidStay 프로젝트는 **정적 페이지 SEO 자동 생성 + Firebase 배포**를 기반으로 한다.  
모든 도시별 HTML 페이지는 `generateCityPages.js` 스크립트를 통해 자동 생성되며,  
실제 배포 시에는 `robots`, `sitemap`, `JSON-LD`까지 포함된다.

---

## 2️⃣ 빌드 흐름

| 단계 | 명령어 | 설명 |
|------|---------|------|
| **개발 테스트** | `npm run generate:dev` | 색인 차단(`noindex,nofollow`) 버전 HTML 생성 |
| **운영 배포용** | `npm run generate:prod` | 색인 허용(`index,follow`) 버전 HTML 생성 |
| **자동 배포** | `npm run deploy:prod` | 운영 빌드 후 Firebase Hosting 자동 업로드 |

---

## 3️⃣ 주요 파일 구조

public/
├── city/ # 도시별 완성된 HTML
├── city-data/ # 각 도시 더미 or API 데이터(JSON)
├── assets/og/ # SNS 공유용 이미지 (도시별 OG)
├── sitemap.xml # 자동 생성됨
├── robots.txt # 수동 작성
└── loading.html # 외부 이동 전 로딩 페이지
scripts/
└── generateCityPages.js # SEO + JSON-LD + sitemap 생성 스크립트
seo-batch/
└── deployToFirebase.js # 배포 실행 스크립트

yaml
코드 복사

---

## 4️⃣ 환경 분기 설정

```js
// generateCityPages.js 내
const robots = process.env.PROD === "true" ? "index,follow" : "noindex,nofollow";
개발 모드(npm run generate:dev) → noindex

운영 모드(npm run generate:prod) → index

5️⃣ JSON-LD 구조화 데이터 예시
json
코드 복사
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "서울 인기 호텔",
  "itemListElement": [
    {
      "@type": "Hotel",
      "name": "서울 Hotel 1",
      "address": "서울 중심가 10번지",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.7",
        "reviewCount": 112
      },
      "priceRange": "₩123,000~",
      "url": "https://www.expedia.co.kr/Hotel-Seoul-1"
    }
  ]
}
6️⃣ sitemap 자동 생성 규칙
/city/ 이하 실제 페이지만 포함

404.html, city-template.html, /partials/ 내부 파일은 제외

각 <url>에 <lastmod>, <priority> 자동 삽입

7️⃣ robots.txt (루트에 수동 추가)
txt
코드 복사
User-agent: *
Allow: /
Disallow: /loading.html

Sitemap: https://rapidstay-c7f8e.web.app/sitemap.xml
8️⃣ 테스트 체크리스트
항목	확인 파일	정상 상태
robots 메타	/city/*.html	noindex(dev) / index(prod)
canonical / OG	/city/*.html	URL, 이미지, 설명 일치
JSON-LD	/city/*.html	ItemList 단일 구조, 에러 없음
sitemap	/public/sitemap.xml	불필요 파일 제외
JSON	/public/city-data/*.json	lowestPrice 숫자형
deploy	Firebase Hosting	빌드 + 업로드 완료 로그

📘 기준 버전: RapidStay SEO 자동화 v1.0
이 문서를 기준으로 실데이터 API 확장 또는 자동 배포 스크립트 개선을 이어갈 수 있다.