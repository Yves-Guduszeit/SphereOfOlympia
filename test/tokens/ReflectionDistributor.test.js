/* eslint-disable no-undef */
/* eslint-disable jest/valid-expect */

const { ethers } = require("hardhat");
const chai = require("chai");
chai.should();

chai.use(require("chai-bignumber")(ethers.BigNumber));

describe("ReflectionDistributor", function () {
    before(async function () {
        this.signers = await ethers.getSigners();
        [this.owner, this.user1, this.user2, this.user3] = await ethers.getSigners();
        
        this.ReflectionDistributor = await ethers.getContractFactory("ReflectionDistributor");
        this.RewardableTokenMock = await ethers.getContractFactory("RewardableTokenMock");
    });

    beforeEach(async function () {
        this.reflectionDistributor = await this.ReflectionDistributor.deploy();
        await this.reflectionDistributor.deployed();
        
        this.rewardableTokenMock = await this.RewardableTokenMock.deploy(this.reflectionDistributor.address);
        await this.rewardableTokenMock.deployed();

        await this.reflectionDistributor.allow(this.rewardableTokenMock.address, true);
    });

    it("Should accept ETH", async function () {
        let balance = await ethers.provider.getBalance(this.reflectionDistributor.address);
        balance.should.be.equal(ethers.utils.parseEther("0"));

        await this.owner.sendTransaction({
            to: this.reflectionDistributor.address,
            value: ethers.utils.parseEther("1.23"),
        });

        balance = await ethers.provider.getBalance(this.reflectionDistributor.address);
        balance.should.be.equal(ethers.utils.parseEther("1.23"));
    });

    it("Should compute total ETH received", async function () {
        await this.rewardableTokenMock.transfer(this.user1.address, ethers.utils.parseUnits("50000"));
        await this.rewardableTokenMock.connect(this.user1).transfer(this.user2.address, ethers.utils.parseUnits("10000"));

        await this.owner.sendTransaction({
            to: this.reflectionDistributor.address,
            value: ethers.utils.parseEther("1"),
        });
        await this.owner.sendTransaction({
            to: this.reflectionDistributor.address,
            value: ethers.utils.parseEther("0.2"),
        });
        await this.owner.sendTransaction({
            to: this.reflectionDistributor.address,
            value: ethers.utils.parseEther("0.3"),
        });

        let totalEthReceived = await this.reflectionDistributor.totalEthReceived();

        totalEthReceived.should.be.eq(ethers.utils.parseEther("1.5"));
    });

    it("Token transfers should work correctly", async function () {
        await this.rewardableTokenMock.transfer(this.user1.address, ethers.utils.parseUnits("10000000000"));

        let ownerTokenBalance = await this.rewardableTokenMock.balanceOf(this.owner.address);
        let user1TokenBalance = await this.rewardableTokenMock.balanceOf(this.user1.address);

        ownerTokenBalance.should.be.eq(ethers.utils.parseUnits("90000000000"));
        user1TokenBalance.should.be.eq(ethers.utils.parseUnits("10000000000"));
    });

    it("Should not initialize shares if one wallet is owner", async function () {
        await this.rewardableTokenMock.transfer(this.user1.address, ethers.utils.parseUnits("10000000000"));

        let ownerAmount = (await this.reflectionDistributor._shares(this.owner.address)).amount;
        let user1Amount = (await this.reflectionDistributor._shares(this.user1.address)).amount;
        let totalAmount = await this.reflectionDistributor.totalAmount();

        ownerAmount.should.be.eq(ethers.utils.parseUnits("0"));
        user1Amount.should.be.eq(ethers.utils.parseUnits("0"));
        totalAmount.should.be.eq(ethers.utils.parseUnits("0"));
    });

    it("Should initialize shares if both wallets are not owner", async function () {
        await this.rewardableTokenMock.transfer(this.user1.address, ethers.utils.parseUnits("10000000000"));
        await this.rewardableTokenMock.connect(this.user1).transfer(this.user2.address, ethers.utils.parseUnits("1000000"));

        let ownerAmount = (await this.reflectionDistributor._shares(this.owner.address)).amount;
        let user1Amount = (await this.reflectionDistributor._shares(this.user1.address)).amount;
        let user2Amount = (await this.reflectionDistributor._shares(this.user2.address)).amount;
        let user3Amount = (await this.reflectionDistributor._shares(this.user3.address)).amount;
        let totalAmount = await this.reflectionDistributor.totalAmount();

        ownerAmount.should.be.eq(ethers.utils.parseUnits("0"));
        user1Amount.should.be.eq(ethers.utils.parseUnits("9999000000"));
        user2Amount.should.be.eq(ethers.utils.parseUnits("1000000"));
        user3Amount.should.be.eq(ethers.utils.parseUnits("0"));
        totalAmount.should.be.eq(ethers.utils.parseUnits("10000000000"));

        await this.rewardableTokenMock.connect(this.user1).transfer(this.user3.address, ethers.utils.parseUnits("200000000"));

        ownerAmount = (await this.reflectionDistributor._shares(this.owner.address)).amount;
        user1Amount = (await this.reflectionDistributor._shares(this.user1.address)).amount;
        user2Amount = (await this.reflectionDistributor._shares(this.user2.address)).amount;
        user3Amount = (await this.reflectionDistributor._shares(this.user3.address)).amount;
        totalAmount = await this.reflectionDistributor.totalAmount();

        ownerAmount.should.be.eq(ethers.utils.parseUnits("0"));
        user1Amount.should.be.eq(ethers.utils.parseUnits("9799000000"));
        user2Amount.should.be.eq(ethers.utils.parseUnits("1000000"));
        user3Amount.should.be.eq(ethers.utils.parseUnits("200000000"));
        totalAmount.should.be.eq(ethers.utils.parseUnits("10000000000"));
    });

    it("Shares should keep correct after initialized even if transfer from owner", async function () {
        await this.rewardableTokenMock.transfer(this.user1.address, ethers.utils.parseUnits("10000000000"));
        await this.rewardableTokenMock.connect(this.user1).transfer(this.user2.address, ethers.utils.parseUnits("1000000"));

        let ownerAmount = (await this.reflectionDistributor._shares(this.owner.address)).amount;
        let user1Amount = (await this.reflectionDistributor._shares(this.user1.address)).amount;
        let user2Amount = (await this.reflectionDistributor._shares(this.user2.address)).amount;
        let totalAmount = await this.reflectionDistributor.totalAmount();

        ownerAmount.should.be.eq(ethers.utils.parseUnits("0"));
        user1Amount.should.be.eq(ethers.utils.parseUnits("9999000000"));
        user2Amount.should.be.eq(ethers.utils.parseUnits("1000000"));
        totalAmount.should.be.eq(ethers.utils.parseUnits("10000000000"));

        await this.rewardableTokenMock.transfer(this.user1.address, ethers.utils.parseUnits("5000000000"));
        await this.rewardableTokenMock.transfer(this.owner.address, ethers.utils.parseUnits("1"));

        ownerAmount = (await this.reflectionDistributor._shares(this.owner.address)).amount;
        user1Amount = (await this.reflectionDistributor._shares(this.user1.address)).amount;
        user2Amount = (await this.reflectionDistributor._shares(this.user2.address)).amount;
        totalAmount = await this.reflectionDistributor.totalAmount();

        ownerAmount.should.be.eq(ethers.utils.parseUnits("0"));
        user1Amount.should.be.eq(ethers.utils.parseUnits("14999000000"));
        user2Amount.should.be.eq(ethers.utils.parseUnits("1000000"));
        totalAmount.should.be.eq(ethers.utils.parseUnits("15000000000"));
    });

    it("Should update dividends per share", async function () {
        await this.rewardableTokenMock.transfer(this.user1.address, ethers.utils.parseUnits("20000"));
        await this.rewardableTokenMock.connect(this.user1).transfer(this.user2.address, ethers.utils.parseUnits("5000"));

        let dividendsPerShare = await this.reflectionDistributor.dividendsPerShare();
        dividendsPerShare.should.be.eq(ethers.utils.parseEther("0"));

        await this.owner.sendTransaction({
            to: this.reflectionDistributor.address,
            value: ethers.utils.parseEther("1"),
        });

        dividendsPerShare = await this.reflectionDistributor.dividendsPerShare();
        dividendsPerShare.should.be.eq(ethers.utils.parseEther("0.05"));
    });

    // it("Should distribute rewards", async function () {
    //     await this.reflectionDistributor.setMinPeriod(0);

    //     await this.rewardableTokenMock.transfer(this.user1.address, ethers.utils.parseUnits("20000"));
    //     await this.rewardableTokenMock.connect(this.user1).transfer(this.user2.address, ethers.utils.parseUnits("5000"));

    //     await this.owner.sendTransaction({
    //         to: this.reflectionDistributor.address,
    //         value: ethers.utils.parseEther("1"),
    //     });

    //     let contractEthBalanceBefore = await ethers.provider.getBalance(this.reflectionDistributor.address);
    //     let user1EthBalanceBefore = await ethers.provider.getBalance(this.user1.address);
    //     let user2EthBalanceBefore = await ethers.provider.getBalance(this.user2.address);
        
    //     await this.rewardableTokenMock.transfer(this.owner.address, ethers.utils.parseUnits("1"));
    //     await this.rewardableTokenMock.transfer(this.owner.address, ethers.utils.parseUnits("1"));

    //     let contractEthBalanceAfter = await ethers.provider.getBalance(this.reflectionDistributor.address);
    //     let user1EthBalanceAfter = await ethers.provider.getBalance(this.user1.address);
    //     let user2EthBalanceAfter = await ethers.provider.getBalance(this.user2.address);

    //     let user1EthFromRewards = user1EthBalanceAfter.sub(user1EthBalanceBefore);
    //     let user2EthFromRewards = user2EthBalanceAfter.sub(user2EthBalanceBefore);
        
    //     contractEthBalanceBefore.should.be.eq(ethers.utils.parseEther("1"));
    //     contractEthBalanceAfter.should.be.eq(ethers.utils.parseEther("0.1875"));
        
    //     user1EthFromRewards.should.be.eq(ethers.utils.parseEther("0.75"));
    //     user2EthFromRewards.should.be.eq(ethers.utils.parseEther("0.0625"));
    // });

    // it("Should distribute rewards only if enough tokens", async function () {
    //     await this.reflectionDistributor.setMinPeriod(0);
    //     await this.reflectionDistributor.setMinTokenToHold(10000);

    //     await this.rewardableTokenMock.transfer(this.user1.address, ethers.utils.parseUnits("20000"));
    //     await this.rewardableTokenMock.connect(this.user1).transfer(this.user2.address, ethers.utils.parseUnits("5000"));

    //     await this.owner.sendTransaction({
    //         to: this.reflectionDistributor.address,
    //         value: ethers.utils.parseEther("1"),
    //     });

    //     let totalShares = await this.reflectionDistributor.totalShares();
    //     console.log(`totalShares: ${totalShares}`);

    //     let shareholderShares = await this.reflectionDistributor.shareholderShares(this.user1.address);
    //     console.log(`shareholderShares: ${shareholderShares}`);

    //     let claimableDividends = await this.reflectionDistributor.claimableDividends(this.user1.address);
    //     console.log(`claimableDividends: ${claimableDividends}`);

    //     let contractEthBalanceBefore = await ethers.provider.getBalance(this.reflectionDistributor.address);
    //     let user1EthBalanceBefore = await ethers.provider.getBalance(this.user1.address);
    //     let user2EthBalanceBefore = await ethers.provider.getBalance(this.user2.address);
        
    //     await this.rewardableTokenMock.transfer(this.owner.address, ethers.utils.parseUnits("1"));
    //     await this.rewardableTokenMock.transfer(this.owner.address, ethers.utils.parseUnits("1"));

    //     let contractEthBalanceAfter = await ethers.provider.getBalance(this.reflectionDistributor.address);
    //     let user1EthBalanceAfter = await ethers.provider.getBalance(this.user1.address);
    //     let user2EthBalanceAfter = await ethers.provider.getBalance(this.user2.address);

    //     let user1EthFromRewards = user1EthBalanceAfter.sub(user1EthBalanceBefore);
    //     let user2EthFromRewards = user2EthBalanceAfter.sub(user2EthBalanceBefore);
        
    //     contractEthBalanceBefore.should.be.eq(ethers.utils.parseEther("1"));
    //     // contractEthBalanceAfter.should.be.eq(ethers.utils.parseEther("0"));
        
    //     // user1EthFromRewards.should.be.eq(ethers.utils.parseEther("1"));
    //     user2EthFromRewards.should.be.eq(ethers.utils.parseEther("0"));
    // });
});
