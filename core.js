#! /usr/bin/env node
const fetch = require('node-fetch');
const unzipCrx = require('unzip-crx');
const fs = require('fs').promises;
const del = require('del');
const path = require('path');
const execa = require('execa');

const id = process.argv[2];
const root = __dirname;
const extensionsFolder = path.resolve(root, './packages');

const extensions = {
  'react-devtools': {
    id: 'fmkadmapgofadopljbjfkapdkoienihi',
    license: 'BSD-3-Clause',
    licenseText: `
BSD License

For the react-devtools software

Copyright (c) 2013-2014, Facebook, Inc. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

 * Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

 * Neither the name Facebook nor the names of its contributors may be used to
   endorse or promote products derived from this software without specific
   prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    `
  }
}

async function fetchExtension (name, id, options = {}) {
  const res = await fetch(`https://clients2.google.com/service/update2/crx?response=redirect&prodversion=49.0&x=id%3D${id}%26installsource%3Dondemand%26uc`);
  const tmpFile = path.resolve(__dirname, `${id}.crx`);
  const extensionPath = path.resolve(extensionsFolder, id);
  await fs.writeFile(tmpFile, await res.buffer());
  await del(extensionPath)
  await unzipCrx(tmpFile, extensionPath);
  await del(tmpFile)

  const manifestPath = path.resolve(extensionPath, 'manifest.json');
  const {
    name: manifestName,
    version,
    description
  } = JSON.parse(await fs.readFile(manifestPath));
  const packageJsonPath = path.resolve(extensionPath, 'package.json');

  const packageJson = {
    name: `@npm-chrome-extensions/${name}`,
    version,
    description
  };

  if (options.license) {
    packageJson.license = options.license;
  }

  if (options.licenseText) {
    const licensePath = path.resolve(extensionPath, 'LICENSE');
    await fs.writeFile(licensePath, options.licenseText.trim(), 'utf-8')
  }

  const readmePath = path.resolve(extensionPath, 'README.md');
  await fs.writeFile(readmePath, `
# ${manifestName}

[Chrome Webstore link](https://chrome.google.com/webstore/detail/${id})

Chrome extension packaged as an npm module.
  `.trim(), 'utf-8')

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8')
}

async function fetchExtensions () {
  await Promise.all(Object.entries(extensions).map(async ([ name, { id, ...options } ]) => {
    return fetchExtension(name, id, options);
  }))
};

async function publishExtensions () {
  for (const [ name, { id } ] of Object.entries(extensions)) {
    //await execa('npm', [ 'publish', '--access', 'public' ], {
    console.log(path.resolve(extensionsFolder, id))
    await execa.shell('npm publish --access public', {
      cwd: path.resolve(extensionsFolder, id)
    })
  }
};

module.exports = {
  fetchExtensions,
  publishExtensions
}
