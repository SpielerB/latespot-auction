import React from 'react';
import "./InfoDialog.css"

interface InfoDialogProps {
    title: string;
    contentText: string[];
    confirmLabel: string;
    cancelLabel: string;
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;

}

const InfoDialog = (props: InfoDialogProps) => {

    if (!props.open) return null;
    return (
        <div
            className="dialog-overlay"
            onClick={props.onCancel}
        >
            <div
                className="dialog-box"
                onClick={(event) => event.stopPropagation()}
            >
                <h2>{props.title}</h2>
                {props.contentText.map((i) =>
                    <div>
                        {i /*key or child*/}
                    </div>)}
                <button onClick={props.onConfirm}>{props.confirmLabel}</button>
                <button onClick={props.onCancel}>{props.cancelLabel}</button>
            </div>

        </div>);
}
export default InfoDialog;