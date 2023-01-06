
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });

var influxdb_client_1 = require("@influxdata/influxdb-client");
const http = require("http");
const argv = require('minimist')(process.argv.slice(2));

const url = "http://localhost:8086";
const token = "FyjEALBU9ToIZPry99DfTykwZVPY7o710YcuBHfnn-EUsPzKyLKHG2-0KyBNLHIlh7ystdES1CuRLNFKMTWsGw==";
const org = "CDP";
const bucket = "bg";


var influxDB = new influxdb_client_1.InfluxDB({ url: url, token: token });

var writeApi = influxDB.getWriteApi(org, bucket);

function createPoint(value, mode, threshold, code) {
  var point1 = new influxdb_client_1.Point(mode)
    .floatField(mode, value)
    .floatField("threshold", threshold)
    .intField("code", code);
  return point1;
}

function sendPoint(point) {
  console.log(" ".concat(point));
  writeApi.writePoint(point);
  writeApi.flush().then(function () {
    console.log("WRITE FINISHED");
  });
}

const requestListener = function (req, res, type){
  let data = "";
  req.on("data", (chunk) => {
    data += chunk;
  });
  req.on("end", () => {
    processInput(type, res, data);
  });
}

const tempRequestListener = function (req, res) {
  const type = "temperature";
  requestListener(req, res, type);
};

const humidRequestListener = function (req, res) {
  const type = "humidity";
  requestListener(req, res, type);
};


const humidServer = http.createServer(humidRequestListener);

humidServer.listen(7143, "localhost", () => {
  console.log(
    "Humid : on http://localhost:7143"
  );
});
const tempServer = http.createServer(tempRequestListener);
tempServer.listen(7123, "localhost", () => {
  console.log(
    "Temp: http://localhost:7123"
  );
});


function processInput(mode, res, data) {
  let threshold = 0;
  const frame = JSON.parse(data);
  let code = parseValue(frame.data, 0, 2);
  let value = parseValue(frame.data, 2, 6) / 10;
  if (frame.data.length > 6) {
    if(mode === "humidity"){
      threshold = parseValue(frame.data, 6, 10)
    }
    else{
      threshold = parseValue(frame.data, 6, 10) / 10;
    }
  }
  const poin = createPoint(value, mode, threshold, code);
  sendPoint(poin);
  res.writeHead(200);
  res.end("OK");
}

function fromByte(string) {
  return parseInt(string, 16);
}

function parseValue(string, indexStart, indexEnd) {
  const result = string.substring(indexStart, indexEnd);
  return fromByte(result);
}

function close(){
  writeApi.close().then(function () {
    console.log("CLOSE API");
  });
}

process.on("exit", function () {
  close()
});

process.on('SIGINT', function() {
  close()
});
