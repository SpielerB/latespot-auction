import React from "react";
import ReactDOM from "react-dom";
import {openModal} from '../store/application/ApplicationReducer';
import {useAppDispatch} from '../store/Store';

export interface ModalButtonProps extends ButtonProps {
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

const OpenModalButton = ({mobile}: ButtonProps) => {
    const dispatch = useAppDispatch();

    return (
        <button className={buttonClassNames(mobile)} onClick={() => dispatch(openModal())}>
            Mint Tokens
        </button>
    );
}

const ModalButton = ({portalElement, mobile}: ModalButtonProps) => {
    return (
        <React.Fragment>
            {ReactDOM.createPortal(<OpenModalButton mobile={mobile}/>, portalElement)}
        </React.Fragment>
    )
}

export default ModalButton;