/* globals Metrics:false */
/* eslint-disable no-console */

const TRACKING_ID = 'UA-XXXXXXXX-YY';

const { sendEvent } = new Metrics({
  id: 'webextension-example@testpilot.metrics',
  tid: TRACKING_ID,
  uid: '123-456-7890'
});

browser.browserAction.onClicked.addListener(() => {
  console.log('Button clicked! Sending metrics event...');
  sendEvent({
    object: 'webext-button',
    method: 'click'
  });
});
