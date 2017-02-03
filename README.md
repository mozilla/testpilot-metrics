# `testpilot-metrics`

The `testpilot-metrics` library sends pings to Google Analytics and Mozilla's
internal metrics pipeline. It is designed for use by Test Pilot experiments.


## Installation

`npm install testpilot-metrics`

The only file you need in your build chain is `testpilot-metrics.js`. It has no
dependencies.


## Google Analytics setup

1) [Create a GA account](https://www.google.com/analytics), if you don't have one.

2) [Create a mobile app GA property](https://support.google.com/analytics/answer/2614741?hl=en)
for your experiment.

  - The app type has version number tracking baked in, which helps with
    connecting releases to changes in usage or error rates over time.

  - The app dashboard also has a real-time event view, which you can use
    to watch test events land while debugging.

3) If you think you might want to take advantage of Test Pilot's [A/B testing support](https://github.com/mozilla/testpilot/blob/master/docs/experiments/variants.md),
then [create a Custom Dimension](https://support.google.com/analytics/answer/2709829?hl=en#set_up_custom_dimensions)
that you can use to track variant information. By convention, the first custom
dimension, `cd1`, should be used by `testpilot-metrics` for recording variant info.
You can use the higher values for other experiment-specific extra fields you
want to send to GA.


## Usage

### Quick start

Here's a simple node-style example:

```js

const Metrics = require('testpilot-metrics');

const { sendEvent } = new Metrics({
  id: '@my-addon',
  version: '1.0.2a',
  uid: 'some-non-PII-user-ID',
  tid: 'UA-XXXXXXXX-YY'
});

sendEvent({
  object: 'webext-button',
  method: 'click'
});
```

### Sending extra fields in addition to method / object / category

If you need to send fields in addition to the defaults, you'll need to follow
different steps for GA and for Mozilla's data pipeline.

#### Mozilla support

For Mozilla's data pipeline, you'll need to define a Redshift schema that
includes all parameters, their types, and their size. See the [Test Pilot
metrics docs](https://github.com/mozilla/testpilot/tree/master/docs/metrics)
for more details.

Once you've defined the storage schema, you can simply insert extra fields as
top-level keys in the `sendEvent` parameter object, for example:

```js

// Track the `clientX` and `clientY` values of an experiment popup window,
// and send along with the method, object, and category:

sendEvent({
  object: 'special-button',
  method: 'click',
  clientX: 185,
  clientY: 560
});
```

Sending custom fields to Google Analytics requires one additional step.

#### Advanced Google Analytics support: the `transform` function parameter

Google Analytics doesn't support arbitrary named parameters. To send extra
fields to GA, you must decide how to map your extra fields to the GA [custom
fields](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#customs).

Once you've figured out this mapping, pass a second argument to `sendEvent`:
a `transform` function that will convert the extra fields to GA custom fields.

The `transform` function is passed 2 arguments: first, the raw event object
that was passed to `sendEvent`; second, the default GA ping that would normally
be submitted (ignoring any extra parameters). The `transform` function should
return a JS object whose keys are the GA parameters. The `testpilot-metrics`
library will then encode and send the `transform` function's output.

Note that the first custom dimension, `cd1`, is reserved for variant testing.
So, taking the example from the last section, you might map the extra `clientX`
field to `cd2`, and `clientY` to `cd3`, and otherwise leave the GA event object
alone. You'd do this:

```js

sendEvent({
  object: 'special-button',
  method: 'click',
  clientX: 185,
  clientY: 560
},
transform: (input, output) => {
  // Add two extra fields from the input object to the output object.
  output.cd2 = input.clientX;
  output.cd3 = input.clientY;
  // Return the transformed output object, to be encoded and sent to GA.
  return output;
});
```

Google Analytics defines [8 different hit types](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#t),
but this library only uses the `Event` hit type by default. Transform functions
allow experiment authors to submit other hit types. For example, uncaught
Errors could be sent using the GA `exception` type:

```js

try {
  somethingImportant();
} catch (err) {
  console.error(`somethingImportant failed: ${ex}`);
  sendEvent({
    // This (method, object) pair will be sent to Mozilla's internal metrics.
    method: 'uncaught-exception',
    object: 'somethingImportant'
  },
  transform: (input, output) => {
    // Change the GA hit type.
    output.t = 'exception';
    // Add the exception description field, mandatory for 'exception' hits.
    output.exd = `somethingImportant: ${err}`
    return output;
  });
}
```


### API docs

See [API.md](API.md).


### WebExtension Usage

Follow the steps below to add `testpilot-metrics` to your WebExtension. You can
also look at the [example WebExtension](./examples/webextension) in this repo for a more in-depth example.


1) Add the `testpilot-metrics.js` file to your project :-)

2) Add the GA URL permission to your manifest.json:

```js
// manifest.json
{ ...
  "permissions": [ "https://ssl.google-analytics.com/collect" ],
  ...
}
```

3) Add the `testpilot-metrics.js` file to the list of background scripts in manifest.json, _before_ the background script that will use the library:

