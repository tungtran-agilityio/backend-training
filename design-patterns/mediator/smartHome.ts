/* =============================================================================
 * 1.  Mediator & colleague contracts
 * --------------------------------------------------------------------------- */
interface SmartHomeMediator {
  notify(sender: SmartDevice, event: string, payload?: any): void;
}

interface SmartDevice {
  id: string;
  setMediator(m: SmartHomeMediator): void;
}

/* =============================================================================
 * 2.  Concrete mediator (the hub)
 * --------------------------------------------------------------------------- */
class HomeHub implements SmartHomeMediator {
  private devices: Record<string, SmartDevice> = {};
  private alarmArmed = false;

  register(device: SmartDevice): void {
    this.devices[device.id] = device;
    device.setMediator(this);
  }

  notify(sender: SmartDevice, event: string, payload?: any): void {
    switch (event) {
      /* ─────── Security ─────────────────────────────── */
      case 'motionDetected':
        if (this.alarmArmed) {
          console.log('Hub → Alarm triggered!');
          (this.devices['alarm'] as Alarm).trigger();
        } else {
          (this.devices['lights'] as Lights).switchOn();
        }
        break;

      case 'armAlarm':
        this.alarmArmed = true;
        console.log('Hub → Alarm armed.');
        break;

      case 'disarmAlarm':
        this.alarmArmed = false;
        console.log('Hub → Alarm disarmed.');
        (this.devices['alarm'] as Alarm).silence();
        break;

      /* ─────── Climate ──────────────────────────────── */
      case 'windowOpened':
        console.log('Hub → Suspending HVAC (window open).');
        (this.devices['thermostat'] as Thermostat).pause();
        break;

      case 'windowClosed':
        console.log('Hub → Resuming HVAC (window closed).');
        (this.devices['thermostat'] as Thermostat).resume();
        break;
    }
  }
}

/* =============================================================================
 * 3.  Concrete colleagues
 * --------------------------------------------------------------------------- */
class MotionSensor implements SmartDevice {
  constructor(public id: string) { }
  private mediator!: SmartHomeMediator;
  setMediator(m: SmartHomeMediator) { this.mediator = m; }
  detect() {                       // client API
    console.log(`${this.id}: movement!`);
    this.mediator.notify(this, 'motionDetected');
  }
}

class WindowSensor implements SmartDevice {
  private open = false;
  constructor(public id: string) { }
  private mediator!: SmartHomeMediator;
  setMediator(m: SmartHomeMediator) { this.mediator = m; }
  toggle() {                       // client API
    this.open = !this.open;
    console.log(`${this.id}: window ${this.open ? 'OPEN' : 'CLOSED'}`);
    this.mediator.notify(this, this.open ? 'windowOpened' : 'windowClosed');
  }
}

class Lights implements SmartDevice {
  private mediator!: SmartHomeMediator;
  constructor(public id: string) { }
  setMediator(m: SmartHomeMediator) { this.mediator = m; }
  switchOn() { console.log('Lights: ON'); }
  switchOff() { console.log('Lights: OFF'); }
}

class Thermostat implements SmartDevice {
  private mediator!: SmartHomeMediator;
  private paused = false;
  constructor(public id: string) { }
  setMediator(m: SmartHomeMediator) { this.mediator = m; }
  pause() { if (!this.paused) { this.paused = true; console.log('Thermostat: HVAC paused'); } }
  resume() { if (this.paused) { this.paused = false; console.log('Thermostat: HVAC running'); } }
}

class Alarm implements SmartDevice {
  private mediator!: SmartHomeMediator;
  private active = false;
  constructor(public id: string) { }
  setMediator(m: SmartHomeMediator) { this.mediator = m; }

  arm() { this.mediator.notify(this, 'armAlarm'); }
  disarm() { this.mediator.notify(this, 'disarmAlarm'); }

  trigger() { if (!this.active) { this.active = true; console.log('Alarm: 🔔🔔🔔 WEE-OOO!'); } }
  silence() { if (this.active) { this.active = false; console.log('Alarm: silent'); } }
}

/* =============================================================================
 * 4.  Demo
 * --------------------------------------------------------------------------- */
const hub = new HomeHub();

const motion = new MotionSensor('motion');
const windowS = new WindowSensor('window');
const lights = new Lights('lights');
const thermo = new Thermostat('thermostat');
const alarm = new Alarm('alarm');

[motion, windowS, lights, thermo, alarm].forEach(d => hub.register(d));

/* Scenario --------------------------------------------------------------- */
alarm.arm();          // ➜ hub notes alarm armed
motion.detect();      // motion triggers alarm, not lights
alarm.disarm();       // silence it
windowS.toggle();     // window opened ➜ HVAC paused
windowS.toggle();     // window closed ➜ HVAC resumes
motion.detect();      // motion now just turns on lights
