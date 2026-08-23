/* ═══════════════════════════════════════════════════
   mov-showcase — the entire content of the page

   Every zone, group, object and arc is declared here once. render.js builds
   the DOM from this and nothing else, so there is no object on the page that
   is not in this file and no text written in two places. verify/check.py fails
   the build if an arc names an object that does not exist, if an object sits
   in a zone or group that was never declared, or if an object has no arc at
   all — an island on a map about relationships is a content bug, not a layout
   one.

   Every value shown is one mov actually produced against a real subscription,
   copied from the workspace or from the tool's own output. The single
   exception is the budget alert address, replaced with a neutral one because
   this page is public.

   Classic script, no imports: ES modules are blocked over file://, and this
   page has to open by double-clicking it.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

/* ─── ZONES ─────────────────────────────────────────
   Three places a deployment lives, laid out as islands rather than columns.
   `span` is how many twelfths of the map an island takes: they hold different
   amounts, so they are different sizes. Three equal pillars is what a grid
   gives you when nobody decides, and it is not a decision.
   ─────────────────────────────────────────────────── */
window.MOV.ZONES = [
  {
    id: "machine",
    letter: "A",
    span: 7,
    name: "Your machine",
    note: "Files you own and can read. Nothing here is Azure's.",
  },
  {
    id: "github",
    letter: "B",
    span: 5,
    name: "GitHub",
    note: "Where the code lives. mov never uploads a file to a server.",
  },
  {
    id: "azure",
    letter: "C",
    span: 12,
    name: "Azure",
    note: "Where it becomes real. The only zone that bills you.",
  },
];

/* ─── GROUPS ────────────────────────────────────────
   Clusters inside a zone. A flat list per zone flattened structure that is
   really there: vnet, subnet and nsg are one thing, pip, nic and vm are
   another, and only the arcs said so. Grouping says it in the layout, and puts
   related objects close enough that the arcs between them stay short.

   Order here is the order down the zone.
   ─────────────────────────────────────────────────── */
window.MOV.GROUPS = [
  { id: "tools", zone: "machine", name: "Tools" },
  { id: "declared", zone: "machine", name: "What you declare" },
  { id: "produced", zone: "machine", name: "What mov writes back" },

  { id: "yours", zone: "github", name: "Your code" },
  { id: "upstream", zone: "github", name: "Where mov comes from" },

  { id: "account", zone: "azure", name: "Account" },
  { id: "environment", zone: "azure", name: "Environment" },
  { id: "network", zone: "azure", name: "Network" },
  { id: "machine-c", zone: "azure", name: "The machine" },
];

/* ─── OBJECTS ───────────────────────────────────────
   `kind` is used for the glyph and nothing else.

   `short` is what the card says, `name` is what the thing is really called.
   Eight cards in Zone C carrying the same company token said nothing eight
   times; the generated name is worth more in the panel, where it reads as
   evidence that the patterns in naming.json produced it.
   ─────────────────────────────────────────────────── */
