// Web Worker timer — not throttled when the tab is backgrounded.
// Receives: { cmd: "start", interval: number } or { cmd: "stop" }
// Posts:    "tick" at the given interval

let timerId = null;

self.onmessage = function (e) {
  const data = e.data;

  if (data.cmd === "start") {
    if (timerId !== null) {
      clearInterval(timerId);
    }
    timerId = setInterval(function () {
      self.postMessage("tick");
    }, data.interval || 5);
  }

  if (data.cmd === "stop") {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
