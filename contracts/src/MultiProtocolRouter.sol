// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MultiProtocolRouter
 * @notice Aggregates swaps across multiple DEXs to find best prices
 * @dev Routes swaps through Uniswap V2, V3, Curve, and Balancer
 *      to optimize for best execution price
 */
contract MultiProtocolRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Uniswap V2 Router address
    address public immutable uniswapV2Router;
    
    /// @notice Uniswap V3 Router address
    address public immutable uniswapV3Router;
    
    /// @notice Curve Registry address
    address public immutable curveRegistry;
    
    /// @notice Balancer Vault address
    address public immutable balancerVault;

    /// @notice Swap executed event
    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address dex,
        uint256 routeIndex
    );

    /// @notice Best route found event
    event BestRouteFound(
        address indexed tokenIn,
        address indexed tokenOut,
        address bestDex,
        uint256 bestAmountOut
    );

    error NoLiquidityFound();
    error SlippageExceeded(uint256 expected, uint256 actual);
    error InvalidPath();
    error InsufficientInputAmount();

    struct SwapRoute {
        address dex;
        address[] path;
        uint256 expectedAmountOut;
    }

    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address[] path; // Optional: specific path to use
        bool useBestRoute; // If true, finds best route across all DEXs
    }

    constructor(
        address _uniswapV2Router,
        address _uniswapV3Router,
        address _curveRegistry,
        address _balancerVault
    ) {
        uniswapV2Router = _uniswapV2Router;
        uniswapV3Router = _uniswapV3Router;
        curveRegistry = _curveRegistry;
        balancerVault = _balancerVault;
    }

    /**
     * @notice Execute a swap with automatic best route finding
     * @param params Swap parameters
     * @return amountOut Amount of output token received
     */
    function swap(
        SwapParams memory params
    ) external nonReentrant returns (uint256 amountOut) {
        if (params.amountIn == 0) {
            revert InsufficientInputAmount();
        }

        // Transfer tokens from user
        IERC20(params.tokenIn).safeTransferFrom(
            msg.sender,
            address(this),
            params.amountIn
        );

        if (params.useBestRoute) {
            // Find best route across all DEXs
            SwapRoute memory bestRoute = _findBestRoute(
                params.tokenIn,
                params.tokenOut,
                params.amountIn
            );

            if (bestRoute.expectedAmountOut == 0) {
                revert NoLiquidityFound();
            }

            emit BestRouteFound(
                params.tokenIn,
                params.tokenOut,
                bestRoute.dex,
                bestRoute.expectedAmountOut
            );

            // Execute swap on best DEX
            amountOut = _executeSwap(
                bestRoute.dex,
                params.tokenIn,
                params.tokenOut,
                params.amountIn,
                bestRoute.path
            );
        } else {
            // Use provided path or direct swap
            address[] memory path = params.path.length > 0
                ? params.path
                : _getDirectPath(params.tokenIn, params.tokenOut);

            // Try Uniswap V2 first (most common)
            amountOut = _executeSwap(
                uniswapV2Router,
                params.tokenIn,
                params.tokenOut,
                params.amountIn,
                path
            );
        }

        // Slippage check
        if (amountOut < params.minAmountOut) {
            revert SlippageExceeded(params.minAmountOut, amountOut);
        }

        // Transfer output tokens to user
        IERC20(params.tokenOut).safeTransfer(msg.sender, amountOut);

        return amountOut;
    }

    /**
     * @notice Find the best route across all supported DEXs
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @return bestRoute Best route found
     */
    function _findBestRoute(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (SwapRoute memory bestRoute) {
        uint256 bestAmountOut = 0;
        address[] memory directPath = _getDirectPath(tokenIn, tokenOut);

        // Check Uniswap V2
        uint256 uniswapV2Out = _getQuote(
            uniswapV2Router,
            tokenIn,
            tokenOut,
            amountIn,
            directPath
        );
        if (uniswapV2Out > bestAmountOut) {
            bestAmountOut = uniswapV2Out;
            bestRoute = SwapRoute({
                dex: uniswapV2Router,
                path: directPath,
                expectedAmountOut: uniswapV2Out
            });
        }

        // Check Uniswap V3 (if different router)
        if (uniswapV3Router != uniswapV2Router) {
            uint256 uniswapV3Out = _getQuote(
                uniswapV3Router,
                tokenIn,
                tokenOut,
                amountIn,
                directPath
            );
            if (uniswapV3Out > bestAmountOut) {
                bestAmountOut = uniswapV3Out;
                bestRoute = SwapRoute({
                    dex: uniswapV3Router,
                    path: directPath,
                    expectedAmountOut: uniswapV3Out
                });
            }
        }

        // Check Curve (for stablecoins)
        if (_isStablecoinPair(tokenIn, tokenOut)) {
            uint256 curveOut = _getCurveQuote(
                tokenIn,
                tokenOut,
                amountIn
            );
            if (curveOut > bestAmountOut) {
                bestAmountOut = curveOut;
                bestRoute = SwapRoute({
                    dex: curveRegistry,
                    path: directPath,
                    expectedAmountOut: curveOut
                });
            }
        }

        // Check Balancer
        uint256 balancerOut = _getBalancerQuote(
            tokenIn,
            tokenOut,
            amountIn
        );
        if (balancerOut > bestAmountOut) {
            bestAmountOut = balancerOut;
            bestRoute = SwapRoute({
                dex: balancerVault,
                path: directPath,
                expectedAmountOut: balancerOut
            });
        }

        return bestRoute;
    }

    /**
     * @notice Execute swap on a specific DEX
     * @param dex DEX router address
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @param path Swap path
     * @return amountOut Output amount
     */
    function _executeSwap(
        address dex,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address[] memory path
    ) internal returns (uint256 amountOut) {
        uint256 balanceBefore = IERC20(tokenOut).balanceOf(address(this));

        // Approve router
        IERC20(tokenIn).safeApprove(dex, amountIn);

        // Execute swap based on DEX type
        if (dex == uniswapV2Router) {
            // Uniswap V2 swap
            (bool success, ) = dex.call(
                abi.encodeWithSignature(
                    "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
                    amountIn,
                    0, // minAmountOut will be checked after
                    path,
                    address(this),
                    block.timestamp + 300
                )
            );
            require(success, "Uniswap V2 swap failed");
        } else if (dex == uniswapV3Router) {
            // Uniswap V3 swap (simplified - would need proper V3 interface)
            // This is a placeholder - implement proper V3 swapExactInputSingle
            revert("Uniswap V3 not fully implemented");
        } else if (dex == curveRegistry) {
            // Curve swap (simplified - would need proper Curve interface)
            revert("Curve swap not fully implemented");
        } else if (dex == balancerVault) {
            // Balancer swap (simplified - would need proper Balancer interface)
            revert("Balancer swap not fully implemented");
        }

        uint256 balanceAfter = IERC20(tokenOut).balanceOf(address(this));
        amountOut = balanceAfter - balanceBefore;

        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut, dex, 0);

        return amountOut;
    }

    /**
     * @notice Get quote from a DEX (view function)
     * @param dex DEX router address
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @param path Swap path
     * @return amountOut Expected output amount
     */
    function _getQuote(
        address dex,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address[] memory path
    ) internal view returns (uint256 amountOut) {
        // This would call getAmountsOut on Uniswap V2
        // Simplified for demonstration
        try IUniswapV2Router02(dex).getAmountsOut(amountIn, path) returns (
            uint256[] memory amounts
        ) {
            return amounts[amounts.length - 1];
        } catch {
            return 0;
        }
    }

    /**
     * @notice Get Curve quote (placeholder)
     */
    function _getCurveQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256) {
        // Would implement Curve-specific quote logic
        return 0;
    }

    /**
     * @notice Get Balancer quote (placeholder)
     */
    function _getBalancerQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256) {
        // Would implement Balancer-specific quote logic
        return 0;
    }

    /**
     * @notice Check if pair is stablecoin pair (for Curve optimization)
     */
    function _isStablecoinPair(
        address tokenIn,
        address tokenOut
    ) internal pure returns (bool) {
        // Simplified - would check against known stablecoin addresses
        return false;
    }

    /**
     * @notice Get direct path between two tokens
     */
    function _getDirectPath(
        address tokenIn,
        address tokenOut
    ) internal pure returns (address[] memory) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        return path;
    }
}

// Minimal Uniswap V2 Router interface
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

