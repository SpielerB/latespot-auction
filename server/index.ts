import {AbiCoder, Contract, JsonRpcProvider, keccak256, Wallet} from 'ethers';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import {arrayify} from '@ethersproject/bytes'
import {abi, address} from './contract/AuctionV3Upgradeable.json';

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
app.use(morgan('combined')); // Log requests

let mintPhase: "NONE" | "PRIVATE" | "PRE_PUBLIC" | "PUBLIC" | "FINISHED" = "NONE";


const syncContract = async () => {
    try {
        console.info("Checking mint state.");
        const privateMintStarted = await contract.privateMintStarted();
        if (privateMintStarted) {
            let updatedMintPhase: typeof mintPhase = "PRIVATE";
            if (await contract.privateMintStopped()) {
                updatedMintPhase = "PRE_PUBLIC";
            }
            if (await contract.publicMintStarted()) {
                updatedMintPhase = "PUBLIC";
            }
            if (await contract.publicMintStopped()) {
                updatedMintPhase = "FINISHED";
            }
            if (mintPhase !== updatedMintPhase) {
                console.info("Mint state changed:", updatedMintPhase);
            }
            mintPhase = updatedMintPhase;
        } else {
            console.info("Mint not ready yet.");
        }
    } catch (error: any) {
        if (error?.code === "BAD_DATA") {
            console.error("Contract returned bad data.");
        } else if (error?.code === "ECONNREFUSED") {
            console.error("Connection to provider failed");
        } else {
            console.error("An error occurred while loading the contract ready state:", error);
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
    try {
        if (mintPhase !== "NONE") {
            const data = {
                started: true,
                contractAddress: address,
                abi
            };
            res.send(data);
        } else {
            res.send({started: false, contractAddress: null, abi: null});
        }
    } catch (error) {
        console.error(error);
        res.send({started: false, contractAddress: null, abi: null});
    }
});

app.post('/sign', async (req, res) => {
    try {
        const {value, address} = req.body;
        console.log(`Signing request for ${address}@${value}`)

        if (mintPhase !== "PUBLIC" && mintPhase !== "PRIVATE") {
            console.error("No auction active");
            res.sendStatus(400);
            return;
        }

        const currentMintPhase = mintPhase.toLowerCase();
        const payload = AbiCoder.defaultAbiCoder().encode(['address', 'uint256', 'string'], [address, value, currentMintPhase]);
        const hash = keccak256(payload);
        const signature = await signer.signMessage(arrayify(hash));
        res.send(signature);
    } catch (error) {
        console.error(error);
        res.sendStatus(400);
    }
});

app.listen(port, async () => {
    // tslint:disable-next-line:no-console
    console.log(`listening on port ${port}`);
});