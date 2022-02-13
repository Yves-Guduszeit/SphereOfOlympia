/* eslint-disable jest/valid-expect */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenHolderRegister", function () {
    // eslint-disable-next-line no-undef
    before(async function () {
        this.TokenHolderRegister = await ethers.getContractFactory("TokenHolderRegister");
        this.signers = await ethers.getSigners();
    });

    beforeEach(async function () {
        this.tokenHolderRegister = await this.TokenHolderRegister.deploy();
        await this.tokenHolderRegister.deployed();
    });

    it("Should add tokens for the given holder", async function () {
        await this.tokenHolderRegister.addTokens(this.signers[0].address, 100);

        expect(await this.tokenHolderRegister.getTokens(this.signers[0].address)).to.equal(100);
        expect(await this.tokenHolderRegister.getTotalTokens()).to.equal(100);
    });
    
    it("Should sum tokens for the given holder already exists", async function () {
        await this.tokenHolderRegister.addTokens(this.signers[0].address, 100);
        await this.tokenHolderRegister.addTokens(this.signers[0].address, 50);

        expect(await this.tokenHolderRegister.getTokens(this.signers[0].address)).to.equal(150);
        expect(await this.tokenHolderRegister.getTotalTokens()).to.equal(150);
    });
    
    it("Should remove tokens for the given holder", async function () {
        await this.tokenHolderRegister.addTokens(this.signers[0].address, 100);
        await this.tokenHolderRegister.removeTokens(this.signers[0].address);

        expect(await this.tokenHolderRegister.getTokens(this.signers[0].address)).to.equal(0);
        expect(await this.tokenHolderRegister.getTotalTokens()).to.equal(0);
    });
    
    it("Should have no token for the given holder was never added", async function () {
        expect(await this.tokenHolderRegister.getTokens(this.signers[0].address)).to.equal(0);
        expect(await this.tokenHolderRegister.getTotalTokens()).to.equal(0);
    });
    
    it("Should add / remove tokens for given holders works correctly", async function () {
        await this.tokenHolderRegister.addTokens(this.signers[0].address, 100);
        await this.tokenHolderRegister.addTokens(this.signers[0].address, 50);
        await this.tokenHolderRegister.addTokens(this.signers[1].address, 200);
        await this.tokenHolderRegister.addTokens(this.signers[1].address, 50);
        await this.tokenHolderRegister.removeTokens(this.signers[0].address);
        await this.tokenHolderRegister.addTokens(this.signers[0].address, 125);

        expect(await this.tokenHolderRegister.getTokens(this.signers[0].address)).to.equal(125);
        expect(await this.tokenHolderRegister.getTokens(this.signers[1].address)).to.equal(250);
        expect(await this.tokenHolderRegister.getTotalTokens()).to.equal(375);
    });
});
