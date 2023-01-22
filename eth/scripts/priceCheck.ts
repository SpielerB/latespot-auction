import 'dotenv/config';
import {Contract, Wallet} from 'ethers';
import {ethers} from 'hardhat';
import contractData from '../artifacts/contracts/AuctionV2.sol/AuctionV2.json';
import {address} from './contract/AuctionV2.json'
import crypto from 'crypto';
import fetch from 'node-fetch';
import {createSignature, setBalance} from '../test/helper';

async function main() {
    const owner = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    const signer = new Wallet(process.env.SIGNER_PRIVATE_KEY as string, ethers.provider);
    const contract = new Contract(address, contractData.abi, owner);

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
    await contract.whitelist(wallets.map(wallet => wallet.address));

    {
        console.info("Checking price for whitelisting 1000 wallets");
        const tx = await (await contract.whitelist(wallets.map(w => w.address))).wait();
        const gasCostTotal = ethers.utils.formatEther(tx.gasUsed.mul(gasPrice));
        const gasCostPerWhitelist = +gasCostTotal / 1000;
        const busdCostTotal = +gasCostTotal * busdPrice;
        const busdCostPerWhitelist = gasCostPerWhitelist * busdPrice;
        console.info(`Whitelisting 1000 wallets costs ${gasCostTotal} ETH or ${busdCostTotal} BUSD. This results in a single whitelist costing ${gasCostPerWhitelist} ETH or ${busdCostPerWhitelist} BUSD`)
    }

    {
        console.info("Checking price for de-whitelisting 1000 wallets");
        const tx = await (await contract.unWhitelist(wallets.map(w => w.address))).wait();
        const gasCostTotal = ethers.utils.formatEther(tx.gasUsed.mul(gasPrice));
        const gasCostPerUnWhitelist = +gasCostTotal / 1000;
        const busdCostTotal = +gasCostTotal * busdPrice;
        const busdCostPerUnWhitelist = gasCostPerUnWhitelist * busdPrice;
        console.info(`de whitelisting 1000 wallets costs ${gasCostTotal} ETH or ${busdCostTotal} BUSD. This results in a single whitelist costing ${gasCostPerUnWhitelist} ETH or ${busdCostPerUnWhitelist} BUSD`)
    }

    console.info("Re-whitelisting contracts for further checks")
    await contract.whitelist(wallets.map(wallet => wallet.address));

    const privateAuctionPrice = ethers.utils.parseEther('0.0001');
    {
        console.info("Checking Price for starting private auction");

        const tx = await (await contract.startPrivateAuction(privateAuctionPrice, 1000, 1000)).wait();
        const gasCostTotal = ethers.utils.formatEther(tx.gasUsed.mul(gasPrice));
        const busdCostTotal = +gasCostTotal * busdPrice;
        console.info(`Starting the private auction costs ${gasCostTotal} ETH or ${busdCostTotal} BUSD.`)
    }

    await contract.whitelist([owner.address]);

    let tokensBought = 1;
    const value = privateAuctionPrice;
    const signature = createSignature(owner.address, value, "private", signer);
    const tx = await (await contract.buyPrivateAuction(signature, {value})).wait();
    {
        console.info("Checking Price for buying tickets in the private auction");
        for (let i = 1; i <= 5; ++i) {
            const wallet = wallets[i];
            const walletContract = contract.connect(wallet);
            const value = privateAuctionPrice.mul(i);
            const signature = createSignature(wallet.address, value, "private", signer);
            const tx = await (await walletContract.buyPrivateAuction(signature, {value})).wait();

            const gasCostTotal = ethers.utils.formatEther(tx.gasUsed.mul(gasPrice));
            const gasCostPerToken = +gasCostTotal / i;
            const busdCostTotal = +gasCostTotal * busdPrice;
            const busdCostPerToken = gasCostPerToken * busdPrice;
            console.info(`Buying ${i} tickets in the private auction costs ${gasCostTotal} ETH or ${busdCostTotal} BUSD. This results in a single ticket costing ${gasCostPerToken} ETH or ${busdCostPerToken} BUSD`);
            tokensBought += i;
        }
    }
    {
        console.info("Buying remaining tokens");
        const wallet = wallets[Math.floor(Math.random() * wallets.length)];
        const walletContract = contract.connect(wallet);
        const value = privateAuctionPrice.mul(1000 - tokensBought);
        const signature = createSignature(wallet.address, value, "private", signer);
        await walletContract.buyPrivateAuction(signature, {value});
    }
    {
        console.info("Checking Price for minting 1000 tokens");

        const tx = await (await contract.mintAndDistribute(1000)).wait();
        const gasCostTotal = ethers.utils.formatEther(tx.gasUsed.mul(gasPrice));
        const gasCostPerToken = +gasCostTotal / 1000;
        const busdCostTotal = +gasCostTotal * busdPrice;
        const busdCostPerToken = gasCostPerToken * busdPrice;
        console.info(`Minting 1000 tokens costs ${gasCostTotal} ETH or ${busdCostTotal} BUSD. This results in a single minted token costing ${gasCostPerToken} ETH or ${busdCostPerToken} BUSD`)
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
