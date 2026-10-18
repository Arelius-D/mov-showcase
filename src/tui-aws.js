/* ═══════════════════════════════════════════════════
   mov-showcase — the `mov new` screens the TUI tab plays, for an AWS account

   The same shape as tui.js, drawn by the same screens.js: cloud.js puts it in
   place of the Azure screens with ?cloud=aws. One short session through the
   same four screens over an account's real catalogue, as the company acme: a
   machine, which brings its network along, and a bucket. The pin is the line
   mov puts first on every screen. The search results, the panel, the forms'
   values and the names are the ones mov showed.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

window.MOV.TUI_AWS = {
  title: "mov new",
  columns: 80,
  rows: 22,
  pin: "acme-aws  ·  aws account 000000000000  ·  region eu-north-1",
  placeholder: "Search 1,367 resource types…",
  empty: "nothing picked yet",
  steps: ["Pick", "Configure", "Name", "Review"],
  stepsHint: "? help",
  frames: [
    {
      screen: "pick",
      query: "",
      results: [],
      picked: [],
      notes: [],
      footer: ["Configure", "Quit", "Help"],
    },
    {
      screen: "pick",
      query: "ec2 instance",
      typing: true,
      results: ["AWS::EC2::Instance", "AWS::EC2::InstanceConnectEndpoint", "AWS::EC2::VerifiedAccessInstance"],
      highlight: 0,
      picked: [],
      notes: [],
      footer: ["Configure", "Quit", "Help"],
    },
    {
      screen: "pick",
      query: "ec2 instance",
      results: ["AWS::EC2::Instance", "AWS::EC2::InstanceConnectEndpoint", "AWS::EC2::VerifiedAccessInstance"],
      highlight: 0,
      picked: [
        { type: "AWS::EC2::Instance", badge: "compute block" },
        { type: "AWS::EC2::VPC", badge: "network block", origin: "required by AWS::EC2::Instance (the network block)" },
      ],
      notes: [],
      footer: ["Configure", "Quit", "Help"],
    },
    {
      screen: "pick",
      query: "s3 bucket",
      typing: true,
      results: ["AWS::S3::Bucket", "AWS::S3::BucketPolicy", "AWS::S3Outposts::Bucket"],
      highlight: 0,
      picked: [
        { type: "AWS::EC2::Instance", badge: "compute block" },
        { type: "AWS::EC2::VPC", badge: "network block", origin: "required by AWS::EC2::Instance (the network block)" },
      ],
      notes: [],
      footer: ["Configure", "Quit", "Help"],
    },
    {
      screen: "pick",
      query: "s3 bucket",
      results: ["AWS::S3::Bucket", "AWS::S3::BucketPolicy", "AWS::S3Outposts::Bucket"],
      highlight: 0,
      picked: [
        { type: "AWS::EC2::Instance", badge: "compute block" },
        { type: "AWS::EC2::VPC", badge: "network block", origin: "required by AWS::EC2::Instance (the network block)" },
        { type: "AWS::S3::Bucket", badge: "generic" },
      ],
      notes: [
        "suggests AWS::KMS::Key via properties.KMSMasterKeyID -- not added",
        "suggests AWS::IAM::Role via properties.Role -- not added",
      ],
      footer: ["Configure", "Quit", "Help"],
    },
    {
      screen: "configure",
      sections: [
        {
          type: "AWS::EC2::Instance",
          fields: [
            { label: "purpose", required: true, value: "web" },
            { label: "image", required: true, note: "Key into aws.json images.", value: "Ubuntu2404" },
            { label: "size", required: true, note: "The EC2 instance type.", value: "t3.micro" },
          ],
        },
        {
          type: "AWS::EC2::VPC",
          fields: [
            { label: "addressSpace", required: true, value: "10.20.0.0/16" },
            { label: "prefix", required: true, value: "10.20.1.0/24" },
          ],
        },
      ],
      footer: ["Name it", "Optional fields", "Another entry", "Back", "Help"],
    },
    {
      screen: "name",
      heading: "Name the project",
      hint: "this becomes the env: letters and digits, e.g. selfhosted",
      value: "selfhosted",
      typing: true,
      preview: [],
      footer: ["Back", "Help"],
    },
    {
      screen: "name",
      heading: "Name the project",
      hint: "this becomes the env: letters and digits, e.g. selfhosted",
      value: "selfhosted",
      preview: ["AWS::S3::Bucket  ->  bucket-acme-selfhosted"],
      footer: ["Back", "Help"],
    },
    {
      screen: "review",
      path: "profiles/selfhosted.json",
      json: [
        "{",
        '  "env": "selfhosted",',
        '  "stages": ["preflight", "stack"],',
        '  "compute": { "vms": [{ "purpose": "web", "image": "Ubuntu2404", "size": "t3.micro", … }] },',
        '  "network": { "addressSpace": "10.20.0.0/16",',
        '    "subnets": [{ "purpose": "web", "prefix": "10.20.1.0/24" }], … },',
        '  "resources": [',
        '    { "type": "AWS::S3::Bucket", "purpose": "bucket", "properties": {} }',
        "  ]",
        "}",
      ],
      note: "More entries, tags and overrides belong in the file itself -- it is yours to edit before anything deploys.",
      footer: ["Write the profile", "Back", "Help"],
    },
    { screen: "hold" },
  ],
};
