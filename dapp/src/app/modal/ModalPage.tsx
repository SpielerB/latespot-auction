import "./ModalPage.css"
import React, {useCallback, useEffect} from 'react';
import {useAppDispatch} from '../../store/Store';
import {closeModal, useModalOpen} from '../../store/application/ApplicationReducer';

const ModalPage = ({children}: React.PropsWithChildren) => {
    const dispatch = useAppDispatch();
    const open = useModalOpen();
    const close = useCallback(() => dispatch(closeModal()), []);

    const keyUpListener = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            close()
        }
    }, [close])

    useEffect(() => {
        if (open) {
            document.body.classList.add("modal-open");
            document.addEventListener('keyup', keyUpListener)
        } else {
            document.body.classList.remove("modal-open");
            document.removeEventListener('keyup', keyUpListener);
        }
        return () => {
            document.body.classList.remove("modal-open");
            document.removeEventListener('keyup', keyUpListener);
        }
    }, [open, keyUpListener]);

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