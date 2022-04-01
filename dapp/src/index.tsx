import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

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
    clearChildren(desktopElement);
    clearChildren(mobileElement);

    ReactDOM.render(
        <React.StrictMode>
            <App desktopElement={desktopElement} mobileElement={mobileElement}/>
        </React.StrictMode>,
        root);
} else {
    console.error('Missing mobile or desktop element (dapp-root and dapp-root-mobile)')
}
