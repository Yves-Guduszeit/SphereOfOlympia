const { ethers, run } = require("hardhat");

const {
    V2TokenDeployedAddress
} = require('../../src/config.json');

async function main() {
    // const v2Token = await loadV2Token();
    const v2Token = await deployV2Token();
    try { await verifyV2Token(v2Token.address); } catch (error) { console.log(`Error: ${error}`); }
}

async function loadV2Token() {
    console.log("Loading V2Token ...");
    const V2Token = await ethers.getContractFactory("V2Token");
    const v2Token = await V2Token.attach(V2TokenDeployedAddress);
    console.log(`V2Token loaded from: ${v2Token.address}`);
    return v2Token;
}

async function deployV2Token() {
    console.log("Deploying V2Token ...");
    const V2Token = await ethers.getContractFactory("V2Token");
    const v2Token = await V2Token.deploy();
    await v2Token.deployed();
    console.log(`V2Token deployed to: ${v2Token.address}`);
    return v2Token;
}

async function verifyV2Token(v2TokenAddress) {
    console.log("Verifying V1Token ...");
    await run("verify:verify", {
        contract: "contracts/tokens/V2Token.sol:V2Token",
        address: v2TokenAddress
    });
    console.log("V2Token verified");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
