import React, {PropsWithChildren} from 'react';
import "./InfoDialog.css"

interface InfoDialogProps {
    iconSrc: string;
    title: string;
    confirmLabel: string;
    cancelLabel?: string;
    open: boolean;
    onConfirm: () => void;
    onCancel?: () => void;

}

const InfoDialog = (props: PropsWithChildren<InfoDialogProps>) => {

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
                <div className="dialog-title">
                    <img
                        src="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                        loading="lazy"
                        alt=""
                        className="dialog-icon"
                    />
                    <h2 className="dialog-h2">{props.title}</h2>
                    <img
                        src="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                        loading="lazy"
                        alt=""
                        className="dialog-icon"
                    />
                </div>
                <div className="dialog-text">
                    {props.children}
                </div>
                <div className="dialog-buttons">
                    <button className="dialog-button" onClick={props.onConfirm}>{props.confirmLabel}</button>
                    {props.cancelLabel &&
                        <button className="dialog-button" onClick={props.onCancel}>{props.cancelLabel}</button>}
                </div>
            </div>

        </div>);
}
export default InfoDialog;