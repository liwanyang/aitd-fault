const PORT = process.env.PORT || 9000;

// log unhandled errors
process.on("unhandledRejection", (error) => {
  console.error("unhandledRejection", error);
});
process.on("uncaughtException", (err) => {
  console.error(`uncaughtException: ${err.stack || err.message || err}`);
});

const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const EthQuery = require("ethjs-query");
const BN = require("bn.js");
const ethUtil = require("ethereumjs-util");
const geoIp = require("@pablopunk/geo-ip");
const emojiFlag = require("emoji-flag");
const formartConfig = require("./get-config");
const rpcWrapperEngine = require("./engine.js");

const appPath = path.join(__dirname, "../../", "build");

const min = 60 * 1000;
const ether = 1e18;
let currencyNumber = 1;
const faucetAmountWei = currencyNumber * ether;
const EtherBN = new BN("1000000000000000000", 10);
const MAX_BALANCE = EtherBN.mul(new BN("4", 10));
const AUTO_RESTART_INTERVAL = 60 * min;
let indexs = 0;
// load all configs
const configPath = path.resolve(
  process.env.FAUCET_CONFIG_PATH || "../../config.js"
);
const allConfigs = require(configPath);
const environment = process.env.FAUCET_CONFIG || "ropsten";
const configLength = allConfigs[environment].length;

//
// create engine
//

// ProviderEngine based caching layer, with fallback to geth
function creatEngine() {
  const engine = rpcWrapperEngine({
    rpcUrl: formartConfig(indexs).rpcOrigin,
    addressHex: formartConfig(indexs).address,
    privateKey: ethUtil.toBuffer(indexs.privateKey)
  });

  engine.on("error", (err) => {
    console.error(
      `Error in ProviderEngine: ${err.stack || err.message || err}`
    );
  });

  return new EthQuery(engine);
}

let ethQuery = creatEngine();

startServer();

//
// create webserver
//
function startServer() {
  const app = express();
  // set CORS headers
  app.use(cors());
  // parse body
  // app.use(bodyParser.text({ type: '*/*' }))
  app.use(bodyParser.json());
  // trust the "x-forwarded-for" header from our reverse proxy
  app.enable("trust proxy");
  // serve app
  app.use(express.static(appPath));

  // handle fauceting request
  app.post("/v0/request", handleRequest);

  // start server
  const server = app.listen(PORT, function () {
    console.log("ethereum rpc listening on", PORT);
    console.log("and proxying to", formartConfig(indexs).rpcOrigin);
  });

  setupGracefulShutdown(server);

  // Lazy nonce tracking fix:
  // Force an exit (docker will trigger a restart)
  setTimeout(() => {
    console.log("Restarting for better nonce tracking");
    shutdown();
  }, AUTO_RESTART_INTERVAL);

  async function handleRequest(req, res) {
    try {
      console.log("configLength::", configLength);
      if (configLength === indexs) {
        indexs = 0;
      }
      ethQuery = creatEngine(indexs);
      // parse address
      let targetAddress = req.body.account;
      currencyNumber = req.body.num;
      if (!targetAddress || typeof targetAddress !== "string") {
        indexs++;
        return didError(
          res,
          new Error(`Address parse failure - request body empty`)
        );
      }
      if (targetAddress.slice(0, 2) !== "0x") {
        indexs++;
        targetAddress = "0x" + targetAddress;
      }
      if (targetAddress.length !== 42) {
        indexs++;
        return didError(
          res,
          new Error(`Address parse failure - "${targetAddress}"`)
        );
      }
      // parse ip-address
      const ipAddress =
        req.headers["x-forwarded-for"] || req.connection.remoteAddress;
      // get flag for ip-address
      let flag;
      try {
        const geoData = geoIp({ ip: ipAddress });
        const countryCode = geoData.country_code;
        flag = emojiFlag(countryCode) + " ";
      } catch (err) {
        flag = "  ";
      }
      // create label string for log
      const alignedIpAddress = ipAddress.padStart(15, " ");
      const requestorMessage = `${flag} ${alignedIpAddress} requesting for ${targetAddress}`;
      // check for greediness
      const balance = await ethQuery.getBalance(targetAddress, "pending");
      const balanceTooFull = balance.gt(MAX_BALANCE);
      if (balanceTooFull) {
        indexs++;
        console.log(`${requestorMessage} - already has too much aitd`);
        return didError(
          res,
          new Error("User is greedy - already has too much aitd")
        );
      }
      // send value
      const txHash = await ethQuery.sendTransaction({
        to: targetAddress,
        from: formartConfig(indexs).address,
        value: faucetAmountWei,
        data: ""
      });
      console.log(`${requestorMessage} - sent tx: ${txHash}`);
      indexs++;
      res.send(txHash);
    } catch (err) {
      console.error(err.stack);
      return didError(res, err);
    }
  }

  function didError(res, err) {
    res.status(500).json({ error: err.message });
  }

  function setupGracefulShutdown() {
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  }

  // Do graceful shutdown
  function shutdown() {
    console.log("gracefully shutting down...");
    server.close(() => {
      console.log("shut down complete.");
      process.exit(0);
    });
  }
}
