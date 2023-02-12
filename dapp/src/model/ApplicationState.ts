import DisplayState from './DisplayState';

export default interface ApplicationState {
    modalOpen: boolean;
    dialogOpen: boolean;
    displayState: DisplayState;
}