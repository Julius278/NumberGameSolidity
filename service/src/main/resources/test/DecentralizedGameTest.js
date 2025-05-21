const {ethers} = require("hardhat");
const {expect} = require("chai");

describe("Decentralized Game Test", () => {

    let factory, game;
    let gameManager, player1, player2, player3;
    let GameContract, GameFactoryContract;
    let player1NumberPassword = "passwordPlayer1";
    let player2NumberPassword = "passwordPlayer2";
    let player3NumberPassword = "passwordPlayer3";
    let player1chosenNumber = 500;
    let player2chosenNumber = 350;
    let player3chosenNumber = 400;


    before(async () => {
        //create funded signer to fund individual addresses
        const [_gameManager, _player1, _player2, _player3] = await ethers.getSigners();

        gameManager = _gameManager;
        player1 = _player1;
        player2 = _player2;
        player3 = _player3;

        //init contract factories
        GameFactoryContract = await ethers.getContractFactory("GameFactory");
        GameContract = await ethers.getContractFactory("DecentralizedGame");
        factory = await (await GameFactoryContract.connect(gameManager).deploy()).deployed();

        console.log("factory deployed at: %s", factory.address);
        console.log("player1 address: %s", player1.address);
        console.log("player2 address: %s", player2.address);
        console.log("player3 address: %s", player3.address);
        console.log("gameManager address: %s", gameManager.address);

    });

    it("Manager creates a new decentralized game", async () => {
        await (await factory.connect(gameManager).createDecentralizedGame()).wait();
        let gameAddress = await factory.connect(player1).getLastDecentralizedGameAddress();
        game = await GameContract.attach(gameAddress);

        console.log("game deployed at: %s", game.address);
    });


    function generateNumberHash(number, password, address) {
        return ethers.utils.solidityKeccak256(["uint16", "string", "address"], [number, password, address]);
    }

    it("player2 tries to place a bet without his betting stake and fails", async () => {
        let hashedNumber = generateNumberHash(100, player2NumberPassword, player2.address.toString());

        console.log("hashedNumber: %s", hashedNumber)

        let call = game.connect(player2).bet(hashedNumber);
        await expect(call).to.be.revertedWith("Bet cost is 0.000000001 ether");
    });


    it("player1 places a bet", async () => {
        let hashedNumber = generateNumberHash(player1chosenNumber, player1NumberPassword, player1.address);

        const options = {value: ethers.utils.parseEther("0.000000001")}
        await game.connect(player1).bet(hashedNumber, options);

        let bets = await game.connect(player1).getBets();

        console.log("bets: %s", bets);

        expect(bets.length).to.equal(1);
    });

    it("player2 places a bet", async () => {
        let hashedNumber = generateNumberHash(player2chosenNumber, player2NumberPassword, player2.address);

        const options = {value: ethers.utils.parseEther("0.000000001")}
        await game.connect(player2).bet(hashedNumber, options);

        let bets = await game.connect(player2).getBets();

        console.log("bets: %s", bets);

        expect(bets.length).to.equal(2);
    });

    it("player2 tries to begin verification phase with only two bets", async () => {
        let call = game.connect(player2).beginVerification("I would like to start the verification phase");
        await expect(call).to.be.revertedWith("at least 3 bets required");
    });

    it("gameManager tries to begin verification phase with only two bets", async () => {
        let call = game.connect(gameManager).beginVerification("I would like to start the verification phase");
        await expect(call).to.be.revertedWith("at least 3 bets required");
    });

    it("player2 tries to place a second bet and fails", async () => {
        let hashedNumber = generateNumberHash(200, player2NumberPassword, player2.address);

        const options = {value: ethers.utils.parseEther("0.000000001")}
        let call = game.connect(player2).bet(hashedNumber, options);
        await expect(call).to.be.revertedWith("Vote already taken for this address");
    });

    it("player3 places a bet", async () => {
        let hashedNumber = generateNumberHash(player3chosenNumber, player3NumberPassword, player3.address);

        const options = {value: ethers.utils.parseEther("0.000000001")}
        await game.connect(player3).bet(hashedNumber, options);

        let bets = await game.connect(player3).getBets();

        console.log("bets: %s", bets);

        expect(bets.length).to.equal(3);
    });

    /*it("gameManager tries to end the game without calling beginEvaluation", async () => {
        let bets = await game.connect(gameManager).getBets();

        let playerAddresses = [bets[0].voter, bets[1].voter, bets[2].voter];
        let values = [900, 900, 600];

        let call = game.connect(gameManager).endGame(playerAddresses, values);
        await expect(call).to.be.revertedWith("Game not in EvaluationPhase");
    });*/

    it("gameManager begins the verification phase of the game", async () => {
        await game.connect(gameManager).beginVerification("any message to explain the verification, maybe include some instructions");
    });

    it("player1 verifies its chosenNumber during verification phase", async () => {
        await game.connect(player1).verifyEncryptedNumber(player1chosenNumber, player1NumberPassword);
    });

    it("player3 verifies its chosenNumber during verification phase", async () => {
        await game.connect(player3).verifyEncryptedNumber(player3chosenNumber, player3NumberPassword);
    });

    it("player2 tries to verify a different number during verification phase", async () => {
        let call = game.connect(player2).verifyEncryptedNumber(999, player2NumberPassword);
        await expect(call).to.be.revertedWith("chosenNumber or secretPassword input incorrect");
    });

    it("player2 verifies its chosenNumber during verification phase", async () => {
        let call = game.connect(player2).verifyEncryptedNumber(player2chosenNumber, player2NumberPassword);
        await expect(call).to.emit(game, "EvaluationPhaseStarted")
    });

    it("player1 ends the game by decrypting all bets and call endGame", async () => {
        let call = game.connect(player1).endGame();
        await expect(call).to.emit(game, "WinnerAnnouncement");

        let winner = await game.connect(player1).getWinner();
        console.log("winner of the decentralized game is: %s", winner)
        expect(winner).to.equal(player2.address);
    });

});