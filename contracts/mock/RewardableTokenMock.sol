// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../tokens/interfaces/IReflectionDistributor.sol";

contract RewardableTokenMock is ERC20, Ownable {
    address private _reflectionDistributor;

    constructor(address reflectionDistributor_) ERC20("Rewardable Token Mock", "RTM") {
        _reflectionDistributor = reflectionDistributor_;

        _mint(msg.sender, 100_000_000_000 * 10 ** decimals());
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override {
        require(sender != address(0), "Olympia: Transfer from the zero address");
        require(recipient != address(0), "Olympia: Transfer to the zero address");

        super._transfer(sender, recipient, amount);

        _distributeReflection(sender, recipient);
    }

    function _distributeReflection(address sender, address recipient) public {
        if (sender != owner() && recipient != owner()) {
            try IReflectionDistributor(_reflectionDistributor).setShare(sender, balanceOf(sender)) {} catch {}
            try IReflectionDistributor(_reflectionDistributor).setShare(recipient, balanceOf(recipient)) {} catch {}
        }

        IReflectionDistributor(_reflectionDistributor).process(30_000);
    }
}
