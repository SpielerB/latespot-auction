// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import {ethers, network, upgrades} from 'hardhat';
import fetch from 'node-fetch';
import fs from 'fs';
import {Contract, Wallet} from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const {dirname} = require('path');
const appDir = dirname(require.main?.filename);

interface DeployContract {
    name: string;
    params: (dependingContracts: { [key: string]: Contract }) => any[];
    proxy?: boolean;
    dependsOn?: string[];
    upgrade?: boolean;
    upgradeAddress?: string;
}

const ALLOW_UPGRADE = false;

async function main() {
    const owner = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    const signerAddress = new Wallet(process.env.SIGNER_PRIVATE_KEY as string, ethers.provider).address;

    let upgradeAuctionV2 = false;
    let auctionV2UpgradeAddress;
    try {
        const {abi, address} = await import("./contract/AuctionV2Upgradeable.json");
        const existingAuctionV2UpgradeableContract = new Contract(address, abi, owner);
        // Redeploy if the owners don't match
        if ((await existingAuctionV2UpgradeableContract.owner()) === owner.address) {
            upgradeAuctionV2 = ALLOW_UPGRADE && true;
            auctionV2UpgradeAddress = address;
        }
    } catch (e) {
        // (Re)-Deploy the upgradeable auction V2 contract if an error occurs
    }

    const contracts: DeployContract[] = [
        {
            name: "MockChainLink",
            proxy: false,
            params: () => []
        },
        {
            name: 'AuctionV2',
            proxy: false,
            params: ({MockChainLink}) => [
                'LateSpotNFT',
                'LSNFT',
                signerAddress,
                'https://pastebin.com/dl/cH4NfnWU',
                'https://pastebin.com/dl/cH4NfnWU',
                MockChainLink.address,
                42,
                "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc"
            ],
        },
        {
            name: 'AuctionV2Upgradeable',
            proxy: true,
            params: ({MockChainLink}) => [
                'LateSpotNFT',
                'LSNFT',
                signerAddress,
                'https://pastebin.com/dl/cH4NfnWU',
                'https://pastebin.com/dl/cH4NfnWU',
                MockChainLink.address,
                43,
                "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc"
            ],
            upgrade: upgradeAuctionV2,
            upgradeAddress: auctionV2UpgradeAddress
        },
        {name: 'Greeter', proxy: false, params: () => ['Hello World from hardhat!']},
    ];

    console.log(`Deploying contracts on network '${network.name}'`)
    const {price} = (await (await fetch('https://api.binance.com/api/v3/avgPrice?symbol=ETHBUSD')).json()) as any
    const {result: {ProposeGasPrice}} = (await (await fetch("https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=CUU9ZE65KAS27K71PQPIAHRTTQG9781B8J")).json());
    const gasPrice = ProposeGasPrice * 1e9;
    console.log(`Current ETH price: ${price} BUSD`)
    const deployed: { [key: string]: Contract } = {};
    for (const {name, proxy, upgrade, params, upgradeAddress} of contracts) {
        const factory = await ethers.getContractFactory(name);
        let contract;
        if (proxy) {
            if (upgrade) {
                if (!upgradeAddress) {
                    console.error("Missing upgradeAddress parameter to upgrade contract");
                    continue;
                }
                console.log(`Upgrading ${name}`);
                contract = await upgrades.upgradeProxy(upgradeAddress, factory);
            } else {
                console.log(`Deploying ${name}`);
                contract = await upgrades.deployProxy(factory, params(deployed));
            }
        } else {
            console.log(`Deploying ${name}`);
            contract = await factory.deploy(...params(deployed));
        }

        await contract.deployed();
        const tx = await contract.deployTransaction.wait();
        const gasCost = ethers.utils.formatEther(`${tx.gasUsed.mul(gasPrice)}`);

        if (upgrade) {
            console.log(`Contract ${name} (${contract.address}) has been upgraded. (Costs ${gasCost} ETH or ${(+gasCost * price).toFixed(2)} BUSD)`);
        } else {
            console.log(`Contract ${name} deployed to ${contract.address}. (Costs ${gasCost} ETH or ${(+gasCost * price).toFixed(2)} BUSD)`);
        }

        if (appDir) {
            console.log("Loading contract abi");
            const rawContractMetadata = fs.readFileSync(`${appDir}/../artifacts/contracts/${name}.sol/${name}.json`);
            const {abi} = JSON.parse(rawContractMetadata.toString());
            console.log("Saving contract metadata");
            fs.mkdirSync(`${appDir}/../../server/src/contract/`, {recursive: true});
            fs.mkdirSync(`${appDir}/contract/`, {recursive: true});
            fs.writeFileSync(`${appDir}/../../server/src/contract/${name}.json`, JSON.stringify({
                address: contract.address,
                abi
            }, null, 2), {flag: "w"});
            fs.writeFileSync(`${appDir}/contract/${name}.json`, JSON.stringify({
                address: contract.address,
                abi
            }, null, 2), {flag: "w"});
        } else {
            console.error("AppDir unavailable");
        }
        deployed[name] = contract;
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
