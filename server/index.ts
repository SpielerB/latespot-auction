import {AbiCoder, Contract, JsonRpcProvider, keccak256, Wallet} from 'ethers';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import {arrayify} from '@ethersproject/bytes'
import {abi, address} from './contract/AuctionV2Upgradeable.json';

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

app.get('/', async (req, res) => {
    try {
        if (started || (started = await contract.privateAuctionStarted())) {
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

app.get('/contract', async (req, res) => {
    res.send({
        name: 'Test LTSP Contract',
        description: 'A Test Contract',
        image: 'https://i.imgur.com/HTR4tFV.jpeg',
        external_link: 'https://i.imgur.com/HTR4tFV.jpeg',
        seller_fee_basis_points: 1000,
        fee_recipient: await signer.getAddress()
    });
});

app.get('/token/:id', async (req, res) => {
    res.send({
        "name": "Unrevealed NFT",
        "description": "The real metadata of this nft has not been revealed yet",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Question_mark_%28black%29.svg/1200px-Question_mark_%28black%29.svg.png",
        "attributes": {
            "hash": "SOMEHASH"
        }
    });
});

app.listen(port, async () => {
    // tslint:disable-next-line:no-console
    console.log(`listening on port ${port}`);
});