const Leaderboard = artifacts.require("Leaderboard");
const LeaderboardTest = artifacts.require("LeaderboardTest");

const helpers = require("../helpers/web3.helpers");
const truffleAssert = require("truffle-assertions");

describe("📄 Leaderboard contract", () => {
  let accounts, signer_address, wallet_address, contract_owner;
  let BN = web3.utils.BN; // big number utils
  let player, nonce, score;

  before(async () => {
    accounts = await web3.eth.getAccounts();
    await helpers.createSigner(); // Create Signer account

    signer_address = web3.eth.accounts.wallet[0].address;
    signer_private_key = web3.eth.accounts.wallet[0].privateKey;

    wallet_address = accounts[9];
    contract_owner = accounts[7];

    player = accounts[Math.floor(Math.random() * (4 + 1))]; // get random player between 0-4
    player = web3.utils.toChecksumAddress(player);
    score = Math.floor(Math.random() * (500 - 100 + 1) + 100); // Get Random score between 100-500
  });

  describe("📍 Deployment", () => {
    it("Should deploy with right 'Signer' assignment", async () => {
      const leaderboard = await Leaderboard.new(signer_address, wallet_address);
      assert.equal(await leaderboard.getSigner.call(), signer_address);

      const leaderboard2 = await Leaderboard.new(
        signer_address,
        wallet_address
      );
      assert.notEqual(await leaderboard2.getSigner.call(), accounts[0]);
    });
    it("Should deploy with right 'Wallet' assignment", async () => {
      const leaderboard = await Leaderboard.new(signer_address, wallet_address);
      assert.equal(await leaderboard.game_wallet.call(), wallet_address);

      const leaderboard2 = await Leaderboard.new(
        signer_address,
        wallet_address
      );
      assert.notEqual(await leaderboard2.game_wallet.call(), accounts[0]);
    });
    it("Initial contract's balance equals 0", async () => {
      const leaderboard = await Leaderboard.new(signer_address, wallet_address);
      let balance = await leaderboard.getBalance.call();
      assert.equal(balance, 0);
    });
    it("Should call fallback function when receive plain ethers", async () => {
      const leaderboard = await Leaderboard.new(signer_address, wallet_address);

      web3.eth.sendTransaction({
        to: leaderboard.address,
        from: accounts[7],
        value: web3.utils.toWei("2", "ether"),
      });

      balanceBN = await leaderboard.getBalance.call();
      let balance = new BN(balanceBN).toString();
      balance = web3.utils.fromWei(balance, "ether");

      assert.equal(balance, "2");
    });
  });

  describe("📍 Validation recipe process", () => {
    before(async () => {
      await helpers.createFakeSigner(); // Create FAKE Signer account - will revert
    });

    it("Should validate game address signed recipe", async () => {
      const leaderboardTest = await LeaderboardTest.new(
        signer_address,
        wallet_address
      );
      nonce = await web3.eth.getTransactionCount(player); // Update nonce

      let signature = await helpers.signGameRecipe(player, score, nonce); // Create signature hash
      let checkIsGame = await leaderboardTest.isGamePublic(
        score,
        nonce,
        signature,
        { from: player }
      );
      assert.equal(checkIsGame.logs[0].args.signer, signer_address);
    });

    it("Should revert if other address signed recipe", async () => {
      const leaderboardTest = await LeaderboardTest.new(
        signer_address,
        wallet_address
      );
      nonce = await web3.eth.getTransactionCount(player); // Update nonce

      let signature = await helpers.fakeSignGameRecipe(player, score, nonce);
      await truffleAssert.reverts(
        leaderboardTest.isGamePublic(score, nonce, signature, {
          from: player,
        }),
        "The signature is not valid!"
      );
    });

    it("Should send recipe from player address", async () => {
      const leaderboardTest = await LeaderboardTest.new(
        signer_address,
        wallet_address
      );
      nonce = await web3.eth.getTransactionCount(player); // Update nonce

      let signature = await helpers.signGameRecipe(player, score, nonce); // Create signature hash
      let checkIsGame = await leaderboardTest.isGamePublic(
        score,
        nonce,
        signature,
        { from: player }
      );
      let from = web3.utils.toChecksumAddress(checkIsGame.receipt.from);
      assert.equal(from, player);
    });

    it("Should send recipe with correct player score", async () => {
      const leaderboardTest = await LeaderboardTest.new(
        signer_address,
        wallet_address
      );
      nonce = await web3.eth.getTransactionCount(player); // Update nonce

      let signature = await helpers.signGameRecipe(player, score, nonce); // Create signature hash
      let checkIsGame = await leaderboardTest.isGamePublic(
        score,
        nonce,
        signature,
        { from: player }
      );
      let currentScore = new BN(checkIsGame.logs[0].args.score).toString();
      assert.equal(score, currentScore);
    });

    it("Should send recipe with correct game address nonce", async () => {
      const leaderboardTest = await LeaderboardTest.new(
        signer_address,
        wallet_address
      );
      nonce = await web3.eth.getTransactionCount(player); // Update nonce
      let signature = await helpers.signGameRecipe(player, score, nonce); // Create signature hash
      await leaderboardTest.isGamePublic(score, nonce, signature, {
        from: player,
      });

      let checkNonce = await leaderboardTest.getNonce(player, nonce); // check
      assert.equal(checkNonce, true);
    });

    it("Should revert if the msg.signer's nonce has been already seen", async () => {
      const leaderboardTest = await LeaderboardTest.new(
        signer_address,
        wallet_address
      );
      nonce = await web3.eth.getTransactionCount(player); // Update nonce

      let signature = await helpers.signGameRecipe(player, score, nonce);
      leaderboardTest.isGamePublic(score, nonce, signature, {
        from: player, // first transaction to register nonce and get new one
      }),
        (nonce = await web3.eth.getTransactionCount(player)); // Update nonce
      await truffleAssert.reverts(
        leaderboardTest.isGamePublic(score, nonce, signature, {
          from: player, // second transaction to see if reverts
        }),
        "Ops.. wrong nonce!"
      );
    });
  });

  describe("📍 Add score to leaderboard", () => {
    it("Should update leaderboard with correct score", async () => {
      const leaderboard = await Leaderboard.new(signer_address, wallet_address);
      nonce = await web3.eth.getTransactionCount(player); // Update nonce
      let signature = await helpers.signGameRecipe(player, score, nonce); // Create signature hash

      await leaderboard.addScore(player, score, nonce, signature, {
        from: player,
        value: web3.utils.toWei("1", "ether"),
      });
      user = await leaderboard.leaderboard(0);
      let BNscore = new BN(user.score).toString();
      assert.equal(BNscore, score);
    });

    it("Should update leaderboard with correct address", async () => {
      const leaderboard = await Leaderboard.new(signer_address, wallet_address);
      nonce = await web3.eth.getTransactionCount(player); // Update nonce
      let signature = await helpers.signGameRecipe(player, score, nonce); // Create signature hash

      await leaderboard.addScore(player, score, nonce, signature, {
        from: player,
        value: web3.utils.toWei("1", "ether"),
      });
      user = await leaderboard.leaderboard(0);
      assert.equal(user.user, player);
    });

    it("Should revert if msg.value <= 0", async () => {
      const leaderboard = await Leaderboard.new(signer_address, wallet_address);
      nonce = await web3.eth.getTransactionCount(player); // Update nonce
      let signature = await helpers.signGameRecipe(player, score, nonce);

      await truffleAssert.reverts(
        leaderboard.addScore(player, score, nonce, signature, {
          from: player,
          value: web3.utils.toWei("0", "ether"),
        }),
        "No pay, no play!"
      );
    });

    it("Should update contract's ether balance", async () => {
      const leaderboard = await Leaderboard.new(signer_address, wallet_address);
      nonce = await web3.eth.getTransactionCount(player); // Update nonce
      let signature = await helpers.signGameRecipe(player, score, nonce); // Create signature hash
      let random = Math.floor(Math.random() * (6 - 2 + 1) + 2); // random value between 6-2

      await leaderboard.addScore(player, score, nonce, signature, {
        from: player,
        value: web3.utils.toWei(random.toString(), "ether"),
      });

      balanceBN = await leaderboard.getBalance.call();
      let balance = new BN(balanceBN).toString();
      balance = web3.utils.fromWei(balance, "ether");
      assert.equal(balance, random);
    });
  });

  describe("📍 Leaderboard update flow management", () => {
    let leaderboard;
    it("Should insert player 1 in leaderboard", async () => {
      leaderboard = await Leaderboard.new(signer_address, wallet_address, {
        from: contract_owner,
      }); // get deployed contract instance

      let currentUser = { user: accounts[1], score: 100 };

      nonce = await web3.eth.getTransactionCount(currentUser.user); // Update nonce
      let signature = await helpers.signGameRecipe(
        currentUser.user,
        currentUser.score,
        nonce
      ); // Create signature hash

      await leaderboard.addScore(
        currentUser.user,
        currentUser.score,
        nonce,
        signature,
        {
          from: currentUser.user,
          value: web3.utils.toWei("1", "ether"),
        }
      );

      let leader = await leaderboard.leaderboard(0);
      assert.equal(leader.user, currentUser.user);

      let balance = await leaderboard.getBalance.call();
      balance = new BN(balance).toString();

      assert.equal(balance, web3.utils.toWei("1", "ether"));
    });

    it("Should insert player 2 in leaderboard and shift positions", async () => {
      let currentUser = { user: accounts[2], score: 200 };

      nonce = await web3.eth.getTransactionCount(currentUser.user); // Update nonce
      let signature = await helpers.signGameRecipe(
        currentUser.user,
        currentUser.score,
        nonce
      ); // Create signature hash

      await leaderboard.addScore(
        currentUser.user,
        currentUser.score,
        nonce,
        signature,
        {
          from: currentUser.user,
          value: web3.utils.toWei("1", "ether"),
        }
      );

      let leader = await leaderboard.leaderboard(0); // check leader
      assert.equal(leader.user, currentUser.user);

      let second = await leaderboard.leaderboard(1); // check second classified
      assert.equal(second.user, accounts[1]);

      //assert.equal(leader.user, currentUser.user);

      let balance = await leaderboard.getBalance.call();
      balance = new BN(balance).toString();

      assert.equal(balance, web3.utils.toWei("2", "ether"));
    });

    it("Should insert player 3 in leaderboard and shift positions", async () => {
      let currentUser = { user: accounts[3], score: 300 };

      nonce = await web3.eth.getTransactionCount(currentUser.user); // Update nonce
      let signature = await helpers.signGameRecipe(
        currentUser.user,
        currentUser.score,
        nonce
      ); // Create signature hash

      await leaderboard.addScore(
        currentUser.user,
        currentUser.score,
        nonce,
        signature,
        {
          from: currentUser.user,
          value: web3.utils.toWei("1", "ether"),
        }
      );

      let leader = await leaderboard.leaderboard(0); // check leader
      assert.equal(leader.user, currentUser.user);

      let second = await leaderboard.leaderboard(1); // check second classified
      assert.equal(second.user, accounts[2]);

      let third = await leaderboard.leaderboard(2); // check third classified
      assert.equal(third.user, accounts[1]);

      let balance = await leaderboard.getBalance.call();
      balance = new BN(balance).toString();

      assert.equal(balance, web3.utils.toWei("3", "ether"));
    });

    it("Should insert player 4 in leaderboard and shift positions", async () => {
      let currentUser = { user: accounts[4], score: 250 };

      nonce = await web3.eth.getTransactionCount(currentUser.user); // Update nonce
      let signature = await helpers.signGameRecipe(
        currentUser.user,
        currentUser.score,
        nonce
      ); // Create signature hash

      await leaderboard.addScore(
        currentUser.user,
        currentUser.score,
        nonce,
        signature,
        {
          from: currentUser.user,
          value: web3.utils.toWei("1", "ether"),
        }
      );

      let leader = await leaderboard.leaderboard(0); // check leader
      assert.equal(leader.user, accounts[3]);
      let second = await leaderboard.leaderboard(1); // check second classified
      assert.equal(second.user, currentUser.user);
      let third = await leaderboard.leaderboard(2); // check third classified
      assert.equal(third.user, accounts[2]);

      let balance = await leaderboard.getBalance.call();
      balance = new BN(balance).toString();
      assert.equal(balance, web3.utils.toWei("4", "ether"));
    });

    it("Should not update leaderboard with too low score", async () => {
      let currentUser = { user: accounts[5], score: 20 };

      nonce = await web3.eth.getTransactionCount(currentUser.user); // Update nonce
      let signature = await helpers.signGameRecipe(
        currentUser.user,
        currentUser.score,
        nonce
      ); // Create signature hash

      await leaderboard.addScore(
        currentUser.user,
        currentUser.score,
        nonce,
        signature,
        {
          from: currentUser.user,
          value: web3.utils.toWei("1", "ether"),
        }
      );

      let leader = await leaderboard.leaderboard(0); // check leader EQUALS LAST CHECK
      assert.equal(leader.user, accounts[3]);

      let second = await leaderboard.leaderboard(1); // check second classified EQUALS LAST CHECK
      assert.equal(second.user, accounts[4]);

      let third = await leaderboard.leaderboard(2); // check third classified EQUALS LAST CHECK
      assert.equal(third.user, accounts[2]);
    });

    it("Should be able to withdraw funds if owner", async () => {
      const tx = await leaderboard.withdraw({ from: accounts[7] }); // withdraw funds from owner
      const { logs } = tx;

      assert.equal(logs[0].args.firstWinner.user, accounts[3]);
      assert.equal(logs[0].args.secondWinner.user, accounts[4]);
      assert.equal(logs[0].args.thirdWinner.user, accounts[2]);
    });

    it("After funds withdrawal balance should be 0", async () => {
      let balance = await leaderboard.getBalance.call();
      assert.equal(balance, 0);
    });

    it("Should not be able to withdraw funds if not owner", async () => {
      await truffleAssert.reverts(
        leaderboard.withdraw({ from: accounts[4] }),
        "Function accessible only by the owner!"
      );
    });
  });

  describe("📍 Leaderboard revenue dispatch management", () => {
    let leaderboard;
    it("Should insert player 1 in leaderboard, by spending 1 ether", async () => {
      leaderboard = await Leaderboard.new(signer_address, wallet_address, {
        from: contract_owner,
      }); // get deployed contract instance

      let currentUser = { user: accounts[1], score: 100 };

      nonce = await web3.eth.getTransactionCount(currentUser.user); // Update nonce
      let signature = await helpers.signGameRecipe(
        currentUser.user,
        currentUser.score,
        nonce
      ); // Create signature hash

      await leaderboard.addScore(
        currentUser.user,
        currentUser.score,
        nonce,
        signature,
        {
          from: currentUser.user,
          value: web3.utils.toWei("1", "ether"),
        }
      );

      let leader = await leaderboard.leaderboard(0);
      assert.equal(leader.user, currentUser.user);
      assert.equal(leader.score, currentUser.score);

      let balance = await leaderboard.getBalance.call();
      balance = new BN(balance).toString();

      assert.equal(balance, web3.utils.toWei("1", "ether"));
    });

    it("Should insert player 2 in leaderboard, by spending 1 ether, and shift positions", async () => {
      let currentUser = { user: accounts[2], score: 200 };

      nonce = await web3.eth.getTransactionCount(currentUser.user); // Update nonce
      let signature = await helpers.signGameRecipe(
        currentUser.user,
        currentUser.score,
        nonce
      ); // Create signature hash

      await leaderboard.addScore(
        currentUser.user,
        currentUser.score,
        nonce,
        signature,
        {
          from: currentUser.user,
          value: web3.utils.toWei("1", "ether"),
        }
      );

      let leader = await leaderboard.leaderboard(0); // check leader
      assert.equal(leader.user, currentUser.user);
      assert.equal(leader.score, currentUser.score);

      let second = await leaderboard.leaderboard(1); // check second classified
      assert.equal(second.user, accounts[1]);

      //assert.equal(leader.user, currentUser.user);

      let balance = await leaderboard.getBalance.call();
      balance = new BN(balance).toString();

      assert.equal(balance, web3.utils.toWei("2", "ether"));
    });

    it("Should insert player 3 in leaderboard, by spending 1 ether, and shift positions", async () => {
      let currentUser = { user: accounts[3], score: 300 };

      nonce = await web3.eth.getTransactionCount(currentUser.user); // Update nonce
      let signature = await helpers.signGameRecipe(
        currentUser.user,
        currentUser.score,
        nonce
      ); // Create signature hash

      await leaderboard.addScore(
        currentUser.user,
        currentUser.score,
        nonce,
        signature,
        {
          from: currentUser.user,
          value: web3.utils.toWei("1", "ether"),
        }
      );

      let leader = await leaderboard.leaderboard(0); // check leader
      assert.equal(leader.user, currentUser.user);
      assert.equal(leader.score, currentUser.score);
      let second = await leaderboard.leaderboard(1); // check second classified
      assert.equal(second.user, accounts[2]);

      let third = await leaderboard.leaderboard(2); // check third classified
      assert.equal(third.user, accounts[1]);

      let balance = await leaderboard.getBalance.call();
      balance = new BN(balance).toString();

      assert.equal(balance, web3.utils.toWei("3", "ether"));
    });

    it("Should insert player 4 in leaderboard, by spending 1 ether, and shift positions", async () => {
      let currentUser = { user: accounts[4], score: 250 };

      nonce = await web3.eth.getTransactionCount(currentUser.user); // Update nonce
      let signature = await helpers.signGameRecipe(
        currentUser.user,
        currentUser.score,
        nonce
      ); // Create signature hash

      await leaderboard.addScore(
        currentUser.user,
        currentUser.score,
        nonce,
        signature,
        {
          from: currentUser.user,
          value: web3.utils.toWei("1", "ether"),
        }
      );

      let leader = await leaderboard.leaderboard(0); // check leader
      assert.equal(leader.user, accounts[3]);
      let second = await leaderboard.leaderboard(1); // check second classified
      assert.equal(second.user, currentUser.user);
      assert.equal(second.score, currentUser.score);
      let third = await leaderboard.leaderboard(2); // check third classified
      assert.equal(third.user, accounts[2]);
    });

    it("Balance Should equal 4 ethers", async () => {
      let balance = await leaderboard.getBalance.call();
      balance = new BN(balance).toString();
      assert.equal(balance, web3.utils.toWei("4", "ether"));
    });

    it("On funds withdrawal top-three-players should get correct revenue", async () => {
      // 1. get balances before withdraw
      let walletBalanceBefore = await web3.eth.getBalance(wallet_address);
      let firstBalanceBefore = await web3.eth.getBalance(accounts[3]);
      let secondBalanceBefore = await web3.eth.getBalance(accounts[4]);
      let thirdBalanceBefore = await web3.eth.getBalance(accounts[2]);

      let beforeBalance = await leaderboard.getBalance.call();
      beforeBalance = new BN(beforeBalance);

      walletBalanceBefore = new BN(walletBalanceBefore);
      firstBalanceBefore = new BN(firstBalanceBefore);
      secondBalanceBefore = new BN(secondBalanceBefore);
      thirdBalanceBefore = new BN(thirdBalanceBefore);

      // 2. withdraw
      const tx = await leaderboard.withdraw({ from: contract_owner }); // withdraw funds from owner
      const { logs } = tx;

      assert.equal(logs[0].args.firstWinner.user, accounts[3]);
      assert.equal(logs[0].args.secondWinner.user, accounts[4]);
      assert.equal(logs[0].args.thirdWinner.user, accounts[2]);

      // 3. get balances after withdraw
      let walletBalanceAfter = await web3.eth.getBalance(wallet_address);
      let firstBalanceAfter = await web3.eth.getBalance(accounts[3]);
      let secondBalanceAfter = await web3.eth.getBalance(accounts[4]);
      let thirdBalanceAfter = await web3.eth.getBalance(accounts[2]);

      walletBalanceAfter = new BN(walletBalanceAfter);
      firstBalanceAfter = new BN(firstBalanceAfter);
      secondBalanceAfter = new BN(secondBalanceAfter);
      thirdBalanceAfter = new BN(thirdBalanceAfter);

      // 4. get balance gap
      const walletBalanceGap = walletBalanceAfter - walletBalanceBefore;
      const firstBalanceGap = firstBalanceAfter - firstBalanceBefore;
      const secondBalanceGap = secondBalanceAfter - secondBalanceBefore;
      const thirdBalanceGap = thirdBalanceAfter - thirdBalanceBefore;

      const totalGap =
        walletBalanceGap + firstBalanceGap + secondBalanceGap + thirdBalanceGap;

      assert.equal(walletBalanceGap, beforeBalance * (40 / 100));
      assert.equal(firstBalanceGap, beforeBalance * (30 / 100));
      assert.equal(secondBalanceGap, beforeBalance * (20 / 100));
      assert.equal(thirdBalanceGap, beforeBalance * (10 / 100));
      assert.equal(
        web3.utils.fromWei(totalGap.toString(), "ether"),
        web3.utils.fromWei(beforeBalance.toString(), "ether")
      );
    });

    it("After funds withdrawal balance should be 0", async () => {
      let balance = await leaderboard.getBalance.call();
      balance = new BN(balance).toString();
      assert.equal(balance, 0);
    });
  });
});
