const { ethers, run } = require("hardhat");

const {
    UniswapV2Router02DeployedAddress,
    ReflectionDistributorDeployedAddress,
    OlympiaDeployedAddress,
    TokenClaimerDeployedAddress
} = require('../../src/config.json');

const {
    TeamWallet,
    ProviderWallet,
    MarketingWallet
} = require('../../secrets.json');

async function main() {
    // const reflectionDistributor = await loadReflectionDistributor();
    const reflectionDistributor = await deployReflectionDistributor();
    try { await verifyReflectionDistributor(reflectionDistributor.address); } catch (error) { console.log(`Error: ${error}`); }

    const olympia = await loadOlympia();
    // const olympia = await deployOlympia(UniswapV2Router02DeployedAddress, TeamWallet, ProviderWallet, MarketingWallet, reflectionDistributor.address);
    // try { await verifyOlympia(olympia.address, UniswapV2Router02DeployedAddress, TeamWallet, ProviderWallet, MarketingWallet, reflectionDistributor.address); } catch (error) { console.log(`Error: ${error}`); }
    
    await excludeReflectionDistributorFromFees(olympia, reflectionDistributor.address);
    await excludeTokenClaimerFromDistribution(reflectionDistributor, TokenClaimerDeployedAddress);
    await allowOlympia(reflectionDistributor, olympia.address);
}

async function loadReflectionDistributor() {
    console.log("Loading ReflectionDistributor ...");
    const ReflectionDistributor = await ethers.getContractFactory("ReflectionDistributor");
    const reflectionDistributor = await ReflectionDistributor.attach(ReflectionDistributorDeployedAddress);
    console.log(`ReflectionDistributor loaded from: ${reflectionDistributor.address}`);
    return reflectionDistributor;
}

async function deployReflectionDistributor() {
    console.log("Deploying ReflectionDistributor ...");
    const ReflectionDistributor = await ethers.getContractFactory("ReflectionDistributor");
    const reflectionDistributor = await ReflectionDistributor.deploy();
    await reflectionDistributor.deployed();
    console.log(`ReflectionDistributor deployed to: ${reflectionDistributor.address}`);
    return reflectionDistributor;
}

async function verifyReflectionDistributor(reflectionDistributorAddress) {
    console.log("Verifying ReflectionDistributor ...");
    await run("verify:verify", {
        address: reflectionDistributorAddress
    });
    console.log("ReflectionDistributor verified");
}

async function loadOlympia() {
    console.log("Loading Olympia ...");
    const Olympia = await ethers.getContractFactory("Olympia");
    const olympia = await Olympia.attach(OlympiaDeployedAddress);
    console.log(`Olympia loaded from: ${olympia.address}`);
    return olympia;
}

async function deployOlympia(routerAddress, TeamWallet, ProviderWallet, MarketingWallet, reflectionDistributorAddress) {
    console.log("Deploying Olympia ...");
    const Olympia = await ethers.getContractFactory("Olympia");
    const olympia = await Olympia.deploy(routerAddress, TeamWallet, ProviderWallet, MarketingWallet, reflectionDistributorAddress);
    await olympia.deployed();
    console.log(`Olympia deployed to: ${olympia.address}`);
    return olympia;
}

async function verifyOlympia(olympiaAddress, routerAddress, TeamWallet, ProviderWallet, MarketingWallet, reflectionDistributorAddress) {
    console.log("Verifying Olympia ...");
    await run("verify:verify", {
        address: olympiaAddress,
        constructorArguments: [
            routerAddress,
            TeamWallet,
            ProviderWallet,
            MarketingWallet,
            reflectionDistributorAddress
        ]
    });
    console.log("Olympia verified");
}

async function excludeReflectionDistributorFromFees(olympia, reflectionDistributorAddress) {
    console.log("Exclude ReflectionDistributor from fees ...");
    await olympia.excludeFromFees(reflectionDistributorAddress, true);
    console.log("ReflectionDistributor excluded from fees");
}

async function excludeTokenClaimerFromDistribution(reflectionDistributor, tokenClaimerAddress) {
    console.log("Exclude TokenClaimer from distribution ...");
    await reflectionDistributor.excludeFromDistribution(tokenClaimerAddress, true);
    console.log("TokenClaimer excluded from distribution");
}

async function allowOlympia(reflectionDistributor, olympiaAddress) {
    console.log("Allowing Olympia to execute ReflectionDistributor restricted functions ...");
    await reflectionDistributor.allow(olympiaAddress, true);
    console.log("Olympia allowed");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
