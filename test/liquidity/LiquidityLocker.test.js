const { ethers, upgrades } = require('hardhat');

describe('LiquidityLocker', function () {
    it('Should deploy', async function () {
        const LiquidityLocker = await ethers.getContractFactory('LiquidityLocker');
        await upgrades.deployProxy(LiquidityLocker, { kind: 'uups' });
    });
});
