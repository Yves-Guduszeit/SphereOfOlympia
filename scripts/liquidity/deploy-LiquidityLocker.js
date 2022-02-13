const { ethers, run, upgrades } = require("hardhat");

const {
    LiquidityLockerDeployedAddress
} = require('../../src/config.json');

async function main() {
    // const liquidityLocker = await loadLiquidityLocker();
    const { liquidityLockerProxy, liquidityLockerAddress } = await deployLiquidityLocker();
    try { await verifyLiquidityLocker(liquidityLockerProxy.address, liquidityLockerAddress); } catch (error) { console.log(`Error: ${error}`); }
}

async function loadLiquidityLocker() {
    console.log("Loading LiquidityLocker ...");
    const LiquidityLocker = await ethers.getContractFactory("LiquidityLocker");
    const liquidityLocker = await LiquidityLocker.attach(LiquidityLockerDeployedAddress);
    console.log(`LiquidityLocker loaded from: ${liquidityLocker.address}`);
    return liquidityLocker;
}

async function deployLiquidityLocker() {
    console.log("Deploying LiquidityLocker ...");
    const LiquidityLocker = await ethers.getContractFactory('LiquidityLocker');
    const liquidityLockerProxy = await upgrades.deployProxy(LiquidityLocker, { kind: 'uups' });
    console.log(`LiquidityLocker proxy deployed to: ${liquidityLockerProxy.address}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    const liquidityLockerAddress = await upgrades.erc1967.getImplementationAddress(liquidityLockerProxy.address);
    console.log(`LiquidityLocker deployed to: ${liquidityLockerAddress}`);
    return { liquidityLockerProxy, liquidityLockerAddress };
}

async function verifyLiquidityLocker(liquidityLockerProxyAddress, liquidityLockerAddress) {
    console.log("Verifying LiquidityLocker ...");
    await run("verify:verify", {
        address: liquidityLockerAddress
    });
    console.log("LiquidityLocker verified");

    console.log("Verifying LiquidityLocker proxy ...");
    await run("verify:verify", {
        address: liquidityLockerProxyAddress
    });
    console.log("LiquidityLocker proxy verified");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
