require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');

const { mnemonic } = require('./secrets.json');

module.exports = {
  paths: {
    artifacts: './src/artifacts',
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gas: 2100000,
      gasPrice: 10000000000,
      accounts: { mnemonic: mnemonic }
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gas: 10000000,
      gasPrice: 10000000000,
      accounts: { mnemonic: mnemonic }
    }
  },
  etherscan: {
    apiKey: '5XEP45BAK7ZUN4BNERVWZRB56TG2XWZM3B'
  },
  solidity: {
    version: "0.8.11",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      }
    }
  }
};
