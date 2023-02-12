import ModalPage from './modal/ModalPage';
import React from 'react';

import './App.css'
import {useDisplayState} from '../store/application/ApplicationReducer';
import DisplayState from "../model/DisplayState";
import {useContractModel} from "../store/contract/ContractReducer";
import MintPage from "./mint/MintPage";
import ModalButton from './ModalButton';

interface AppProps {
    mobileNavElement: Element | DocumentFragment;
    desktopNavElement: Element | DocumentFragment;
}

const ModalContent = () => {
    const displayState = useDisplayState();
    const contractModel = useContractModel();

    switch (displayState) {
        case DisplayState.PRE_MINT:
            // TODO: Add actual page
            return <MintPage
                phase={0}
                auction={undefined}
                title="Pre Mint"
            />;
        case DisplayState.PRIVATE_MINT:
            return <MintPage
                phase={1}
                auction={contractModel?.privateMint}
                title="Whitelist Mint"
            />;
        case DisplayState.PRE_PUBLIC_MINT:
            return <MintPage
                phase={1}
                auction={contractModel?.privateMint}
                title="All Whitelist Tokens Minted!"
            />;
        case DisplayState.PUBLIC_MINT:
            return <MintPage
                phase={2}
                auction={contractModel?.publicMint}
                title="Public Mint"
            />;
        case DisplayState.MINT_FINISHED:
            // TODO: Add actual page
            return <MintPage
                phase={3}
                auction={contractModel?.publicMint}
                title="All Tokens Minted!"
            />;
        default:
            return null;
    }
}

function App({mobileNavElement, desktopNavElement}: AppProps) {
    return (
        <React.Fragment>
            <ModalPage>
                <ModalContent/>
            </ModalPage>
            <ModalButton portalElement={desktopNavElement}/>
            <ModalButton portalElement={mobileNavElement} mobile/>
        </React.Fragment>
    );
}

export default App
