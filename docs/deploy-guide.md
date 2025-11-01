🚀 RapidStay 배포 가이드
1️⃣ 개요

RapidStay 프로젝트는 운영(production) 과 개발(dev) 두 환경을 분리하여 관리합니다.
각 환경은 Firebase Hosting에 별도 사이트로 연결되어 있으며,
배포 시 firebase.*.json 설정 파일을 각각 사용합니다.

환경	Firebase Site	Config 파일	Target 이름	Hosting URL
운영(prod)	rapidstay-c7f8e	firebase.prod.json	prod	https://rapidstay-c7f8e.web.app

개발(dev)	rapidstay-dev	firebase.dev.json	dev	https://rapidstay-dev.web.app
2️⃣ 관련 파일 구조
/rapidstay
 ├── public/                # 배포 대상 디렉토리
 ├── scripts/               # SEO, HTML 자동 생성 스크립트
 │    └── generateCityPages.js
 ├── firebase.prod.json     # 운영용 Firebase 설정
 ├── firebase.dev.json      # 개발용 Firebase 설정
 ├── .firebaserc            # Firebase 프로젝트 타깃 연결 정보
 ├── package.json           # npm scripts 포함
 └── seo-guide.md           # SEO 작업 가이드 (별도 문서)

3️⃣ 설정 파일 요약
🔹 .firebaserc
{
  "projects": {
    "default": "rapidstay-c7f8e"
  },
  "targets": {
    "rapidstay-c7f8e": {
      "hosting": {
        "prod": ["rapidstay-c7f8e"],
        "dev": ["rapidstay-dev"]
      }
    }
  }
}

🔹 firebase.prod.json
{
  "hosting": {
    "target": "prod",
    "public": "public",
    "ignore": ["firebase.dev.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "/city/**",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=3600" }
        ]
      }
    ],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}

🔹 firebase.dev.json
{
  "hosting": {
    "target": "dev",
    "public": "public",
    "ignore": ["firebase.prod.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "**/*.html",
        "headers": [
          { "key": "X-Robots-Tag", "value": "noindex, nofollow" }
        ]
      }
    ],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}

4️⃣ package.json 관련 스크립트
"scripts": {
  "generate:dev": "cross-env PROD=false node scripts/generateCityPages.js",
  "generate:prod": "cross-env PROD=true node scripts/generateCityPages.js",
  "deploy:dev":  "npm run generate:dev  && firebase deploy --only hosting:dev  --config firebase.dev.json  --project rapidstay-c7f8e",
  "deploy:prod": "npm run generate:prod && firebase deploy --only hosting:prod --config firebase.prod.json --project rapidstay-c7f8e"
}

5️⃣ 배포 명령 요약
환경	명령어	동작 내용
개발(dev)	npm run deploy:dev	HTML/JSON 생성 후 rapidstay-dev.web.app에 배포
운영(prod)	npm run deploy:prod	HTML/JSON 생성 후 rapidstay-c7f8e.web.app에 배포
6️⃣ 검증 포인트
✅ Dev 환경

URL: https://rapidstay-dev.web.app

브라우저 개발자 도구 → Network → HTML 클릭
→ X-Robots-Tag: noindex, nofollow 헤더 존재해야 함.

✅ Prod 환경

URL: https://rapidstay-c7f8e.web.app

/city/... 요청 시 Cache-Control: public, max-age=3600 확인.

/sitemap.xml 정상 접근 시 검색 엔진 제출 준비 완료.

7️⃣ 참고

Dev는 테스트 전용으로 검색 엔진 인덱싱 차단됨.

Prod는 실제 운영 사이트이므로 robots.txt와 sitemap.xml을 Google Search Console에 제출.

scripts/generateCityPages.js 실행 시 SEO 태그와 페이지가 자동 생성됨.