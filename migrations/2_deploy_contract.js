const Leaderboard = artifacts.require("Leaderboard");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(Leaderboard, '0x96C7BD6e420C712775735B111AA2EE11Cb89D9d6', accounts[9], {from: accounts[1]});
};
