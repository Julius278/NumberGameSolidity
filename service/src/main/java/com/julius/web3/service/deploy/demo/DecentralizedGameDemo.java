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
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.tx.gas.DynamicEIP1559GasProvider;
import org.web3j.tx.gas.StaticEIP1559GasProvider;

import java.math.BigInteger;


public class DecentralizedGameDemo {

	public static final Logger LOGGER = LoggerFactory.getLogger(DecentralizedGameDemo.class);
	public static final String KEY_FILE_PATH = "./service/src/main/resources/keyfile.json";
	public static final String KEY_FILE_PASSWORD = "password";
	//public static final String EVM_NODE_URL = "https://rpc-amoy.polygon.technology/";
	public static final String EVM_NODE_URL = "http://localhost:8545/";

	public static void main(String[] args) throws Exception {

		// setup for general node query
		final Web3j web3jConnection = Web3j.build(new HttpService(EVM_NODE_URL));
		//long chainID = Long.parseLong(web3jConnection.netVersion().send().getNetVersion());
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

		// setup for sending transactions
		final Credentials credentials = WalletUtils.loadCredentials(KEY_FILE_PASSWORD, KEY_FILE_PATH);
		LOGGER.info("credentials: {}", credentials.getAddress());
		LOGGER.info("funding: {}", web3jConnection.ethGetBalance(credentials.getAddress(), DefaultBlockParameterName.LATEST).send().getBalance());
		//System.out.println(web3jConnection.ethGasPrice().send().getGasPrice());


		//final ContractGasProvider gasProvider = EVM_NODE_ADDRESS.contains("localhost") ? new DefaultGasProvider() : new DynamicEIP1559GasProvider(web3jConnection, chainID);
		//final ContractGasProvider gasProvider = new DynamicEIP1559GasProvider(web3jConnection, chainID);
		final ContractGasProvider gasProvider = new StaticEIP1559GasProvider(chainID, maxFeePerGas, maxPriorityFeePerGas, BigInteger.valueOf(9000000L));

		LOGGER.info("deploying GameFactory");
		GameFactory factory = GameFactory.deploy(web3jConnection, credentials, gasProvider).send();

		LOGGER.info("deployed GameFactory with address {}", factory.getContractAddress());

		factory.createDecentralizedGame().send();

		String gameAddress = factory.getLastDecentralizedGameAddress().send();
		LOGGER.info("last decentralized game address: {}", gameAddress);

		DecentralizedGame game = DecentralizedGame.load(gameAddress, web3jConnection, credentials, gasProvider);
		LOGGER.info("loaded DecentralizedGame");
		String manager = game.getManager().send();
		LOGGER.info("manager '{}' successfully deployed the GameFactory and created a decentralized game", manager);
		/*List<ManagedGame.Bet> bets = game.getBets().send();
		bets.forEach(bet -> System.out.println("bet " + bet.voter + ", " + bet.encryptedNumber));*/
	}
}
