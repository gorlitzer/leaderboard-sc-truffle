# Leaderboard smart contract - Project made with TruffleJS

### Repository structure

This truffle project includes the **Leaderboard** smart contract implementation as well as **ECDSA** helper [library](https://docs.openzeppelin.com/contracts/2.x/api/cryptography#ECDSA-recover-bytes32-bytes-) (in order to avoid [ecrecover() issues](https://docs.soliditylang.org/en/v0.8.7/units-and-global-variables.html#mathematical-and-cryptographic-functions)).

In order to run the project locally *node.js* and *npm* are required.

Install the *truffle suite* and *ganache-cli* with:

```
npm install -g truffle 
npm install -g ganache-cli
```

Start your local blockchain with `ganache-cli`, this will output 10 created accounts. Then, in a new terminal window:

```
git clone https://path_to_our_repo
cd name_repository
npm install 
truffle compile 
truffle migrate 
```

Run all truffle tests with `truffle test`
