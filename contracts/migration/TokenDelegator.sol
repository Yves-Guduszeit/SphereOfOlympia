// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TokenHolderRegister.sol";

contract TokenDelegator is Ownable {
    TokenHolderRegister private _tokenHolderRegister;
    IERC20 private _v1Token;

    constructor(TokenHolderRegister tokenHolderRegister, IERC20 v1Token) {
        _tokenHolderRegister = tokenHolderRegister;
        _v1Token = v1Token;
    }

    function delegateV1Tokens(address holder, uint256 amount) public {
        require(amount > 0, 'TokenDelegator: Should transfer some tokens');
        require(amount <= _v1Token.balanceOf(holder), 'TokenDelegator: Holder does not have enough tokens');

        if (_v1Token.transferFrom(holder, address(this), amount)) {
            _tokenHolderRegister.addTokens(holder, amount);
        }
    }

    function collectV1Tokens() public onlyOwner() {
        _v1Token.transfer(owner(), _v1Token.balanceOf(address(this)));
    }

    function getTokenHolderRegister() public view returns(TokenHolderRegister) {
        return _tokenHolderRegister;
    }

    function getV1Token() public view returns(IERC20) {
        return _v1Token;
    }

    function getTotalDelegated() public view returns(uint256) {
        return _tokenHolderRegister.getTotalTokens();
    }

    function getPercentageDelegated() public view returns(uint256) {
        return _tokenHolderRegister.getTotalTokens() * 100 / _v1Token.totalSupply();
    }
}
