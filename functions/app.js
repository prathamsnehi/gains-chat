const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const privacyPolicy = readFileSync(
  join(__dirname, "privacy-policy.html"),
  "utf8",
);

// Keep the published privacy URL while retiring the former HTTP API.
module.exports = (req, res) => {
  const pathname = new URL(req.url, "https://gainschat.invalid").pathname;
  if (
    (req.method === "GET" || req.method === "HEAD") &&
    pathname === "/privacy-policy"
  ) {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    );
    res.set("X-Content-Type-Options", "nosniff");
    return res.status(200).send(req.method === "HEAD" ? "" : privacyPolicy);
  }
  return res
    .status(410)
    .json({
      error:
        "This API has been retired. Update Gains Chat to use on-device storage.",
    });
};
