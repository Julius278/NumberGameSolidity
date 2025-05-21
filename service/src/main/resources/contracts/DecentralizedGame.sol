// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.15;

contract DecentralizedGame {
    address private _manager;
    address payable[] private _possibleWinnerList;
    address payable private _winner;
    uint16[] private _winnerBetList;
    uint16 private _winnerBet;
    uint private _managerFee;
    uint private _winnerPrize;
    // defines the amount of blocks which is added to the current block when the verification phase begins, so it shows the feedback period to the verification phase in amount of blocks
    uint256 internal _verificationFeedbackBlocks;
    uint internal _verificationUntilBlock;
    Bet[] private _bets;
    GameState private _gameState;

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
        require(msg.sender == _manager, "Caller is not manager");
        _;
    }

    modifier isPlayerOrManager() {
        bool player = false;
        for (uint i = 0; i < _bets.length; i++) {
            if (_bets[i].player == msg.sender) {
                player = true;
            }
        }
        require(player || msg.sender == _manager, "Caller is not a player of the game or the manager");
        _;
    }

    modifier isPlayer() {
        bool player = false;
        for (uint i = 0; i < _bets.length; i++) {
            if (_bets[i].player == msg.sender) {
                player = true;
            }
        }
        require(player, "Caller is not a player of the game or the manager");
        _;
    }

    modifier bettingPhase() {
        require(_gameState == GameState.Betting, "Game not in BettingPhase");
        _;
    }

    modifier verificationPhase() {
        require(_gameState == GameState.Verification, "Game not in VerificationPhase");
        _;
    }

    modifier evaluationPhase() {
        require(_gameState == GameState.Evaluation, "Game not in EvaluationPhase");
        _;
    }

    modifier gameEnded() {
        require(_gameState == GameState.Ended, "Game not yet ended");
        _;
    }

    constructor(address manager, uint256 verificationFeedbackBlocks) {
        _gameState = GameState.Created;
        _manager = manager;
        _verificationFeedbackBlocks = verificationFeedbackBlocks;
        emit GameCreated(manager, "some instructions");
        _gameState = GameState.Betting;
    }

    function bet(bytes32 numberHash) external payable bettingPhase {
        require(msg.value == 0.001 ether, "Bet cost is 0.001 ether");
        if (_bets.length > 0) {
            for (uint i = 0; i < _bets.length; i++) {
                if (_bets[i].player == msg.sender) {
                    revert("Vote already taken for this address");
                }
            }
        }
        Bet memory newBet = Bet(payable(msg.sender), numberHash, 0, false);
        _bets.push(newBet);
    }

    function beginVerification(string memory message) external isPlayerOrManager bettingPhase {
        require(_bets.length >= 3, "at least 3 bets required");

        _verificationUntilBlock = block.number + _verificationFeedbackBlocks;
        _gameState = GameState.Verification;
        emit VerificationPhaseStarted(message, _verificationUntilBlock);
    }

    function verifyEncryptedNumber(uint16 chosenNumber, string memory secretPassword) external isPlayer verificationPhase {
        require(chosenNumber <= 1000, "_chosenNumber must be less than or equal to 1000"); //uint already checks that it equals 0 or is greater
        require(_verificationUntilBlock >= block.number, "verificationPhase already ended cause the block defined in verificationUntilBlock has been exceeded");

        bool allBetsVerified = true;

        bytes32 hash = keccak256(abi.encodePacked(chosenNumber, secretPassword, msg.sender));
        for (uint i = 0; i < _bets.length; i++) {
            if (_bets[i].player == msg.sender) {
                require(uint256(hash) == uint256(_bets[i].hashedNumber), "chosenNumber or secretPassword input incorrect");
                _bets[i].verifiedChosenNumber = chosenNumber;
                _bets[i].verified = true;
            }
            if (_bets[i].verified == false) {
                allBetsVerified = false;
            }
        }

        if (allBetsVerified) {
            _gameState = GameState.Evaluation;
            emit EvaluationPhaseStarted("evaluationPhase started cause all bets have been verified");
        }
    }

    //maybe not needed for this implementation, maybe directly to endGame
    function beginEvaluation(string memory message) external isPlayer verificationPhase {
        require(_verificationUntilBlock < block.number, "evaluation cant start because the verificationUntilBlock is not reached");

        _gameState = GameState.Evaluation;
        emit EvaluationPhaseStarted(message);
    }

    function endGame() external isPlayerOrManager evaluationPhase {
        (_winner, _winnerBet) = _determineWinner();

        _managerFee = (getBalance() * 10) / 100;
        _winnerPrize = (getBalance() * 90) / 100;

        _winner.transfer(_winnerPrize);
        emit WinnerAnnouncement(_winner, _winnerPrize, _winnerBet);

        payable(_manager).transfer(_managerFee);
        _gameState = GameState.Ended;
    }

    /**
     * @dev Return manager address
     * @return address of manager
     */
    function getManager() external view returns (address) {
        return _manager;
    }

    function getPossibleWinnerList() external view gameEnded returns (address payable[] memory) {
        return _possibleWinnerList;
    }

    function getWinner() external view gameEnded returns (address payable) {
        return _winner;
    }

    function getWinnerPrize() external view gameEnded returns (uint) {
        return _winnerPrize;
    }

    function getManagerFee() external view gameEnded returns (uint) {
        return _managerFee;
    }

    function getBets() external view returns (Bet[] memory) {
        return _bets;
    }

    function getGameState() external view returns (GameState) {
        return _gameState;
    }

    function getVerificationFeedbackBlocks() external view returns (uint256) {
        return _verificationFeedbackBlocks;
    }

    function getBalance() public view returns (uint){
        return address(this).balance;
    }

    function _determineWinner() internal evaluationPhase returns (address payable, uint16) {
        uint sum = 0;
        for (uint i = 0; i < _bets.length; i++) {
            if (_bets[i].verified) {
                sum += _bets[i].verifiedChosenNumber;
            }
        }
        uint average = (sum / _bets.length) * 2 / 3;

        uint lowestDiff = 1001;

        for (uint i = 0; i < _bets.length; i++) {
            if (_bets[i].verified) {
                int diff = int256(average) - int256(uint256(_bets[i].verifiedChosenNumber));
                if (diff < 0) {
                    diff *= - 1;
                }
                if (lowestDiff > uint(diff)) {
                    delete _possibleWinnerList;
                    delete _winnerBetList;
                    lowestDiff = uint(diff);
                    _possibleWinnerList.push(_bets[i].player);
                    _winnerBetList.push(_bets[i].verifiedChosenNumber);
                } else if (lowestDiff == uint(diff)) { //if diff is same, push
                    _possibleWinnerList.push(_bets[i].player);
                    _winnerBetList.push(_bets[i].verifiedChosenNumber);
                }
            }
        }
        if (_possibleWinnerList.length > 1) {
            return _getRandomWinner(_possibleWinnerList, _winnerBetList);
        }
        return (_possibleWinnerList[0], _winnerBetList[0]);
    }

    function _getRandomWinner(address payable[] memory winnerList, uint16[] memory winnerBetList)
        internal
        view
        returns (address payable, uint16)
    {
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
