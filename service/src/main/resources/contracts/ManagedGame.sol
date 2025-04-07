// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.15;

import "hardhat/console.sol";

contract ManagedGame {
    event GameCreated(address manager, string message);
    event WinnerAnnouncement(address winner, uint winnerPrize, uint16 winnerBet);
    event EvaluationPhaseStarted(string decryptionKey, string message);

    struct Bet {
        address payable voter;
        string encryptedNumber;
        uint16 decryptedChosenNumber;
    }

    enum GameState {
        Created,
        Betting,
        Evaluation,
        Ended
    }

    address private manager;
    string private managerPublicKey;
    address payable[] private winnerList;
    address payable private winner;
    uint16[] private winnerBetList;
    uint16 private winnerBet;
    uint private managerFee;
    uint private winnerPrize;
    Bet[] private bets;

    GameState private gameState;

    modifier isManager() {
        require(msg.sender == manager, "Caller is not manager"); _;
    }

    modifier bettingPhase() {
        require(gameState == GameState.Betting, "Game not in BettingPhase"); _;
    }

    modifier evaluationPhase() {
        require(gameState == GameState.Evaluation, "Game not in EvaluationPhase"); _;
    }

    modifier gameEnded() {
        require(gameState == GameState.Ended, "Game not yet ended"); _;
    }

    constructor(address _manager, string memory _managerPublicKey) {
        gameState = GameState.Created;
        console.log("Game contract deployed by:", tx.origin);
        manager = _manager;
        managerPublicKey = _managerPublicKey;
        emit GameCreated(manager, "some instructions");
        gameState = GameState.Betting;
    }

    /**
     * @dev Return manager address
     * @return address of manager
     */
    function getManager() external view returns (address) {
        return manager;
    }

    function getManagerPublicKey() external view returns (string memory) {
        return managerPublicKey;
    }

    function bet(string memory _encryptedNumber) external payable bettingPhase {
        require(msg.value == 0.000000001 ether, "Bet cost is 0.000000001 ether");
        // require(_chosenNumber <= 1000, "_chosenNumber must be less than or equal to 1000");
        for (uint i = 0; i < bets.length; i++) {
            if (bets[i].voter == msg.sender) {
                revert("Vote already taken for this address");
            }
        }
        Bet memory newBet = Bet(payable(msg.sender), _encryptedNumber, 0);
        bets.push(newBet);
    }

    function beginEvaluation(string memory decryptionKey, string memory message) external isManager bettingPhase {
        require(bets.length >= 3, "at least 3 bets required");

        gameState = GameState.Evaluation;
        emit EvaluationPhaseStarted(decryptionKey, message);
    }

    function endGame(address[] memory playerAddresses, uint16[] memory values) external isManager evaluationPhase {
        for (uint i = 0; i < playerAddresses.length; i++) {
            for (uint j = 0; j < bets.length; j++) {
                if (bets[j].voter == playerAddresses[i]) {
                    bets[j].decryptedChosenNumber = values[i];
                }
            }
        }
        (winner, winnerBet) = determineWinner();

        managerFee = (getBalance() * 10) / 100;
        winnerPrize = (getBalance() * 90) / 100;
        console.log("number of winners: %s, so the winnerPrize is: %s", winner, winnerPrize);

        console.log("transferring winnerPrize '%s' to '%s'", winnerPrize, winner);
        winner.transfer(winnerPrize);
        emit WinnerAnnouncement(winner, winnerPrize, winnerBet);

        console.log("transferring managerFee '%s' to manager '%s'", managerFee, manager);
        payable(manager).transfer(managerFee);

        gameState = GameState.Ended;
    }

    function determineWinner() internal evaluationPhase returns (address payable, uint16) {
        console.log("determineWinner - by players average number");

        uint sum = 0;
        for (uint i = 0; i < bets.length; i++) {
            sum += bets[i].decryptedChosenNumber;
        }
        console.log("sum of all players equals: %s", sum);

        uint average = (sum / bets.length) * 2 / 3;
        console.log("two third average is: %s", average);

        uint lowestDiff;

        for (uint i = 0; i < bets.length; i++) {
            int diff = int256(average) - int256(uint256(bets[i].decryptedChosenNumber));
            if (diff < 0) {
                diff *= - 1;
            }
            if (i == 0) {
                lowestDiff = uint(diff);
                winnerList.push(bets[i].voter);
                winnerBetList.push(bets[i].decryptedChosenNumber);
                console.log("first checked bet is: '%s' from '%s', with a diff of '%s'", bets[i].decryptedChosenNumber, bets[i].voter, lowestDiff);
            } else {
                console.log("next checked bet is: '%s' from '%s', with a diff of '%s'", bets[i].decryptedChosenNumber, bets[i].voter, uint(diff));
                if (lowestDiff > uint(diff)) {
                    delete winnerList;
                    delete winnerBetList;
                    console.log("old lowestDiff is: %s, new one is: %s, emptied winner and winnerBet arrays", lowestDiff, uint(diff));
                    lowestDiff = uint(diff);
                    winnerList.push(bets[i].voter);
                    winnerBetList.push(bets[i].decryptedChosenNumber);
                } else if (lowestDiff == uint(diff)) { //if diff is same, push
                    console.log("same lowestDiff: %s as the current winner, push the new winner additionally to the winner array: '%s'", uint(diff), bets[i].voter);

                    winnerList.push(bets[i].voter);
                    winnerBetList.push(bets[i].decryptedChosenNumber);
                }
            }
        }
        if(winnerList.length > 1){
            return getRandomWinner(winnerList, winnerBetList);
        }
        return (winnerList[0], winnerBetList[0]);
    }

    //TODO: implement randomness
    function getRandomWinner(address payable[] memory _winnerList, uint16[] memory _winnerBetList) internal returns (address payable, uint16) {
        return (_winnerList[0], _winnerBetList[0]);
    }

    function getBalance() public view returns (uint){
        return address(this).balance;
    }

    function getWinnerList() public view gameEnded returns (address payable[] memory){
        return winnerList;
    }

    function getWinner() public view gameEnded returns (address payable){
        return winner;
    }

    function getWinnerPrize() public view gameEnded returns (uint){
        return winnerPrize;
    }

    function getManagerFee() public view gameEnded returns (uint){
        return managerFee;
    }

    function getBets() public view returns (Bet[] memory){
        return bets;
    }

    function getGameState() public view returns (GameState){
        return gameState;
    }


    // an idea because at first I thought its 2/3 of a random number

    /*
    function generateRandomNumber() public view returns (uint256) {
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, bets.length, msg.sig))) % 1000;
        return random;
    }

    function determineWinner(uint256 randomNumber) internal bettingPhase returns (address payable[] memory, uint16[] memory){
        console.log("determineWinner - randomNumber: %s", randomNumber);

        uint lowestDiff;

        for (uint i = 0; i < bets.length; i++) {
            int diff = int256(randomNumber) - int256(uint256(bets[i].decryptedChosenNumber));
            if (diff < 0) {
                diff *= - 1;
            }
            if (i == 0) {
                lowestDiff = uint(diff);
                winner.push(bets[i].voter);
                winnerBet.push(bets[i].decryptedChosenNumber);
                console.log("first checked bet is: '%s' from '%s', with a diff of '%s'", bets[i].decryptedChosenNumber, bets[i].voter, lowestDiff);
            } else {
                console.log("next checked bet is: '%s' from '%s', with a diff of '%s'", bets[i].voter, bets[i].voter, uint(diff));
                if (lowestDiff > uint(diff)) {
                    delete winner;
                    delete winnerBet;
                    console.log("old lowestDiff is: %s, new one is: %s, emptied winner and winnerBet arrays", lowestDiff, uint(diff));
                    lowestDiff = uint(diff);
                    winner.push(bets[i].voter);
                    winnerBet.push(bets[i].decryptedChosenNumber);
                } else if (lowestDiff == uint(diff)) { //if diff is same, push
                    console.log("same lowestDiff: %s as the current winner, push the new winner additionally to the winner array: '%s'", uint(diff), bets[i].voter);

                    winner.push(bets[i].voter);
                    winnerBet.push(bets[i].decryptedChosenNumber);
                }
            }
        }
        return (winner, winnerBet);
    }*/
}
