import {
    EthereumClient,
    modalConnectors,
    walletConnectProvider,
} from "@web3modal/ethereum";

import { Web3Modal } from "@web3modal/react";

import { chain, configureChains, createClient, WagmiConfig } from "wagmi";
import React from 'react';

const chains = [chain.mainnet];

export const projectId = "d8e0f3f439c36190b67fbb7fca038784";

// Wagmi client
const { provider } = configureChains(chains, [
    walletConnectProvider({ projectId }),
]);
const wagmiClient = createClient({
    autoConnect: true,
    connectors: modalConnectors({ appName: "web3Modal", chains }),
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

            <Web3Modal themeMode="dark" projectId={projectId} ethereumClient={ethereumClient} />
        </>
    )
}