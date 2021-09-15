// get address from private-key and add it to our wallet
const createSigner = () => {
  let PRIVATE_KEY =
    "0x7796c1063a203be59fa083bf84e9fc5320fc3f1db22957f335fa86de1048b90b"; // game contract pk

  web3.eth.accounts.wallet.add(PRIVATE_KEY);
  let account = web3.eth.accounts.wallet[0].address;
  return account === "0x96C7BD6e420C712775735B111AA2EE11Cb89D9d6"; //check with game contract address, then return
};

// get address from private-key and add it to our wallet
const createFakeSigner = () => {
  let PRIVATE_KEY =
    "0x4e225804d0e100f51f62e98a964b9844f26500c229e8f4fd5222374c464b55ab"; // game contract pk

  web3.eth.accounts.wallet.add(PRIVATE_KEY);
  let account = web3.eth.accounts.wallet[1].address;
  return account === "0x914FfB1a0490ac747C4f5911240d267FbF740121"; //check with game contract address, then return
};

// sign a message with argouments - FROM GAME ADDRESS
const signGameRecipe = async (player, score, nonce, callback) => {
  let hash = await web3.utils.soliditySha3(player, score, nonce);
  let privateKey = await web3.eth.accounts.wallet[0].privateKey;

  let fullMessage = web3.eth.accounts.sign(hash, privateKey); // sign message with game pk
  return fullMessage.signature;
};

// sign a message with argouments - FROM MALICIOUS
const fakeSignGameRecipe = async (player, score, nonce, callback) => {
  let hash = await web3.utils.soliditySha3(player, score, nonce);
  let privateKey = await web3.eth.accounts.wallet[1].privateKey;

  let fullMessage = web3.eth.accounts.sign(hash, privateKey); // sign message with game pk
  return fullMessage.signature;
};

// recover address from signed message
const recoverAddress = async (player, score, nonce, signatureObject) => {
  let hash = await web3.utils.soliditySha3(player, score, nonce);
  let recover = await web3.eth.accounts.recover(hash, signatureObject);
  return recover;
};

module.exports = {
  createSigner,
  createFakeSigner,
  signGameRecipe,
  fakeSignGameRecipe,
  recoverAddress,
};
