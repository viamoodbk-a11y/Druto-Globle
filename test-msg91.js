const fetch = require('node-fetch');

const AUTH_KEY = "485556T1e430nu6955ff3cP1";
const WIDGET_ID = "356c45667a59363733373933";

fetch("https://api.msg91.com/api/v5/widget/sendOtp", {
  method: "POST",
  headers: {
    "authkey": AUTH_KEY,
    "tokenAuth": AUTH_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  body: JSON.stringify({
    identifier: "919209618640",
    mobile: "919209618640",
    widgetId: WIDGET_ID
  })
}).then(res => res.json()).then(console.log).catch(console.error);
