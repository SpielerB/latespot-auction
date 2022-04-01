import React, {useCallback, useEffect} from 'react';
import './AuctionDialog.css'
import ReactDOM from 'react-dom';

export interface AuctionDialogProps {
    onClose: () => void;
    open?: boolean;
}

const dialogContainerElement = document.createElement('div');
dialogContainerElement.setAttribute('id', 'dapp-dialog-container');

const Overlay = ({onClose, open, children}: React.PropsWithChildren<AuctionDialogProps>) => {

    useEffect(() => {
        document.body.appendChild(dialogContainerElement);
        return () => {
            document.body.removeChild(dialogContainerElement);
        }
    }, []);

    return ReactDOM.createPortal((
        <div
            style={{display: open ? '' : 'none'}}
            onClick={() => onClose && onClose()}
            className="dialog-overlay"
        >
            {children}
        </div>
    ), dialogContainerElement);
}

const AuctionDialog = ({onClose, open, children}: React.PropsWithChildren<AuctionDialogProps>) => {

    const keyUpListener = useCallback(event => {
        if (event.key === 'Escape') {
            onClose();
        }
    }, [onClose])

    useEffect(() => {
        if (open) {
            document.addEventListener('keyup', keyUpListener)
        } else {
            document.removeEventListener('keyup', keyUpListener);
        }
        return () => {
            document.removeEventListener('keyup', keyUpListener);
        }
    }, [open, keyUpListener]);

    return (
        <Overlay onClose={onClose} open={open}>
            <div onClick={event => {
                event.stopPropagation();
                event.preventDefault();
            }} className="dialog-box">
                <div className="dialog-close" onClick={onClose}>&#10006;</div>
                {children}
            </div>
        </Overlay>
    );
}

export default AuctionDialog;