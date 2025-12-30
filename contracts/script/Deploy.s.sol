// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {StrategyExecutor} from "../src/StrategyExecutor.sol";
import {MultiProtocolRouter} from "../src/MultiProtocolRouter.sol";
import {YieldOptimizerVault} from "../src/YieldOptimizerVault.sol";
import {FlashLoanArbitrage} from "../src/FlashLoanArbitrage.sol";
import {PositionManager} from "../src/PositionManager.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deploying contracts from:", deployer);

        // Deploy StrategyExecutor
        StrategyExecutor executor = new StrategyExecutor();
        console.log("StrategyExecutor deployed at:", address(executor));

        // Deploy MultiProtocolRouter
        // Note: Replace with actual addresses for your network
        address uniswapV2Router = vm.envAddress("UNISWAP_V2_ROUTER");
        address uniswapV3Router = vm.envAddress("UNISWAP_V3_ROUTER");
        address curveRegistry = vm.envAddress("CURVE_REGISTRY");
        address balancerVault = vm.envAddress("BALANCER_VAULT");

        MultiProtocolRouter router = new MultiProtocolRouter(
            uniswapV2Router,
            uniswapV3Router,
            curveRegistry,
            balancerVault
        );
        console.log("MultiProtocolRouter deployed at:", address(router));

        // Deploy YieldOptimizerVault
        address asset = vm.envAddress("VAULT_ASSET"); // e.g., USDC
        YieldOptimizerVault vault = new YieldOptimizerVault(
            asset,
            "DeFi Builder Yield Vault",
            "DBYV",
            deployer
        );
        console.log("YieldOptimizerVault deployed at:", address(vault));

        // Deploy FlashLoanArbitrage
        address aaveLendingPool = vm.envAddress("AAVE_LENDING_POOL");
        address sushiswapRouter = vm.envAddress("SUSHISWAP_ROUTER");

        FlashLoanArbitrage arbitrage = new FlashLoanArbitrage(
            aaveLendingPool,
            uniswapV2Router,
            sushiswapRouter
        );
        console.log("FlashLoanArbitrage deployed at:", address(arbitrage));

        // Deploy PositionManager
        address lendingProtocol = vm.envAddress("LENDING_PROTOCOL"); // e.g., Aave
        PositionManager positionManager = new PositionManager(lendingProtocol);
        console.log("PositionManager deployed at:", address(positionManager));

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("StrategyExecutor:", address(executor));
        console.log("MultiProtocolRouter:", address(router));
        console.log("YieldOptimizerVault:", address(vault));
        console.log("FlashLoanArbitrage:", address(arbitrage));
        console.log("PositionManager:", address(positionManager));
    }
}

