import "./ModalPage.css"
import React, {useCallback, useEffect} from 'react';
import {closeModal, useModalState} from '../../store/reducer/ModalReducer';
import {useDispatch} from 'react-redux';

const ModalPage = ({children}: React.PropsWithChildren) => {
    const {open} = useModalState()

    const dispatch = useDispatch();
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

    if (!open) return null;
    return (
        <div
            style={{display: open ? '' : 'none'}}
            onClick={close}
            className="modal-overlay"
        >
            <div onClick={event => {
                event.stopPropagation();
                event.preventDefault();
            }} className="modal-box">
                <div className="modal-close" onClick={close}>&#10006;</div>
                {children}
            </div>
        </div>
    );
}

export default ModalPage;