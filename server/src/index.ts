import {Contract, ethers} from 'ethers';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import {abi} from './contract/abi.json';

dotenv.config();

const port = parseInt((process.env.PORT || 5000) as string, 10);

const privateKey = process.env.OWNER_PRIVATE_KEY as string;
const network = process.env.NETWORK;
const contractAddress = process.env.CONTRACT as string;

const provider = new ethers.providers.JsonRpcProvider(network);

const signer = new ethers.Wallet(privateKey, provider);

const contract = new Contract(contractAddress, abi, signer);

const app = express();

app.use(helmet());

app.use(bodyParser.json());

app.use(cors()); // Allow cors
app.use(morgan('combined')); // Log requests

let started = false;

app.get('/', async (req, res) => {
    if (!started && !(started = await contract.hasStarted())) {
        res.send({started: false});
        return;
    }
    const data = {
        started: true,
        contractAddress,
        abi
    };
    res.send(data);
});

app.post('/sign', async (req, res) => {
    try {
        const {value, address} = req.body;
        console.log(`Signing request for ${address}@${value}`)
        const phase = await contract.currentPhase();
        const payload = ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [address, value, phase]);
        const hash = ethers.utils.keccak256(payload);
        const signature = await signer.signMessage(ethers.utils.arrayify(hash));
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