const communicationKey = 'set session cwd';

exports.middleware = ({ dispatch }) => next => (action) => {
  const remote = require('electron').remote;
  const app = remote.app;
  switch (action.type) {
    case 'INIT':
      // listen the main process to set cwd before create a new tab.
      window.rpc.on(communicationKey, (cwd) => {
        if (cwd) {
          dispatch({
            type: 'SESSION_SET_CWD',
            cwd
          });
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
  const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
    const cwd = commandLine[1];
    const lastFocusedWindow = app.getLastFocusedWindow();
    // tell the render process to set the the tab's cwd before create a new one.
    lastFocusedWindow.rpc.emit(communicationKey, cwd);
    // tell the render process to open a new tab.
    lastFocusedWindow.rpc.emit('termgroup add req');
    
    if (!lastFocusedWindow.isFocused()) {
      lastFocusedWindow.focus();
    }
  });
  if (isSecondInstance) {
    app.quit();
  }
};
