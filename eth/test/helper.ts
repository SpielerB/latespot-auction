import {BigNumberish, Signer} from 'ethers';
import {ethers, network, upgrades} from 'hardhat';

if (typeof global.it === 'function') {
    require('./test-helper');
}

export const increaseNextBlockTime = async (seconds: number) => {
  await network.provider.send('evm_increaseTime', [seconds]);
};

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
    const [owner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory(name, owner);
    const contract = await upgrades.deployProxy(factory, args);
    return await contract.deployed();
}

export const getBalance = async (address: string) => {
    return await ethers.provider.getBalance(address);
}

export const setBalance = async (to: string, value: BigNumberish) => {
    return await ethers.provider.send('hardhat_setBalance', [to, ethers.utils.hexValue(value)])
}

export const createSignature = (address: string, value: BigNumberish, phase: string, signer?: Signer) => {
    return sign(['address', 'uint256', 'string'], [address, value, phase], signer)
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