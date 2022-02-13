//SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IReflectionDistributor.sol";
import "../utils/Allowable.sol";

contract ReflectionDistributor is Allowable, IReflectionDistributor {
    struct Share {
        bool initialized;
        uint256 amount;
        uint256 totalExcluded;
        uint256 lastClaim;
    }

    uint256 public _minPeriod = 12 hours;
    uint256 public _minTokenToHold = 100_000_000 * 10 ** 18;
    uint256 public _minDistribution = 1_000_000 * 10 ** 9;  // 0.0001 ETH

    address[] public _shareholders;
    mapping (address => Share) public _shares;

    uint256 private _totalAmount;
    uint256 private _totalEthReceived;
    uint256 private _totalEthDistributed;

    uint256 public _dividendsPerShareAccuracyFactor = 1_000 * 10 ** 18;

    mapping (address => bool) private _isExcludedFromDistribution;
    
    uint256 private _currentIndex;
    
    event DividendendsDistributed(address account, uint256 amount);

    receive() external payable {
        _totalEthReceived += msg.value;
    }

    function shareholderShares(address shareholder) public view returns (uint256) {
        return _shares[shareholder].amount / _dividendsPerShareAccuracyFactor;
    }

    function claimableDividends(address shareholder) public view returns (uint256) {
        return shareholderShares(shareholder) * dividendsPerShare();
    }

    function totalAmount() public view returns (uint256) {
        return _totalAmount;
    }

    function totalShares() public view returns (uint256) {
        return _totalAmount / _dividendsPerShareAccuracyFactor;
    }

    function totalEthReceived() external view returns (uint256) {
        return _totalEthReceived;
    }

    function totalEthDistributed() external view returns (uint256) {
        return _totalEthDistributed;
    }

    function dividendsPerShare() public view returns (uint256) {
        return totalShares() > 0
            ? address(this).balance / totalShares()
            : 0;
    }

    function isExcludedFromDistribution(address account) external view returns (bool) {
        return _isExcludedFromDistribution[account];
    }

    function setMinPeriod(uint256 minPeriod) external onlyAllowed {
        _minPeriod = minPeriod;
    }

    function setMinTokenToHold(uint256 minTokenToHold) external onlyAllowed {
        _minTokenToHold = minTokenToHold * 10 ** 18;
    }

    function setMinDistribution(uint256 minDistribution) external onlyAllowed {
        _minDistribution = minDistribution * 10 ** 9;
    }

    function excludeFromDistribution(address account, bool excluded) external onlyOwner {
        _isExcludedFromDistribution[account] = excluded;
    }

    function setShare(address shareholder, uint256 amount) external override onlyAllowed {
        _setShare(shareholder, amount);
    }

    function process(uint256 gas) external override onlyAllowed payable {
        uint256 gasUsed = 0;
        uint256 gasLeft = gasleft();
        uint256 iterations = 0;
        uint256 shareholderCount = _shareholders.length;
        
        while (iterations < shareholderCount && gasUsed < gas) {
            if (_currentIndex >= shareholderCount) {
                _currentIndex = 0;
            }

            address currentShareHolder = _shareholders[_currentIndex];

            if (!_isExcludedFromDistribution[currentShareHolder]) {
                uint256 holderAmount = IERC20(_msgSender()).balanceOf(currentShareHolder);

                if (_shares[currentShareHolder].amount != holderAmount) {
                    _setShare(currentShareHolder, holderAmount);
                }

                if (_shouldDistribute(currentShareHolder)) {
                    _distributeDividends(currentShareHolder);
                }
            }

            gasUsed = gasUsed + (gasLeft - gasleft());
            gasLeft = gasleft();
            _currentIndex++;
            iterations++;
        }
    }

    function _shouldDistribute(address shareholder) private view returns (bool) {
        return
            block.timestamp >= _shares[shareholder].lastClaim + _minPeriod &&
            _shares[shareholder].amount >= _minDistribution;
    }
    
    function _setShare(address shareholder, uint256 amount) private {
        if (!_shares[shareholder].initialized) {
            _addShareholder(shareholder);
            _shares[shareholder].initialized = true;
            _shares[shareholder].lastClaim = block.timestamp;
        }

        if (amount >= _minTokenToHold) {
            uint256 previousAmount = _shares[shareholder].amount;
            _shares[shareholder].amount = amount;
            _totalAmount = _totalAmount - previousAmount + amount;
        } else {
            uint256 previousAmount = _shares[shareholder].amount;
            _shares[shareholder].amount = 0;
            _totalAmount = _totalAmount - previousAmount;
        }
    }

    function _addShareholder(address shareholder) private {
        _shareholders.push(shareholder);
    }
    
    function _distributeDividends(address shareholder) private {
        uint256 amount = claimableDividends(shareholder);
        
        if (amount > 0) {
            ( bool successShareholder, /* bytes memory data */ ) = payable(shareholder).call{value: amount, gas: 30_000}("");
            require(successShareholder, "ReflectionDistributor: Provider receiver rejected ETH transfer");

            emit DividendendsDistributed(shareholder, amount);
            
            _totalEthDistributed = _totalEthDistributed + amount;
            
            _shares[shareholder].lastClaim = block.timestamp;
        }
    }
}
