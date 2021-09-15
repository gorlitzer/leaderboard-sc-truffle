// SPDX-License-Identifier: MIT
import "./Leaderboard.sol";

pragma solidity ^0.8.0;

// This is a mock contract in order to test 'Leaderboard.sol' internal functions
contract LeaderboardTest is Leaderboard {
    constructor(address game_address, address game_wallet)
        Leaderboard(game_address, game_wallet)
    {}

    // check for nonces mapping
    function getNonce(address addr, uint256 nonce) public view returns (bool) {
        return seenNonces[addr][nonce];
    }

    // check for game address validation with ecrecover(), then update nonce against replay attack
    function isGamePublic(
        uint256 score,
        uint256 nonce,
        bytes memory signature
    ) public returns (bool) {
        return _isGame(score, nonce, signature);
    }
}
