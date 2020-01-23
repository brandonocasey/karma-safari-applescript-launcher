const runApplescript = require('run-applescript');

const getBrowserLauncher = function(browserName) {
  return function(url) {
    this._url = url;

    // record if safari was already open via `wasopen`
    // that way we know if we should quit or keep it open after the run.
    const checkOpen = `
    set wasopen to false
    if application "${browserName}" is running then set wasopen to true
    return wasopen
    `;

    // The following changes prevent Safari from moving to the background
    // thus allowing testing to complete as needed.
    // 1. find the window/tab object for the karma url
    // 2. If there was no tab, open a new window with the testing url
    // 3. If we found a window make sure it is ontop of all other windows
    // 4. Make sure that safari is visible
    const keepRunning = `
    tell application "${browserName}"
      set testingTab to false
      set testingWindow to false

      repeat with w in (every window)
        repeat with t in (tab of w)
          if URL of t is equal to "${url}" then
            set testingTab to t
            set testingWindow to w
          end if
        end repeat
      end repeat

      if testingTab is equal to false then
        make new document with properties {URL:"${url}"}
      end if

      if testingWindow is not equal to false then
        set index of testingWindow to 1
      end if
    end tell

    tell application "System Events"
      set visible of application process "${browserName}" to true
    end tell
    `;

    runApplescript(checkOpen).then((result) => {
      this._wasOpen = (result === 'true');

      runApplescript(keepRunning);
      this._keepRunningInterval = setInterval(() => runApplescript(keepRunning), 2000);
      // make sure that ctrl-c etc still work to quit testing
      process.on('beforeExit', () => {
        clearInterval(this._keepRunningInterval);
      });
    }).catch((err) => {
      throw err;
    });
  };
};

const getBrowserKiller = function(browserName) {
  return function(done) {
    // code to close blank favorites tab, we don't need
    // it now, but if we ever do:
    // close (documents where name is "favorites")

    // close the karma url and safari if it wasn't open
    // before we started
    const script = `
    tell application "${browserName}"
      close documents where URL = "${this._url}"
      ${this._wasOpen ? '' : 'quit'}
    end tell
    `;

    clearInterval(this._keepRunningInterval);
    runApplescript(script).then((result) => {
      done();
    }).catch((err) => {
      done();
      throw err;
    });
  };
};

const SafariBrowser = function(baseBrowserDecorator) {
  baseBrowserDecorator(this);
  this._start = getBrowserLauncher('Safari');
  this.on('kill', getBrowserKiller('Safari'));
};

SafariBrowser.prototype = {
  name: 'Safari'
};

SafariBrowser.$inject = ['baseBrowserDecorator'];

const SafariTechBrowser = function(baseBrowserDecorator) {
  baseBrowserDecorator(this);
  this._start = getBrowserLauncher('Safari Technology Preview');
  this.on('kill', getBrowserKiller('Safari Technology Preview'));
};

SafariTechBrowser.prototype = {
  name: 'SafariTechPreview'
};

SafariBrowser.$inject = ['baseBrowserDecorator'];

module.exports = {
  'launcher:Safari': ['type', SafariBrowser],
  'launcher:SafariTechPreview': ['type', SafariTechBrowser]
};
