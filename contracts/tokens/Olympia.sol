/*
Olympia

Total Supply:
    100,000,000,000 $SOO

Taxes:
    Buy Tax: 12.0%
        2.0% Auto Liquidity
        3.0% BNB Rewards
        3.0% Marketing
        2.0% Team
        2.0% Provider

    Sell Tax: 14.0%
        2.0% Auto Liquidity
        3.0% BNB Rewards
        5.0% Marketing
        2.0% Team
        2.0% Provider

Features:
    Manual Blacklist Function
    
 *
 */
 
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./interfaces/IReflectionDistributor.sol";
import "../libraries/SafeMath.sol";

contract Olympia is ERC20, Ownable {
    using SafeMath for uint256;

    struct Fees {
        uint256 liquidityFeesPerTenThousand;
        uint256 teamFeesPerTenThousand;
        uint256 providerFeesPerTenThousand;
        uint256 marketingFeesPerTenThousand;
        uint256 reflectionFeesPerTenThousand;
    }
    
    address private _router;

    mapping (address => bool) private _isAutomatedMarketMakerPairs;
    mapping (address => bool) private _isExcludedFromFees;
    mapping (address => bool) private _isBlacklisted;
    
    bool private _isBuying;
    Fees private _buyFees;
    Fees private _sellFees;

    uint256 private _swapThreshold = 5_000_000 * 10 ** decimals(); // 50M $SOO ( 0.05% )
    uint256 private _gasForProcessing = 300_000; // 300K

    address private _deadWallet = 0x000000000000000000000000000000000000dEaD;
    address private _teamWallet;
    address private _providerWallet;
    address private _marketingWallet;
    address private _reflectionDistributor;

    bool private _inSwap;
    modifier swapping()
    {
        _inSwap = true;
        _;
        _inSwap = false;
    }

    event ReflectionDistributorUpdated(address indexed previousAddress, address indexed newAddress);
    event UpdateUniswapV2Router(address indexed previousAddress, address indexed newAddress);
    event UpdateMarketingWallet(address indexed previousWallet, address indexed newWallet);
    event UpdateTeamWallet(address indexed previousWallet, address indexed newWallet);
    event UpdateProviderWallet(address indexed previousWallet, address indexed newWallet);
    event LiquidityBuyFeesUpdated(uint256 previousFeesPerTenThousand, uint256 newFeesPerTenThousand);
    event TeamBuyFeesUpdated(uint256 previousFeesPerTenThousand, uint256 newFeesPerTenThousand);
    event ProviderBuyFeesUpdated(uint256 previousFeesPerTenThousand, uint256 newFeesPerTenThousand);
    event MarketingBuyFeesUpdated(uint256 previousFeesPerTenThousand, uint256 newFeesPerTenThousand);
    event ReflectionBuyFeesUpdated(uint256 previousFeesPerTenThousand, uint256 newFeesPerTenThousand);
    event BuyFeesUpdated(
        uint256 previousLiquidityFeesPerTenThousand, uint256 newLiquidityFeesPerTenThousand,
        uint256 previousTeamFeesPerTenThousand, uint256 newTeamFeesPerTenThousand,
        uint256 previousProviderFeesPerTenThousand, uint256 newProviderFeesPerTenThousand,
        uint256 previousMarketingFeesPerTenThousand, uint256 newMarketingFeesPerTenThousand,
        uint256 previousReflectionFeesPerTenThousand, uint256 newReflectionFeesPerTenThousand);
    event LiquiditySellFeesUpdated(uint256 previousFeesPerTenThousand, uint256 newFeesPerTenThousand);
    event TeamSellFeesUpdated(uint256 previousFeesPerTenThousand, uint256 newFeesPerTenThousand);
    event ProviderSellFeesUpdated(uint256 previousFeesPerTenThousand, uint256 newFeesPerTenThousand);
    event MarketingSellFeesUpdated(uint256 previousFeesPerTenThousand, uint256 newFeesPerTenThousand);
    event ReflectionSellFeesUpdated(uint256 previousFeesPerTenThousand, uint256 newFeesPerTenThousand);
    event SellFeesUpdated(
        uint256 previousLiquidityFeesPerTenThousand, uint256 newLiquidityFeesPerTenThousand,
        uint256 previousTeamFeesPerTenThousand, uint256 newTeamFeesPerTenThousand,
        uint256 previousProviderFeesPerTenThousand, uint256 newProviderFeesPerTenThousand,
        uint256 previousMarketingFeesPerTenThousand, uint256 newMarketingFeesPerTenThousand,
        uint256 previousReflectionFeesPerTenThousand, uint256 newReflectionFeesPerTenThousand);
    event FeesSentToWallet(address indexed wallet, uint256 amount);
    event ExcludeFromFees(address indexed account, bool isExcluded);
    event SetAutomatedMarketMakerPair(address indexed pair, bool indexed value);
    event GasForProcessingUpdated(uint256 indexed oldValue, uint256 indexed newValue);
    event SwapAndLiquify(uint256 tokensSwapped, uint256 ethReceived, uint256 tokensIntoLiqudity);
    event ReflectionDistributed(address indexed sender, address indexed recipient);

    constructor(
        address newRouter,
        address newTeamWallet,
        address newProviderWallet,
        address newMarketingWallet,
        address distributor) ERC20("Olympia", "SOO") {
        _router = newRouter;
    	_teamWallet = newTeamWallet;
    	_providerWallet = newProviderWallet;
    	_marketingWallet = newMarketingWallet;
    	_reflectionDistributor = distributor;

        // Create a uniswap pair for this new token
        IUniswapV2Router02 routerObject = IUniswapV2Router02(_router);
        address pair = IUniswapV2Factory(routerObject.factory()).createPair(address(this), routerObject.WETH());
        _setAutomatedMarketMakerPair(pair, true);

        // Buy fees
        _buyFees.liquidityFeesPerTenThousand = 200; // 2.00%
        _buyFees.teamFeesPerTenThousand = 200; // 2.00%
        _buyFees.providerFeesPerTenThousand = 200; // 2.00%
        _buyFees.marketingFeesPerTenThousand = 300; // 3.00%
        _buyFees.reflectionFeesPerTenThousand = 300; // 3.00%

        // Sell fees
        _sellFees.liquidityFeesPerTenThousand = 200; // 2.00%
        _sellFees.teamFeesPerTenThousand = 200; // 2.00%
        _sellFees.providerFeesPerTenThousand = 200; // 2.00%
        _sellFees.marketingFeesPerTenThousand = 500; // 5.00%
        _sellFees.reflectionFeesPerTenThousand = 300; // 3.00%

        _mint(owner(), 100_000_000_000 * 10 ** decimals()); // 100B $SOO
    }

    receive() external payable {
  	}
    
    function router() external view returns (address) {
        return _router;
    }

    function reflectionDistributor() external view returns (address) {
        return _reflectionDistributor;
    }

    function isAutomatedMarketMakerPair(address account) external view returns (bool) {
        return _isAutomatedMarketMakerPairs[account];
    }

    function isExcludedFromFees(address account) external view returns (bool) {
        return _isExcludedFromFees[account];
    }

    function isBlacklisted(address account) external view returns (bool) {
        return _isBlacklisted[account];
    }

    function buyFees() public view returns (
        uint256 liquidityFeesPerTenThousand,
        uint256 teamFeesPerTenThousand,
        uint256 providerFeesPerTenThousand,
        uint256 marketingFeesPerTenThousand,
        uint256 reflectionFeesPerTenThousand,
        uint256 totalFeePerTenThousand) {
        return (
            _buyFees.liquidityFeesPerTenThousand,
            _buyFees.teamFeesPerTenThousand,
            _buyFees.providerFeesPerTenThousand,
            _buyFees.marketingFeesPerTenThousand,
            _buyFees.reflectionFeesPerTenThousand,
            totalBuyFees());
    }

    function totalBuyFees() public view returns (uint256) {
        return (
            _buyFees.liquidityFeesPerTenThousand
                .add(_buyFees.teamFeesPerTenThousand)
                .add(_buyFees.providerFeesPerTenThousand)
                .add(_buyFees.marketingFeesPerTenThousand)
                .add(_buyFees.reflectionFeesPerTenThousand));
    }

    function sellFees() public view returns (
        uint256 liquidityFeesPerTenThousand,
        uint256 teamFeesPerTenThousand,
        uint256 providerFeesPerTenThousand,
        uint256 marketingFeesPerTenThousand,
        uint256 reflectionFeesPerTenThousand,
        uint256 totalFeePerTenThousand) {
        return (
            _sellFees.liquidityFeesPerTenThousand,
            _sellFees.teamFeesPerTenThousand,
            _sellFees.providerFeesPerTenThousand,
            _sellFees.marketingFeesPerTenThousand,
            _sellFees.reflectionFeesPerTenThousand,
            totalSellFees());
    }
    
    function totalSellFees() public view returns (uint256) {
        return (
            _sellFees.liquidityFeesPerTenThousand
                .add(_sellFees.teamFeesPerTenThousand)
                .add(_sellFees.providerFeesPerTenThousand)
                .add(_sellFees.marketingFeesPerTenThousand)
                .add(_sellFees.reflectionFeesPerTenThousand));
    }

    function swapThreshold() external view returns (uint256) {
        return _swapThreshold;
    }

    function gasForProcessing() external view returns (uint256) {
        return _gasForProcessing;
    }
    
    function teamWallet() external view returns (address) {
        return _teamWallet;
    }

    function providerWallet() external view returns (address) {
        return _providerWallet;
    }


    function marketingWallet() external view returns (address) {
        return _marketingWallet;
    }

    function updateReflectionDistributor(address distributor) external onlyOwner {
        require(distributor != _reflectionDistributor, "Olympia: The reflection distributor already has that address");

        address previousDistributor = _reflectionDistributor;
        _reflectionDistributor = distributor;

        emit ReflectionDistributorUpdated(previousDistributor, distributor);
    }

    function updateUniswapV2Router(address newRouter) external onlyOwner {
        require(newRouter != _router, "Olympia: The router already has that address");

        address previousRouter = _router;
        IUniswapV2Router02 routerObject = IUniswapV2Router02(newRouter);
        address newPair = IUniswapV2Factory(routerObject.factory()).createPair(address(this), routerObject.WETH());
        _setAutomatedMarketMakerPair(newPair, true);
        _router = newRouter;
        
        emit UpdateUniswapV2Router(previousRouter, newRouter);
    }

    function updateTeamWallet(address payable newWallet) external onlyOwner {
        require(newWallet != _teamWallet, "Olympia: The team wallet already has that address");

        address previousWallet = _teamWallet;
        _teamWallet = newWallet;

        emit UpdateTeamWallet(previousWallet, newWallet);
    }

    function updateProviderWallet(address payable newWallet) external onlyOwner {
        require(newWallet != _providerWallet, "Olympia: The provider wallet already has that address");

        address previousWallet = _providerWallet;
        _providerWallet = newWallet;

        emit UpdateProviderWallet(previousWallet, newWallet);
    }

    function updateMarketingWallet(address payable newWallet) external onlyOwner {
        require(newWallet != _marketingWallet, "Olympia: The marketing wallet already has that address");

        address previousWallet = _marketingWallet;
        _marketingWallet = newWallet;

        emit UpdateMarketingWallet(previousWallet, newWallet);
    }

    function setAutomatedMarketMakerPair(address newPair, bool value) external onlyOwner {
        _setAutomatedMarketMakerPair(newPair, value);
    }

    function excludeFromFees(address account, bool excluded) external onlyOwner {
        require(_isExcludedFromFees[account] != excluded, "Olympia: Account is already the value of 'excluded'");

        _isExcludedFromFees[account] = excluded;

        emit ExcludeFromFees(account, excluded);
    }

    function blacklistAddress(address account, bool value) external onlyOwner {
        _isBlacklisted[account] = value;
    }

    function updateGasForProcessing(uint256 newValue) external onlyOwner {
        require(newValue >= 200_000 && newValue <= 500_000, "Olympia: gas must be between 200,000 and 500,000");
        require(newValue != _gasForProcessing, "Olympia: Cannot update gas to same value");

        emit GasForProcessingUpdated(_gasForProcessing, newValue);
        _gasForProcessing = newValue;
    }

    function updateSwapThreshold(uint256 threshold) external onlyOwner {
        _swapThreshold = threshold * 10 ** decimals();
    }

    function updateBuyFees (
        uint256 liquidityFeesPerTenThousand,
        uint256 teamFeesPerTenThousand,
        uint256 providerFeesPerTenThousand,
        uint256 marketingFeesPerTenThousand,
        uint256 reflectionFeesPerTenThousand) external onlyOwner {
        require(
            liquidityFeesPerTenThousand != _buyFees.liquidityFeesPerTenThousand ||
            teamFeesPerTenThousand != _buyFees.teamFeesPerTenThousand ||
            providerFeesPerTenThousand != _buyFees.providerFeesPerTenThousand ||
            marketingFeesPerTenThousand != _buyFees.marketingFeesPerTenThousand ||
            reflectionFeesPerTenThousand != _buyFees.reflectionFeesPerTenThousand, "Olympia: Buy fees has already the same values");

        uint256 previousLiquidityFeesPerTenThousand = _buyFees.liquidityFeesPerTenThousand;
        _buyFees.liquidityFeesPerTenThousand = liquidityFeesPerTenThousand;

        uint256 previousTeamFeesPerTenThousand = _buyFees.teamFeesPerTenThousand;
        _buyFees.teamFeesPerTenThousand = teamFeesPerTenThousand;

        uint256 previousProviderFeesPerTenThousand = _buyFees.providerFeesPerTenThousand;
        _buyFees.providerFeesPerTenThousand = providerFeesPerTenThousand;

        uint256 previousMarketingFeesPerTenThousand = _buyFees.marketingFeesPerTenThousand;
        _buyFees.marketingFeesPerTenThousand = marketingFeesPerTenThousand;

        uint256 previousReflectionFeesPerTenThousand = _buyFees.reflectionFeesPerTenThousand;
        _buyFees.reflectionFeesPerTenThousand = reflectionFeesPerTenThousand;

        emit BuyFeesUpdated(
            previousLiquidityFeesPerTenThousand, liquidityFeesPerTenThousand,
            previousTeamFeesPerTenThousand, teamFeesPerTenThousand,
            previousProviderFeesPerTenThousand, providerFeesPerTenThousand,
            previousMarketingFeesPerTenThousand, marketingFeesPerTenThousand,
            previousReflectionFeesPerTenThousand, reflectionFeesPerTenThousand);
    }

    function updateLiquidityBuyFees(uint256 feesPerTenThousand) external onlyOwner {
        require(feesPerTenThousand != _buyFees.liquidityFeesPerTenThousand, "Olympia: Liquidity buy fees has already the same value");

        uint256 previousfeesPerTenThousand = _buyFees.liquidityFeesPerTenThousand;
        _buyFees.liquidityFeesPerTenThousand = feesPerTenThousand;

        emit LiquidityBuyFeesUpdated(previousfeesPerTenThousand, feesPerTenThousand);
    }

    function updateTeamBuyFees(uint256 feesPerTenThousand) external onlyOwner {
        require(feesPerTenThousand != _buyFees.teamFeesPerTenThousand, "Olympia: Team buy fees has already the same value");

        uint256 previousfeesPerTenThousand = _buyFees.teamFeesPerTenThousand;
        _buyFees.teamFeesPerTenThousand = feesPerTenThousand;

        emit TeamBuyFeesUpdated(previousfeesPerTenThousand, feesPerTenThousand);
    }

    function updateProviderBuyFees(uint256 feesPerTenThousand) external onlyOwner {
        require(feesPerTenThousand != _buyFees.providerFeesPerTenThousand, "Olympia: Provider buy fees has already the same value");

        uint256 previousfeesPerTenThousand = _buyFees.providerFeesPerTenThousand;
        _buyFees.providerFeesPerTenThousand = feesPerTenThousand;

        emit ProviderBuyFeesUpdated(previousfeesPerTenThousand, feesPerTenThousand);
    }

    function updateMarketingBuyFees(uint256 feesPerTenThousand) external onlyOwner {
        require(feesPerTenThousand != _buyFees.marketingFeesPerTenThousand, "Olympia: Marketing buy fees has already the same value");

        uint256 previousfeesPerTenThousand = _buyFees.marketingFeesPerTenThousand;
        _buyFees.marketingFeesPerTenThousand = feesPerTenThousand;

        emit MarketingBuyFeesUpdated(previousfeesPerTenThousand, feesPerTenThousand);
    }

    function updateReflectionBuyFees(uint256 feesPerTenThousand) external onlyOwner {
        require(feesPerTenThousand != _buyFees.reflectionFeesPerTenThousand, "Olympia: Reflection buy fees has already the same value");

        uint256 previousfeesPerTenThousand = _buyFees.reflectionFeesPerTenThousand;
        _buyFees.reflectionFeesPerTenThousand = feesPerTenThousand;

        emit ReflectionBuyFeesUpdated(previousfeesPerTenThousand, feesPerTenThousand);
    }

    function updateSellFees (
        uint256 liquidityFeesPerTenThousand,
        uint256 teamFeesPerTenThousand,
        uint256 providerFeesPerTenThousand,
        uint256 marketingFeesPerTenThousand,
        uint256 reflectionFeesPerTenThousand) external onlyOwner {
        require(
            liquidityFeesPerTenThousand != _sellFees.liquidityFeesPerTenThousand ||
            teamFeesPerTenThousand != _sellFees.teamFeesPerTenThousand ||
            providerFeesPerTenThousand != _sellFees.providerFeesPerTenThousand ||
            marketingFeesPerTenThousand != _sellFees.marketingFeesPerTenThousand ||
            reflectionFeesPerTenThousand != _sellFees.reflectionFeesPerTenThousand, "Olympia: Sell fees has already the same values");

        uint256 previousLiquidityFeesPerTenThousand = _sellFees.liquidityFeesPerTenThousand;
        _sellFees.liquidityFeesPerTenThousand = liquidityFeesPerTenThousand;

        uint256 previousTeamFeesPerTenThousand = _sellFees.teamFeesPerTenThousand;
        _sellFees.teamFeesPerTenThousand = teamFeesPerTenThousand;

        uint256 previousProviderFeesPerTenThousand = _sellFees.providerFeesPerTenThousand;
        _sellFees.providerFeesPerTenThousand = providerFeesPerTenThousand;

        uint256 previousMarketingFeesPerTenThousand = _sellFees.marketingFeesPerTenThousand;
        _sellFees.marketingFeesPerTenThousand = marketingFeesPerTenThousand;

        uint256 previousReflectionFeesPerTenThousand = _sellFees.reflectionFeesPerTenThousand;
        _sellFees.reflectionFeesPerTenThousand = reflectionFeesPerTenThousand;

        emit SellFeesUpdated(
            previousLiquidityFeesPerTenThousand, liquidityFeesPerTenThousand,
            previousTeamFeesPerTenThousand, teamFeesPerTenThousand,
            previousProviderFeesPerTenThousand, providerFeesPerTenThousand,
            previousMarketingFeesPerTenThousand, marketingFeesPerTenThousand,
            previousReflectionFeesPerTenThousand, reflectionFeesPerTenThousand);
    }

    function updateLiquiditySellFees(uint256 feesPerTenThousand) external onlyOwner {
        require(feesPerTenThousand != _sellFees.liquidityFeesPerTenThousand, "Olympia: Liquidity sell fees has already the same value");

        uint256 previousfeesPerTenThousand = _sellFees.liquidityFeesPerTenThousand;
        _sellFees.liquidityFeesPerTenThousand = feesPerTenThousand;

        emit LiquiditySellFeesUpdated(previousfeesPerTenThousand, feesPerTenThousand);
    }

    function updateTeamSellFees(uint256 feesPerTenThousand) external onlyOwner {
        require(feesPerTenThousand != _sellFees.teamFeesPerTenThousand, "Olympia: Team sell fees has already the same value");

        uint256 previousfeesPerTenThousand = _sellFees.teamFeesPerTenThousand;
        _sellFees.teamFeesPerTenThousand = feesPerTenThousand;

        emit TeamSellFeesUpdated(previousfeesPerTenThousand, feesPerTenThousand);
    }

    function updateProviderSellFees(uint256 feesPerTenThousand) external onlyOwner {
        require(feesPerTenThousand != _sellFees.providerFeesPerTenThousand, "Olympia: Provider sell fees has already the same value");

        uint256 previousfeesPerTenThousand = _sellFees.providerFeesPerTenThousand;
        _sellFees.providerFeesPerTenThousand = feesPerTenThousand;

        emit ProviderSellFeesUpdated(previousfeesPerTenThousand, feesPerTenThousand);
    }

    function updateMarketingSellFees(uint256 feesPerTenThousand) external onlyOwner {
        require(feesPerTenThousand != _sellFees.marketingFeesPerTenThousand, "Olympia: Marketing sell fees has already the same value");

        uint256 previousfeesPerTenThousand = _sellFees.marketingFeesPerTenThousand;
        _sellFees.marketingFeesPerTenThousand = feesPerTenThousand;

        emit MarketingSellFeesUpdated(previousfeesPerTenThousand, feesPerTenThousand);
    }

    function updateReflectionSellFees(uint256 feesPerTenThousand) external onlyOwner {
        require(feesPerTenThousand != _sellFees.reflectionFeesPerTenThousand, "Olympia: Reflection sell fees has already the same value");

        uint256 previousfeesPerTenThousand = _sellFees.reflectionFeesPerTenThousand;
        _sellFees.reflectionFeesPerTenThousand = feesPerTenThousand;

        emit ReflectionSellFeesUpdated(previousfeesPerTenThousand, feesPerTenThousand);
    }

    function _currentFees() private view returns (uint256, uint256, uint256, uint256, uint256, uint256) {
        return _isBuying ? buyFees() : sellFees();
    }

    function _currentTotalFees() private view returns (uint256) {
        return _isBuying ? totalBuyFees() : totalSellFees();
    }

    function _setAutomatedMarketMakerPair(address newPair, bool value) private {
        require(_isAutomatedMarketMakerPairs[newPair] != value, "Olympia: Automated market maker pair is already set to that value");
        _isAutomatedMarketMakerPairs[newPair] = value;

        emit SetAutomatedMarketMakerPair(newPair, value);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override {
        require(sender != address(0), "Olympia: Transfer from the zero address");
        require(recipient != address(0), "Olympia: Transfer to the zero address");
        require(!_isBlacklisted[sender] && !_isBlacklisted[recipient], 'Olympia: Blacklisted address');

        if (amount == 0) {
            super._transfer(sender, recipient, 0);
            return;
        }

        _isBuying = _isAutomatedMarketMakerPairs[sender];

        if (_shouldTakeFees(sender, recipient)) {
            uint256 totalFeesPerTenThousand = _currentTotalFees();
        	uint256 feesAmount = amount.mul(totalFeesPerTenThousand).div(10_000);
        	amount = amount.sub(feesAmount);

            if (feesAmount > 0) {
                super._transfer(sender, address(this), feesAmount);
            }
        }

        if (amount > 0) {
            super._transfer(sender, recipient, amount);
        }

        if (_shouldSwap(sender, recipient)) {
            _swapSendFeesAndLiquify();
        }

        _distributeReflection(sender, recipient);
    }

    function _shouldTakeFees(address sender, address recipient) private view returns (bool) {
        return
            !_inSwap &&
            sender != address(this) && recipient != address(this) &&
            sender != owner() && recipient != owner() &&
            sender != _teamWallet && recipient != _teamWallet &&
            sender != _providerWallet && recipient != _providerWallet &&
            sender != _marketingWallet && recipient != _marketingWallet &&
            !_isExcludedFromFees[sender] && !_isExcludedFromFees[recipient];
    }
    
    function _shouldSwap(address sender, address recipient) private view returns (bool) {
        return
            balanceOf(address(this)) >= _swapThreshold &&
            !_inSwap &&
            sender != owner() && recipient != owner() &&
            sender != _teamWallet && recipient != _teamWallet &&
            sender != _providerWallet && recipient != _providerWallet &&
            sender != _marketingWallet && recipient != _marketingWallet &&
            !_isAutomatedMarketMakerPairs[sender] && !_isAutomatedMarketMakerPairs[recipient];
    }

    function _shouldSetShare(address sender, address recipient) private view returns (bool) {
        return
            sender != owner() && recipient != owner() &&
            sender != address(this) && recipient != address(this) &&
            sender != _router && recipient != _router &&
            sender != _deadWallet && recipient != _deadWallet &&
            !_isAutomatedMarketMakerPairs[sender] && !_isAutomatedMarketMakerPairs[recipient];
    }

    function _swapSendFeesAndLiquify() private swapping {
        uint256 tokenBalance = balanceOf(address(this));
        (
            uint256 liquidityFeesPerTenThousand,
            uint256 teamFeesPerTenThousand,
            uint256 providerFeesPerTenThousand,
            uint256 marketingFeesPerTenThousand,
            uint256 reflectionFeesPerTenThousand,
            uint256 totalFeesPerTenThousand) = _currentFees();

        uint256 liquidityTokenAmount = tokenBalance.mul(liquidityFeesPerTenThousand).div(totalFeesPerTenThousand).div(2);
        uint256 tokenAmountToSwap = tokenBalance.sub(liquidityTokenAmount);

        _swapTokensForEth(tokenAmountToSwap);
        uint256 ethAmount = address(this).balance;

        uint256 teamEthAmount = ethAmount.mul(teamFeesPerTenThousand).div(totalFeesPerTenThousand);
        _sendFeesToWallet(_teamWallet, teamEthAmount);
        
        uint256 providerEthAmount = ethAmount.mul(providerFeesPerTenThousand).div(totalFeesPerTenThousand);
        _sendFeesToWallet(_providerWallet, providerEthAmount);

        uint256 marketingEthAmount = ethAmount.mul(marketingFeesPerTenThousand).div(totalFeesPerTenThousand);
        _sendFeesToWallet(_marketingWallet, marketingEthAmount);

        uint256 reflectionEthBalance = ethAmount.mul(reflectionFeesPerTenThousand).div(totalFeesPerTenThousand);
        _sendFeesToWallet(_reflectionDistributor, reflectionEthBalance);

        uint256 liquidityEthAmount = ethAmount.sub(teamEthAmount).sub(providerEthAmount).sub(marketingEthAmount).sub(reflectionEthBalance);
        _liquify(liquidityTokenAmount, liquidityEthAmount);
    }

    function _sendFeesToWallet(address wallet, uint256 ethAmount) private {
        if (ethAmount > 0) {
            (bool success, /* bytes memory data */) = wallet.call{value: ethAmount}("");
            if (success) {
                emit FeesSentToWallet(wallet, ethAmount);
            }
        }
    }

    function _swapTokensForEth(uint256 tokenAmount) private {
        if (tokenAmount > 0) {
            address[] memory path = new address[](2);
            path[0] = address(this);
            path[1] = IUniswapV2Router02(_router).WETH();

            _approve(address(this), _router, tokenAmount);
            IUniswapV2Router02(_router).swapExactTokensForETHSupportingFeeOnTransferTokens(
                tokenAmount,
                0,
                path,
                address(this),
                block.timestamp);
        }
    }

    function _liquify(uint256 tokenAmount, uint256 ethAmount) private {
        if (tokenAmount > 0 && ethAmount > 0) {
            _addLiquidity(tokenAmount, ethAmount);

            emit SwapAndLiquify(tokenAmount, ethAmount, tokenAmount);
        }
    }

    function _addLiquidity(uint256 tokenAmount, uint256 ethAmount) private {
        _approve(address(this), _router, tokenAmount);
        IUniswapV2Router02(_router).addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0,
            0,
            owner(),
            block.timestamp
        );
    }

    function _distributeReflection(address sender, address recipient) public {
        if (_shouldSetShare(sender, recipient)) {
            try IReflectionDistributor(_reflectionDistributor).setShare(sender, balanceOf(sender)) {} catch {}
            try IReflectionDistributor(_reflectionDistributor).setShare(recipient, balanceOf(recipient)) {} catch {}
        }
        
        if (!_inSwap) {
	    	try IReflectionDistributor(_reflectionDistributor).process(_gasForProcessing) {} catch {}
        }
        
        emit ReflectionDistributed(sender, recipient);
    }
}
