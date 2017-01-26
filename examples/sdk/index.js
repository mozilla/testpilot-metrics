const ui = require('sdk/ui');
const Metrics = require('./testpilot-metrics');

const TRACKING_ID = 'UA-XXXXXXXX-YY';

const { sendEvent } = new Metrics({
  id: 'sdk-example@testpilot-metrics',
  tid: TRACKING_ID,
  uid: '12345',
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
