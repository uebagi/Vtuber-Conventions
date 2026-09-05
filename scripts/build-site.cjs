const fs = require('node:fs');
const path = require('node:path');

const repository = path.resolve(__dirname, '..');
const legacySlugs = new Set(['vexpo-2026']);
const dataFiles = ['schedule.csv', 'socials.json', 'opening-hours.json'];

function buildSite(destination, source = repository) {
  destination = path.resolve(destination);
  if (fs.existsSync(destination)) throw new Error(`Output already exists: ${destination}. Choose a fresh directory.`);
  fs.mkdirSync(destination, { recursive: true });
  fs.copyFileSync(path.join(source, 'index.html'), path.join(destination, 'index.html'));
  fs.cpSync(path.join(source, 'assets'), path.join(destination, 'assets'), { recursive: true });

  const conventions = path.join(source, 'conventions');
  for (const directory of fs.readdirSync(conventions, { withFileTypes: true })) {
    if (!directory.isDirectory()) continue;
    const convention = path.join(conventions, directory.name);
    if (!fs.existsSync(path.join(convention, 'schedule.csv'))) continue;
    const output = path.join(destination, 'conventions', directory.name);
    fs.mkdirSync(output, { recursive: true });
    fs.copyFileSync(path.join(convention, 'index.html'), path.join(output, 'index.html'));
    for (const file of dataFiles) {
      if (fs.existsSync(path.join(convention, file))) {
        fs.copyFileSync(path.join(convention, file), path.join(output, file));
      }
    }

    // Compatibility files exist only in the build output, keeping the source root tidy.
    if (legacySlugs.has(directory.name)) {
      const legacy = path.join(destination, directory.name);
      const target = `../conventions/${directory.name}/`;
      fs.mkdirSync(legacy);
      fs.writeFileSync(path.join(legacy, 'index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Convention schedule</title>
  <script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
  <meta http-equiv="refresh" content="0; url=${target}">
</head>
<body><p><a href="${target}">Open the convention schedule</a></p></body>
</html>
`);
      // Preserve shared downloads and data requests from previously cached pages.
      for (const file of dataFiles) {
        if (fs.existsSync(path.join(output, file))) {
          fs.copyFileSync(path.join(output, file), path.join(legacy, file));
        }
      }
    }
  }
  return destination;
}

if (require.main === module) {
  console.log(`Site prepared in ${buildSite(process.argv[2] || path.join(repository, '_site'))}`);
}
module.exports = { buildSite };
