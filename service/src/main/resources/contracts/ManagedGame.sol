// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.15;

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
        require(msg.value == 0.001 ether, "Bet cost is 0.001 ether");
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
        emit WinnerAnnouncement(winner, winnerPrize, winnerBet);

        winner.transfer(winnerPrize);
        payable(manager).transfer(managerFee);
        gameState = GameState.Ended;
    }

    function determineWinner() internal evaluationPhase returns (address payable, uint16) {
        uint sum = 0;
        for (uint i = 0; i < bets.length; i++) {
            sum += bets[i].decryptedChosenNumber;
        }
        uint average = (sum / bets.length) * 2 / 3;
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
            } else {
                if (lowestDiff > uint(diff)) {
                    delete winnerList;
                    delete winnerBetList;
                    lowestDiff = uint(diff);
                    winnerList.push(bets[i].voter);
                    winnerBetList.push(bets[i].decryptedChosenNumber);
                } else if (lowestDiff == uint(diff)) { //if diff is same, push
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

    function getRandomWinner(address payable[] memory _winnerList, uint16[] memory _winnerBetList) internal view returns (address payable, uint16) {
        uint256 hash = uint256(keccak256(abi.encodePacked(_winnerList, _winnerBetList, block.number, block.timestamp)));
        uint256 m = hash % _winnerList.length;
        return (_winnerList[m], _winnerBetList[m]);
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
}
