# Security policy

Pasted handles private content and makes outbound requests to URLs supplied by users. Please report security problems privately so maintainers can investigate before details are public.

## Supported versions

Pasted is currently pre-1.0 and has no long-term support releases.

| Version                                  | Security fixes |
| ---------------------------------------- | -------------- |
| Current `main` and latest tagged release | Supported      |
| Older tags and historical commits        | Not supported  |

When a security fix is released, self-hosters should update promptly and review any migration or deployment notes.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting page:

[Report a Pasted security vulnerability](https://github.com/xtrafr/pasted/security/advisories/new)

Do not open a public issue, discussion, or pull request for an undisclosed vulnerability. If private vulnerability reporting is unavailable, open a minimal public issue asking the maintainer to enable a private contact method. Do not include exploit details, tokens, private URLs, personal data, or affected instance addresses in that issue.

Include what you can safely provide:

- affected commit or version
- affected component and deployment shape
- prerequisites and impact
- reproducible steps or a minimal proof of concept
- whether user interaction or authentication is required
- relevant logs with secrets and personal data removed
- a suggested fix or mitigation, if known
- whether you intend to request a CVE or publish research

Please use synthetic accounts and `example.com` style data. Do not test against an instance you do not own or have explicit permission to assess.

## Response process

There is no formal response SLA while the project is pre-1.0. The maintainer will aim to acknowledge a complete report within seven days, confirm impact, coordinate a fix and release, and agree on a disclosure date with the reporter. Complex issues or maintainer availability can extend that timeline.

The maintainer may ask for clarification, a private reproduction, or permission to credit the reporter. Please allow reasonable time for supported users to update before publishing details. If a report is not a vulnerability, the maintainer may move the resulting discussion to a public issue after removing sensitive information.

## High-priority areas

Reports are especially useful for:

- account data crossing user boundaries
- authentication or session bypass
- CSRF on state-changing operations
- stored or reflected XSS
- SSRF, DNS rebinding, redirect bypass, or access to cloud metadata
- unsafe URL schemes or header forwarding
- arbitrary file read, write, or code execution
- share token prediction, disclosure, or revocation bypass
- backup validation or ZIP resource exhaustion bypass
- import limit bypass that causes practical denial of service
- secrets or private source content appearing in logs, responses, fixtures, or public shares
- SQL injection or ownership constraint bypass

Dependency-only reports should show that the vulnerable path is reachable in Pasted or that the package is included in a shipped runtime image.

## Out of scope

The following are normally out of scope unless they demonstrate concrete impact:

- automated scanner output without a working affected path
- denial of service that requires administrator database or host access
- issues that require a compromised PostgreSQL administrator, host root, or repository maintainer account
- missing email delivery for password recovery in an installation that has not configured a mail provider
- rate-limit findings that do not produce an authentication or availability impact
- self-XSS that cannot affect another user
- social engineering, spam, or physical attacks
- vulnerabilities in unsupported historical commits
- metadata fetched from a public server that itself proxies private content without Pasted connecting to a private address

Pasted's application-level SSRF checks are defense in depth. Self-hosters are expected to apply outbound firewall rules as described in [docs/security.md](docs/security.md).

## Disclosure and credit

Coordinated disclosure is preferred. The maintainer will credit reporters in an advisory or release note when requested, unless the reporter prefers anonymity. Do not include another person's identity or organization without permission.

Testing and reporting under this policy does not grant permission to access third-party systems, disrupt service, retain private data, or violate applicable law.