window.MOV.OBJECTS = [
  /* ── Zone A — your machine ── */
  {
    id: "shell",
    zone: "machine",
    group: "tools",
    kind: "shell",
    name: "Your shell",
    blurb: "PowerShell, any OS.",
    detail:
      "mov is a command you type. Windows, macOS and Linux, same PowerShell. It installs per-user and never asks for administrator rights.",
  },
  {
    id: "mov",
    zone: "machine",
    group: "tools",
    kind: "tool",
    name: "mov",
    blurb: "The tool.",
    detail:
      "Reads your JSON, works out every name and parameter, drives the Azure CLI. It knows nothing about Azure on its own: no region, size, image or API version appears in its source, and a test fails the build if one does.",
    evidence: {
      language: "text",
      text: "mov plan v34     what would change\nmov up v34       make it so\nmov down v34     delete the lot",
    },
  },
  {
    id: "az",
    zone: "machine",
    group: "tools",
    kind: "tool",
    name: "Azure CLI",
    blurb: "What actually talks to Azure.",
    detail:
      "mov shells out to `az`. Everything it does is a command you could have typed yourself. Every one is recorded.",
  },
  {
    id: "workspace",
    zone: "machine",
    group: "declared",
    kind: "file",
    short: "Workspace file",
    name: "mov.workspace.json",
    blurb: "Which tenant, which subscription.",
    detail:
      "Pins the subscription mov may act on. Deploying to the wrong one cannot be undone. So it is the default, not a flag you have to remember.",
    evidence: {
      language: "json",
      text: '{\n  "name": "mov25-azure",\n  "azure": {\n    "tenantId": "183c226e-…",\n    "subscriptionId": "fb5e8372-…"\n  }\n}',
    },
  },
  {
    id: "naming",
    zone: "machine",
    group: "declared",
    kind: "file",
    short: "Naming patterns",
    name: "naming.json",
    blurb: "One pattern per resource type.",
    detail:
      "Every name in Azure comes from here, with the rule it has to satisfy. A name that breaks its rule is a hard error. mov will not truncate a storage account to make it fit.",
    evidence: {
      language: "json",
      text: '"patterns": {\n  "resourceGroup": "rg-{company}-{env}",\n  "virtualMachine": "vm-{company}-{purpose}",\n  "storageAccount": "st{company}{user}{seq:02d}"\n}',
    },
  },
  {
    id: "defaults",
    zone: "machine",
    group: "declared",
    kind: "file",
    short: "Defaults",
    name: "defaults.json",
    blurb: "What every environment inherits.",
    detail:
      "Region, tags, budget, VM size, admin user, host packages. A profile only states what makes it different. Nothing here is a code-side fallback: a missing value names the file that should have supplied it.",
    evidence: {
      language: "json",
      text: '"location": "swedencentral",\n"cost": { "amount": 200, "currency": "SEK" },\n"itemDefaults": {\n  "compute.vms": {\n    "size": "Standard_B2ts_v2",\n    "image": "Ubuntu2404"\n  }\n}',
    },
  },
  {
    id: "profile",
    zone: "machine",
    group: "declared",
    kind: "file",
    short: "Environment profile",
    name: "profiles/v34.json",
    blurb: "One environment, described.",
    detail:
      "Which stages run, the address space, the firewall rules, how many machines. This is the file you edit. Everything in Zone C exists because something in here asked for it.",
    evidence: {
      language: "json",
      text: '"env": "v34",\n"stages": ["preflight","rg","network","cost","compute","verify"],\n"network": {\n  "addressSpace": "10.34.0.0/16",\n  "subnets": [{ "purpose": "web", "prefix": "10.34.1.0/24" }]\n}',
    },
  },
  {
    id: "keys",
    zone: "machine",
    group: "produced",
    kind: "key",
    short: "Keys",
    name: "keys/",
    blurb: "One key per environment.",
    detail:
      "Generated at deploy, alongside a workspace-local ssh_config. Teardown deletes it: an old key is a way into the next build. Your ~/.ssh is never touched.",
    evidence: {
      language: "text",
      text: "keys/\n  mov-v34          the private key, this environment only\n  mov-v34.pub      what Azure put on the machine\n  ssh_config       so `mov ssh v34` needs no global config",
    },
  },
  {
    id: "state",
    zone: "machine",
    group: "produced",
    kind: "file",
    short: "State",
    name: "state/",
    blurb: "What Azure said back.",
    detail:
      "Which deployments ran, what they returned, and every command issued. `mov status` reads it, teardown targets it, and `mov docs` turns it into a record of the work.",
  },

  /* ── Zone B — GitHub ── */
  {
    id: "app-repo",
    zone: "github",
    group: "yours",
    kind: "repo",
    name: "Your application repo",
    blurb: "What the server serves.",
    detail:
      "An ordinary repository of yours. The machine clones it on first boot. mov copies nothing onto the host, so there is no step where a file leaves your laptop.",
  },
  {
    id: "bootstrap",
    zone: "github",
    group: "yours",
    kind: "script",
    name: "scripts/bootstrap.sh",
    blurb: "What the host becomes.",
    detail:
      "One script, run as root once the packages are in. It is yours, not mov's. mov ships a starting point to copy and edit, and runs only what is in your repository.",
    evidence: {
      language: "text",
      text: "MOV_ENV       the environment that produced this host\nMOV_REPO      owner/name that was cloned\nMOV_REF       the branch or tag\nMOV_APP_DIR   where it landed",
    },
  },
  {
    id: "releases",
    zone: "github",
    group: "upstream",
    kind: "release",
    name: "MOV-CLI releases",
    blurb: "Where updates come from.",
    detail:
      "Each release carries a wheel: the tool and nothing else. No git history, no test suite, no docs. `mov update` fetches the newest and then checks the version actually changed.",
  },
  {
    id: "gh",
    zone: "github",
    group: "upstream",
    kind: "tool",
    name: "gh",
    blurb: "The credential you already have.",
    detail:
      "Downloads go through gh when it is present, so a private repository installs and updates exactly like a public one. No token to paste, no secret in a config file.",
  },

  /* ── Zone C — Azure ── */
  {
    id: "tenant",
    zone: "azure",
    group: "account",
    kind: "cloud",
    name: "Tenant",
    blurb: "The directory it all belongs to.",
    detail:
      "Identity lives here, above any subscription. Users and groups get their own lifecycle because deleting a resource group should not delete a person.",
  },
  {
    id: "subscription",
    zone: "azure",
    group: "account",
    kind: "cloud",
    name: "Subscription",
    blurb: "Where the bill lands.",
    detail:
      "The one mov.workspace.json pins. Signed in to a different one, mov refuses to act and names the command that fixes it.",
  },
  {
    id: "entra",
    zone: "azure",
    group: "account",
    kind: "people",
    name: "Users and groups",
    blurb: "Tenant-scoped, kept apart.",
    detail:
      "mov creates Entra ID users and groups, and never removes them as part of tearing an environment down. Deleting a resource group is routine. Deleting a person is not.",
  },
  {
    id: "rg",
    zone: "azure",
    group: "environment",
    kind: "group",
    short: "Resource group",
    name: "rg-novatrix-v34",
    blurb: "One environment, one group.",
    detail:
      "Everything an environment owns sits in one resource group. Teardown is a single act. The name came out of a pattern in naming.json.",
  },
  {
    id: "budget",
    zone: "azure",
    group: "environment",
    kind: "cost",
    short: "Budget",
    name: "budget-novatrix-v34",
    blurb: "Alerts before the credit goes.",
    detail:
      "Thresholds at 50, 80 and 90 percent of actual spend, plus one on the forecast. A free-trial subscription stops itself when the credit runs out. These warn. They do not brake.",
  },
  {
    id: "vnet",
    zone: "azure",
    group: "network",
    kind: "network",
    short: "Virtual network",
    name: "vnet-novatrix",
    blurb: "The private address space.",
    detail:
      "10.34.0.0/16, straight from the profile. Nothing in Azure chose this range and nothing in mov's code knows it.",
  },
  {
    id: "subnet",
    zone: "azure",
    group: "network",
    kind: "network",
    short: "Subnet",
    name: "snet-novatrix-web",
    blurb: "The slice the machine sits in.",
    detail:
      "10.34.1.0/24. A profile can declare several, each with its own firewall and its own answer to whether anything outside may reach it.",
  },
  {
    id: "nsg",
    zone: "azure",
    group: "network",
    kind: "shield",
    short: "Security group",
    name: "nsg-novatrix-web",
    blurb: "Which ports, and to whom.",
    detail:
      "Three rules from the profile: 80 and 443 to the world, 22 from whatever admin.sshSource names. mov warns on every run while that source is still the whole internet.",
    evidence: {
      language: "json",
      text: '{ "name": "http",  "priority": 100, "ports": ["80"] }\n{ "name": "https", "priority": 110, "ports": ["443"] }\n{ "name": "ssh",   "priority": 120, "ports": ["22"],\n  "source": "${admin.sshSource}" }',
    },
  },
  {
    id: "pip",
    zone: "azure",
    group: "machine-c",
    kind: "network",
    short: "Public IP",
    name: "pip-novatrix-web",
    blurb: "The address on the internet.",
    detail:
      "Static, so the machine keeps it while stopped. Rebuild and you get a new address. Teardown removes the old ssh_config entry. Azure recycles addresses.",
  },
  {
    id: "nic",
    zone: "azure",
    group: "machine-c",
    kind: "network",
    short: "Network interface",
    name: "nic-novatrix-web",
    blurb: "Joins the machine to the network.",
    detail:
      "Puts the VM in the subnet and gives it the public address. Rarely interesting until it is the thing that failed.",
  },
  {
    id: "vm",
    zone: "azure",
    group: "machine-c",
    kind: "server",
    short: "Virtual machine",
    name: "vm-novatrix-web",
    blurb: "Ubuntu 24.04, and the point of all this.",
    detail:
      "Created with your public key on it and cloud-init instructions to fetch its own content. Stopping deallocates the compute so it stops costing, and keeps the disk so starting again is quick.",
    evidence: {
      language: "text",
      text: "OK   web: http://20.240.236.41/ -> 200 in 37s",
    },
  },
];

