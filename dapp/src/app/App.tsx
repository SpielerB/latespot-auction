import ModalPage from './modal/ModalPage';
import React from 'react';
import WalletButton from './WalletButton';

import './App.css'
import {buyTickets, useBuyTransaction, useContractModel} from '../store/contract/ContractReducer';
import {useDisplayState, useModalTarget} from '../store/application/ApplicationReducer';
import {useAppDispatch} from '../store/Store';

interface AppProps {
    mobileNavElement: Element | DocumentFragment;
    desktopNavElement: Element | DocumentFragment;
}

function App({mobileNavElement, desktopNavElement}: AppProps) {
    const dispatch = useAppDispatch();
    const contractModel = useContractModel();
    const displayState = useDisplayState();
    const modalTarget = useModalTarget();
    const transaction = useBuyTransaction();

    return (
        <React.Fragment>
            <ModalPage>
                <div>DisplayState: {displayState}</div>
                <div>ModalTarget: {modalTarget}</div>
                <div>Whitelisted: {contractModel?.whitelisted ? "Yes" : "No"}</div>
                <button onClick={() => dispatch(buyTickets(2))}>Buy</button>
                <div>Pending Transaction: {transaction?.pending ? "Yes" : "No"}</div>
                <div>Successful Transaction: {transaction?.successful ? "Yes" : "No"}</div>
                <div>Error Transaction: {transaction?.error ? "Yes" : "No"}</div>
                <div>Contract Error: {transaction?.error}</div>

            </ModalPage>
            <WalletButton portalElement={desktopNavElement}/>
            <WalletButton portalElement={mobileNavElement} mobile/>
        </React.Fragment>
    );
}

export default App
