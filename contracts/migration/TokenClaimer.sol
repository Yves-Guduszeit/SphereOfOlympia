// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TokenHolderRegister.sol";

contract TokenClaimer is Ownable {
    TokenHolderRegister private _tokenHolderRegister;
    IERC20 private _v2Token;

    constructor(TokenHolderRegister tokenHolderRegister, IERC20 v2Token) {
        _tokenHolderRegister = tokenHolderRegister;
        _v2Token = v2Token;
    }

    function claimV2Tokens(address holder) public {
        uint256 amount = _tokenHolderRegister.getTokens(holder);
        require(amount > 0, 'TokenClaimer: Should transfer some tokens');

        if (_v2Token.transfer(holder, amount)) {
            _tokenHolderRegister.removeTokens(holder);
        }
    }

    function collectV2Tokens() public onlyOwner() {
        _v2Token.transfer(owner(), _v2Token.balanceOf(address(this)));
    }
}
