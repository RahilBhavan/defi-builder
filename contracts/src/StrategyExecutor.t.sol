// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {StrategyExecutor} from "./StrategyExecutor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StrategyExecutorTest is Test {
    StrategyExecutor public executor;
    address public admin = address(1);
    address public user = address(2);
    address public mockToken = address(3);
    address public mockRouter = address(4);

    function setUp() public {
        vm.prank(admin);
        executor = new StrategyExecutor();
    }

    function test_CreateStrategy() public {
        bytes32 strategyId = keccak256("test-strategy");
        StrategyExecutor.Operation[] memory operations = new StrategyExecutor.Operation[](1);
        
        operations[0] = StrategyExecutor.Operation({
            opType: StrategyExecutor.OperationType.SWAP,
            target: mockRouter,
            tokenIn: mockToken,
            tokenOut: mockToken,
            amountIn: 1000,
            minAmountOut: 900,
            data: abi.encodeWithSignature("swap()")
        });

        vm.prank(user);
        executor.createStrategy(strategyId, operations);

        StrategyExecutor.Strategy memory strategy = executor.getStrategy(strategyId);
        assertEq(strategy.owner, user);
        assertEq(strategy.operations.length, 1);
        assertTrue(strategy.active);
    }

    function test_RevertWhen_InvalidOperationCount() public {
        bytes32 strategyId = keccak256("test-strategy");
        StrategyExecutor.Operation[] memory operations = new StrategyExecutor.Operation[](0);

        vm.prank(user);
        vm.expectRevert(StrategyExecutor.InvalidOperationCount.selector);
        executor.createStrategy(strategyId, operations);
    }

    function test_RevertWhen_StrategyAlreadyExists() public {
        bytes32 strategyId = keccak256("test-strategy");
        StrategyExecutor.Operation[] memory operations = new StrategyExecutor.Operation[](1);
        
        operations[0] = StrategyExecutor.Operation({
            opType: StrategyExecutor.OperationType.SWAP,
            target: mockRouter,
            tokenIn: mockToken,
            tokenOut: mockToken,
            amountIn: 1000,
            minAmountOut: 900,
            data: abi.encodeWithSignature("swap()")
        });

        vm.prank(user);
        executor.createStrategy(strategyId, operations);

        vm.prank(user);
        vm.expectRevert("Strategy already exists");
        executor.createStrategy(strategyId, operations);
    }

    function test_DeactivateStrategy() public {
        bytes32 strategyId = keccak256("test-strategy");
        StrategyExecutor.Operation[] memory operations = new StrategyExecutor.Operation[](1);
        
        operations[0] = StrategyExecutor.Operation({
            opType: StrategyExecutor.OperationType.SWAP,
            target: mockRouter,
            tokenIn: mockToken,
            tokenOut: mockToken,
            amountIn: 1000,
            minAmountOut: 900,
            data: abi.encodeWithSignature("swap()")
        });

        vm.prank(user);
        executor.createStrategy(strategyId, operations);

        vm.prank(user);
        executor.deactivateStrategy(strategyId);

        StrategyExecutor.Strategy memory strategy = executor.getStrategy(strategyId);
        assertFalse(strategy.active);
    }

    function test_Pause() public {
        vm.prank(admin);
        executor.pause();

        bytes32 strategyId = keccak256("test-strategy");
        StrategyExecutor.Operation[] memory operations = new StrategyExecutor.Operation[](1);
        
        operations[0] = StrategyExecutor.Operation({
            opType: StrategyExecutor.OperationType.SWAP,
            target: mockRouter,
            tokenIn: mockToken,
            tokenOut: mockToken,
            amountIn: 1000,
            minAmountOut: 900,
            data: abi.encodeWithSignature("swap()")
        });

        vm.prank(user);
        vm.expectRevert();
        executor.createStrategy(strategyId, operations);
    }
}

