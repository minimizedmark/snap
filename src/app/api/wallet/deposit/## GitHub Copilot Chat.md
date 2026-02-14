## GitHub Copilot Chat

- Extension: 0.37.4 (prod)
- VS Code: 1.109.0 (bdd88df003631aaa0bcbe057cb0a940b80a476fa)
- OS: linux 6.8.0-94-generic x64
- GitHub Account: minimizedmark

## Network

User Settings:
```json
  "http.systemCertificatesNode": false,
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 140.82.114.6 (82 ms)
- DNS ipv6 Lookup: Error (93 ms): getaddrinfo ENOTFOUND api.github.com
- Proxy URL: None (2 ms)
- Electron fetch (configured): HTTP 200 (116 ms)
- Node.js https: HTTP 200 (441 ms)
- Node.js fetch: HTTP 200 (243 ms)

Connecting to https://api.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.112.22 (52 ms)
- DNS ipv6 Lookup: Error (38 ms): getaddrinfo ENOTFOUND api.githubcopilot.com
- Proxy URL: None (14 ms)
- Electron fetch (configured): HTTP 200 (127 ms)
- Node.js https: HTTP 200 (455 ms)
- Node.js fetch: HTTP 200 (438 ms)

Connecting to https://copilot-proxy.githubusercontent.com/_ping:
- DNS ipv4 Lookup: 4.249.131.160 (39 ms)
- DNS ipv6 Lookup: Error (63 ms): getaddrinfo ENOTFOUND copilot-proxy.githubusercontent.com
- Proxy URL: None (23 ms)
- Electron fetch (configured): HTTP 200 (346 ms)
- Node.js https: HTTP 200 (397 ms)
- Node.js fetch: HTTP 200 (431 ms)

Connecting to https://mobile.events.data.microsoft.com: HTTP 404 (170 ms)
Connecting to https://dc.services.visualstudio.com: HTTP 404 (385 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (442 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (410 ms)
Connecting to https://default.exp-tas.com: HTTP 400 (375 ms)

Number of system certificates: 144

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).