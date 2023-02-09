import {AbiCoder, Contract, JsonRpcProvider, keccak256, Wallet} from 'ethers';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import {arrayify} from '@ethersproject/bytes'
import {abi, address} from './contract/AuctionV2Upgradeable.json';
import {clearInterval} from 'timers';

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

let started = false;
setTimeout(async () => {
    try {
        // Initialize contract connection and set started value
        started = await contract.privateAuctionStarted();
    } catch (error) {
        console.error("Error while initializing contract. Continuing with execution.");
    }
}, 0);

app.get('/', async (req, res) => {
    try {
        if (started) {
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
        const isPrivateAuction = await contract.privateAuctionActive();
        const isPublicAuction = await contract.publicAuctionActive();
        if (!isPrivateAuction && !isPublicAuction) {
            console.error("No auction active");
            res.sendStatus(400);
            return;
        }
        const auctionPhase = isPrivateAuction ? "private" : "public";
        const payload = AbiCoder.defaultAbiCoder().encode(['address', 'uint256', 'string'], [address, value, auctionPhase]);
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

setTimeout(async () => {
    // Wait for provider to avoid spamming the console with reconnects
    await provider._waitUntilReady();
    const intervalId = setInterval(async () => {
        if (provider.ready) {
            try {
                console.info("Checking if contract is ready.");
                started = await contract.privateAuctionStarted();
                if (started) {
                    console.info("Contract is ready. Stopping interval.");
                    clearInterval(intervalId);
                } else {
                    console.info("Contract not ready yet.");
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
        }
    }, 10000);

    if (started) {
        console.info("Contract is ready");
        clearInterval(intervalId);
    }

}, 0);