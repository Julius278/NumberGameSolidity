package com.julius.web3.service.deploy.demo;

import com.julius.web3.contracts.DecentralizedGame;
import com.julius.web3.contracts.GameFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.WalletUtils;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tx.gas.StaticEIP1559GasProvider;

import java.math.BigInteger;


public class DecentralizedGameDemo {

	public static final Logger LOGGER = LoggerFactory.getLogger(DecentralizedGameDemo.class);
	public static final String KEY_FILE_PATH = System.getenv().getOrDefault("KEY_FILE_PATH", "./service/src/main/resources/keyfile.json");
	public static final String KEY_FILE_PASSWORD = System.getenv().getOrDefault("KEY_FILE_PASSWORD", "password");
	public static final String EVM_NODE_URL = System.getenv().getOrDefault("EVM_NODE_URL", "https://rpc-amoy.polygon.technology/");
	//public static final String EVM_NODE_URL = "http://localhost:8545/";

	public static void main(String[] args) throws Exception {
		// setup for general node query
		final Web3j web3jConnection = Web3j.build(new HttpService(EVM_NODE_URL));
		long chainID = web3jConnection.ethChainId().send().getChainId().longValue();
		LOGGER.info("connected node: {}", web3jConnection.web3ClientVersion().send().getWeb3ClientVersion());
		LOGGER.info("current block number: {}", web3jConnection.ethBlockNumber().send().getBlockNumber());
		LOGGER.info("chainID: {}", chainID);

		BigInteger maxPriorityFeePerGas = web3jConnection.ethMaxPriorityFeePerGas().send().getMaxPriorityFeePerGas();
		BigInteger baseFee =
				web3jConnection.ethGetBlockByNumber(DefaultBlockParameterName.LATEST, false)
						.send()
						.getBlock()
						.getBaseFeePerGas();
		BigInteger maxFeePerGas = baseFee.multiply(BigInteger.valueOf(2)).add(maxPriorityFeePerGas);

		LOGGER.info("loading credentials from file: {}", KEY_FILE_PATH);
		// setup for sending transactions
		final Credentials credentials = WalletUtils.loadCredentials(KEY_FILE_PASSWORD, KEY_FILE_PATH);
		LOGGER.info("credentials: {}", credentials.getAddress());
		LOGGER.info("funding: {}", web3jConnection.ethGetBalance(credentials.getAddress(), DefaultBlockParameterName.LATEST).send().getBalance());

		final ContractGasProvider gasProvider = new StaticEIP1559GasProvider(chainID, maxFeePerGas, maxPriorityFeePerGas, BigInteger.valueOf(9000000L));

		LOGGER.info("deploying GameFactory");
		GameFactory factory = GameFactory.deploy(web3jConnection, credentials, gasProvider).send();

		LOGGER.info("deployed GameFactory with address {}", factory.getContractAddress());

		factory.createDecentralizedGame().send();

		String gameAddress = factory.getLastDecentralizedGameAddress().send();
		LOGGER.info("last decentralized game address: {}", gameAddress);

		DecentralizedGame game = DecentralizedGame.load(gameAddress, web3jConnection, credentials, gasProvider);
		LOGGER.info("loaded DecentralizedGame");
		String manager = game.manager().send();
		LOGGER.info("manager '{}' successfully deployed the GameFactory and created a decentralized game", manager);
		/*List<ManagedGame.Bet> bets = game.getBets().send();
		bets.forEach(bet -> System.out.println("bet " + bet.voter + ", " + bet.encryptedNumber));*/
	}
}
