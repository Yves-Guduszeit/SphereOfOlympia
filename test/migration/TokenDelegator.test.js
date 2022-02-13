/* eslint-disable jest/no-conditional-expect */
/* eslint-disable jest/valid-expect */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenDelegator", function () {
    // eslint-disable-next-line no-undef
    before(async function () {
        this.TokenHolderRegister = await ethers.getContractFactory("TokenHolderRegister");
        this.V1Token = await ethers.getContractFactory("V1Token");
        this.TokenDelegator = await ethers.getContractFactory("TokenDelegator");
        this.signers = await ethers.getSigners();
    });

    beforeEach(async function () {
        this.tokenHolderRegister = await this.TokenHolderRegister.deploy();
        await this.tokenHolderRegister.deployed();
        
        this.v1Token = await this.V1Token.deploy();
        await this.v1Token.deployed();

        this.tokenDelegator = await this.TokenDelegator.deploy(this.tokenHolderRegister.address, this.v1Token.address);
        await this.tokenDelegator.deployed();

        await this.tokenHolderRegister.allow(this.tokenDelegator.address, true);
    });

    it("Should initially contain no delegate token", async function () {
        expect(await this.tokenHolderRegister.getTotalTokens()).to.equal(0);
    });
    
    it("Should delegate giving tokens", async function () {
        await this.v1Token.approve(this.tokenDelegator.address, 1000);
        await this.tokenDelegator.delegateV1Tokens(this.signers[0].address, 1000);

        expect(await this.tokenHolderRegister.getTotalTokens()).to.equal(1000);
    });
    
    it("Should fail if try to delegate no token", async function () {
        try {
            await this.v1Token.approve(this.tokenDelegator.address, 0);
            await this.tokenDelegator.delegateV1Tokens(this.signers[0].address, 0);
        } catch (error) {
            expect(error.message).to.contains('Should transfer some tokens');
        }

        expect(await this.tokenHolderRegister.getTotalTokens()).to.equal(0);
    });

    it("Should not delegate if not enough tokens", async function () {
        try {
            var amount = await this.v1Token.balanceOf(this.signers[0].address);

            await this.v1Token.approve(this.tokenDelegator.address, amount + 1)
            await this.tokenDelegator.delegateV1Tokens(this.signers[0].address, amount + 1);
        } catch (error) {
            expect(error.message).to.contains('Holder does not have enough tokens');
        }

        expect(await this.tokenHolderRegister.getTotalTokens()).to.equal(0);
    });
    
    it("Should sum additional tokens", async function () {
        await this.v1Token.approve(this.tokenDelegator.address, 1500);
        await this.tokenDelegator.delegateV1Tokens(this.signers[0].address, 1000);
        await this.tokenDelegator.delegateV1Tokens(this.signers[0].address, 500);

        expect(await this.tokenHolderRegister.getTotalTokens()).to.equal(1500);
    });
});
