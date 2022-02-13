const { ethers, run } = require("hardhat");

const {
    IterableMappingDeployedAddress,
    OlpTokenDeployedAddress
} = require('../../src/config.json');

async function main() {
    // const iterableMapping = await loadIterableMapping();
    const iterableMapping = await deployIterableMapping();
    try { await verifyIterableMapping(iterableMapping.address); } catch (error) { console.log(`Error: ${error}`); }

    // const olpToken = await loadOlpToken(iterableMapping);
    const olpToken = await deployOlpToken(iterableMapping.address);
    try { await verifyOlpToken(olpToken.address, iterableMapping.address); } catch (error) { console.log(`Error: ${error}`); }

    await removeCooldownTime(olpToken);
}

async function loadIterableMapping() {
    console.log("Loading IterableMapping ...");
    const IterableMapping = await ethers.getContractFactory("IterableMapping");
    const iterableMapping = await IterableMapping.attach(IterableMappingDeployedAddress);
    console.log(`IterableMapping loaded from: ${iterableMapping.address}`);
    return iterableMapping;
}

async function deployIterableMapping() {
    console.log("Deploying IterableMapping ...");
    const IterableMapping = await ethers.getContractFactory("IterableMapping");
    const iterableMapping = await IterableMapping.deploy();
    await iterableMapping.deployed();
    console.log(`IterableMapping deployed to: ${iterableMapping.address}`);
    return iterableMapping;
}

async function verifyIterableMapping(iterableMappingAddress) {
    console.log("Verifying IterableMapping ...");
    await run("verify:verify", {
        address: iterableMappingAddress
    });
    console.log("IterableMapping verified");
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

async function deployOlpToken(iterableMappingAddress) {
    console.log("Deploying OlpToken ...");
    const OlpToken = await ethers.getContractFactory("OlpToken", {
        libraries: {
            IterableMapping: iterableMappingAddress
        }
    });
    const olpToken = await OlpToken.deploy();
    await olpToken.deployed();
    console.log(`OlpToken deployed to: ${olpToken.address}`);
    return olpToken;
}

async function verifyOlpToken(olpTokenAddress, iterableMappingAddress) {
    console.log("Verifying OlpToken ...");
    await run("verify:verify", {
        address: olpTokenAddress,
        libraries: {
            IterableMapping: iterableMappingAddress
        }
    });
    console.log("OlpToken verified");
}

async function removeCooldownTime(olpToken) {
    console.log("Removing Cooldown time ...");
    await olpToken.setTransactionCooldownTime(0);
    console.log("Cooldown time removed");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
