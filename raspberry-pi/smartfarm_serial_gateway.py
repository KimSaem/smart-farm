import json
import os
import random
import time
from datetime import datetime, timezone

import requests
import serial


API_URL = os.getenv("SMARTFARM_API_URL", "https://smartfarm-microgreen-api.rlatoa2201.workers.dev").rstrip("/")
DEVICE_KEY = os.getenv("SMARTFARM_DEVICE_KEY", "")
SERIAL_PORT = os.getenv("SMARTFARM_SERIAL_PORT", "/dev/ttyACM0")
BAUD = int(os.getenv("SMARTFARM_BAUD", "115200"))
ZONE_ID = os.getenv("SMARTFARM_ZONE_ID", "grow-1")
POLL_SECONDS = int(os.getenv("SMARTFARM_POLL_SECONDS", "10"))


def headers():
    result = {"Content-Type": "application/json"}
    if DEVICE_KEY:
        result["X-Device-Key"] = DEVICE_KEY
    return result


def enrich_telemetry(payload):
    return {
        "zone_id": payload.get("zone_id", ZONE_ID),
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "temp": round(21.8 + random.uniform(-0.4, 0.4), 1),
        "humidity": round(55 + random.uniform(-3, 3), 1),
        "co2": int(790 + random.uniform(-45, 45)),
        "ppfd": int(240 + random.uniform(-18, 18)),
        "water_level": int(payload.get("water_level", 65)),
        "ph": 5.9,
        "ec": 0.7,
    }


def post_telemetry(payload):
    response = requests.post(f"{API_URL}/api/telemetry", headers=headers(), json=payload, timeout=10)
    response.raise_for_status()


def fetch_commands():
    response = requests.get(
        f"{API_URL}/api/commands",
        headers=headers(),
        params={"zone_id": ZONE_ID, "claim": "1"},
        timeout=10,
    )
    response.raise_for_status()
    return response.json().get("commands", [])


def complete_command(command_id):
    response = requests.post(f"{API_URL}/api/commands/{command_id}/complete", headers=headers(), timeout=10)
    response.raise_for_status()


def main():
    print(f"Opening Arduino serial port {SERIAL_PORT} at {BAUD}")
    with serial.Serial(SERIAL_PORT, BAUD, timeout=1) as board:
        last_command_poll = 0
        while True:
            line = board.readline().decode("utf-8", errors="ignore").strip()
            if line:
                print(f"arduino: {line}")
                try:
                    payload = json.loads(line)
                    if payload.get("type") == "telemetry":
                        telemetry = enrich_telemetry(payload)
                        post_telemetry(telemetry)
                        print(f"cloud telemetry: {telemetry}")
                except json.JSONDecodeError:
                    pass

            if time.time() - last_command_poll > POLL_SECONDS:
                last_command_poll = time.time()
                for command in fetch_commands():
                    board.write((json.dumps(command) + "\n").encode("utf-8"))
                    board.flush()
                    complete_command(command["id"])
                    print(f"command sent to arduino: {command['command_type']}")

            time.sleep(0.1)


if __name__ == "__main__":
    main()

