import React from "react";
import ReactDOM from "react-dom";
import {useDispatch} from 'react-redux';
import {openModal} from '../store/reducer/ModalReducer';
import {useWeb3Modal} from '@web3modal/react';
import {useAccount} from 'wagmi';
import {useApplicationState} from '../store/reducer/ApplicationStateReducer';
import ApplicationState from '../model/ApplicationState';

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
    const dispatch = useDispatch();
    const {isOpen, open} = useWeb3Modal();
    const {isReconnecting, isConnected, isConnecting} = useAccount();

    const classNames = buttonClassNames(mobile);
    if (isOpen || isReconnecting || isConnecting) {
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

const ClaimTicketsButton = ({mobile}: ButtonProps) => {
    const dispatch = useDispatch();

    return (
        <button className={buttonClassNames(mobile)} onClick={() => dispatch(openModal())}>
            Claim Tickets
        </button>
    );
}

const StakeButton = ({mobile}: ButtonProps) => {
    const dispatch = useDispatch();

    return (
        <button className={buttonClassNames(mobile)} onClick={() => dispatch(openModal())}>
            Stake
        </button>
    );
}

const WalletButton = ({portalElement, mobile}: WalletButtonProps) => {
    const applicationState = useApplicationState();
    let button;
    // Disable inspection for this because the other application states are not initially known
    // noinspection JSUnreachableSwitchBranches
    switch (applicationState) {
        case ApplicationState.PRIVATE_AUCTION:
        case ApplicationState.PRE_PUBLIC_AUCTION:
        case ApplicationState.PUBLIC_AUCTION:
            button = <ClaimTicketsButton mobile={mobile}/>;
            break;
        case ApplicationState.STAKING:
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