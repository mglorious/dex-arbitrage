const hre = require("hardhat");
const fs = require("fs");

let config, arb, owner, balances;
var allRoutes = []
var goodRoutes = []


const network = hre.network.name;
if (network === 'aurora') config = require('../config/aurora.json');
if (network === 'fantom') config = require('../config/fantom.json');
if (network === 'aurora_test') config = require('../config/aurora_test.json');


const main = async () => {
    await setup()
    await fetch()
}

const setup = async () => {
    console.log(`.oO(DEX Routes Finder 👀)`);
    console.log(`✔ Network: ${network}`);
    [owner] = await ethers.getSigners();
    console.log(`✔ Owner: ${owner.address}`);
    const IArb = await ethers.getContractFactory('Arb');
    arb = await IArb.attach(config.arbContract);
    console.log(`✔ Contract: ${arb.address}`);

    for (var i = 0; i < config.routers.length; i++) {
        for (var j = 0; j < config.routers.length; j++) {
            for (var k = 0; k < config.baseAssets.length; k++) {
                for (var l = 0; l < config.tokens.length; l++) {
                    allRoutes.push(searchRoutes(i, j, k, l))
                }
            }
        }
    }
    console.log(`✔  Routers: ${config.routers.length}`)
    console.log(`✔  Base Assets: ${config.baseAssets.length}`)
    console.log(`✔  Tokens: ${config.tokens.length}`)
    console.log(`✔  Routes: ${allRoutes.length}`)

}

const fetch = async () => {
    console.log("Fetching Good Routes ...")

    balances = {};
    for (let i = 0; i < config.baseAssets.length; i++) {
        const asset = config.baseAssets[i];
        const interface = await ethers.getContractFactory('WETH9');
        const assetToken = await interface.attach(asset.address);
        const balance = await assetToken.balanceOf(config.arbContract);
        console.log(asset.sym, balance.toString());
        balances[asset.address] = { sym: asset.sym, balance, startBalance: balance };
    }
    for (var i = 0; i < allRoutes.length; i++) {
        var targetRoute = allRoutes[i];
        //console.log(targetRoute);
        try {
            let tradeSize = balances[targetRoute.token1].balance;
            await arb.estimateDualDexTrade(targetRoute.router1, targetRoute.router2, targetRoute.token1, targetRoute.token2, tradeSize, { gasPrice: 77777777, gasLimit: 1869316 });
            goodRoutes.push(targetRoute)
            console.log (i, '✔ Added')
        } catch (e) {
            //console.log(`✖ ${targetRoute} Filtred as Bad Route !`);
            //console.log(e)
        }
    }
    console.log(`✔  Good Routes: ${goodRoutes.length}`)
    const sFileName = `./data/${network}_Good_Routes.txt`
    fs.writeFileSync(sFileName, `"routes": [\n`, function (err) { });
    for (i = 0; i < goodRoutes.length; i++) {
        var targetRoute = goodRoutes[i];
        fs.appendFileSync(sFileName, `["${targetRoute.router1}","${targetRoute.router2}","${targetRoute.token1}","${targetRoute.token2}"]`, function (err) { });
        if (i != allRoutes.length - 1) {
            fs.appendFileSync(sFileName, ",", function (err) { })
        }
        fs.appendFileSync(sFileName, "\n", function (err) { })
    }
    fs.appendFileSync(sFileName, `]\n`, function (err) { });
    console.log(`✔  Good Routes Export : ${sFileName}`)
}

const searchRoutes = (i, j, k, l) => {
    const targetRoute = {};
    targetRoute.router1 = config.routers[i].address;
    targetRoute.router2 = config.routers[j].address;
    targetRoute.token1 = config.baseAssets[k].address;
    targetRoute.token2 = config.tokens[l].address;
    return targetRoute;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });