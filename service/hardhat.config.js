require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("solidity-coverage");
require("hardhat-contract-sizer");

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
  },
  solidity: {
    compilers: [
      {
        version: "0.8.15",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
        evmVersion: "london"
      },
    ],
  },
  paths: {
    sources: "./src/main/resources/contracts",
    tests: "./src/main/resources/test",
    cache: "./src/main/resources/cache",
    artifacts: "./src/main/resources/artifacts",
  },
  mocha: {
    // Maybe necessary when testing on-chain.
    timeout: 3000000,
  },
};
