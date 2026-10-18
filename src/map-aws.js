/* ═══════════════════════════════════════════════════
   mov-showcase — the map, for an AWS account

   The same shape as map.js, read by the same render.js, arcs.js and
   interact.js: cloud.js puts it in place of the Azure map when the page is
   opened with ?cloud=aws. It shows what mov does on AWS today and nothing it
   does not, so it is smaller than the Azure one and grows as mov does.

   Every value shown is one mov produced in a real account, as the company
   acme: the stack, the names its patterns made, the address, the events. The
   account id is the one exception, zeroed because this page is public.

   Classic script, no imports: ES modules are blocked over file://.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

window.MOV.AWS = {
  ZONES: [
    {
      id: "machine",
      letter: "A",
      span: 7,
      name: "Your machine",
      note: "Files you own and can read. Nothing here is AWS's.",
    },
    {
      id: "github",
      letter: "B",
      span: 5,
      name: "GitHub",
      note: "Where the code lives. mov never uploads a file to a server.",
    },
    {
      id: "aws",
      letter: "C",
      span: 12,
      name: "AWS",
      note: "Where it becomes real. The only zone that bills you.",
    },
  ],

  GROUPS: [
    { id: "tools", zone: "machine", name: "Tools" },
    { id: "declared", zone: "machine", name: "What you declare" },
    { id: "produced", zone: "machine", name: "What mov writes back" },

    { id: "yours", zone: "github", name: "Your code" },
    { id: "upstream", zone: "github", name: "Where mov comes from" },

    { id: "account", zone: "aws", name: "Account" },
    { id: "environment", zone: "aws", name: "Environment" },
    { id: "network", zone: "aws", name: "Network" },
    { id: "machine-c", zone: "aws", name: "The machine" },
    { id: "anytype", zone: "aws", name: "Any other type" },
  ],

  OBJECTS: [
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
        "Reads your JSON, works out every name and parameter, drives the AWS CLI. It knows nothing about AWS on its own: no region, instance type, image or resource type appears in its source, and a test fails the build if one does. The JSON can start from a full-screen picker over the account's live catalogue instead of from memory.",
      evidence: {
        language: "text",
        text: "mov new                 pick from the catalogue, get a profile\nmov plan selfhosted     a change set, read and deleted again\nmov up selfhosted       make it so\nmov down selfhosted     delete the stack",
      },
    },
    {
      id: "catalog",
      zone: "machine",
      group: "tools",
      kind: "file",
      short: "Catalogue",
      name: "state/catalog/eu-north-1/providers.json",
      blurb: "What this account's region can build.",
      detail:
        "Every CloudFormation type the region offers, listed by `aws cloudformation list-types` and kept with its age on it: 219 namespaces, 1,367 types in the region this page was built from. CloudFormation's own schema download adds what each type needs and what it brings along. mov ships no list of its own.",
      evidence: {
        language: "text",
        text: "mov catalog show AWS::Lambda::Function\n  also required Code, Role\n  brings along:\n    AWS::IAM::Role   properties.Role (curated)",
      },
    },
    {
      id: "aws",
      zone: "machine",
      group: "tools",
      kind: "tool",
      name: "AWS CLI",
      blurb: "What actually talks to AWS.",
      detail:
        "mov shells out to `aws`. Everything it does is a command you could have typed yourself. Every one is recorded. `aws login` signs the workspace's own user in, and a session that ends in the middle of a command is offered back to the user who held it.",
    },
    {
      id: "workspace",
      zone: "machine",
      group: "declared",
      kind: "file",
      short: "Workspace file",
      name: "mov.workspace.json",
      blurb: "The account it acts in.",
      detail:
        "The recipe book, not the kitchen. It names the account, the CLI profile that signs in to it and the region. Every call carries that profile and region, and the first one asks who is signed in: another account stops mov before anything is read or written there.",
      evidence: {
        language: "json",
        text: '{\n  "name": "acme-aws",\n  "aws": {\n    "accountId": "000000000000",\n    "profile": "mov-workspace",\n    "region": "eu-north-1"\n  }\n}',
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
        "The stack's name comes from here, and every other name becomes a Name tag. Nothing in the stack carries a name AWS holds it to, so anything in it can be replaced by an update.",
      evidence: {
        language: "json",
        text: '"patterns": {\n  "cfnStack": "stk-{company}-{env}",\n  "ec2Vpc": "vpc-{company}-{env}",\n  "ec2Instance": "ec2-{company}-{env}-{purpose}",\n  "resource": "{purpose}-{company}-{env}"\n}',
      },
    },
    {
      id: "defaults",
      zone: "machine",
      group: "declared",
      kind: "file",
      short: "Defaults",
      name: "aws-defaults.json",
      blurb: "What every environment inherits.",
      detail:
        "Tags, the stages, where ssh may come from, and each machine's image, instance type, root volume, key and packages. A profile only states what makes it different. The picker's forms start from it.",
      evidence: {
        language: "json",
        text: '"admin": { "sshSource": "@caller" },\n"itemDefaults": {\n  "compute.vms": {\n    "image": "Ubuntu2404",\n    "size": "t3.micro",\n    "rootVolume": { "type": "gp3", "sizeGb": 8 }\n  }\n}',
      },
    },
    {
      id: "profile",
      zone: "machine",
      group: "declared",
      kind: "file",
      short: "Environment profile",
      name: "profiles/selfhosted.json",
      blurb: "One environment, described.",
      detail:
        "The network, its rules, the machines and anything else the region offers. This is the file you edit. Everything in Zone C exists because something in here asked for it.",
      evidence: {
        language: "json",
        text: '"env": "selfhosted",\n"network": {\n  "addressSpace": "10.20.0.0/16",\n  "subnets": [{ "purpose": "web", "prefix": "10.20.1.0/24" }]\n},\n"resources": [{ "type": "AWS::S3::Bucket", "purpose": "bucket" }]',
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
        "Generated at deploy, alongside a workspace-local ssh_config. Teardown deletes it: an old key is a way into the next build. Your ~/.ssh is never touched. The machine is handed the public key by cloud-init, with no key pair in AWS to hold it.",
      evidence: {
        language: "text",
        text: "keys/\n  mov-selfhosted       the private key, this environment only\n  mov-selfhosted.pub   what cloud-init put on the machine\n  ssh_config           so `mov ssh selfhosted` needs no global config",
      },
    },
    {
      id: "state",
      zone: "machine",
      group: "produced",
      kind: "file",
      short: "State",
      name: "state/",
      blurb: "What AWS said back.",
      detail:
        "The stack's id, each machine's address, image and zone, each entry's id, and every command issued. `mov status` reads it, and an environment stands where it was made while it stands.",
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
    },
    {
      id: "releases",
      zone: "github",
      group: "upstream",
      kind: "release",
      name: "mov releases",
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

    /* ── Zone C — AWS ── */
    {
      id: "account",
      zone: "aws",
      group: "account",
      kind: "cloud",
      name: "Account",
      blurb: "The one mov is pinned to.",
      detail:
        "Where everything lives and what it is billed to. `mov check` says who is signed in and whether that is root, when the session ends, whether the region is open to the account, whether root has MFA, and the account's plan. On the Free plan, preflight refuses an instance type outside the free tier.",
    },
    {
      id: "iam",
      zone: "aws",
      group: "account",
      kind: "people",
      short: "IAM user and group",
      name: "The workspace's own user",
      blurb: "What mov works as. Never root.",
      detail:
        "`mov setup --aws` signs root in once, makes a group with AdministratorAccess and the workspace's user in it, and signs root out. No access keys: `aws login` gives credentials that end on their own.",
    },
    {
      id: "stack",
      zone: "aws",
      group: "environment",
      kind: "group",
      short: "CloudFormation stack",
      name: "stk-acme-selfhosted",
      blurb: "One environment, one stack.",
      detail:
        "Everything an environment holds is one stack. A plan is a change set, read and deleted again. Up shows one, executes it and follows the stack event by event until it settles. Down deletes it. The name came out of a pattern in naming.json.",
      evidence: {
        language: "text",
        text: "CREATE_COMPLETE      AWS::EC2::Instance  WebInstance\nCREATE_COMPLETE      AWS::CloudFormation::Stack  stk-acme-selfhosted",
      },
    },
    {
      id: "vpc",
      zone: "aws",
      group: "network",
      kind: "network",
      short: "VPC",
      name: "vpc-acme-selfhosted",
      blurb: "The private address space.",
      detail:
        "10.20.0.0/16, straight from the profile, with an internet gateway and a route to it. Nothing in AWS chose this range and nothing in mov's code knows it.",
    },
    {
      id: "subnet",
      zone: "aws",
      group: "network",
      kind: "network",
      short: "Subnet",
      name: "snet-acme-selfhosted-web",
      blurb: "The slice the machine sits in.",
      detail:
        "10.20.1.0/24, in a zone chosen once from those that offer every instance type its machines run, and kept while the stack stands.",
    },
    {
      id: "sg",
      zone: "aws",
      group: "network",
      kind: "shield",
      short: "Security group",
      name: "sgr-acme-selfhosted-web",
      blurb: "Which ports, and to whom.",
      detail:
        "The rules from the profile. ssh comes from whatever admin.sshSource names, and @caller there means wherever mov is run from, asked afresh at every up. mov warns on every run while ssh is open to the whole internet.",
      evidence: {
        language: "json",
        text: '{ "name": "ssh", "protocol": "tcp", "ports": ["22"],\n  "source": "${admin.sshSource}" }',
      },
    },
    {
      id: "cloud-init",
      zone: "aws",
      group: "machine-c",
      kind: "script",
      short: "cloud-init",
      name: "cloud-init",
      blurb: "The machine's first instructions.",
      detail:
        "Runs once on first boot, before anyone logs in. It updates the OS, installs the packages the profile asked for, clones your repository and runs your bootstrap. mov hands it over as the instance's user data, with the environment's public key in it.",
    },
    {
      id: "ec2",
      zone: "aws",
      group: "machine-c",
      kind: "server",
      short: "EC2 instance",
      name: "ec2-acme-selfhosted-web",
      blurb: "Ubuntu 24.04, and the point of all this.",
      detail:
        "Built from the image the alias names on the first up, and kept on that image while it stands. A newer one is said by `mov plan` and taken by `mov rebuild`. A change that would replace the machine is asked about first.",
      evidence: {
        language: "text",
        text: "OK   web: 13.60.73.77",
      },
    },
    {
      id: "generic",
      zone: "aws",
      group: "anytype",
      kind: "cloud",
      short: "Any AWS type",
      name: "bucket-acme-selfhosted",
      blurb: "From the resources block.",
      detail:
        "Whatever the region offers that no block covers goes in the profile's resources and into the same stack, held to its type's own schema before anything is sent and tagged with its name. @resourceId, @attribute and @output wire it to the rest, and @secret hands it a value that is written nowhere. An S3 bucket here. A Lambda function and the role it brings along go the same way.",
      evidence: {
        language: "text",
        text: "AWS::S3::Bucket  stk-acme-selfhosted-bucket-41nbksswziv4",
      },
    },
  ],

  /* `kind` drives colour and dash, as in map.js. */
  ARCS: [
    /* the machine, driving */
    { from: "shell", to: "mov", label: "runs", kind: "causes" },
    { from: "mov", to: "aws", label: "drives", kind: "causes" },
    { from: "aws", to: "stack", label: "a change set", kind: "causes" },
    { from: "account", to: "catalog", label: "list-types", kind: "reports" },
    { from: "catalog", to: "profile", label: "mov new writes", kind: "causes" },
    { from: "workspace", to: "account", label: "pins", kind: "causes" },
    { from: "workspace", to: "iam", label: "signs in as", kind: "causes" },

    /* names, from patterns */
    { from: "naming", to: "stack", label: "names", kind: "causes" },
    { from: "naming", to: "ec2", label: "Name tag", kind: "causes" },
    { from: "naming", to: "generic", label: "Name tag", kind: "causes" },

    /* inherited, then specialised */
    { from: "defaults", to: "ec2", label: "image, type, volume", kind: "causes" },
    { from: "profile", to: "vpc", label: "address space", kind: "causes" },
    { from: "profile", to: "subnet", label: "prefix", kind: "causes" },
    { from: "profile", to: "sg", label: "rules and ports", kind: "causes" },
    { from: "profile", to: "generic", label: "type and properties", kind: "causes" },

    /* what contains what */
    { from: "account", to: "stack", label: "contains", kind: "causes" },
    { from: "iam", to: "account", label: "works in", kind: "causes" },
    { from: "stack", to: "vpc", label: "holds", kind: "causes" },
    { from: "vpc", to: "subnet", label: "contains", kind: "causes" },
    { from: "subnet", to: "ec2", label: "holds", kind: "causes" },
    { from: "sg", to: "ec2", label: "protects", kind: "causes" },
    { from: "stack", to: "generic", label: "holds", kind: "causes" },
    { from: "catalog", to: "generic", label: "type and schema", kind: "causes" },

    /* the secret, and where it ends up */
    { from: "keys", to: "cloud-init", label: "public key", kind: "causes" },

    /* the ones people do not expect */
    { from: "cloud-init", to: "app-repo", label: "clones on boot", kind: "pulls" },
    { from: "cloud-init", to: "bootstrap", label: "runs as root", kind: "pulls" },
    { from: "cloud-init", to: "ec2", label: "first boot", kind: "causes" },
    { from: "defaults", to: "cloud-init", label: "packages, update, upgrade", kind: "causes" },
    { from: "mov", to: "releases", label: "mov update fetches", kind: "pulls" },
    { from: "gh", to: "releases", label: "authenticates", kind: "pulls" },

    /* what came back */
    { from: "stack", to: "state", label: "recorded", kind: "reports" },
    { from: "ec2", to: "state", label: "address, image, zone", kind: "reports" },
    { from: "aws", to: "state", label: "every command, as a transcript", kind: "reports" },

    /* and what leaves with it */
    { from: "mov", to: "stack", label: "mov down deletes", kind: "removes" },
    { from: "mov", to: "keys", label: "and the key", kind: "removes" },
  ],
};
