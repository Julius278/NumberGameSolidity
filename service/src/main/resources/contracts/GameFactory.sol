// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "hardhat/console.sol";

import {ManagedGame} from "./ManagedGame.sol";
import {DecentralizedGame} from "./DecentralizedGame.sol";

contract GameFactory {

    ManagedGame[] internal mGames;
    DecentralizedGame[] internal dGames;

    function createManagedGame(string memory publicKeyManager) public {
        ManagedGame mGame = new ManagedGame(msg.sender, publicKeyManager);
        mGames.push(mGame);
    }

    function createDecentralizedGame() public {
        DecentralizedGame dGame = new DecentralizedGame(msg.sender);
        dGames.push(dGame);
    }

    function getManagedGames() public view returns (ManagedGame[] memory) {
        return mGames;
    }

    function getDecentralizedGames() public view returns (DecentralizedGame[] memory) {
        return dGames;
    }

    function getLastManagedGameAddress() public view returns (address) {
        console.log("number of managed games ", mGames.length);
        console.log("address of first managed games ", address(mGames[0]));
        return address(mGames[0]);
    }

    function getLastDecentralizedGameAddress() public view returns (address) {
        console.log("number of decentralized games ", dGames.length);
        console.log("address of first decentralized games ", address(dGames[0]));
        return address(dGames[0]);
    }
}
