/**
 * API to access the blockchain and the contract.
 */
import Contract from './Contract';
import BronzeUtilities from './BronzeUtilities';

export default interface API {
    /**
     * Initiates the process to connect a wallet. Will do nothing if a wallet is already connected
     * The promise will be resolved once the wallet has been connected
     */
    connectWallet: () => Promise<void>;

    /**
     * Returns true if the wallet has been connected, false otherwise
     */
    isWalletConnected: () => Promise<boolean>;

    /**
     * The address of the current wallet or throws an error if no wallet has been connected
     */
    walletAddress: () => Promise<string>;

    /**
     * Adds a listener which will be notified with the new address if the wallet changes.
     * The address will be undefined if the wallet has been disconnected
     * @param listener
     */
    onWalletChanged: (listener: (address?: string) => void) => void

    /**
     * Returns true if the contract has been deployed and is ready, i.e. the auction has been started
     */
    isContractReady: () => Promise<boolean>;

    /**
     * Returns the contract if it is ready and a wallet has been connected or throws an error otherwise
     */
    contract: () => Promise<Contract>;

    /**
     * Returns the bronze utilities. Throws an error if no wallet is connected.
     */
    bronzeUtilities: () => Promise<BronzeUtilities>;
}