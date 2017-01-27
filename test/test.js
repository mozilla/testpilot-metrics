const sinon = require('sinon');
const mockRequire = require('mock-require');
const chai = require('chai');
chai.use(require('chai-as-promised'));
const { expect, should, assert } = chai;

const Metrics = require('../testpilot-metrics');

/* helpers */

// Running the constructor for different addon types requires different mocks.
// These functions collect the reused setup/teardown code.
function beforeWebExt(g) {
  g.navigator = { sendBeacon: () => {} };
  g.BroadcastChannel = function() { return { postMessage: function(){} } };
  return g;
}

function afterWebExt(g) {
  delete g.navigator;
  delete g.BroadcastChannel;
  return g;
}

function beforeSDK(g) {
  // SDK type uses require('chrome') to get Cu,
  // then uses Cu.import to load Services.jsm,
  // then uses the Services global to get sendBeacon from
  // Services.appShell.hiddenDOMWindow.navigator.
  mockRequire('chrome', { Cu: { import: () => {} }});
  global.Services = {appShell: {hiddenDOMWindow: {navigator: {sendBeacon: () => {}}}}};
}

function afterSDK(g) {
  mockRequire.stop('chrome');
  delete global.Services;
}

function beforeBootstrapped(g) {
  // The bootstrapped type uses Components.utils.import to load Services.jsm,
  // then uses the Services global to get sendBeacon from
  //   Services.appShell.hiddenDOMWindow.navigator.
  global.Components = {utils: {import: () => {}}};
  global.Services = {appShell: {hiddenDOMWindow: {navigator: {sendBeacon: () => {}}}}};
}

function afterBootstrapped(g) {
  delete global.Components;
  delete global.Services;
}

// TODO: do we really want all this polluted, shared global space?
describe('Metrics constructor', () => {
  describe('required "id" (addon ID) argument', () => {
    it('should throw if the id is missing', () => {
      const missingId = () => { const m = new Metrics({ uid: 123 }) };
      expect(missingId).to.throw(Error);
    });
    it('should throw if "id" is null', () => {
      const nullId = () => { const m = new Metrics({ id: null, uid: 123 }) };
      expect(nullId).to.throw(Error);
    });
  });
  describe('required "uid" (non-PII user ID) argument', () => {
    it('should throw if the uid is missing', () => {
      const missingCid = () => { const m = new Metrics({ id: '@my-addon' }) };
      expect(missingCid).to.throw(Error);
    });
    it('should throw if uid is null', () => {
      const nullCid = () => { const m = new Metrics({ id: '@my-addon', uid: null }) };
      expect(nullCid).to.throw(Error);
    });
  });
  describe('optional "type" (addon type) argument', () => {
    it('should default to "webextension"', () => {
      beforeWebExt(global);

      const m = new Metrics({ id: '@my-addon', version: '1.0.2', uid: 123, type: 'webextension' });
      expect(m.type).to.equal('webextension');

      afterWebExt(global);
    });
    it('should accept "webextension"', () => {
      beforeWebExt(global);

      const m = new Metrics({ id: '@my-addon', version: '1.0.2', uid: 123, type: 'webextension' });

      afterWebExt(global);
    });
    it('should accept "sdk"', () => {
      beforeSDK(global);

      const m = new Metrics({ id: '@my-addon', version: '1.0.2', uid: 123, type: 'sdk' });

      afterSDK(global);
    });
    it('should accept "bootstrapped"', () => {
      beforeBootstrapped(global);

      const m = new Metrics({ id: '@my-addon', version: '1.0.2', uid: 123, type: 'bootstrapped' });

      afterBootstrapped(global);
    });
    it('should reject any other value', () => {
      expect(() => {
        const m = new Metrics({ id: '@my-addon', version: '1.0.2', uid: 123, type: 'foo' });
      }).to.throw(Error);
    });
  });
  describe('optional "debug" argument', () => {
    it.skip('should not call console.log if this.debug is false', () => {});
    it.skip('should call console.log if this.debug is true', () => {});
    describe('can be toggled in a running instance', () => {
      it.skip('should stop logging if this.debug is changed from true to false', () => {});
      it.skip('should start logging if this.debug is changed from false to true', () => {});
    });
  });
  describe('the value of this.topic implicitly set by the constructor', () => {
    it('should be set to "testpilot-telemetry" by default', () => {
      beforeWebExt(global);

      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345'});
      expect(m.topic).to.equal('testpilot-telemetry');

      afterWebExt(global);
    });
    it('should be set to "testpilot-telemetry" when the type is webextension', () => {
      beforeWebExt(global);

      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345'});
      expect(m.topic).to.equal('testpilot-telemetry');

      afterWebExt(global);
    });
    it('should be set to "testpilottest" when the type is sdk', () => {
      beforeSDK(global);

      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345', type: 'sdk'});
      expect(m.topic).to.equal('testpilottest');

      afterSDK(global);
    });
    it('should be set to "testpilot" if the addon ID is "@testpilot-addon" (the ID of the Test Pilot addon)', () => {
      beforeWebExt(global);

      const m = new Metrics({id: '@testpilot-addon', version: '1.0.2', uid: '12345'});
      expect(m.topic).to.equal('testpilot');

      afterWebExt(global);
    });
  });
});


