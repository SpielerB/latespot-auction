import ModalTarget from './ModalTarget';
import DisplayState from './DisplayState';

export default interface ApplicationState {
    modalOpen: boolean;
    modalTarget: ModalTarget;
    displayState: DisplayState;
}