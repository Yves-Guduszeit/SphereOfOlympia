// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "../utils/Allowable.sol";

contract TokenHolderRegister is Allowable {
    mapping (address => uint256) private _tokenholders;
    uint256 private _totalTokens;

    function addTokens(address holder, uint256 amount) public onlyAllowed() {
        require(amount > 0, 'TokenHolderRegister: Holder should have some tokens');
        _tokenholders[holder] += amount;
        _totalTokens += amount;
    }

    function removeTokens(address holder) public onlyAllowed() {
        require(_tokenholders[holder] > 0, 'TokenHolderRegister: Holder should have some tokens');
        _totalTokens -= _tokenholders[holder];
        delete _tokenholders[holder];
    }

    function getTokens(address holder) public view returns(uint256) {
        return _tokenholders[holder];
    }

    function getTotalTokens() public view returns(uint256) {
        return _totalTokens;
    }
}
