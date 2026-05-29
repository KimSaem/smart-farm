/*
  SmartFarm Arduino IO Controller

  Board: Arduino Uno/Nano compatible
  Link: USB serial to Raspberry Pi

  This sketch reports basic reservoir telemetry and executes simple relay commands
  received from the Raspberry Pi.
*/

const int WATER_LEVEL_PIN = A0;

const int RELAY_PUMP_PIN = 4;
const int RELAY_FAN_PIN = 5;
const int RELAY_LIGHT_PIN = 6;
const int RELAY_AUX_PIN = 7;

const bool RELAY_ACTIVE_LOW = true;

unsigned long fanUntil = 0;
unsigned long pumpUntil = 0;
unsigned long lightUntil = 0;
unsigned long lastTelemetry = 0;
bool manualLock = false;

void relayWrite(int pin, bool on) {
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(pin, on ? LOW : HIGH);
  } else {
    digitalWrite(pin, on ? HIGH : LOW);
  }
}

void allRelaysOff() {
  relayWrite(RELAY_PUMP_PIN, false);
  relayWrite(RELAY_FAN_PIN, false);
  relayWrite(RELAY_LIGHT_PIN, false);
  relayWrite(RELAY_AUX_PIN, false);
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PUMP_PIN, OUTPUT);
  pinMode(RELAY_FAN_PIN, OUTPUT);
  pinMode(RELAY_LIGHT_PIN, OUTPUT);
  pinMode(RELAY_AUX_PIN, OUTPUT);
  allRelaysOff();
}

void applyCommand(String line) {
  if (line.indexOf("manual_lock") >= 0) {
    manualLock = true;
    allRelaysOff();
    Serial.println("{\"event\":\"manual_lock_enabled\"}");
    return;
  }

  if (line.indexOf("manual_unlock") >= 0) {
    manualLock = false;
    Serial.println("{\"event\":\"manual_lock_cleared\"}");
    return;
  }

  if (manualLock) {
    Serial.println("{\"event\":\"command_rejected\",\"reason\":\"manual_lock\"}");
    return;
  }

  if (line.indexOf("vent_boost") >= 0) {
    fanUntil = millis() + 15UL * 60UL * 1000UL;
    relayWrite(RELAY_FAN_PIN, true);
    Serial.println("{\"event\":\"fan_on\"}");
  }

  if (line.indexOf("water_cycle") >= 0) {
    pumpUntil = millis() + 45UL * 1000UL;
    relayWrite(RELAY_PUMP_PIN, true);
    Serial.println("{\"event\":\"pump_on\"}");
  }

  if (line.indexOf("apply_light_recipe") >= 0) {
    lightUntil = millis() + 60UL * 60UL * 1000UL;
    relayWrite(RELAY_LIGHT_PIN, true);
    Serial.println("{\"event\":\"light_on\"}");
  }
}

void expireTimedRelays() {
  unsigned long now = millis();
  if (pumpUntil > 0 && now > pumpUntil) {
    pumpUntil = 0;
    relayWrite(RELAY_PUMP_PIN, false);
    Serial.println("{\"event\":\"pump_off\"}");
  }
  if (fanUntil > 0 && now > fanUntil) {
    fanUntil = 0;
    relayWrite(RELAY_FAN_PIN, false);
    Serial.println("{\"event\":\"fan_off\"}");
  }
  if (lightUntil > 0 && now > lightUntil) {
    lightUntil = 0;
    relayWrite(RELAY_LIGHT_PIN, false);
    Serial.println("{\"event\":\"light_off\"}");
  }
}

void sendTelemetry() {
  int raw = analogRead(WATER_LEVEL_PIN);
  int waterPercent = map(raw, 0, 1023, 0, 100);
  waterPercent = constrain(waterPercent, 0, 100);

  Serial.print("{\"type\":\"telemetry\",\"zone_id\":\"grow-1\",\"water_level\":");
  Serial.print(waterPercent);
  Serial.print(",\"relay_pump\":");
  Serial.print(pumpUntil > 0 ? "true" : "false");
  Serial.print(",\"relay_fan\":");
  Serial.print(fanUntil > 0 ? "true" : "false");
  Serial.print(",\"relay_light\":");
  Serial.print(lightUntil > 0 ? "true" : "false");
  Serial.print(",\"manual_lock\":");
  Serial.print(manualLock ? "true" : "false");
  Serial.println("}");
}

void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      applyCommand(line);
    }
  }

  expireTimedRelays();

  if (millis() - lastTelemetry > 10000UL) {
    lastTelemetry = millis();
    sendTelemetry();
  }
}

