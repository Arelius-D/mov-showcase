/* ═══════════════════════════════════════════════════
   mov-showcase — the `mov new` session the CLI tab plays

   Data only, the same discipline as map.js: every visible string is declared
   here once, terminal.js renders it and nothing else. There is no logic in
   this file and no string in the terminal that is not in it.

   Every `line` and `prompt` is something mov prints, in mov's spelling. The
   pick-panel notes come from new/screens.py, the name preview from its
   NameScreen, the handoff lines from `mov new` in cli.py, the stage lines
   from the runner, and the deployment digest from a real run against a real
   subscription. verify/mov-strings.json lists the format each one has to
   match, and verify/check.py refuses a line that matches none of them, so
   this session cannot quietly drift from what the tool says.

   Beats:
     prompt   appears whole, in the prompt colour
     input    typed one character at a time after its prompt glyph
     line     printed after a short pause; `tone` picks its colour
     hold     wait, then clear and start again
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

window.MOV.CLI = {
  title: "mov new",
  columns: 64,
  rows: 16,
  beats: [
    { kind: "prompt", text: "$ mov new" },

    { kind: "input", text: "key vault" },
    { kind: "line", tone: "picked", text: "Microsoft.KeyVault/vaults  generic" },
    { kind: "line", tone: "suggested", text: "suggests another resource (target unknown) via properties.tenantId -- not added" },

    { kind: "input", text: "web/sites" },
    { kind: "line", tone: "picked", text: "Microsoft.Web/sites  generic" },
    { kind: "line", tone: "required", text: "+ Microsoft.Web/serverfarms required by Microsoft.Web/sites (properties.serverFarmId)" },
    { kind: "line", tone: "suggested", text: "suggests Microsoft.Network/virtualNetworks/subnets via properties.virtualNetworkSubnetId -- not added" },

    { kind: "input", text: "selfhosted", prompt: "name ›" },
    { kind: "line", text: "Microsoft.KeyVault/vaults  ->  vaults-novatrix-selfhosted" },
    { kind: "line", text: "Microsoft.Web/sites  ->  sites-novatrix-selfhosted" },
    { kind: "line", text: "Microsoft.Web/serverfarms  ->  serverfarms-novatrix-selfhosted" },

    { kind: "line", tone: "ok", text: "OK   wrote profiles/selfhosted.json" },
    { kind: "line", tone: "muted", text: "stages: preflight, rg, cost, resources" },

    { kind: "prompt", text: "Preview it now (mov plan selfhosted)? y" },
    { kind: "line", text: "3/4 resources Additional resources from the catalogue" },
    { kind: "line", tone: "muted", text: "     would deploy mov-selfhosted-resources-1467474a into a new resource group" },

    { kind: "prompt", text: "Deploy it now (mov up selfhosted)? y" },
    { kind: "line", text: "2/4 rg Create the resource group" },
    { kind: "line", text: "     resource group rg-novatrix-selfhosted created in swedencentral" },
    { kind: "line", text: "3/4 resources Additional resources from the catalogue" },
    { kind: "line", tone: "muted", text: "     mov-selfhosted-resources-1467474a" },

    { kind: "hold" },
  ],
};
