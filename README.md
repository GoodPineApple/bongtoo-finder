# 봉투어디 (bongtoo-finter)

공공데이터 기반 비닐봉투 판매소 지도와 이용자 제보(재고 여부)를 보여 주는 Next.js 웹앱입니다.

## 사전 준비

- Node.js 20 이상 (`.nvmrc` 참고)
- [카카오 개발자](https://developers.kakao.com) 앱 및 아래 **카카오맵 연동 설정**

---

## 카카오 연동 안내 (지도)

이 프로젝트는 **카카오톡 채널·메시지 API**가 아니라, 브라우저에서 지도를 띄우기 위한 **Kakao Maps JavaScript API**(`sdk.js`)를 사용합니다. 따라서 콘솔에서 맞춰야 할 것은 **JavaScript 키**, **웹 도메인**, 그리고 **카카오맵 사용 ON**입니다.

### 1. 앱 만들기 및 JavaScript 키

1. [Kakao Developers 콘솔](https://developers.kakao.com/console/app)에서 앱을 만듭니다.
2. **앱 키** 메뉴에서 **JavaScript 키**를 복사합니다.
3. 프로젝트 루트에 `.env.local`을 만들고 다음처럼 넣습니다 (값만 본인 키로 교체).

   ```bash
   NEXT_PUBLIC_KAKAO_MAP_APP_KEY=여기에_JavaScript_키
   ```

   `NEXT_PUBLIC_` 접두사가 붙은 변수는 브라우저로 전달되므로, **REST API 키·Admin 키는 여기에 쓰지 마세요.** 지도용으로는 **JavaScript 키**만 사용합니다.

### 2. 플랫폼: 웹 사이트 도메인 (필수)

지도 SDK는 **주소창에 보이는 출처(origin)** 가 등록된 도메인과 일치해야 스크립트가 정상 동작합니다.

1. 콘솔에서 해당 앱 → **플랫폼** → **Web** 등록.
2. **사이트 도메인**에 실제로 접속하는 URL을 넣습니다.
   - 로컬: `http://localhost:3000` 처럼 **프로토콜·호스트·포트까지** 정확히 (Next가 `3002`면 `http://localhost:3002`).
   - 배포: `https://본인도메인.vercel.app` 등 프로덕션·프리뷰 URL을 각각 추가.

등록하지 않으면 `maps.load`가 실패하거나, 콘솔에 도메인 관련 안내가 뜰 수 있습니다.

### 3. 카카오맵 사용 설정 ON (헷갈리기 쉬운 부분)

콘솔 정책상 **카카오맵 API(지도·로컬)** 를 쓰려면 앱에서 해당 기능을 **켜 둔 상태**여야 합니다. 키와 도메인만 맞춰도 지도가 안 나오고, 브라우저 콘솔에 권한·활성화 관련 오류가 나는 경우가 많습니다.

1. [Kakao Developers 콘솔](https://developers.kakao.com/console/app)에서 앱 선택.
2. 왼쪽 또는 제품 메뉴에서 **카카오맵** / **카카오맵 API(지도·로컬)** 등 **지도·로컬** 관련 항목으로 이동합니다 (콘솔 UI는 수시로 바뀔 수 있으나, “맵”, “지도”, “로컬”, “사용 설정” 같은 이름으로 묶여 있습니다).
3. **사용 설정** / **활성화** 상태를 **ON**으로 바꿉니다.  
   - 과거 안내·에러 메시지에 **`OPEN_MAP_AND_LOCAL`** 같은 권한 이름이 보이는 경우가 있는데, 이는 맵·로컬 API를 쓰기 위한 설정이 꺼져 있을 때 나오는 경우가 많습니다. **지도 제품의 사용 설정을 ON**으로 두면 해결되는 경우가 대부분입니다.
4. 신규 앱은 별도 **앱 검수·과금 정책** 안내가 있을 수 있으니, 콘솔 공지와 [카카오맵 API 문서](https://apis.map.kakao.com/)를 함께 확인하세요.

### 4. 그래도 안 될 때

- 개발자 도구 **Network**에서 `dapi.kakao.com` / `sdk.js` 요청이 **차단·실패**인지 확인합니다. 광고 차단기·브라우저 보안·회사 VPN이 막는 경우가 있습니다.
- 브라우저 콘솔에서 **`봉투어디 KakaoMap`** 으로 필터링하면 이 프로젝트가 남긴 진단 로그를 모아볼 수 있습니다.
- 키 종류가 JavaScript 키가 맞는지, 도메인에 **포트 번호**까지 맞췄는지 다시 확인합니다.

---

## 로컬 실행

```bash
npm install
cp .env.example .env.local
```

`.env.local`에는 **`NEXT_PUBLIC_KAKAO_MAP_APP_KEY`**(지도)와 제보용 Redis REST 값을 넣습니다. Vercel KV 연동이면 **`KV_REST_API_URL`**, **`KV_REST_API_TOKEN`**(대시보드 Environment Variables에 보이는 이름 그대로)를 복사하면 되고, Upstash만 쓰면 **`UPSTASH_REDIS_REST_URL`**, **`UPSTASH_REDIS_REST_TOKEN`**을 쓰면 됩니다.

```bash
npm run dev
```

판매소 JSON을 CSV에서 다시 만들 때:

```bash
npm run build:stores
```

전체 빌드(CSV → JSON + Next 빌드):

```bash
npm run build:all
```

## 배포 (Vercel)

요약은 [`docs/VERCEL.md`](docs/VERCEL.md)를 참고하세요. **재고 제보**는 Redis REST 한 가지 방식이며, Vercel은 Storage 연결 시 붙는 **`KV_REST_API_URL` / `KV_REST_API_TOKEN`**(또는 Upstash **`UPSTASH_REDIS_REST_*`**)를 인식합니다. 로컬은 `.env.local`에 동일한 키·값을 넣으면 됩니다. 지도용 **`NEXT_PUBLIC_KAKAO_MAP_APP_KEY`** 도 필요합니다.

## 기타 문서

- [`docs/기획서.md`](docs/기획서.md) — 제품 기획 요약
