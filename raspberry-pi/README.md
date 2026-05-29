# Raspberry Pi SmartFarm Gateway

라즈베리파이에서 센서 데이터를 Cloudflare Worker API로 송신하고, 대시보드에서 누른 팬/펌프/LED 명령을 폴링해 실행하는 게이트웨이입니다.

## 실행

```bash
cd raspberry-pi
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python smartfarm_gateway.py
```

## 환경변수

```bash
export SMARTFARM_API_URL="https://smartfarm-microgreen-api.rlatoa2201.workers.dev"
export SMARTFARM_DEVICE_KEY=""
export SMARTFARM_ZONE_ID="grow-1"
```

`SMARTFARM_DEVICE_KEY`는 Cloudflare Worker에 `DEVICE_KEY` secret을 설정했을 때 사용합니다. 아직 secret을 설정하지 않았으면 빈 값으로 둬도 됩니다.

## 실제 센서 연결 지점

두 가지 모드가 있습니다.

- `smartfarm_gateway.py`: Pi 단독 시뮬레이션/센서 직접 연결 모드
- `smartfarm_serial_gateway.py`: Arduino가 IO를 맡고 Pi가 클라우드 게이트웨이를 맡는 권장 모드

Arduino를 USB로 연결한 뒤:

```bash
export SMARTFARM_SERIAL_PORT="/dev/ttyACM0"
python smartfarm_serial_gateway.py
```

`smartfarm_gateway.py`의 `read_sensors()` 함수 안을 실제 센서 코드로 교체하면 Pi 단독 모드로도 운용할 수 있습니다.

- 온습도: SHT31, BME280, DHT22
- CO2: SCD30, SCD41
- 광량: Apogee SQ 계열, BH1750 보정형, PAR 센서
- 수위: 아날로그 수위 센서 또는 플로트 스위치
- pH/EC: Atlas Scientific EZO 회로 권장

## 명령 실행 지점

`execute_command()` 함수에서 릴레이/GPIO/PLC 제어 코드를 연결합니다.

- `vent_boost`: 팬 강화
- `water_cycle`: 펌프 급수
- `apply_light_recipe`: LED 디밍/스케줄 적용
- `manual_lock`: 수동 오버라이드 잠금
