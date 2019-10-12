const communicationKey = 'set session cwd';
const communicationSuccessKey = 'set session cwd successfully';
const { isAbsolute } = require('path');

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
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      const lastFocusedWindow = app.getLastFocusedWindow();
      const cwd = (commandLine[1] && isAbsolute(commandLine[1])) ? commandLine[1] : workingDirectory;
      // tell the render process to set the the tab's cwd before create a new one.
      lastFocusedWindow.rpc.emit(communicationKey, cwd);
    })
  }
};

exports.onWindow = (_window) => {
  // tell the render process to open a new tab.
  _window.rpc.removeAllListeners(communicationSuccessKey);
  _window.rpc.on(communicationSuccessKey, function () {
    _window.rpc.emit('termgroup add req');
    if (!_window.isFocused()) {
      // compat with new hyper. this focus will conflict with terminal focus
      setTimeout(() => {
        _window.focus();
      });
    }
  })
}
