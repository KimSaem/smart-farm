# SmartFarm Hardware Integration

This build uses the parts already available:

- Raspberry Pi: cloud gateway, dashboard sync, command polling
- Arduino: local IO controller for water sensor, relay outputs, fans, pump, lights
- Relay module: switches 12V loads
- 4020 fans: airflow and humidity control
- Full spectrum LED strip: grow lighting
- 12V water pump: ebb/flow or reservoir refill
- XH-M203 water level controller: autonomous pump protection / high-low water interlock
- Water level sensor: Arduino reservoir reading
- Solar oxygen pump: independent aeration for nutrient reservoir
- TDS/EC handheld meter: manual QC reading for now
- Small terrariums: seed tests, quarantine, sensor calibration chambers

## Recommended Architecture

```text
Cloudflare Worker + D1
        ^
        | HTTPS
Raspberry Pi Gateway
        ^
        | USB serial JSON
Arduino IO Controller
        |
        +-- Water level sensor
        +-- Relay CH1: water pump
        +-- Relay CH2: fans
        +-- Relay CH3: grow light
        +-- Relay CH4: spare / alarm / lockout
```

## Why Raspberry Pi + Arduino

The Pi is excellent for Wi-Fi, HTTPS, logging, and cloud sync. The Arduino is better for simple real-time IO, relay timing, and recovering safely after Pi reboots.

Do not let cloud latency directly control pumps. The dashboard should queue commands; the Pi should fetch commands; the Arduino should execute timed local actions.

## Safe Wiring Plan

Use a dedicated 12V DC power supply for pump, fans, and LED strip.

- 12V positive goes to relay COM.
- Relay NO goes to load positive.
- Load negative returns to 12V supply negative.
- Arduino only drives relay input pins.
- If the relay board requires shared ground, connect Arduino GND to relay GND.
- Keep all water hardware and exposed electronics physically separated.
- Add an inline fuse on the 12V supply.
- Use drip loops on every cable.

For 12V LED strips and fans, MOSFET control is better than relays if you want dimming/PWM. Relays are fine for simple ON/OFF.

## XH-M203 Role

Use the XH-M203 as a hardware safety interlock for water level control. It can protect the pump even if the Pi or Arduino crashes.

Recommended:

- XH-M203 controls or interrupts the pump line.
- Arduino still reads a separate water level sensor and reports status to the dashboard.
- Dashboard commands request pump cycles, but the XH-M203 remains the final safety gate.

## Current Sensor Reality

The TDS/EC meter is handheld, so it cannot automatically send readings unless modified or replaced with an electronic EC circuit.

For full automation later, add:

- SHT31 or BME280 for temp/humidity
- SCD41 for CO2
- BH1750 for basic light, or a real PAR/PPFD sensor for serious tuning
- Atlas Scientific EZO pH/EC circuits for nutrient monitoring

## First Build Milestone

1. Arduino sends water level and relay states to Raspberry Pi.
2. Pi posts telemetry to `/api/telemetry`.
3. Dashboard queues commands with `/api/commands`.
4. Pi claims queued commands.
5. Arduino executes relay actions.
6. Pi marks commands complete.

## Command Types

| Command | Local Action |
| --- | --- |
| `vent_boost` | Turn fans on for N minutes |
| `water_cycle` | Turn pump on for N seconds |
| `apply_light_recipe` | Turn lights on, or later set PWM dimming |
| `manual_lock` | Disable actuator execution until cleared |
| `qc_trace_snapshot` | Record a trace event; no actuator required |

