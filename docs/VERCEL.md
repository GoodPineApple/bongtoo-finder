# Vercel 배포 가이드

## 요약

- **빌드**: `vercel.json`에서 `npm run build:all`을 사용합니다. `assets/stores.csv` → `public/data/stores.json` 변환 후 Next 빌드가 실행됩니다.
- **지도**: 카카오 JavaScript 키와 **배포 URL**(프로덕션·프리뷰)을 [카카오 개발자 콘솔](https://developers.kakao.com) 앱의 **사이트 도메인**에 등록해야 합니다.
- **제보 API**: 로컬·Vercel **동일하게** Redis REST만 사용합니다. Vercel **Storage → KV** 연결 시 자동으로 **`KV_REST_API_URL`**, **`KV_REST_API_TOKEN`** 등이 붙으며, 앱은 이 이름을 우선 인식합니다. Upstash 단독 연동 시에는 `UPSTASH_REDIS_REST_*`도 지원합니다. 로컬은 Vercel 환경 변수 화면에서 위 값을 `.env.local`에 복사하면 됩니다. 미설정 시 제보 조회는 빈 목록, 제보 저장은 503 안내입니다.

## 절차

1. 저장소를 GitHub 등에 푸시한 뒤 [Vercel](https://vercel.com)에서 **Import** 합니다.
2. **Environment Variables**에 다음을 설정합니다.
   - `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` — 카카오 JavaScript 키
3. **(필수)** 프로젝트 **Storage** 탭에서 **KV / Redis**를 만들고 **Connect to Project**로 연결합니다. `KV_REST_API_URL`, `KV_REST_API_TOKEN` 등이 붙은 뒤 필요하면 **Redeploy** 하세요.
4. **로컬 개발**에서도 제보를 쓰려면 Vercel **Environment Variables**에 보이는 `KV_REST_API_URL`·`KV_REST_API_TOKEN`을 `.env.local`에 **같은 이름으로** 넣으면 배포와 같은 DB를 씁니다.
5. 배포 URL을 카카오 플랫폼 Web 도메인에 추가합니다.
6. 프리뷰 URL도 지도·제보 테스트에 쓰면 동일하게 등록합니다.

## 로컬과의 차이

| 항목        | 로컬                         | Vercel                    |
|------------|------------------------------|---------------------------|
| 판매소 JSON | `build:stores` / 빌드 시 생성 | 동일 (`build:all`)         |
| 제보 저장   | **Redis** (`.env.local`에 `KV_REST_API_*` 또는 `UPSTASH_REDIS_REST_*`) | **Storage 연동 시 자동** (`KV_REST_API_*` 등) |

## Node 버전

`package.json`의 `engines`와 `.nvmrc`는 Node 20 이상을 가정합니다. Vercel 프로젝트 설정에서 **Node.js Version**을 20.x로 맞추면 됩니다.
