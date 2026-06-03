/**
 * Netlify Function: kommo-lead
 * --------------------------------------------------------------------------
 * Receives a JSON POST from the landing booking quiz and creates a Contact +
 * Lead (with a note) in Kommo CRM.
 *
 * The secret API token is read from the KOMMO_TOKEN environment variable
 * (set it in Netlify → Site settings → Environment variables). It is NEVER
 * shipped to the browser and must not be committed to the repo.
 *
 * Non-secret account IDs are hardcoded below.
 *
 * Endpoint (from the client): POST /.netlify/functions/kommo-lead
 * Body: { name, phone, email, age, experience, location }
 */

const BASE_URL = "https://bridgeview.kommo.com/api/v4";

// --- Non-secret Kommo account configuration ---
const PIPELINE_ID = 10044839;
const NEW_LEAD_STATUS_ID = 77725931;
const RESPONSIBLE_USER_ID = 12327415;

const FIELD_AGE_ID = 1218991; // text
const FIELD_EXPERIENCE_ID = 1226369; // select (enum)
const FIELD_LOCATION_ID = 1226371; // select (enum)
const FIELD_SOURCE_ID = 1129548; // select (enum)
const SOURCE_WEBSITE_ENUM = 934874; // "Website lead"

const EXPERIENCE_MAP = {
  none: 1035705, // None — first time
  some: 1035707, // Some — park/school
  club: 1035709 // Club experience
};

const LOCATION_MAP = {
  yes: 1035711, // Yes — close
  far: 1035713, // Far but ok
  unsure: 1035715 // Not sure
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(statusCode, body) {
  return { statusCode: statusCode, headers: CORS, body: JSON.stringify(body) };
}

/** POST to Kommo with one automatic retry on HTTP 429 (rate limit). */
async function kommoPost(token, path, payload) {
  const opts = {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  };
  let res = await fetch(BASE_URL + path, opts);
  if (res.status === 429) {
    await new Promise(function (r) { setTimeout(r, 1000); });
    res = await fetch(BASE_URL + path, opts);
  }
  return res;
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { error: "Invalid JSON body" });
  }

  const name = String(data.name || "").trim();
  const phone = String(data.phone || "").trim();
  const email = String(data.email || "").trim();
  const age = String(data.age || "").trim();
  const experience = String(data.experience || "").trim();
  const location = String(data.location || "").trim();

  // Validate required input.
  if (!name || !phone || !email) {
    return json(400, { error: "name, phone and email are required" });
  }

  const token = process.env.KOMMO_TOKEN;
  if (!token) {
    console.error("KOMMO_TOKEN env var is not set — skipping CRM push.");
    // Don't trap the visitor; Netlify Forms still has the data as a backup.
    return json(200, { success: false, error: "CRM not configured" });
  }

  try {
    // --- Step 1: create the contact ---
    const contactRes = await kommoPost(token, "/contacts", [
      {
        name: name,
        custom_fields_values: [
          { field_code: "PHONE", values: [{ value: phone, enum_code: "WORK" }] },
          { field_code: "EMAIL", values: [{ value: email, enum_code: "WORK" }] }
        ]
      }
    ]);
    if (contactRes.status >= 500) {
      throw new Error("Kommo /contacts returned " + contactRes.status);
    }
    const contactBody = await contactRes.json().catch(function () { return {}; });
    const contactId =
      contactBody &&
      contactBody._embedded &&
      contactBody._embedded.contacts &&
      contactBody._embedded.contacts[0] &&
      contactBody._embedded.contacts[0].id;
    if (!contactId) {
      console.error("Kommo contact not created:", JSON.stringify(contactBody));
      return json(200, { success: false, error: "contact not created" });
    }

    // --- Step 2: create the lead ---
    const leadFields = [];
    if (age) leadFields.push({ field_id: FIELD_AGE_ID, values: [{ value: age }] });
    if (EXPERIENCE_MAP[experience]) {
      leadFields.push({ field_id: FIELD_EXPERIENCE_ID, values: [{ enum_id: EXPERIENCE_MAP[experience] }] });
    }
    if (LOCATION_MAP[location]) {
      leadFields.push({ field_id: FIELD_LOCATION_ID, values: [{ enum_id: LOCATION_MAP[location] }] });
    }
    leadFields.push({ field_id: FIELD_SOURCE_ID, values: [{ enum_id: SOURCE_WEBSITE_ENUM }] });

    const leadRes = await kommoPost(token, "/leads", [
      {
        name: "🌐 Landing: " + name + (age ? " (child " + age + ")" : ""),
        pipeline_id: PIPELINE_ID,
        status_id: NEW_LEAD_STATUS_ID,
        responsible_user_id: RESPONSIBLE_USER_ID,
        _embedded: {
          contacts: [{ id: contactId }],
          tags: [{ name: "Landing Quiz" }]
        },
        custom_fields_values: leadFields
      }
    ]);
    if (leadRes.status >= 500) {
      throw new Error("Kommo /leads returned " + leadRes.status);
    }
    const leadBody = await leadRes.json().catch(function () { return {}; });
    const leadId =
      leadBody &&
      leadBody._embedded &&
      leadBody._embedded.leads &&
      leadBody._embedded.leads[0] &&
      leadBody._embedded.leads[0].id;
    if (!leadId) {
      console.error("Kommo lead not created:", JSON.stringify(leadBody));
      return json(200, { success: false, error: "lead not created", contact_id: contactId });
    }

    // --- Step 3: attach a human-readable note (best effort) ---
    const noteText =
      "📋 Заявка с лендинга BSA\n\n" +
      "👤 " + name + "\n" +
      "📞 " + phone + "\n" +
      "📧 " + email + "\n\n" +
      "👶 Возраст ребёнка: " + (age || "—") + "\n" +
      "⚽ Опыт: " + (experience || "—") + "\n" +
      "📍 Локация удобна: " + (location || "—") + "\n\n" +
      "🔗 Источник: bsamarketing.netlify.app";
    try {
      await kommoPost(token, "/leads/" + leadId + "/notes", [
        { note_type: "common", params: { text: noteText } }
      ]);
    } catch (noteErr) {
      console.error("Kommo note failed (non-fatal):", noteErr);
    }

    return json(200, { success: true, lead_id: leadId, contact_id: contactId });
  } catch (err) {
    // 5xx / network errors: the visitor still sees success and the lead is
    // preserved in Netlify Forms as a backup. Log for debugging.
    console.error("Kommo integration error:", err);
    return json(200, { success: false, error: "CRM temporarily unavailable" });
  }
};
