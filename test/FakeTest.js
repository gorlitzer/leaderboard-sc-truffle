const helpers = require("../helpers/web3.helpers");

describe("📄 Fake sign message", () => {
   
    it("Manual test", async () => {
        let player = "0x6240ea814fd5A812b662BD493aE59A8315790BAc"
        let score = 100
        let nonce = 26
        let privateKey = "0xdc4aa42e60fc9edba38468bc42cf412a543e8a7393a7b273a976679380467b43"
        
        let hash = await web3.utils.soliditySha3(player, score, nonce);
        
        let fullMessage = web3.eth.accounts.sign(hash, privateKey); // sign message with game pk

        console.log("player :", player)
        console.log("score :", score)
        console.log("nonce :", nonce)
        console.log("privateKey :", privateKey)

        console.log("hash SHA3 solidity:", hash)

        console.log('fullMessage SIGNED (che nn funzia): ', fullMessage)
    });
});
