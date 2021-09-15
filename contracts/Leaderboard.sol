// SPDX-License-Identifier: MIT
import "./ECDSA.sol";
import "./Ownable.sol";

pragma solidity ^0.8.0;

contract Leaderboard is Ownable {
    using ECDSA for bytes32;

    address private game_address;
    address public game_wallet;
    uint256 leaderboardLength = 3;

    mapping(uint256 => User) public leaderboard;
    mapping(address => mapping(uint256 => bool)) seenNonces;

    event Approval(address signer, address receiver, uint256 score);
    event Withdrawal(
        User firstWinner,
        User secondWinner,
        User thirdWinner,
        uint256 time
    );
    event StartLog(address sender, uint256 value, uint256 time);

    struct User {
        address user;
        uint256 score;
    }

    constructor(address _game_address, address _game_wallet) {
        game_address = _game_address;
        game_wallet = _game_wallet;
    }

    fallback() external payable {
        // send / transfer (forwards 2300 gas to this fallback function)
        emit StartLog(msg.sender, msg.value, block.timestamp);
    }

    receive() external payable {
        emit StartLog(msg.sender, msg.value, block.timestamp);
    }

    function addScore(
        address user,
        uint256 score,
        uint256 nonce,
        bytes memory signature
    ) public payable returns (bool boolean) {
        // required controls
        require(msg.value > 0, "No pay, no play!");
        _isGame(score, nonce, signature);

        // if the score is too low, don't update
        if (leaderboard[leaderboardLength - 1].score >= score) return false;
        // loop through the leaderboard
        for (uint256 i = 0; i < leaderboardLength; i++) {
            // find where to insert the new score
            if (leaderboard[i].score < score) {
                // shift leaderboard
                User memory currentUser = leaderboard[i];
                for (uint256 j = i + 1; j < leaderboardLength + 1; j++) {
                    User memory nextUser = leaderboard[j];
                    leaderboard[j] = currentUser;
                    currentUser = nextUser;
                }
                // insert
                leaderboard[i] = User({user: user, score: score});
                // delete last from list
                delete leaderboard[leaderboardLength];
                return true;
            }
        }
    }

    // withdraw ethers
    function withdraw() public onlyOwner returns (bool success) {
        require(address(this).balance > 0, "Contract balance is 0!");

        uint256 claraReward = (address(this).balance * 40) / 100;
        uint256 firstReward = (address(this).balance * 30) / 100;
        uint256 secondReward = (address(this).balance * 20) / 100;
        uint256 thirdReward = (address(this).balance * 10) / 100;

        payable(game_wallet).transfer(claraReward);
        payable(leaderboard[0].user).transfer(firstReward);
        payable(leaderboard[1].user).transfer(secondReward);
        payable(leaderboard[2].user).transfer(thirdReward);

        emit Withdrawal(
            leaderboard[0],
            leaderboard[1],
            leaderboard[2],
            block.timestamp
        );
        return true;
    }

    // get current contract balance
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // get current game signer address
    function getSigner() public view returns (address) {
        return game_address;
    }

    // internal function recover signature check
    function _isGame(
        uint256 score,
        uint256 nonce,
        bytes memory signature
    ) internal returns (bool isValid) {
        // This recreates the message hash that was signed on the client.
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, score, nonce));
        bytes32 messageHash = hash.toEthSignedMessageHash();
        // Verify that the message's signer belongs to the unity game
        address signer = messageHash.recover(signature);
        require(signer == game_address, "The signature is not valid!");
        require(!seenNonces[msg.sender][nonce], "Ops.. wrong nonce!");
        seenNonces[msg.sender][nonce] = true;
        emit Approval(signer, msg.sender, score);
        return true;
    }

    // internal function percentage calculations
    function _calculatePercentage()
        public
        view
        returns (
            uint256 thirty,
            uint256 twenty,
            uint256 tenth
        )
    {
        uint256 firstReward = (address(this).balance * 30) / 100;
        uint256 secondReward = (address(this).balance * 20) / 100;
        uint256 thirdReward = (address(this).balance * 10) / 100;
        return (firstReward, secondReward, thirdReward);
    }
}
