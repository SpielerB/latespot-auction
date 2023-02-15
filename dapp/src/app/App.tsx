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
        case DisplayState.PRIVATE_MINT:
            return <MintPage
                phase={1}
                mint={contractModel?.privateMint}
                title="Whitelist Mint"
            />;
        case DisplayState.PRE_PUBLIC_MINT:
            return <MintPage
                phase={1}
                mint={contractModel?.privateMint}
                title="wl mint FINISHED"
            />;
        case DisplayState.PUBLIC_MINT:
            return <MintPage
                phase={2}
                mint={contractModel?.publicMint}
                title="Public Mint"
            />;
        case DisplayState.MINT_FINISHED:
            return <MintPage
                phase={3}
                mint={contractModel?.publicMint}
                title="MINT finished"
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
