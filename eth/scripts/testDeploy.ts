import {ethers, network, upgrades} from 'hardhat';
import fetch from 'node-fetch';
import fs from 'fs';
import {Contract, Wallet} from 'ethers';
import * as dotenv from 'dotenv';
import {setBalance} from '../test/helper';

dotenv.config();

const {dirname} = require('path');
const appDir = dirname(require.main?.filename);

interface DependencyObject {
    [key: string]: Contract;
}

interface DeployContract {
    name: string;
    params: (dependingContracts: DependencyObject) => any[];
    proxy?: boolean;
    dependsOn?: string[];
    upgrade?: boolean;
    upgradeAddress?: string;
}

type ContractData = DeployContract | ((dependingContracts: DependencyObject) => DeployContract);

async function main() {
    if (fs.existsSync(`${appDir}/../../.openzeppelin/unknown-31337.json`)) {
        console.info("Removing openzeppelin proxy data for localhost...");
        fs.rmSync(`${appDir}/../../.openzeppelin/unknown-31337.json`);
    }

    const owner = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    await setBalance(owner.address, ethers.utils.parseEther("1000"));
    const signerAddress = new Wallet(process.env.SIGNER_PRIVATE_KEY as string, ethers.provider).address;

    const contracts: ContractData[] = [
        {
            name: "MockChainLink",
            proxy: false,
            params: () => []
        },
        {
            name: "MockLinkToken",
            proxy: false,
            params: () => []
        },
        {
            name: "MockVRFWrapper",
            proxy: false,
            params: ({MockChainLink}) => [MockChainLink.address]
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
            params: ({MockLinkToken, MockVRFWrapper}) => [
                'LateSpotNFT',
                'LSNFT',
                signerAddress,
                'https://pastebin.com/dl/cH4NfnWU',
                'https://pastebin.com/dl/cH4NfnWU',
                MockLinkToken.address,
                MockVRFWrapper.address,
            ],
            upgrade: false
        },
        ({AuctionV2Upgradeable}) => ({
            name: 'AuctionV3Upgradeable',
            proxy: true,
            params: () => [],
            upgrade: true,
            upgradeAddress: AuctionV2Upgradeable.address
        }),
    ];

    console.log(`Deploying contracts on network '${network.name}'`)
    const {price} = (await (await fetch('https://api.binance.com/api/v3/avgPrice?symbol=ETHBUSD')).json()) as any
    const {result: {ProposeGasPrice}} = (await (await fetch("https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=CUU9ZE65KAS27K71PQPIAHRTTQG9781B8J")).json());
    const gasPrice = ProposeGasPrice * 1e9;
    console.log(`Current ETH price: ${price} BUSD`)
    const deployed: { [key: string]: Contract } = {};
    for (const deployData of contracts) {
        const {
            name,
            proxy,
            upgrade,
            upgradeAddress,
            params
        } = typeof deployData !== "function" ? deployData : deployData(deployed);
        const factory = await ethers.getContractFactory(name, owner);
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
            fs.mkdirSync(`${appDir}/../../server/contract/`, {recursive: true});
            fs.mkdirSync(`${appDir}/contract/`, {recursive: true});
            fs.writeFileSync(`${appDir}/../../server/contract/${name}.json`, JSON.stringify({
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

    if (fs.existsSync(`${appDir}/../../.openzeppelin/unknown-31337.json`)) {
        console.info("Removing openzeppelin proxy data for localhost...");
        fs.rmSync(`${appDir}/../../.openzeppelin/unknown-31337.json`);
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
