module.exports = {
  branches: [
    'main',
    { name: 'next', prerelease: true }
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/npm',
    '@semantic-release/github',
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'package-lock.json', 'CHANGELOG.md'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
     [
      "@kilianpaquier/semantic-release-backmerge",
      {
        "commit": "chore(release): merge branch ${ from } into ${ to } [skip ci]",
        "targets": [
          { "from": "main", "to": "next" }
        ],
        "title": "Automatic merge failure",
      }
    ],
  ],
};
