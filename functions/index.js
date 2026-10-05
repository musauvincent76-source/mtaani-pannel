const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const ADMIN_EMAIL = "WEKA-EMAIL-YAKO@gmail.com"; // email ya admin pekee
const FIVESIM_KEY = defineSecret("FIVESIM_KEY");
const SMM_KEY = defineSecret("SMM_KEY");
const SMM_URL = "https://PROVIDER-YAKO.com/api/v2"; // URL ya API ya SMM provider

const opts = (secrets) => ({ secrets, cors: true });

function guard(req) {
  if (!req.auth || req.auth.token.email !== ADMIN_EMAIL || !req.auth.token.email_verified)
    throw new HttpsError("permission-denied", "Admin tu.");
}

async function fiveSim(path) {
  const r = await fetch("https://5sim.net/v1" + path, {
    headers: { Authorization: "Bearer " + FIVESIM_KEY.value(), Accept: "application/json" },
  });
  const t = await r.text();
  if (!r.ok) throw new HttpsError("failed-precondition", t || "5sim error " + r.status);
  try { return JSON.parse(t); } catch { return { raw: t }; }
}

async function smm(params) {
  const body = new URLSearchParams({ key: SMM_KEY.value(), ...params });
  const r = await fetch(SMM_URL, { method: "POST", body });
  const j = await r.json();
  if (j.error) throw new HttpsError("failed-precondition", String(j.error));
  return j;
}

// ---- NUMBERS (5sim) ----
exports.numBalance = onCall(opts([FIVESIM_KEY]), async (req) => {
  guard(req);
  const p = await fiveSim("/user/profile");
  return { balance: p.balance };
});
exports.numBuy = onCall(opts([FIVESIM_KEY]), async (req) => {
  guard(req);
  const { country, product } = req.data; // mfano: "england", "whatsapp"
  return fiveSim(`/user/buy/activation/${encodeURIComponent(country)}/any/${encodeURIComponent(product)}`);
});
exports.numCheck = onCall(opts([FIVESIM_KEY]), async (req) => {
  guard(req);
  return fiveSim("/user/check/" + encodeURIComponent(req.data.id));
});
exports.numCancel = onCall(opts([FIVESIM_KEY]), async (req) => {
  guard(req);
  return fiveSim("/user/cancel/" + encodeURIComponent(req.data.id));
});
exports.numFinish = onCall(opts([FIVESIM_KEY]), async (req) => {
  guard(req);
  return fiveSim("/user/finish/" + encodeURIComponent(req.data.id));
});

// ---- SMM (standard API v2) ----
exports.smmBalance = onCall(opts([SMM_KEY]), async (req) => { guard(req); return smm({ action: "balance" }); });
exports.smmServices = onCall(opts([SMM_KEY]), async (req) => { guard(req); return { list: await smm({ action: "services" }) }; });
exports.smmOrder = onCall(opts([SMM_KEY]), async (req) => {
  guard(req);
  const { service, link, quantity } = req.data;
  return smm({ action: "add", service: String(service), link, quantity: String(quantity) });
});
exports.smmStatus = onCall(opts([SMM_KEY]), async (req) => {
  guard(req);
  return smm({ action: "status", order: String(req.data.order) });
});
