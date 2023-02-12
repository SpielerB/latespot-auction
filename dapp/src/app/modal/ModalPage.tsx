import "./ModalPage.css"
import React, {useCallback, useEffect} from 'react';
import {useAppDispatch} from '../../store/Store';
import {closeModal, useDialogOpen, useModalOpen} from '../../store/application/ApplicationReducer';
import {useWeb3Modal} from '@web3modal/react';

const ModalPage = ({children}: React.PropsWithChildren) => {
    const dispatch = useAppDispatch();
    const {isOpen: web3ModalOpen} = useWeb3Modal();
    const dialogOpen = useDialogOpen();
    const open = useModalOpen();
    const close = useCallback(() => dispatch(closeModal()), []);


    useEffect(() => {
        const inputHandler = (event: KeyboardEvent) => {
            console.log("Closing", dialogOpen, web3ModalOpen);
            if (event.key === 'Escape') {
                close();
            }
        };

        if (open) {
            document.body.classList.add("modal-open");
            if (!dialogOpen && !web3ModalOpen) {
                document.addEventListener('keydown', inputHandler);
            }
        }

        return () => {
            document.body.classList.remove("modal-open");
            document.removeEventListener('keydown', inputHandler);
        }
    }, [open, dialogOpen, web3ModalOpen]);

    return (
        <div
            style={{display: open ? undefined : 'none'}}
            onClick={close}
            className="modal-overlay"
        >
            <div
                onClick={event => {
                    event.stopPropagation();
                    event.preventDefault();
                }}
                className="modal-box"
            >
                <div className="modal-close" onClick={close}>&#10006;</div>
                {children}
            </div>
        </div>
    );
}

export default ModalPage;