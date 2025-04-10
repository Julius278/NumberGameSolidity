import React, { useState } from 'react';
import { AbstractProvider, BrowserProvider, ethers, getDefaultProvider, JsonRpcSigner } from 'ethers';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

import Snackbar, { SnackbarCloseReason } from '@mui/material/Snackbar';

import './App.css'
import { useSyncProviders } from "./hooks/useSyncProviders"


function App() {

  enum GameState {
    Created,
    Betting,
    Evaluation,
    Verification,
    Ended
  }

  const [selectedWallet, setSelectedWallet] = useState<EIP6963ProviderDetail>()

  const factoryAddress = "0x502c822daef6a0b6424a4d5573d2c35983c99b37";

  const providers = useSyncProviders();
  const [userAccount, setUserAccount] = useState<string>("");
  const [balance, setBalance] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");
  const [betInputValue, setBetInputValue] = useState("");
  const [passwordInputValue, setPasswordInputValue] = useState("");

  const [snackBarMessage, setSnackBarMessage] = useState<string>("This Snackbar will be dismissed in 5 seconds.");

  const [open, setOpen] = React.useState(false);

  const [betsFilled, setBetsFilled] = useState<boolean>(false);
  const [managerAddress, setManagerAddress] = useState<string>("");
  const [bets, setBets] = useState<Array<IVote>>([]);
  const [gameState, setGameState] = useState<Number>(-1);

  const [winner, setWinner] = useState("");
  const [winnerPrize, setWinnerPrize] = useState("");
  const [managerFee, setManagerFee] = useState("");

  const clearError = () => setErrorMessage("")
  const setError = (error: string) => setErrorMessage(error)
  const isError = !!errorMessage

  const [games, setGames] = useState<string[]>([]);
  const [gameAddress, setGameAddress] = useState<string>("");

  const [provider, setProvider ] = useState<AbstractProvider>(getDefaultProvider());
  

  
  // Display a readable user address.
  const formatAddress = (addr: string) => {
    const upperAfterLastTwo = addr.slice(0, 2) + addr.slice(2)
    return `${upperAfterLastTwo.substring(0, 8)}...${upperAfterLastTwo.substring(39)}`
  }

  const handleConnect = async (providerWithInfo: EIP6963ProviderDetail) => {
    try {
      let prov = new ethers.BrowserProvider(providerWithInfo.provider);
      setProvider(prov);

      const accounts = await providerWithInfo.provider.request({
        method: "eth_requestAccounts"
      }) as string[]

      setSelectedWallet(providerWithInfo);
      setUserAccount(accounts?.[0]);      

      const accountBalance = (await prov.getBalance(accounts?.[0]));
      setBalance(ethers.formatEther(ethers.toBigInt(accountBalance)) + " ETH");

      let signerInstance = await prov.getSigner()
      
      console.log(signerInstance.address)

      await retrieveGames(signerInstance);
    } catch (error) {
      console.error(error)
      const mmError: MMError = error as MMError
      setError(`Code: ${mmError.code} \nError Message: ${mmError.message}`)
    }
  }

 
  const handleCreateNewGame = async () => {
    try{

      let prov = provider as BrowserProvider;
      let signerInstance = await prov.getSigner();

      let factoryContract = new ethers.Contract(factoryAddress, getGameFactoryAbi(), signerInstance);

      let gasPrice = (await provider.getFeeData()).gasPrice
      console.log("gasPrice: %s", gasPrice)


      let estimatedGas = await factoryContract.createDecentralizedGame.estimateGas();
      console.log("estimatedGas: %s", estimatedGas);
      await(await factoryContract.createDecentralizedGame({
        gasLimit: estimatedGas,
        gasPrice: gasPrice
      }));

      console.log("new game created");

      await new Promise(f => setTimeout(f, 10000));
      await retrieveGames(signerInstance);

    } catch (error) {
      console.error(error);
      setSnackBarMessage(String(error));
      setOpen(true);
    }
  }

  const handleLoadGame = async (address: string) => {
    try{
      setGameAddress(address);
      console.log("gameAddress: %s", address)

      let prov = provider as BrowserProvider;
      let signerInstance = await prov.getSigner();

      await retrieveBets(address, signerInstance);
    } catch (error) {
      console.error(error);
      setSnackBarMessage(String(error));
      setOpen(true);
    }
  }

  

  const handleSubmitBet = async () => {
    try {
      let prov = provider as BrowserProvider;
      let signerInstance = await prov.getSigner()
      const gameContract = new ethers.Contract(gameAddress, getGameAbi(), signerInstance);

      
      if(betInputValue == ""){
        setSnackBarMessage("bet input value is empty");
        setOpen(true);
      } else {
        let encryptedNumber = generateNumberHash(Number(betInputValue), passwordInputValue, signerInstance.address);
        console.log("bet: %s", betInputValue);
        console.log(encryptedNumber);

        let estimatedGas: bigint = await gameContract.bet.estimateGas(encryptedNumber, {value: ethers.parseEther("0.000000001")});
        let gasPrice = (await provider.getFeeData()).gasPrice
        console.log("gasPrice: %s", gasPrice)
        console.log("estimatedGas: %s", estimatedGas)
        await gameContract.bet(encryptedNumber,{
          value: ethers.parseEther("0.000000001"),
          gasLimit: estimatedGas,
          gasPrice: gasPrice
        });
        
        await new Promise(f => setTimeout(f, 10000));
        await retrieveBets(gameAddress, signerInstance);

      }
      console.log("bet call ended")
    } catch (error) {
      console.error(error);
      setSnackBarMessage(String(error));
      setOpen(true);
    }
  }

  const handleSubmitVerify = async () => {
    try {
      let prov = provider as BrowserProvider;
      let signerInstance = await prov.getSigner()
      const gameContract = new ethers.Contract(gameAddress, getGameAbi(), signerInstance);

      
      if(betInputValue == ""){
        setSnackBarMessage("number input value is empty");
        setOpen(true);
      } else {
        console.log("verifyNumberInput: %s", betInputValue);
        console.log("verifyPasswordInput: %s", passwordInputValue);

        let estimatedGas: bigint = await gameContract.verifyEncryptedNumber.estimateGas(betInputValue, passwordInputValue);
        let gasPrice = (await provider.getFeeData()).gasPrice
        console.log("gasPrice: %s", gasPrice)
        console.log("estimatedGas: %s", estimatedGas)
        await gameContract.verifyEncryptedNumber(betInputValue, passwordInputValue, {
          gasLimit: estimatedGas,
          gasPrice: gasPrice
        });

        await new Promise(f => setTimeout(f, 10000));
        await retrieveBets(gameAddress, signerInstance);

        console.log("old gameState: %s", gameState);
        let state = await gameContract.getGameState();
        setGameState(state);
        console.log("new gameState: %s", gameState);

      }
      console.log("submit verify call ended")
    } catch (error) {
      console.error(error);
      setSnackBarMessage(String(error));
      setOpen(true);
    }
  }


  const handleEndGame = async () => {
    try {
      let prov = provider as BrowserProvider;
      let signerInstance = await prov.getSigner()
      const gameContract = new ethers.Contract(gameAddress, getGameAbi(), signerInstance);
      console.log("start end game call");

      let estimatedGas: bigint = await gameContract.endGame.estimateGas();
      let gasPrice = (await provider.getFeeData()).gasPrice
      console.log("gasPrice: %s", gasPrice)
      console.log("estimatedGas: %s", estimatedGas)

      await gameContract.endGame({
        gasLimit: estimatedGas,
        gasPrice: gasPrice
      });

      await new Promise(f => setTimeout(f, 15000));
      console.log("old gameState: %s", gameState);
      let state = await gameContract.getGameState();
      setGameState(state);
      console.log("new gameState: %s", state);
      if(state == GameState.Ended){
        checkWinnerState(gameContract);
      } else {
        setWinner("");
        setWinnerPrize("");
        setManagerFee("");
      }

    } catch (error) {
      console.error(error);
      setSnackBarMessage(String(error));
      setOpen(true);
    }
  }

  const handleBeginEvaluation = async () => {
    try {
      let prov = provider as BrowserProvider;
      let signerInstance = await prov.getSigner()
      const gameContract = new ethers.Contract(gameAddress, getGameAbi(), signerInstance);

      let estimatedGas: bigint = await gameContract.beginEvaluation.estimateGas("this is a test message for evaluation start");
      let gasPrice = (await provider.getFeeData()).gasPrice
      console.log("gasPrice: %s", gasPrice)
      console.log("estimatedGas: %s", estimatedGas)

      console.log("begin evaluation");
      await gameContract.beginEvaluation("test", {
        gasPrice: gasPrice,
        gasLimit: estimatedGas
      });

      await new Promise(f => setTimeout(f, 10000));

      let state = await gameContract.getGameState();
      setGameState(state);
    } catch (error) {
      console.error(error);
      setSnackBarMessage(String(error));
      setOpen(true);
    }
  }

  const handleBeginVerification = async () => {
    try {
      let prov = provider as BrowserProvider;
      let signerInstance = await prov.getSigner()
      const gameContract = new ethers.Contract(gameAddress, getGameAbi(), signerInstance);

      let estimatedGas: bigint = await gameContract.beginVerification.estimateGas("this is a test message for verification start");
      let gasPrice = (await provider.getFeeData()).gasPrice
      console.log("gasPrice: %s", gasPrice)
      console.log("estimatedGas: %s", estimatedGas)

      console.log("begin verification");
      await gameContract.beginVerification("test", {
        gasPrice: gasPrice,
        gasLimit: estimatedGas
      });

      await new Promise(f => setTimeout(f, 10000));
      console.log("old gameState: %s", gameState);
      let state = await gameContract.getGameState();
      setGameState(state);
      console.log("new gameState: %s", gameState);

    } catch (error) {
      console.error(error);
      setSnackBarMessage(String(error));
      setOpen(true);
    }
  }

  const handleClose = (
    event: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason,
  ) => {
    if (reason === 'clickaway') {
      return;
    }

    console.log(event?.eventPhase);

    setOpen(false);
  };

  async function retrieveGames(signerInstance: ethers.JsonRpcSigner) {
    let factoryContract = new ethers.Contract(factoryAddress, getGameFactoryAbi(), signerInstance);

    let games = await factoryContract.getDecentralizedGames() as string[];
    console.log(games.length);
    setGames(games);
  }

  async function retrieveBets(gameAddress: string, signerInstance: ethers.JsonRpcSigner) {
    console.log("retrieve bets from contract");
    const gameContract = new ethers.Contract(gameAddress, getGameAbi(), signerInstance);

    let managerAddress = await gameContract.getManager();
    console.log("manager: %s", managerAddress);
    setManagerAddress(managerAddress);

    let retrievedBets = await gameContract.getBets(); // as {voters: string[], encryptedNumbers: string[]};

    let votes: Array<IVote> = new Array<IVote>();
    retrievedBets.forEach((bet: string[]) => {
      votes.push(createData(bet[0], bet[1], Number(bet[2]), Boolean(bet[3]).toString()));
    });
    setBets(votes);
    setBetsFilled(true);

    let gameState = await gameContract.getGameState() as Number;
    setGameState(gameState)

    if(gameState == GameState.Ended){
      checkWinnerState(gameContract);
    } else {
      setWinner("");
      setWinnerPrize("");
      setManagerFee("");
    }
  }

  async function checkWinnerState(gameContract: ethers.Contract) {
    try{
      let win = await gameContract.getWinner();
      console.log("winner: %s", win);
      setWinner(win);     
      
      let prize = await gameContract.getWinnerPrize();
      console.log("winnerprize: %s", prize);
      setWinnerPrize(prize);

      let fee = await gameContract.getManagerFee();
      console.log("managerFee: %s", fee)
      setManagerFee(fee);
    } catch (error) {

    }
  }

  function createData(
    name: string,
    hashedNumber: string,
    verifiedChosenNumber: number,
    verified: string
  ) {
    console.log("verified: %s", verified)
    return { name, hashedNumber, verifiedChosenNumber, verified  };
  }

  return (
    
    <div className="App">
      <h2>Wallets Detected:</h2>
      <div className="providers">
        {
          providers.length > 0 ? providers?.map((provider: EIP6963ProviderDetail) => (
            <button key={provider.info.uuid} onClick={() => handleConnect(provider)} >
              <img src={provider.info.icon} alt={provider.info.name} />
              <div>{provider.info.name}</div>
            </button>
          )) :
            <div>
              No Announced Wallet Providers
            </div>
        }
      </div>
      <hr />
      <h2>{userAccount ? "" : "No"} Wallet Selected</h2>
      {userAccount &&
        <div className="selectedWallet">
          <img src={selectedWallet?.info.icon} alt={selectedWallet?.info.name} />
          <div>{selectedWallet?.info.name}</div>
          <div>({formatAddress(userAccount)})</div>
        </div>
        
      }

      {balance &&
        <div className="selectedWallet">
          <div>{balance}</div>
        </div>
      }
      <hr />

      {userAccount && 
        <div>
          <div className="games">
            <div className='row'>
              <h2>choose a game:</h2>
              <button key="createNewGameButton" onClick={() => handleCreateNewGame()} >create new game</button>
            </div>
            {
              games.length > 0 ? games?.map((address: string) => (
                <div>
                  <button key={address} onClick={() => handleLoadGame(address)} >
                    <div>{address}</div>
                  </button>
                </div>
              )) :
                <div>
                  No games available
                </div>
            }
          </div>
          <hr />
        </div>
      }

      {betsFilled &&
        <div>
          {managerAddress && 
            <h4>manager: {managerAddress}</h4>
          }
          {gameState == 1 && <h4>gameState: {gameState.toString()} - BettingPhase</h4>}
          {gameState == 2 && <h4>gameState: {gameState.toString()} - EvaluationPhase</h4>}
          {gameState == 3 && <h4>gameState: {gameState.toString()} - VerificationPhase</h4>}
          {gameState == 4 && <h4>gameState: {gameState.toString()} - GameEnded</h4>}

          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell align='center'>Voter</TableCell>
                  <TableCell align="center">hashed number</TableCell>
                  <TableCell align="center">verified</TableCell>
                  <TableCell align="center">verifiedChosenNumber</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bets.map((bet) => (
                  <TableRow
                    key={bet.name}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {bet.name}
                    </TableCell>
                    <TableCell align="center">{bet.hashedNumber}</TableCell>
                    <TableCell align="center">{bet.verified}</TableCell>
                    <TableCell align="center">{bet.verifiedChosenNumber}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            { gameState == GameState.Betting &&            
              <form>
                <TextField label="bet" id="betInputTextField" defaultValue="" variant="filled" name="betInput" onChange={(e) => setBetInputValue(e.target.value)} />
                <TextField label="secretPassword" id="passwordInputTextField" defaultValue="" variant="filled" name="passwordInput" onChange={(e) => setPasswordInputValue(e.target.value)} />
                <Button key="submitBetButton" variant="contained" size='large' onClick={() => handleSubmitBet()}>submit</Button>
              </form>
            }
            <hr />
            { gameState == GameState.Betting &&            
              <div>
                <div>
                  <Button key="beginVerificationButton" variant="contained" size='large' onClick={() => handleBeginVerification()}>begin verification</Button>
                </div>
                <hr />
              </div>
            }

            { gameState == GameState.Verification &&            
              <div>
                <div>
                  <TextField label="bet" id="verifyBetInputTextField" defaultValue="" variant="filled" name="betInput" onChange={(e) => setBetInputValue(e.target.value)} />
                  <TextField label="secretPassword" id="verifyPasswordInputTextField" defaultValue="" variant="filled" name="passwordInput" onChange={(e) => setPasswordInputValue(e.target.value)} />
                  <Button key="submitVerifyButton" variant="contained" size='large' onClick={() => handleSubmitVerify()}>submit verification</Button>
                </div>
                <hr />
              </div>
            }

            { gameState == GameState.Verification &&            
              <div>
                <div>
                  <Button key="beginEvaluationButton" variant="contained" size='large' onClick={() => handleBeginEvaluation()}>begin evaluation</Button>
                </div>
                <hr />
              </div>
            }

            { gameState == GameState.Evaluation &&            

            <div>
              <Button key="endGameButton" variant="contained" size='large' onClick={() => handleEndGame()}>end game</Button>
              <hr />
            </div>
            }

            {winner &&
            <div>winner: {winner}</div>
            }
            {winnerPrize &&
            <div>winnerPrize: {winnerPrize}</div>
            }
            {managerFee &&
            <div>managerFee: {managerFee}</div>
            }

          </TableContainer>
          <hr />

        </div>
      }
      <div className="mmError" style={isError ? { backgroundColor: "brown" } : {}}>
        {isError &&
          <div onClick={clearError}>
            <strong>Error:</strong> {errorMessage}
          </div>
        }
      </div>
      <Snackbar
              open={open}
              autoHideDuration={5000}
              onClose={handleClose}
              message={snackBarMessage}
            />
      

    </div>
  )

  function generateNumberHash(number: number, password: string, address: ethers.AddressLike) {
    return ethers.solidityPackedKeccak256(["uint16", "string", "address"], [number, password, address]);
  }
  
  /*
  function keyToBase64String(key: string): string{
    return forge.util.encode64(key);
  }*/

  function getGameFactoryAbi(){
    return [
      // Read-Only Functions
      "function getManagedGames() public view returns (address[] memory)",
      "function getDecentralizedGames() public view returns (address[] memory)",
      "function getLastManagedGameAddress() public view returns (address)",
      "function getLastDecentralizedGameAddress() public view returns (address)",
  
      // Authenticated Functions
      "function createManagedGame(string memory publicKeyManager) public",
      "function createDecentralizedGame() public",
    ];
  }

  function getGameAbi(){
    return [
      "constructor(address _manager)",
      // Read-Only Functions
      "function getManager() external view returns (address)",
      "function getBalance() public view returns (uint)",
      "function getPossibleWinnerList() public view returns (address[] memory)",
      "function getWinner() public view returns (address)",
      "function getWinnerPrize() public view returns (uint)",
      "function getManagerFee() public view returns (uint)",
      "function getBets() public view returns (tuple(address, bytes32, uint16, bool)[] memory)",
      "function getGameState() public view returns (uint)",
  
      // Authenticated Functions
      "function bet(bytes32 _numberHash) external payable",
      "function beginVerification(string memory message) external",
      "function verifyEncryptedNumber(uint16 _chosenNumer, string memory _secretPassword) external",
      "function beginEvaluation(string memory message) external",
      "function endGame() external",

      // events
      "event GameCreated(address manager, string message)",
      "event WinnerAnnouncement(address winner, uint winnerPrize, uint16 winnerBet)",
      "event EvaluationPhaseStarted(string decryptionKey, string message)"
    ];
  }
}

interface IVote {
  name: string; 
  hashedNumber: string;
  verifiedChosenNumber: number;
  verified: string;
}


export default App;


