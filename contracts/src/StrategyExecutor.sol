// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title StrategyExecutor
 * @notice Executes user-defined DeFi strategies on-chain
 * @dev This contract allows users to execute multi-step DeFi strategies
 *      built in the DeFi Builder UI. Supports batching operations for gas efficiency.
 */
contract StrategyExecutor is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    /// @notice Role for authorized strategy executors
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    /// @notice Maximum number of operations per strategy
    uint256 public constant MAX_OPERATIONS = 50;

    /// @notice Strategy execution event
    event StrategyExecuted(
        address indexed user,
        bytes32 indexed strategyId,
        uint256 operationCount,
        bool success,
        string reason
    );

    /// @notice Operation executed event
    event OperationExecuted(
        bytes32 indexed strategyId,
        uint256 indexed operationIndex,
        OperationType operationType,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    /// @notice Strategy execution error
    error StrategyExecutionFailed(uint256 operationIndex, string reason);
    error InvalidOperationCount(uint256 count);
    error InsufficientBalance(address token, uint256 required, uint256 available);
    error InvalidSlippage(uint256 minAmountOut, uint256 actualAmountOut);

    /// @notice Operation types supported by the executor
    enum OperationType {
        SWAP,
        SUPPLY,
        BORROW,
        REPAY,
        WITHDRAW,
        STAKE,
        UNSTAKE
    }

    /// @notice Single operation in a strategy
    struct Operation {
        OperationType opType;
        address target; // Protocol/router address
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut; // For slippage protection
        bytes data; // Encoded function call data
    }

    /// @notice Strategy structure
    struct Strategy {
        bytes32 id;
        address owner;
        Operation[] operations;
        uint256 createdAt;
        bool active;
    }

    /// @notice Mapping of strategy ID to strategy
    mapping(bytes32 => Strategy) public strategies;

    /// @notice Mapping of user to their strategies
    mapping(address => bytes32[]) public userStrategies;

    /// @notice Total strategies created
    uint256 public totalStrategies;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
    }

    /**
     * @notice Create a new strategy
     * @param strategyId Unique identifier for the strategy
     * @param operations Array of operations to execute
     */
    function createStrategy(
        bytes32 strategyId,
        Operation[] calldata operations
    ) external whenNotPaused {
        if (operations.length == 0 || operations.length > MAX_OPERATIONS) {
            revert InvalidOperationCount(operations.length);
        }

        Strategy storage strategy = strategies[strategyId];
        require(strategy.id == bytes32(0), "Strategy already exists");

        strategy.id = strategyId;
        strategy.owner = msg.sender;
        strategy.createdAt = block.timestamp;
        strategy.active = true;

        // Copy operations
        for (uint256 i = 0; i < operations.length; i++) {
            strategy.operations.push(operations[i]);
        }

        userStrategies[msg.sender].push(strategyId);
        totalStrategies++;
    }

    /**
     * @notice Execute a strategy
     * @param strategyId The strategy to execute
     * @dev Executes all operations in sequence with proper error handling
     */
    function executeStrategy(
        bytes32 strategyId
    ) external nonReentrant whenNotPaused {
        Strategy storage strategy = strategies[strategyId];
        require(strategy.active, "Strategy not active");
        require(strategy.owner == msg.sender, "Not strategy owner");

        bool success = true;
        string memory reason = "";

        // Execute each operation
        for (uint256 i = 0; i < strategy.operations.length; i++) {
            Operation memory op = strategy.operations[i];

            try this._executeOperation(strategyId, i, op) returns (
                uint256 amountOut
            ) {
                emit OperationExecuted(
                    strategyId,
                    i,
                    op.opType,
                    op.tokenIn,
                    op.tokenOut,
                    op.amountIn,
                    amountOut
                );
            } catch Error(string memory err) {
                success = false;
                reason = err;
                emit StrategyExecuted(
                    msg.sender,
                    strategyId,
                    i,
                    false,
                    reason
                );
                revert StrategyExecutionFailed(i, reason);
            } catch (bytes memory lowLevelData) {
                success = false;
                reason = "Low-level execution failed";
                emit StrategyExecuted(
                    msg.sender,
                    strategyId,
                    i,
                    false,
                    reason
                );
                revert StrategyExecutionFailed(i, reason);
            }
        }

        emit StrategyExecuted(
            msg.sender,
            strategyId,
            strategy.operations.length,
            success,
            reason
        );
    }

    /**
     * @notice Execute a single operation (internal)
     * @param strategyId Strategy ID for event emission
     * @param operationIndex Index of operation for event emission
     * @param op Operation to execute
     * @return amountOut Amount of output token received
     */
    function _executeOperation(
        bytes32 strategyId,
        uint256 operationIndex,
        Operation memory op
    ) external returns (uint256 amountOut) {
        require(msg.sender == address(this), "Internal call only");

        // Check balance
        if (op.tokenIn != address(0)) {
            uint256 balance = IERC20(op.tokenIn).balanceOf(msg.sender);
            if (balance < op.amountIn) {
                revert InsufficientBalance(op.tokenIn, op.amountIn, balance);
            }
        }

        // Approve token if needed
        if (op.tokenIn != address(0) && op.target != address(0)) {
            IERC20(op.tokenIn).safeApprove(op.target, op.amountIn);
        }

        // Execute operation
        (bool success, bytes memory returnData) = op.target.call(op.data);

        if (!success) {
            if (returnData.length > 0) {
                assembly {
                    let returndata_size := mload(returnData)
                    revert(add(32, returnData), returndata_size)
                }
            } else {
                revert("Operation execution failed");
            }
        }

        // Get output amount
        if (op.tokenOut != address(0)) {
            amountOut = IERC20(op.tokenOut).balanceOf(msg.sender);
        } else {
            amountOut = address(msg.sender).balance;
        }

        // Slippage check
        if (op.minAmountOut > 0 && amountOut < op.minAmountOut) {
            revert InvalidSlippage(op.minAmountOut, amountOut);
        }

        return amountOut;
    }

    /**
     * @notice Get strategy details
     * @param strategyId Strategy ID
     * @return Strategy details
     */
    function getStrategy(
        bytes32 strategyId
    ) external view returns (Strategy memory) {
        return strategies[strategyId];
    }

    /**
     * @notice Get user's strategies
     * @param user User address
     * @return Array of strategy IDs
     */
    function getUserStrategies(
        address user
    ) external view returns (bytes32[] memory) {
        return userStrategies[user];
    }

    /**
     * @notice Deactivate a strategy
     * @param strategyId Strategy to deactivate
     */
    function deactivateStrategy(bytes32 strategyId) external {
        Strategy storage strategy = strategies[strategyId];
        require(strategy.owner == msg.sender, "Not strategy owner");
        strategy.active = false;
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}