// sendEvent should call _sendToClient, _gaTransform, and _gaSend
describe('sendEvent', () => {
  it('should call _sendToClient', () => {
      beforeWebExt(global);
      // Note: by not setting tid in the constructor, the GA methods won't be
      // called.
      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345'});
      const stub = sinon.stub(m, '_sendToClient');

      m.sendEvent({method: 'click', object: 'button'});
      expect(stub.calledOnce).to.be.true;

      afterWebExt(global);
  });
  it('should call _gaTransform if this.tid is set', () => {
      beforeWebExt(global);
      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345', tid: 'UA-49796218-47'});
      const clientStub = sinon.stub(m, '_sendToClient');
      const gaStub = sinon.stub(m, '_gaTransform');

      m.sendEvent({method: 'click', object: 'button'});
      expect(gaStub.calledOnce).to.be.true;

      afterWebExt(global);
  });
  it('should call _gaSend if this.tid is set', () => {
      beforeWebExt(global);
      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345', tid: 'UA-49796218-47'});
      const clientStub = sinon.stub(m, '_sendToClient');
      const gaStub = sinon.stub(m, '_gaSend');

      m.sendEvent({method: 'click', object: 'button'});
      expect(gaStub.calledOnce).to.be.true;

      afterWebExt(global);
  });
  it('should not call _gaTransform if this.tid is not set', () => {
      beforeWebExt(global);
      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345'});
      const clientStub = sinon.stub(m, '_sendToClient');
      const gaStub = sinon.stub(m, '_gaTransform');

      m.sendEvent({method: 'click', object: 'button'});
      expect(gaStub.calledOnce).to.be.false;

      afterWebExt(global);
  });
  it('should not call _gaSend if this.tid is not set', () => {
      beforeWebExt(global);
      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345'});
      const clientStub = sinon.stub(m, '_sendToClient');
      const gaStub = sinon.stub(m, '_gaSend');

      m.sendEvent({method: 'click', object: 'button'});
      expect(gaStub.calledOnce).to.be.false;

      afterWebExt(global);
  });
});
describe('_sendToClient', () => {
  describe('webextension type', () => {
    it('should call BroadcastChannel.postMessage exactly once', () => {
      beforeWebExt(global);
      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345'});
      const postMessageStub = sinon.stub(m._channel, 'postMessage');

      m.sendEvent({method: 'click', object: 'button'});
      expect(postMessageStub.calledOnce).to.be.true;

      afterWebExt(global);
    });
    it('should format the postMessage packet correctly', () => {
      beforeWebExt(global);
      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345'});
      const postMessageStub = sinon.stub(m._channel, 'postMessage');

      m.sendEvent({method: 'click', object: 'button'});
      expect(postMessageStub.withArgs({id: '@my-addon', method: 'click', object: 'button'}));
    });
    it('should not serialize the packet before sending', () => {
      beforeWebExt(global);
      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345'});
      const postMessageStub = sinon.stub(m._channel, 'postMessage');

      m.sendEvent({method: 'click', object: 'button'});
      expect(typeof postMessageStub.getCall(0).args[0] !== 'string');
    });
  });
  describe('sdk type', () => {
    it('should call Services.obs.notifyObservers exactly once', () => {
      beforeSDK(global);
      const notifyStub = sinon.stub();
      global.Services.obs = { notifyObservers: notifyStub };
      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345', type: 'sdk'});

      m.sendEvent({method: 'click', object: 'button'});
      expect(notifyStub.calledOnce).to.be.true;

      afterSDK(global);
    });
    it.skip('should format the nsIObserver packet correctly', () => {});
  });
  describe('bootstrapped type', () => {
    it('should call Services.obs.notifyObservers exactly once', () => {
      beforeBootstrapped(global);
      const notifyStub = sinon.stub();
      global.Services.obs = { notifyObservers: notifyStub };
      const m = new Metrics({id: '@my-addon', version: '1.0.2', uid: '12345', type: 'bootstrapped'});

      m.sendEvent({method: 'click', object: 'button'});
      expect(notifyStub.calledOnce).to.be.true;

      afterBootstrapped(global);
    });
    it.skip('should format the nsIObserver packet correctly', () => {});
  });
});
describe('_sendToGA method', () => {
  it.skip('should send properly encoded event to the GA URL', () => {
    // expect that sendBeacon was called with some specific URL including
    // the encoded fake event
  });
  it.skip('should use _formEncode to transform the event', () => {});
  it.skip('should use sendBeacon to send the event', () => {});
  it.skip('should not send the event when "this.dryrun" is true', () => {});
});
describe('_formEncode method', () => {
  it('should return an empty string if an empty object is passed in', () => {
    expect(Metrics.prototype._formEncode.call(null, {})).to.equal('');
  });
  it('should return an empty string if no argument is passed in', () => {
    expect(Metrics.prototype._formEncode.call(null, undefined)).to.equal('');
  });
  it('should connect key and value using "="', () => {
    expect(Metrics.prototype._formEncode.call(null, {a: 'b'})).to.equal('a=b');
  });
  it('should connect multiple key-value pairs using "&"', () => {
    expect(Metrics.prototype._formEncode.call(null, {a: 'b',c: 'd'})).to.equal('a=b&c=d');
  });
  it('should encode a single space as "%20", not "+", following GA docs', () => {
    expect(Metrics.prototype._formEncode.call(null, {a: 'b c'})).to.equal('a=b%20c');
  });
  it('should correctly encode "<"', () => {
    expect(Metrics.prototype._formEncode.call(null, {a: 'b<c'})).to.equal('a=b%3Cc');
  });
});
