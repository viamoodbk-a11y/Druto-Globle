const fetch = require('node-fetch');

const AUTH_KEY = "485556T1e430nu6955ff3cP1";
const WIDGET_ID = "356c45667a59363733373933";

async function run() {
  const sendRes = await fetch("https://api.msg91.com/api/v5/widget/sendOtp", {
    method: "POST",
    headers: { "authkey": AUTH_KEY, "tokenAuth": AUTH_KEY, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ identifier: "919209618640", mobile: "919209618640", widgetId: WIDGET_ID })
  });
  const sendData = await sendRes.json();
  console.log("Send:", sendData);
  const reqId = sendData.message;

  const verifyRes = await fetch("https://api.msg91.com/api/v5/widget/verifyOtp", {
    method: "POST",
    headers: { "authkey": AUTH_KEY, "tokenAuth": AUTH_KEY, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ otp: "1234", reqId, requestId: reqId, widgetId: WIDGET_ID })
  });
  const verifyData = await verifyRes.json();
  console.log("Verify:", verifyData);
}
run();
