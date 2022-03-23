let PETTS_SERVICE = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
let PETTS_NOTIFY = "beb5483e-36e1-4688-b7f5-ea07361b26a9";
let PETTS_WRITE = "beb5483e-36e1-4688-b7f5-ea07361b26aa";
let PETTS_LUNG_PRESSURE = "beb5483e-36e1-4688-b7f5-ea07361b26ab";
let PETTS_COLOR = "beb5483e-36e1-4688-b7f5-ea07361b26ac";
let PETTS_SIM_1 = "beb5483e-36e1-4688-b7f5-ea07361b26ad"
let PETTS_SIM_2 = "beb5483e-36e1-4688-b7f5-ea07361b26ae"
let PETTS_SIM_3 = "beb5483e-36e1-4688-b7f5-ea07361b26af"
let PETTS_SIM_4 = "beb5483e-36e1-4688-b7f5-ea07361b26ba"
let PETTS_SIM_5 = "beb5483e-36e1-4688-b7f5-ea07361b26bb"
let PETTS_SIM_6 = "beb5483e-36e1-4688-b7f5-ea07361b26bc"
let PETTS_SIM_7 = "beb5483e-36e1-4688-b7f5-ea07361b26bd"
let PETTS_SIM_8 = "beb5483e-36e1-4688-b7f5-ea07361b26be"

let PETTS_STAGE_STABLE = 0
let PETTS_STAGE_DISTRESS = 1
let PETTS_STAGE_ARREST1 = 2
let PETTS_STAGE_ARREST2 = 3
let PETTS_STAGE_ARREST3 = 4
let PETTS_STAGE_RECOVERY = 5
let PETTS_STAGE_FAILURE = 6
let PETTS_STAGE_SUCCESS = 7
const sim_def_lookup = [PETTS_SIM_1, PETTS_SIM_2,PETTS_SIM_3,PETTS_SIM_4, PETTS_SIM_5, PETTS_SIM_6, PETTS_SIM_7, PETTS_SIM_8];
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
  writeColor(appendage, color)
  {
    let data = new Uint8Array(7);
    data[0] = 6;
    if(appendage == "HEAD") data[1] = 1;
    else if(appendage == "LEFT_ARM") data[1] = 2;
    else if(appendage == "RIGHT_ARM") data[1] = 3;
    else if(appendage == "TORSO") data[1] = 4;
    data[2] = color["brightness"]
    data[3] = color["red"]
    data[4] = color ["green"]
    data[5] = color["blue"]
    data[6] = color["white"]
    return this.device.gatt.getPrimaryService(PETTS_SERVICE)
    .then(service => service.getCharacteristic(PETTS_COLOR))
    .then(characteristic =>characteristic.writeValue(data))
  }
  readSimDef(stage)
  {
    if(stage < 0 || stage > PETTS_STAGE_SUCCESS) return false;

    return this.device.gatt.getPrimaryService(PETTS_SERVICE)
    .then(service => service.getCharacteristic(sim_def_lookup[stage]))
    .then(characteristic => characteristic.readValue())
    .then((value)=>{
        let view32 = new Uint32Array(value.buffer.slice(0,8));
        let view8 = new Uint8Array(value.buffer);
        let breath_duration_ms = view32[0];
        let duration_ms = view32[1];
        let index = 8;//4+4 for the two uint32 values
        let colors = {
            "head":{"red":view8[index++], "green":view8[index++], "blue":view8[index++],"white":view8[index++],"brightness":view8[index++]},
            "arms":{"red":view8[index++], "green":view8[index++], "blue":view8[index++],"white":view8[index++],"brightness":view8[index++]},
            "torso":{"red":view8[index++], "green":view8[index++], "blue":view8[index++],"white":view8[index++],"brightness":view8[index++]}
        };
        return {"breath_duration_ms":breath_duration_ms, "duration_ms":duration_ms, "colors":colors};
    })
  }
  writeSimDef(stage, new_values)
  {
    if(stage < 0 || stage > PETTS_STAGE_SUCCESS) return false;
        let view8 = new Uint8Array(4+4+5*3);
        let view32 = new Uint32Array(2)
        // let view8 = new Uint8Array(buffer);
        view32[0] = new_values["breath_duration_ms"];
        view32[1] = new_values["duration_ms"];
        let temp8 = new Uint8Array(view32.buffer);
        for(let i=0; i<8; i++)
        {
            view8[i] = temp8[i];
        }
        let index = 8;
        let color = new_values["colors"]["head"];
        view8[index++] = color["red"];
        view8[index++] = color["green"];
        view8[index++] = color["blue"];
        view8[index++] = color["white"];
        view8[index++] = color["brightness"];

        color = new_values["colors"]["arms"];
        view8[index++] = color["red"];
        view8[index++] = color["green"];
        view8[index++] = color["blue"];
        view8[index++] = color["white"];
        view8[index++] = color["brightness"];

        color = new_values["colors"]["torso"];
        view8[index++] = color["red"];
        view8[index++] = color["green"];
        view8[index++] = color["blue"];
        view8[index++] = color["white"];
        view8[index++] = color["brightness"];

        for(var i=0; i<23; i++)
        {
            console.log("\tdata["+i+"]="+view8[i]);
        }

    return this.device.gatt.getPrimaryService(PETTS_SERVICE)
    .then(service => service.getCharacteristic(sim_def_lookup[stage]))
    .then(characteristic => characteristic.writeValue(view8))
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
