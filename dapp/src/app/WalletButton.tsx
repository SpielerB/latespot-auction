import React from "react";
import ReactDOM from "react-dom";
import {useWeb3Modal} from '@web3modal/react';
import {useAccount} from 'wagmi';
import {openModal, useDisplayState} from '../store/application/ApplicationReducer';
import DisplayState from '../model/DisplayState';
import {useAppDispatch} from '../store/Store';
import ModalTarget from '../model/ModalTarget';

export interface WalletButtonProps extends ButtonProps {
    portalElement: Element | DocumentFragment;
}

interface ButtonProps {
    mobile?: boolean;
}

const buttonClassNames = (mobile?: boolean) => {
    const buttonClasses = ['nav-claim', 'w-button'];
    if (mobile) {
        buttonClasses.push('nav-claim_mobile');
    }
    return buttonClasses.join(' ');
}

const ConnectWalletButton = ({mobile}: ButtonProps) => {
    const {isOpen, open} = useWeb3Modal();
    const {isReconnecting, isConnected, isConnecting} = useAccount();

    const classNames = buttonClassNames(mobile);
    if (isOpen && (isReconnecting || isConnecting)) {
        return (
            <button className={classNames} disabled>
                Connecting...
            </button>
        )
    }
    if (!isConnected) {
        return (
            <button className={classNames} onClick={() => open()}>
                Connect Wallet
            </button>
        );
    }

    return (
        <button className={classNames} disabled>
            Wallet Connected
        </button>
    );
}

const BuyTicketsButton = ({mobile}: ButtonProps) => {
    const dispatch = useAppDispatch();

    return (
        <button className={buttonClassNames(mobile)} onClick={() => dispatch(openModal(ModalTarget.AUCTION))}>
            Buy Tickets
        </button>
    );
}

const StakeButton = ({mobile}: ButtonProps) => {
    const dispatch = useAppDispatch();

    return (
        <button className={buttonClassNames(mobile)} onClick={() => dispatch(openModal(ModalTarget.STAKING_CONSOLE))}>
            Stake
        </button>
    );
}

const WalletButton = ({portalElement, mobile}: WalletButtonProps) => {
    const applicationState = useDisplayState();
    let button;
    // Disable inspection for this because the other application states are not initially known
    // noinspection JSUnreachableSwitchBranches
    switch (applicationState) {
        case DisplayState.PRIVATE_AUCTION:
        case DisplayState.PRE_PUBLIC_AUCTION:
        case DisplayState.PUBLIC_AUCTION:
            button = <BuyTicketsButton mobile={mobile}/>;
            break;
        case DisplayState.STAKING:
            button = <StakeButton mobile={mobile}/>;
            break;
        default:
            button = <ConnectWalletButton mobile={mobile}/>;
            break;
    }

    return (
        <React.Fragment>
            {ReactDOM.createPortal(button, portalElement)}
        </React.Fragment>
    )
}

export default WalletButton;