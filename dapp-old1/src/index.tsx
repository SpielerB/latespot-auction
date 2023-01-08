import React, {useState} from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import MockAPI from './helper/MockAPI';
import { APIProvider } from './helper/APIContext';
import { APIUpdateProvider } from './helper/APIUpdateContext';
import DAPI from './helper/DAPI';
import {Web3Configuration} from './Web3Configuration';

const root = document.createElement('div');
document.body.appendChild(root);

const desktopElement = document.getElementById('dapp-root');
const mobileElement = document.getElementById('dapp-root-mobile');

const clearChildren = (element: HTMLElement) => {
    let child;
    while((child = element.firstChild)) {
        element.removeChild(child);
    }
}

if (desktopElement && mobileElement) {

    const Index = () => {
        return (
            <React.StrictMode>
                <Web3Configuration>
                    <App desktopElement={desktopElement} mobileElement={mobileElement}/>
                </Web3Configuration>
            </React.StrictMode>
        );
    }

    clearChildren(desktopElement);
    clearChildren(mobileElement);

    ReactDOM.render(<Index />,root);
} else {
    console.error('Missing mobile or desktop element (dapp-root and dapp-root-mobile)')
}
