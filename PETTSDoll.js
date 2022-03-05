let PETTS_SERVICE = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
let PETTS_NOTIFY = "beb5483e-36e1-4688-b7f5-ea07361b26a9";
let PETTS_WRITE = "beb5483e-36e1-4688-b7f5-ea07361b26aa";
let PETTS_LUNG_PRESSURE = "beb5483e-36e1-4688-b7f5-ea07361b26ab";
const sim_state_word_lookup = ["Stable","Distress","Arrest1","Arrest2","Arrest3","Recovery","Failure","Success"]
class PETTSDoll {

  constructor(disconnect_cb) {
    this.device = null;
    this.disconnect_cb = disconnect_cb;
    this.onDisconnected = this.onDisconnected.bind(this);
  }
  
  request() {
    let options = {
      "filters": [{
        "name": "PETTS"
      }],
      "optionalServices": [PETTS_SERVICE]
    };
    return navigator.bluetooth.requestDevice(options)
    .then(device => {
      this.device = device;
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
    });
  }
  
  connect() {
    if (!this.device) {
      return Promise.reject('Device is not connected.');
    }
    return this.device.gatt.connect();
  }
  readStartStop() {
    return this.device.gatt.getPrimaryService(PETTS_SERVICE)
    .then(service => service.getCharacteristic(PETTS_WRITE))
    .then(characteristic => characteristic.readValue());
  }

  writeStartStop(data) {
    return this.device.gatt.getPrimaryService(PETTS_SERVICE)
    .then(service => service.getCharacteristic(PETTS_WRITE))
    .then(characteristic => characteristic.writeValue(data));
  }

  startStartStopNotifications(listener) {
    return this.device.gatt.getPrimaryService(PETTS_SERVICE)
    .then(service => service.getCharacteristic(PETTS_WRITE))
    .then(characteristic => characteristic.startNotifications())
    .then(characteristic => characteristic.addEventListener('characteristicvaluechanged', listener));
  }

  stopStartStopNotifications(listener) {
    return this.device.gatt.getPrimaryService(PETTS_SERVICE)
    .then(service => service.getCharacteristic(PETTS_WRITE))
    .then(characteristic => characteristic.stopNotifications())
    .then(characteristic => characteristic.removeEventListener('characteristicvaluechanged', listener));
  }

  startDataUpdateNotifications(listener) {
    return this.device.gatt.getPrimaryService(PETTS_SERVICE)
    .then(service => service.getCharacteristic(PETTS_NOTIFY))
    .then(characteristic => characteristic.startNotifications())
    .then(characteristic => characteristic.addEventListener('characteristicvaluechanged', listener));
  }

  stopDataUpdateNotifications(listener) {
    return this.device.gatt.getPrimaryService(PETTS_SERVICE)
    .then(service => service.getCharacteristic(PETTS_NOTIFY))
    .then(characteristic => characteristic.stopNotifications())
    .then(characteristic => characteristic.removeEventListener('characteristicvaluechanged', listener));
  }

  writeFullLungPressure(value)
  {
    console.log(value);
    let data = new Uint16Array(1);
    data[0] = value;
    console.log(data);
    return this.device.gatt.getPrimaryService(PETTS_SERVICE)
    .then(service => service.getCharacteristic(PETTS_LUNG_PRESSURE))
    .then(characteristic =>characteristic.writeValue(data))
  }
  readFullLungPressure(value)
  {
    return this.device.gatt.getPrimaryService(PETTS_SERVICE)
    .then(service => service.getCharacteristic(PETTS_LUNG_PRESSURE))
    .then(characteristic =>characteristic.readValue())
    .then((value)=>{
        let view = new Uint16Array(value.buffer);
        return view[0];
    })
  }

    unpack_notify_data(buffer)
    {

      let uint16View = new Uint16Array(buffer);
      let uint8View = new Uint8Array(buffer);
      let time = uint16View[0]/100.0;
      let resp_rate = uint16View[1]/10.0;
      let heart_rate = uint16View[2];
      let pressure = uint16View[3];
      let stage = uint8View[8];
      let o2sat = uint8View[9];
      let internal = uint8View[11];
      let trach_solenoid_state =  (internal & 0b10000000) ?  true : false;
      let exhale_solenoid_state = (internal & 0b01000000) ?  true : false;
      let inlet_solenoid_state =  (internal & 0b00100000) ?  true : false;
      let trach_state_int =  (internal & 0b00011000) >> 3;
      let trach_state_word = "---";
      if(trach_state_int == 1) trach_state_word = "Waiting For Removal";
      if(trach_state_int == 2) trach_state_word = "Removed";
      if(trach_state_int == 3) trach_state_word = "Replaced";

      return {"time":time, "resp_rate":resp_rate, "heart_rate":heart_rate, "pressure":pressure, "stage":stage,"o2sat":o2sat,"internal":internal, "trach_state_word":trach_state_word, "sim_stage_word":sim_state_word_lookup[stage]};
    }
  disconnect() {
    if (!this.device) {
      return Promise.reject('Device is not connected.');
    }
    return this.device.gatt.disconnect();
  }

  onDisconnected() {
    console.log('Device is disconnected.');
    if(this.disconnect_cb){
        this.disconnect_cb();
    }
  }
}
