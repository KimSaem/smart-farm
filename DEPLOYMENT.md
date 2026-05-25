# GitHub + Cloudflare 배포 상태

## 이미 만든 Cloudflare 리소스

| 리소스 | 이름/주소 |
| --- | --- |
| D1 Database | `smartfarm-microgreen-os` |
| D1 ID | `9d670990-7969-4b70-8a6e-b51aa02ab276` |
| Worker API | `https://smartfarm-microgreen-api.rlatoa2201.workers.dev` |
| Pages Project | `smartfarm-microgreen-command` |
| Pages Domain | `smartfarm-microgreen-command.pages.dev` |

## API 확인

```bash
curl https://smartfarm-microgreen-api.rlatoa2201.workers.dev/api/health
curl https://smartfarm-microgreen-api.rlatoa2201.workers.dev/api/summary
```

## 1. GitHub 저장소 만들기

현재 PC에는 GitHub CLI가 설치되어 있지 않고, Codex GitHub 앱에서 접근 가능한 저장소도 아직 0개입니다. GitHub에서 새 저장소를 만든 뒤 아래 명령을 실행하면 됩니다.

```bash
cd microgreen-command-center
git remote add origin https://github.com/KimSaem/smartfarm-microgreen-command.git
git push -u origin main
```

## 2. Cloudflare Pages 연결

1. Cloudflare Dashboard로 이동합니다.
2. Workers & Pages → `smartfarm-microgreen-command` 프로젝트를 엽니다.
3. GitHub 저장소 `KimSaem/smartfarm-microgreen-command`를 연결합니다.
4. 빌드 설정을 입력합니다.
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `VITE_API_URL=https://smartfarm-microgreen-api.rlatoa2201.workers.dev`
5. 배포 후 `https://smartfarm-microgreen-command.pages.dev`로 접속합니다.

## 3. 실제 센서 연결 아키텍처

```text
ESP32 / PLC / Raspberry Pi
  -> MQTT or HTTPS
  -> Cloudflare Worker API
  -> D1 / KV / Durable Object
  -> Microgreen Command Center
```

## 4. 센서 데이터 전송 예시

```bash
curl -X POST https://smartfarm-microgreen-api.rlatoa2201.workers.dev/api/telemetry \
  -H "Content-Type: application/json" \
  -d "{\"zone_id\":\"grow-1\",\"temp\":21.9,\"humidity\":55,\"co2\":790,\"ppfd\":242,\"water_level\":66,\"ph\":5.9,\"ec\":0.7}"
```

## 5. 현장 네트워크 기준

- 농장 내부 IoT 장비는 전용 Wi-Fi 또는 유선망을 사용합니다.
- 제어 장비와 방문자 네트워크는 분리합니다.
- 펌프/조명 제어는 수동 오버라이드 스위치를 반드시 둡니다.
- 클라우드 장애 시에도 기본 조명/급수 스케줄은 로컬 컨트롤러에서 유지합니다.
