const {ethers} = require("hardhat");
const {expect} = require("chai");

const forge = require('node-forge');

/*const EthCrypto = require('eth-crypto');

async function decryptMessage(encryptedMessage, gameManagerCrypt, signaturePublicKey) {
    const encryptedObject = EthCrypto.cipher.parse(encryptedMessage);

    const decrypted = await EthCrypto.decryptWithPrivateKey(
        gameManagerCrypt.privateKey,
        encryptedObject
    );
    const decryptedPayload = JSON.parse(decrypted);

    const senderAddress = EthCrypto.recover(
        decryptedPayload.signature,
        EthCrypto.hash.keccak256(decryptedPayload.message)
    );
    console.log(
        'Got message from ' +
        senderAddress +
        ': ' +
        decryptedPayload.message
    );

    const pub = EthCrypto.recoverPublicKey(
        decryptedPayload.signature, // signature
        EthCrypto.hash.keccak256(decryptedPayload.message.toString()) // message hash
    );

    console.log("recovered public key: %s", pub);
    expect(signaturePublicKey).to.equal(pub);

    return decryptedPayload.message;
}

async function encryptChosenNumber(player1Crypt, secretMessage, managerPublicKey) {
    const signature = EthCrypto.sign(
        player1Crypt.privateKey,
        EthCrypto.hash.keccak256(secretMessage.toString())
    );
    console.log("created signature: %s", signature);
    const payload = {
        message: secretMessage,
        signature
    };
    const encrypted = await EthCrypto.encryptWithPublicKey(
        managerPublicKey,
        JSON.stringify(payload)
    );

    return EthCrypto.cipher.stringify(encrypted);
}*/

function encryptMessage(publicKey, message) {
    const publicKeyForge = forge.pki.publicKeyFromPem(base64ToPemKey(publicKey));
    const encrypted = publicKeyForge.encrypt(forge.util.encodeUtf8(message));
    return forge.util.encode64(encrypted);
}

function decryptMessage(privateKey, encryptedMessage) {
    const privateKeyForge = forge.pki.privateKeyFromPem(base64ToPemKey(privateKey));
    const decodedMessage = forge.util.decode64(encryptedMessage);
    const decrypted = privateKeyForge.decrypt(decodedMessage);
    return forge.util.decodeUtf8(decrypted); // Decode from UTF-8
}

function keyToBase64String(key) {
    return forge.util.encode64(key);
}

function base64ToPemKey(base64String) {
    return forge.util.decode64(base64String);
}


