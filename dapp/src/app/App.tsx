import ModalPage from './modal/ModalPage';
import React from 'react';
import WalletButton from './WalletButton';

import './App.css'
import {useDisplayState} from '../store/application/ApplicationReducer';
import PrivateAuction from "./auction/private/PrivateAuction";
import PrePublicAuction from "./auction/PrePublicAuction";
import PreMint from "./preStaking/PreMint";
import PublicAuction from "./auction/public/PublicAuction";
import DisplayState from "../model/DisplayState";

interface AppProps {
    mobileNavElement: Element | DocumentFragment;
    desktopNavElement: Element | DocumentFragment;
}

const ModalContent = () => {
    const displayState = useDisplayState();

    switch (displayState) {
        case DisplayState.PRIVATE_AUCTION:
            return <PrivateAuction/>;
        case DisplayState.PRE_PUBLIC_AUCTION:
            return <PrePublicAuction/>;
        case DisplayState.PUBLIC_AUCTION:
            return <PublicAuction/>;
        case DisplayState.PRE_MINT:
            return <PreMint/>;
        default:
            return <h1>Display not implemented</h1>
    }
}

function App({mobileNavElement, desktopNavElement}: AppProps) {
    return (
        <React.Fragment>
            <ModalPage>
                <ModalContent/>
            </ModalPage>
            <WalletButton portalElement={desktopNavElement}/>
            <WalletButton portalElement={mobileNavElement} mobile/>
        </React.Fragment>
    );
}

export default App
