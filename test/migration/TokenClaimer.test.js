/* eslint-disable jest/valid-expect */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenClaimer", function () {
    // eslint-disable-next-line no-undef
    before(async function () {
        this.TokenHolderRegister = await ethers.getContractFactory("TokenHolderRegister");
        this.V2Token = await ethers.getContractFactory("V2Token");
        this.TokenClaimer = await ethers.getContractFactory("TokenClaimer");
        this.signers = await ethers.getSigners();
    });

    beforeEach(async function () {
        this.tokenHolderRegister = await this.TokenHolderRegister.deploy();
        await this.tokenHolderRegister.deployed();
        
        this.v2Token = await this.V2Token.deploy();
        await this.v2Token.deployed();

        this.tokenClaimer = await this.TokenClaimer.deploy(this.tokenHolderRegister.address, this.v2Token.address);
        await this.tokenClaimer.deployed();

        await this.tokenHolderRegister.allow(this.tokenClaimer.address, true);
    });

    it("Should claim V2 tokens", async function () {
        await this.v2Token.transfer(this.tokenClaimer.address, await this.v2Token.totalSupply());

        const balanceBefore = await this.v2Token.balanceOf(this.signers[0].address);

        await this.tokenHolderRegister.addTokens(this.signers[0].address, 1500);
        await this.tokenClaimer.claimV2Tokens(this.signers[0].address);

        const balanceAfter = await this.v2Token.balanceOf(this.signers[0].address);

        expect(await this.tokenHolderRegister.getTotalTokens()).to.equal(0);
        expect(balanceBefore.toNumber()).to.equal(0);
        expect(balanceAfter.toNumber()).to.equal(1500);
    });
});
