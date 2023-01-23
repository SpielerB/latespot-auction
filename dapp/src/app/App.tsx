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

    console.log(displayState.toString());
    switch (displayState) {
        case DisplayState.PRIVATE_AUCTION:
            return <AuctionPage
                phase={1}
                auction={contractModel?.privateAuction}
                title="Whitelist sale"
            />;
        case DisplayState.PRE_PUBLIC_AUCTION:
            return <AuctionPage
                phase={1}
                auction={contractModel?.privateAuction}
                title="Whitelist sold out!"
            />;
        case DisplayState.PUBLIC_AUCTION:
            return <AuctionPage
                phase={2}
                auction={contractModel?.publicAuction}
                title="Public sale"
            />;
        case DisplayState.PRE_MINT:
            return <AuctionPage
                phase={2}
                auction={contractModel?.publicAuction}
                title="We are sold out!"
            />;
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
