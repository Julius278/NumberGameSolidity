import React, { useState } from 'react';
import { AbstractProvider, BrowserProvider, ethers, getDefaultProvider } from 'ethers';

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

import forge from 'node-forge';


function App() {

  enum GameState {
    Created,
    Betting,
    Evaluation,
    Ended
}

  const [selectedWallet, setSelectedWallet] = useState<EIP6963ProviderDetail>()

  const factoryAddress = "0xc3bebaef6394f5a524d33da7305082492648d958";

  const providers = useSyncProviders();
  const [userAccount, setUserAccount] = useState<string>("");
  const [balance, setBalance] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");
  const [betInputValue, setInputValue] = useState("");
  const [privateKeyInputValue, setPrivateKeyInputValue] = useState("");

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
  
  //let address = "0x564d330ec94160101f773144dbe254b3f1c7c0fb";

  //let privKey = "LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ0KTUlJRXBBSUJBQUtDQVFFQXVHcDduV0tuRUFiRERmeFQ4ckRueVNPUlB5dkJHcGVxb2puZElZSDFtYVlyTHppZA0KNlBWeDR6QkVMcmNIeURUZ0xiUkRDNkw1TnNHLzJFWklMbmFTYXBvNFhHTTJsY0NrOEp6LzJsVWhnWW1rdE1vWQ0KZHRRWFVzMDFQWW1pUGpESEo1KzF5dDdhcXk5MXRYdTNFQzYyd0ZyTXRPS2h5dW9ERXNsZGVzWFQ2enlIZWQ2YQ0KNytwS1pLbnJCaFRMUWxIUGFzYWg0ZlhTMGM4ckpJbVJyN3pMVlBJNFNIbWRJV1JJclplUVAxdkg5ZU02VU83UA0KRUdPTnVUNWs2cVZEUE94WGNGdk9qemIxcFBGN3ErT1lWT2tPRndBeSs1Y1RVb2tPcm5DMThsb0ZzWUh1VXhsdA0KcXB1cWxqaTlQV3V2ZHFzTUZmc2lPU25MdEVQcnhUdnFYVkU5K3dJREFRQUJBb0lCQVFDdTBWSnBlZEdBNGNnYQ0KQSs3WWkxYk9WNGNpNlNsZk9oTXBRYzBjTElSVHFUQWF6WUwwQ1doeXc1aCs2RWJhUlRXV1hlR0lzRytxdHJSVQ0KSXh2ZDM4MGdmUjJjaHZpQnNXTXFMTXBsZ0hvSXdDQ0F1V3ZEaVg2cW9aa3N3c0lvVGprY21Ndk9pcitqczVQVA0KL0hrblFBRkNDMUV1MEFBcnlQWXM0dkpZcGh3a1MxcncvbFlmWXNvcnErd1BzQUdWejZIU2M3L0ExME13NCtjRw0KenBPMUs2cEI0UU9DMVgxSmJmcjZaT1E1cDM1RXhSOCtjdzFPQzFFeEFPWHN1aGdVbldGS1I0cEFYdmUva3FHUw0KdUpEZjhKSFNHSlpLbkw5eWwrRk5vUHI5VmpST2ZKckVMMlRZYlNZb0hDTFJuNWtVdkRvcXRGdmlYRGhrRjBxUA0KblRlYmUrOFJBb0dCQU51bEltL2NxUWF4bXZvZC9naktyS3Q5akZZdWUrL0N3SmVUNng4MFNIamR5NlJWNmNDWA0KZUxLNXZqdFBpLzlDdUFpaUl4Zi9Bb0ppa3dvcTVMWnByU2VPdVZ2aCt3UTFnSzFSODZDZ1MrZ1FkS0I5WnJ2WA0KOWpRUFVHSVRSL2JMTmtibjJMTjk0U2RZaGdYNVFnQy9LMFNCYjJyUkdVT0QxUmtqQWJOYUpsRGxBb0dCQU5idw0KbkRJU3Y1c01HTjk0Tm5lTDJ5T1NheDNOZ1puR3duWEF6cnNmUzFsQ0ZuNU9jdEdPdWx2VE1vaUNPRVNJWmhnKw0KWGRPUDFNNFNQK1JqaUNCdzByREV5M1o1NzJmUHRMVzBSeklDd0llTThXSkVublFsRXFDMlBmUGQ4ZDU4dkt1VA0KMjIzUjFjbjh6Z1lXVXFuazdabUVCUThqL2FvZURsc0IzRXpRNWNWZkFvR0FVbm5xdVhoeFc5c2JKNnBWZHJXcw0KS3VVRTZtT2dGRUxjRU03eGJoRXkyWGZuZlBqcHduRGVXTFpZa1dyb1ZkeVd3Rjhwc0Z3SWRDOVJxWEs3MlNkTA0KWnR3NERDR0tJV1Y1d1J0UjBWSC96czlIQy9DcXdBUnpKYzlPVHRXUW8wSmhTalRLOFhObU5XRVBTblR6Yk5aYw0KQitoV2p4U2ZXUFBLOUJwcURBL2c3V1VDZ1lCdmhNbFZ4WnA2UkkySExLVDk0NmRnVG5DYk51ditNRHptd1pIQg0KVHB4V2hFNk5YQUNBcjlBTElvbitmNm5ZRFBrRHJTQWJTMjM3T1ViREpjMFVIOVdBOTZvbEgyRFNlTmJteTlHQQ0KcGlMa2NZRXdIakFrVExQY2hKR2lQTTVvUkVuVHI5UlNwMk9IK0UyZ3BPWmcxYkZkVEQwZnZPbTQ0UDFMeEt4Yg0KZ3Fza2V3S0JnUUNiL3orem0zRVZ0czM3MHJpbjJJeDlSK21LK0VIdjFDQjVjaHRRaEZPcEdWZ3NQME1NWWJRZw0KZXVIUmNHRmpPNHBPTkp2Rm5UeGtLa3dDVzdzWVFTU24vUUpObjFkYUVuSDdVdnFCdHdaWis5REI4N1VsQ2RGbw0Kb09uemFsYkF5SzZGQlVudm1meUg2bXBXSXpJMTJtV0hjNzZHKzZmbDY0dnR0YnBvRGdlcW13PT0NCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tDQo=";
  let pubKey = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0NCk1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBdUdwN25XS25FQWJERGZ4VDhyRG4NCnlTT1JQeXZCR3BlcW9qbmRJWUgxbWFZckx6aWQ2UFZ4NHpCRUxyY0h5RFRnTGJSREM2TDVOc0cvMkVaSUxuYVMNCmFwbzRYR00ybGNDazhKei8ybFVoZ1lta3RNb1lkdFFYVXMwMVBZbWlQakRISjUrMXl0N2FxeTkxdFh1M0VDNjINCndGck10T0toeXVvREVzbGRlc1hUNnp5SGVkNmE3K3BLWktuckJoVExRbEhQYXNhaDRmWFMwYzhySkltUnI3ekwNClZQSTRTSG1kSVdSSXJaZVFQMXZIOWVNNlVPN1BFR09OdVQ1azZxVkRQT3hYY0Z2T2p6YjFwUEY3cStPWVZPa08NCkZ3QXkrNWNUVW9rT3JuQzE4bG9Gc1lIdVV4bHRxcHVxbGppOVBXdXZkcXNNRmZzaU9Tbkx0RVByeFR2cVhWRTkNCit3SURBUUFCDQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0NCg==";
  

  //ethers.ContractFactory.
  
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

      //const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair(2048);
      //let pub = keyToBase64String(forge.pki.publicKeyToPem(publicKey))
      //let privKey = keyToBase64String(forge.pki.privateKeyToPem(privateKey));

      let prov = provider as BrowserProvider;
      let signerInstance = await prov.getSigner();

      let factoryContract = new ethers.Contract(factoryAddress, getGameFactoryAbi(), signerInstance);

      console.log("pubKey manager: %s", pubKey);

      let gasPrice = (await provider.getFeeData()).gasPrice
      console.log("gasPrice: %s", gasPrice)


      let estimatedGas = await factoryContract.createManagedGame.estimateGas(pubKey);
      console.log("estimatedGas: %s", estimatedGas);
      await(await factoryContract.createManagedGame(pubKey, {
        gasLimit: estimatedGas,
        gasPrice: gasPrice
      }));

      console.log("new game created");
      
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

      let managerPublicKey = await gameContract.getManagerPublicKey();
      console.log(managerPublicKey);
      
      if(betInputValue == ""){
        setSnackBarMessage("bet input value is empty");
        setOpen(true);
      } else {
        let encryptedNumber = encryptMessage(managerPublicKey, betInputValue);
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


      }
      console.log("bet call ended")
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

      if(privateKeyInputValue == ""){
        setSnackBarMessage("private key input is empty");
        setOpen(true);
      } else {
        await retrieveBets(gameAddress, signerInstance);

        console.log("analyze bets")

        let addresses: Array<string> = new Array<string>();
        let values: Array<Number> = new Array<Number>();
        bets.forEach((bet: IVote) => {
          addresses.push(bet.name);
          let value: Number = Number(decryptMessage(privateKeyInputValue, bet.encryptedNumber));
          values.push(value);
        });
        console.log("addresses: %s", addresses);
        console.log("values: %s", values);

        let estimatedGas: bigint = await gameContract.endGame.estimateGas(addresses, values);
        let gasPrice = (await provider.getFeeData()).gasPrice
        console.log("gasPrice: %s", gasPrice)
        console.log("estimatedGas: %s", estimatedGas)

        await gameContract.endGame(addresses, values, {
          gasLimit: estimatedGas,
          gasPrice: gasPrice
        });
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

      let estimatedGas: bigint = await gameContract.beginEvaluation.estimateGas(privateKeyInputValue, "this is a test message for evaluation start");
      let gasPrice = (await provider.getFeeData()).gasPrice
      console.log("gasPrice: %s", gasPrice)
      console.log("estimatedGas: %s", estimatedGas)

      console.log("begin evaluation");
      await gameContract.beginEvaluation(privateKeyInputValue, "test", {
        gasPrice: gasPrice,
        gasLimit: estimatedGas
      });

      let state = await gameContract.getGameState();
      setGameState(state);
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

    let games = await factoryContract.getGames() as string[];
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
      votes.push(createData(bet[0], bet[1]));
    });
    setBets(votes);
    setBetsFilled(true);

    let gameState = await gameContract.getGameState() as Number;
    setGameState(gameState)

    if(gameState == GameState.Ended){
      checkWinnerState(gameContract);
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
    encryptedNumber: string,
  ) {
    return { name, encryptedNumber };
  }

  return (
    
    <div className="App">
      <h2>Managed Game</h2>
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
          {gameState == 3 && <h4>gameState: {gameState.toString()} - GameEnded</h4>}

          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell>Voter</TableCell>
                  <TableCell align="right">encrypted number</TableCell>
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
                    <TableCell align="right">{bet.encryptedNumber}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            { gameState == GameState.Betting &&            
              <form>
                <TextField label="bet" id="filled-size-normal" defaultValue="" variant="filled" name="betInput" onChange={(e) => setInputValue(e.target.value)} />
                <Button key="submitBetButton" variant="contained" size='large' onClick={() => handleSubmitBet()}>submit</Button>
              </form>
            }
            <hr />
            { gameState == GameState.Betting &&            
              <div>
                <div>
                  <Button key="beginEvaluationButton" variant="contained" size='large' onClick={() => handleBeginEvaluation()}>begin evaluation</Button>
                </div>
                <hr />
              </div>
            }

            { gameState == GameState.Evaluation &&            

            <div>
              <TextField label="privateKeyInput" id="filled-size-normal" defaultValue="" variant="filled" name="privateKeyInout" onChange={(e) => setPrivateKeyInputValue(e.target.value)} />
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

  function base64ToPemKey(base64String: string) {
    return forge.util.decode64(base64String);
  }

  function encryptMessage(publicKey: string , message: string) {
    const publicKeyForge = forge.pki.publicKeyFromPem(base64ToPemKey(publicKey));
    const encrypted = publicKeyForge.encrypt(forge.util.encodeUtf8(message));
    return forge.util.encode64(encrypted);
  }
  
  function decryptMessage(privateKey: string, encryptedMessage: string) {
    const privateKeyForge = forge.pki.privateKeyFromPem(base64ToPemKey(privateKey));
    const decodedMessage = forge.util.decode64(encryptedMessage);
    const decrypted = privateKeyForge.decrypt(decodedMessage);
    return forge.util.decodeUtf8(decrypted); // Decode from UTF-8
  }
  
  /*
  function keyToBase64String(key: string): string{
    return forge.util.encode64(key);
  }*/

  function getGameFactoryAbi(){
    return [
      // Read-Only Functions
      "function getGames() public view returns (address[] memory)",
      "function getLastGameAddress() public view returns (address)",
  
      // Authenticated Functions
      "function createManagedGame(string memory publicKeyManager) public",
    ];
  }

  function getGameAbi(){
    return [
      "constructor(address _manager, string memory _managerPublicKey)",
      // Read-Only Functions
      "function getManager() external view returns (address)",
      "function getManagerPublicKey() external view returns (string memory)",
      "function getBalance() public view returns (uint)",
      "function getWinner() public view returns (address[] memory)",
      "function getWinnerPrize() public view returns (uint)",
      "function getManagerFee() public view returns (uint)",
      "function getBets() public view returns (tuple(address, string, uint)[] memory)",
      "function getGameState() public view returns (uint)",
  
      // Authenticated Functions
      "function bet(string memory _encryptedNumber) external payable",
      "function beginEvaluation(string memory decryptionKey, string memory message) external",
      "function endGame(address[] memory playerAddresses, uint16[] memory values) external",
      "function determineWinner() internal returns (address[] memory, uint16[] memory)",

      // events
      "event GameCreated(address manager, string message)",
      "event WinnerAnnouncement(address winner, uint winnerPrize, uint16 winnerBet)",
      "event EvaluationPhaseStarted(string decryptionKey, string message)"
    ];
  }
}

interface IVote {
  name: string; 
  encryptedNumber: string;
}

/*const App: React.FC = () => {
    useEffect(() => {
        const exampleFunction = async () => {
            const message = 'Hello, World!';
            const wallet = ethers.Wallet.createRandom(); // Create a random wallet for demonstration

            const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair(2048);

            // Sign the message
            const signature = await wallet.signMessage(message);
            console.log('Signature:', signature);
            console.log('priv:', privateKey);
            console.log('priv:', keyToBase64String(forge.pki.privateKeyToPem(privateKey)));
            console.log('pub:', keyToBase64String(forge.pki.publicKeyToPem(publicKey)));
            console.log('add:', wallet.address);
        };

        exampleFunction();
    }, []);

    return (
        <div>
            <h1>Hello, Ethers.js!</h1>
        </div>
    );
};*/

export default App;


