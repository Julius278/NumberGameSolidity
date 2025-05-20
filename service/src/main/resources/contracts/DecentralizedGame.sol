// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.15;

contract DecentralizedGame {
    address public manager;
    address payable[] private _possibleWinnerList;
    address payable public winner;
    uint16[] private _winnerBetList;
    uint16 internal _winnerBet;
    uint public managerFee;
    uint public winnerPrize;

    // defines the amount of blocks which is added to the current block when the verification phase begins, so it shows the feedback period to the verification phase in amount of blocks
    uint256 public verificationFeedbackBlocks;
    uint internal _verificationUntilBlock;

    Bet[] private bets;
    GameState public gameState;

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

    event GameCreated(address manager, string message);
    event WinnerAnnouncement(address winner, uint winnerPrize, uint16 winnerBet);
    event VerificationPhaseStarted(string message, uint untilBlock);
    event EvaluationPhaseStarted(string message);

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
        manager = _manager;
        verificationFeedbackBlocks = _verificationFeedbackBlocks;
        emit GameCreated(manager, "some instructions");
        gameState = GameState.Betting;
    }

    function bet(bytes32 numberHash) external payable bettingPhase {
        require(msg.value == 0.001 ether, "Bet cost is 0.001 ether");
        if (bets.length > 0) {
            for (uint i = 0; i < bets.length; i++) {
                if (bets[i].player == msg.sender) {
                    revert("Vote already taken for this address");
                }
            }
        }
        Bet memory newBet = Bet(payable(msg.sender), numberHash, 0, false);
        bets.push(newBet);
    }

    function beginVerification(string memory message) external isPlayerOrManager bettingPhase {
        require(bets.length >= 3, "at least 3 bets required");

        _verificationUntilBlock = block.number + verificationFeedbackBlocks;
        gameState = GameState.Verification;
        emit VerificationPhaseStarted(message, _verificationUntilBlock);
    }

    function verifyEncryptedNumber(uint16 chosenNumber, string memory secretPassword) external isPlayer verificationPhase {
        require(chosenNumber <= 1000, "_chosenNumber must be less than or equal to 1000"); //uint already checks that it equals 0 or is greater
        require(_verificationUntilBlock >= block.number, "verificationPhase already ended cause the block defined in verificationUntilBlock has been exceeded");

        bool allBetsVerified = true;

        bytes32 hash = keccak256(abi.encodePacked(chosenNumber, secretPassword, msg.sender));
        for (uint i = 0; i < bets.length; i++) {
            if (bets[i].player == msg.sender) {
                require(uint256(hash) == uint256(bets[i].hashedNumber), "chosenNumber or secretPassword input incorrect");
                bets[i].verifiedChosenNumber = chosenNumber;
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
        require(_verificationUntilBlock < block.number, "evaluation cant start because the verificationUntilBlock is not reached");

        gameState = GameState.Evaluation;
        emit EvaluationPhaseStarted(message);
    }

    function endGame() external isPlayerOrManager evaluationPhase {
        (winner, _winnerBet) = _determineWinner();

        managerFee = (getBalance() * 10) / 100;
        winnerPrize = (getBalance() * 90) / 100;

        winner.transfer(winnerPrize);
        emit WinnerAnnouncement(winner, winnerPrize, _winnerBet);

        payable(manager).transfer(managerFee);
        gameState = GameState.Ended;
    }

    function getPossibleWinnerList() external view gameEnded returns (address payable[] memory) {
        return _possibleWinnerList;
    }

    function getBets() external view returns (Bet[] memory) {
        return bets;
    }

    function getBalance() public view returns (uint){
        return address(this).balance;
    }

    function _determineWinner() internal evaluationPhase returns (address payable, uint16) {
        uint sum = 0;
        for (uint i = 0; i < bets.length; i++) {
            if (bets[i].verified) {
                sum += bets[i].verifiedChosenNumber;
            }
        }
        uint average = (sum / bets.length) * 2 / 3;

        uint lowestDiff = 1001;

        for (uint i = 0; i < bets.length; i++) {
            if (bets[i].verified) {
                int diff = int256(average) - int256(uint256(bets[i].verifiedChosenNumber));
                if (diff < 0) {
                    diff *= - 1;
                }
                if (lowestDiff > uint(diff)) {
                    delete _possibleWinnerList;
                    delete _winnerBetList;
                    lowestDiff = uint(diff);
                    _possibleWinnerList.push(bets[i].player);
                    _winnerBetList.push(bets[i].verifiedChosenNumber);
                } else if (lowestDiff == uint(diff)) { //if diff is same, push
                    _possibleWinnerList.push(bets[i].player);
                    _winnerBetList.push(bets[i].verifiedChosenNumber);
                }
            }
        }
        if (_possibleWinnerList.length > 1) {
            return _getRandomWinner(_possibleWinnerList, _winnerBetList);
        }
        return (_possibleWinnerList[0], _winnerBetList[0]);
    }

    function _getRandomWinner(address payable[] memory winnerList, uint16[] memory winnerBetList) internal view returns (address payable, uint16) {
        uint256 hash = uint256(keccak256(abi.encodePacked(
            winnerList,
            winnerBetList,
            block.number,
            block.timestamp,
            blockhash(block.number - 1)
        )));
        uint256 m = hash % winnerList.length;
        return (winnerList[m], winnerBetList[m]);
    }
}