describe("Game Test", () => {

    let factory, game;
    let gameManager, player1, player2, player3, fund;
    let gameManagerCrypt, player1Crypt, player2Crypt, player3Crypt;
    let GameContract, GameFactoryContract;

    const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair(2048);

    before(async () => {
        //create funded signer to fund individual addresses
        const [fund, _gameManager, _player1, _player2, _player3] = await ethers.getSigners();

        //create all identities
       /* gameManagerCrypt = EthCrypto.createIdentity();
        gameManager = new ethers.Wallet(gameManagerCrypt.privateKey, ethers.provider);
        player1Crypt = EthCrypto.createIdentity();
        player1 = new ethers.Wallet(player1Crypt.privateKey, ethers.provider);
        player2Crypt = EthCrypto.createIdentity();
        player2 = new ethers.Wallet(player2Crypt.privateKey, ethers.provider);
        player3Crypt = EthCrypto.createIdentity();
        player3 = new ethers.Wallet(player3Crypt.privateKey, ethers.provider);*/

        gameManager = _gameManager;
        player1 = _player1;
        player2 = _player2;
        player3 = _player3;

        //fund accounts with eth for transaction fees
       /* await fund.sendTransaction({
            to: gameManager.address,
            value: ethers.utils.parseUnits('5', 'ether'),
        });
        await fund.sendTransaction({
            to: player1.address,
            value: ethers.utils.parseUnits('5', 'ether'),
        });
        await fund.sendTransaction({
            to: player2.address,
            value: ethers.utils.parseUnits('5', 'ether'),
        });
        await fund.sendTransaction({
            to: player3.address,
            value: ethers.utils.parseUnits('5', 'ether'),
        });*/

        //init contract factories
        GameFactoryContract = await ethers.getContractFactory("GameFactory");
        GameContract = await ethers.getContractFactory("ManagedGame");
        factory = await (await GameFactoryContract.connect(gameManager).deploy()).deployed();

        console.log("factory deployed at: %s", factory.address);
        console.log("player1 address: %s", player1.address);
        console.log("player2 address: %s", player2.address);
        console.log("player3 address: %s", player3.address);
        console.log("gameManager address: %s", gameManager.address);

    });

    it("Manager creates a new Game", async () => {
        let pub = keyToBase64String(forge.pki.publicKeyToPem(publicKey));
        console.log(pub);

        await (await factory.connect(gameManager).createManagedGame(pub)).wait();
        let gameAddress = await factory.connect(player1).getLastGameAddress();
        game = await GameContract.attach(gameAddress);

        console.log("game deployed at: %s", game.address);
    });

    it("player2 tries to place a bet without serviceFee and fails", async () => {
        let call = game.connect(player2).bet("encryptedNumberString");
        await expect(call).to.be.revertedWith("Bet cost is 0.000000001 ether");
    });

    it("player1 places a bet", async () => {
        const chosenNumber = 500;

        let managerPublicKey = await game.connect(player1).getManagerPublicKey();

        //const encryptedNumberString = await encryptChosenNumber(player1Crypt, chosenNumber, managerPublicKey);
        const encryptedNumberString = encryptMessage(managerPublicKey, chosenNumber);
        //console.log("encrypted with forge: %s", eN)

        const options = {value: ethers.utils.parseEther("0.000000001")}
        await game.connect(player1).bet(encryptedNumberString, options);

        let bets = await game.connect(player1).getBets();

        console.log("bets: %s", bets);

        expect(bets.length).to.equal(1);
    });

    it("player2 places a bet", async () => {
        const chosenNumber = 350;

        let managerPublicKey = await game.connect(player2).getManagerPublicKey();

        //const encryptedNumberString = await encryptChosenNumber(player2Crypt, chosenNumber, managerPublicKey);
        const encryptedNumberString = encryptMessage(managerPublicKey, chosenNumber);

        const options = {value: ethers.utils.parseEther("0.000000001")}
        await game.connect(player2).bet(encryptedNumberString, options);

        let bets = await game.connect(player2).getBets();

        console.log("bets: %s", bets);

        expect(bets.length).to.equal(2);
    });

    it("player2 tries to place a second bet and fails", async () => {
        const options = {value: ethers.utils.parseEther("0.000000001")}
        let call = game.connect(player2).bet("encryptedNumberString", options);
        await expect(call).to.be.revertedWith("Vote already taken for this address");
    });

    it("player3 places a bet", async () => {
        const chosenNumber = 400;

        let managerPublicKey = await game.connect(player3).getManagerPublicKey();

        //const encryptedNumberString = await encryptChosenNumber(player3Crypt, chosenNumber, managerPublicKey);
        const encryptedNumberString = encryptMessage(managerPublicKey, chosenNumber);

        const options = {value: ethers.utils.parseEther("0.000000001")}
        await game.connect(player3).bet(encryptedNumberString, options);

        let bets = await game.connect(player3).getBets();

        console.log("bets: %s", bets);

        expect(bets.length).to.equal(3);
    });

    it("a player tries to end the game and gets reverted as not manager", async () => {
        let bets = await game.connect(player3).getBets();

        let playerAddresses = [bets[0].voter, bets[1].voter, bets[2].voter];
        let values = [900, 900, 600];

        let call = game.connect(player3).endGame(playerAddresses, values);
        await expect(call).to.be.revertedWith("Caller is not manager");
    });

    it("gameManager begins the evaluation phase of the game", async () => {
        let privKey = keyToBase64String(forge.pki.privateKeyToPem(privateKey));
        await game.connect(gameManager).beginEvaluation(privKey, "any message to explain the evaluation, maybe include the private key");
    });

    it("gameManager ends the game by decrypting all bets and call endGame", async () => {
        let bets = await game.connect(gameManager).getBets();
        let privKey = keyToBase64String(forge.pki.privateKeyToPem(privateKey));

        console.log("decrypt first encryptedNumber: %s", bets[0].encryptedNumber)
        //const decryptedPlayer1 = await decryptMessage(bets[0].encryptedNumber, gameManagerCrypt, player1Crypt.publicKey);
        const decryptedPlayer1 = Number(await decryptMessage(privKey, bets[0].encryptedNumber));
        expect(decryptedPlayer1).to.be.lt(1000);
        //const decryptedPlayer2 = await decryptMessage(bets[1].encryptedNumber, gameManagerCrypt, player2Crypt.publicKey);
        const decryptedPlayer2 = Number(await decryptMessage(privKey, bets[1].encryptedNumber));
        expect(decryptedPlayer2).to.be.lt(1000);
        //const decryptedPlayer3 = await decryptMessage(bets[2].encryptedNumber, gameManagerCrypt, player3Crypt.publicKey);
        const decryptedPlayer3 = Number(await decryptMessage(privKey, bets[2].encryptedNumber));
        expect(decryptedPlayer3).to.be.lt(1000);

        let playerAddresses = [bets[0].voter, bets[1].voter, bets[2].voter];
        let values = [decryptedPlayer1, decryptedPlayer2, decryptedPlayer3];

        await game.connect(gameManager).endGame(playerAddresses, values);
    });

});