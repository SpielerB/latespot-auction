/// <reference types="react-scripts" />
declare global {
    interface Window {
        web3: any;
        ethereum: any;
        Web3Modal: any;
        [name: string]: any;
    }
}