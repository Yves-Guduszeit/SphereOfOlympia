const { ethers, run } = require("hardhat");

const {
    TokenHolderRegisterDeployedAddress,
    OlympiaDeployedAddress,
    TokenClaimerDeployedAddress
} = require('../../src/config.json');

async function main() {
    const tokenHolderRegister = await loadTokenHolderRegister();

    const olympia = await loadOlympia();

    // const tokenClaimer = await loadTokenClaimer();
    const tokenClaimer = await deployTokenClaimer(tokenHolderRegister.address, olympia.address);
    try { await verifyTokenClaimer(tokenClaimer.address, tokenHolderRegister.address, olympia.address); } catch (error) { console.log(`Error: ${error}`); }

    await allowTokenClaimer(tokenHolderRegister, tokenClaimer.address);
    await excludeTokenClaimerFromFees(olympia, tokenClaimer.address);
}

async function loadTokenHolderRegister() {
    console.log("Loading TokenHolderRegister ...");
    const TokenHolderRegister = await ethers.getContractFactory("TokenHolderRegister");
    const tokenHolderRegister = await TokenHolderRegister.attach(TokenHolderRegisterDeployedAddress);
    console.log(`TokenHolderRegister loaded from: ${tokenHolderRegister.address}`);
    return tokenHolderRegister;
}

async function loadOlympia() {
    console.log("Loading Olympia ...");
    const Olympia = await ethers.getContractFactory("Olympia");
    const olympia = await Olympia.attach(OlympiaDeployedAddress);
    console.log(`Olympia loaded from: ${olympia.address}`);
    return olympia;
}

async function loadTokenClaimer() {
  console.log("Loading TokenClaimer ...");
  const TokenClaimer = await ethers.getContractFactory("TokenClaimer");
  const tokenClaimer = await TokenClaimer.attach(TokenClaimerDeployedAddress);
  console.log(`TokenClaimer loaded from: ${tokenClaimer.address}`);
  return tokenClaimer;
}

async function deployTokenClaimer(tokenHolderRegisterAddress, olympiaAddress) {
    console.log("Deploying TokenClaimer ...");
    const TokenClaimer = await ethers.getContractFactory("TokenClaimer");
    const tokenClaimer = await TokenClaimer.deploy(tokenHolderRegisterAddress, olympiaAddress);
    await tokenClaimer.deployed();
    console.log(`TokenClaimer deployed to: ${tokenClaimer.address}`);
    return tokenClaimer;
}

async function verifyTokenClaimer(tokenClaimerAddress, tokenHolderRegisterAddress, olympiaAddress) {
    console.log("Verifying TokenClaimer ...");
    await run("verify:verify", {
        address: tokenClaimerAddress,
        constructorArguments: [
          tokenHolderRegisterAddress,
          olympiaAddress
        ]
    });
    console.log("TokenClaimer verified");
}

async function allowTokenClaimer(tokenHolderRegister, tokenClaimerAddress) {
  console.log("Allowing TokenClaimer to execute TokenHolderRegister restricted functions ...");
  await tokenHolderRegister.allow(tokenClaimerAddress, true);
  console.log("TokenClaimer allowed");
}

async function excludeTokenClaimerFromFees(olympia, tokenClaimerAddress) {
  console.log("Excluding TokenClaimer from fees ...");
  await olympia.excludeFromFees(tokenClaimerAddress, true);
  console.log("TokenClaimer excluded");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
