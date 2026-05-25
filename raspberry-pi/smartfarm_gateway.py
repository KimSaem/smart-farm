import json
import os
import random
import time
from datetime import datetime, timezone

import requests


API_URL = os.getenv("SMARTFARM_API_URL", "https://smartfarm-microgreen-api.rlatoa2201.workers.dev").rstrip("/")
DEVICE_KEY = os.getenv("SMARTFARM_DEVICE_KEY", "")
ZONE_ID = os.getenv("SMARTFARM_ZONE_ID", "grow-1")
POLL_SECONDS = int(os.getenv("SMARTFARM_POLL_SECONDS", "20"))


def headers():
    result = {"Content-Type": "application/json"}
    if DEVICE_KEY:
        result["X-Device-Key"] = DEVICE_KEY
    return result


def read_sensors():
    """Replace this simulator with real Raspberry Pi sensor reads."""
    return {
        "zone_id": ZONE_ID,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "temp": round(21.8 + random.uniform(-0.4, 0.4), 1),
        "humidity": round(55 + random.uniform(-3, 3), 1),
        "co2": int(790 + random.uniform(-45, 45)),
        "ppfd": int(240 + random.uniform(-18, 18)),
        "water_level": int(66 + random.uniform(-2, 2)),
        "ph": round(5.9 + random.uniform(-0.05, 0.05), 2),
        "ec": round(0.7 + random.uniform(-0.04, 0.04), 2),
    }


def post_telemetry(payload):
    response = requests.post(f"{API_URL}/api/telemetry", headers=headers(), data=json.dumps(payload), timeout=10)
    response.raise_for_status()
    return response.json()


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


def execute_command(command):
    payload = json.loads(command.get("payload") or "{}")
    command_type = command["command_type"]
    print(f"Executing {command_type}: {payload}")

    if command_type == "vent_boost":
        # TODO: GPIO/PLC fan relay on for payload["minutes"].
        pass
    elif command_type == "water_cycle":
        # TODO: GPIO/PLC pump relay on for payload["seconds"].
        pass
    elif command_type == "apply_light_recipe":
        # TODO: Send PPFD/hour target to LED controller.
        pass
    elif command_type == "manual_lock":
        # TODO: Lock local manual override state.
        pass

    complete_command(command["id"])


def main():
    print(f"SmartFarm gateway online: zone={ZONE_ID}, api={API_URL}")
    while True:
        try:
            telemetry = read_sensors()
            post_telemetry(telemetry)
            print(f"telemetry sent: {telemetry}")

            for command in fetch_commands():
                execute_command(command)
        except Exception as exc:
            print(f"gateway error: {exc}")

        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
