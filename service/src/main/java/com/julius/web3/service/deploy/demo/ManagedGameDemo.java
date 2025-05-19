package com.julius.web3.service.deploy.demo;

import com.julius.web3.contracts.GameFactory;
import com.julius.web3.contracts.ManagedGame;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.WalletUtils;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.tx.gas.DynamicEIP1559GasProvider;

import java.util.List;


public class ManagedGameDemo {

	public static final Logger LOGGER = LoggerFactory.getLogger(ManagedGameDemo.class);
	public static final String KEY_FILE_PATH = "./service/src/main/resources/keyfile.json";
	public static final String KEY_FILE_PASSWORD = "password";
	//public static final String ETH_SERVER_ADDRESS = "https://rpc-amoy.polygon.technology/";
	public static final String ETH_SERVER_ADDRESS = "http://localhost:8545/";

	public static void main(String[] args) throws Exception {

		// setup for general node query
		final Web3j web3jConnection = Web3j.build(new HttpService(ETH_SERVER_ADDRESS));
		Long chainID = Long.parseLong(web3jConnection.netVersion().send().getNetVersion());
		LOGGER.info("connected node: {}", web3jConnection.web3ClientVersion().send().getWeb3ClientVersion());
		LOGGER.info("current block number: {}", web3jConnection.ethBlockNumber().send().getBlockNumber());
		LOGGER.info("chainID: {}", chainID);

		// setup for sending transactions
		final Credentials credentials = WalletUtils.loadCredentials(KEY_FILE_PASSWORD, KEY_FILE_PATH);
		LOGGER.info("credentials: {}", credentials.getAddress());
		LOGGER.info("funding: {}", web3jConnection.ethGetBalance(credentials.getAddress(), DefaultBlockParameterName.LATEST).send().getBalance());
		//System.out.println(web3jConnection.ethGasPrice().send().getGasPrice());
		//final ContractGasProvider gasProvider = new DynamicEIP1559GasProvider(web3jConnection, chainID);
		final ContractGasProvider gasProvider = new DefaultGasProvider();


		GameFactory factory = GameFactory.deploy(web3jConnection, credentials, gasProvider).send();

		LOGGER.info("deployed GameFactory with address {}", factory.getContractAddress());

		factory.createManagedGame("pubKey").send();

		String gameAddress = factory.getLastManagedGameAddress().send();
		LOGGER.info("last managed game address: {}", gameAddress);

		ManagedGame game = ManagedGame.load(gameAddress, web3jConnection, credentials, gasProvider);
		LOGGER.info("loaded ManagedGame");
		String manager = game.manager().send();
		LOGGER.info("manager: {}", manager);
		List<ManagedGame.Bet> bets = game.getBets().send();
		bets.forEach(bet -> System.out.println("bet " + bet.voter + ", " + bet.encryptedNumber));
	}
}
