import {EthereumClient, modalConnectors, walletConnectProvider,} from "@web3modal/ethereum";

import {Web3Modal} from "@web3modal/react";

import {configureChains, createClient, goerli, mainnet, WagmiConfig} from "wagmi";
import React from 'react';
import {hardhat} from '@wagmi/chains';

export const projectId = import.meta.env.VITE_WALLETCONNECT_CLOUD_KEY;

let chains = [mainnet];
if (import.meta.env.DEV) {
    chains = [hardhat];
}
if (import.meta.env.VITE_TEST) {
    chains = [goerli];
}

// Wagmi client
const {provider} = configureChains(chains, [
    walletConnectProvider({projectId}),
]);

const wagmiClient = createClient({
    autoConnect: true,
    connectors: modalConnectors({appName: "web3Modal", chains}),
    provider,
});

// Web3Modal Ethereum Client
const ethereumClient = new EthereumClient(wagmiClient, chains);

export const Web3Configuration = (props: any) => {

    return (
        <>
            <WagmiConfig client={wagmiClient}>
                {props.children}
            </WagmiConfig>

            <Web3Modal themeZIndex={1000000} themeMode="dark" projectId={projectId} ethereumClient={ethereumClient}/>
        </>
    )
}