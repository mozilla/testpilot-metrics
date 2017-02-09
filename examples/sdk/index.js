const ui = require('sdk/ui');
const self = require('sdk/self');
const { uuid } = require('sdk/util/uuid');
const Metrics = require('./testpilot-metrics');

const TRACKING_ID = 'UA-XXXXXXXX-YY';

// Note: normally the `UID` value would be generated and saved when the addon is
// first installed.
const UID = uuid().number.replace('{','').replace('}','');

const { sendEvent } = new Metrics({
  id: self.id,
  version: self.version,
  tid: TRACKING_ID,
  uid: UID,
  type: 'sdk'
});

// eslint-disable-next-line no-unused-vars
const btn = ui.ActionButton({
  id: 'metrics-test-button',
  label: 'Metrics Test Button',
  icon: {
    '16': './icon-16.png',
    '32': './icon-32.png',
    '64': './icon-64.png'
  },
  onClick: () => sendEvent({object: 'sdk-button', method: 'click'})
});
