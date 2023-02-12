import {Contract, JsonRpcProvider, Wallet} from 'ethers';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import {abi, address} from './contract/AuctionV3Upgradeable.json';
import ContractModel from './model/ContractModel';

const helmet = require("helmet");

dotenv.config();

const port = parseInt((process.env.PORT || 5000) as string, 10);

const privateKey = process.env.SIGNER_PRIVATE_KEY as string;
const network = process.env.NETWORK;

const provider = new JsonRpcProvider(network);

const signer = new Wallet(privateKey, provider);

const contract = new Contract(address, abi, signer);

const app = express();

app.use(helmet());

app.use(bodyParser.json());

app.use(cors()); // Allow cors
morgan.token('remote-addr', (req) => JSON.stringify(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress));

app.use(morgan("[:date[iso]] HTTP/:http-version :method :url :status - :remote-addr - :response-time ms - :user-agent")); // Log requests

let contractModel: ContractModel | undefined = undefined;

const syncContract = async () => {
    try {
        console.info("Syncing contract state");
        const updatedContractModel: ContractModel = {
            privateMint: {
                hasStarted: await contract.privateMintStarted(),
                isActive: await contract.privateMintActive(),
                hasStopped: await contract.privateMintStopped(),
                walletTokens: 0,
                tokensMinted: +(await contract.privateMintTokenCount()).toString(),
                tokenSupply: +(await contract.privateMintSupply()).toString(),
                tokenLimit: +(await contract.privateMintTokensPerWallet()).toString(),
                price: (await contract.privateMintPrice()).toString()
            },
            publicMint: {
                hasStarted: await contract.publicMintStarted(),
                isActive: await contract.publicMintActive(),
                hasStopped: await contract.publicMintStopped(),
                walletTokens: 0,
                tokensMinted: +(await contract.publicMintTokenCount()).toString(),
                tokenSupply: +(await contract.publicMintSupply()).toString(),
                tokenLimit: +(await contract.publicMintTokensPerWallet()).toString(),
                price: (await contract.publicMintPrice()).toString(),
            },
            tokensRevealed: await contract.revealed(),
            mintedTokens: 0,
            balance: 0,
            whitelisted: false
        };
        contractModel = updatedContractModel;
    } catch (error: any) {
        if (error?.code === "BAD_DATA") {
            console.error("Contract returned bad data.");
        } else if (error?.code === "ECONNREFUSED") {
            console.error("Connection to provider failed");
        } else if (error?.code === "CALL_EXCEPTION") {
            console.error("Unable to call contract");
        } else {
            console.error("An error occurred while loading the contract model:", error);
        }
    }
    setTimeout(syncContract, 10000);
}

setTimeout(async () => {
    try {
        // Initialize contract connection
        await contract.privateMintStarted();
    } catch (error) {
        console.error("Error while initializing contract. Continuing with execution.");
    }
    await syncContract();
}, 0);

app.get('/', async (req, res) => {
    if (contractModel) {
        res.send(contractModel);
    } else {
        res.sendStatus(404);
    }
});

app.listen(port, async () => {
    // tslint:disable-next-line:no-console
    console.log(`listening on port ${port}`);
});