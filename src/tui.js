/* ═══════════════════════════════════════════════════
   mov-showcase — the `mov new` screens the TUI tab plays

   Data only. mov's picker is a full-screen application with four screens --
   pick, configure, name, review -- and this is one session through them as a
   sequence of frames. screens.js draws a frame and nothing else.

   Every label, placeholder, note and key binding is the one in
   mov/src/mov/new/screens.py, in its spelling. What the operator types
   (`query`, `value`) and what mov generates from it (`json`) are the only
   free text. verify/check.py holds every other string to a format in
   verify/mov-strings.json.

   Frames:
     pick        the search box, its results, and the panel of what is picked
     configure   the questions the picks raised
     name        the project's name, and every resource name it produces
     review      the profile as it will be written
     hold        wait, then start again
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

window.MOV.TUI = {
  title: "mov new",
  columns: 80,
  rows: 22,
  placeholder: "Search 4,694 resource types…",
  empty: "nothing picked yet",
  frames: [
    {
      screen: "pick",
      query: "",
      results: [],
      picked: [],
      notes: [],
      footer: ["Configure", "Quit"],
    },
    {
      screen: "pick",
      query: "key vault",
      typing: true,
      results: [
        "Microsoft.KeyVault/vaults",
        "Microsoft.KeyVault/deletedVaults",
        "Microsoft.KeyVault/locations/deletedVaults",
      ],
      highlight: 0,
      picked: [],
      notes: [],
      footer: ["Configure", "Quit"],
    },
    {
      screen: "pick",
      query: "key vault",
      results: [
        "Microsoft.KeyVault/vaults",
        "Microsoft.KeyVault/deletedVaults",
        "Microsoft.KeyVault/locations/deletedVaults",
      ],
      highlight: 0,
      picked: [{ type: "Microsoft.KeyVault/vaults", badge: "generic" }],
      notes: ["suggests another resource (target unknown) via properties.tenantId -- not added"],
      footer: ["Configure", "Quit"],
    },
    {
      screen: "pick",
      query: "web/sites",
      typing: true,
      results: ["Microsoft.Web/sites", "Microsoft.Web/sites/slots", "Microsoft.Web/sites/config"],
      highlight: 0,
      picked: [{ type: "Microsoft.KeyVault/vaults", badge: "generic" }],
      notes: [],
      footer: ["Configure", "Quit"],
    },
    {
      screen: "pick",
      query: "web/sites",
      results: ["Microsoft.Web/sites", "Microsoft.Web/sites/slots", "Microsoft.Web/sites/config"],
      highlight: 0,
      picked: [
        { type: "Microsoft.KeyVault/vaults", badge: "generic" },
        { type: "Microsoft.Web/sites", badge: "generic" },
        {
          type: "Microsoft.Web/serverfarms",
          badge: "generic",
          origin: "required by Microsoft.Web/sites (properties.serverFarmId)",
        },
      ],
      notes: [
        "+ Microsoft.Web/serverfarms required by Microsoft.Web/sites (properties.serverFarmId)",
        "suggests Microsoft.Network/virtualNetworks/subnets via properties.virtualNetworkSubnetId -- not added",
      ],
      footer: ["Configure", "Quit"],
    },
    {
      screen: "configure",
      sections: [
        {
          type: "Microsoft.KeyVault/vaults",
          fields: [
            { label: "sku", required: true, note: "Microsoft.KeyVault/vaults requires sku.", value: '{"family": "A", "name": "standard"}' },
            { label: "tenantId", required: true, note: "Microsoft.KeyVault/vaults requires tenantId.", value: "183c226e-1463-4978-8672-ac9c4a38d90b" },
          ],
        },
        {
          type: "Microsoft.Web/serverfarms",
          fields: [
            { label: "sku", required: true, note: "Microsoft.Web/serverfarms requires sku.", value: '{"name": "F1", "tier": "Free"}' },
          ],
        },
      ],
      footer: ["Name it", "Back"],
    },
    {
      screen: "name",
      heading: "Name the project",
      hint: "this becomes the env: letters and digits, e.g. selfhosted",
      value: "selfhosted",
      typing: true,
      preview: [],
      footer: ["Back"],
    },
    {
      screen: "name",
      heading: "Name the project",
      hint: "this becomes the env: letters and digits, e.g. selfhosted",
      value: "selfhosted",
      preview: [
        "Microsoft.KeyVault/vaults  ->  vaults-novatrix-vaults",
        "Microsoft.Web/sites  ->  sites-novatrix-sites",
        "Microsoft.Web/serverfarms  ->  serverfarms-novatrix-serverfarms",
      ],
      footer: ["Back"],
    },
    {
      screen: "review",
      path: "profiles/selfhosted.json",
      json: [
        "{",
        '  "env": "selfhosted",',
        '  "stages": ["preflight", "rg", "cost", "resources"],',
        '  "resources": [',
        '    { "type": "Microsoft.KeyVault/vaults", "apiVersion": "2022-07-01", "purpose": "vaults", …',
        '    { "type": "Microsoft.Web/sites", "apiVersion": "2022-03-01", "purpose": "sites",',
        '      "properties": { "serverFarmId": "@resourceId:serverfarms" } },',
        '    { "type": "Microsoft.Web/serverfarms", "apiVersion": "2022-03-01", "purpose": "serverfarms",',
        '      "sku": { "name": "F1", "tier": "Free" }, "properties": {} }',
        "  ]",
        "}",
      ],
      note: "More entries, tags and overrides belong in the file itself -- it is yours to edit before anything deploys.",
      footer: ["Write the profile", "Back"],
    },
    { screen: "hold" },
  ],
};
