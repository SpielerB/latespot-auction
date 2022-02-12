import React, {useEffect, useState} from 'react';
import logo from './logo.svg';
import './App.css';
import Web3 from "web3";
import Web3Modal from "web3modal";
import WalletConnectProvider from '@walletconnect/web3-provider';

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      infuraId: 'a836e60c950448288471582dfbd7be98'
    }
  }
};

const web3Modal = new Web3Modal({
  cacheProvider: true,
  providerOptions
});

const onConnect = (setter: (web3: Web3) => void) => async () => {
  console.log('Connecting to provider')
  const provider = await web3Modal.connect();

  console.log('Enabling provider')
  await provider.enable();

  console.log('Creating web3')
  const web3 = new Web3(provider);

  console.log('Extending web3')
  web3.eth.extend({
    methods: [
      {
        name: "chainId",
        call: "eth_chainId"
      }
    ]
  });

  console.log("Fetching accounts")
  const accounts = await web3.eth.getAccounts();
  accounts.forEach(account => console.log(account))

  setter(web3);
};

function App() {
  const [web3, setWeb3] = useState<any>(undefined);
  useEffect(() => {
    console.log('Checking for cached provider');
    if (web3Modal.cachedProvider) {
      onConnect(setWeb3)();
    } else {
      console.log('None found')
    }
  }, []);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        {!web3 && <button onClick={onConnect(setWeb3)} style={{padding: '10px 20px', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer'}}>Connect</button>}
        {web3 && (<div>
          <p>Connected</p>
        </div>)}
      </header>
    </div>
  );
}

export default App;
