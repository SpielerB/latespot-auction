import 'dotenv/config';
import {Contract, Wallet} from 'ethers';
import {ethers} from 'hardhat';
import {abi, address} from './contract/AuctionV3Upgradeable.json'
import crypto from 'crypto';
import fetch from 'node-fetch';
import {createSignature, setBalance} from '../test/helper';

async function main() {
    const owner = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    const signer = new Wallet(process.env.SIGNER_PRIVATE_KEY as string, ethers.provider);
    const contract = new Contract(address, abi, owner);

    const {price: busdPrice} = (await (await fetch('https://api.binance.com/api/v3/avgPrice?symbol=ETHBUSD')).json()) as any
    const {result: {ProposeGasPrice}} = (await (await fetch("https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=CUU9ZE65KAS27K71PQPIAHRTTQG9781B8J")).json());
    const gasPrice = ProposeGasPrice * 1e9;
    console.info(`Current gas price is ${ProposeGasPrice} GWEI`);
    console.info(`Current ETH price is ${busdPrice} BUSD`);

    console.info("Generating random wallets with funds");
    const wallets: Wallet[] = [];
    for (let i = 0; i < 1000; ++i) {
        const id = crypto.randomBytes(32).toString('hex');
        const privateKey = "0x" + id;
        const wallet = new ethers.Wallet(privateKey, ethers.provider);
        await setBalance(wallet.address, ethers.utils.parseEther("1000"))
        wallets.push(wallet);
    }

    {
        console.info("Checking price for whitelisting 1000 wallets");
        const tx = await (await contract.whitelist(wallets.map(w => w.address))).wait();
        const gasCostTotal = ethers.utils.formatEther(tx.gasUsed.mul(gasPrice));
        const gasCostPerWhitelist = +gasCostTotal / 1000;
        const busdCostTotal = +gasCostTotal * busdPrice;
        const busdCostPerWhitelist = gasCostPerWhitelist * busdPrice;
        console.info(`Whitelisting 1000 wallets costs ${gasCostTotal} ETH or ${busdCostTotal} BUSD. This results in a single whitelist costing ${gasCostPerWhitelist} ETH or ${busdCostPerWhitelist} BUSD`)
    }

    const privateMintPrice = ethers.utils.parseEther('0.0001');
    {
        console.info("Checking Price for starting private mint");

        const tx = await (await contract.startPrivateMint(privateMintPrice, 1000, 1000)).wait();
        const gasCostTotal = ethers.utils.formatEther(tx.gasUsed.mul(gasPrice));
        const busdCostTotal = +gasCostTotal * busdPrice;
        console.info(`Starting the private mint costs ${gasCostTotal} ETH or ${busdCostTotal} BUSD.`)
    }

    await contract.whitelist([owner.address]);

    let tokensBought = 1;
    const value = privateMintPrice;
    const signature = createSignature(owner.address, value, "private", signer);
    const tx = await (await contract.privateMint(signature, {value})).wait();
    {
        console.info("Checking Price for minting tokens in the private mint");
        for (let i = 1; i <= 5; ++i) {
            const wallet = wallets[i];
            const walletContract = contract.connect(wallet);
            const value = privateMintPrice.mul(i);
            const signature = createSignature(wallet.address, value, "private", signer);
            const tx = await (await walletContract.privateMint(signature, {value})).wait();

            const gasCostTotal = ethers.utils.formatEther(tx.gasUsed.mul(gasPrice));
            const gasCostPerToken = +gasCostTotal / i;
            const busdCostTotal = +gasCostTotal * busdPrice;
            const busdCostPerToken = gasCostPerToken * busdPrice;
            console.info(`Minting ${i} tokens in the private mint costs ${gasCostTotal} ETH or ${busdCostTotal} BUSD. This results in a single token costing ${gasCostPerToken} ETH or ${busdCostPerToken} BUSD`);
            tokensBought += i;
        }
    }
    {
        console.info("Mint remaining tokens");
        const wallet = wallets[Math.floor(Math.random() * wallets.length)];
        const walletContract = contract.connect(wallet);
        const value = privateMintPrice.mul(1000 - tokensBought);
        const signature = createSignature(wallet.address, value, "private", signer);
        await walletContract.privateMint(signature, {value});
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
