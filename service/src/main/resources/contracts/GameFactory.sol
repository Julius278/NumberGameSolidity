// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "hardhat/console.sol";

import {ManagedGame} from "./ManagedGame.sol";

contract GameFactory {

    ManagedGame[] internal games;

    function createManagedGame(string memory publicKeyManager) public {
        ManagedGame game = new ManagedGame(msg.sender, publicKeyManager);
        games.push(game);
    }

    function getGames() public view returns (ManagedGame[] memory) {
        return games;
    }

    function getLastGameAddress() public view returns (address) {
        console.log("number of games ", games.length);
        console.log("address of first games ", address(games[0]));
        return address(games[0]);
    }
}
