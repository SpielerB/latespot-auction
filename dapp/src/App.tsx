import React, {useCallback, useEffect} from 'react';
import './App.css';
import ReactDOM from 'react-dom';
import Cookies from 'js-cookie';
import { ModalCtrl } from '@web3modal/core'
import {useAccount, useConnect, useProvider} from 'wagmi';
import {useWeb3Modal} from '@web3modal/react';
import {connectors} from 'web3modal';

export interface AppProps {
    desktopElement: HTMLElement;
    mobileElement: HTMLElement;
}

function App(props: AppProps) {
    const {isOpen} = useWeb3Modal();
    const {isDisconnected, isConnecting, isReconnecting, isConnected, connector} = useAccount({
        onConnect: async ({address, isReconnected}) => {
            if (!isReconnected) {
                const mwr = Cookies.get("__maitre-referrer-MFc19bd28d25");
                if (mwr) {
                    await fetch('https://app.referralhero.com/api/v2/lists/MFc19bd28d25/subscribers', {
                        method: 'POST',
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            "crypto_wallet_provider": connector?.name,
                            "referrer": mwr,
                            "api_token": "95005c9a25b07657446c9640f97f168b68c3df13",
                            "status": "custom_event_pending",
                            "crypto_wallet_address": address,
                            "domain": "https://www.squirreldegens.com/"
                        })
                    });
                }
            }
        }
    });

    const renderButton = useCallback((mobile: boolean) => {
        const buttonClasses = ['nav-claim', 'w-button'];
        if (mobile) {
            buttonClasses.push('nav-claim_mobile');
        }
        const className = buttonClasses.join(' ');

        if (isOpen && (isConnecting || isReconnecting)) {
            return <button className={className} disabled>Connecting...</button>;
        }
        if (!isConnected) {
            return <button onClick={() => ModalCtrl.open()} className={className}>Connect Wallet</button>;
        }
        return (
            <button
                disabled
                className={className}
            >
                Wallet Connected
            </button>
        )
    }, [isConnecting, isReconnecting, isConnected, isOpen])

    return (
        <React.Fragment>
            {ReactDOM.createPortal(renderButton(false), props.desktopElement)}
            {ReactDOM.createPortal(renderButton(true), props.mobileElement)}
        </React.Fragment>
    );
}

export default App;
