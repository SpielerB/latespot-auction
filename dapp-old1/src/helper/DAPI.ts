import Contract from '../app/model/Contract';
import API from '../app/model/API';
import Staking from '../app/model/Staking';
import Auction from '../app/model/Auction';
import BronzeUtilities from '../app/model/BronzeUtilities';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import WalletConnectProvider from '@walletconnect/web3-provider';
import Web3Modal from 'web3modal';
import {ethers, Wallet} from 'ethers';

const providerOptions = {
    walletlink: {
        package: CoinbaseWalletSDK,
        options: {
            appName: "Squirrel Degens NFT",
            infuraId: "a836e60c950448288471582dfbd7be98",
        }
    },
    walletconnect: {
        package: WalletConnectProvider,
        options: {
            infuraId: 'a836e60c950448288471582dfbd7be98'
        }
    },
    binancechainwallet: {
        package: true
    },
};

const web3Modal = new Web3Modal({
    cacheProvider: true,
    providerOptions
});

// TODO: Mock behaviour
const bronzeUtilities: BronzeUtilities = {
    categories: async () => [],
    download: async () => {},
    hasAccess: async () => false
}

// TODO: Mock behaviour
const staking: Staking = {
    stake: async token => {},
    staked: async token => false,
    stakeLevel: async token => 0,
    unStake: async () => {},
    stakeLevels: async () => [],
    stakeTime: async token => 0
}

// TODO: Mock behaviour
const privateAuction: Auction = {
    buy: async amount => {
    },
    hasStarted: async () => false,
    hasStopped: async () => false,
    isActive: async () => false,
    ticketCount: async () => 0,
    tickets: async () => 0,
    ticketLimit: async () => 0,
    ticketSupply: async () => 0
}

// TODO: Mock behaviour
const publicAuction: Auction = {
    buy: async amount => {
    },
    hasStarted: async () => false,
    hasStopped: async () => false,
    isActive: async () => false,
    ticketCount: async () => 0,
    tickets: async () => 0,
    ticketLimit: async () => 0,
    ticketSupply: async () => 0
}

// TODO: Mock behaviour
const contract: Contract = {
    minted: async () => false,
    tickets: async () => 0,
    metadata: async token => ({
        name: "Token",
        image: "data:image/png;base64,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",
        description: "Some token",
        attributes: [],
        properties: []
    }),
    privateAuction,
    publicAuction,
    staking,
    tokens: async () => [],
    revealed: async () => false,
    whitelisted: async () => false
}

let connectedWallet: Wallet | undefined = undefined;
let walletConnectingPromise: Promise<void> | undefined = undefined;

const api: API = {
    onWalletChanged: listener => {},
    bronzeUtilities: async () => bronzeUtilities,
    contract: async () => contract,
    connectWallet: async () => {
        if (connectedWallet) return;
        if (walletConnectingPromise) {
            await walletConnectingPromise;
            return;
        }
        walletConnectingPromise = new Promise<void>(async resolve => {
            const instance = await web3Modal.connect();
            await instance.enable();
            const provider = new ethers.providers.Web3Provider(instance);


            instance.on("accountsChanged", async (accounts: string[]) => {
                if (!accounts || !accounts.length) {
                    web3Modal.clearCachedProvider();
                    return;
                }
            });
            resolve();
        })
        await walletConnectingPromise;
    },
    isContractReady: async () => false,
    isWalletConnected: async () => false,
    walletAddress: async () => "0x0000000000000000000000000000"
}

export default api;