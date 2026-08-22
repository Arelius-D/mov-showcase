/* ═══════════════════════════════════════════════════
   mov-showcase — the entire content of the page

   Every zone, object and arc is declared here once. render.js builds the DOM
   from this and nothing else, so there is no object on the page that is not in
   this file and no text written in two places. verify/check.py fails the build
   if an arc names an object that does not exist, if an object sits in a zone
   that was never declared, or if an object has no arc at all — an island on a
   map about relationships is a content bug, not a layout one.

   Every value shown is one mov actually produced against a real subscription,
   copied from the workspace or from the tool's own output. The single
   exception is the budget alert address, replaced with a neutral one because
   this page is public.

   Classic script, no imports: ES modules are blocked over file://, and this
   page has to open by double-clicking it.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

/* ─── ZONES ─────────────────────────────────────────
   Three places a deployment lives. The order here is the order on screen.
   ─────────────────────────────────────────────────── */
window.MOV.ZONES = [
  {
    id: "machine",
    letter: "A",
    name: "Your machine",
    note: "Where you type. Everything here is a file you own and can read.",
  },
  {
    id: "github",
    letter: "B",
    name: "GitHub",
    note: "Where the code lives. mov never uploads a file to a server.",
  },
  {
    id: "azure",
    letter: "C",
    name: "Azure",
    note: "Where it becomes real, and the only zone that costs money.",
  },
];

/* ─── OBJECTS ───────────────────────────────────────
   `kind` is used for the glyph and nothing else. `detail` is two or three
   sentences: enough to be true, short enough to be read standing up.
   ─────────────────────────────────────────────────── */
