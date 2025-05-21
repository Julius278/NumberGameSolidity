// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.15;

import "./ManagedGame.sol";
import "./DecentralizedGame.sol";

contract GameFactory {
    ManagedGame[] internal mGames;
    DecentralizedGame[] internal dGames;

    function createManagedGame(string memory publicKeyManager) public {
        ManagedGame mGame = new ManagedGame(msg.sender, publicKeyManager);
        mGames.push(mGame);
    }

    function createDecentralizedGame() public {
        createDecentralizedGame(100);
    }

    function createDecentralizedGame(uint256 _verificationFeedbackBlocks) public {
        DecentralizedGame dGame = new DecentralizedGame(msg.sender, _verificationFeedbackBlocks);
        dGames.push(dGame);
    }

    function getManagedGames() public view returns (ManagedGame[] memory) {
        return mGames;
    }

    function getDecentralizedGames() public view returns (DecentralizedGame[] memory) {
        return dGames;
    }

    function getLastManagedGameAddress() public view returns (address) {
        return address(mGames[0]);
    }

    function getLastDecentralizedGameAddress() public view returns (address) {
        return address(dGames[0]);
    }
}