```js
// manifest.json
{ ...
  "background": {
    "scripts": [ "testpilot-metrics.js", "background.js" ]
  },
  ...
}
```

4) In your startup code, call the Metrics constructor, passing in your add-on's
ID (`id`) and version (`version`), a non-PII user ID (`uid`), and, if you are
using Google Analytics, a Google Analytics tracking ID (`tid`):

```js
// background.js startup
const { sendEvent } = new Metrics({
  id: 'webextension-example@testpilot.metrics',
  version: '0.0.1',
  tid: 'UA-XXXXXXXX-YY',
  uid: '123-456-7890' // this can be any non-PII identifier that is stable over time
});
```

5) Each time an interesting event occurs, call `sendEvent`, passing in event
details in method/object/category format. If you are running any multivariate
or A/B tests, you can include that info as well:

```js
// Example click handler, somewhere in background.js
browser.browserAction.onClicked.addListener((evt) => {
  sendEvent({
    object: 'webext-button',
    method: 'click',

    // these fields are optional:
    category: 'toolbar',
    variant: 'green-button'
  });
});
```

### SDK Usage

Follow the steps below to add `testpilot-metrics` to your SDK add-on. You can
also look at the [example SDK add-on](./examples/sdk) in this repo for a more in-depth example.

1) Add the `testpilot-metrics.js` file to your project :-)

2) Load the library using the SDK loader:

```js
const Metrics = require('testpilot-metrics');
```

3) In your startup code, call the Metrics constructor, passing in your add-on's
ID (`id`) and version (`version`), a non-PII user ID (`uid`), and, if you are
using Google Analytics, a Google Analytics tracking ID (`tid`):

```js
const { sendEvent } = new Metrics({
  id: 'sdk-example@testpilot.metrics',
  version: '1.0.2',
  tid: 'UA-XXXXXXXX-YY',
  uid: '123-456-7890' // this can be any non-PII identifier that is stable over time
});
```

4) Each time an interesting event occurs, call `sendEvent`, passing in event
details in method/object/category format. If you are running any multivariate
or A/B tests, you can include that info as well:

```js
const btn = ui.ActionButton({
  id: 'metrics-test-button',
  label: 'Metrics Test Button',
  icon: {
    '16': './icon-16.png',
    '32': './icon-32.png',
    '64': './icon-64.png'
  },
  onClick: () => {
    sendEvent({
      object: 'sdk-button',
      method: 'click',

      // these fields are optional:
      category: 'interactions',
      variant: 'green-button'
    });
  }
});
```

### Google Analytics output

For simplicity, the only GA hit type currently supported is the `Event` hit type.

As an example, the following ping:

```js

const { sendEvent } = new Metrics({
  id: '@my-addon',
  version: '1.2.3',
  tid: 'UA-XXXXXXXX-YY',
  uid: '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
});

sendEvent({
  method: 'click',
  object: 'home-button-1',
  category: 'toolbar-menu',
  variant: 'green-button'
});
```

is transformed into a GA Measurement Protocol hit with parameters:

```js
msg = {
     v: 1,
    an: '@my-addon',
    av: '1.2.3',
   tid: 'UA-XXXXXXXX-YY',
   uid: '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
     t: 'event',
    ec: 'toolbar-menu',
    ea: 'click',
    el: 'home-button-1',
   cd1: 'green-button'
}
```

These parameters are URL encoded before sending.

## Interested in contributing?

Grab a bug and/or say hello in the testpilot channel on Mozilla IRC :-)

You can run tests via `npm run test`.

## License

MPL 2.0

## Author

Brought to you by @6a68 and the Test Pilot team at Mozilla.
