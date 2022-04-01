import React, {useCallback, useEffect, useState} from 'react';
import './App.css';
import Web3Modal from "web3modal";
import WalletConnectProvider from '@walletconnect/web3-provider';
import ContractData from './app/model/ContractData';
import {Contract, ethers, Signer} from 'ethers';
import Page from './app/Page';
import Header from './app/Header';
import SaleForm from './app/SaleForm';
import AuctionDialog from './app/AuctionDialog';
import {awaitContract, hasAuctionEnded, loadContractData} from './helper/ContractHelper';
import ReactDOM from 'react-dom';

export interface AppProps {
    desktopElement: HTMLElement;
    mobileElement: HTMLElement;
}

const providerOptions = {
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

const cleanupCallbacks: (() => void)[] = [];
const cleanup = () => {
    // Cleanup intervals and connects
    let fx;
    while ((fx = cleanupCallbacks.pop())) {
        fx();
    }
}

let pendingConnect: boolean;

function App(props: AppProps) {
    const [cachedProvider, setCachedProvider] = useState<string | undefined>(web3Modal.cachedProvider);
    const [signer, setSigner] = useState<Signer>();
    const [contract, setContract] = useState<Contract>();
    const [provider, setProvider] = useState<ethers.providers.Web3Provider>();
    const [contractData, setContractData] = useState<ContractData>();
    const [hasStarted, setHasStarted] = useState<boolean>(true);
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);

    const connect = useCallback(async () => {
        // Prevent multiple connects at the same time
        if (pendingConnect) {
            return;
        }
        pendingConnect = true;
        try {
            const instance = await web3Modal.connect();
            await instance.enable();
            const provider = new ethers.providers.Web3Provider(instance);

            setProvider(provider);

            const accountsChangedHandler = async (accounts: string[]) => {
                if (!accounts || !accounts.length) {
                    setProvider(undefined);
                    setSigner(undefined);
                    setContract(undefined);
                    setContractData(undefined);
                    setHasStarted(false);
                    setDialogOpen(false);
                    setCachedProvider(undefined);
                    web3Modal.clearCachedProvider();
                    cleanup();
                    return;
                }
                if (contract) {
                    try {
                        setContractData(await loadContractData(contract));
                    } catch (ignored) {
                        // TODO: maybe logging
                    }
                }
            }

            instance.on('accountsChanged', accountsChangedHandler);
            cleanupCallbacks.push(() => instance.removeListener('accountsChanged', accountsChangedHandler));

            const signer = provider.getSigner();

            setSigner(signer);

            const contractAbort = new AbortController();
            cleanupCallbacks.push(() => contractAbort.abort());

            const contract = await awaitContract(signer, contractAbort.signal);

            // Ensure that connect gets aborted if contract is unavailable
            if (contractAbort.signal.aborted || !contract) {
                console.log('Either aborted or no contract')
                return;
            }

            setHasStarted(true);
            setContract(contract);

            const initialContractData = await loadContractData(contract);
            setContractData(initialContractData);

            const intervalId = setInterval(async () => {
                try {
                    const updateContractData = await loadContractData(contract as Contract);
                    setContractData(updateContractData);
                } catch (error) {
                    console.error(error);
                    // TODO: Maybe display error
                }
            }, 1000);
            cleanupCallbacks.push(() => clearInterval(intervalId));
        } catch (error) {
            console.error(error); // TODO: Display error maybe
            web3Modal.clearCachedProvider();
            setCachedProvider(undefined);
        } finally {
            pendingConnect = false;
        }
    }, []);

    useEffect(() => {
        if (web3Modal.cachedProvider) {
            connect(); // TODO: decide on how to handle errors
        }
        return cleanup;
    }, [connect]);

    const renderPage = (): JSX.Element => {
        if (!hasStarted || !contract || !contractData) return <span>Auction information not available</span>;

        const showSaleForm = contractData.currentPhase !== 0 && !hasAuctionEnded(contractData);

        return (
            <Page contractData={contractData}>
                <Header contractData={contractData}/>
                {showSaleForm && <SaleForm {...{contract, signer: signer as Signer, contractData}} />}
            </Page>
        );
    };

    const renderButton = useCallback((mobile: boolean) => {
        const buttonClasses = ['nav-claim', 'w-button'];
        if (mobile) {
            buttonClasses.push('nav-claim_mobile');
        }
        const className = buttonClasses.join(' ');

        if (!cachedProvider && !provider && !signer) {
            return <button onClick={connect} className={className}>Connect Wallet</button>;
        }
        if (!provider || !signer) {
            return <button onClick={connect} className={className} disabled>Connecting...</button>;
        }
        return (
            <button
                onClick={(event) => {
                    setDialogOpen(true);
                    event.currentTarget.blur();
                }}
                disabled={!hasStarted || !contract}
                className={className}
            >
                Claim Tickets
            </button>
        )
    }, [cachedProvider, provider, signer, hasStarted, contract, connect])

    return (
        <React.Fragment>
            {ReactDOM.createPortal(renderButton(false), props.desktopElement)}
            {ReactDOM.createPortal(renderButton(true), props.mobileElement)}
            <AuctionDialog onClose={() => setDialogOpen(false)} open={dialogOpen}>
                {renderPage()}
            </AuctionDialog>
        </React.Fragment>
    );
}

export default App;
