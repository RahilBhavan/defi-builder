// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PositionManager
 * @notice Manages leveraged positions with risk controls
 * @dev Allows users to open leveraged positions with multiple collateral types
 *      Implements liquidation protection and risk limits
 */
contract PositionManager is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    /// @notice Role for liquidators
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

    /// @notice Position structure
    struct Position {
        address owner;
        address collateralToken;
        address debtToken;
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 leverage; // In basis points (e.g., 20000 = 2x)
        uint256 liquidationThreshold; // In basis points
        uint256 openedAt;
        bool active;
    }

    /// @notice Collateral configuration
    struct CollateralConfig {
        bool enabled;
        uint256 maxLTV; // Maximum loan-to-value in basis points
        uint256 liquidationThreshold; // Liquidation threshold in basis points
        uint256 liquidationBonus; // Bonus for liquidators in basis points
    }

    /// @notice Position ID counter
    uint256 public nextPositionId;

    /// @notice Mapping of position ID to position
    mapping(uint256 => Position) public positions;

    /// @notice Mapping of user to their position IDs
    mapping(address => uint256[]) public userPositions;

    /// @notice Mapping of collateral token to configuration
    mapping(address => CollateralConfig) public collateralConfigs;

    /// @notice Lending protocol address (e.g., Aave)
    address public immutable lendingProtocol;

    /// @notice Minimum leverage (in basis points)
    uint256 public minLeverage = 10000; // 1x

    /// @notice Maximum leverage (in basis points)
    uint256 public maxLeverage = 50000; // 5x

    /// @notice Events
    event PositionOpened(
        uint256 indexed positionId,
        address indexed owner,
        address collateralToken,
        address debtToken,
        uint256 collateralAmount,
        uint256 debtAmount,
        uint256 leverage
    );
    event PositionClosed(
        uint256 indexed positionId,
        address indexed owner,
        uint256 collateralReturned,
        uint256 debtRepaid
    );
    event PositionLiquidated(
        uint256 indexed positionId,
        address indexed liquidator,
        uint256 collateralSeized
    );
    event CollateralAdded(
        uint256 indexed positionId,
        address indexed token,
        uint256 amount
    );
    event DebtRepaid(
        uint256 indexed positionId,
        address indexed token,
        uint256 amount
    );
    event CollateralConfigUpdated(
        address indexed token,
        uint256 maxLTV,
        uint256 liquidationThreshold
    );

    /// @notice Errors
    error PositionNotFound(uint256 positionId);
    error PositionNotActive(uint256 positionId);
    error Unauthorized();
    error InvalidLeverage(uint256 leverage);
    error InsufficientCollateral();
    error PositionNotLiquidatable(uint256 positionId);
    error InvalidCollateral(address token);
    error MaxLTVExceeded(uint256 ltv, uint256 maxLTV);
    error InsufficientDebt(uint256 requested, uint256 available);

    constructor(address _lendingProtocol) {
        lendingProtocol = _lendingProtocol;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LIQUIDATOR_ROLE, msg.sender);
    }

    /**
     * @notice Open a leveraged position
     * @param collateralToken Collateral token address
     * @param debtToken Debt token address
     * @param collateralAmount Amount of collateral to deposit
     * @param leverage Desired leverage (in basis points)
     * @return positionId New position ID
     */
    function openPosition(
        address collateralToken,
        address debtToken,
        uint256 collateralAmount,
        uint256 leverage
    ) external nonReentrant whenNotPaused returns (uint256 positionId) {
        // Validate leverage
        if (leverage < minLeverage || leverage > maxLeverage) {
            revert InvalidLeverage(leverage);
        }

        // Validate collateral
        CollateralConfig memory config = collateralConfigs[collateralToken];
        if (!config.enabled) {
            revert InvalidCollateral(collateralToken);
        }

        // Calculate debt amount
        uint256 debtAmount = (collateralAmount * leverage) / 10000 - collateralAmount;

        // Check LTV
        uint256 ltv = (debtAmount * 10000) / collateralAmount;
        if (ltv > config.maxLTV) {
            revert MaxLTVExceeded(ltv, config.maxLTV);
        }

        // Transfer collateral from user
        IERC20(collateralToken).safeTransferFrom(
            msg.sender,
            address(this),
            collateralAmount
        );

        // Supply collateral to lending protocol
        IERC20(collateralToken).safeApprove(lendingProtocol, collateralAmount);
        // Would call lending protocol supply function here
        // ILendingProtocol(lendingProtocol).supply(collateralToken, collateralAmount);

        // Borrow debt token
        // Would call lending protocol borrow function here
        // ILendingProtocol(lendingProtocol).borrow(debtToken, debtAmount);

        // Create position
        positionId = nextPositionId++;
        positions[positionId] = Position({
            owner: msg.sender,
            collateralToken: collateralToken,
            debtToken: debtToken,
            collateralAmount: collateralAmount,
            debtAmount: debtAmount,
            leverage: leverage,
            liquidationThreshold: config.liquidationThreshold,
            openedAt: block.timestamp,
            active: true
        });

        userPositions[msg.sender].push(positionId);

        emit PositionOpened(
            positionId,
            msg.sender,
            collateralToken,
            debtToken,
            collateralAmount,
            debtAmount,
            leverage
        );

        return positionId;
    }

    /**
     * @notice Close a position
     * @param positionId Position to close
     */
    function closePosition(
        uint256 positionId
    ) external nonReentrant whenNotPaused {
        Position storage position = positions[positionId];
        if (position.owner == address(0)) revert PositionNotFound(positionId);
        if (!position.active) revert PositionNotActive(positionId);
        if (position.owner != msg.sender) revert Unauthorized();

        // Repay debt
        IERC20(position.debtToken).safeTransferFrom(
            msg.sender,
            address(this),
            position.debtAmount
        );
        IERC20(position.debtToken).safeApprove(
            lendingProtocol,
            position.debtAmount
        );
        // Would call lending protocol repay function here

        // Withdraw collateral
        // Would call lending protocol withdraw function here
        uint256 collateralReturned = position.collateralAmount;

        // Transfer collateral to user
        IERC20(position.collateralToken).safeTransfer(
            msg.sender,
            collateralReturned
        );

        // Mark position as closed
        position.active = false;

        emit PositionClosed(
            positionId,
            msg.sender,
            collateralReturned,
            position.debtAmount
        );
    }

    /**
     * @notice Add collateral to a position
     * @param positionId Position ID
     * @param amount Amount of collateral to add
     */
    function addCollateral(
        uint256 positionId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        Position storage position = positions[positionId];
        if (position.owner == address(0)) revert PositionNotFound(positionId);
        if (!position.active) revert PositionNotActive(positionId);
        if (position.owner != msg.sender) revert Unauthorized();

        // Transfer collateral
        IERC20(position.collateralToken).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        // Supply to lending protocol
        IERC20(position.collateralToken).safeApprove(
            lendingProtocol,
            amount
        );
        // Would call lending protocol supply function here

        position.collateralAmount += amount;

        emit CollateralAdded(positionId, position.collateralToken, amount);
    }

    /**
     * @notice Repay debt on a position
     * @param positionId Position ID
     * @param amount Amount of debt to repay
     */
    function repayDebt(
        uint256 positionId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        Position storage position = positions[positionId];
        if (position.owner == address(0)) revert PositionNotFound(positionId);
        if (!position.active) revert PositionNotActive(positionId);
        if (position.owner != msg.sender) revert Unauthorized();

        if (amount > position.debtAmount) {
            revert InsufficientDebt(amount, position.debtAmount);
        }

        // Transfer debt token
        IERC20(position.debtToken).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        // Repay to lending protocol
        IERC20(position.debtToken).safeApprove(lendingProtocol, amount);
        // Would call lending protocol repay function here

        position.debtAmount -= amount;

        emit DebtRepaid(positionId, position.debtToken, amount);
    }

    /**
     * @notice Liquidate a position
     * @param positionId Position to liquidate
     */
    function liquidatePosition(
        uint256 positionId
    ) external nonReentrant onlyRole(LIQUIDATOR_ROLE) {
        Position storage position = positions[positionId];
        if (position.owner == address(0)) revert PositionNotFound(positionId);
        if (!position.active) revert PositionNotActive(positionId);

        // Check if position is liquidatable
        if (!_isLiquidatable(positionId)) {
            revert PositionNotLiquidatable(positionId);
        }

        // Calculate liquidation bonus
        CollateralConfig memory config = collateralConfigs[
            position.collateralToken
        ];
        uint256 bonus = (position.collateralAmount *
            config.liquidationBonus) / 10000;
        uint256 collateralSeized = position.collateralAmount + bonus;

        // Repay debt (liquidator pays)
        IERC20(position.debtToken).safeTransferFrom(
            msg.sender,
            address(this),
            position.debtAmount
        );
        IERC20(position.debtToken).safeApprove(
            lendingProtocol,
            position.debtAmount
        );
        // Would call lending protocol repay function here

        // Withdraw and transfer collateral to liquidator
        // Would call lending protocol withdraw function here
        IERC20(position.collateralToken).safeTransfer(
            msg.sender,
            collateralSeized
        );

        // Mark position as closed
        position.active = false;

        emit PositionLiquidated(positionId, msg.sender, collateralSeized);
    }

    /**
     * @notice Check if position is liquidatable
     * @param positionId Position ID
     * @return liquidatable Whether position can be liquidated
     */
    function _isLiquidatable(
        uint256 positionId
    ) internal view returns (bool liquidatable) {
        Position memory position = positions[positionId];
        if (!position.active) return false;

        // Calculate current LTV
        // In production, would get current prices from oracle
        uint256 currentLTV = (position.debtAmount * 10000) /
            position.collateralAmount;

        // Check if LTV exceeds liquidation threshold
        return currentLTV >= position.liquidationThreshold;
    }

    /**
     * @notice Configure collateral token
     * @param token Collateral token address
     * @param maxLTV Maximum loan-to-value
     * @param liquidationThreshold Liquidation threshold
     * @param liquidationBonus Liquidation bonus for liquidators
     */
    function configureCollateral(
        address token,
        uint256 maxLTV,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(maxLTV < liquidationThreshold, "Invalid thresholds");
        require(liquidationBonus <= 1000, "Bonus too high"); // Max 10%

        collateralConfigs[token] = CollateralConfig({
            enabled: true,
            maxLTV: maxLTV,
            liquidationThreshold: liquidationThreshold,
            liquidationBonus: liquidationBonus
        });

        emit CollateralConfigUpdated(token, maxLTV, liquidationThreshold);
    }

    /**
     * @notice Get position details
     * @param positionId Position ID
     * @return Position details
     */
    function getPosition(
        uint256 positionId
    ) external view returns (Position memory) {
        return positions[positionId];
    }

    /**
     * @notice Get user positions
     * @param user User address
     * @return Array of position IDs
     */
    function getUserPositions(
        address user
    ) external view returns (uint256[] memory) {
        return userPositions[user];
    }

    /**
     * @notice Set leverage limits
     * @param _minLeverage Minimum leverage
     * @param _maxLeverage Maximum leverage
     */
    function setLeverageLimits(
        uint256 _minLeverage,
        uint256 _maxLeverage
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_minLeverage >= 10000, "Min leverage too low");
        require(_maxLeverage <= 100000, "Max leverage too high");
        require(_minLeverage < _maxLeverage, "Invalid range");

        minLeverage = _minLeverage;
        maxLeverage = _maxLeverage;
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}

