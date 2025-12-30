// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title YieldOptimizerVault
 * @notice Auto-compounding yield vault that optimizes yields across multiple protocols
 * @dev Deposits user funds into highest-yielding protocols and auto-compounds rewards
 */
contract YieldOptimizerVault is
    ERC20,
    ReentrancyGuard,
    AccessControl,
    Pausable
{
    using SafeERC20 for IERC20;

    /// @notice Role for vault managers
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /// @notice Underlying asset (e.g., USDC, DAI)
    IERC20 public immutable asset;

    /// @notice Total assets managed by vault
    uint256 public totalAssets;

    /// @notice Performance fee (basis points, e.g., 200 = 2%)
    uint256 public performanceFeeBps;

    /// @notice Management fee (basis points per year)
    uint256 public managementFeeBps;

    /// @notice Last harvest timestamp
    uint256 public lastHarvest;

    /// @notice Harvest interval (seconds)
    uint256 public harvestInterval;

    /// @notice Maximum deposit per user (0 = unlimited)
    uint256 public maxDepositPerUser;

    /// @notice Maximum total deposits (0 = unlimited)
    uint256 public maxTotalDeposits;

    /// @notice Active yield strategies
    address[] public strategies;
    mapping(address => bool) public isStrategy;
    mapping(address => uint256) public strategyAllocation; // Basis points

    /// @notice Events
    event Deposit(
        address indexed user,
        uint256 assets,
        uint256 shares
    );
    event Withdraw(
        address indexed user,
        uint256 assets,
        uint256 shares
    );
    event Harvest(
        uint256 totalRewards,
        uint256 performanceFee,
        uint256 newTotalAssets
    );
    event StrategyAdded(address indexed strategy, uint256 allocationBps);
    event StrategyRemoved(address indexed strategy);
    event StrategyAllocationUpdated(
        address indexed strategy,
        uint256 newAllocationBps
    );

    /// @notice Errors
    error InsufficientAssets(uint256 requested, uint256 available);
    error MaxDepositExceeded(uint256 amount, uint256 max);
    error MaxTotalDepositsExceeded(uint256 amount, uint256 max);
    error InvalidAllocation(uint256 totalAllocation);
    error StrategyNotActive(address strategy);
    error HarvestTooSoon(uint256 timeElapsed, uint256 required);
    error InvalidStrategy(address strategy);

    constructor(
        address _asset,
        string memory _name,
        string memory _symbol,
        address _admin
    ) ERC20(_name, _symbol) {
        asset = IERC20(_asset);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MANAGER_ROLE, _admin);

        performanceFeeBps = 200; // 2%
        managementFeeBps = 100; // 1% per year
        harvestInterval = 1 days;
        lastHarvest = block.timestamp;
    }

    /**
     * @notice Deposit assets into vault
     * @param amount Amount of assets to deposit
     * @param receiver Address to receive shares
     * @return shares Amount of shares minted
     */
    function deposit(
        uint256 amount,
        address receiver
    ) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (maxDepositPerUser > 0) {
            uint256 userBalance = balanceOf(receiver);
            if (userBalance + amount > maxDepositPerUser) {
                revert MaxDepositExceeded(amount, maxDepositPerUser);
            }
        }

        if (maxTotalDeposits > 0) {
            if (totalAssets + amount > maxTotalDeposits) {
                revert MaxTotalDepositsExceeded(amount, maxTotalDeposits);
            }
        }

        // Harvest before deposit to update share price
        _harvestIfNeeded();

        // Calculate shares to mint
        shares = convertToShares(amount);

        // Transfer assets from user
        asset.safeTransferFrom(msg.sender, address(this), amount);

        // Update total assets
        totalAssets += amount;

        // Mint shares
        _mint(receiver, shares);

        // Deposit into strategies
        _depositToStrategies(amount);

        emit Deposit(receiver, amount, shares);
    }

    /**
     * @notice Withdraw assets from vault
     * @param shares Amount of shares to burn
     * @param receiver Address to receive assets
     * @param owner Address that owns the shares
     * @return assets Amount of assets withdrawn
     */
    function withdraw(
        uint256 shares,
        address receiver,
        address owner
    ) external nonReentrant whenNotPaused returns (uint256 assets) {
        if (msg.sender != owner) {
            uint256 allowed = allowance(owner, msg.sender);
            if (allowed < shares) {
                revert("Insufficient allowance");
            }
            _approve(owner, msg.sender, allowance(owner, msg.sender) - shares);
        }

        // Harvest before withdrawal
        _harvestIfNeeded();

        // Calculate assets to withdraw
        assets = convertToAssets(shares);

        if (assets > totalAssets) {
            revert InsufficientAssets(assets, totalAssets);
        }

        // Withdraw from strategies if needed
        uint256 available = asset.balanceOf(address(this));
        if (available < assets) {
            _withdrawFromStrategies(assets - available);
        }

        // Burn shares
        _burn(owner, shares);

        // Update total assets
        totalAssets -= assets;

        // Transfer assets to receiver
        asset.safeTransfer(receiver, assets);

        emit Withdraw(receiver, assets, shares);
    }

    /**
     * @notice Harvest rewards from all strategies and compound
     */
    function harvest() external nonReentrant whenNotPaused {
        _harvest();
    }

    /**
     * @notice Internal harvest function
     */
    function _harvest() internal {
        uint256 assetsBefore = totalAssets;

        // Harvest from all strategies
        for (uint256 i = 0; i < strategies.length; i++) {
            address strategy = strategies[i];
            if (isStrategy[strategy]) {
                // Call harvest on strategy (would need strategy interface)
                // This is a placeholder - implement based on strategy interface
                try IYieldStrategy(strategy).harvest() {} catch {}
            }
        }

        // Calculate new total assets
        uint256 newTotalAssets = _calculateTotalAssets();
        uint256 rewards = newTotalAssets > assetsBefore
            ? newTotalAssets - assetsBefore
            : 0;

        if (rewards > 0) {
            // Calculate performance fee
            uint256 performanceFee = (rewards * performanceFeeBps) / 10000;

            // Update total assets (rewards - fee)
            totalAssets = newTotalAssets - performanceFee;

            // Transfer performance fee to fee recipient
            // In production, would transfer to fee recipient address
            // asset.safeTransfer(feeRecipient, performanceFee);

            lastHarvest = block.timestamp;

            emit Harvest(rewards, performanceFee, totalAssets);
        }
    }

    /**
     * @notice Harvest if enough time has passed
     */
    function _harvestIfNeeded() internal {
        if (block.timestamp >= lastHarvest + harvestInterval) {
            _harvest();
        }
    }

    /**
     * @notice Calculate total assets across all strategies
     */
    function _calculateTotalAssets() internal view returns (uint256) {
        uint256 total = asset.balanceOf(address(this));

        for (uint256 i = 0; i < strategies.length; i++) {
            address strategy = strategies[i];
            if (isStrategy[strategy]) {
                try IYieldStrategy(strategy).balanceOf(address(this)) returns (
                    uint256 balance
                ) {
                    total += balance;
                } catch {}
            }
        }

        return total;
    }

    /**
     * @notice Deposit assets to strategies based on allocation
     */
    function _depositToStrategies(uint256 amount) internal {
        for (uint256 i = 0; i < strategies.length; i++) {
            address strategy = strategies[i];
            if (isStrategy[strategy] && strategyAllocation[strategy] > 0) {
                uint256 allocation = (amount * strategyAllocation[strategy]) /
                    10000;
                if (allocation > 0) {
                    asset.safeApprove(strategy, allocation);
                    try IYieldStrategy(strategy).deposit(allocation) {} catch {}
                }
            }
        }
    }

    /**
     * @notice Withdraw assets from strategies
     */
    function _withdrawFromStrategies(uint256 amount) internal {
        // Withdraw proportionally from all strategies
        for (uint256 i = 0; i < strategies.length; i++) {
            address strategy = strategies[i];
            if (isStrategy[strategy] && strategyAllocation[strategy] > 0) {
                uint256 strategyBalance = IYieldStrategy(strategy).balanceOf(
                    address(this)
                );
                if (strategyBalance > 0) {
                    uint256 withdrawAmount = (amount *
                        strategyAllocation[strategy]) / 10000;
                    if (withdrawAmount > strategyBalance) {
                        withdrawAmount = strategyBalance;
                    }
                    try IYieldStrategy(strategy).withdraw(withdrawAmount) {} catch {}
                }
            }
        }
    }

    /**
     * @notice Add a new yield strategy
     * @param strategy Strategy address
     * @param allocationBps Allocation in basis points
     */
    function addStrategy(
        address strategy,
        uint256 allocationBps
    ) external onlyRole(MANAGER_ROLE) {
        if (strategy == address(0)) {
            revert InvalidStrategy(strategy);
        }

        if (!isStrategy[strategy]) {
            strategies.push(strategy);
            isStrategy[strategy] = true;
        }

        strategyAllocation[strategy] = allocationBps;

        // Verify total allocation doesn't exceed 100%
        uint256 totalAllocation = 0;
        for (uint256 i = 0; i < strategies.length; i++) {
            if (isStrategy[strategies[i]]) {
                totalAllocation += strategyAllocation[strategies[i]];
            }
        }

        if (totalAllocation > 10000) {
            revert InvalidAllocation(totalAllocation);
        }

        emit StrategyAdded(strategy, allocationBps);
    }

    /**
     * @notice Remove a strategy
     * @param strategy Strategy to remove
     */
    function removeStrategy(
        address strategy
    ) external onlyRole(MANAGER_ROLE) {
        if (!isStrategy[strategy]) {
            revert StrategyNotActive(strategy);
        }

        // Withdraw all funds from strategy
        uint256 balance = IYieldStrategy(strategy).balanceOf(address(this));
        if (balance > 0) {
            try IYieldStrategy(strategy).withdraw(balance) {} catch {}
        }

        isStrategy[strategy] = false;
        strategyAllocation[strategy] = 0;

        emit StrategyRemoved(strategy);
    }

    /**
     * @notice Convert assets to shares
     * @param assets Amount of assets
     * @return shares Amount of shares
     */
    function convertToShares(
        uint256 assets
    ) public view returns (uint256 shares) {
        uint256 supply = totalSupply();
        if (supply == 0 || totalAssets == 0) {
            return assets; // 1:1 on first deposit
        }
        return (assets * supply) / totalAssets;
    }

    /**
     * @notice Convert shares to assets
     * @param shares Amount of shares
     * @return assets Amount of assets
     */
    function convertToAssets(
        uint256 shares
    ) public view returns (uint256 assets) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return 0;
        }
        return (shares * totalAssets) / supply;
    }

    /**
     * @notice Set performance fee
     * @param feeBps Fee in basis points
     */
    function setPerformanceFee(
        uint256 feeBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(feeBps <= 5000, "Fee too high"); // Max 50%
        performanceFeeBps = feeBps;
    }

    /**
     * @notice Set management fee
     * @param feeBps Fee in basis points per year
     */
    function setManagementFee(
        uint256 feeBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(feeBps <= 1000, "Fee too high"); // Max 10% per year
        managementFeeBps = feeBps;
    }

    /**
     * @notice Pause vault
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause vault
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}

// Minimal yield strategy interface
interface IYieldStrategy {
    function deposit(uint256 amount) external returns (uint256);

    function withdraw(uint256 amount) external returns (uint256);

    function harvest() external returns (uint256);

    function balanceOf(address account) external view returns (uint256);
}