/* ─── ARCS ──────────────────────────────────────────
   `kind` drives colour and dash:
     causes  — configuration becoming infrastructure
     pulls   — something fetching for itself, rather than being given
     reports — what came back
     removes — what teardown takes with it
   ─────────────────────────────────────────────────── */
window.MOV.ARCS = [
  /* the machine, driving */
  { from: "shell", to: "mov", label: "runs", kind: "causes" },
  { from: "mov", to: "az", label: "drives", kind: "causes" },
  { from: "az", to: "rg", label: "creates", kind: "causes" },
  { from: "workspace", to: "subscription", label: "pins", kind: "causes" },

  /* names, from patterns */
  { from: "naming", to: "rg", label: "names", kind: "causes" },
  { from: "naming", to: "vm", label: "names", kind: "causes" },
  { from: "naming", to: "nsg", label: "names", kind: "causes" },

  /* inherited, then specialised */
  { from: "defaults", to: "budget", label: "amount, thresholds", kind: "causes" },
  { from: "defaults", to: "vm", label: "size, image, admin user", kind: "causes" },
  { from: "profile", to: "vnet", label: "address space", kind: "causes" },
  { from: "profile", to: "subnet", label: "prefix", kind: "causes" },
  { from: "profile", to: "nsg", label: "rules and ports", kind: "causes" },
  { from: "profile", to: "vm", label: "which subnet", kind: "causes" },

  /* what contains what */
  { from: "tenant", to: "subscription", label: "contains", kind: "causes" },
  { from: "subscription", to: "rg", label: "contains", kind: "causes" },
  { from: "vnet", to: "subnet", label: "contains", kind: "causes" },
  { from: "nsg", to: "subnet", label: "protects", kind: "causes" },
  { from: "pip", to: "nic", label: "assigned to", kind: "causes" },
  { from: "nic", to: "vm", label: "attaches to", kind: "causes" },
  { from: "budget", to: "subscription", label: "watches spend on", kind: "causes" },
  { from: "tenant", to: "entra", label: "holds", kind: "causes" },

  /* the secret, and where it ends up */
  { from: "keys", to: "vm", label: "authorised key", kind: "causes" },

  /* the ones people do not expect */
  { from: "vm", to: "app-repo", label: "clones on boot", kind: "pulls" },
  { from: "vm", to: "bootstrap", label: "runs as root", kind: "pulls" },
  { from: "mov", to: "releases", label: "mov update fetches", kind: "pulls" },
  { from: "gh", to: "releases", label: "authenticates", kind: "pulls" },

  /* what came back */
  { from: "rg", to: "state", label: "recorded", kind: "reports" },
  { from: "vm", to: "state", label: "address and outputs", kind: "reports" },
  { from: "az", to: "state", label: "every command, as a transcript", kind: "reports" },

  /* and what leaves with it */
  { from: "mov", to: "rg", label: "mov down deletes", kind: "removes" },
  { from: "mov", to: "budget", label: "and the budget with it", kind: "removes" },
  { from: "mov", to: "keys", label: "and the key", kind: "removes" },
];
