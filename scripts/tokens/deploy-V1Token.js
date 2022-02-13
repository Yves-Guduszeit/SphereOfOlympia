const { ethers, run } = require("hardhat");

const {
    V1TokenDeployedAddress
} = require('../../src/config.json');

async function main() {
    // const v1Token = await loadV1Token();
    const v1Token = await deployV1Token();
    try { await verifyV1Token(v1Token.address); } catch (error) { console.log(`Error: ${error}`); }
}

async function loadV1Token() {
    console.log("Loading V1Token ...");
    const V1Token = await ethers.getContractFactory("V1Token");
    const v1Token = await V1Token.attach(V1TokenDeployedAddress);
    console.log(`V1Token loaded from: ${v1Token.address}`);
    return v1Token;
}

async function deployV1Token() {
    console.log("Deploying V1Token ...");
    const V1Token = await ethers.getContractFactory("V1Token");
    const v1Token = await V1Token.deploy();
    await v1Token.deployed();
    console.log(`V1Token deployed to: ${v1Token.address}`);
    return v1Token;
}

async function verifyV1Token(v1TokenAddress) {
    console.log("Verifying V1Token ...");
    await run("verify:verify", {
        contract: "contracts/tokens/V1Token.sol:V1Token",
        address: v1TokenAddress
    });
    console.log("V1Token verified");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
