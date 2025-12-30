// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFlashLoanReceiver} from "@openzeppelin/contracts/interfaces/IFlashLoanReceiver.sol";

/**
 * @title FlashLoanArbitrage
 * @notice Executes arbitrage opportunities using flash loans
 * @dev Uses Aave flash loans to capitalize on price differences across DEXs
 *      Demonstrates advanced DeFi knowledge including flash loan mechanics
 */
contract FlashLoanArbitrage is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Aave Lending Pool for flash loans
    address public immutable aaveLendingPool;

    /// @notice DEX routers for arbitrage
    address public immutable uniswapV2Router;
    address public immutable sushiswapRouter;

    /// @notice Owner of the contract
    address public owner;

    /// @notice Minimum profit threshold (in basis points of loan amount)
    uint256 public minProfitBps;

    /// @notice Events
    event ArbitrageExecuted(
        address indexed token,
        uint256 loanAmount,
        uint256 profit,
        address dex1,
        address dex2
    );
    event ProfitWithdrawn(address indexed token, uint256 amount);
    event MinProfitBpsUpdated(uint256 newMinProfitBps);

    /// @notice Errors
    error Unauthorized();
    error InsufficientProfit(uint256 profit, uint256 minProfit);
    error FlashLoanFailed();
    error ArbitrageFailed(string reason);
    error InvalidToken(address token);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(
        address _aaveLendingPool,
        address _uniswapV2Router,
        address _sushiswapRouter
    ) {
        aaveLendingPool = _aaveLendingPool;
        uniswapV2Router = _uniswapV2Router;
        sushiswapRouter = _sushiswapRouter;
        owner = msg.sender;
        minProfitBps = 50; // 0.5% minimum profit
    }

    /**
     * @notice Execute arbitrage opportunity
     * @param token Token to arbitrage
     * @param amount Flash loan amount
     * @param path1 Path for first DEX (buy)
     * @param path2 Path for second DEX (sell)
     * @param dex1 First DEX router (where we buy)
     * @param dex2 Second DEX router (where we sell)
     */
    function executeArbitrage(
        address token,
        uint256 amount,
        address[] calldata path1,
        address[] calldata path2,
        address dex1,
        address dex2
    ) external nonReentrant {
        if (token == address(0)) revert InvalidToken(token);

        // Request flash loan from Aave
        bytes memory params = abi.encode(token, amount, path1, path2, dex1, dex2);

        // Flash loan parameters
        address[] memory assets = new address[](1);
        assets[0] = token;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0; // No debt mode

        // Execute flash loan
        IAaveLendingPool(aaveLendingPool).flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            params,
            0
        );
    }

    /**
     * @notice Flash loan callback (called by Aave)
     * @param assets Array of assets borrowed
     * @param amounts Array of amounts borrowed
     * @param premiums Array of premiums to repay
     * @param params Encoded parameters
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address,
        bytes calldata params
    ) external returns (bool) {
        // Verify caller is Aave lending pool
        require(
            msg.sender == aaveLendingPool,
            "Only Aave can call this"
        );

        // Decode parameters
        (
            address token,
            uint256 loanAmount,
            address[] memory path1,
            address[] memory path2,
            address dex1,
            address dex2
        ) = abi.decode(params, (address, uint256, address[], address[], address, address));

        // Step 1: Buy on DEX 1 (cheaper)
        uint256 amountOut1 = _swapOnDEX(dex1, token, path1[path1.length - 1], loanAmount, path1);

        // Step 2: Sell on DEX 2 (more expensive)
        uint256 amountOut2 = _swapOnDEX(dex2, path1[path1.length - 1], token, amountOut1, path2);

        // Calculate profit
        uint256 premium = premiums[0];
        uint256 totalOwed = amounts[0] + premium;
        uint256 profit = amountOut2 > totalOwed ? amountOut2 - totalOwed : 0;

        // Check minimum profit threshold
        uint256 minProfit = (loanAmount * minProfitBps) / 10000;
        if (profit < minProfit) {
            revert InsufficientProfit(profit, minProfit);
        }

        // Repay flash loan
        IERC20(token).safeApprove(aaveLendingPool, totalOwed);
        IERC20(token).safeTransfer(aaveLendingPool, totalOwed);

        // Transfer profit to owner
        uint256 remaining = IERC20(token).balanceOf(address(this));
        if (remaining > 0) {
            IERC20(token).safeTransfer(owner, remaining);
        }

        emit ArbitrageExecuted(token, loanAmount, profit, dex1, dex2);

        return true;
    }

    /**
     * @notice Execute swap on a DEX
     * @param dex DEX router address
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @param path Swap path
     * @return amountOut Output amount
     */
    function _swapOnDEX(
        address dex,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address[] memory path
    ) internal returns (uint256 amountOut) {
        // Approve DEX
        IERC20(tokenIn).safeApprove(dex, amountIn);

        uint256 balanceBefore = IERC20(tokenOut).balanceOf(address(this));

        // Execute swap
        (bool success, ) = dex.call(
            abi.encodeWithSignature(
                "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
                amountIn,
                0, // minAmountOut - would calculate based on expected price
                path,
                address(this),
                block.timestamp + 300
            )
        );

        if (!success) {
            revert ArbitrageFailed("Swap failed");
        }

        uint256 balanceAfter = IERC20(tokenOut).balanceOf(address(this));
        amountOut = balanceAfter - balanceBefore;

        return amountOut;
    }

    /**
     * @notice Calculate expected profit from arbitrage (view function)
     * @param token Token to arbitrage
     * @param amount Flash loan amount
     * @param path1 Path for first DEX
     * @param path2 Path for second DEX
     * @param dex1 First DEX router
     * @param dex2 Second DEX router
     * @return profit Expected profit
     * @return profitable Whether arbitrage is profitable
     */
    function calculateProfit(
        address token,
        uint256 amount,
        address[] calldata path1,
        address[] calldata path2,
        address dex1,
        address dex2
    ) external view returns (uint256 profit, bool profitable) {
        // Get quote from DEX 1 (buy price)
        uint256 amountOut1 = _getQuote(dex1, amount, path1);

        // Get quote from DEX 2 (sell price)
        uint256 amountOut2 = _getQuote(dex2, amountOut1, path2);

        // Calculate premium (Aave flash loan fee ~0.09%)
        uint256 premium = (amount * 9) / 10000;
        uint256 totalOwed = amount + premium;

        profit = amountOut2 > totalOwed ? amountOut2 - totalOwed : 0;
        uint256 minProfit = (amount * minProfitBps) / 10000;
        profitable = profit >= minProfit;

        return (profit, profitable);
    }

    /**
     * @notice Get quote from DEX
     * @param dex DEX router
     * @param amountIn Input amount
     * @param path Swap path
     * @return amountOut Output amount
     */
    function _getQuote(
        address dex,
        uint256 amountIn,
        address[] memory path
    ) internal view returns (uint256 amountOut) {
        try IUniswapV2Router02(dex).getAmountsOut(amountIn, path) returns (
            uint256[] memory amounts
        ) {
            return amounts[amounts.length - 1];
        } catch {
            return 0;
        }
    }

    /**
     * @notice Set minimum profit threshold
     * @param newMinProfitBps New minimum profit in basis points
     */
    function setMinProfitBps(
        uint256 newMinProfitBps
    ) external onlyOwner {
        require(newMinProfitBps <= 1000, "Too high"); // Max 10%
        minProfitBps = newMinProfitBps;
        emit MinProfitBpsUpdated(newMinProfitBps);
    }

    /**
     * @notice Withdraw accumulated profits
     * @param token Token to withdraw
     */
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(owner, balance);
            emit ProfitWithdrawn(token, balance);
        }
    }

    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidToken(newOwner);
        owner = newOwner;
    }
}

// Aave Lending Pool interface
interface IAaveLendingPool {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata modes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

// Uniswap V2 Router interface
interface IUniswapV2Router02 {
    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

