#!/usr/bin/env node
import { getSnapshot, parseSnapshot } from './bhtrans';
import { sleep } from './sleep';
import fs from 'fs';

const main = async () => {
  const snapshots = [];
  const numSnapshots = 60;
  const waitSeconds = 90;
  const backoffSeconds = 60;

  for (let i = 0; i < numSnapshots; i++) {
    console.log(`${i + 1}/${numSnapshots}`);
    try {
      const rawData = await getSnapshot();
      const data = parseSnapshot(rawData);
      snapshots.push(data);
      console.log(`waiting ${waitSeconds} seconds...`);
      await sleep(waitSeconds * 1000);
    } catch (e) {
      console.log(`error, backing off ${backoffSeconds} seconds...`);
      await sleep(backoffSeconds * 1000);
      i--;
    }
  }

  const json = JSON.stringify(snapshots);
  const filename = 'snapshots.json';
  console.log(`writing snapshots to ${filename}`);

  fs.writeFileSync(filename, json);
};

main();
