import {BigNumberish, Signer} from 'ethers';
import {ethers, network, upgrades} from 'hardhat';


const originalLogFunction = console.log;
let data: { time: Date, args: any[] }[];

const formatDate = (date: Date) => {
    const year = date.getFullYear().toString().padStart(4, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}.${milliseconds}`;
}

beforeEach('Suppress-Logs', function () {
    data = [];
    console.log = (...args: any) => {
        data.push({time: new Date(), args});
    };
});

afterEach('Suppress-Logs', function () {
    console.log = originalLogFunction;
    if (this.currentTest?.state !== 'passed' && data.length) {
        console.log('The following log was produced as part of the test:')
        data.forEach(data => console.log(`[${formatDate(data.time)}]`, ...data.args));
    }
});

export const mineBlocks = async (count: BigNumberish) => {
    for (let i = 0; i < count; ++i) {
        await network.provider.send('evm_mine');
    }
}

export const deploy = async (name: string, ...args: any[]) => {
    const factory = await ethers.getContractFactory(name);
    const contract = await factory.deploy(...args);
    return await contract.deployed();
}

export const deployProxy = async (name: string, ...args: any[]) => {
    const factory = await ethers.getContractFactory(name);
    const contract = await upgrades.deployProxy(factory, args);
    return await contract.deployed();
}

export const getBalance = async (address: string) => {
    return await ethers.provider.getBalance(address);
}

export const setBalance = async (to: string, value: BigNumberish) => {
    return await ethers.provider.send('hardhat_setBalance', [to, ethers.utils.hexValue(value)])
}

export const createSignature = (address: string, value: BigNumberish, phase: number, signer?: Signer) => {
    return sign(['address', 'uint256', 'uint8'], [address, value, phase], signer)
}

export const sign = async (types: ReadonlyArray<string>, values: ReadonlyArray<any>, signer?: Signer) => {
    if (!signer) {
        const signers = await ethers.getSigners();
        signer = signers[signers.length - 1];
    }
    const payload = ethers.utils.defaultAbiCoder.encode(types, values);
    const hash = ethers.utils.keccak256(payload);
    return await signer.signMessage(ethers.utils.arrayify(hash));
}