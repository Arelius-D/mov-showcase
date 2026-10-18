/* ═══════════════════════════════════════════════════
   mov-showcase — the `mov new` session the CLI tab plays, for an AWS account

   The same shape as cli.js, played by the same terminal.js: cloud.js puts it
   in place of the Azure session with ?cloud=aws. Every `line` and `prompt` is
   something mov printed in a real account as the company acme: the picker's
   panel and notes, the name preview, the handoff lines from `mov new`, the
   stage headings, the change set, the stack's own events and the machine's
   address. verify/check.py holds each to a format in verify/mov-strings.json.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

window.MOV.CLI_AWS = {
  title: "mov new",
  columns: 64,
  rows: 16,
  beats: [
    { kind: "prompt", text: "$ mov new" },

    { kind: "input", text: "ec2 instance" },
    { kind: "line", tone: "picked", text: "AWS::EC2::Instance  compute block" },
    { kind: "line", tone: "picked", text: "AWS::EC2::VPC  network block" },
    { kind: "line", tone: "required", text: "required by AWS::EC2::Instance (the network block)" },

    { kind: "input", text: "s3 bucket" },
    { kind: "line", tone: "picked", text: "AWS::S3::Bucket  generic" },
    { kind: "line", tone: "suggested", text: "suggests AWS::KMS::Key via properties.KMSMasterKeyID -- not added" },

    { kind: "input", text: "selfhosted", prompt: "name ›" },
    { kind: "line", text: "AWS::S3::Bucket  ->  bucket-acme-selfhosted" },

    { kind: "line", tone: "ok", text: "OK   wrote profiles/selfhosted.json" },
    { kind: "line", tone: "muted", text: "stages: preflight, stack" },

    { kind: "prompt", text: "Preview it now (mov plan selfhosted)? y" },
    { kind: "line", text: "2/2 stack The environment's CloudFormation stack" },
    { kind: "line", text: " Add    │ AWS::EC2::VPC  Vpc" },
    { kind: "line", text: " Add    │ AWS::EC2::Instance  WebInstance" },
    { kind: "line", text: " Add    │ AWS::S3::Bucket  Bucket" },

    { kind: "prompt", text: "Deploy it now (mov up selfhosted)? y" },
    { kind: "line", text: "2/2 stack The environment's CloudFormation stack" },
    { kind: "line", tone: "muted", text: "     CREATE_COMPLETE      AWS::EC2::VPC  Vpc" },
    { kind: "line", tone: "muted", text: "     CREATE_COMPLETE      AWS::S3::Bucket  Bucket" },
    { kind: "line", tone: "muted", text: "     CREATE_COMPLETE      AWS::EC2::Instance  WebInstance" },
    { kind: "line", tone: "muted", text: "     CREATE_COMPLETE      AWS::CloudFormation::Stack  stk-acme-selfhosted" },
    { kind: "line", tone: "ok", text: "OK   web: 13.60.73.77" },

    { kind: "hold" },
  ],
};
