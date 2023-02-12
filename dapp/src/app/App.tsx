import ModalPage from './modal/ModalPage';
import React from 'react';
import WalletButton from './WalletButton';

import './App.css'
import {useDisplayState} from '../store/application/ApplicationReducer';
import DisplayState from "../model/DisplayState";
import {Staking} from './staking/Staking';
import {useContractModel} from "../store/contract/ContractReducer";
import AuctionPage from "./auction/AuctionPage";

interface AppProps {
    mobileNavElement: Element | DocumentFragment;
    desktopNavElement: Element | DocumentFragment;
}

const ModalContent = () => {
    const displayState = useDisplayState();
    const contractModel = useContractModel();

    switch (displayState) {
        case DisplayState.PRIVATE_MINT:
            return <AuctionPage
                phase={1}
                auction={contractModel?.privateMint}
                title="Whitelist sale"
            />;
        case DisplayState.PRE_PUBLIC_MINT:
            return <AuctionPage
                phase={1}
                auction={contractModel?.privateMint}
                title="Whitelist sold out!"
            />;
        case DisplayState.PUBLIC_MINT:
            return <AuctionPage
                phase={2}
                auction={contractModel?.publicMint}
                title="Public sale"
            />;
        case DisplayState.PRE_REVEAL:
        case DisplayState.STAKING:
            return <Staking/>;
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
