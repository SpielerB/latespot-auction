import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './index.css'
import {Web3Configuration} from './web3/Web3Configuration';
import {Provider} from 'react-redux';
import store from './store/Store';
import ContractManager from './web3/ContractManager';

// Add root tag to end of the body.
const root = document.createElement('div');
document.body.appendChild(root);

const desktopNavElement = document.getElementById("dapp-root");
const mobileNavElement = document.getElementById("dapp-root-mobile");

const clearChildren = (element: HTMLElement) => {
    let child;
    while ((child = element.firstChild)) {
        element.removeChild(child);
    }
}

if (desktopNavElement && mobileNavElement) {
    // Remove content of the buttons to be replaced to avoid issues with existing content
    clearChildren(desktopNavElement);
    clearChildren(mobileNavElement);

    const Index = () => {
        return (
            <React.StrictMode>
                <Provider store={store}>
                    <Web3Configuration>
                        <App desktopNavElement={desktopNavElement} mobileNavElement={mobileNavElement}/>
                        <ContractManager/>
                    </Web3Configuration>
                </Provider>
            </React.StrictMode>
        );
    };

    ReactDOM.createRoot(root).render(<Index/>)
} else {
    console.error('Missing mobile or desktop button (dapp-root and dapp-root-mobile)')
}
