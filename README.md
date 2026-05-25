# SmartFarm Microgreen Command Center

대기업급 마이크로그린 재배 시스템을 설치하고 운영하기 위한 Cloudflare 기반 관제 웹앱입니다.

## 포함된 기능

- 발아실, 생장랙, 수확/포장 구역 통합 대시보드
- 온도, 습도, CO2, PPFD, 저수조 상태 실시간 관제 UI
- 배치별 파종일, 수확 예정일, 예상 수확량 관리
- 작물별 표준 레시피: 발아일, 조명 시간, PPFD, 습도, 수확일
- 설치 BOM: 랙, LED, 급수, 센서, 위생 라인 기준
- Cloudflare D1 데이터베이스와 Worker API 연결
- 알림, SOP 작업 큐, QC 게이트, 자동제어 명령 센터

## 로컬 실행

```bash
npm install
npm run dev
```

## 현재 클라우드 리소스

- D1 database: `smartfarm-microgreen-os`
- D1 id: `9d670990-7969-4b70-8a6e-b51aa02ab276`
- Worker API: `https://smartfarm-microgreen-api.rlatoa2201.workers.dev`
- Pages project: `smartfarm-microgreen-command`
- Pages domain: `smartfarm-microgreen-command.pages.dev`

## 클라우드 배포

Cloudflare Pages 기준:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `VITE_API_URL=https://smartfarm-microgreen-api.rlatoa2201.workers.dev`

GitHub 저장소에 올린 뒤 Cloudflare Pages에서 저장소를 연결하면 자동 배포됩니다.

Worker API는 이미 Cloudflare에 배포되어 있고, 같은 코드는 `worker/index.js`에 보관되어 있습니다.

## 현장 설치 기준

1. 6단 수직 재배랙을 기준 단위로 설치합니다.
2. 각 단은 A1 트레이 8장 기준으로 설계합니다.
3. 랙당 총 48트레이, 6랙이면 288트레이 생산 셀이 됩니다.
4. 발아실, 생장실, 수확/포장 구역을 물리적으로 분리합니다.
5. 센서는 구역별 최소 1세트, 생장랙은 2단마다 1세트를 권장합니다.
6. 급수는 Ebb & Flow 방식으로 저수조, 펌프, 필터, pH/EC 센서를 포함합니다.

## 다음 확장

- 실제 센서 수집 API
- Cloudflare D1 배치 데이터베이스
- Cloudflare Workers API
- 모바일 알림
- QR 코드 기반 배치 추적
