// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.15 <0.9.0;

import "hardhat/console.sol";

contract DecentralizedGame {

    event GameCreated(address manager, string message);
    event WinnerAnnouncement(address winner, uint winnerPrize, uint16 winnerBet);
    event VerificationPhaseStarted(string message, uint untilBlock);
    event EvaluationPhaseStarted(string message);

    struct Bet {
        address payable player;
        bytes32 hashedNumber;
        uint16 verifiedChosenNumber;
        bool verified;
    }

    enum GameState {
        Created,
        Betting,
        Evaluation,
        Verification,
        Ended
    }

    address private manager;
    address payable[] private possibleWinnerList;
    address payable private winner;
    uint16[] private winnerBetList;
    uint16 private winnerBet;
    uint private managerFee;
    uint private winnerPrize;
    Bet[] private bets;

    // defines the amount of blocks which is added to the current block when the verification phase begins, so it shows the feedback period to the verification phase in amount of blocks
    uint256 internal verificationFeedbackBlocks;

    uint internal verificationUntilBlock;

    GameState private gameState;

    modifier isManager() {
        require(msg.sender == manager, "Caller is not manager");
        _;
    }

    modifier isPlayerOrManager() {
        bool player = false;
        for (uint i = 0; i < bets.length; i++) {
            if (bets[i].player == msg.sender) {
                player = true;
            }
        }
        require(player || msg.sender == manager, "Caller is not a player of the game or the manager");
        _;
    }

    modifier isPlayer() {
        bool player = false;
        for (uint i = 0; i < bets.length; i++) {
            if (bets[i].player == msg.sender) {
                player = true;
            }
        }
        require(player, "Caller is not a player of the game or the manager");
        _;
    }

    modifier bettingPhase() {
        require(gameState == GameState.Betting, "Game not in BettingPhase");
        _;
    }

    modifier verificationPhase() {
        require(gameState == GameState.Verification, "Game not in VerificationPhase");
        _;
    }

    modifier evaluationPhase() {
        require(gameState == GameState.Evaluation, "Game not in EvaluationPhase");
        _;
    }

    modifier gameEnded() {
        require(gameState == GameState.Ended, "Game not yet ended");
        _;
    }

    constructor(address _manager, uint256 _verificationFeedbackBlocks) {
        gameState = GameState.Created;
        console.log("Game contract deployed by:", tx.origin);
        manager = _manager;
        verificationFeedbackBlocks = _verificationFeedbackBlocks;
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

    function bet(bytes32 _numberHash) external payable bettingPhase {
        require(msg.value == 0.001 ether, "Bet cost is 0.001 ether");
        if (bets.length > 0) {
            for (uint i = 0; i < bets.length; i++) {
                if (bets[i].player == msg.sender) {
                    revert("Vote already taken for this address");
                }
            }
        }
        Bet memory newBet = Bet(payable(msg.sender), _numberHash, 0, false);
        bets.push(newBet);
    }

    function beginVerification(string memory message) external isPlayerOrManager bettingPhase {
        require(bets.length >= 3, "at least 3 bets required");

        verificationUntilBlock = block.number + verificationFeedbackBlocks;
        gameState = GameState.Verification;
        emit VerificationPhaseStarted(message, verificationUntilBlock);
    }

    function verifyEncryptedNumber(uint16 _chosenNumber, string memory _secretPassword) external isPlayer verificationPhase {
        require(_chosenNumber <= 1000, "_chosenNumber must be less than or equal to 1000"); //uint already checks that it equals 0 or is greater
        require(verificationUntilBlock >= block.number, "verificationPhase already ended cause the block defined in verificationUntilBlock has been exceeded");

        bool allBetsVerified = true;

        bytes32 hash = keccak256(abi.encodePacked(_chosenNumber, _secretPassword, msg.sender));
        for (uint i = 0; i < bets.length; i++) {
            if (bets[i].player == msg.sender) {
                require(uint256(hash) == uint256(bets[i].hashedNumber), "chosenNumber or secretPassword input incorrect");
                console.log("chosenNumber '%s' verified by: '%s'", _chosenNumber, msg.sender);
                bets[i].verifiedChosenNumber = _chosenNumber;
                bets[i].verified = true;
            }
            if (bets[i].verified == false) {
                allBetsVerified = false;
            }
        }

        if (allBetsVerified) {
            gameState = GameState.Evaluation;
            emit EvaluationPhaseStarted("evaluationPhase started cause all bets have been verified");
        }
    }

    //maybe not needed for this implementation, maybe directly to endGame
    function beginEvaluation(string memory message) external isPlayer verificationPhase {
        //not necessary cause verifyEncryptedNumber would do this step automatically
        /*bool allBetsVerified = true;
        for (uint i = 0; i < bets.length; i++) {
            if (bets[i].verified == false) {
                allBetsVerified = false;
            }
        }
        require(verificationUntilBlock < block.number || allBetsVerified, "evaluation cant start because the verificationUntilBlock is not reached or not all bets are verified");*/
        require(verificationUntilBlock < block.number, "evaluation cant start because the verificationUntilBlock is not reached");

        gameState = GameState.Evaluation;
        emit EvaluationPhaseStarted(message);
    }

    function endGame() external isPlayerOrManager evaluationPhase {
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
            if (bets[i].verified) {
                sum += bets[i].verifiedChosenNumber;
            } else {
                console.log("bet from %s is not verified, so its not part of the sum", bets[i].player);
            }
        }
        console.log("sum of all (verified) players equals: %s", sum);

        uint average = (sum / bets.length) * 2 / 3;
        console.log("two third average is: %s", average);

        uint lowestDiff = 1001;

        for (uint i = 0; i < bets.length; i++) {
            if (bets[i].verified) {
                int diff = int256(average) - int256(uint256(bets[i].verifiedChosenNumber));
                if (diff < 0) {
                    diff *= - 1;
                }
                console.log("next checked bet is: '%s' from '%s', with a diff of '%s'", bets[i].verifiedChosenNumber, bets[i].player, uint(diff));
                if (lowestDiff > uint(diff)) {
                    delete possibleWinnerList;
                    delete winnerBetList;
                    console.log("old lowestDiff is: %s, new one is: %s, emptied winner and winnerBet arrays", lowestDiff, uint(diff));
                    lowestDiff = uint(diff);
                    possibleWinnerList.push(bets[i].player);
                    winnerBetList.push(bets[i].verifiedChosenNumber);
                } else if (lowestDiff == uint(diff)) { //if diff is same, push
                    console.log("same lowestDiff: %s as the current winner, push the new winner additionally to the winner array: '%s'", uint(diff), bets[i].player);

                    possibleWinnerList.push(bets[i].player);
                    winnerBetList.push(bets[i].verifiedChosenNumber);
                }
            } else {
                console.log("bet from %s is not verified", bets[i].player);
            }
        }
        if (possibleWinnerList.length > 1) {
            return getRandomWinner(possibleWinnerList, winnerBetList);
        }
        return (possibleWinnerList[0], winnerBetList[0]);
    }

    function getRandomWinner(address payable[] memory _winnerList, uint16[] memory _winnerBetList) internal view returns (address payable, uint16) {
        uint256 hash = uint256(keccak256(abi.encodePacked(_winnerList, _winnerBetList, block.number, block.timestamp, blockhash(block.number - 1))));
        uint256 m = hash % _winnerList.length;
        return (_winnerList[m], _winnerBetList[m]);
    }

    function getBalance() public view returns (uint){
        return address(this).balance;
    }

    function getPossibleWinnerList() public view gameEnded returns (address payable[] memory){
        return possibleWinnerList;
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

    function getVerificationFeedbackBlocks() public view returns (uint256){
        return verificationFeedbackBlocks;
    }
}
