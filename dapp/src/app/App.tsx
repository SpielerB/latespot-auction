import ModalPage from './modal/ModalPage';
import React from 'react';
import WalletButton from './WalletButton';

import './App.css'
import {useContractModel} from '../store/reducer/ContractReducer';
import {useApplicationState} from '../store/reducer/ApplicationStateReducer';

interface AppProps {
    mobileNavElement: Element | DocumentFragment;
    desktopNavElement: Element | DocumentFragment;
}

function App({mobileNavElement, desktopNavElement}: AppProps) {
    const contractModel = useContractModel();
    const applicationState = useApplicationState();

    return (
        <React.Fragment>
            <ModalPage>
                <div>ApplicationState: {applicationState}</div>
                <div>Whitelisted: {contractModel?.whitelisted ? "Yes" : "No"}</div>
            </ModalPage>
            <WalletButton portalElement={desktopNavElement}/>
            <WalletButton portalElement={mobileNavElement} mobile/>
        </React.Fragment>
    );
}

export default App
