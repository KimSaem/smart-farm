# GitHub + Cloudflare Pages 배포 순서

## 1. Git 저장소 만들기

```bash
cd microgreen-command-center
git init
git add .
git commit -m "Create microgreen command center"
```

## 2. GitHub에 연결

GitHub에서 새 저장소를 만든 뒤:

```bash
git remote add origin https://github.com/YOUR_ACCOUNT/microgreen-command-center.git
git branch -M main
git push -u origin main
```

## 3. Cloudflare Pages 연결

1. Cloudflare Dashboard로 이동합니다.
2. Workers & Pages → Create application → Pages를 선택합니다.
3. GitHub 저장소 `microgreen-command-center`를 연결합니다.
4. 빌드 설정을 입력합니다.
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
5. 배포 후 제공되는 `*.pages.dev` 주소로 접속합니다.

## 4. 실제 센서 연결 아키텍처

```text
ESP32 / PLC / Raspberry Pi
  -> MQTT or HTTPS
  -> Cloudflare Worker API
  -> D1 / KV / Durable Object
  -> Microgreen Command Center
```

## 5. 현장 네트워크 기준

- 농장 내부 IoT 장비는 전용 Wi-Fi 또는 유선망을 사용합니다.
- 제어 장비와 방문자 네트워크는 분리합니다.
- 펌프/조명 제어는 수동 오버라이드 스위치를 반드시 둡니다.
- 클라우드 장애 시에도 기본 조명/급수 스케줄은 로컬 컨트롤러에서 유지합니다.
