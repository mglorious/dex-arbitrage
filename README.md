# Simple Dex Arbitrage

Please note that Aurora on Near Protocol have now introduced gas/transaction fees. More info on their twitter account https://twitter.com/AuroraIsNear
If running it on that chain you need a little ETH to pay gas fees in the owner address wallet that is firing off transactions.

The base code was created from https://jamesbachini.com/dex-arbitrage/

## Disclaimer
Note the code is provided for educational purposes, is unaudited and not fit for financial transactions. Use it to experiment with and build your own strategies. A technical support call center is not available if you get funds stuck so make sure to test the recover.js script before doing anything else. Use on a testnet with play money or with funds you are willing to lose.

## Setup Instructions
Edit the .env-example.txt file and add a private key of your wallet

Build using the following commands:

```shell
git clone https://github.com/mglorious/dex-arbitrage.git
cd DEX-Arbitrage
mv .env-example.txt .env
npm install
npx hardhat run --network aurora .\scripts\deploy.js
```
Then to execute run:-

```shell
npx hardhat run --network aurora .\scripts\fund.js
```

Finally to recover any funds use the script.

```shell
npx hardhat run --network aurora .\scripts\recover.js
```

More info and solidity tutorials on my blog at https://jamesbachini.com
