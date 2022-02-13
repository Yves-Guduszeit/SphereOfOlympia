// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract V1Token is ERC20 {
    constructor() ERC20("Token V1", "TV1") {
        _mint(msg.sender, 1000000000 * 10 ** decimals());
    }
}
