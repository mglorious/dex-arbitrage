const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

let config, arb, owner, inTrade, balances;
const network = hre.network.name;
if (network === 'aurora') config = require('../config/aurora.json');
if (network === 'fantom') config = require('./../config/fantom.json');
if (network === 'bsc') config = require('../config/bsc.json');

const main = async () => {
  console.log(`.oO(DEX Trader 🚀)`);
  console.log(`✔ Network: ${network}`);
  if (config.trade) {
    console.log(`✔ AutoTrading Activated!`);
  } else {
    console.log(`✔ WatchMode Activated!`);
  }
  await setup();
  await lookForDualTrade();
  // Scale when using own node
  //[0,0,0,0,0,0,0,0,0].forEach(async (v,i) => {
  //  await new Promise(r => setTimeout(r, i*1000));
  //  await lookForDualTrade();
  //});
}

const searchForRoutes = () => {
  const targetRoute = {};
  targetRoute.router1 = config.routers[Math.floor(Math.random() * config.routers.length)].address;
  targetRoute.router2 = config.routers[Math.floor(Math.random() * config.routers.length)].address;
  targetRoute.token1 = config.baseAssets[Math.floor(Math.random() * config.baseAssets.length)].address;
  targetRoute.token2 = config.tokens[Math.floor(Math.random() * config.tokens.length)].address;
  return targetRoute;
}

let goodCount = 0;
let globalCount = 0;
const useGoodRoutes = () => {
  const targetRoute = {};
  const route = config.routes[goodCount];
  goodCount += 1;
  globalCount += 1;
  if (goodCount >= config.routes.length) goodCount = 0;
  targetRoute.router1 = route[0];
  targetRoute.router2 = route[1];
  targetRoute.token1 = route[2];
  targetRoute.token2 = route[3];
  return targetRoute;
}

const lookForDualTrade = async () => {
  let targetRoute;
  if (config.routes.length > 0) {
    targetRoute = useGoodRoutes();
  } else {
    targetRoute = searchForRoutes();
  }
  try {
    let tradeSize = balances[targetRoute.token1].balance;
    const amtBack = await arb.estimateDualDexTrade(targetRoute.router1, targetRoute.router2, targetRoute.token1, targetRoute.token2, tradeSize); //{ gasPrice: 5000000000, gasLimit: 1869316 }
    const multiplier = ethers.BigNumber.from(config.minBasisPointsPerTrade + 10000);
    const sizeMultiplied = tradeSize.mul(multiplier);
    const divider = ethers.BigNumber.from(10000);
    const profitTarget = sizeMultiplied.div(divider);
    if (!config.routes.length > 0) {
      fs.appendFile(`./data/${network}RouteLog.txt`, `["${targetRoute.router1}","${targetRoute.router2}","${targetRoute.token1}","${targetRoute.token2}"],` + "\n", function (err) { });
    }
    //console.log (goodCount, ` ✨Profit: ${amtBack}`, `👌 Target: ${profitTarget}`)
    if (amtBack.gt(profitTarget)) {
      if (config.trade) {
        await dualTrade(targetRoute.router1, targetRoute.router2, targetRoute.token1, targetRoute.token2, tradeSize);
      } else {
        console.log (`🤞 New Arbitrage Opportunity!`)
        console.log (targetRoute)
        console.log (`✨Profit Target: ${amtBack}`)
        console.log (`✨Profit: ${amtBack}`)
        await lookForDualTrade();
      }
    } else {
      await lookForDualTrade();
    }
  } catch (e) {
    console.log(e);
    await lookForDualTrade();
  }
}

const dualTrade = async (router1, router2, baseToken, token2, amount) => {
  if (inTrade === true) {
    await lookForDualTrade();
    return false;
  }
  try {
    inTrade = true;
    console.log('✔ Making dualTrade...');
    const tx = await arb.connect(owner).dualDexTrade(router1, router2, baseToken, token2, amount); //{ gasPrice: 5000000000, gasLimit: 1869316 }
    await tx.wait();
    inTrade = false;
    console.log('😎 First Step to be rich!');
    await lookForDualTrade();
  } catch (e) {
    //console.log(e);
    console.log('🤦‍♂️ Reverted dualTrade');
    inTrade = false;
    await lookForDualTrade();
  }
}

const setup = async () => {
  [owner] = await ethers.getSigners();
  console.log(`✔ Owner: ${owner.address}`);
  const IArb = await ethers.getContractFactory('Arb');
  arb = await IArb.attach(config.arbContract);
  console.log(`✔ Contract: ${arb.address}`);
  balances = {};
  for (let i = 0; i < config.baseAssets.length; i++) {
    const asset = config.baseAssets[i];
    const interface = await ethers.getContractFactory('WETH9');
    const assetToken = await interface.attach(asset.address);
    const balance = await assetToken.balanceOf(config.arbContract);
    console.log(`✔ `, asset.sym, balance.toString());
    balances[asset.address] = { sym: asset.sym, balance, startBalance: balance };
  }
  setTimeout(() => {
    setInterval(() => {
      logResults();
    }, 600000);
    logResults();
  }, 120000);
}

const logResults = async () => {
  console.log(`👀 Trading Overview`);
  console.log(`✔ Global Count: ${globalCount}`);
  console.log(`✔ Loop Count: ${goodCount}`);
  
  for (let i = 0; i < config.baseAssets.length; i++) {
    const asset = config.baseAssets[i];
    const interface = await ethers.getContractFactory('WETH9');
    const assetToken = await interface.attach(asset.address);
    balances[asset.address].balance = await assetToken.balanceOf(config.arbContract);
    const diff = balances[asset.address].balance.sub(balances[asset.address].startBalance);
    const basisPoints = diff.mul(10000).div(balances[asset.address].startBalance);
    console.log(`✔ ${asset.sym}: ${basisPoints.toString()}bps`);
  }
}

process.on('uncaughtException', function (err) {
  console.log('UnCaught Exception 83: ' + err);
  console.error(err.stack);
  fs.appendFile('./critical.txt', err.stack, function () { });
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: ' + p + ' - reason: ' + reason);
});

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
