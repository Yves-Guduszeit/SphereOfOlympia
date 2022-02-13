const { ethers, run } = require("hardhat");

const {
    IterableMappingDeployedAddress,
    OlpTokenDeployedAddress,
    TokenHolderRegisterDeployedAddress,
    TokenDelegqtorDeployedAddress
} = require('../../src/config.json');

async function main() {
    const iterableMapping = await loadIterableMapping();

    const olpToken = await loadOlpToken(iterableMapping.address);

    // const tokenHolderRegister = await loadTokenHolderRegister();
    const tokenHolderRegister = await deployTokenHolderRegister();
    try { await verifyTokenHolderRegister(tokenHolderRegister.address); } catch (error) { console.log(`Error: ${error}`); }

    // const tokenDelegator = await loadTokenDelegator();
    const tokenDelegator = await deployTokenDelegator(tokenHolderRegister.address, olpToken.address);
    try { await verifyTokenDelegator(tokenDelegator.address, tokenHolderRegister.address, olpToken.address); } catch (error) { console.log(`Error: ${error}`); }

    await allowTokenDelegator(tokenHolderRegister, tokenDelegator.address);
    await excludeTokenDelegatorFromFees(olpToken, tokenDelegator.address);
}

async function loadIterableMapping() {
    console.log("Loading IterableMapping ...");
    const IterableMapping = await ethers.getContractFactory("IterableMapping");
    const iterableMapping = await IterableMapping.attach(IterableMappingDeployedAddress);
    console.log(`IterableMapping loaded from: ${iterableMapping.address}`);
    return iterableMapping;
}

async function loadOlpToken(iterableMappingAddress) {
    console.log("Loading OlpToken ...");
    const OlpToken = await ethers.getContractFactory("OlpToken", {
        libraries: {
            IterableMapping: iterableMappingAddress
        }
    });
    const olpToken = await OlpToken.attach(OlpTokenDeployedAddress);
    console.log(`OlpToken loaded from: ${olpToken.address}`);
    return olpToken;
}

async function loadTokenHolderRegister() {
    console.log("Loading TokenHolderRegister ...");
    const TokenHolderRegister = await ethers.getContractFactory("TokenHolderRegister");
    const tokenHolderRegister = await TokenHolderRegister.attach(TokenHolderRegisterDeployedAddress);
    console.log(`TokenHolderRegister loaded from: ${tokenHolderRegister.address}`);
    return tokenHolderRegister;
}

async function deployTokenHolderRegister()
{
    console.log("Deploying TokenHolderRegister ...");
    const TokenHolderRegister = await ethers.getContractFactory("TokenHolderRegister");
    const tokenHolderRegister = await TokenHolderRegister.deploy();
    await tokenHolderRegister.deployed();
    console.log(`TokenHolderRegister deployed to: ${tokenHolderRegister.address}`);
    return tokenHolderRegister;
}

async function verifyTokenHolderRegister(tokenHolderRegisterAddress) {
    console.log("Verifying TokenHolderRegister ...");
    await run("verify:verify", {
        address: tokenHolderRegisterAddress
    });
    console.log("TokenHolderRegister verified");
}

async function loadTokenDelegator() {
    console.log("Loading TokenDelegator ...");
    const TokenDelegator = await ethers.getContractFactory("TokenDelegator");
    const tokenDelegator = await TokenDelegator.attach(TokenDelegqtorDeployedAddress);
    console.log(`TokenDelegator loaded from: ${tokenDelegator.address}`);
    return tokenDelegator;
}

async function deployTokenDelegator(tokenHolderRegisterAddress, olpTokenAddress)
{
    console.log("Deploying TokenDelegator ...");
    const TokenDelegator = await ethers.getContractFactory("TokenDelegator");
    const tokenDelegator = await TokenDelegator.deploy(tokenHolderRegisterAddress, olpTokenAddress);
    await tokenDelegator.deployed();
    console.log(`TokenDelegator deployed to: ${tokenDelegator.address}`);
    return tokenDelegator;
}

async function verifyTokenDelegator(tokenDelegatorAddress, tokenHolderRegisterAddress, olpTokenAddress) {
    console.log("Verifying TokenDelegator ...");
    await run("verify:verify", {
        address: tokenDelegatorAddress,
        constructorArguments: [
          tokenHolderRegisterAddress,
          olpTokenAddress
        ]
    });
    console.log("TokenDelegator verified");
}

async function allowTokenDelegator(tokenHolderRegister, tokenDelegatorAddress) {
    console.log("Allowing TokenDelegator to execute TokenHolderRegister restricted functions ...");
    await tokenHolderRegister.allow(tokenDelegatorAddress, true);
    console.log("TokenDelegator allowed");
}

async function excludeTokenDelegatorFromFees(olpToken, tokenDelegatorAddress) {
    console.log("Excluding TokenDelegator from fees ...");
    await olpToken.excludeFromFees(tokenDelegatorAddress, true);
    console.log("TokenDelegator excluded");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
