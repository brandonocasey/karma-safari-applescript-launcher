const applescript = require('applescript');

const getBrowserLauncher = function(browserName) {
  return function(url) {
    this._url = url;

    // record if safari was already open via `wasopen`
    // then open safari with a tab at `karma url`
    // safari was open a
    const script = `
    set wasopen to false
    if application "${browserName}" is running then set wasopen to true
    tell application "${browserName}"
      make new document with properties {URL:"${url}"}
    end tell
    return wasopen
    `;

    applescript.execString(script, (err, retVal) => {
      if (err) {
        throw err;
      }
      this._wasOpen = false;

      if (retVal === 'true') {
        this._wasOpen = true;
      }
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

    applescript.execString(script, function(err) {
      if (err) {
        throw err;
      }
      done();
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
