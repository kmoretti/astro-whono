export interface LinksSettings {
  linksSourceUrl: string;
  latencySourceUrl: string;
  tombstoneSourceUrl: string;
  submissionUrl: string;
  fcircleSourceUrl: string;
  fcircleEnabled: boolean;
  fcircleShowError: boolean;
  ech0SourceUrl: string;
  ech0Enabled: boolean;
  ech0PageSize: number;
  ech0MaxPages: number;
  ech0ShowError: boolean;
  voteApiBase: string;
  voteEnabled: boolean;
}

export const DEFAULT_LINKS_SETTINGS: LinksSettings = {
  linksSourceUrl: 'https://cdn.jsdmirror.com/gh/kmoretti/butterfly-link-check@main/link.yml',
  latencySourceUrl: 'https://fc.081531.xyz/link.json',
  tombstoneSourceUrl: 'https://cdn.jsdmirror.com/gh/kmoretti/butterfly-link-check@main/link-false.yml',
  submissionUrl: 'https://verify.081531.xyz/api/submissions',
  fcircleSourceUrl: 'https://fc.081531.xyz/all.json',
  fcircleEnabled: true,
  fcircleShowError: true,
  ech0SourceUrl: 'https://m.081531.xyz/',
  ech0Enabled: true,
  ech0PageSize: 10,
  ech0MaxPages: 3,
  ech0ShowError: true,
  voteApiBase: 'https://vote.081531.xyz/',
  voteEnabled: true
};
