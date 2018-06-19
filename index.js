const communicationKey = 'set session cwd';
const communicationSuccessKey = 'set session cwd successfully';
const {isAbsolute} = require('path');

exports.middleware = ({ dispatch }) => next => (action) => {
  switch (action.type) {
    case 'INIT':
      // listen the main process to set cwd before create a new tab.
      window.rpc.on(communicationKey, (cwd) => {
        if (cwd) {
          dispatch({
            type: 'SESSION_SET_CWD',
            cwd
          });
          window.rpc.emit(communicationSuccessKey);
        }
      });
      next(action);
      break;
    default:
      next(action);
      break;
  }
};

exports.onApp = (app) => {
  // when open hyper in the system-context-menu, we will prevent creating the new app instance, and open a new tab in last focused window.
  app.releaseSingleInstance();
  const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
    const lastFocusedWindow = app.getLastFocusedWindow();
    const cwd = (commandLine[1] && isAbsolute(commandLine[1])) ? commandLine[1] : workingDirectory;
    // tell the render process to set the the tab's cwd before create a new one.
    lastFocusedWindow.rpc.emit(communicationKey, cwd);
  });
  if (isSecondInstance) {
    app.quit();
  }
};

exports.onWindow = (_window) => {
  // tell the render process to open a new tab.
  _window.rpc.removeAllListeners(communicationSuccessKey);
  _window.rpc.on(communicationSuccessKey, function () {
    _window.rpc.emit('termgroup add req');
    if (!_window.isFocused()) {
      _window.focus();
    }
  })
}