window.MOV.OBJECTS = [
  /* ── Zone A — your machine ── */
  {
    id: "shell",
    zone: "machine",
    kind: "shell",
    name: "Your shell",
    blurb: "PowerShell, on any OS.",
    detail:
      "mov is a command you type. It runs on Windows, macOS and Linux from the same PowerShell you already have, and installs per-user — it never asks for administrator rights.",
  },
  {
    id: "mov",
    zone: "machine",
    kind: "tool",
    name: "mov",
    blurb: "The tool itself.",
    detail:
      "Reads your JSON, works out every name and every parameter, and drives the Azure CLI. It holds no Azure knowledge of its own: no region, size, image or API version appears anywhere in its source, and a test fails the build if one ever does.",
    evidence: {
      language: "text",
      text: "mov plan v34     what would change\nmov up v34       make it so\nmov down v34     delete the lot",
    },
  },
  {
    id: "az",
    zone: "machine",
    kind: "tool",
    name: "Azure CLI",
    blurb: "The thing that actually talks to Azure.",
    detail:
      "mov shells out to `az` rather than reimplementing Azure's API, so what it does is a command you could have typed. Every one of those commands is recorded, which is why the deployment is inspectable rather than a black box.",
  },
  {
    id: "workspace",
    zone: "machine",
    kind: "file",
    name: "mov.workspace.json",
    blurb: "Which tenant, which subscription.",
    detail:
      "Marks a directory as a workspace and pins the subscription mov is allowed to act on. Acting on the wrong subscription is not a mistake you can undo, so the pin is the default — you can aim one command elsewhere, but never by accident.",
    evidence: {
      language: "json",
      text: '{\n  "name": "mov25-azure",\n  "azure": {\n    "tenantId": "183c226e-…",\n    "subscriptionId": "fb5e8372-…"\n  }\n}',
    },
  },
  {
    id: "naming",
    zone: "machine",
    kind: "file",
    name: "naming.json",
    blurb: "Every name, from one pattern each.",
    detail:
      "One pattern per resource type, plus the rule each name must satisfy. A name that breaks its rule is a hard error — mov will not quietly truncate a storage account to fit, it tells you which pattern produced what and which rule it broke.",
    evidence: {
      language: "json",
      text: '"patterns": {\n  "resourceGroup": "rg-{company}-{env}",\n  "virtualMachine": "vm-{company}-{purpose}",\n  "storageAccount": "st{company}{user}{seq:02d}"\n}',
    },
  },
  {
    id: "defaults",
    zone: "machine",
    kind: "file",
    name: "defaults.json",
    blurb: "What every environment inherits.",
    detail:
      "Region, tags, budget, VM size, admin user, which packages a host gets. A profile only has to say what makes it different. Nothing here is a code-side fallback: if a value is missing, mov names the file that was supposed to supply it instead of inventing one.",
    evidence: {
      language: "json",
      text: '"location": "swedencentral",\n"cost": { "amount": 200, "currency": "SEK" },\n"itemDefaults": {\n  "compute.vms": {\n    "size": "Standard_B2ts_v2",\n    "image": "Ubuntu2404"\n  }\n}',
    },
  },
  {
    id: "profile",
    zone: "machine",
    kind: "file",
    name: "profiles/v34.json",
    blurb: "One environment, described.",
    detail:
      "The whole environment as data: which stages run, the address space, the firewall rules, how many machines. This is the file you edit. Everything in Zone C exists because something in here asked for it.",
    evidence: {
      language: "json",
      text: '"env": "v34",\n"stages": ["preflight","rg","network","cost","compute","verify"],\n"network": {\n  "addressSpace": "10.34.0.0/16",\n  "subnets": [{ "purpose": "web", "prefix": "10.34.1.0/24" }]\n}',
    },
  },
  {
    id: "keys",
    zone: "machine",
    kind: "key",
    name: "keys/",
    blurb: "A fresh key per environment.",
    detail:
      "mov generates the VM's SSH key at deploy time and puts it here, next to a workspace-local ssh_config. Your ~/.ssh is never read or written. Tearing the environment down deletes the key, because the next build should not be reachable with the last build's secret.",
    evidence: {
      language: "text",
      text: "keys/\n  mov-v34          the private key, this environment only\n  mov-v34.pub      what Azure put on the machine\n  ssh_config       so `mov ssh v34` needs no global config",
    },
  },
  {
    id: "state",
    zone: "machine",
    kind: "file",
    name: "state/",
    blurb: "What Azure said back.",
    detail:
      "Which deployments ran, what they returned, and a transcript of every command issued. This is what `mov status` reads, what teardown targets, and what `mov docs` turns into a paste-ready record of the work.",
  },

  /* ── Zone B — GitHub ── */
  {
    id: "app-repo",
    zone: "github",
    kind: "repo",
    name: "Your application repo",
    blurb: "The content the server serves.",
    detail:
      "An ordinary repository of yours. mov does not copy files onto the machine — the machine clones this itself on first boot. Push a change and the next deploy picks it up, with no step where a file is uploaded from your laptop.",
  },
  {
    id: "bootstrap",
    zone: "github",
    kind: "script",
    name: "scripts/bootstrap.sh",
    blurb: "What the host becomes.",
    detail:
      "One script, run as root once the packages are in. It is yours, not mov's — what a server should become is not a decision a deployment tool gets to make. mov ships a starting point you copy and edit, and runs only what is in your repository.",
    evidence: {
      language: "text",
      text: "MOV_ENV       the environment that produced this host\nMOV_REPO      owner/name that was cloned\nMOV_REF       the branch or tag\nMOV_APP_DIR   where it landed",
    },
  },
  {
    id: "releases",
    zone: "github",
    kind: "release",
    name: "MOV-CLI releases",
    blurb: "Where updates come from.",
    detail:
      "Each release carries a wheel: the tool and nothing else, with no git history, no test suite and no docs. `mov update` fetches the newest one and verifies the version actually changed afterwards, rather than trusting the installer's exit code.",
  },
  {
    id: "gh",
    zone: "github",
    kind: "tool",
    name: "gh",
    blurb: "The credential you already have.",
    detail:
      "Because downloads go through gh when it is present, a private repository installs and updates exactly like a public one, for anyone allowed to see it. No token to paste, no secret in a config file.",
  },

  /* ── Zone C — Azure ── */
  {
    id: "tenant",
    zone: "azure",
    kind: "cloud",
    name: "Tenant",
    blurb: "The directory everything belongs to.",
    detail:
      "Identity lives here, above any subscription. That is why users and groups have a lifecycle of their own — deleting a resource group does not, and should not, delete a person.",
  },
  {
    id: "subscription",
    zone: "azure",
    kind: "cloud",
    name: "Subscription",
    blurb: "Where the bill lands.",
    detail:
      "The one mov.workspace.json pins. mov refuses to act when the CLI is signed in to a different one, and says which command fixes it rather than simply declining.",
  },
  {
    id: "rg",
    zone: "azure",
    kind: "group",
    name: "rg-novatrix-v34",
    blurb: "One environment, one group.",
    detail:
      "Everything an environment owns lives in a single resource group, which is what makes teardown a single, complete act. The name came from a pattern, not from a person typing it.",
  },
  {
    id: "budget",
    zone: "azure",
    kind: "cost",
    name: "budget-novatrix-v34",
    blurb: "Alerts before the credit does.",
    detail:
      "Thresholds at 50, 80 and 90 percent of actual spend, plus one on the forecast. Worth knowing: a free-trial subscription already stops itself when the credit runs out, so these alerts are a warning rather than the brake.",
  },
  {
    id: "vnet",
    zone: "azure",
    kind: "network",
    name: "vnet-novatrix",
    blurb: "The private address space.",
    detail:
      "10.34.0.0/16, straight from the profile. Nothing in Azure chose this range and nothing in mov's code knows it.",
  },
  {
    id: "subnet",
    zone: "azure",
    kind: "network",
    name: "snet-novatrix-web",
    blurb: "The slice the machine sits in.",
    detail:
      "10.34.1.0/24. A profile can declare several, each with its own firewall and its own decision about whether anything from outside may reach it at all.",
  },
  {
    id: "nsg",
    zone: "azure",
    kind: "shield",
    name: "nsg-novatrix-web",
    blurb: "Which ports are open, and to whom.",
    detail:
      "Three rules from the profile: 80 and 443 to the world, and 22 from whatever admin.sshSource names. mov warns on every run while that source is still the whole internet — correct as a default, and yours to overrule.",
    evidence: {
      language: "json",
      text: '{ "name": "http",  "priority": 100, "ports": ["80"] }\n{ "name": "https", "priority": 110, "ports": ["443"] }\n{ "name": "ssh",   "priority": 120, "ports": ["22"],\n  "source": "${admin.sshSource}" }',
    },
  },
  {
    id: "pip",
    zone: "azure",
    kind: "network",
    name: "pip-novatrix-web",
    blurb: "The address on the internet.",
    detail:
      "A static public address, so the machine keeps it while it is stopped. Rebuild the environment and you get a new one — which is exactly why mov removes the old host entry from ssh_config on teardown, instead of letting you connect to whoever gets that address next.",
  },
  {
    id: "nic",
    zone: "azure",
    kind: "network",
    name: "nic-novatrix-web",
    blurb: "What joins the machine to the network.",
    detail:
      "The card that puts the VM in the subnet and gives it the public address. Rarely interesting until it is the thing that failed.",
  },
  {
    id: "vm",
    zone: "azure",
    kind: "server",
    name: "vm-novatrix-web",
    blurb: "Ubuntu 24.04, and the reason for all of it.",
    detail:
      "Created with your public key already on it and cloud-init instructions to fetch its own content. Stopping it deallocates the compute so it stops costing, and keeps the disk so starting it again is quick.",
    evidence: {
      language: "text",
      text: "OK   web: http://20.240.236.41/ -> 200 in 37s",
    },
  },
  {
    id: "entra",
    zone: "azure",
    kind: "people",
    name: "Users and groups",
    blurb: "Tenant-scoped, so kept apart.",
    detail:
      "mov can create Entra ID users and groups, but never removes them as part of tearing an environment down. Deleting a resource group is routine; deleting a person is not, so it takes its own explicit command.",
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
