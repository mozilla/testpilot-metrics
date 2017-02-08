/* globals Metrics:false */
/* eslint-disable no-console */

const TRACKING_ID = 'UA-XXXXXXXX-YY';

// Note: normally the `UID` value would be generated and saved when the addon is
// first installed.
const UID = window.crypto.getRandomValues(new Uint32Array(1)).toString();

const { sendEvent } = new Metrics({
  id: 'webextension-example@testpilot.metrics',
  version: '0.0.1',
  tid: TRACKING_ID,
  uid: UID
});

browser.browserAction.onClicked.addListener(() => {
  console.log('Button clicked! Sending metrics event...');
  sendEvent({
    object: 'webext-button',
    method: 'click'
  });
});
