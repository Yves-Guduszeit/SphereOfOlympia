//SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

interface IReflectionDistributor {
    function setShare(address shareholder, uint256 amount) external;
    function process(uint256 gas) external payable;
}
