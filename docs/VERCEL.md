# Vercel 배포 가이드

## 요약

- **빌드**: `vercel.json`에서 `npm run build:all`을 사용합니다. `assets/stores.csv` → `public/data/stores.json` 변환 후 Next 빌드가 실행됩니다.
- **지도**: 카카오 JavaScript 키와 **배포 URL**(프로덕션·프리뷰)을 [카카오 개발자 콘솔](https://developers.kakao.com) 앱의 **사이트 도메인**에 등록해야 합니다.
- **제보 API**: Vercel은 **읽기 전용 파일 시스템**이라 `data/reports.json`에 쓸 수 없습니다. **Upstash Redis**(Vercel Storage 연동)는 재고 제보 기능에 **필수**입니다. Redis 없이 배포하면 제보 조회는 빈 목록, 제보 저장은 503 안내가 됩니다.

## 절차

1. 저장소를 GitHub 등에 푸시한 뒤 [Vercel](https://vercel.com)에서 **Import** 합니다.
2. **Environment Variables**에 다음을 설정합니다.
   - `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` — 카카오 JavaScript 키
3. **(필수)** 프로젝트 **Storage** 탭 → **Create Database** / Marketplace에서 **Redis**(Upstash)를 만들고 **Connect to Project**로 이 프로젝트에 연결합니다. 환경에 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`이 생기면 재배포 없이도 반영되는 경우가 많습니다(안 되면 **Redeploy**).
4. 배포가 끝나면 표시된 URL(예: `https://프로젝트.vercel.app`)을 카카오 플랫폼 Web 도메인에 추가합니다.
5. 프리뷰 배포 URL도 지도 테스트에 필요하면 동일하게 등록합니다(와일드카드가 안 되면 프리뷰마다 추가하거나 프로덕션만 사용).

## 로컬과의 차이

| 항목        | 로컬                    | Vercel                          |
|------------|-------------------------|----------------------------------|
| 판매소 JSON | `build:stores` / 빌드 시 생성 | 동일 (`build:all`)               |
| 제보 저장   | `data/reports.json`     | **Redis 필수**(파일 쓰기 불가)   |

## Node 버전

`package.json`의 `engines`와 `.nvmrc`는 Node 20 이상을 가정합니다. Vercel 프로젝트 설정에서 **Node.js Version**을 20.x로 맞추면 됩니다.
